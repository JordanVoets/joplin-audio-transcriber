import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function () {
		console.info('Joplin Audio Transcriber plugin started!');

		await joplin.commands.register({
			name: 'transcribeSelectedAudio',
			label: 'Transcribe Selected Audio',
			iconName: 'fas fa-closed-captioning',
			execute: async () => {

				const selectedText = (await joplin.commands.execute('selectedText') as string);

				if (!selectedText) {
					alert('Please select an audio file to transcribe.');
					return;
				}

				const fileId = extractFileId(selectedText);

				if (fileId === null) {
					alert('Please select a valid Joplin internal link to an audio file (e.g., [title](:/fileId)).');
					return;
				}

				const file = await joplin.data.get(['resources', fileId], { fields: ['id', 'title', 'mime'] });

				const isAudioFile = file.mime?.startsWith('audio/') ?? false;

				if (!isAudioFile) {
					alert('Please select a valid audio file (e.g., .mp3, .wav, .ogg, .flac, .aac).');
					return;
				}
				
				// ToDo: Replace with some kinda progress indicator UI
				alert(`Transcribing audio: ${file.title} (ID: ${file.id})`);
				
				// ToDo: Add transcription logic here, e.g., sending the selected audio file to a transcription service.
				const result = `Transcription result for audio file "${file.title}" goes here.`;
				
				await joplin.commands.execute('insertText', `${selectedText}\n\n${result}`);
			},
		});

		await joplin.views.toolbarButtons.create(
			'transcribeSelectedAudioButton',
			'transcribeSelectedAudio',
			ToolbarButtonLocation.EditorToolbar
		);
	},
});

/**
 * Extracts a file ID from a Joplin internal link format.
 * 
 * @param input - A string that may contain a Joplin internal link in the format `[label](:/id)` or `![label](:/id)`
 * @returns The extracted file ID if the input matches the expected format, or `null` if it doesn't
 * 
 * @example
 * extractFileId("[Document](:/a1b2c3d4e5f6g7h8)") // Returns "a1b2c3d4e5f6g7h8"
 * extractFileId("![Document](:/a1b2c3d4e5f6g7h8)") // Returns "a1b2c3d4e5f6g7h8"
 * extractFileId("Random text") // Returns null
 */
function extractFileId(input: string): string | null {
	const strictLinkRegex = /^!?\[[^\]]+\]\((:\/([a-f0-9]+))\)$/;

	const match = input.match(strictLinkRegex);

	if (match) {
		const internalId = match[2]; 
		return internalId;
	} else {
		return null;
	}
}
