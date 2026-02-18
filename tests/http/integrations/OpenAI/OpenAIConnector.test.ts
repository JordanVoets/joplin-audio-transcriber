import { OpenAIConnector } from '../../../../src/http/integrations/OpenAI/OpenAIConnector';
import { TranscribeRequest } from '../../../../src/http/integrations/OpenAI/Requests/TranscribeRequest';

describe('OpenAIConnector', () => {
  describe('baseUrl', () => {
    it('should return the correct OpenAI API base URL', () => {
      const connector = new OpenAIConnector('test-api-key');
      expect(connector.baseUrl()).toBe('https://api.openai.com/v1/');
    });
  });

  describe('authentication', () => {
    it('should apply Bearer token authentication', async () => {
      const apiKey = 'sk-test-12345';
      const connector = new OpenAIConnector(apiKey);

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { text: 'Test transcription' },
        ok: true,
      };

      const executeSpy = jest
        .spyOn(connector as any, 'executeRequest')
        .mockResolvedValue(mockResponse);

      const audioBlob = new Blob(['audio'], { type: 'audio/mp3' });
      const request = new TranscribeRequest(audioBlob, 'test.mp3', 'whisper-1');

      await connector.send(request);

      expect(executeSpy).toHaveBeenCalled();
      const callConfig = executeSpy.mock.calls[0][0];
      
      // Verify the Bearer token is in the Authorization header
      expect((callConfig as any).headers?.['Authorization']).toContain('Bearer');

      executeSpy.mockRestore();
    });
  });

  describe('send request', () => {
    it('should send a transcription request and return formatted response', async () => {
      const connector = new OpenAIConnector('test-api-key');

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {
          text: 'Hello, this is a test transcription',
        },
        ok: true,
      };

      jest
        .spyOn(connector as any, 'executeRequest')
        .mockResolvedValue(mockResponse);

      const audioBlob = new Blob(['audio data'], { type: 'audio/mp3' });
      const request = new TranscribeRequest(
        audioBlob,
        'audio.mp3',
        'whisper-1',
        'en',
      );

      const response = await connector.send(request);

      expect(response.status).toBe(200);
      expect(response.data).toBe('Hello, this is a test transcription');
      expect(response.ok).toBe(true);
    });

    it('should handle requests with all optional parameters', async () => {
      const connector = new OpenAIConnector('test-api-key');

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { text: 'Transcription with prompt' },
        ok: true,
      };

      jest
        .spyOn(connector as any, 'executeRequest')
        .mockResolvedValue(mockResponse);

      const audioBlob = new Blob(['audio'], { type: 'audio/webm' });
      const request = new TranscribeRequest(
        audioBlob,
        'recording.webm',
        'whisper-1',
        'es',
        'Transcribe as formal speech',
      );

      const response = await connector.send(request);

      expect(response.data).toBe('Transcription with prompt');
    });
  });

  describe('connector chaining', () => {
    it('should support method chaining', () => {
      const connector = new OpenAIConnector('test-api-key');

      const result = connector
        .withMiddleware((config) => config)
        .withResponseInterceptor(async (response) => response)
        .withErrorHandler(async () => {});

      expect(result).toBe(connector);
    });

    it('should allow middleware customization', async () => {
      const connector = new OpenAIConnector('test-api-key');
      const middlewareCallOrder: number[] = [];

      connector.withMiddleware((config) => {
        middlewareCallOrder.push(1);
        return config;
      });

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { text: 'Result' },
        ok: true,
      };

      jest
        .spyOn(connector as any, 'executeRequest')
        .mockResolvedValue(mockResponse);

      const audioBlob = new Blob(['audio'], { type: 'audio/mp3' });
      const request = new TranscribeRequest(audioBlob, 'test.mp3', 'whisper-1');

      await connector.send(request);

      expect(middlewareCallOrder).toContain(1);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from failed requests', async () => {
      const connector = new OpenAIConnector('test-api-key');

      const mockError = new Error('API request failed');
      jest
        .spyOn(connector as any, 'executeRequest')
        .mockRejectedValue(mockError);

      const audioBlob = new Blob(['audio'], { type: 'audio/mp3' });
      const request = new TranscribeRequest(audioBlob, 'test.mp3', 'whisper-1');

      await expect(connector.send(request)).rejects.toThrow('API request failed');
    });

    it('should handle errors from request handling', async () => {
      const connector = new OpenAIConnector('test-api-key');

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { noTextField: 'invalid' },
        ok: true,
      };

      jest
        .spyOn(connector as any, 'executeRequest')
        .mockResolvedValue(mockResponse);

      const audioBlob = new Blob(['audio'], { type: 'audio/mp3' });
      const request = new TranscribeRequest(audioBlob, 'test.mp3', 'whisper-1');

      await expect(connector.send(request)).rejects.toThrow(
        'Invalid response format from OpenAI API',
      );
    });
  });

  describe('integration', () => {
    it('should work end-to-end with multiple requests', async () => {
      const connector = new OpenAIConnector('test-api-key');
      const requestCount = 3;

      for (let i = 0; i < requestCount; i++) {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { text: `Transcription ${i + 1}` },
          ok: true,
        };

        jest
          .spyOn(connector as any, 'executeRequest')
          .mockResolvedValueOnce(mockResponse);

        const audioBlob = new Blob([`audio ${i}`], { type: 'audio/mp3' });
        const request = new TranscribeRequest(
          audioBlob,
          `file${i}.mp3`,
          'whisper-1',
        );

        const response = await connector.send(request);
        expect(response.data).toBe(`Transcription ${i + 1}`);
      }
    });

    it('should handle mixed request types', async () => {
      const connector = new OpenAIConnector('test-api-key');

      const requests = [
        new TranscribeRequest(
          new Blob(['audio'], { type: 'audio/mp3' }),
          'test.mp3',
          'whisper-1',
        ),
        new TranscribeRequest(
          new Blob(['audio'], { type: 'audio/wav' }),
          'test.wav',
          'whisper-1',
          'en',
        ),
        new TranscribeRequest(
          new Blob(['audio'], { type: 'audio/webm' }),
          'test.webm',
          'whisper-1',
          'es',
          'Transcribe with summary',
        ),
      ];

      requests.forEach((req, idx) => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { text: `Result ${idx}` },
          ok: true,
        };

        jest
          .spyOn(connector as any, 'executeRequest')
          .mockResolvedValueOnce(mockResponse);
      });

      for (const request of requests) {
        const response = await connector.send(request);
        expect(response.ok).toBe(true);
        expect(response.data).toMatch(/Result \d/);
      }
    });
  });
});
