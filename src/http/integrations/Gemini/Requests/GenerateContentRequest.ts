import { Request, HttpMethod, Response } from "../../../index";

/**
 * Response format from Gemini API's generateContent endpoint
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
 * Request body for generateContent API call
 */
interface GenerateContentRequestBody {
  contents: Array<{
    parts: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
    }>;
  }>;
}

/**
 * Request for Gemini's generateContent endpoint
 * Used for audio transcription
 */
export class GenerateContentRequest extends Request<string> {
  private readonly model: string;
  private readonly prompt: string;
  private readonly audioBase64: string;
  private readonly mimeType: string;

  constructor(
    model: string,
    prompt: string,
    audioBase64: string,
    mimeType: string,
  ) {
    super();
    this.model = model;
    this.prompt = prompt;
    this.audioBase64 = audioBase64;
    this.mimeType = mimeType;
  }

  method(): HttpMethod {
    return HttpMethod.POST;
  }

  endpoint(): string {
    return `models/${this.model}:generateContent`;
  }

  protected body(): GenerateContentRequestBody {
    return {
      contents: [
        {
          parts: [
            {
              text: this.prompt,
            },
            {
              inline_data: {
                mime_type: this.mimeType,
                data: this.audioBase64,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Transform the API response to extract just the transcription text
   */
  async handleResponse(response: Response<string>): Promise<Response<string>> {
    // The response.data is already parsed as JSON by the connector
    // We need to cast it to the actual API response type to extract the text
    const apiResponse =
      response.data as unknown as GeminiGenerateContentResponse;
    const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Invalid response format from Gemini API");
    }

    // Return a new response with just the transcription text
    return {
      ...response,
      data: text,
    };
  }
}
