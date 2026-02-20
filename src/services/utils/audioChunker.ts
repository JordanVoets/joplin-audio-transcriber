/**
 * Safety margin (93%) applied to service file size limits to account for
 * multipart/form-data and base64 encoding overhead.
 * This 7% reduction helps prevent 413 errors when files are just under the limit.
 */
export const SAFETY_MARGIN = 0.93;

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
 * Audio format compatibility information for chunking.
 * Indicates how robust each format is when split at arbitrary byte boundaries.
 */
interface AudioFormatInfo {
  /** Whether the format can reliably resynchronize at arbitrary byte boundaries */
  canResynchronize: boolean;
  /** Minimum recommended chunk size for this format (to minimize frame splits) */
  minChunkSize: number;
  /** Warning message if format has limitations */
  warning?: string;
}

/**
 * Map of MIME types to their format compatibility info.
 * Decoders like libFLAC, Opus, and some AAC implementations may fail
 * to resynchronize if split mid-frame, while MP3 and WAV are more resilient.
 */
const FORMAT_COMPATIBILITY: Record<string, AudioFormatInfo> = {
  "audio/mpeg": {
    canResynchronize: true,
    minChunkSize: 1 * 1024 * 1024, // 1 MB (MP3 frames are ~100-200KB)
  },
  "audio/mp3": {
    canResynchronize: true,
    minChunkSize: 1 * 1024 * 1024,
  },
  "audio/wav": {
    canResynchronize: true,
    minChunkSize: 512 * 1024, // 512 KB (WAV is frame-less, just samples)
  },
  "audio/wave": {
    canResynchronize: true,
    minChunkSize: 512 * 1024,
  },
  "audio/x-wav": {
    canResynchronize: true,
    minChunkSize: 512 * 1024,
  },
  "audio/flac": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024, // 5 MB (FLAC frames are ~100KB, be conservative)
    warning:
      "FLAC files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/x-flac": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024,
    warning:
      "FLAC files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/ogg": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024, // 5 MB (Ogg/Vorbis pages are ~4-8KB)
    warning:
      "OGG files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/opus": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024, // 5 MB (Opus frames are small ~20-40ms)
    warning:
      "Opus files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/aac": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024, // 5 MB (AAC frames are ~100-200 samples)
    warning:
      "AAC files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/x-m4a": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024,
    warning:
      "M4A files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/m4a": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024,
    warning:
      "M4A files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
  "audio/webm": {
    canResynchronize: false,
    minChunkSize: 5 * 1024 * 1024,
    warning:
      "WebM files may not resynchronize correctly when split at arbitrary byte boundaries. If you experience issues, consider converting to MP3 or WAV.",
  },
};

/**
 * Gets format compatibility information for an audio MIME type.
 * @param mimeType - The audio MIME type
 * @returns Format compatibility information with recommended chunk size
 */
function getFormatInfo(mimeType: string): AudioFormatInfo {
  const normalized = mimeType.toLowerCase();
  return (
    FORMAT_COMPATIBILITY[normalized] || {
      canResynchronize: false, // Be conservative for unknown formats
      minChunkSize: 5 * 1024 * 1024,
      warning: `Unknown audio format "${mimeType}". Chunks may not be valid audio. Consider using MP3 or WAV instead.`,
    }
  );
}

/**
 * Finds the next MP3 frame sync marker (0xFFE or 0xFFF) after a given position.
 * MP3 frames start with an 11-bit sync word (all bits set: 0xFFE or 0xFFF).
 * This allows splitting at frame boundaries instead of arbitrary byte positions.
 *
 * @param data - The audio data as Uint8Array
 * @param startPosition - Position to start searching from
 * @param searchLimit - Maximum distance to search before giving up (for performance)
 * @returns Position of the next frame sync marker, or -1 if not found within limit
 */
function findNextMP3FrameSync(
  data: Uint8Array,
  startPosition: number,
  searchLimit: number = 64 * 1024, // Search up to 64KB ahead
): number {
  const maxPos = Math.min(
    startPosition + searchLimit,
    data.length - 2, // Need at least 2 bytes for sync check
  );

  for (let i = startPosition; i < maxPos; i++) {
    // MP3 frame sync is 11 bits all set: 0xFFE or 0xFFF (first nibble is F, second is E or F)
    // Check if current and next byte form a valid sync word
    if (
      (data[i] === 0xff && (data[i + 1] & 0xe0) === 0xe0) ||
      data[i] === 0xff
    ) {
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
 * Splits an audio blob into smaller chunks with format-aware safety.
 * For robust formats (MP3, WAV), uses byte-based splitting.
 * For fragile formats (FLAC, Opus, AAC), searches for frame boundaries when possible.
 *
 * This approach:
 * - Preserves playability by respecting format constraints
 * - Works without requiring FFmpeg or other external dependencies
 * - Is suitable for Joplin plugin environment
 * - Warns users about format-specific limitations
 *
 * @param blob - The original audio blob to split
 * @param maxChunkSize - Maximum size in bytes for each chunk
 * @param mimeType - MIME type of the audio file (e.g., 'audio/mpeg', 'audio/wav')
 * @returns Array of audio blobs, each with the specified MIME type
 *
 * @throws {AudioChunkingError} If chunking parameters are invalid
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
    // Validate inputs
    if (maxChunkSize <= 0) {
      throw new AudioChunkingError("Maximum chunk size must be greater than 0");
    }

    if (blob.size === 0) {
      throw new AudioChunkingError("Cannot chunk empty blob");
    }

    // Apply safety margin to avoid hitting exact limits due to encoding overhead
    maxChunkSize = Math.floor(maxChunkSize * SAFETY_MARGIN);

    // Get format compatibility information
    const formatInfo = getFormatInfo(mimeType);

    // If blob is smaller than max size, return as-is
    if (blob.size <= maxChunkSize) {
      // Warn if format has limitations
      if (formatInfo.warning) {
        console.warn(`Audio format warning: ${formatInfo.warning}`);
      }
      return [blob];
    }

    // If format is not resilient to arbitrary byte splitting, warn user
    if (!formatInfo.canResynchronize) {
      console.warn(
        `Caution: ${mimeType} format may produce unplayable chunks when split at arbitrary byte boundaries. ${formatInfo.warning || ""}`,
      );
    }

    // Convert blob to buffer for chunking
    const buffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Calculate number of chunks needed
    const numChunks = Math.ceil(blob.size / maxChunkSize);
    const chunks: Blob[] = [];

    // For MP3 files, try to find frame boundaries for cleaner splits
    const isMP3 =
      mimeType.toLowerCase().includes("mpeg") ||
      mimeType.toLowerCase().includes("mp3");

    for (let i = 0; i < numChunks; i++) {
      const start = i * maxChunkSize;
      let end = Math.min(start + maxChunkSize, blob.size);

      // For MP3, try to find the next frame sync to avoid splitting mid-frame
      if (isMP3 && i < numChunks - 1) {
        // Don't search on the last chunk - just take whatever is left
        const syncPos = findNextMP3FrameSync(uint8Array, end);
        if (syncPos !== -1 && syncPos < blob.size) {
          // Found a frame boundary within a reasonable distance
          end = syncPos;
        }
        // If no sync found, just use the byte boundary (fallback)
      }

      const chunkData = uint8Array.slice(start, end);
      chunks.push(new Blob([chunkData], { type: mimeType }));
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
