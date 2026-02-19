import {
  splitAudioBlob,
  needsChunking,
  AudioChunkingError,
} from "../../../src/services/utils/audioChunker";

// Mock fs/promises module
const mockMkdtemp = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockRm = jest.fn();

jest.mock("fs", () => ({
  promises: {
    mkdtemp: (...args: unknown[]) => mockMkdtemp(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args),
    rm: (...args: unknown[]) => mockRm(...args),
  },
}));

// Mock fluent-ffmpeg
interface MockFfmpegChain {
  outputOptions: jest.Mock;
  output: jest.Mock;
  on: jest.Mock;
  run: jest.Mock;
}

// Create a shared mock chain instance
const mockFfmpegInstance: MockFfmpegChain = {
  outputOptions: jest.fn().mockReturnThis(),
  output: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  run: jest.fn(),
};

jest.mock("fluent-ffmpeg", () => {
  const mockConstructor = jest.fn(() => mockFfmpegInstance);
  (mockConstructor as typeof mockConstructor & { ffprobe: jest.Mock }).ffprobe =
    jest.fn();

  return mockConstructor;
});

// Get the mocked ffmpeg for test configuration
import ffmpeg from "fluent-ffmpeg";
const mockFfprobe = (ffmpeg as typeof ffmpeg & { ffprobe: jest.Mock }).ffprobe;

