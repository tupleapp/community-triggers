# Claude Call Liaison

A [Tuple](https://tuple.app) trigger that launches [Claude Code](https://claude.ai/code) on every call to act as your proactive liaison: when the live transcript surfaces concrete, non-private news worth sharing — decisions, ticket updates, project status, launch notes — Claude posts it to Slack, Linear, or Notion on your behalf. Hard privacy gates keep it silent on personnel, comp, legal, and named-customer or named-employee discussions.

Claude's terminal is visible only to you. Every external post goes out in your name, with your reputation behind it.

## What gets posted

- **Linear ticket comments** when a specific ticket (e.g. `TUP-1234`) is named and the call lands a decision, status change, or new context for it.
- **Linear project status updates** when the call lands a milestone, scope shift, unblock, or schedule change at the project level.
- **Slack messages** for cross-team news — launches, decisions other teams should know about, blockers other teams can clear. Routed to the narrowest channel that fits.
- **Notion page edits or comments** when a Notion doc is explicitly referenced and the call lands an agreed change.

A dissemination opportunity requires **both** a concrete unit of news and an explicit second voice (or no objection over the next ~30 seconds). Speculation, exploration, and unanswered questions don't qualify. Auto-send is capped at 3 posts per call; anything beyond that is queued for the end-of-call summary.

## What stays silent

The privacy gates in `system-prompt.md` trip on:

- Personnel discussions (performance, hiring, comp, equity, headcount)
- Sustained discussion of a specific person — positive or negative
- Customer-by-name complaints or churn talk
- Specific non-public financials (revenue, ARR, runway, fundraising, valuation, burn)
- Legal topics (lawsuits, NDAs, disputes, IP)
- Strategic non-public moves (acquisitions, partnerships in negotiation, pricing changes not yet announced)
- Explicit "this is private" / "off the record" / "between us" signals

When any gate trips, Claude switches to silent mode for the rest of the call — even if the conversation pivots back to public topics — and prints one short terminal note so you know.

## Prerequisites

- **macOS** — the trigger uses `open` and `Ghostty.app` (with fallback to the default `.command` handler).
- **Claude Code**: `npm install -g @anthropic-ai/claude-code`
- **The `tuple` CLI** — ships with Tuple.
- **A Whisper model** configured in Tuple for live transcription. Email `support@tuple.app` if you need local recording enabled for your team.
- **MCP servers** configured in Claude Code for the targets you want it to post to — typically `slack`, `linear`, and `notion`. Without these, Claude can still listen and summarize, but it can't post.

## Installation

Drop this directory into your Tuple triggers folder:

- Production: `~/.tuple/triggers/claude-call-liaison/`
- Staging: `~/.tuplestaging/triggers/claude-call-liaison/`

The trigger fires automatically the next time you start transcription on a call.

## How it works

When `call-transcription-started` fires:

1. Detects which Tuple environment (`prod`, `staging`, `dev`) owns the call by probing each daemon's `state` for a matching call ID, and exports `TUPLE_ENV` so every `tuple` CLI call inside Claude scopes to the right daemon.
2. Copies `system-prompt.md` into the call's artifact directory, then appends your identity and context files (see below) so Claude has personal grounding before it starts.
3. Inlines the last 100 lifecycle events and 100 transcript lines into an initial prompt so Claude has context if it joins mid-call.
4. Opens a terminal (Ghostty if installed, otherwise the system `.command` handler) running Claude Code inside the call's artifact directory.

Once running, Claude subscribes to `tuple transcription stream -f --interval=30s` so events and transcript share a single wake source. It maps participants once via `tuple state`, captures the shared screen on `screen_share_started`, and re-captures every ~30s while sharing is active.

If transcription stops and restarts mid-call (e.g. you toggled it off then back on), the trigger sees the live PID file and exits — the existing session's stream subscription picks up the resumed transcript without restarting.

When transcription stops mid-call, Claude produces a checkpoint summary in the terminal and keeps its subscription running. When the call genuinely ends (the daemon returns HTTP 410 for the current call), Claude produces a final summary — key decisions, posts fired, queued posts, dropped threads, unresolved questions — and exits.

## Identity and context

Two optional files give Claude grounding it can't infer from the transcript:

- `~/.tuple/identity.md` (or `~/.tuplestaging/identity.md` for staging) — who you are, your role, your default posture toward what's shareable.
- `~/.tuple/context.md` (or `~/.tuplestaging/context.md` for staging) — your team, the channel/project/Notion-doc routing map Claude consults before posting.

Both are appended to the system prompt at the start of each call.

```markdown
# context.md example

## Team

- Alice (alice@example.com) — backend lead, owns the API layer
- Bob (bob@example.com) — frontend, working on the dashboard redesign

## Channels

- #product — cross-team product news, launches
- #eng-backend — backend-only changes
- #design-crit — design decisions and reviews

## Linear projects

- "Onboarding revamp" — project ID PRO-abc123
- "API v2 migration" — project ID PRO-def456
```

If the call references a channel, project, or person not in the map, Claude looks it up at runtime via the relevant MCP rather than guessing.

## Tuning the behavior

`system-prompt.md` is the file to edit if you want to change Claude's posture. Common adjustments:

- **Tighten or loosen the auto-send confidence threshold.** Default is 95%+ to auto-send, 80–95% to draft for your confirmation, <80% to stay silent.
- **Change the post cap.** Default is 3 auto-sent posts per call.
- **Add or remove privacy gates** — the list under **Privacy gates (HARD STOPS)** is the operational trigger surface.
- **Change the stream interval.** 30s keeps wake rate low at the cost of ~30s lag; drop to `10s` for snappier reactions if your terminal can tolerate the noise.
