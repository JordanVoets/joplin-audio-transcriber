import { ITranscriptionService, TranscriptionServiceConfig } from './ITranscriptionService';

/**
 * Google Gemini API implementation of the transcription service.
 * Uses the Gemini API format for audio transcription.
 */
export class GeminiTranscriptionService implements ITranscriptionService {
	private readonly config: TranscriptionServiceConfig;

	constructor(config: TranscriptionServiceConfig) {
		this.config = config;
	}

	async transcribe(audioData: Blob, fileName: string, mimeType: string): Promise<string> {
		// Convert Blob to base64
		const base64Audio = await this.blobToBase64(audioData);
		
		const model = this.config.model || 'gemini-2.0-flash';
		const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

		const defaultPrompt = 'Transcribe this audio file. Provide only the transcription text without any additional explanation or formatting.';
		const prompt = this.config.customPrompt || defaultPrompt;

		const requestBody = {
			contents: [{
				parts: [
					{
						text: prompt
					},
					{
						inline_data: {
							mime_type: mimeType,
							data: base64Audio
						}
					}
				]
			}]
		};

		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText);
		}

		const responseData = await response.json();
		
		// Extract text from Gemini's response format
		const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text) {
			throw new Error('Invalid response format from Gemini API');
		}
		
		return text;
	}

	private async blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64String = (reader.result as string).split(',')[1];
				resolve(base64String);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}
}
