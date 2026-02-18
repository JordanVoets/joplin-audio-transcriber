import { Request, HttpMethod, Response } from "../../../index";

/**
 * Response from OpenAI Whisper API
 */
interface WhisperResponse {
  text: string;
}

/**
 * Request for OpenAI Whisper transcription endpoint
 */
export class TranscribeRequest extends Request<string> {
  private readonly audioData: Blob;
  private readonly fileName: string;
  private readonly model: string;
  private readonly language?: string;
  private readonly customPrompt?: string;

  constructor(
    audioData: Blob,
    fileName: string,
    model: string,
    language?: string,
    customPrompt?: string,
  ) {
    super();
    this.audioData = audioData;
    this.fileName = fileName;
    this.model = model;
    this.language = language;
    this.customPrompt = customPrompt;
  }

  method(): HttpMethod {
    return HttpMethod.POST;
  }

  endpoint(): string {
    return "audio/transcriptions";
  }

  protected headers(): Record<string, string> {
    return {
      // Do not set Content-Type - browser will set it to multipart/form-data with boundary
    };
  }

  body(): FormData {
    const formData = new FormData();
    formData.append("file", this.audioData, this.fileName);
    formData.append("model", this.model);

    if (this.language) {
      formData.append("language", this.language);
    }

    if (this.customPrompt) {
      formData.append("prompt", this.customPrompt);
    }

    return formData;
  }

  /**
   * Extract transcription text from Whisper API response
   */
  async handleResponse(response: Response<string>): Promise<Response<string>> {
    // The response.data is already parsed by the connector
    const apiResponse = response.data as unknown as WhisperResponse;
    const text = apiResponse.text;

    if (!text) {
      throw new Error(
        "Invalid response format from OpenAI API - missing text field",
      );
    }

    // Return response with the extracted text
    return {
      ...response,
      data: text,
    };
  }
}
