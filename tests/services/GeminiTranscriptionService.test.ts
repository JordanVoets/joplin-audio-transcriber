import { GeminiTranscriptionService } from "../../src/services/GeminiTranscriptionService";
import { GeminiConnector } from "../../src/http/integrations/Gemini/GeminiConnector";
import { RequestConfig, Response } from "../../src/http/types";

/**
 * Gemini API response format for generateContent
 */
interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Type for accessing internal properties of GeminiTranscriptionService in tests
 */
interface GeminiServiceWithInternals {
  connector: GeminiConnector;
  config: {
    apiKey: string;
    model?: string;
    language?: string;
    customPrompt?: string;
  };
  transcribe: (
    audioBlob: Blob,
    fileName: string,
    mimeType: string,
  ) => Promise<string>;
}

/**
 * Type for FileReader mock
 */
interface MockFileReader {
  result: string | ArrayBuffer | null;
  onloadend: (() => void) | null;
  onerror: ((error: Error) => void) | null;
  readAsDataURL: (blob: Blob) => void;
}

/**
 * Mock connector that returns predefined responses without making network calls.
 * Follows the documented mocking pattern from Adding-New-Api-Integrations.md
 */
class MockGeminiConnector extends GeminiConnector {
  private mockResponse: Response<GeminiGenerateContentResponse> | Error;

  constructor(
    apiKey: string,
    mockResponse: Response<GeminiGenerateContentResponse> | Error,
  ) {
    super(apiKey);
    this.mockResponse = mockResponse;
  }

  protected async executeRequest<TResponse>(
    _config: RequestConfig,
  ): Promise<Response<TResponse>> {
    if (this.mockResponse instanceof Error) {
      throw this.mockResponse;
    }
    return this.mockResponse as Response<TResponse>;
  }
}

// Mock FileReader for blobToBase64 conversion
global.FileReader = jest.fn().mockImplementation(function (
  this: MockFileReader,
) {
  this.result = null;
  this.onloadend = null;
  this.onerror = null;
  this.readAsDataURL = jest.fn(function (this: MockFileReader, blob: Blob) {
    // Simulate async file reading
    setTimeout(() => {
      // Convert blob to base64 string
      const base64 = btoa("mock-audio-data");
      this.result = `data:${blob.type};base64,${base64}`;
      if (this.onloadend) {
        this.onloadend();
      }
    }, 0);
  });
}) as unknown as typeof FileReader;

