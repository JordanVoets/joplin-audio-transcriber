# Joplin Audio Transcriber

A Joplin plugin that transcribes audio files attached to your notes using AI-powered transcription services.

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

