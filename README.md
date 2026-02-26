# Joplin Audio Transcriber

A Joplin plugin that transcribes audio files attached to your notes using AI-powered transcription services.

<video src="src/assets/demo-video.mp4" controls autoplay loop></video>

## Features

- 🎙️ **Audio Transcription** - Transcribe attached audio files directly from your Joplin notes
- 🤖 **Multiple AI Providers** - Support for OpenAI Whisper and Google Gemini transcription APIs
- ⚙️ **Customizable Settings**:
  - Select from multiple transcription providers
  - Configure API keys securely
  - Optional: specify a custom model
  - Optional: set language for transcription
  - Optional: add custom instructions via prompt
- 🔧 **Extensible Architecture** - Easy to add new transcription providers
- 📝 **Seamless Integration** - Transcribed text is appended directly to your notes

## Installation

### From Joplin Plugin Marketplace

> [!IMPORTANT]
> This plugin is not yet available in the official Joplin Plugin Marketplace. You can only install it [from source](#from-source) for now.

### From Source

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run dist`
4. The built plugin will be in the `publish/` directory
5. Install the `.jpl` file in Joplin via **Tools > Options > Plugins > Gear icon (top left next to Manage your plugins) > Install from file**

## Configuration

After installation, configure the plugin in Joplin settings:

1. Open **Tools > Options > Preferences**
2. Go to the **Audio Transcriber** section
3. Configure the following:
   - **Transcription Provider**: Choose between OpenAI or Google Gemini
   - **API Key**: Enter your API key (stored securely)
   - **Model** _(optional)_: Specify a model (e.g., `whisper-1` for OpenAI, `gemini-1.5-flash` for Gemini)
   - **Language** _(optional)_: Set language code for transcription (e.g., `en`, `es`, `fr`)
   - **Custom Prompt** _(optional)_: Add custom instructions for the transcription

### Obtaining API Keys

**OpenAI:**

1. Visit [OpenAI API Platform](https://platform.openai.com)
2. Create an account and go to **API keys**
3. Generate a new API key
4. Copy and paste it into the Joplin settings

**Google Gemini:**

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Click **Get API Key** and create a new API key
3. Copy and paste it into the Joplin settings

## Usage

1. Attach an audio file to a Joplin note
2. Select the audio file link in your note (highlight the entire link e.g. `[filename](:/resourceId)`)
3. Press the **Transcribe Selected Audio** button in the toolbar, or use the command palette (Ctrl/Cmd+Shift+P) and search for "Transcribe Selected Audio"
4. Wait for the transcription to complete
5. The transcribed text will be appended to your note

## Development

Interested in contributing? Start with the [CONTRIBUTING.md](CONTRIBUTING.md) guide.

For advanced topics like architecture and adding new transcription services, see the [project wiki](https://github.com/JordanVoets/joplin-audio-transcriber/wiki).

### Quick Start

```bash
npm install      # Install dependencies
npm run dist     # Build the plugin
npm test         # Run tests
npm run lint     # Format and lint code
```

## Troubleshooting

**"Please select a valid audio file"**

- Make sure you've attached an audio file to the note
- Select the file link (the `[filename](:/resourceId)` markdown link)
- Audio formats supported: MP3, WAV, OGG, FLAC, AAC

**"API error"**

- Verify your API key is correct and has sufficient credits
- Check if your API key is still valid (not expired)
- Ensure your network connection is stable

**"No transcription result"**

- Try with a different audio file
- Check the Joplin console (Help > Toggle Console) for error messages
- Verify the audio file quality and duration

> [!NOTE]
> For further assistance, please open a new issue on the [GitHub repository](https://github.com/JordanVoets/joplin-audio-transcriber/issues).

## License

MIT © Jordan Voets

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.
