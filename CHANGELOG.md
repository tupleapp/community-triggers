# Changelog

## Unreleased

- Migrate every community trigger and copied command example to the canonical
  Tuple CLI. The command floor is `tupleapp/app@4a587f47e6`; publishing also
  requires the `call-capture-*` event dispatch from `tupleapp/app#4033`.
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

The canonical CLI is newer than the latest tagged Tuple staging release
(`3.3.10`) as of 2026-09-02, and `origin/master@4a587f47e6` still dispatches
`call-transcription-*`. Do not publish this cutover until app PR #4033 lands on
a descendant of `4a587f47e6` and both lifecycle events pass an installed-trigger
smoke test. Then replace this two-part commit/PR floor with the first released
Tuple version that contains both contracts.
