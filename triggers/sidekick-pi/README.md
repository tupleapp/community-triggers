# Sidekick - Pi

Launches [Pi](https://pi.dev/) as an active live-call sidekick when Tuple Capture starts.

When `call-capture-started` fires, this trigger ships a small Pi extension into a working directory and opens a terminal that hands off to `tuple connect --harness pi`. Connect resolves call state and gives Pi a context prompt; the bundled extension follows the call in the background.

> **Requires the canonical Tuple CLI build documented in the repository release notes.**

## What Pi does on the call

The bundled extension (`tuple-call-sidekick.ts`) does one job well: it owns the live transcript feed **in the background** so Pi stays responsive to you. It loops on `tuple capture next --recording "$TUPLE_TRIGGER_RECORDING_ID" --exclude content --format json`, passing the highest returned record ID as the next numeric `--cursor`, then pushes new speech into Pi. So Pi is an active listener: it leaves a one-line `·` summary per batch, escalating to a `👋` interjection only when something matters — without ever running its own Capture loop. The cursor preserves this trigger's existing in-process delivery behavior; it does not rely on a resumable cursor surviving process restarts.

It surfaces the watch state on Pi's toolbar (mode and batches seen), and adds one tool — **`set_watch_mode`** — to trade responsiveness for quiet (`realtime` / `balanced` / `low_noise`) as the call's shape changes. Nothing is hard-coded about the model: Pi uses whichever provider and model you have configured as your default.

Unlike the other sidekick triggers (which are thin `tuple connect` launchers), Pi ships this extension because it benefits from owning the feed in the background rather than running the follow-loop in its own turn.

## Customizing

Pi answers to a small set of **watch words** — its name plus common Whisper mis-hearings — so it reliably notices when it's addressed on the call. Edit the `WATCH_WORDS` constant near the top of `tuple-call-sidekick.ts` to add your own name and its likely mistranscriptions.

## Prerequisites

- macOS
- [Pi](https://pi.dev/) installed so `pi` works in a new terminal, with a provider authenticated (`pi`, then `/login`)
- The `tuple` CLI on your interactive shell PATH, with the subcommands listed above
  - Install it from the Tuple app: its Capture settings have an **Install** button that links `tuple` onto your PATH.
- Tuple Capture enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/sidekick-pi/`

The trigger fires the next time call Capture starts.

## How it works

`call-capture-started` supplies `TUPLE_TRIGGER_CALL_ID` and `TUPLE_TRIGGER_RECORDING_ID`. This trigger:

1. Creates a working directory per start, `${TMPDIR:-/tmp}/tuple-pi-sidekick/<timestamp>-<pid>`.
2. Copies `tuple-call-sidekick.ts` into `.pi/extensions/` there. Pi auto-discovers `.pi/extensions/*.ts` from its working directory, so the extension is active the moment Pi starts.
3. Writes an executable `launch-pi-sidekick.command` wrapper into that directory.
4. Opens it in your preferred terminal via `open` (LaunchServices). With `PREFERRED_TERM` empty it opens in your default handler for `.command` files; set it to one of `ghostty | iterm | alacritty | terminal` to force one. No AppleScript, so it triggers no macOS accessibility prompt.
5. The wrapper starts a login-interactive zsh, `cd`s to the working directory, and runs `tuple connect --harness pi`.

There is no dedup: each Capture start gets its own directory, so stopping and restarting Capture in one call spawns a fresh sidekick while older ones keep running and stay queryable.

For local script testing without opening a terminal, set `SIDEKICK_PI_DRY_RUN=1`. It still installs the extension and writes the launcher, then exits without launching it.