describe("audioChunker", () => {
  describe("needsChunking", () => {
    it("should return true when file exceeds max size", () => {
      expect(needsChunking(100, 50)).toBe(true);
    });

    it("should return false when file is within max size", () => {
      expect(needsChunking(50, 100)).toBe(false);
    });

    it("should return false when file equals max size", () => {
      expect(needsChunking(100, 100)).toBe(false);
    });

    it("should handle edge case of zero size file", () => {
      expect(needsChunking(0, 100)).toBe(false);
    });

    it("should handle large file sizes", () => {
      const mb100 = 100 * 1024 * 1024;
      const mb25 = 25 * 1024 * 1024;
      expect(needsChunking(mb100, mb25)).toBe(true);
    });
  });

  describe("splitAudioBlob", () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Mock ffprobe - default successful response
      mockFfprobe.mockImplementation((filePath, callback) => {
        callback(null, {
          format: {
            duration: 60, // 60 seconds default
          },
        });
      });

      // Default fs mock implementations
      mockMkdtemp.mockResolvedValue("/tmp/audio-chunk-abc123");
      mockWriteFile.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(["chunk-000.mp3", "chunk-001.mp3"]);
      mockReadFile.mockImplementation((path: string) => {
        // Return different data for different chunks
        if (path.includes("chunk-000")) {
          return Promise.resolve(Buffer.from("chunk0data"));
        }
        return Promise.resolve(Buffer.from("chunk1data"));
      });
      mockRm.mockResolvedValue(undefined);

      // Mock FFmpeg run to simulate success
      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: () => void) => {
          if (event === "end") {
            // Call the end handler immediately to simulate successful completion
            setImmediate(() => handler());
          }
          return mockFfmpegInstance;
        },
      );

      mockFfmpegInstance.run.mockImplementation(() => {
        // FFmpeg run is called, handlers are already registered
      });
    });

    it("should split audio blob into multiple chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });
      const maxChunkSize = 500;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        "audio/mpeg",
      );

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBeInstanceOf(Blob);
      expect(chunks[1]).toBeInstanceOf(Blob);
      expect(chunks[0].type).toBe("audio/mpeg");
      expect(chunks[1].type).toBe("audio/mpeg");
    });

    it("should create temporary directory for processing", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockMkdtemp).toHaveBeenCalledWith(
        expect.stringContaining("audio-chunk-"),
      );
    });

    it("should write blob to temporary file", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("/input"),
        expect.any(Buffer),
      );
    });

    it("should probe audio file for duration", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockFfprobe).toHaveBeenCalledWith(
        expect.stringContaining("/input"),
        expect.any(Function),
      );
    });

    it("should calculate chunk duration based on file size and bitrate", async () => {
      // 1000 bytes, 60 seconds duration
      // bitrate = 1000 * 8 / 60 ≈ 133.33 bits/second
      // chunk duration for 500 bytes with 0.9 safety = (500 * 8 * 0.9) / 133.33 ≈ 27 seconds
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockFfmpegInstance.outputOptions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringMatching(/segment_time/),
          expect.stringMatching(/-c copy/),
        ]),
      );
    });

    it("should use correct FFmpeg options for segmentation", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockFfmpegInstance.outputOptions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("-f segment"),
          expect.stringMatching(/segment_time/),
          expect.stringContaining("-c copy"),
          expect.stringContaining("-reset_timestamps 1"),
        ]),
      );
    });

    it("should handle different MIME types correctly", async () => {
      const testCases = [
        { mime: "audio/mpeg", extension: "mp3" },
        { mime: "audio/wav", extension: "wav" },
        { mime: "audio/flac", extension: "flac" },
        { mime: "audio/ogg", extension: "ogg" },
        { mime: "audio/aac", extension: "aac" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        mockReaddir.mockResolvedValue([`chunk-000.${testCase.extension}`]);

        const audioData = new Blob([new ArrayBuffer(1000)], {
          type: testCase.mime,
        });

        await splitAudioBlob(audioData, 500, testCase.mime);

        expect(mockFfmpegInstance.output).toHaveBeenCalledWith(
          expect.stringContaining(`.${testCase.extension}`),
        );
      }
    });

    it("should sort chunk files to maintain order", async () => {
      // Mock out-of-order chunk files
      mockReaddir.mockResolvedValue([
        "chunk-002.mp3",
        "chunk-000.mp3",
        "chunk-001.mp3",
        "other-file.txt",
      ]);

      mockReadFile.mockImplementation((path: string) => {
        if (path.includes("chunk-000"))
          return Promise.resolve(Buffer.from("0"));
        if (path.includes("chunk-001"))
          return Promise.resolve(Buffer.from("1"));
        if (path.includes("chunk-002"))
          return Promise.resolve(Buffer.from("2"));
        return Promise.resolve(Buffer.from("?"));
      });

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      const chunks = await splitAudioBlob(audioData, 500, "audio/mpeg");

      // Should have 3 chunks, sorted correctly (chunk-000, chunk-001, chunk-002)
      expect(chunks).toHaveLength(3);
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("chunk-000"),
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("chunk-001"),
      );
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("chunk-002"),
      );
    });

    it("should cleanup temporary directory on success", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining("/tmp/audio-chunk-"),
        { recursive: true, force: true },
      );
    });

    it("should cleanup temporary directory on error", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      // Mock FFmpeg to fail
      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: (error: Error) => void) => {
          if (event === "error") {
            setImmediate(() => handler(new Error("FFmpeg failed")));
          }
          return mockFfmpegInstance;
        },
      );

      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow();

      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining("/tmp/audio-chunk-"),
        { recursive: true, force: true },
      );
    });

    it("should throw AudioChunkingError when ffprobe fails", async () => {
      mockFfprobe.mockImplementation((filePath, callback) => {
        callback(new Error("Probe failed"), null);
      });

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow(AudioChunkingError);
    });

    it("should throw AudioChunkingError when duration is missing", async () => {
      mockFfprobe.mockImplementation((filePath, callback) => {
        callback(null, { format: {} }); // No duration
      });

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow(AudioChunkingError);
      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow("Could not determine audio file duration");
    });

    it("should throw AudioChunkingError when FFmpeg segmentation fails", async () => {
      mockFfmpegInstance.on.mockImplementation(
        (event: string, handler: (error: Error) => void) => {
          if (event === "error") {
            setImmediate(() => handler(new Error("Segmentation failed")));
          }
          return mockFfmpegInstance;
        },
      );

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow(AudioChunkingError);
      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow("FFmpeg segmentation failed");
    });

    it("should throw AudioChunkingError when no chunks are created", async () => {
      mockReaddir.mockResolvedValue([]); // No chunk files

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow(AudioChunkingError);
      await expect(
        splitAudioBlob(audioData, 500, "audio/mpeg"),
      ).rejects.toThrow("No chunks were created");
    });

    it("should handle unknown MIME types with fallback", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "badformat", // Malformed MIME type (no "/")
      });

      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await splitAudioBlob(audioData, 500, "badformat");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown MIME type"),
      );
      expect(mockFfmpegInstance.output).toHaveBeenCalledWith(
        expect.stringContaining(".mp3"), // Fallback to mp3
      );

      consoleWarnSpy.mockRestore();
    });

    it("should warn but not fail on cleanup errors", async () => {
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      mockRm.mockRejectedValue(new Error("Cleanup failed"));

      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      // Should still succeed even if cleanup fails
      const chunks = await splitAudioBlob(audioData, 500, "audio/mpeg");

      expect(chunks).toHaveLength(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to cleanup temporary directory"),
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should preserve MIME type in returned chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/flac",
      });

      const chunks = await splitAudioBlob(audioData, 500, "audio/flac");

      expect(chunks[0].type).toBe("audio/flac");
      expect(chunks[1].type).toBe("audio/flac");
    });

    it("should apply 10% safety margin to chunk size calculation", async () => {
      // With 1000 bytes file, 60 seconds, bitrate = 133.33 bits/sec
      // For 500 byte chunks: (500 * 8 * 0.9) / 133.33 ≈ 27 seconds
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: "audio/mpeg",
      });

      await splitAudioBlob(audioData, 500, "audio/mpeg");

      // Check that segment_time was called with a value that includes the 0.9 factor
      const outputOptionsCall =
        mockFfmpegInstance.outputOptions.mock.calls[0][0];
      const segmentTimeOption = outputOptionsCall.find((opt: string) =>
        opt.includes("segment_time"),
      );

      expect(segmentTimeOption).toBeDefined();
      // The value should be less than what it would be without the 0.9 factor
      // (500 * 8) / 133.33 = 30 seconds without safety margin
      // (500 * 8 * 0.9) / 133.33 = 27 seconds with safety margin
      const timeMatch = segmentTimeOption.match(/segment_time (\d+\.?\d*)/);
      expect(timeMatch).not.toBeNull();
      const segmentTime = parseFloat(timeMatch![1]);
      expect(segmentTime).toBeLessThan(30);
      expect(segmentTime).toBeCloseTo(27, 0);
    });
  });
});
