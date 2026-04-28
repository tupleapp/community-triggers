# Claude Call Sidekick

A [Tuple](https://tuple.app) trigger that launches [Claude Code](https://claude.ai/code) as a silent sidekick on a pair-programming call. Claude follows the conversation, watches the shared screen, and chimes in when asked.

Two event handlers ship together:

- `call-connected` — runs `tuple recording start` so the rest of the flow has transcript and screenshots to work with. Delete this file if you'd rather start recording manually.
- `call-recording-started` — opens a terminal running Claude Code in the call's artifact directory, seeded with the system prompt and the recent events + transcript so Claude can join mid-call without re-reading the entire history. Claude subscribes to the live streams and stays silent until called on.

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

1. Detect the Tuple environment (`prod`, `staging`, `dev`) from the artifact path and export `TUPLE_HOST` so every `tuple` call inside Claude scopes to the matching daemon.
2. Copy `system-prompt.md` into the call's artifact directory, appending team context from `~/.tuple/context.md` (or `~/.tuplestaging/context.md` for staging) if present.
3. Inline the most recent events + transcript into an initial prompt so Claude has context if it's joining mid-call (recording can stop and restart multiple times during a long call).
4. Open a `.command` file that launches Claude inside the call's artifact directory with that initial prompt as the first message.

Once running, Claude follows the call by:

- Subscribing to `tuple recording transcription -f --interval=10s` for live transcript batches
- Subscribing to `tuple recording events -f --interval=10s` for lifecycle events (joins, leaves, screen-share, recording start/stop)
- Capturing the shared screen with `tuple screen capture` on `screen_share_started` and re-capturing every ~30s while sharing is active
- Mapping participant IDs to names once via `tuple state`

The 10s batched flushes keep Claude's wake rate manageable — instead of waking on every transcript line, it processes 10s windows at a time.

Claude stays silent unless you type a message in the terminal or your pair addresses it by name. When recording stops mid-call, Claude produces a checkpoint summary and keeps its subscriptions running. When the call genuinely ends (the daemon returns HTTP 410 for the current call), Claude produces a final summary, stops both follower processes, and exits.

If recording stops and restarts mid-call, the trigger sees the live PID file and exits — the existing Claude session's transcript subscription picks up the resumed transcript on its own.

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
