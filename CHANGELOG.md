# Changelog

## Unreleased

- Add Claude Desktop and ChatGPT Desktop sidekicks, plus a ChatGPT Desktop
  call-summary trigger. Desktop triggers open local agent sessions through each
  app's native URL scheme and pass version-matched `tuple connect prompt`
  instructions for live calls.
- Route the Claude Cowork call summary through Claude Code inside Claude
  Desktop so it can reach the local Tuple CLI, and make desktop deep-link
  prompt encoding UTF-8 safe.
- Use `~/.tuple/tuple-calls/` as the shared desktop-agent project, create it
  automatically, and support a `TUPLE_DESKTOP_WORKSPACE_ROOT` override.
- Resolve the desktop sidekicks' Tuple CLI from the running app bundle, with a
  `TUPLE_BIN` override for custom installations.
- Preserve `TUPLE_BIN` in desktop summary prompts so custom CLI installations
  read and update the triggering recording.
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
