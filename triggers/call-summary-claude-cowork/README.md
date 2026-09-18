# Call Summary - Claude Desktop

Turn a finished Tuple call into a useful summary with [Claude Desktop](https://claude.com/download).

## What it does

When Capture ends, the trigger opens a local Claude Code session with the exact call and recording already selected. Claude then:

- Uses `TUPLE_TRIGGER_CALL_ID` and `TUPLE_TRIGGER_RECORDING_ID` to select the triggering Capture session.
- Reads transcript-only records with `tuple capture show --recording <recording-id> --exclude events,content`.
- Produces an executive summary, decisions, action items, open questions, and a follow-up draft.
- Writes a title and summary back onto the call with `tuple call edit <call-id> --title … --summary …`, so they show up in Tuple's Call History.

Claude Desktop opens with the draft prompt; review it and press Enter to run.

## Requirements

- macOS
- Claude Desktop with Claude Code available
- The `tuple` CLI available to the desktop app (with `capture` support)
  - Install it from the Tuple app: its Capture settings have an **Install** button that installs the `tuple` CLI.
- Tuple Capture enabled for the call
- Permission for Claude Desktop to run local commands, subject to your account and organization policy

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/call-summary-claude-cowork/`

The trigger fires automatically the next time call Capture completes.

## Workspace location

The trigger creates `~/.tuple/tuple-calls/` automatically, including missing parent directories. All Claude Desktop call triggers use this one project; each trigger firing still opens a separate chat whose prompt contains the call ID.

To use another root, set an absolute path near the top of `call-capture-complete` or in Tuple's environment:

```bash
TUPLE_DESKTOP_WORKSPACE_ROOT="$HOME/Developer/tuple-calls"
```

The generated prompt uses `tuple` by default. When `TUPLE_BIN` is set, it uses that command instead.

The trigger keeps its original directory name for installation compatibility, but uses Claude Desktop's `code` deep-link route so the session runs locally and can reach the Tuple daemon and CLI. This deep-link contract is exposed by Claude Desktop but is not a documented public API, so it may change between Desktop releases.

For local testing without opening Claude, set `CALL_SUMMARY_COWORK_DRY_RUN=1`; the trigger prints the deep link it would open and exits.
