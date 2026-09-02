# Call Summary - Claude Cowork

A [Tuple](https://tuple.app) trigger that opens [Claude Cowork](https://www.anthropic.com/product/claude-cowork) when call transcription completes, preloaded with a prompt to summarize the call.

## What it does

When `call-capture-complete` fires, the trigger opens `claude://cowork/new` with a summary prompt. Cowork (which has access to the `tuple` CLI through the desktop app) then:

- Finds the call — `tuple call current` if you're still on it, otherwise the most recent call from `tuple transcription list`.
- Reads the transcript — `tuple transcription show <id>` (with `--with-events` for join/leave/screen events).
- Produces an executive summary, decisions, action items, open questions, and a follow-up draft.
- Writes a title and summary back onto the call — `tuple transcription set-title` / `set-summary` — so they show up in Tuple's Call History.

Claude Cowork opens with the draft prompt; review it and press Enter to run.

## Requirements

- macOS
- Claude Desktop with Cowork enabled
- The `tuple` CLI available to the desktop app (with `transcription` support)
  - Install it from the Tuple app: its Transcription settings have an **Install** button that installs the `tuple` CLI.
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/call-summary-claude-cowork/`

The trigger fires automatically the next time call transcription completes.

For local testing without opening Cowork, set `CALL_SUMMARY_COWORK_DRY_RUN=1`; the trigger prints the deep-link it would open and exits.
