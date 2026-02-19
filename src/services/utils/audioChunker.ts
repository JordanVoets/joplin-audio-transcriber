import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Error thrown when audio chunking fails.
 */
export class AudioChunkingError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "AudioChunkingError";
  }
}

/**
 * Gets the duration of an audio file in seconds.
 * @param filePath - Path to the audio file
 * @returns Duration in seconds
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(
          new AudioChunkingError(
            `Failed to probe audio file: ${err.message}`,
            err,
          ),
        );
        return;
      }

      const duration = metadata.format.duration;
      if (!duration) {
        reject(
          new AudioChunkingError("Could not determine audio file duration"),
        );
        return;
      }

      resolve(duration);
    });
  });
}

/**
 * Splits an audio blob into smaller chunks while maintaining valid audio format.
 * Uses FFmpeg to segment audio at natural boundaries with proper headers.
 *
 * @param blob - The original audio blob to split
 * @param maxChunkSize - Maximum size in bytes for each chunk
 * @param mimeType - MIME type of the audio file (e.g., 'audio/mpeg', 'audio/wav')
 * @returns Array of audio blobs, each with proper headers and valid format
 *
 * @throws {AudioChunkingError} If FFmpeg is not available or chunking fails
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
  let tempDir: string | null = null;

  try {
    // Create temporary directory for processing
    tempDir = await fs.mkdtemp(join(tmpdir(), "audio-chunk-"));
    const inputPath = join(tempDir, "input");
    const outputPattern = join(tempDir, "chunk-%03d");

    // Write blob to temporary file
    const buffer = await blob.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(buffer));

    // Get audio duration to calculate chunk duration
    const durationSeconds = await getAudioDuration(inputPath);

    // Calculate approximate bitrate (bits per second)
    // bitrate = (file size in bytes * 8 bits/byte) / duration in seconds
    const approximateBitrate = (blob.size * 8) / durationSeconds;

    // Calculate chunk duration based on desired chunk size
    // chunk duration = (max chunk size in bytes * 8 bits/byte) / bitrate
    // Add 10% safety margin to ensure chunks stay under the limit
    const chunkDuration = (maxChunkSize * 8 * 0.9) / approximateBitrate;

    // Determine output format from MIME type
    const format = getFormatFromMimeType(mimeType);

    // Split audio using FFmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-f segment`, // Use segment muxer
          `-segment_time ${chunkDuration}`, // Duration of each segment
          `-c copy`, // Copy codec without re-encoding (preserves quality and speed)
          `-reset_timestamps 1`, // Reset timestamps for each chunk
        ])
        .output(`${outputPattern}.${format}`)
        .on("end", () => resolve())
        .on("error", (err) => {
          reject(
            new AudioChunkingError(
              `FFmpeg segmentation failed: ${err.message}`,
              err,
            ),
          );
        })
        .run();
    });

    // Read chunk files and convert to Blobs
    const allFiles = await fs.readdir(tempDir);
    const chunkFiles = allFiles
      .filter((f) => f.startsWith("chunk-"))
      .sort(); // Ensure chunks are in order

    if (chunkFiles.length === 0) {
      throw new AudioChunkingError(
        "No chunks were created. File may be too small to chunk.",
      );
    }

    const chunks: Blob[] = [];
    for (const file of chunkFiles) {
      const chunkPath = join(tempDir, file);
      const chunkBuffer = await fs.readFile(chunkPath);
      chunks.push(new Blob([chunkBuffer], { type: mimeType }));
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
  } finally {
    // Cleanup temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(
          `Failed to cleanup temporary directory ${tempDir}:`,
          cleanupError,
        );
      }
    }
  }
}

/**
 * Maps MIME type to FFmpeg format/extension.
 * @param mimeType - Audio MIME type
 * @returns File extension for the format
 */
function getFormatFromMimeType(mimeType: string): string {
  const mimeToFormat: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/webm": "webm",
    "audio/aac": "aac",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
  };

  const format = mimeToFormat[mimeType.toLowerCase()];
  if (format) {
    return format;
  }

  // Fallback: try to extract from MIME type (e.g., "audio/mp3" -> "mp3")
  const parts = mimeType.split("/");
  if (parts.length === 2) {
    return parts[1].replace("x-", "");
  }

  // Default to mp3 if unknown
  console.warn(`Unknown MIME type ${mimeType}, defaulting to mp3`);
  return "mp3";
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
