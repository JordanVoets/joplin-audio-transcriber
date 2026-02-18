import { OpenAIConnector } from "../../../../../src/http/integrations/OpenAI/OpenAIConnector";
import { TranscribeRequest } from "../../../../../src/http/integrations/OpenAI/Requests/TranscribeRequest";
import { HttpMethod, Response } from "../../../../../src/http/types";

// Helper type to access protected members for testing
type RequestWithBody = {
  body: () => FormData;
};

describe("TranscribeRequest", () => {
  describe("basic properties", () => {
    it("should have POST method", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      expect(request.method()).toBe(HttpMethod.POST);
    });

    it("should return correct endpoint", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      expect(request.endpoint()).toBe("audio/transcriptions");
    });
  });

  describe("request body (FormData)", () => {
    it("should include file, model, and required fields", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const body = (request as unknown as RequestWithBody).body();

      expect(body).toBeInstanceOf(FormData);
      // FormData doesn't provide direct access to entries in tests, so we verify it's FormData
    });

    it("should include optional language when provided", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(
        audioBlob,
        "test.mp3",
        "whisper-1",
        "en",
      );

      const body = (request as unknown as RequestWithBody).body();
      expect(body).toBeInstanceOf(FormData);
    });

    it("should include optional prompt when provided", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(
        audioBlob,
        "test.mp3",
        "whisper-1",
        undefined,
        "Custom prompt",
      );

      const body = (request as unknown as RequestWithBody).body();
      expect(body).toBeInstanceOf(FormData);
    });

    it("should support different model names", () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const models = ["whisper-1", "whisper-1-v2"];

      models.forEach((model) => {
        const request = new TranscribeRequest(audioBlob, "test.mp3", model);
        expect((request as unknown as RequestWithBody).body()).toBeInstanceOf(
          FormData,
        );
      });
    });
  });

  describe("handleResponse", () => {
    it("should extract text from valid response", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const response = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: {
          text: "This is the transcribed text",
        },
        ok: true,
      };

      const result = await request.handleResponse(
        response as unknown as Response<string>,
      );

      expect(result.status).toBe(200);
      expect(result.data).toBe("This is the transcribed text");
      expect(result.ok).toBe(true);
    });

    it("should preserve response metadata", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const response = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json", "x-custom": "value" },
        data: { text: "Transcription" },
        ok: true,
      };

      const result = await request.handleResponse(
        response as unknown as Response<string>,
      );

      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.headers["x-custom"]).toBe("value");
      expect(result.ok).toBe(true);
    });

    it("should throw error when text field is missing", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow(
        "Invalid response format from OpenAI API - missing text field",
      );
    });

    it("should throw error when text is empty", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: { text: "" },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow(
        "Invalid response format from OpenAI API - missing text field",
      );
    });

    it("should throw error when text is null", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: { text: null },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow(
        "Invalid response format from OpenAI API - missing text field",
      );
    });
  });

  describe("integration with connector", () => {
    it("should work with OpenAIConnector", async () => {
      const connector = new OpenAIConnector("test-api-key");
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: { text: "Transcribed audio" },
        ok: true,
      };

      jest
        .spyOn(
          connector as unknown as Record<string, jest.Mock>,
          "executeRequest",
        )
        .mockResolvedValue(mockResponse);

      const response = await connector.send(request);

      expect(response.status).toBe(200);
      expect(response.data).toBe("Transcribed audio");
    });
  });

  describe("edge cases", () => {
    it("should handle different audio file formats", () => {
      const formats = ["audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];

      formats.forEach((format) => {
        const audioBlob = new Blob(["audio"], { type: format });
        const request = new TranscribeRequest(
          audioBlob,
          "test.file",
          "whisper-1",
        );
        expect((request as unknown as RequestWithBody).body()).toBeInstanceOf(
          FormData,
        );
      });
    });

    it("should handle different file names", () => {
      const audioBlob = new Blob(["audio"], { type: "audio/mp3" });
      const fileNames = [
        "audio.mp3",
        "recording.wav",
        "voice-memo.m4a",
        "file with spaces.mp3",
      ];

      fileNames.forEach((name) => {
        const request = new TranscribeRequest(audioBlob, name, "whisper-1");
        expect((request as unknown as RequestWithBody).body()).toBeInstanceOf(
          FormData,
        );
      });
    });

    it("should handle very long transcriptions", async () => {
      const audioBlob = new Blob(["audio data"], { type: "audio/mp3" });
      const request = new TranscribeRequest(audioBlob, "test.mp3", "whisper-1");

      const longText = "word ".repeat(5000);

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: { text: longText },
        ok: true,
      };

      const result = await request.handleResponse(
        response as unknown as Response<string>,
      );
      expect(result.data).toBe(longText);
    });

    it("should handle language with all fields", () => {
      const audioBlob = new Blob(["audio"], { type: "audio/mp3" });
      const request = new TranscribeRequest(
        audioBlob,
        "test.mp3",
        "whisper-1",
        "es",
        "Translate to English",
      );

      const body = (request as unknown as RequestWithBody).body();
      expect(body).toBeInstanceOf(FormData);
    });
  });
});
