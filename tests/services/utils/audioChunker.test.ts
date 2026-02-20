import {
  splitAudioBlob,
  needsChunking,
  AudioChunkingError,
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
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 5000;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(audioData);
    });

    it("should split audio blob into multiple chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 300;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // 1000 bytes / 300 bytes per chunk = 3.33, so 4 chunks
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toBeInstanceOf(Blob);
      expect(chunks[1]).toBeInstanceOf(Blob);
      expect(chunks[2]).toBeInstanceOf(Blob);
      expect(chunks[3]).toBeInstanceOf(Blob);
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

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // All chunks except the last should be exactly maxChunkSize
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].size).toBe(maxChunkSize);
      }

      // Last chunk should be <= maxChunkSize
      expect(chunks[chunks.length - 1].size).toBeLessThanOrEqual(maxChunkSize);
    });

    it("should handle large file splitting (MB scale)", async () => {
      const mb10 = 10 * 1024 * 1024;
      const audioData = new Blob([new ArrayBuffer(mb10)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 2 * 1024 * 1024; // 2 MB

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks).toHaveLength(5); // 10 MB / 2 MB = 5 chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(mb10);
    });

    it("should work with different MIME types", async () => {
      const mimeTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"];
      const audioData = new Blob([new ArrayBuffer(600)]);
      const maxChunkSize = 300;

      for (const mimeType of mimeTypes) {
        const chunks = await splitAudioBlob(audioData, maxChunkSize, mimeType);

        expect(chunks).toHaveLength(2);
        chunks.forEach((chunk) => {
          expect(chunk.type).toBe(mimeType);
        });
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
      const audioData = new Blob([new ArrayBuffer(1000)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 250; // 1000 / 250 = 4 exact chunks

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks).toHaveLength(4);
      chunks.forEach((chunk) => {
        expect(chunk.size).toBe(250);
      });
    });

    it("should handle single byte chunks", async () => {
      const audioData = new Blob([new ArrayBuffer(5)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 1;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      expect(chunks).toHaveLength(5);
      chunks.forEach((chunk) => {
        expect(chunk.size).toBe(1);
      });
    });

    it("should preserve chunk data order", async () => {
      // Create blob with identifiable pattern
      const buffer = new Uint8Array(100);
      for (let i = 0; i < 100; i++) {
        buffer[i] = i;
      }
      const audioData = new Blob([buffer], { type: TEST_MIME_TYPE });
      const maxChunkSize = 30;

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // Combine chunks and verify data integrity
      const combined = new Uint8Array(
        await Promise.all(chunks.map((chunk) => chunk.arrayBuffer())).then(
          (buffers) => {
            let total = 0;
            buffers.forEach((b) => (total += b.byteLength));
            const result = new Uint8Array(total);
            let offset = 0;
            buffers.forEach((b) => {
              result.set(new Uint8Array(b), offset);
              offset += b.byteLength;
            });
            return result;
          },
        ),
      );

      expect(combined).toEqual(buffer);
    });

    it("should handle multi-chunk large files", async () => {
      // Use 10 MB for testing (reasonable test memory allocation).
      // Actual production files can be much larger; this tests the logic without
      // consuming excessive test environment resources.
      const mb10 = 10 * 1024 * 1024;
      const audioData = new Blob([new ArrayBuffer(mb10)], {
        type: TEST_MIME_TYPE,
      });
      const maxChunkSize = 2 * 1024 * 1024; // 2 MB chunks

      const chunks = await splitAudioBlob(
        audioData,
        maxChunkSize,
        TEST_MIME_TYPE,
      );

      // 10 MB / 2 MB = 5 chunks
      expect(chunks).toHaveLength(5);
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      expect(totalSize).toBe(mb10);
    });

    describe("format-aware chunking", () => {
      it("should warn about fragile formats when chunking", async () => {
        const consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const audioData = new Blob([new ArrayBuffer(10 * 1024 * 1024)], {
          type: "audio/flac",
        });
        const maxChunkSize = 2 * 1024 * 1024;

        await splitAudioBlob(audioData, maxChunkSize, "audio/flac");

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("FLAC"),
        );
        consoleWarnSpy.mockRestore();
      });

      it("should warn about fragile formats in no-chunk case", async () => {
        const consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const audioData = new Blob([new ArrayBuffer(1000)], {
          type: "audio/opus",
        });
        const maxChunkSize = 5000;

        await splitAudioBlob(audioData, maxChunkSize, "audio/opus");

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Audio format warning"),
        );
        consoleWarnSpy.mockRestore();
      });

      it("should not warn about robust formats", async () => {
        const consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const audioData = new Blob([new ArrayBuffer(10 * 1024 * 1024)], {
          type: "audio/mpeg",
        });
        const maxChunkSize = 2 * 1024 * 1024;

        await splitAudioBlob(audioData, maxChunkSize, "audio/mpeg");

        // Should not warn for MP3
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it("should warn about unknown formats", async () => {
        const consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const audioData = new Blob([new ArrayBuffer(10 * 1024 * 1024)], {
          type: "audio/unknown-format",
        });
        const maxChunkSize = 2 * 1024 * 1024;

        await splitAudioBlob(audioData, maxChunkSize, "audio/unknown-format");

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Unknown audio format"),
        );
        consoleWarnSpy.mockRestore();
      });

      it("should handle different audio format MIME type variants", async () => {
        const testCases = [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/wave",
          "audio/x-wav",
        ];

        for (const mimeType of testCases) {
          const audioData = new Blob([new ArrayBuffer(600)], {
            type: mimeType,
          });
          const chunks = await splitAudioBlob(audioData, 300, mimeType);

          // Robust formats should work fine
          expect(chunks).toHaveLength(2);
          chunks.forEach((chunk) => {
            expect(chunk.type).toBe(mimeType);
          });
        }
      });

      it("should handle fragile formats correctly", async () => {
        const fragileFormats = [
          "audio/flac",
          "audio/x-flac",
          "audio/ogg",
          "audio/opus",
          "audio/aac",
          "audio/x-m4a",
          "audio/m4a",
          "audio/webm",
        ];

        for (const mimeType of fragileFormats) {
          const consoleWarnSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => {});

          const audioData = new Blob([new ArrayBuffer(10 * 1024 * 1024)], {
            type: mimeType,
          });

          await splitAudioBlob(audioData, 2 * 1024 * 1024, mimeType);

          // Should warn about fragile format
          expect(consoleWarnSpy).toHaveBeenCalled();
          consoleWarnSpy.mockRestore();
        }
      });

      it("should split MP3 at approximate frame boundaries when possible", async () => {
        // Create a mock MP3 file with frame sync markers
        const size = 100 * 1024;
        const buffer = new Uint8Array(size);

        // Fill with some data
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }

        // Insert MP3 frame sync markers at known positions
        const framePositions = [1024, 25 * 1024, 50 * 1024, 75 * 1024];
        for (const pos of framePositions) {
          if (pos + 1 < buffer.length) {
            buffer[pos] = 0xff;
            buffer[pos + 1] = 0xfb;
          }
        }

        const audioBlob = new Blob([buffer], { type: "audio/mpeg" });
        const chunks = await splitAudioBlob(audioBlob, 20 * 1024, "audio/mpeg");

        // Verify chunks are created (exact boundaries may vary based on sync detection)
        expect(chunks.length).toBeGreaterThan(1);
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        // Frame boundary detection may extend chunks slightly to align at frame boundaries,
        // so allow for some variance (up to ~5% overhead)
        expect(totalSize).toBeGreaterThanOrEqual(size);
        expect(totalSize).toBeLessThanOrEqual(size * 1.05);
      });

      it("should handle case-insensitive MIME type comparisons", async () => {
        const testCases = [
          "audio/MPEG",
          "Audio/Mp3",
          "AUDIO/WAV",
          "audio/FLAC",
        ];

        for (const mimeType of testCases) {
          const audioData = new Blob([new ArrayBuffer(600)], {
            type: mimeType,
          });

          // Should not throw and should handle correctly
          const chunks = await splitAudioBlob(audioData, 300, mimeType);
          expect(chunks).toBeDefined();
          expect(chunks.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
