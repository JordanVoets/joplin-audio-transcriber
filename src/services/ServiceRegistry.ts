import {
  ITranscriptionService,
  TranscriptionServiceConfig,
} from "./ITranscriptionService";
import { OpenAITranscriptionService } from "./OpenAITranscriptionService";
import { GeminiTranscriptionService } from "./GeminiTranscriptionService";

type TranscriptionServiceConstructor = new (
  config: TranscriptionServiceConfig,
) => ITranscriptionService;

interface ServiceRegistration {
  constructor: TranscriptionServiceConstructor;
  displayName: string;
}

/**
 * Registry for transcription services.
 * To add a new service:
 * 1. Create a new service class that implements ITranscriptionService
 * 2. Add a new entry to the SERVICES object below with a unique key and display name
 */
export const SERVICES: Record<string, ServiceRegistration> = {
  openai: {
    constructor: OpenAITranscriptionService,
    displayName: "OpenAI Whisper",
  },
  gemini: {
    constructor: GeminiTranscriptionService,
    displayName: "Google Gemini",
  },
  // Add new services here...
};

export function getAvailableProviders(): string[] {
  return Object.keys(SERVICES);
}

/**
 * Get provider options for settings UI.
 * Returns an object mapping provider keys to display names.
 */
export function getProviderOptions(): Record<string, string> {
  const options: Record<string, string> = {};
  for (const [key, registration] of Object.entries(SERVICES)) {
    options[key] = registration.displayName;
  }
  return options;
}
