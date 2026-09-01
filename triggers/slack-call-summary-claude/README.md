# Slack Call Summary - Claude

Headlessly runs [Claude Code](https://claude.com/claude-code) when Tuple transcription completes: it summarizes the call, writes a title and summary back onto the call (Tuple's Call History), and DMs the summary to Slack.

Unlike the interactive `call-summary-claude` trigger, this one runs entirely in the background — no terminal window, no UI. You see nothing except a Slack DM arriving a few minutes after your call ends, and the summary showing up on the call.

It's a one-shot over the finished call — no `tuple connect`, nothing live to follow. Claude finds the call, reads its stored transcript with the `tuple` CLI, and does the work.

## Prerequisites

- macOS
- [Claude Code](https://claude.com/claude-code) installed so `claude` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `transcription` support)
  - Install it from the Tuple app: its Transcription settings have an **Install** button that links `tuple` onto your PATH.
- A Slack MCP server or connector available to Claude Code. The **claude.ai Slack connector** works out of the box — verify with `claude mcp list` (you should see `claude.ai Slack: Connected`); connect it from [claude.ai](https://claude.ai) → Settings → Connectors, or run `/mcp` inside Claude Code. Any other Slack MCP works too, as long as its tools are allowed in your Claude Code permission settings (or you add its `mcp__<server>` rule to the allowlist in [call-capture-complete](./call-capture-complete)).
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/slack-call-summary-claude/`

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

1. Writes `slack-call-summary-claude-prompt.md` into a working directory (`${TMPDIR:-/tmp}/tuple-slack-call-summary-claude/<timestamp>-<pid>`), including the configured recipient and all instructions.
2. Headlessly launches a login zsh (`nohup zsh -lic`, so `claude` and `tuple` resolve from your normal PATH — no terminal window) that runs `claude -p` in that directory with the prompt on stdin and a scoped tool allowlist: `Read`, `Bash`, `Write(slack-call-summary-claude-failed.md)`, and `mcp__claude_ai_Slack`. In `-p` print mode any tool outside the allowlist is auto-denied — `Bash` lets Claude run the `tuple` CLI, and the Slack tool lets it send the message; nothing else.
3. Claude finds the call (`tuple call current` / `tuple transcription list`), reads it (`tuple transcription show <id> --with-events`), writes the title + summary back (`tuple transcription set-title` / `set-summary`), and sends the Slack message.

## Troubleshooting

- **Trigger not firing**: Check `/tmp/tuple-trigger-debug.log` — the banner `call-capture-complete fired (slack-call-summary-claude)` appears each time the trigger runs.
- **No Slack DM and no error**: Check `slack-call-summary-claude.log` in the working directory (printed at launch) for the Claude run output.
- **Slack delivery failed**: Look for `slack-call-summary-claude-failed.md` in the working directory — it contains the composed message and the error.
- **`claude not found` / `tuple not found`**: Make sure both are on your login-shell PATH (test with `zsh -lic 'which claude tuple'`).
- **Slack connector not available**: Run `claude mcp list` and confirm `claude.ai Slack: Connected`.

## Dry run

To test the trigger without launching Claude, set `SLACK_CALL_SUMMARY_CLAUDE_DRY_RUN=1`. The trigger generates the prompt file and exits — nothing is sent to Slack. (Output goes to `/tmp/tuple-trigger-debug.log`.)
