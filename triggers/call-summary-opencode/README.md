# Call Summary - OpenCode

Opens [OpenCode](https://opencode.ai/) in a terminal when Tuple Capture completes, to summarize the call.

When `call-capture-complete` fires, this trigger writes a focused prompt and opens your preferred terminal running OpenCode. OpenCode uses the triggering call and recording IDs, reads that recording's stored transcript with the `tuple` CLI, produces a concise summary (decisions, action items, open questions), **writes a title and summary back onto the call** so they show up in Tuple's Call History, and stays available for transcript-backed follow-up questions.

This is not a live-call companion (that's the sidekick triggers), so there's no `tuple connect` and nothing to follow in real time — it's a one-shot over the finished call.

## How it reads the call

Guided by the prompt, OpenCode uses the `tuple` CLI:

- `TUPLE_TRIGGER_CALL_ID` and `TUPLE_TRIGGER_RECORDING_ID` select the call and exact Capture session that fired the trigger.
- `tuple capture show --recording "$TUPLE_TRIGGER_RECORDING_ID" --exclude events,content` reads its transcript-only records.
- `tuple call edit "$TUPLE_TRIGGER_CALL_ID" --title "…" --summary "…"` records the result on the call.

Nothing is hard-coded about the model — OpenCode uses whatever you have configured.

## Prerequisites

- macOS
- [OpenCode](https://opencode.ai/) installed so `opencode` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `capture` support)
  - Install it from the Tuple app: its Capture settings have an **Install** button that links `tuple` onto your PATH.
- Tuple Capture enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/call-summary-opencode/`

The trigger fires when call Capture completes.

## How it works

`call-capture-complete` supplies the call and recording IDs through environment variables, not positional arguments. This trigger:

1. Creates a working directory, `${TMPDIR:-/tmp}/tuple-call-summary-opencode/<timestamp>-<pid>`, and writes the prompt (`call-summary-opencode-prompt.md`) into it.
2. Writes an executable `launch-call-summary-opencode.command` wrapper there.
3. Opens it in your preferred terminal via `open` (set `PREFERRED_TERM` to `ghostty | iterm | alacritty | terminal`, or leave empty for your default `.command` handler). No AppleScript, so it triggers no macOS accessibility prompt.
4. The wrapper starts a login-interactive zsh, `cd`s to that directory, and runs `opencode . --prompt "$(cat call-summary-opencode-prompt.md)"`.

For local script testing without opening a terminal, set `CALL_SUMMARY_OPENCODE_DRY_RUN=1`.
