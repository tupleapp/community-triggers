# Claude Call Sidekick

A [Tuple](https://tuple.app) trigger that launches [Claude Code](https://claude.ai/code) as a silent sidekick on a pair-programming call. Claude follows the conversation, watches the shared screen, and chimes in when asked.

Two event handlers ship together:

- `call-connected` — runs `tuple recording start` so the rest of the flow has transcript and screenshots to work with. Delete this file if you'd rather start recording manually.
- `call-recording-started` — opens a terminal running Claude Code in the call's artifact directory, then re-prompts itself every 15 seconds via the `/loop` skill to pull the latest transcript chunk, lifecycle events, and a frame of the shared screen.

## Prerequisites

- **Claude Code**: `npm install -g @anthropic-ai/claude-code`
- **The `tuple` CLI** — ships with Tuple.
- **A Whisper model** configured in Tuple for live transcription.

Email `support@tuple.app` if you need local call recording enabled for your team.

## Installation

Drop this directory into your Tuple triggers folder:

- Production: `~/.tuple/triggers/claude-call-sidekick/`
- Staging: `~/.tuplestaging/triggers/claude-call-sidekick/`

The trigger fires automatically on the next call recording. No further configuration required.

## How it works

`call-connected` fires the moment a call connects and starts recording — that's all it does. The rest happens when `call-recording-started` fires:

1. Detect the Tuple environment (`prod`, `staging`, `dev`) from the artifact path so the CLI scopes to the matching daemon.
2. Render `system-prompt.md` with the env flag and screenshot path filled in, appending team context from `~/.tuple/context.md` (or `~/.tuplestaging/context.md` for staging) if present.
3. Open a `.command` file that launches `claude` inside the call's artifact directory with `/loop 15s catch up on the call` as the first message. The `/loop` skill re-fires that prompt every 15 seconds until the call ends.

Each tick, Claude runs:

- `tuple recording transcription` — full Whisper transcript
- `tuple recording events` — lifecycle events (joins, leaves, screen-share, recording start/stop)
- `tuple screen capture` — JPEG of the shared screen, then `Read`s it
- `tuple state` — once at the start, to map participant IDs to names

Claude stays silent unless you type a message in the terminal or your pair addresses "Claude" by name. When the call ends, it produces a summary of decisions, action items, and unresolved questions.

If recording stops and restarts mid-call, the trigger sees the live PID file and exits — the existing Claude session keeps polling and picks up the new transcript on its own.

## Custom context

Create `~/.tuple/context.md` (or `~/.tuplestaging/context.md` for staging) to give Claude background on your team, projects, or conventions. The file is appended to the system prompt at the start of each call.

```markdown
## Team

- Alice (alice@example.com) — backend lead, owns the API layer
- Bob (bob@example.com) — frontend, working on the dashboard redesign

## Current projects

- Migrating the mobile app from REST to GraphQL
- Q3 launch of the self-serve onboarding flow
```
