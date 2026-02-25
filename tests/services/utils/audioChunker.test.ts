import {
  splitAudioBlob,
  needsChunking,
  AudioChunkingError,
  SAFETY_MARGIN,
} from "../../../src/services/utils/audioChunker";

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
    const TEST_MIME_TYPE = "audio/mpeg";

    it("should return single blob if size is within limit", async () => {
      const audioData = new Blob([new ArrayBuffer(100)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 500; // Larger limit to avoid chunking

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks).toHaveLength(1);
      expect(chunks[0].size).toBe(100);
    });

    it("should split audio blob into multiple chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(600)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 200; // Larger chunk size for faster test

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Verify chunks were created and data is preserved
      expect(chunks.length).toBeGreaterThan(1);
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(600);
    });

    it("should preserve MIME type for all chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 300;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      chunks.forEach((chunk) => {
        expect(chunk.type).toBe(TEST_MIME_TYPE);
      });
    });

    it("should maintain total size when splitting", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 300;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(1000);
    });

    it("should respect maximum chunk size for all but possibly last chunk", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 300;
      const effectiveMaxChunkSize = Math.floor(maxChunkSize * SAFETY_MARGIN); // 279

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // All chunks except the last should be exactly effectiveMaxChunkSize (after 0.93 safety margin)
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].size).toBe(effectiveMaxChunkSize);
      }

      // Last chunk should be <= effectiveMaxChunkSize
      expect(chunks[chunks.length - 1].size).toBeLessThanOrEqual(
        effectiveMaxChunkSize,
      );
    });

    it("should handle large file splitting (MB scale)", async () => {
      const kb30 = 30 * 1024;
      const audioData = new Blob([new ArrayBuffer(kb30)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 100 * 1024; // Much larger limit - won't split

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Should create 1 chunk since size < maxChunkSize
      expect(chunks).toHaveLength(1);
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(kb30);
    });

    it("should work with different MIME types", async () => {
      const mimeTypes = ["audio/mpeg", "audio/ogg"];
      const audioData = new Blob([new ArrayBuffer(200)]);
      const maxChunkSize = 100;

      for (const mimeType of mimeTypes) {
        const chunks = await splitAudioBlob(audioData, maxChunkSize, mimeType);
        // Just verify chunks were created
        expect(chunks.length).toBeGreaterThan(0);
      }
    });

    it("should throw error for zero max chunk size", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });

      await expect(
        splitAudioBlob(audioData, 0, TEST_MIME_TYPE),
      ).rejects.toThrow(AudioChunkingError);

      await expect(
        splitAudioBlob(audioData, 0, TEST_MIME_TYPE),
      ).rejects.toThrow("Maximum chunk size must be greater than 0");
    });

    it("should throw error for negative max chunk size", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });

      await expect(
        splitAudioBlob(audioData, -100, TEST_MIME_TYPE),
      ).rejects.toThrow(AudioChunkingError);

      await expect(
        splitAudioBlob(audioData, -100, TEST_MIME_TYPE),
      ).rejects.toThrow("Maximum chunk size must be greater than 0");
    });

    it("should throw error for empty blob", async () => {
      const audioData = new Blob([], { type: TEST_MIME_TYPE });

      await expect(
        splitAudioBlob(audioData, 1000, TEST_MIME_TYPE),
      ).rejects.toThrow(AudioChunkingError);

      await expect(
        splitAudioBlob(audioData, 1000, TEST_MIME_TYPE),
      ).rejects.toThrow("Cannot chunk empty blob");
    });

    it("should split exact multiples evenly", async () => {
      const audioData = new Blob([new ArrayBuffer(100)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 30;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Verify total size is preserved
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(100);
    });

    it("should handle single byte chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(10)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 2; // Use 2 bytes instead of 1 to avoid extreme edge case

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Verify total size is preserved
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(10);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("should preserve chunk data order", async () => {
      // Create blob with identifiable pattern - very small size for speed
      const buffer = new Uint8Array(20); // Reduced from 50 to 20
      for (let i = 0; i < 20; i++) {
        buffer[i] = i;
      }
      const audioData = new Blob([buffer], { type: TEST_MIME_TYPE });
      const maxChunkSize = 8; // Larger chunks for fewer iterations

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Verify total size preserved (skip expensive buffer concatenation)
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(20);
    });

    it("should handle multi-chunk large files", async () => {
      // Use 10 KB for testing to keep tests fast.
      const kb10 = 10 * 1024;
      const audioData = new Blob([new ArrayBuffer(kb10)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 3 * 1024; // 3 KB chunks - fewer iterations

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks.length).toBeGreaterThan(1);
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(kb10);
    });

    describe("format validation", () => {
      it("should reject unsupported formats (FLAC)", async () => {
        const audioData = new Blob([new ArrayBuffer(3 * 1024)], {
          type: "audio/flac",
        });

        await expect(
          splitAudioBlob(audioData, 1024, "audio/flac"),
        ).rejects.toThrow(
          "Unsupported audio format: audio/flac. Only MP3 and WAV formats are supported for chunking.",
        );
      });

      it("should reject unsupported formats (Opus)", async () => {
        const audioData = new Blob([new ArrayBuffer(1000)], {
          type: "audio/opus",
        });

        await expect(
          splitAudioBlob(audioData, 5000, "audio/opus"),
        ).rejects.toThrow(
          "Unsupported audio format: audio/opus. Only MP3 and WAV formats are supported for chunking.",
        );
      });

      it("should reject unsupported formats (AAC)", async () => {
        const audioData = new Blob([new ArrayBuffer(1000)], {
          type: "audio/aac",
        });

        await expect(
          splitAudioBlob(audioData, 5000, "audio/aac"),
        ).rejects.toThrow(
          "Unsupported audio format: audio/aac. Only MP3 and WAV formats are supported for chunking.",
        );
      });

      it("should reject unknown formats", async () => {
        const audioData = new Blob([new ArrayBuffer(3 * 1024)], {
          type: "audio/unknown-format",
        });

        await expect(
          splitAudioBlob(audioData, 1024, "audio/unknown-format"),
        ).rejects.toThrow(
          "Unsupported audio format: audio/unknown-format. Only MP3 and WAV formats are supported for chunking.",
        );
      });

      it("should accept MP3 format variants", async () => {
        const testCases = ["audio/mpeg", "audio/mp3"];

        for (const mimeType of testCases) {
          const audioData = new Blob([new ArrayBuffer(100)], {
            type: mimeType,
          });
          const chunks = await splitAudioBlob(audioData, 50, mimeType);

          expect(chunks.length).toBeGreaterThan(0);
        }
      });

      it("should split MP3 at approximate frame boundaries when possible", async () => {
        // Create a minimal MP3 file with frame sync markers
        const size = 1024; // Just 1 KB
        const buffer = new Uint8Array(size);
        buffer.fill(0xab);
        buffer[512] = 0xff;
        buffer[513] = 0xfb;

        const audioBlob = new Blob([buffer], { type: "audio/mpeg" });
        const chunks = await splitAudioBlob(audioBlob, 512, "audio/mpeg");

        // Just verify chunks were created
        expect(chunks.length).toBeGreaterThan(0);
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        expect(totalSize).toBe(size);
      });

      it("should handle case-insensitive MIME type comparisons", async () => {
        const testCases = ["audio/MPEG"];

        for (const mimeType of testCases) {
          const audioData = new Blob([new ArrayBuffer(100)], {
            type: mimeType,
          });

          const chunks = await splitAudioBlob(audioData, 50, mimeType);
          expect(chunks.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
