# Sidekick - Claude Desktop

Bring [Claude Desktop](https://claude.com/download) into a Tuple call as a live companion.

When Capture starts, the trigger opens a Claude Code session with Tuple's live-call instructions ready to submit. Claude catches up on the conversation, follows it live, and responds when its help would be useful.

## What it does

Guided by Tuple's connect prompt, Claude:

- **Logs the call live** — a one-line `·` play-by-play on each batch of new transcript.
- **Chimes in when it matters** — for a bug it can see, an ambiguous decision or action item, a correction, or a direct question.
- **Answers when addressed** — say “Claude, …” or type into the task.
- **Summarizes** — a checkpoint when recording stops and a final summary when the call ends.

## Prerequisites

- macOS
- [Claude Desktop](https://claude.com/download) with Claude Code available
- The `tuple` CLI on PATH, including `connect prompt` and `capture` support
  - Install it from Tuple's Capture settings with the **Install** button.
- Tuple Capture enabled for the call
- Permission for Claude Desktop to run local commands, subject to your account and organization policy

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-claude-desktop/`

The trigger fires the next time call Capture starts.

## Workspace location

The trigger creates `~/.tuple/tuple-calls/` automatically, including missing parent directories. All desktop sidekicks and summaries use this one Claude project; each trigger firing still opens a separate chat whose prompt contains the call ID.

To use another root, set an absolute path near the top of `call-capture-started` or in Tuple's environment:

```bash
TUPLE_DESKTOP_WORKSPACE_ROOT="$HOME/Developer/tuple-calls"
```

The trigger finds `tuple` on PATH or in the Tuple app bundle. To use another executable, set its path or command name:

```bash
TUPLE_BIN="$HOME/bin/tuple"
```

## How it works

The trigger uses the exact call ID from `TUPLE_TRIGGER_CALL_ID`:

1. The resolved Tuple CLI runs `connect prompt --call <call-id>` to produce the version-matched live participation prompt without launching a command-line agent.
2. The trigger creates the shared Tuple calls project directory and UTF-8 URL-encodes it and the prompt.
3. `open -a "Claude" "claude://code/new?folder=…&prompt=…"` opens a local Claude Code session inside Claude Desktop with the prompt drafted.
4. After you review and submit it, Claude follows the Capture stream through the `tuple` CLI.

Claude Desktop requires a confirmation before starting a prompt received from another app. This trigger does not use UI scripting to bypass that safety step.

The `claude://code/new` contract is exposed by Claude Desktop but is not a documented public API, so it may change between Desktop releases.

For local testing without opening Claude, set `SIDEKICK_CLAUDE_DESKTOP_DRY_RUN=1`.
