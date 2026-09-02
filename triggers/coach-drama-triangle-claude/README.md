# Coach - Drama Triangle - Claude

Launches [Claude Code](https://claude.com/claude-code) as a live **Karpman Drama Triangle** coach on your Tuple call when Capture starts.

When `call-capture-started` fires, this trigger opens your preferred terminal and runs `tuple connect --harness claude "<coaching purpose>"`. Connect resolves the call state, gives Claude a context prompt, and points it at the live transcript — the `COACH_PURPOSE` in the trigger adds the drama-triangle lens on top.

## What it does

### During the call

While you're talking, the coach:

- **Watches your own lines** for Victim ("I have no choice…"), Persecutor ("they always / never…"), or Rescuer ("let me save you…") language.
- **Fires a quiet nudge** when confidence is high: a terminal line plus a best-effort macOS notification, each containing a one-line reframe toward the empowered alternative — Creator, Challenger, or Coach.
- **Stays otherwise silent.** It won't repeat a reframe for the same pattern, won't nudge more than about once every few minutes, and ignores venting at code/infra, jokes, or self-aware naming of the pattern.

It does **not** post anywhere external. It does **not** speak in the call. Its terminal is yours alone.

### When the call ends

When the call ends, the same session switches from real-time coach to analyst:

- Reads the full transcript from disk across all session directories for this call.
- Writes `drama-evaluation.md` to the call directory with: per-participant drama profiles, the 2–3 hook moments where the conversation tipped, and concrete phrases to try differently with each teammate next time.
- Notifies you when the file is ready.

Because the trigger hands off to `tuple connect`, there is nothing call-format-specific baked in — how Claude reads the call and the coaching behavior live in connect's prompt and in `COACH_PURPOSE`, not in this script.

## Changing the coaching framing

The coaching intent lives in one editable variable near the top of `call-capture-started`:

```bash
COACH_PURPOSE="Watch my own lines for Karpman Drama Triangle patterns …"
```

Edit `COACH_PURPOSE` to adjust what the coach looks for, how noisy it is, or what it writes at the end of the call. Connect's base prompt already covers "follow the live call"; `COACH_PURPOSE` adds your lens on top.

## Choosing your terminal

By default the trigger opens your system's default handler for `.command` files. To force a specific terminal, set `PREFERRED_TERM` at the top of `call-capture-started` (or in the environment):

```bash
PREFERRED_TERM="iterm"   # ghostty | iterm | alacritty | terminal
```

The terminal runs `launch-coach-drama-triangle-claude.command`, whose `#!/bin/zsh -li` shebang sources your shell profile so `tuple` resolves from the same PATH you get in a normal terminal.

## Prerequisites

- macOS
- [Claude Code](https://claude.com/claude-code) installed so `claude` works in a new terminal
- The `tuple` CLI on your interactive shell PATH (with `connect` support)
  - Install it from the Tuple app: its Capture settings have an **Install** button that links `tuple` onto your PATH.
- Tuple Capture enabled for the call

## Installation

Drop this directory into your Tuple triggers folder:

- Production: `~/.tuple/triggers/coach-drama-triangle-claude/`
- Staging: `~/.tuplestaging/triggers/coach-drama-triangle-claude/`

The trigger fires the next time call Capture starts.

## How it works

`call-capture-started` supplies the call and recording IDs through environment variables, not
positional arguments. This trigger:

1. Creates a working directory per start, `${TMPDIR:-/tmp}/tuple-coach-drama-triangle-claude/<timestamp>-<pid>`.
2. Shell-quotes both IDs into `trigger-context.sh`, writes `COACH_PURPOSE` to a sidecar file, and writes an executable `launch-coach-drama-triangle-claude.command` wrapper.
3. Opens it in your preferred terminal via `open` (LaunchServices). No AppleScript and no direct binary launch, so it triggers no macOS accessibility prompt and no stray windows.
4. The wrapper starts a login-interactive zsh, sources the trigger context, and runs `tuple connect --harness claude "<COACH_PURPOSE>"`. Connect selects the live current session; the exact trigger IDs remain available to the launched agent and its Tuple commands.

There is no dedup: each Capture start gets its own directory, so stopping and restarting Capture spawns a fresh companion while older ones keep running.

For local testing without opening a terminal, set `COACH_DRAMA_TRIANGLE_CLAUDE_DRY_RUN=1`; it writes the launcher and exits.

## Acknowledgments

The Drama Triangle framework is Stephen Karpman's. The Creator / Challenger / Coach reframe (TED, The Empowerment Dynamic) is David Emerald's.
