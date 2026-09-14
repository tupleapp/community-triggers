# Changelog

## Unreleased

- Target Tuple Capture 3.3.0 for Capture-based triggers and remove the
  transitional `call-transcription-*` executables and frozen CLI helpers.
- Keep completed-call summaries pinned to the triggering
  `TUPLE_TRIGGER_RECORDING_ID`; transcript-only summaries explicitly exclude
  `events,content`, while Slack and qmd summaries keep lifecycle events and
  exclude only captured app content.
- Move call metadata writes to `tuple call edit`, and request
  `--format json` for structured Capture and call reads.
- Update Sidekick - Pi from `transcription show --wait` to
  recording-scoped `capture next`. Each request resumes from the highest numeric
  record ID returned by the previous request; a restarted sidekick catches up
  again and does not depend on a durable cursor contract.
- Keep trigger directories and display names unchanged. Capture lifecycle
  executables are `call-capture-started` and `call-capture-complete`.
