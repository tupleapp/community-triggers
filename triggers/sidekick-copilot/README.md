# Sidekick - Copilot

Launches [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli) as a live companion on your Tuple call when transcription starts.

When `call-capture-started` fires, this trigger opens your preferred terminal and runs `tuple connect --harness copilot`. Connect resolves the call state, gives Copilot a context prompt, and points it at the live transcript — so Copilot catches up on everything said so far, then watches the call as it happens and acts as a sharp third pair.

## What it does

`tuple connect` brings Copilot into the call and tells it how to follow along, using the `tuple` CLI's own transcript stream (`tuple transcription show --wait`). Guided by connect's prompt, Copilot:

- **Logs the call live** — a one-line `·` play-by-play on each batch of new transcript, so you can follow along at a glance.
- **Chimes in when it matters** — a real interjection for a bug it can see, an ambiguous decision or action item, a correction, or a direct question.
- **Answers when addressed** — say "Copilot, ..." (or type into the terminal) and it responds, then keeps listening.
- **Summarizes** — a checkpoint when recording stops, and a final summary (decisions, action items, open threads) when the call ends.

Because the trigger just hands off to `tuple connect`, there's nothing call-format-specific in it: how Copilot reads the call lives in connect's prompt, in the CLI. Nothing is hard-coded about the model either — Copilot uses whatever you have configured.

## Choosing your terminal

By default the trigger opens your system's default handler for `.command` files. To force a specific terminal, set `PREFERRED_TERM` at the top of `call-capture-started` (or in the environment):

```bash
PREFERRED_TERM="iterm"   # ghostty | iterm | alacritty | terminal
```

The terminal runs `launch-sidekick-copilot.command`, whose `#!/bin/zsh -li` shebang sources your shell profile, so `tuple` and `copilot` resolve from the same PATH you get in a normal terminal.

## Prerequisites

- macOS
- [GitHub Copilot CLI](https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli) installed (`npm i -g @github/copilot`) so `copilot` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `connect` and `transcription` support)
  - Install it from the Tuple app: its Transcription settings have an **Install** button that links `tuple` onto your PATH.
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-copilot/`

The trigger fires the next time call transcription starts.

## How it works

`call-capture-started` fires with no call-specific arguments. This trigger:

1. Creates a working directory per start, `${TMPDIR:-/tmp}/tuple-sidekick-copilot/<timestamp>-<pid>`.
2. Writes an executable `launch-sidekick-copilot.command` wrapper into it.
3. Opens it in your preferred terminal via `open` (LaunchServices). No AppleScript and no direct binary launch, so it triggers no macOS accessibility prompt and no stray windows.
4. The wrapper starts a login-interactive zsh, `cd`s to that directory, and runs `tuple connect --harness copilot`.

There is no dedup: each transcription-start gets its own directory, so stopping and restarting transcription spawns a fresh companion while older ones keep running.

For local testing without opening a terminal, set `SIDEKICK_COPILOT_DRY_RUN=1`; it writes the launcher and exits.
