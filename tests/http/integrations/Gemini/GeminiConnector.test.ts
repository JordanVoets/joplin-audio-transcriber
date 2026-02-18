import { GeminiConnector } from "../../../../src/http/integrations/Gemini/GeminiConnector";
import { GenerateContentRequest } from "../../../../src/http/integrations/Gemini/Requests/GenerateContentRequest";

describe("GeminiConnector", () => {
  describe("baseUrl", () => {
    it("should return the correct Gemini API base URL", () => {
      const connector = new GeminiConnector("test-api-key");
      expect(connector.baseUrl()).toBe(
        "https://generativelanguage.googleapis.com/v1beta/",
      );
    });
  });

  describe("defaultHeaders", () => {
    it("should include Content-Type application/json", () => {
      const connector = new GeminiConnector("test-api-key");
      const headers = (
        connector as unknown as { defaultHeaders(): Record<string, string> }
      ).defaultHeaders();
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("authentication", () => {
    it("should apply API key authentication as query parameter", async () => {
      const apiKey = "test-api-key-12345";
      const connector = new GeminiConnector(apiKey);

      // Mock executeRequest to capture the config
      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: {},
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "Test response" }],
              },
            },
          ],
        },
        ok: true,
      };

      const executeSpy = jest
        .spyOn(
          connector as unknown as Record<string, jest.Mock>,
          "executeRequest",
        )
        .mockResolvedValue(mockResponse);

      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Test prompt",
        "base64audio",
        "audio/mp3",
      );

      await connector.send(request);

      expect(executeSpy).toHaveBeenCalled();
      const callConfig = executeSpy.mock.calls[0][0];

      // Verify the API key is in the query parameters
      expect(
        (callConfig as unknown as Record<string, jest.Mock>).query?.["key"],
      ).toBe(apiKey);

      executeSpy.mockRestore();
    });
  });

  describe("send request", () => {
    it("should send a request and return a response", async () => {
      const connector = new GeminiConnector("test-api-key");

      const mockResponse = {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: "This is the transcription" }],
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

      const request = new GenerateContentRequest(
        "gemini-2.0-flash",
        "Transcribe this audio",
        "base64encodedaudio",
        "audio/webm",
      );

      const response = await connector.send(request);

      expect(response.status).toBe(200);
      expect(response.data).toBe("This is the transcription");
    });
  });

  describe("connector chaining", () => {
    it("should support method chaining", () => {
      const connector = new GeminiConnector("test-api-key");

      const result = connector
        .withMiddleware((config) => config)
        .withResponseInterceptor(async (response) => response)
        .withErrorHandler(async () => {});

      expect(result).toBe(connector);
    });
  });
});
