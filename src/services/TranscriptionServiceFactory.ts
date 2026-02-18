import {
  ITranscriptionService,
  TranscriptionServiceConfig,
} from "./ITranscriptionService";
import {
  SERVICES,
  getAvailableProviders,
  getProviderOptions,
} from "./ServiceRegistry";

/**
 * Factory for creating transcription service instances based on the selected provider.
 */
export class TranscriptionServiceFactory {
  /**
   * Creates a transcription service instance based on the provider.
   *
   * @param provider - The transcription provider to use (e.g., 'openai', 'gemini')
   * @param config - Configuration for the transcription service
   * @returns An instance of ITranscriptionService
   */
  static create(
    provider: string,
    config: TranscriptionServiceConfig,
  ): ITranscriptionService {
    const registration = SERVICES[provider];

    if (!registration) {
      const availableProviders = getAvailableProviders().join(", ");
      throw new Error(
        `Unknown transcription provider: ${provider}. Available providers: ${availableProviders}`,
      );
    }

    return new registration.constructor(config);
  }

  /**
   * Gets the list of available transcription providers.
   *
   * @returns Array of provider names
   */
  static getAvailableProviders(): string[] {
    return getAvailableProviders();
  }

  /**
   * Gets provider options for settings UI.
   *
   * @returns Object mapping provider keys to display names
   */
  static getProviderOptions(): Record<string, string> {
    return getProviderOptions();
  }
}
