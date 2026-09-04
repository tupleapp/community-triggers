# Changelog

## Unreleased

- Migrate every `call-capture-*` trigger and its copied command examples to the
  canonical Tuple CLI. The parallel `call-transcription-*` compatibility files
  remain on the legacy CLI until the renamed app release has rolled out.
- Keep completed-call summaries pinned to the triggering
  `TUPLE_TRIGGER_RECORDING_ID`; transcript-only summaries explicitly exclude
  `events,content`, while Slack and qmd summaries keep lifecycle events and
  exclude only captured app content.
- Move call metadata writes to `tuple call edit`, and request
  `--format json` for structured Capture and call reads.
- Update Sidekick - Pi from `transcription show --wait` to
  recording-scoped `capture next`. Its cursor tag remains process-specific: a
  restarted sidekick catches up again and does not depend on the pending
  resumable-cursor contract.
- No trigger directory or display name changes in this cutover. The Capture
  event executables remain `call-capture-started` and
  `call-capture-complete`.

The dual event files make this package safe across the rollout: the current
stable app dispatches the legacy files, while the upcoming app dispatches the
Capture files. Remove the compatibility files only after the first released
Tuple version containing both the canonical CLI and renamed events has rolled
out and both installed lifecycle events pass a smoke test.
