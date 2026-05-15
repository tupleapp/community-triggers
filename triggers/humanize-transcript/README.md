# Humanize Transcript

When a Tuple call's transcription completes, this trigger interleaves the raw
`events.jsonl` and `transcriptions.jsonl` into a human-readable markdown transcript.

## Output

`transcript.md` is written into the call's artifacts directory (the same place
Tuple stores `events.jsonl` and `transcriptions.jsonl`). It contains a full timestamped transcript with speaker names and lifecycle events (joins, screen shares, etc.) interleaved.

## Requirements

Python 3.7+. No third-party packages.
