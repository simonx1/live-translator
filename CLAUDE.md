# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time voice translation web application that captures speech in one language and translates it to another using AI. The entire application is a single HTML file (`voice-translator.html`) that includes embedded CSS and JavaScript.

## Architecture

- **Single-file application**: All code is contained in `voice-translator.html`
- **Client-side AI translation**: Uses Xenova/transformers library with the NLLB-200 model
- **Web Speech API**: Browser-based speech recognition and synthesis
- **No build process**: Direct HTML file that can be opened in a browser

## Key Components

### Translation Model
- Uses `Xenova/nllb-200-distilled-600M` model loaded via CDN
- Supports 11 languages: English, Polish, Italian, Spanish, French, German, Portuguese, Russian, Japanese, Korean, Chinese
- Language codes mapped in `languageMap` object for model compatibility

### Speech Recognition
- Uses browser's Web Speech API (`SpeechRecognition`)
- Continuous listening with interim results for real-time feel
- Auto-restarts on connection loss

### Speech Synthesis
- Browser's `speechSynthesis` API for text-to-speech
- Language-specific voice selection where available
- Auto-speak feature with manual override

## Development

### Testing
- Open `voice-translator.html` directly in a modern browser (Chrome, Edge, Safari)
- Requires HTTPS or localhost for microphone access
- Test with different language combinations

### Deployment
- No build step required
- Can be served as static HTML file
- Requires HTTPS in production for microphone permissions

## Important Notes

- Model loads on first page visit (can be slow initially)
- Requires microphone permissions
- Works best with clear speech in quiet environments
- Translation quality depends on speech recognition accuracy