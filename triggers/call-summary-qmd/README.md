# Call Summary - qmd

A [Tuple](https://tuple.app) trigger that summarizes a finished call with [Claude
Code](https://claude.com/claude-code) and indexes it into [qmd](https://github.com/tobi/qmd), so past
calls are searchable from the terminal alongside everything else qmd indexes.

Nothing opens and nothing waits for input. The summary appears in Tuple's Call History on its own,
and the call becomes searchable a moment later.

## What it does

When `call-transcription-complete` fires:

- Finds the call — the id from the trigger environment, or the most recent stored call.
- Skips it if it already has a summary, so a summary you wrote yourself is never overwritten.
- Reads the transcript with `tuple transcription show` and writes a title plus a structured summary
  (outcome, decisions, action items, open questions, notable context) back onto the call with
  `tuple transcription set-title` / `set-summary`.
- Exports every call's title and summary to markdown and indexes them into qmd.

Then past calls are searchable:

```bash
qmd query "what did we decide about rate limiting" -c tuple
qmd search "postgres migration" -c tuple
```

## Summaries, not transcripts

Only titles and summaries are indexed. A raw transcript is mostly filler and cross-talk, and it
captures whatever personal conversation happened around the work — the summary is the part worth
searching. Full transcripts stay one command away:

```bash
tuple transcription show <call-id>
```

Everything stays on your machine: Tuple transcribes on-device, qmd indexes and embeds locally, and
the summaries are plain markdown you can read or delete.

## Requirements

- macOS
- The `tuple` CLI with `transcription` support
- [Claude Code](https://claude.com/claude-code) (`claude` on your `PATH`), authenticated
- [qmd](https://github.com/tobi/qmd) (`qmd` on your `PATH`) — optional; without it the summary is
  still written to the call and only the indexing step is skipped

## Setup

Install the trigger. There is no other setup: on its first run it registers the qmd collection and
wires the collection's update command, so `qmd update` keeps it current from then on.

Claude Code is given a deliberately narrow permission scope — only the `tuple transcription`
subcommands it needs to read the transcript and write the summary back.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `TUPLE_QMD_OUT` | `$XDG_DATA_HOME/tuple-summaries` (`~/.local/share/tuple-summaries`) | Where the exported markdown lives |
| `CALL_SUMMARY_QMD_COLLECTION` | `tuple` | Name of the qmd collection |
| `CALL_SUMMARY_QMD_TIMEOUT` | `300` | Seconds to allow Claude Code before giving up |

## Troubleshooting

Output is logged to `$TMPDIR/call-summary-qmd.log`.

- **Nothing happens when a call ends.** Triggers must be enabled in Tuple, which registers a
  Background Item. Check with
  `launchctl print gui/$(id -u)/app.tuple.app.triggers >/dev/null 2>&1 && echo ON || echo OFF`.
- **`the 'tuple' CLI is not on PATH`.** Triggers run from a Background Item with a minimal
  environment. The script already adds `~/.local/bin`, `/usr/local/bin` and `/opt/homebrew/bin`; add
  yours if the CLI lives elsewhere.
- **`qmd is on PATH but will not run`.** qmd is launched through `#!/usr/bin/env node`, so where
  node is managed by a version manager (fnm, nvm, asdf) it is unrunnable in the trigger's minimal
  environment. Install qmd against a node that is always on `PATH`, or add your node's `bin`
  directory to the `PATH` line near the top of `call-transcription-complete`.
- **The call is indexed as "Untitled call".** The summary was not readable yet when the export ran.
  The next `qmd update` repairs it.
