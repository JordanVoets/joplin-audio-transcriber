import { GeminiConnector } from "../../../../../src/http/integrations/Gemini/GeminiConnector";
import { GenerateContentRequest } from "../../../../../src/http/integrations/Gemini/Requests/GenerateContentRequest";
import { HttpMethod, Response } from "../../../../../src/http/types";

describe("GenerateContentRequest", () => {
  describe("basic properties", () => {
    it("should have POST method", () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Test prompt",
        "base64audio",
        "audio/mp3",
      );

      expect(request.method()).toBe(HttpMethod.POST);
    });

    it("should return correct endpoint with model", () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Test prompt",
        "base64audio",
        "audio/mp3",
      );

      expect(request.endpoint()).toBe(
        "models/gemini-2.0-flash:generateContent",
      );
    });

    it("should handle different model names", () => {
      const request = new GenerateContentRequest(
        "gemini-1.5-pro",
        "Test prompt",
        "base64audio",
        "audio/mp3",
      );

      expect(request.endpoint()).toBe("models/gemini-1.5-pro:generateContent");
    });
  });

  describe("request body", () => {
    it("should construct proper request body", () => {
      const prompt = "Transcribe this audio";
      const audioBase64 = "SGVsbG8gV29ybGQ=";
      const mimeType = "audio/mp3";

      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        prompt,
        audioBase64,
        mimeType,
      );

      const body = request.body();

      expect(body.contents).toBeDefined();
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].parts).toHaveLength(2);

      // Check text part
      expect(body.contents[0].parts[0]).toEqual({ text: prompt });

      // Check audio part
      expect(body.contents[0].parts[1]).toEqual({
        inline_data: {
          mime_type: mimeType,
          data: audioBase64,
        },
      });
    });

    it("should handle different MIME types", () => {
      const mimeTypes = ["audio/mp3", "audio/webm", "audio/wav", "audio/ogg"];

      mimeTypes.forEach((mimeType) => {
        const request = new GenerateContentRequest(
          "gemini-2.0-flash",
          "Transcribe",
          "base64",
          mimeType,
        );

        const body = request.body();
        expect(body.contents[0].parts[1].inline_data.mime_type).toBe(mimeType);
      });
    });

    it("should include custom prompts in request body", () => {
      const customPrompt = "Transcribe in French and provide a summary";

      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        customPrompt,
        "base64audio",
        "audio/mp3",
      );

      const body = request.body();
      expect(body.contents[0].parts[0].text).toBe(customPrompt);
    });
  });

  describe("handleResponse", () => {
    it("should extract text from valid response", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "This is the transcription",
                  },
                ],
              },
            },
          ],
        },
        ok: true,
      };

      const result = await request.handleResponse(
        response as unknown as Response<string>,
      );

      expect(result.status).toBe(200);
      expect(result.data).toBe("This is the transcription");
      expect(result.ok).toBe(true);
    });

    it("should preserve response metadata", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "Transcription text" }],
              },
            },
          ],
        },
        ok: true,
      };

      const result = await request.handleResponse(
        response as unknown as Response<string>,
      );

      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.headers).toEqual({ "content-type": "application/json" });
      expect(result.ok).toBe(true);
    });

    it("should throw error when candidates array is missing", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {},
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });

    it("should throw error when content is missing", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [{}],
        },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });

    it("should throw error when text is missing", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [{ title: "No text here" }],
              },
            },
          ],
        },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });

    it("should throw error when parts array is empty", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [],
              },
            },
          ],
        },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });
  });

  describe("integration with connector", () => {
    it("should work with GeminiConnector", async () => {
      const connector = new GeminiConnector("test-api-key");
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe this audio",
        "base64audio",
        "audio/mp3",
      );

      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "Transcribed text" }],
              },
            },
          ],
        },
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
      expect(response.data).toBe("Transcribed text");
    });

    it("should work with connector middleware", async () => {
      const connector = new GeminiConnector("test-api-key");
      const middlewareCallOrder: number[] = [];

      connector.withMiddleware((config) => {
        middlewareCallOrder.push(1);
        return config;
      });

      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "Result" }],
              },
            },
          ],
        },
        ok: true,
      };

      jest
        .spyOn(
          connector as unknown as Record<string, jest.Mock>,
          "executeRequest",
        )
        .mockResolvedValue(mockResponse);

      await connector.send(request);

      expect(middlewareCallOrder).toContain(1);
    });
  });

  describe("edge cases", () => {
    it("should handle very long audio base64 strings", () => {
      const longBase64 = "a".repeat(10000);
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        longBase64,
        "audio/mp3",
      );

      const body = request.body();
      expect(body.contents[0].parts[1].inline_data.data).toBe(longBase64);
    });

    it("should handle special characters in prompts", () => {
      const specialPrompt = 'Transcribe this: "Hello, world!" 你好世界 🎵';
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        specialPrompt,
        "base64",
        "audio/mp3",
      );

      const body = request.body();
      expect(body.contents[0].parts[0].text).toBe(specialPrompt);
    });

    it("should handle empty text response gracefully", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "" }],
              },
            },
          ],
        },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });

    it("should handle nullable text field", async () => {
      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe",
        "base64",
        "audio/mp3",
      );

      const response = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: null }],
              },
            },
          ],
        },
        ok: true,
      };

      await expect(
        request.handleResponse(response as unknown as Response<string>),
      ).rejects.toThrow("Invalid response format from Gemini API");
    });
  });
});
