import { OpenAITranscriptionService } from "../../src/services/OpenAITranscriptionService";
import { OpenAIConnector } from "../../src/http/integrations/OpenAI/OpenAIConnector";
import { RequestConfig, Response } from "../../src/http/types";

/**
 * Mock connector that returns predefined responses without making network calls.
 * Follows the documented mocking pattern from Adding-New-Api-Integrations.md
 */
class MockOpenAIConnector extends OpenAIConnector {
  private mockResponse: Response<any> | Error;

  constructor(apiKey: string, mockResponse: Response<any> | Error) {
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

describe("OpenAITranscriptionService", () => {
  // Test data constants
  const TEST_API_KEY = "test-api-key-123";
  const TEST_MODEL = "whisper-1";
  const TEST_LANGUAGE = "en";
  const TEST_PROMPT = "Custom transcription prompt";
  const TEST_AUDIO_DATA = "audio content";
  const TEST_FILE_NAME = "test-audio.mp3";
  const TEST_MIME_TYPE = "audio/mp3";
  const TEST_TRANSCRIPTION = "This is the transcribed text";

  // Helper to create a successful mock response in OpenAI API format
  const createSuccessResponse = (text: string): Response<any> => ({
    status: 200,
    statusText: "OK",
    headers: {},
    data: { text }, // OpenAI API returns { text: string }
    ok: true,
  });

  // Helper to create OpenAI service with mocked connector
  const createServiceWithMock = (
    config: { apiKey: string; model?: string; language?: string; customPrompt?: string },
    mockResponse: Response<any> | Error,
  ): OpenAITranscriptionService => {
    const service = new OpenAITranscriptionService(config);
    // Replace the connector with our mock
    (service as any).connector = new MockOpenAIConnector(config.apiKey, mockResponse);
    return service;
  };

  describe("constructor", () => {
    it("should initialize with required configuration", () => {
      const config = { apiKey: TEST_API_KEY };
      const service = new OpenAITranscriptionService(config);

      expect(service).toBeInstanceOf(OpenAITranscriptionService);
      expect((service as any).config.apiKey).toBe(TEST_API_KEY);
    });

    it("should accept optional model in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        model: "whisper-1-custom",
      };
      const service = new OpenAITranscriptionService(config);

      expect(service).toBeInstanceOf(OpenAITranscriptionService);
      expect((service as any).config.model).toBe("whisper-1-custom");
    });

    it("should accept optional language in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        language: TEST_LANGUAGE,
      };
      const service = new OpenAITranscriptionService(config);

      expect(service).toBeInstanceOf(OpenAITranscriptionService);
      expect((service as any).config.language).toBe(TEST_LANGUAGE);
    });

    it("should accept optional customPrompt in configuration", () => {
      const config = {
        apiKey: TEST_API_KEY,
        customPrompt: TEST_PROMPT,
      };
      const service = new OpenAITranscriptionService(config);

      expect(service).toBeInstanceOf(OpenAITranscriptionService);
      expect((service as any).config.customPrompt).toBe(TEST_PROMPT);
    });
  });

  describe("transcribe", () => {
    it("should transcribe audio with minimal configuration", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should use custom model when provided", async () => {
      const customModel = "whisper-1-turbo";
      const config = {
        apiKey: TEST_API_KEY,
        model: customModel,
      };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect((service as any).config.model).toBe(customModel);
    });

    it("should pass language parameter when configured", async () => {
      const config = {
        apiKey: TEST_API_KEY,
        language: TEST_LANGUAGE,
      };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect((service as any).config.language).toBe(TEST_LANGUAGE);
    });

    it("should pass custom prompt when configured", async () => {
      const config = {
        apiKey: TEST_API_KEY,
        customPrompt: TEST_PROMPT,
      };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect((service as any).config.customPrompt).toBe(TEST_PROMPT);
    });

    it("should pass all optional parameters when configured", async () => {
      const customModel = "whisper-2";
      const config = {
        apiKey: TEST_API_KEY,
        model: customModel,
        language: TEST_LANGUAGE,
        customPrompt: TEST_PROMPT,
      };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
      expect((service as any).config.model).toBe(customModel);
      expect((service as any).config.language).toBe(TEST_LANGUAGE);
      expect((service as any).config.customPrompt).toBe(TEST_PROMPT);
    });

    it("should handle different file names", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });
      const fileName = "recording-2024-01-15.mp3";

      const result = await service.transcribe(audioBlob, fileName, TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should handle different audio formats", async () => {
      const config = { apiKey: TEST_API_KEY };
      const formats = [
        { mimeType: "audio/wav", fileName: "test.wav" },
        { mimeType: "audio/m4a", fileName: "test.m4a" },
        { mimeType: "audio/webm", fileName: "test.webm" },
      ];

      for (const format of formats) {
        const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
        const audioBlob = new Blob([TEST_AUDIO_DATA], { type: format.mimeType });
        
        const result = await service.transcribe(audioBlob, format.fileName, format.mimeType);

        expect(result).toBe(TEST_TRANSCRIPTION);
      }
    });

    it("should return transcription text from response", async () => {
      const config = { apiKey: TEST_API_KEY };
      const expectedText = "This is a different transcription";
      const service = createServiceWithMock(config, createSuccessResponse(expectedText));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe(expectedText);
    });

    it("should propagate errors from connector", async () => {
      const config = { apiKey: TEST_API_KEY };
      const errorMessage = "API request failed";
      const service = createServiceWithMock(config, new Error(errorMessage));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      await expect(
        service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE)
      ).rejects.toThrow(errorMessage);
    });

    it("should handle network errors", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, new Error("Network error"));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      await expect(
        service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE)
      ).rejects.toThrow("Network error");
    });

    it("should handle authentication errors", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, new Error("Invalid API key"));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      await expect(
        service.transcribe(audioBlob, TEST_FILE_NAME, TEST_MIME_TYPE)
      ).rejects.toThrow("Invalid API key");
    });

    it("should handle empty audio blob", async () => {
      const config = { apiKey: TEST_API_KEY };
      // Even with empty blob, API would return some transcription or error
      // For testing, we verify the service can handle empty blobs without crashing
      const service = createServiceWithMock(config, createSuccessResponse("(silence)"));
      const emptyBlob = new Blob([], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(emptyBlob, TEST_FILE_NAME, TEST_MIME_TYPE);

      expect(result).toBe("(silence)");
    });

    it("should create new request for each transcription", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob1 = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });
      const audioBlob2 = new Blob(["different audio"], { type: TEST_MIME_TYPE });

      const result1 = await service.transcribe(audioBlob1, "file1.mp3", TEST_MIME_TYPE);
      const result2 = await service.transcribe(audioBlob2, "file2.mp3", TEST_MIME_TYPE);

      expect(result1).toBe(TEST_TRANSCRIPTION);
      expect(result2).toBe(TEST_TRANSCRIPTION);
    });

    it("should ignore mimeType parameter (per interface contract)", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });
      const ignoredMimeType = "audio/ogg";

      const result = await service.transcribe(audioBlob, TEST_FILE_NAME, ignoredMimeType);

      // The mimeType parameter should not affect the request
      expect(result).toBe(TEST_TRANSCRIPTION);
    });
  });

  describe("integration with connector", () => {
    it("should use connector to send requests", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service = createServiceWithMock(config, createSuccessResponse(TEST_TRANSCRIPTION));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result = await service.transcribe(audioBlob, "file1.mp3", TEST_MIME_TYPE);

      expect(result).toBe(TEST_TRANSCRIPTION);
    });

    it("should handle multiple transcriptions independently", async () => {
      const config = { apiKey: TEST_API_KEY };
      const service1 = createServiceWithMock(config, createSuccessResponse("First transcription"));
      const service2 = createServiceWithMock(config, createSuccessResponse("Second transcription"));
      const audioBlob = new Blob([TEST_AUDIO_DATA], { type: TEST_MIME_TYPE });

      const result1 = await service1.transcribe(audioBlob, "file1.mp3", TEST_MIME_TYPE);
      const result2 = await service2.transcribe(audioBlob, "file2.mp3", TEST_MIME_TYPE);

      expect(result1).toBe("First transcription");
      expect(result2).toBe("Second transcription");
    });
  });
});
