import joplin from "api";
import { ToolbarButtonLocation, SettingItemType } from "api/types";
import { TranscriptionServiceFactory } from "./services/TranscriptionServiceFactory";
import { TranscriptionServiceConfig } from "./services/ITranscriptionService";
import { transcribeWithChunking } from "./services/utils/chunkedTranscription";

joplin.plugins.register({
  onStart: async function () {
    console.info("Joplin Audio Transcriber plugin started!");

    // Register settings
    await joplin.settings.registerSection("audioTranscriberSettings", {
      label: "Audio Transcriber",
      iconName: "fas fa-closed-captioning",
    });

    await joplin.settings.registerSettings({
      provider: {
        value: "openai",
        type: SettingItemType.String,
        section: "audioTranscriberSettings",
        public: true,
        isEnum: true,
        options: TranscriptionServiceFactory.getProviderOptions(),
        label: "Transcription Provider",
        description: "Select the AI service to use for transcription",
      },
      apiKey: {
        value: "",
        type: SettingItemType.String,
        section: "audioTranscriberSettings",
        public: true,
        secure: true,
        label: "API Key",
        description: "API key for the selected provider",
      },
      model: {
        value: "",
        type: SettingItemType.String,
        section: "audioTranscriberSettings",
        public: true,
        advanced: true,
        label: "Model (Optional)",
        description:
          "Model to use (e.g., whisper-1 for OpenAI, gemini-1.5-flash for Gemini). Leave empty for default.",
      },
      language: {
        value: "",
        type: SettingItemType.String,
        section: "audioTranscriberSettings",
        public: true,
        advanced: true,
        label: "Language (Optional)",
        description:
          "Language code (e.g., en, es, fr). Leave empty for auto-detection.",
      },
      customPrompt: {
        value: "",
        type: SettingItemType.String,
        section: "audioTranscriberSettings",
        public: true,
        advanced: true,
        label: "Custom Prompt (Optional)",
        description:
          "Custom instruction for transcription. Leave empty for default.",
      },
    });

    await joplin.commands.register({
      name: "transcribeSelectedAudio",
      label: "Transcribe Selected Audio",
      iconName: "fas fa-closed-captioning",
      execute: async () => {
        const selectedText = (await joplin.commands.execute(
          "selectedText",
        )) as string;

        if (!selectedText) {
          alert("Please select an audio file to transcribe.");
          return;
        }

        const fileId = extractFileId(selectedText);

        if (fileId === null) {
          alert(
            "Please select a valid Joplin internal link to an audio file (e.g., [title](:/fileId)).",
          );
          return;
        }

        const file = await joplin.data.get(["resources", fileId], {
          fields: ["id", "title", "mime"],
        });

        const isAudioFile = file.mime?.startsWith("audio/") ?? false;

        if (!isAudioFile) {
          alert(
            "Please select a valid audio file (e.g., .mp3, .wav, .ogg, .flac, .aac).",
          );
          return;
        }

        // Get settings
        const provider = (await joplin.settings.value("provider")) as string;
        const apiKey = (await joplin.settings.value("apiKey")) as string;
        const model = (await joplin.settings.value("model")) as string;
        const language = (await joplin.settings.value("language")) as string;
        const customPrompt = (await joplin.settings.value(
          "customPrompt",
        )) as string;

        if (!apiKey) {
          alert(
            "Please configure your API key in Settings > Audio Transcriber.",
          );
          return;
        }

        // ToDo: Replace with some kinda progress indicator UI
        alert(`Transcribing audio: ${file.title} (ID: ${file.id})`);

        try {
          // Get the audio file data
          const fileData = await joplin.data.get(["resources", fileId, "file"]);

          const body = fileData.body;
          const buffer = Buffer.from(body);

          // Convert the file data to a Blob
          const blob = new Blob([buffer], { type: file.mime });

          // Create configuration for the service
          const config: TranscriptionServiceConfig = {
            apiKey,
            model: model || undefined,
            language: language || undefined,
            customPrompt: customPrompt || undefined,
          };

          // Create the appropriate transcription service using the factory
          const transcriptionService = TranscriptionServiceFactory.create(
            provider,
            config,
          );

          // Transcribe with automatic chunking for large files
          const transcription = await transcribeWithChunking(
            transcriptionService,
            blob,
            file.title,
            file.mime,
          );

          const result = `**Transcription:**\n\n${transcription}`;

          await joplin.commands.execute(
            "insertText",
            `${selectedText}\n\n${result}`,
          );
        } catch (error) {
          console.error("Transcription error:", error);
          alert(`Transcription failed: ${error.message}`);
        }
      },
    });

    await joplin.views.toolbarButtons.create(
      "transcribeSelectedAudioButton",
      "transcribeSelectedAudio",
      ToolbarButtonLocation.EditorToolbar,
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
