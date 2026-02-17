import { ITranscriptionService, TranscriptionServiceConfig } from './ITranscriptionService';
import { OpenAITranscriptionService } from './OpenAITranscriptionService';
import { GeminiTranscriptionService } from './GeminiTranscriptionService';

export enum TranscriptionProvider {
	OpenAI = 'openai',
	Gemini = 'gemini',
}

/**
 * Factory for creating transcription service instances based on the selected provider.
 */
export class TranscriptionServiceFactory {
	/**
	 * Creates a transcription service instance based on the provider.
	 * 
	 * @param provider - The transcription provider to use
	 * @param config - Configuration for the transcription service
	 * @returns An instance of ITranscriptionService
	 */
	static create(provider: TranscriptionProvider, config: TranscriptionServiceConfig): ITranscriptionService {
		switch (provider) {
			case TranscriptionProvider.OpenAI:
				return new OpenAITranscriptionService(config);
			case TranscriptionProvider.Gemini:
				return new GeminiTranscriptionService(config);
			default:
				throw new Error(`Unknown transcription provider: ${provider}`);
		}
	}
}
