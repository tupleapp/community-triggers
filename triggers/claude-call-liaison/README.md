# Claude Call Liaison

A [Tuple](https://tuple.app) trigger that launches [Claude Code](https://claude.ai/code) on every call to act as your proactive liaison: when the live transcript surfaces concrete, non-private news worth sharing — decisions, ticket updates, project status, launch notes — Claude posts it to your team's chat, ticket tracker, or knowledge base on your behalf. Hard privacy gates keep it silent on personnel, comp, legal, and named-customer or named-employee discussions.

Claude's terminal is visible only to you. Every external post goes out in your name, with your reputation behind it.

## What gets posted

The shipped `system-prompt.md` is tool-agnostic and thinks in four destination categories:

- **Ticket comment** — when a specific ticket (e.g. `PROJECT-1234`) is named and the call lands a decision, status change, or new context for it.
- **Project / ticket-tracker status update** — when the call lands a milestone, scope shift, unblock, or schedule change at the project level.
- **Team chat message** — for cross-team news, launches, decisions other teams should know about, blockers other teams can clear. Routed to the narrowest channel that fits.
- **Knowledge-base edit or comment** — when a doc is explicitly referenced and the call lands an agreed change.

Which specific platforms map to those categories (Slack vs. Discord vs. Teams; Linear vs. Jira vs. GitHub; Notion vs. Confluence) is determined by your local context file (see [Identity and context](#identity-and-context) below) and the MCP servers you've configured in Claude Code. The system prompt names destination categories, not specific tools.

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
- **MCP servers** configured in Claude Code for the destinations you want Claude to post to — at minimum a team-chat MCP, and ideally also a ticket-tracker MCP and a knowledge-base MCP. Without any of these, Claude can still listen and summarize, but it can't post.

## Installation

Drop this directory into your Tuple triggers folder:

- Production: `~/.tuple/triggers/claude-call-liaison/`
- Staging: `~/.tuplestaging/triggers/claude-call-liaison/`

The trigger fires automatically the next time you start transcription on a call.

## Identity and context

The system prompt is intentionally generic. Two files at the root of your Tuple config directory tell Claude who you are and how your team's destinations are wired:

- `~/.tuple/identity.md` (or `~/.tuplestaging/identity.md` for staging) — who you are, your role, your default posture toward what's shareable.
- `~/.tuple/context.md` (or `~/.tuplestaging/context.md` for staging) — your team, the routing map (which destination belongs to which kind of news), and the specific MCP tool names available for each destination category.

Both are appended to the system prompt at the start of each call. Treat them as the wiring diagram for your specific install.

### identity.md template

```markdown
# Identity

You're working with [Your Name], [role] at [company]. [One-liner about what they own / care about / decide on.]

## Posture

- [Default to terse, factual, no exclamation points / emoji unless the channel uses them.]
- [Other voice/style notes — e.g. "they sign Slack posts as 'sd' rather than their full name".]
- [What kinds of detail are always private regardless of category — e.g. "any conversation about a specific teammate's performance is gated, full stop".]
```

### context.md template

```markdown
# Context

## Team

- [Name] ([email]) — [role / what they own]
- [Name] ([email]) — [role / what they own]

## Routing map

### Team chat (Slack / Discord / Teams)

- `#channel-name` — [what belongs here, narrow it as much as possible]
- `#another-channel` — [what belongs here]
- `#general` — [usually: company-wide announcements only; default to a narrower channel]

### Ticket tracker (Linear / Jira / GitHub / Asana)

- Teams and their prefixes: `PROJ-` is X team, `WEB-` is Y team, etc.
- Active projects: [list with IDs if you have them, or just names]

### Knowledge base (Notion / Confluence / Coda)

- [Which top-level sections exist; which kinds of docs go where; what's private]

## Tools

The specific MCP tool names available in this Claude Code session for each destination. Fill in whichever your install has — leave a category out if you don't have that MCP.

- **Team chat — send a message:** `mcp__<your-chat-mcp>__send_message`
- **Team chat — search channels:** `mcp__<your-chat-mcp>__search_channels`
- **Team chat — search users:** `mcp__<your-chat-mcp>__search_users`
- **Team chat — read recent messages in a channel:** `mcp__<your-chat-mcp>__read_channel`
- **Ticket tracker — comment on a ticket:** `mcp__<your-ticket-mcp>__comment` (or equivalent)
- **Ticket tracker — list issues:** `mcp__<your-ticket-mcp>__list_issues`
- **Ticket tracker — list projects:** `mcp__<your-ticket-mcp>__list_projects`
- **Ticket tracker — post a project status update:** `mcp__<your-ticket-mcp>__status_update`
- **Knowledge base — search:** `mcp__<your-kb-mcp>__search`
- **Knowledge base — add a comment:** `mcp__<your-kb-mcp>__create_comment`
- **Knowledge base — edit a page:** `mcp__<your-kb-mcp>__update_page`
```

If the call references a channel, project, or person not in your routing map, Claude looks it up at runtime via the relevant search tool rather than guessing.

## How it works

When `call-transcription-started` fires:

1. Detects which Tuple environment (`prod`, `staging`, `dev`) owns the call by probing each daemon's `state` for a matching call ID, and exports `TUPLE_ENV` so every `tuple` CLI call inside Claude scopes to the right daemon.
2. Copies `system-prompt.md` into the call's artifact directory, then appends your `identity.md` and `context.md` so Claude has personal grounding and the wiring diagram before it starts.
3. Inlines the last 100 lifecycle events and 100 transcript lines into an initial prompt so Claude has context if it joins mid-call.
4. Opens a terminal (Ghostty if installed, otherwise the system `.command` handler) running Claude Code inside the call's artifact directory.

Once running, Claude subscribes to `tuple transcription stream -f --interval=30s` so events and transcript share a single wake source. It maps participants once via `tuple state`, captures the shared screen on `screen_share_started`, and re-captures every ~30s while sharing is active.

If transcription stops and restarts mid-call (e.g. you toggled it off then back on), the trigger sees the live PID file and exits — the existing session's stream subscription picks up the resumed transcript without restarting.

When transcription stops mid-call, Claude produces a checkpoint summary in the terminal and keeps its subscription running. When the call genuinely ends (the daemon returns HTTP 410 for the current call), Claude produces a final summary — key decisions, posts fired, queued posts, dropped threads, unresolved questions — and exits.

## Tuning the behavior

`system-prompt.md` is the file to edit if you want to change Claude's posture. Common adjustments:

- **Tighten or loosen the auto-send confidence threshold.** Default is 95%+ to auto-send, 80–95% to draft for your confirmation, <80% to stay silent.
- **Change the post cap.** Default is 3 auto-sent posts per call.
- **Add or remove privacy gates** — the list under **Privacy gates (HARD STOPS)** is the operational trigger surface.
- **Change the stream interval.** 30s keeps wake rate low at the cost of ~30s lag; drop to `10s` for snappier reactions if your terminal can tolerate the noise.
