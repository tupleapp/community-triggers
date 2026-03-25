# Transcribe call

Automatically transcribe Tuple call recordings using [whisper-cpp](https://github.com/ggerganov/whisper.cpp) and generate a Markdown summary with a timeline of events and dialogue.

Fires on the `call-recording-complete` event. Reads Opus audio files and `events.jsonl` from the call artifacts directory, transcribes each audio segment, and writes a `Summary.md` file.

Reach out to us at `support@tuple.app` if you want us to enable local call recording for you or your team.

## Prerequisites

1. **whisper-cpp** — install via Homebrew:

   ```sh
   brew install whisper-cpp
   ```

2. **ffmpeg** — install via Homebrew:

   ```sh
   brew install ffmpeg
   ```

3. **A GGML model file** — download one to the default location:

   ```sh
   mkdir -p ~/.local/share/whisper-cpp/models
   curl -L -o ~/.local/share/whisper-cpp/models/ggml-large-v3.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin
   ```

## Configuration

The trigger works out of the box with no configuration. Two optional environment variables are available:

| Variable | Description |
|---|---|
| `WHISPER_MODEL` | Path to a GGML model file (overrides the default `~/.local/share/whisper-cpp/models/ggml-large-v3.bin`) |
| `TRANSCRIPTION_OUTPUT_PATH` | Directory to write `Summary.md` (defaults to the call artifacts directory) |

## Output

The generated `Summary.md` includes:

- Call date and time
- List of participants
- A timeline interleaving call events (joins, leaves) with transcribed speech, attributed to each speaker
