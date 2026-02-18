import { ITranscriptionService, TranscriptionServiceConfig } from './ITranscriptionService';

/**
 * OpenAI Whisper API implementation of the transcription service.
 * Uses direct fetch calls to avoid browser environment restrictions.
 */
export class OpenAITranscriptionService implements ITranscriptionService {
	private readonly apiEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
	private readonly config: TranscriptionServiceConfig;

	constructor(config: TranscriptionServiceConfig) {
		this.config = config;
	}

	/**
	 * @param _mimeType - The MIME type of the audio file (unused)
	 */
	async transcribe(audioData: Blob, fileName: string, _mimeType: string): Promise<string> {
		const formData = new FormData();
		formData.append('file', audioData, fileName);
		formData.append('model', this.config.model || 'whisper-1');
		
		if (this.config.language) {
			formData.append('language', this.config.language);
		}
		
		if (this.config.customPrompt) {
			formData.append('prompt', this.config.customPrompt);
		}

		const response = await fetch(this.apiEndpoint, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.config.apiKey}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`OpenAI API error: ${errorText}`);
		}

		const data = await response.json();
		return data.text;
	}
}
