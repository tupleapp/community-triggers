# Call Summary - qmd

A [Tuple](https://tuple.app) trigger that summarizes a finished call with [Claude
Code](https://claude.com/claude-code) and indexes it into [qmd](https://github.com/tobi/qmd) — a local
search engine over markdown — so past calls are searchable from the terminal alongside everything
else qmd indexes.

This is the same headless shape as `slack-call-summary-claude`, with the Slack delivery replaced by
local indexing. Nothing opens and nothing waits for input.

## What it does

When `call-transcription-complete` fires, the trigger writes a prompt and launches Claude headless.
Claude then:

- Finds the call — `tuple call current` if you're still on it, otherwise the most recent call from
  `tuple transcription list`.
- Stops without changing anything if that call already has a summary, so one you wrote by hand is
  never overwritten.
- Reads the transcript — `tuple transcription show <id> --with-events`.
- Writes a title and a structured summary (outcome, decisions, action items, open questions, notable
  context) back onto the call with `tuple transcription set-title` / `set-summary`, so they show up
  in Tuple's Call History.

The trigger then exports every call's title and summary to markdown and hands them to qmd:

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

Tuple transcribes on-device, and the exported summaries and qmd index stay on your machine as plain
files you can read or delete. The full transcript and lifecycle metadata are sent through Claude
Code to your configured model provider to produce the summary.

The export is additive: it writes new summaries and updates changed ones, and never deletes
anything — `TUPLE_QMD_OUT` may well point at a directory holding other notes. One consequence is
that deleting a call in Tuple leaves its summary here. Remove the file yourself if that matters.

Each run exports the ten most recent calls, which covers the call that just ended plus any that
started and stopped while a slow summary was still being written. Only calls that have a title or a
summary are exported — a transcript on its own has nothing to search here.

Older calls are not revisited, and nothing summarises them retroactively. That only matters if an
older call already carries a summary you wrote yourself, in which case widen the window once:

```bash
CALL_SUMMARY_QMD_LIMIT=-1 ~/.tuple/triggers/call-summary-qmd/export-summaries
qmd update && qmd embed
```

## Requirements

- macOS
- The `tuple` CLI available on your login shell's `PATH` (with `transcription` support)
- [Claude Code](https://claude.com/claude-code) (`claude`), authenticated
- [qmd](https://github.com/tobi/qmd) — optional. Without it the summary is still written to the
  call and only the indexing step is skipped.

## Setup

Install the trigger. There is no other setup: on its first run it registers the qmd collection and
sets that collection's update command, so `qmd update` keeps it current from then on.

Claude Code is given a deliberately narrow allow-list — only the `tuple transcription` subcommands
needed to read the call and write the summary back.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `TUPLE_QMD_OUT` | `$XDG_DATA_HOME/tuple-summaries` (`~/.local/share/tuple-summaries`) | Where the exported markdown lives |
| `CALL_SUMMARY_QMD_COLLECTION` | `tuple` | Name of the qmd collection |
| `CALL_SUMMARY_QMD_LIMIT` | `10` | How many of the most recent calls to export. `-1` exports all of them |
| `CALL_SUMMARY_QMD_DRY_RUN` | unset | Set to `1` to write the prompt and exit without running Claude |

## Troubleshooting

The trigger logs to `/tmp/tuple-trigger-debug.log`; each run also keeps its prompt and Claude's
output under `$TMPDIR/tuple-call-summary-qmd/`.

- **Nothing happens when a call ends.** Triggers must be enabled in Tuple, which registers a
  Background Item. Check with
  `launchctl print gui/$(id -u)/app.tuple.app.triggers >/dev/null 2>&1 && echo ON || echo OFF`.
- **`claude not found on login-shell PATH`.** Triggers run from a Background Item with a minimal
  environment, so the work is re-launched through a login shell. Make sure `claude`, `tuple` and
  `qmd` all work in a fresh terminal.
- **The call is indexed as "Untitled call".** The summary was not readable yet when the export ran.
  The next `qmd update` repairs it.
