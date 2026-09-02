# Call Summary - Claude Cowork

A [Tuple](https://tuple.app) trigger that opens [Claude Cowork](https://www.anthropic.com/product/claude-cowork) when call Capture completes, preloaded with a prompt to summarize the triggering recording.

## What it does

When `call-capture-complete` fires, the trigger opens `claude://cowork/new` with a summary prompt. Cowork (which has access to the `tuple` CLI through the desktop app) then:

- Uses `TUPLE_TRIGGER_CALL_ID` and `TUPLE_TRIGGER_RECORDING_ID` to select the triggering Capture session.
- Reads transcript-only records with `tuple capture show --recording <recording-id> --exclude events,content`.
- Produces an executive summary, decisions, action items, open questions, and a follow-up draft.
- Writes a title and summary back onto the call with `tuple call edit <call-id> --title … --summary …`, so they show up in Tuple's Call History.

Claude Cowork opens with the draft prompt; review it and press Enter to run.

## Requirements

- macOS
- Claude Desktop with Cowork enabled
- The `tuple` CLI available to the desktop app (with `capture` support)
  - Install it from the Tuple app: its Capture settings have an **Install** button that installs the `tuple` CLI.
- Tuple Capture enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/call-summary-claude-cowork/`

The trigger fires automatically the next time call Capture completes.

For local testing without opening Cowork, set `CALL_SUMMARY_COWORK_DRY_RUN=1`; the trigger prints the deep-link it would open and exits.
