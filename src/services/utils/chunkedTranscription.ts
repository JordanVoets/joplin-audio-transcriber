import type { ITranscriptionService } from "../ITranscriptionService";
import {
  splitAudioBlob,
  AudioChunkingError,
  SAFETY_MARGIN,
} from "./audioChunker";

/**
 * Error thrown when chunked transcription fails.
 */
export class ChunkedTranscriptionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ChunkedTranscriptionError";
  }
}

/**
 * Transcribes audio data with automatic chunking if the file exceeds service limits.
 *
 * This function transparently handles large files by:
 * 1. Checking the service's maximum file size limit via getMaxFileSize()
 * 2. Splitting the audio into chunks if it exceeds the limit
 * 3. Transcribing each chunk sequentially
 * 4. Concatenating the results
 *
 * If the file is within the service's limit, it is transcribed directly without chunking.
 * Services can return Infinity from getMaxFileSize() to indicate no file size limit.
 *
 * @param service - The transcription service to use
 * @param audioData - The audio file as a Blob
 * @param fileName - The name of the audio file
 * @param mimeType - The MIME type of the audio file
 * @returns A promise that resolves to the complete transcribed text
 *
 * @throws {ChunkedTranscriptionError} If transcription or chunking fails
 */
export async function transcribeWithChunking(
  service: ITranscriptionService,
  audioData: Blob,
  fileName: string,
  mimeType: string,
): Promise<string> {
  try {
    // Check if service has a file size limit
    const maxFileSize = service.getMaxFileSize();
    // Apply safety margin to account for multipart/base64 encoding overhead
    const effectiveMaxSize = Math.floor(maxFileSize * SAFETY_MARGIN);

    // If file is within the effective limit (with safety margin), transcribe directly
    if (audioData.size <= effectiveMaxSize) {
      console.log(
        `File size (${formatBytes(audioData.size)}) is within service limit (${formatBytes(maxFileSize)}, effective: ${formatBytes(effectiveMaxSize)}). Transcribing directly...`,
      );
      return await service.transcribe(audioData, fileName, mimeType);
    }

    // File exceeds effective limit - needs chunking
    console.log(
      `File size (${formatBytes(audioData.size)}) exceeds effective limit (${formatBytes(effectiveMaxSize)}). Splitting into chunks...`,
    );

    // Split audio into chunks
    let chunks: Blob[];
    try {
      chunks = await splitAudioBlob(audioData, maxFileSize, mimeType);
    } catch (error) {
      if (error instanceof AudioChunkingError) {
        throw new ChunkedTranscriptionError(
          `Failed to split audio file: ${error.message}`,
          error,
        );
      }
      throw error;
    }

    console.log(`Split audio into ${chunks.length} chunks`);

    // Transcribe each chunk sequentially
    const transcriptions: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkNumber = i + 1;
      const chunkFileName = generateChunkFileName(fileName, chunkNumber);

      console.log(
        `Transcribing chunk ${chunkNumber}/${chunks.length} (${formatBytes(chunk.size)})...`,
      );

      try {
        const transcription = await service.transcribe(
          chunk,
          chunkFileName,
          mimeType,
        );
        transcriptions.push(transcription);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new ChunkedTranscriptionError(
          `Failed to transcribe chunk ${chunkNumber}/${chunks.length}: ${errorMessage}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    // Concatenate all transcriptions with a single space separator
    const fullTranscription = transcriptions.join(" ");

    console.log(
      `Successfully transcribed ${chunks.length} chunks into ${fullTranscription.length} characters`,
    );

    return fullTranscription;
  } catch (error) {
    if (error instanceof ChunkedTranscriptionError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ChunkedTranscriptionError(
      `Chunked transcription failed: ${errorMessage}`,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Generates a filename for an audio chunk.
 * @param originalFileName - The original file name
 * @param chunkNumber - The chunk number (1-indexed)
 * @returns Filename with chunk number inserted
 *
 * @example
 * generateChunkFileName('recording.mp3', 1) // => 'recording-chunk-001.mp3'
 * generateChunkFileName('meeting.wav', 12) // => 'meeting-chunk-012.wav'
 */
function generateChunkFileName(
  originalFileName: string,
  chunkNumber: number,
): string {
  const lastDotIndex = originalFileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No extension
    return `${originalFileName}-chunk-${String(chunkNumber).padStart(3, "0")}`;
  }

  const baseName = originalFileName.substring(0, lastDotIndex);
  const extension = originalFileName.substring(lastDotIndex);
  return `${baseName}-chunk-${String(chunkNumber).padStart(3, "0")}${extension}`;
}

/**
 * Formats bytes into a human-readable string.
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "25.5 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(2))} ${sizes[clampedIndex]}`;
}
