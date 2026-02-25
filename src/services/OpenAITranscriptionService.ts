import {
  ITranscriptionService,
  TranscriptionServiceConfig,
} from "./ITranscriptionService";
import { OpenAIConnector } from "../http/integrations/OpenAI/OpenAIConnector";
import { TranscribeRequest } from "../http/integrations/OpenAI/Requests/TranscribeRequest";

/**
 * OpenAI Whisper API implementation of the transcription service.
 * Uses the connector/request pattern for clean API integration.
 */
export class OpenAITranscriptionService implements ITranscriptionService {
  private readonly config: TranscriptionServiceConfig;
  private readonly connector: OpenAIConnector;

  constructor(config: TranscriptionServiceConfig) {
    this.config = config;
    this.connector = new OpenAIConnector(config.apiKey);
  }

  /**
   * @param _mimeType - The MIME type of the audio file (unused)
   */
  async transcribe(
    audioData: Blob,
    fileName: string,
    _mimeType: string,
  ): Promise<string> {
    const model = this.config.model || "whisper-1";
    const request = new TranscribeRequest(
      audioData,
      fileName,
      model,
      this.config.language,
      this.config.customPrompt,
    );

    const response = await this.connector.send(request);
    return response.data;
  }

  getMaxFileSize(): number {
    // OpenAI Whisper API has a maximum file size of 25MB
    return 25 * 1024 * 1024;
  }
}
