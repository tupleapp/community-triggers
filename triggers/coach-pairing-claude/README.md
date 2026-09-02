# Coach - Pairing - Claude

Launches [Claude Code](https://claude.com/claude-code) as a live pairing coach on your Tuple call when transcription starts.

When `call-capture-started` fires, this trigger opens your preferred terminal and runs `tuple connect --harness claude "<coaching purpose>"`. Connect resolves the call state, gives Claude a context prompt, and points it at the live transcript — so Claude catches up on everything said so far, then watches the call as it happens as an active pairing coach.

## What it does

`tuple connect` brings Claude into the call and tells it how to follow along. The `COACH_PURPOSE` string (set near the top of `call-capture-started`) steers Claude toward pairing-coach behavior on top of connect's base prompt:

**During the call:**

- Watches the live pairing dynamic for known anti-patterns: backseat driving, a quiet navigator, a silent driver, no shared goal set up front, grinding without swaps or breaks.
- Tracks lightweight session state: talk-time balance, who last spoke, whether a goal was stated, and how long since the last role swap or break.
- When confidence is high, surfaces a **single one-line move** the pair can make right now — printed to the terminal. Otherwise stays silent.
- Does not interrupt the call, does not post anywhere external.

**When the call ends:**

- Reads the full transcript and writes a retro to `pairing-evaluation.md`:
  - **How the session ran**: shared goal? talk-time balance? swaps and breaks, or a grind?
  - **Anti-patterns that showed up**, each named with a timestamped quote.
  - **What worked**: up to 3 moves worth repeating.
  - **One thing to practice**: the single highest-leverage change for the next session.

## Tuning the coaching

The entire coaching framing lives in the `COACH_PURPOSE` variable near the top of `call-capture-started`. Edit it there to change what the coach watches for, how it intervenes, or what the retro covers — no other files need to change.

## Choosing your terminal

By default the trigger opens your system's default handler for `.command` files. To force a specific terminal, set `PREFERRED_TERM` at the top of `call-capture-started` (or in the environment):

```bash
PREFERRED_TERM="iterm"   # ghostty | iterm | alacritty | terminal
```

The terminal runs `launch-coach-pairing-claude.command`, whose `#!/bin/zsh -li` shebang sources your shell profile, so `tuple` and `claude` resolve from the same PATH you get in a normal terminal.

## Prerequisites

- macOS
- [Claude Code](https://claude.com/claude-code) installed so `claude` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `connect` and `transcription` support)
  - Install it from the Tuple app: its Transcription settings have an **Install** button that links `tuple` onto your PATH.
- Tuple transcription enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

`~/.tuple/triggers/coach-pairing-claude/`

The trigger fires the next time call transcription starts.

## How it works

`call-capture-started` fires with no call-specific arguments. This trigger:

1. Creates a working directory per start, `${TMPDIR:-/tmp}/tuple-coach-pairing-claude/<timestamp>-<pid>`.
2. Writes the `COACH_PURPOSE` to a `coach-purpose.txt` sidecar file and an executable `launch-coach-pairing-claude.command` wrapper into it.
3. Opens it in your preferred terminal via `open` (LaunchServices). No AppleScript and no direct binary launch, so it triggers no macOS accessibility prompt and no stray windows.
4. The wrapper starts a login-interactive zsh, `cd`s to that directory, and runs `tuple connect --harness claude "$COACH_PURPOSE"`.

There is no dedup: each transcription-start gets its own directory, so stopping and restarting transcription spawns a fresh coach while older ones keep running.

For local testing without opening a terminal, set `COACH_PAIRING_CLAUDE_DRY_RUN=1`; it writes the launcher and exits.

## Acknowledgments

The pairing framework is drawn from [Tuple's Pair Programming Guide](https://tuple.app/pair-programming-guide/) (its [antipatterns](https://tuple.app/pair-programming-guide/antipatterns), [styles](https://tuple.app/pair-programming-guide/styles), and [session template](https://tuple.app/pair-programming-guide/template)) and from the wider practice, notably Birgitta Böckeler and Nina Siessegger's [On Pair Programming](https://martinfowler.com/articles/on-pair-programming.html) and Llewellyn Falco's strong-style rule ("for an idea to go from your head into the computer it must go through someone else's hands").
