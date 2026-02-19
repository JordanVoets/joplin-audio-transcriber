import {
  ITranscriptionService,
  TranscriptionServiceConfig,
} from "./ITranscriptionService";
import { GeminiConnector } from "../http/integrations/Gemini/GeminiConnector";
import { GenerateContentRequest } from "../http/integrations/Gemini/Requests/GenerateContentRequest";

/**
 * Google Gemini API implementation of the transcription service.
 * Uses the Gemini API format for audio transcription.
 */
export class GeminiTranscriptionService implements ITranscriptionService {
  private readonly config: TranscriptionServiceConfig;
  private readonly connector: GeminiConnector;

  constructor(config: TranscriptionServiceConfig) {
    this.config = config;
    this.connector = new GeminiConnector(config.apiKey);
  }

  /**
   * @param _fileName - The name of the audio file (unused)
   */
  async transcribe(
    audioData: Blob,
    _fileName: string,
    mimeType: string,
  ): Promise<string> {
    // Convert Blob to base64
    const base64Audio = await this.blobToBase64(audioData);

    const model = this.config.model || "gemini-2.0-flash";
    const defaultPrompt =
      "Transcribe this audio file. Provide only the transcription text without any additional explanation or formatting.";
    const prompt = this.config.customPrompt || defaultPrompt;

    const request = new GenerateContentRequest(
      model,
      prompt,
      base64Audio,
      mimeType,
    );

    const response = await this.connector.send(request);
    return response.data;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
  }

  getMaxFileSize(): number {
    // Gemini API has a 100MB limit for base64-encoded payloads.
    // Since base64 encoding increases size by ~33%, we limit the
    // original file to ~75MB to stay within the API constraint.
    return 75 * 1024 * 1024; // 75 MB
  }
}
