/**
 * Safety margin (93%) applied to service file size limits to account for
 * multipart/form-data and base64 encoding overhead.
 * This 7% reduction helps prevent 413 errors when files are just under the limit.
 */
export const SAFETY_MARGIN = 0.93;

/**
 * Supported audio MIME types for chunking.
 * Only MP3 and WAV formats are supported as they can reliably resynchronize
 * at arbitrary byte boundaries.
 */
const SUPPORTED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
];

/**
 * Error thrown when audio chunking fails.
 */
export class AudioChunkingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AudioChunkingError";
  }
}

/**
 * Validates if the audio format is supported for chunking.
 * @param mimeType - The MIME type to validate
 * @returns True if the format is supported
 */
function isSupportedFormat(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return SUPPORTED_MIME_TYPES.includes(normalized);
}

/**
 * Finds the next MP3 frame sync marker (0xFFE or 0xFFF) in a data buffer.
 * MP3 frames start with an 11-bit sync word (all bits set: 0xFFE or 0xFFF).
 * This allows splitting at frame boundaries instead of arbitrary byte positions.
 *
 * @param data - The audio data window as Uint8Array
 * @param startOffset - Offset to start searching from within the data window
 * @returns Position within the data window of the next frame sync marker, or -1 if not found
 */
function findNextMP3FrameSyncInWindow(
  data: Uint8Array,
  startOffset: number = 0,
): number {
  const maxPos = data.length - 2; // Need at least 2 bytes for sync check

  for (let i = startOffset; i < maxPos; i++) {
    // MP3 frame sync is 11 bits all set: 0xFFE or 0xFFF (first nibble is F, second is E or F)
    // Check if current and next byte form a valid sync word
    if (data[i] === 0xff && (data[i + 1] & 0xe0) === 0xe0) {
      // Double-check: valid MPEG sync should have MPEG version and layer bits
      // Bits: FFFFFFFF FFF(MPEG version)(layer)(padding bit)...
      const byte2 = data[i + 1];
      // MPEG version bits (bits 3-4) should not be 11 (invalid)
      // Layer bits (bits 1-2) should not be 00 (invalid)
      if ((byte2 & 0x18) !== 0x18 && (byte2 & 0x06) !== 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Finds the next MP3 frame sync marker in a blob by reading a small window.
 * This avoids loading the entire blob into memory.
 *
 * @param blob - The audio blob to search
 * @param position - Byte position in the blob to search from
 * @param searchLimit - Maximum distance to search before giving up (for performance)
 * @returns Absolute position in the blob of the next frame sync marker, or -1 if not found
 */
async function findNextMP3FrameSync(
  blob: Blob,
  position: number,
  searchLimit: number = 64 * 1024, // Search up to 64KB ahead
): Promise<number> {
  // Don't search past the end of the blob
  const searchEnd = Math.min(position + searchLimit, blob.size);
  const windowSize = searchEnd - position;

  if (windowSize < 2) {
    // Not enough data to find a sync marker
    return -1;
  }

  // Read only a small window of data for scanning
  const window = blob.slice(position, searchEnd);
  const buffer = await window.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Find sync position within the window
  const relativePos = findNextMP3FrameSyncInWindow(data);

  if (relativePos === -1) {
    return -1;
  }

  // Convert relative position to absolute position in blob
  return position + relativePos;
}

/**
 * Splits an audio blob into smaller chunks.
 * Only MP3 and WAV formats are supported as they can reliably resynchronize
 * at arbitrary byte boundaries.
 *
 * This approach:
 * - Uses byte-based splitting for WAV files
 * - Attempts to find MP3 frame boundaries for cleaner splits
 * - Works without requiring FFmpeg or other external dependencies
 * - Is suitable for Joplin plugin environment
 *
 * @param blob - The original audio blob to split
 * @param maxChunkSize - Maximum size in bytes for each chunk
 * @param mimeType - MIME type of the audio file (must be 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', or 'audio/x-wav')
 * @returns Array of audio blobs, each with the specified MIME type
 *
 * @throws {AudioChunkingError} If chunking parameters are invalid or format is unsupported
 *
 * @example
 * ```typescript
 * const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
 * const chunks = await splitAudioBlob(audioBlob, 25 * 1024 * 1024, 'audio/mpeg');
 * // Process each chunk separately
 * for (const chunk of chunks) {
 *   await processChunk(chunk);
 * }
 * ```
 */
export async function splitAudioBlob(
  blob: Blob,
  maxChunkSize: number,
  mimeType: string,
): Promise<Blob[]> {
  try {
    // Validate format is supported
    if (!isSupportedFormat(mimeType)) {
      throw new AudioChunkingError(
        `Unsupported audio format: ${mimeType}. Only MP3 and WAV formats are supported for chunking. Please convert your file to one of these formats.`,
      );
    }

    // Validate inputs
    if (maxChunkSize <= 0) {
      throw new AudioChunkingError("Maximum chunk size must be greater than 0");
    }

    if (blob.size === 0) {
      throw new AudioChunkingError("Cannot chunk empty blob");
    }

    // Apply safety margin to avoid hitting exact limits due to encoding overhead
    maxChunkSize = Math.floor(maxChunkSize * SAFETY_MARGIN);

    // If blob is smaller than max size, return as-is
    if (blob.size <= maxChunkSize) {
      return [blob];
    }

    // Calculate number of chunks needed
    const numChunks = Math.ceil(blob.size / maxChunkSize);
    const chunks: Blob[] = [];

    // For MP3 files, try to find frame boundaries for cleaner splits
    const isMP3 =
      mimeType.toLowerCase().includes("mpeg") ||
      mimeType.toLowerCase().includes("mp3");

    let currentPosition = 0;

    for (let i = 0; i < numChunks; i++) {
      const start = currentPosition;
      let end = Math.min(start + maxChunkSize, blob.size);

      // For MP3, try to find the next frame sync to avoid splitting mid-frame
      if (isMP3 && i < numChunks - 1) {
        // Don't search on the last chunk - just take whatever is left
        const syncPos = await findNextMP3FrameSync(blob, end);
        if (syncPos !== -1 && syncPos < blob.size) {
          // Found a frame boundary within a reasonable distance
          end = syncPos;
        }
        // If no sync found, just use the byte boundary (fallback)
      }

      // Use Blob.slice() to extract chunk without loading entire file into memory
      const chunk = blob.slice(start, end, mimeType);
      chunks.push(chunk);

      // Update position for next chunk
      currentPosition = end;
    }

    return chunks;
  } catch (error) {
    if (error instanceof AudioChunkingError) {
      throw error;
    }
    throw new AudioChunkingError(
      `Audio chunking failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Checks if a file needs to be chunked based on size.
 * @param fileSize - Size of the file in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if the file needs chunking
 */
export function needsChunking(fileSize: number, maxSize: number): boolean {
  return fileSize > maxSize;
}
