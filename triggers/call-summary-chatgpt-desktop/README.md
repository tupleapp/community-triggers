# Call Summary - ChatGPT Desktop

Turn a finished Tuple call into a useful summary with [ChatGPT Desktop](https://chatgpt.com/download/).

When Capture ends, the trigger opens a local Work thread with the exact call and recording already selected. ChatGPT summarizes the conversation, pulls out decisions and action items, drafts a follow-up, and saves the title and summary to Tuple Call History.

## Prerequisites

- macOS
- [ChatGPT Desktop](https://chatgpt.com/download/) with Work mode available
- The `tuple` CLI on PATH with `capture` support
  - Install it from Tuple's Capture settings with the **Install** button.
- Tuple Capture enabled for the call
- Permission for ChatGPT Desktop to run local commands, subject to your account and organization policy

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/call-summary-chatgpt-desktop/`

The trigger fires when call Capture completes.

## Workspace location

The trigger creates `~/.tuple/tuple-calls/` automatically, including missing parent directories. All ChatGPT Desktop call triggers use this one project; each trigger firing still opens a separate thread whose prompt contains the call ID.

To use another root, set an absolute path near the top of `call-capture-complete` or in Tuple's environment:

```bash
TUPLE_DESKTOP_WORKSPACE_ROOT="$HOME/Developer/tuple-calls"
```

The generated prompt uses `tuple` by default. When `TUPLE_BIN` is set, it uses that command instead.

## How it works

The trigger embeds the exact call and recording IDs in a prompt, creates the shared Tuple calls project directory, UTF-8 URL-encodes the path and prompt, and opens:

`codex://threads/new?mode=work&path=…&prompt=…`

The URL scheme is named `codex://` even though macOS displays the application as ChatGPT. The path selects a local project so the task can reach the Tuple daemon and CLI. This deep-link contract is exposed by ChatGPT Desktop but is not a documented public API, so it may change between Desktop releases.

For local testing without opening the app, set `CALL_SUMMARY_CHATGPT_DESKTOP_DRY_RUN=1`.
