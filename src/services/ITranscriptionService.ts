/**
 * Interface for audio transcription services.
 * Implementations should handle the specific API request format for different providers.
 */
export interface ITranscriptionService {
	/**
	 * Transcribes an audio file to text.
	 * 
	 * @param audioData - The audio file as a Blob
	 * @param fileName - The name of the audio file
	 * @param mimeType - The MIME type of the audio file
	 * @returns A promise that resolves to the transcribed text
	 */
	transcribe(audioData: Blob, fileName: string, mimeType: string): Promise<string>;
}

/**
 * Configuration for a transcription service.
 */
export interface TranscriptionServiceConfig {
	apiKey: string;
	model?: string;
	language?: string;
	customPrompt?: string;
}
