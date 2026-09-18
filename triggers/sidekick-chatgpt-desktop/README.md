# Sidekick - ChatGPT Desktop

Bring [ChatGPT Desktop](https://chatgpt.com/download/) into a Tuple call as a live companion.

When Capture starts, the trigger opens a local Work thread with Tuple's live-call instructions ready to submit. ChatGPT catches up on the conversation, follows it live, and responds when its help would be useful.

## What it does

Guided by Tuple's connect prompt, ChatGPT:

- **Logs the call live** — a one-line `·` play-by-play on each batch of new transcript.
- **Chimes in when it matters** — for a bug it can see, an ambiguous decision or action item, a correction, or a direct question.
- **Answers when addressed** — say “ChatGPT, …” or type into the thread.
- **Summarizes** — a checkpoint when recording stops and a final summary when the call ends.

## Prerequisites

- macOS
- [ChatGPT Desktop](https://chatgpt.com/download/) with Work mode available
- The `tuple` CLI on PATH, including `connect prompt` and `capture` support
  - Install it from Tuple's Capture settings with the **Install** button.
- Tuple Capture enabled for the call
- Permission for ChatGPT Desktop to run local commands, subject to your account and organization policy

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-chatgpt-desktop/`

The trigger fires the next time call Capture starts.

## Workspace location

The trigger creates `~/.tuple/tuple-calls/` automatically, including missing parent directories. All desktop sidekicks and summaries use this one ChatGPT project; each trigger firing still opens a separate thread whose prompt contains the call ID.

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
3. `open -a "ChatGPT" "codex://threads/new?mode=work&path=…&prompt=…"` opens a local ChatGPT Work thread with the prompt drafted.
4. ChatGPT follows the Capture stream through the `tuple` CLI.

The URL scheme is named `codex://` even though macOS displays the application as ChatGPT. The local path matters: it keeps the task on the Mac where it can reach the Tuple daemon and CLI.

The `codex://threads/new` contract is exposed by ChatGPT Desktop but is not a documented public API, so it may change between Desktop releases.

For local testing without opening ChatGPT, set `SIDEKICK_CHATGPT_DESKTOP_DRY_RUN=1`.
