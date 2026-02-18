import { Connector, BearerTokenAuth } from '../../index';

/**
 * Connector for OpenAI API
 */
export class OpenAIConnector extends Connector {
  constructor(apiKey: string) {
    super();
    this.withAuth(new BearerTokenAuth(apiKey));
  }

  baseUrl(): string {
    return 'https://api.openai.com/v1';
  }
}