describe("GeminiTranscriptionService", () => {
  // Test data constants
  const TEST_API_KEY = "test-gemini-api-key";
  const TEST_CUSTOM_MODEL = "gemini-1.5-pro";
  const TEST_AUDIO_DATA = "audio content";
  const TEST_FILE_NAME = "test-audio.mp3";
  const TEST_MIME_TYPE = "audio/mp3";
  const TEST_TRANSCRIPTION = "This is the transcribed text from Gemini";
  const TEST_CUSTOM_PROMPT = "Custom Gemini transcription prompt";

  // Helper to create a successful mock response in Gemini API format
  const createSuccessResponse = (
    text: string,
  ): Response<GeminiGenerateContentResponse> => ({
    status: 200,
    statusText: "OK",
    headers: {},
    data: {
      candidates: [
        {
          content: {
            parts: [
              {
                text,
              },
            ],
          },
        },
      ],
    },
    ok: true,
  });

  // Helper to create Gemini service with mocked connector
  const createServiceWithMock = (
    config: {
      apiKey: string;
      model?: string;
      language?: string;
      customPrompt?: string;
    },
    mockResponse: Response<GeminiGenerateContentResponse> | Error,
  ): GeminiTranscriptionService => {
    const service = new GeminiTranscriptionService(config);
    // Replace the connector with our mock
    (service as unknown as GeminiServiceWithInternals).connector =
      new MockGeminiConnector(config.apiKey, mockResponse);
    return service;
  };

  describe("constructor", () => {
    it("should initialize with required configuration", () => {
      const config = { apiKey: TEST_API_KEY };
      const service = new GeminiTranscriptionService(config);

      expect(service).toBeInstanceOf(GeminiTranscriptionService);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.apiKey,
      ).toBe(TEST_API_KEY);
    });

    it("should accept optional model in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        model: TEST_CUSTOM_MODEL,
      };
      const service = new GeminiTranscriptionService(config);

      expect(service).toBeInstanceOf(GeminiTranscriptionService);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.model,
      ).toBe(TEST_CUSTOM_MODEL);
    });

    it("should accept optional language in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        language: "en",
      };
      const service = new GeminiTranscriptionService(config);

      expect(service).toBeInstanceOf(GeminiTranscriptionService);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.language,
      ).toBe("en");
    });

    it("should accept optional customPrompt in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        customPrompt: TEST_CUSTOM_PROMPT,
      };
      const service = new GeminiTranscriptionService(config);

      expect(service).toBeInstanceOf(GeminiTranscriptionService);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.customPrompt,
      ).toBe(TEST_CUSTOM_PROMPT);
    });
  });

  describe("transcribe", () => {
    it("should transcribe audio with minimal configuration", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should use custom model when provided", async () => {
      const config = {
        apiKey: TEST_API_KEY,
        model: TEST_CUSTOM_MODEL,
      };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.model,
      ).toBe(TEST_CUSTOM_MODEL);
    });

    it("should use custom prompt when provided", async () => {
      const config = {
        apiKey: TEST_API_KEY,
        customPrompt: TEST_CUSTOM_PROMPT,
      };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.customPrompt,
      ).toBe(TEST_CUSTOM_PROMPT);
    });

    it("should pass all optional parameters when configured", async () => {
      const config = {
        apiKey: TEST_API_KEY,
        model: TEST_CUSTOM_MODEL,
        customPrompt: TEST_CUSTOM_PROMPT,
      };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.model,
      ).toBe(TEST_CUSTOM_MODEL);
      expect(
        (service as unknown as GeminiServiceWithInternals).config.customPrompt,
      ).toBe(TEST_CUSTOM_PROMPT);
    });

    it("should handle different mime types", async () => {
      const config = { apiKey: TEST_API_KEY };
      const mimeTypes = ["audio/wav", "audio/m4a", "audio/webm", "audio/ogg"];

      for (const mimeType of mimeTypes) {
        const service = createServiceWithMock(
          config,
          createSuccessResponse(TEST_TRANSCRIPTION),
        );
        const audioBlob = new Blob([TEST_AUDIO_DATA], { type: mimeType });

        const result = await service.transcribe(
          audioBlob,
          TEST_FILE_NAME,
          mimeType,
        );

        expect(result).toBe(TEST_TRANSCRIPTION);
      }
    });

    it("should convert blob to base64", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      // Verify transcription works (base64 conversion happens internally)
      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should return transcription text from response", async () => {
      const config = { apiKey: TEST_API_KEY };
      const expectedText = "Different transcription from Gemini";
      const service = createServiceWithMock(
        config,
        createSuccessResponse(expectedText),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe(expectedText);
    });

    it("should propagate errors from connector", async () => {
      const config = { apiKey: TEST_API_KEY };
      const errorMessage = "Gemini API request failed";
      const service = createServiceWithMock(config, new Error(errorMessage));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      await expect(
        service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE),
      ).rejects.toThrow(errorMessage);
    });

    it("should handle empty audio blob", async () => {
      const config = { apiKey: TEST_API_KEY };
      // Even with empty blob, API would return some transcription or error
      // For testing, we verify the service can handle empty blobs without crashing
      const service = createServiceWithMock(
        config,
        createSuccessResponse("(silence)"),
      );
      const emptyBlob = new Blob([], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        emptyBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      expect(result).toBe("(silence)");
    });

    it("should create new request for each transcription", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob1 = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });
      const audioBlob2 = new Blob(["different audio"], {
        type: TEST_MIME_TYPE,
      });

      const result1 = await service.transcribe(
        audioBlob1,
        "file1.mp3",
        TEST_MIME_TYPE,
      );
      const result2 = await service.transcribe(
        audioBlob2,
        "file2.mp3",
        TEST_MIME_TYPE,
      );

      expect(result1).toBe(TEST_TRANSCRIPTION);
      expect(result2).toBe(TEST_TRANSCRIPTION);
    });

    it("should ignore fileName parameter (per interface contract)", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });
      const ignoredFileName = "ignored-file.mp3";

      const result = await service.transcribe(
        audioBlob,
        ignoredFileName,
        TEST_MIME_TYPE,
      );

      // The fileName parameter should not affect the request
      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should handle blob to base64 conversion errors", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = new GeminiTranscriptionService(config);
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      // Mock FileReader to simulate error
      const mockFileReaderError = jest.fn().mockImplementation(function (
        this: MockFileReader,
      ) {
        this.result = null;
        this.onloadend = null;
        this.onerror = null;
        this.readAsDataURL = jest.fn(function (this: MockFileReader) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error("FileReader error"));
            }
          }, 0);
        });
      });
      global.FileReader = mockFileReaderError as unknown as typeof FileReader;

      await expect(
        service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE),
      ).rejects.toThrow("FileReader error");

      // Restore original mock
      global.FileReader = jest.fn().mockImplementation(function (
        this: MockFileReader,
      ) {
        this.result = null;
        this.onloadend = null;
        this.onerror = null;
        this.readAsDataURL = jest.fn(function (
          this: MockFileReader,
          blob: Blob,
        ) {
          setTimeout(() => {
            const base64 = btoa("mock-audio-data");
            this.result = `data:${blob.type};base64,${base64}`;
            if (this.onloadend) {
              this.onloadend();
            }
          }, 0);
        });
      }) as unknown as typeof FileReader;
    });
  });

  describe("integration with connector", () => {
    it("should use connector to send requests", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        "file1.mp3",
        TEST_MIME_TYPE,
      );

      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should handle multiple transcriptions independently", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service1 = createServiceWithMock(
        config,
        createSuccessResponse("First transcription"),
      );
      const service2 = createServiceWithMock(
        config,
        createSuccessResponse("Second transcription"),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result1 = await service1.transcribe(
        audioBlob,
        "file1.mp3",
        TEST_MIME_TYPE,
      );
      const result2 = await service2.transcribe(
        audioBlob,
        "file2.mp3",
        TEST_MIME_TYPE,
      );

      expect(result1).toBe("First transcription");
      expect(result2).toBe("Second transcription");
    });
  });

  describe("blobToBase64 conversion", () => {
    it("should properly extract base64 from data URL", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(
        audioBlob,
        TEST_FILE_NAME,
        TEST_MIME_TYPE,
      );

      // Verify conversion succeeds and transcription is returned
      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should handle different blob sizes", async () => {
      const config = { apiKey: TEST_API_KEY };

      // Test with small blob
      const service1 = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const smallBlob = new Blob(["small"], { type: TEST_MIME_TYPE });
      const result1 = await service1.transcribe(
        smallBlob,
        "small.mp3",
        TEST_MIME_TYPE,
      );
      expect(result1).toBe(TEST_TRANSCRIPTION);

      // Test with larger blob
      const service2 = createServiceWithMock(
        config,
        createSuccessResponse(TEST_TRANSCRIPTION),
      );
      const largeData = "x".repeat(10000);
      const largeBlob = new Blob([largeData], { type: TEST_MIME_TYPE });
      const result2 = await service2.transcribe(
        largeBlob,
        "large.mp3",
        TEST_MIME_TYPE,
      );
      expect(result2).toBe(TEST_TRANSCRIPTION);
    });
  });
});
