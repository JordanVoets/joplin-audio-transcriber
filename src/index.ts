import joplin from "api";
import { ToolbarButtonLocation, SettingItemType, ToastType } from "api/types";
import { TranscriptionServiceFactory } from "./services/TranscriptionServiceFactory";
import { TranscriptionServiceConfig } from "./services/ITranscriptionService";
import { transcribeWithChunking } from "./services/utils/chunkedTranscription";

joplin.plugins.register({
  onStart: async function () {
    console.info("Joplin Audio Transcriber plugin started!");

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
          joplin.views.dialogs.showToast({
            message: "Please select an audio file to transcribe.",
            type: ToastType.Error,
          });
          return;
        }

        const fileId = extractFileId(selectedText);

        if (fileId === null) {
          joplin.views.dialogs.showToast({
            message:
              "Please select a valid Joplin internal link to an audio file (e.g., [title](:/fileId)).",
            type: ToastType.Error,
          });
          return;
        }

        const file = await joplin.data.get(["resources", fileId], {
          fields: ["id", "title", "mime"],
        });

        const isAudioFile = file.mime?.startsWith("audio/") ?? false;

        if (!isAudioFile) {
          joplin.views.dialogs.showToast({
            message:
              "Please select a valid audio file (e.g., .mp3, .wav, .ogg, .flac, .aac).",
            type: ToastType.Error,
          });
          return;
        }

        const provider = (await joplin.settings.value("provider")) as string;
        const apiKey = (await joplin.settings.value("apiKey")) as string;
        const model = (await joplin.settings.value("model")) as string;
        const language = (await joplin.settings.value("language")) as string;
        const customPrompt = (await joplin.settings.value(
          "customPrompt",
        )) as string;

        if (!apiKey) {
          joplin.views.dialogs.showToast({
            message:
              "Please configure your API key in Settings > Audio Transcriber.",
            type: ToastType.Error,
          });
          return;
        }

        const transcriptionTitle = `Transcription of ${file.title}`;
        const placeholderBody = "Transcription in progress...";

        const transcriptionNote = await joplin.data.post(["notes"], null, {
            body: placeholderBody,
            title: transcriptionTitle,
          });

        joplin.views.dialogs.showToast({
          message: `Transcription started! The result will be saved in the file "${transcriptionTitle}".`,
          type: ToastType.Info,
        });

        try {
          const fileData = await joplin.data.get(["resources", fileId, "file"]);

          const body = fileData.body;
          const buffer = Buffer.from(body);

          const blob = new Blob([buffer], { type: file.mime });

          const config: TranscriptionServiceConfig = {
            apiKey,
            model: model || undefined,
            language: language || undefined,
            customPrompt: customPrompt || undefined,
          };

          const transcriptionService = TranscriptionServiceFactory.create(
            provider,
            config,
          );

          const transcription = await transcribeWithChunking(
            transcriptionService,
            blob,
            file.title,
            file.mime,
          );

          const result = `**Transcription:**\n\n${transcription}`;

          // Update the transcription note with the actual result
          await joplin.data.put(["notes", transcriptionNote.id], null, {
            body: result,
          });
          
          joplin.views.dialogs.showToast({
            message: `Transcription complete! The result is in the note "${transcriptionTitle}".`,
            type: ToastType.Info,
          });
        } catch (error) {
          console.error("Transcription error:", error);
          joplin.views.dialogs.showToast({
            message: `Transcription failed: ${error.message}`,
            type: ToastType.Error,
          });
          // Update the note with error message
          await joplin.data.put(["notes", transcriptionNote.id], null, {
            body: `Transcription failed: ${error.message}`,
          });
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
