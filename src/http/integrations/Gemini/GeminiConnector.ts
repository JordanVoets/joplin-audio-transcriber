import { Connector, QueryParamAuth } from "../../index";

/**
 * Connector for Google Gemini API
 */
export class GeminiConnector extends Connector {
  constructor(apiKey: string) {
    super();
    this.withAuth(new QueryParamAuth("key", apiKey));
  }

  baseUrl(): string {
    return "https://generativelanguage.googleapis.com/v1beta/";
  }

  protected defaultHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
    };
  }
}
