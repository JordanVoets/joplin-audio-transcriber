import {
  transcribeWithChunking,
  ChunkedTranscriptionError,
} from "../../../src/services/utils/chunkedTranscription";
import type { ITranscriptionService } from "../../../src/services/ITranscriptionService";
import { AudioChunkingError } from "../../../src/services/utils/audioChunker";

// Mock the audioChunker module
jest.mock("../../../src/services/utils/audioChunker", () => ({
  splitAudioBlob: jest.fn(),
  AudioChunkingError: jest.requireActual(
    "../../../src/services/utils/audioChunker",
  ).AudioChunkingError,
  SAFETY_MARGIN: jest.requireActual("../../../src/services/utils/audioChunker")
    .SAFETY_MARGIN,
}));

import {
  splitAudioBlob,
  SAFETY_MARGIN,
} from "../../../src/services/utils/audioChunker";

/**
 * Mock implementation of ITranscriptionService for testing
 */
class MockTranscriptionService implements ITranscriptionService {
  constructor(
    private maxFileSize: number = 25 * 1024 * 1024, // 25 MB default
    private transcribeImpl: (
      audioData: Blob,
      fileName: string,
      mimeType: string,
    ) => Promise<string> = async () => "Mock transcription",
  ) {}

  async transcribe(
    audioData: Blob,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    return this.transcribeImpl(audioData, fileName, mimeType);
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}

describe("chunkedTranscription", () => {
  const TEST_FILE_NAME = "test-audio.mp3";
  const TEST_MIME_TYPE = "audio/mpeg";
  const TEST_TRANSCRIPTION_1 = "This is the first chunk";
  const TEST_TRANSCRIPTION_2 = "This is the second chunk";
  const TEST_TRANSCRIPTION_3 = "This is the third chunk";
  const KB = 1024;

  // Helper to create test audio blob
  const createTestBlob = (size: number): Blob => {
    return new Blob([new ArrayBuffer(size)], { type: TEST_MIME_TYPE });
  };

  // Suppress console logs during tests
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock setTimeout to execute callbacks immediately (skip delays)
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: () => void): NodeJS.Timeout => {
        callback();
        return {} as NodeJS.Timeout;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("transcribeWithChunking", () => {
    describe("when file is within service limit", () => {
      it("should transcribe directly without chunking", async () => {
        const smallFile = createTestBlob(10 * KB); // 10 KB
        const maxFileSize = 25 * KB; // 25 KB

        const transcribeImpl = jest
          .fn()
          .mockResolvedValue("Direct transcription");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          smallFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe("Direct transcription");
        expect(transcribeImpl).toHaveBeenCalledTimes(1);
        expect(transcribeImpl).toHaveBeenCalledWith(
          smallFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );
        expect(splitAudioBlob).not.toHaveBeenCalled();
      });

      it("should transcribe directly when file is at effective limit (with safety margin)", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const effectiveMaxSize = Math.floor(maxFileSize * SAFETY_MARGIN);
        // Create file just under effective limit to avoid chunking
        const fileAtEffectiveLimit = createTestBlob(effectiveMaxSize - 1);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValue("At effective limit transcription");
        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          fileAtEffectiveLimit,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe("At effective limit transcription");
        expect(transcribeImpl).toHaveBeenCalledTimes(1);
        expect(splitAudioBlob).not.toHaveBeenCalled();
      });
    });

    describe("when file exceeds service limit", () => {
      it("should split file and transcribe chunks sequentially", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcriptions = [TEST_TRANSCRIPTION_1, TEST_TRANSCRIPTION_2];
        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce(transcriptions[0])
          .mockResolvedValueOnce(transcriptions[1]);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe(`${TEST_TRANSCRIPTION_1} ${TEST_TRANSCRIPTION_2}`);
        expect(splitAudioBlob).toHaveBeenCalledTimes(1);
        expect(splitAudioBlob).toHaveBeenCalledWith(
          largeFile,
          maxFileSize,
          TEST_MIME_TYPE,
        );
        expect(transcribeImpl).toHaveBeenCalledTimes(2);
      }, 5000); // Fast with fake timers (delays are instant)

      it("should concatenate multiple chunk transcriptions with space separator", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(80 * KB); // 80 KB

        const chunk1 = createTestBlob(25 * KB);
        const chunk2 = createTestBlob(25 * KB);
        const chunk3 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([
          chunk1,
          chunk2,
          chunk3,
        ]);

        const transcriptions = [
          TEST_TRANSCRIPTION_1,
          TEST_TRANSCRIPTION_2,
          TEST_TRANSCRIPTION_3,
        ];
        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce(transcriptions[0])
          .mockResolvedValueOnce(transcriptions[1])
          .mockResolvedValueOnce(transcriptions[2]);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe(
          `${TEST_TRANSCRIPTION_1} ${TEST_TRANSCRIPTION_2} ${TEST_TRANSCRIPTION_3}`,
        );
        expect(transcribeImpl).toHaveBeenCalledTimes(3);
      }, 5000); // Fast with fake timers (delays are instant)

      it("should pass correct chunk filenames to transcribe", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Chunk 1 text")
          .mockResolvedValueOnce("Chunk 2 text");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        // Verify chunk filenames
        const calls = transcribeImpl.mock.calls;
        expect(calls[0][1]).toBe("test-audio-chunk-001.mp3");
        expect(calls[1][1]).toBe("test-audio-chunk-002.mp3");
      }, 5000); // Fast with fake timers (delays are instant)

      it("should generate correct chunk filenames for files without extension", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB
        const fileNameNoExt = "audio-recording";

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Text 1")
          .mockResolvedValueOnce("Text 2");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        await transcribeWithChunking(
          service,
          largeFile,
          fileNameNoExt,
          TEST_MIME_TYPE,
        );

        const calls = transcribeImpl.mock.calls;
        expect(calls[0][1]).toBe("audio-recording-chunk-001");
        expect(calls[1][1]).toBe("audio-recording-chunk-002");
      }, 5000); // Fast with fake timers (delays are instant)
    });

    describe("error handling", () => {
      it("should throw ChunkedTranscriptionError when splitAudioBlob fails", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunkingError = new AudioChunkingError("FFmpeg not found");
        (splitAudioBlob as jest.Mock).mockRejectedValue(chunkingError);

        const service = new MockTranscriptionService(maxFileSize);

        await expect(
          transcribeWithChunking(
            service,
            largeFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          ),
        ).rejects.toThrow(ChunkedTranscriptionError);
        await expect(
          transcribeWithChunking(
            service,
            largeFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          ),
        ).rejects.toThrow("Failed to split audio file: FFmpeg not found");
      });

      it("should throw ChunkedTranscriptionError when chunk transcription fails", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcriptError = new Error("API rate limit exceeded");
        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Chunk 1 text")
          .mockRejectedValueOnce(transcriptError);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        try {
          await transcribeWithChunking(
            service,
            largeFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          );
          fail("Should have thrown ChunkedTranscriptionError");
        } catch (error) {
          expect(error).toBeInstanceOf(ChunkedTranscriptionError);
          expect((error as Error).message).toContain(
            "Failed to transcribe chunk 2/2",
          );
        }
      }, 5000); // Fast with fake timers (delays are instant)

      it("should include chunk context in error message on transcription failure", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(75 * KB); // 75 KB

        const chunk1 = createTestBlob(25 * KB);
        const chunk2 = createTestBlob(25 * KB);
        const chunk3 = createTestBlob(25 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([
          chunk1,
          chunk2,
          chunk3,
        ]);

        const transcriptError = new Error("Timeout");
        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Chunk 1")
          .mockResolvedValueOnce("Chunk 2")
          .mockRejectedValueOnce(transcriptError);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        try {
          await transcribeWithChunking(
            service,
            largeFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          );
          fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ChunkedTranscriptionError);
          expect((error as Error).message).toContain("chunk 3/3");
          expect((error as Error).message).toContain("Timeout");
        }
      }, 5000); // Fast with fake timers (delays are instant)

      it("should throw ChunkedTranscriptionError when direct transcription fails", async () => {
        const smallFile = createTestBlob(10 * KB); // 10 KB
        const maxFileSize = 25 * KB; // 25 KB

        const transcriptError = new Error("Network error");
        const transcribeImpl = jest.fn().mockRejectedValue(transcriptError);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        await expect(
          transcribeWithChunking(
            service,
            smallFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          ),
        ).rejects.toThrow(ChunkedTranscriptionError);

        try {
          await transcribeWithChunking(
            service,
            smallFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          );
          fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ChunkedTranscriptionError);
          expect((error as Error).message).toContain("Network error");
        }
      });

      it("should preserve the original error as cause", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const originalError = new Error("Original API error");
        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Chunk 1")
          .mockRejectedValueOnce(originalError);

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        try {
          await transcribeWithChunking(
            service,
            largeFile,
            TEST_FILE_NAME,
            TEST_MIME_TYPE,
          );
          fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(ChunkedTranscriptionError);
          expect((error as ChunkedTranscriptionError).cause).toBe(
            originalError,
          );
        }
      }, 5000); // Fast with fake timers (delays are instant)
    });

    describe("service interface compatibility", () => {
      it("should work with services that have no file size limit", async () => {
        const smallFile = createTestBlob(100 * KB); // 100 KB

        const transcribeImpl = jest.fn().mockResolvedValue("No limit result");

        // Service with very large limit (effectively no limit for practical purposes)
        const service = new MockTranscriptionService(
          Number.MAX_SAFE_INTEGER,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          smallFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe("No limit result");
        expect(transcribeImpl).toHaveBeenCalledTimes(1);
        expect(splitAudioBlob).not.toHaveBeenCalled();
      });

      it("should pass correct MIME type to splitAudioBlob", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB
        const customMimeType = "audio/wav";

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Text 1")
          .mockResolvedValueOnce("Text 2");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          customMimeType,
        );

        expect(splitAudioBlob).toHaveBeenCalledWith(
          largeFile,
          maxFileSize,
          customMimeType,
        );
      }, 5000); // Fast with fake timers (delays are instant)
    });

    describe("edge cases", () => {
      it("should handle empty transcription results", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("")
          .mockResolvedValueOnce("");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe(" "); // Two empty strings joined by space
      }, 5000); // Fast with fake timers (delays are instant)

      it("should handle very large number of chunks", async () => {
        const maxFileSize = 10 * KB; // 10 KB
        const largeFile = createTestBlob(100 * KB); // 100 KB (would be 10 chunks)

        const chunks = Array(10)
          .fill(null)
          .map(() => createTestBlob(10 * KB));

        (splitAudioBlob as jest.Mock).mockResolvedValue(chunks);

        const textResults = Array(10)
          .fill(null)
          .map((_, i) => `Chunk ${i + 1}`);

        const transcribeImpl = jest.fn();
        textResults.forEach((text) => {
          transcribeImpl.mockResolvedValueOnce(text);
        });

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        const result = await transcribeWithChunking(
          service,
          largeFile,
          TEST_FILE_NAME,
          TEST_MIME_TYPE,
        );

        expect(result).toBe(textResults.join(" "));
        expect(transcribeImpl).toHaveBeenCalledTimes(10);
      }, 10000); // Slightly more time needed for 10 chunks even with mocked delays

      it("should handle special characters in filenames", async () => {
        const maxFileSize = 25 * KB; // 25 KB
        const largeFile = createTestBlob(60 * KB); // 60 KB
        const specialFileName = "meeting_2024-02-20 (draft).mp3";

        const chunk1 = createTestBlob(30 * KB);
        const chunk2 = createTestBlob(30 * KB);

        (splitAudioBlob as jest.Mock).mockResolvedValue([chunk1, chunk2]);

        const transcribeImpl = jest
          .fn()
          .mockResolvedValueOnce("Text 1")
          .mockResolvedValueOnce("Text 2");

        const service = new MockTranscriptionService(
          maxFileSize,
          transcribeImpl,
        );

        await transcribeWithChunking(
          service,
          largeFile,
          specialFileName,
          TEST_MIME_TYPE,
        );

        const calls = transcribeImpl.mock.calls;
        expect(calls[0][1]).toBe("meeting_2024-02-20 (draft)-chunk-001.mp3");
        expect(calls[1][1]).toBe("meeting_2024-02-20 (draft)-chunk-002.mp3");
      }, 5000); // Fast with fake timers (delays are instant)
    });
  });
});
