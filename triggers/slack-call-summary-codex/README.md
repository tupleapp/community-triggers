# Slack Call Summary - Codex

Headlessly runs [Codex](https://developers.openai.com/codex/cli/) when Tuple transcription completes: it summarizes the call, writes a title and summary back onto the call (Tuple's Call History), and DMs the summary to Slack.

Unlike the interactive `call-summary-codex` trigger, this one runs entirely in the background — no terminal window, no UI. You see nothing except a Slack DM arriving a few minutes after your call ends, and the summary showing up on the call.

It's a one-shot over the finished call — no `tuple connect`, nothing live to follow. Codex finds the call, reads its stored transcript with the `tuple` CLI, and does the work.

> [!WARNING]
> **This trigger runs Codex with `--dangerously-bypass-approvals-and-sandbox`** — no sandbox, no approval prompts, fully unattended, with a call transcript (untrusted speech-to-text) as input. Codex's `exec` mode currently has no narrower way to let an unattended run use connector tools like the Slack send ([openai/codex#24135](https://github.com/openai/codex/issues/24135)). Read [A note on sandboxing](#a-note-on-sandboxing) before installing, and if that trade-off doesn't work for you, use [Slack Call Summary - Claude](../slack-call-summary-claude) instead — it runs with a scoped tool allowlist.

## Prerequisites

- macOS
- [Codex](https://developers.openai.com/codex/cli/) installed so `codex` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `transcription` support)
  - Install it from the Tuple app: its Transcription settings have an **Install** button that links `tuple` onto your PATH.
- A Slack connector available to Codex with a `slack_send_message` tool. The OpenAI-curated Slack plugin works out of the box — enable it and sign in so `codex` has the Slack tools available.
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/slack-call-summary-codex/`

The trigger fires when call transcription completes.

## Configuration

By default the summary is sent as a DM to yourself (the authenticated Slack user). To send to a different person or channel, edit the `SLACK_RECIPIENT=` line near the top of [call-capture-complete](./call-capture-complete):

```sh
SLACK_RECIPIENT="${SLACK_RECIPIENT:-#my-channel}"     # a channel
SLACK_RECIPIENT="${SLACK_RECIPIENT:-@jack}"           # another user by handle
SLACK_RECIPIENT="${SLACK_RECIPIENT:-Jack Hannah}"     # another user by display name
```

Leave it empty (the default) to DM yourself. The environment variable form also works, but Tuple launches triggers outside your shell, so an `export` in your shell rc won't reach it — use `launchctl setenv SLACK_RECIPIENT "#my-channel"` if you prefer the environment route.

## How it works

`call-capture-complete` fires with no call-specific arguments. This trigger:

1. Writes `slack-call-summary-codex-prompt.md` into a working directory (`${TMPDIR:-/tmp}/tuple-slack-call-summary-codex/<timestamp>-<pid>`), including the configured recipient and all instructions.
2. Headlessly launches a login zsh (`nohup zsh -lic`, so `codex` and `tuple` resolve from your normal PATH — no terminal window) that runs `codex exec` in that directory with the prompt on stdin and `--dangerously-bypass-approvals-and-sandbox` (required for unattended Slack connector use). `tuple` in `Bash` lets Codex read the call; the Slack connector lets it send the message.
3. Codex finds the call (`tuple call current` / `tuple transcription list`), reads it (`tuple transcription show <id> --with-events`), writes the title + summary back (`tuple transcription set-title` / `set-summary`), and sends the Slack message.

### A note on sandboxing

The trigger passes `--dangerously-bypass-approvals-and-sandbox` to `codex exec`. This is required, not a convenience: in non-interactive `exec` mode Codex auto-cancels any approval-gated connector tool call (`user cancelled MCP tool call`) because there is no user present to approve it, and as of Codex 0.139 no `apps.*` / `mcp_servers.*` `approval_mode` configuration suppresses that (see [openai/codex#24135](https://github.com/openai/codex/issues/24135)). Without the flag, the Slack send always fails.

The prompt is fixed, but the transcript it reads is not: call transcripts are speech-to-text of whatever was said (or shown) on the call, which makes them untrusted input to an unsandboxed, unattended agent. If that trade-off doesn't work for you, use the Claude variant of this trigger (which runs with a scoped tool allowlist) or the interactive `call-summary-codex` trigger (read-only sandbox) instead. If a later Codex release lets `exec` approve connector tools via configuration (watch the linked issue), the bypass flag here can be replaced with `--sandbox workspace-write` plus that configuration.

## Troubleshooting

- **Trigger not firing**: Check `/tmp/tuple-trigger-debug.log` — the banner `call-capture-complete fired (slack-call-summary-codex)` appears each time the trigger runs.
- **No Slack DM and no error**: Check `slack-call-summary-codex.log` in the working directory (printed at launch) for the Codex run output.
- **Slack delivery failed**: Look for `slack-call-summary-codex-failed.md` in the working directory — it contains the composed message and the error. Also check `slack-call-summary-codex-last-message.md` for the final Codex agent message.
- **`codex not found` / `tuple not found`**: Make sure both are on your login-shell PATH (test with `zsh -lic 'which codex tuple'`).
- **Slack connector not available**: Open `codex` in a terminal and confirm the Slack plugin is signed in. The prompt tells Codex to write a fallback file if the tools are unavailable.

## Dry run

To test the trigger without launching Codex, set `SLACK_CALL_SUMMARY_CODEX_DRY_RUN=1`. The trigger generates the prompt file and exits — nothing is sent to Slack. (Output goes to `/tmp/tuple-trigger-debug.log`.)
