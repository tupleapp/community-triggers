// Tuple Pi sidecar — the minimal live-call companion extension for Sidekick-Pi.
//
// Loaded automatically from `.pi/extensions/` in the call's working directory, so
// it is active the moment Pi starts — no /reload, no self-authoring.
//
// The trigger launches Pi with `tuple connect --harness pi`, which resolves call
// state and gives Pi a context prompt. This extension does one job well: it owns
// the live transcript feed in the *background* so Pi stays responsive to you, and
// surfaces the watch state on Pi's toolbar.
//
// It reads the call through `tuple transcription show --wait` (the daemon's
// unified record stream), batches new speech on natural pauses, and pushes each
// batch into the main thread with `pi.sendMessage(..., { triggerTurn: true })` —
// which starts a turn when Pi is idle (its normal state between batches) and
// queues behind your own turn when you're talking to it. Connect's prompt tells Pi
// to follow the transcript itself; the extension overrides that on
// `before_agent_start` so the call is never read twice.
//
// The only tool it adds is `set_watch_mode` (realtime / balanced / low_noise) to
// trade responsiveness for quiet.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

type Speaker = { name: string; email: string };
type WatchMode = "realtime" | "balanced" | "low_noise";
type ParsedLine = { line: string; urgent: boolean; sortMs: number };

const CLI = "tuple";
// The name(s) Pi answers to, plus their common Whisper mis-hearings. Add your own
// name and its likely mistranscriptions here so Pi reliably notices when addressed.
const WATCH_WORDS = ["pi", "pie"];
const STREAM_TIMEOUT = "30s"; // each --wait returns empty after this much silence so the loop re-checks
const CATCHUP_MAX_LINES = 300; // cap the "call so far" backlog so a late join doesn't flood Pi's context
const SKIP_EVENT_CATEGORIES = new Set(["user_audio_started", "user_audio_stopped"]);
// `recording_ended` means transcription stopped (it may restart) — worth a Pi
// checkpoint. The call itself ending arrives as the terminal call_ended status line.
const STOP_OR_END_EVENT_CATEGORIES = new Set(["recording_ended"]);
const SCREEN_START = "user_screen_sharing_started";
const SCREEN_STOP = "user_screen_sharing_stopped";

const DEFAULT_WATCH_MODE: WatchMode = "realtime";
// Each mode maps to a `transcription show --interval` value (none = flush on every
// pause). --watch-words still flushes early when the name is spoken.
const MODE_INTERVAL: Record<WatchMode, string | null> = { realtime: null, balanced: "12s", low_noise: "20s" };
const MODE_DESC: Record<WatchMode, string> = {
  realtime: "flush on every pause — most responsive, for pair programming or troubleshooting",
  balanced: "batch up to ~12s — for normal meetings and onboarding",
  low_noise: "batch up to ~20s — for presentations or long monologues",
};

// Build the `transcription show --wait` args for a watch mode. `show` streams the
// active call's unified record feed; --with-events adds the lifecycle records
// (joins, screen share, recording end) the companion needs alongside transcripts,
// and --format json makes it NDJSON (show defaults to human-readable text).
// The non-obvious rule: the CLI rejects --watch-words without --interval, and
// realtime (no interval) flushes on every pause anyway — so watch words ride along
// only when an interval is set.
function buildStreamArgs(watchWords: string[], watchMode: WatchMode, cursor: string): string[] {
  const args = ["transcription", "show", "--wait", "--cursor", cursor, "--timeout", STREAM_TIMEOUT, "--with-events", "--format", "json"];
  const interval = MODE_INTERVAL[watchMode];
  if (interval) {
    args.push("--interval", interval);
    if (watchWords.length) args.push("--watch-words", watchWords.join(","));
  }
  return args;
}

// Override appended to connect's system prompt so Pi does not also run the
// transcript loop connect tells it to. The extension is the sole feeder.
const FEED_OVERRIDE = `

## Live transcript delivery (overrides "Following the live transcript")

A sidecar extension is following this call and delivering new speech to you automatically as messages that begin "New on the call:". Do **not** run \`tuple transcription show\`, \`--wait\`, or any other transcript loop yourself — you would read the call twice. Your catch-up arrives once as a "The call so far" message; after that, respond to each "New on the call:" batch exactly as your instructions describe (a one-line \`·\` summary, escalating to \`👋\` when it matters). Everything else in your instructions still applies, including writing an outline when recording stops or the call ends.

You also have a \`set_watch_mode\` tool to trade responsiveness for quiet as the call's shape changes.`;

// Run a `tuple` subcommand. Returns stdout; callers degrade gracefully (try/catch)
// when the CLI or daemon is unavailable.
async function tuple(args: string[], timeoutMs = 45_000): Promise<string> {
  const { stdout } = await execFileP(CLI, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

function timestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value * 1000;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Number.POSITIVE_INFINITY;
}

function hms(value: unknown): string {
  const ts = timestampMs(value);
  return Number.isFinite(ts) ? new Date(ts).toISOString().slice(11, 19) : "--:--:--";
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whisper mishears the short name "Pi" ("pie", "py", …), so wake detection runs
// over a configurable set of homophones. A homophone only counts when it's clearly
// an address — `hey <word>` or `<word>` followed by a request/question cue — and
// common false friends ("pie chart", "easy as pie") are excluded. The literal name
// "pi" additionally counts in bare vocative position ("pi, …").
function buildIsWake(words: string[]): (text: string) => boolean {
  const alt = (words.length ? words : WATCH_WORDS).map(escapeRe).join("|");
  const cues = "can|could|would|will|should|please|are|is|do|does|did|have|what|why|how|when|where|who|tell|give|show|help|explain|check|look|see|here|you";
  const negative = /\b(value of pi|slice of pie|pie chart|pi day|apple pie|pumpkin pie|easy as pie|cutie pie|pie in the sky)\b/i;
  const hey = new RegExp(`\\bhey\\s+(?:${alt})\\b`, "i");
  const cue = new RegExp(`\\b(?:${alt})\\s*[,:]?\\s+(?:${cues})\\b`, "i");
  return (text: string): boolean => {
    if (negative.test(text)) return false;
    if (/\bpi\s*[,:]/i.test(text)) return true;
    return hey.test(text) || cue.test(text);
  };
}

function userIdKey(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return "";
}

function pickString(...values: unknown[]): string {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function displayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const u = user as { full_name?: unknown; short_name?: unknown; email?: unknown };
  return pickString(u.full_name, u.short_name, u.email);
}

export default function (pi: ExtensionAPI) {
  const isWake = buildIsWake(WATCH_WORDS);
  const speakers: Record<string, Speaker> = {};
  let watchMode: WatchMode = DEFAULT_WATCH_MODE;
  let stopped = false;
  let ended = false;
  let batchCount = 0;
  let screenSharing = false;

  function setStatus(ctx: any) {
    try {
      if (ctx?.hasUI) {
        const screen = screenSharing ? " • screen shared" : "";
        ctx.ui.setStatus("sidekick", `Pi watch: ${watchMode} • ${batchCount} batch${batchCount === 1 ? "" : "es"}${screen}`);
      }
    } catch {
      // status is best-effort
    }
  }

  function resolveSpeaker(userId: unknown): string {
    const id = userIdKey(userId);
    return speakers[id]?.name || id || "unknown";
  }

  // Interpret one record from the unified recording stream into a display line.
  // Each line is `{ type, time, data }` — `type` is either a call-event category
  // (user_joined, recording_ended, …) or a transcription marker
  // (transcription_started/finished/dropped); only transcription_finished carries
  // text. The terminal call-end line keeps the legacy `{ kind: "status", status:
  // "call_ended" }` shape. This also updates session state as a side effect: it
  // learns speaker names, tracks screen-share state, and flips `ended` on call end.
  function readEnvelope(raw: string): ParsedLine | null {
    let rec: any;
    try {
      rec = JSON.parse(raw);
    } catch {
      return null;
    }
    if (String(rec?.kind ?? "") === "status") {
      if (String(rec.status ?? "") === "call_ended") {
        ended = true;
        return { line: "- event: call_ended", urgent: true, sortMs: Number.MAX_SAFE_INTEGER };
      }
      return null;
    }
    const type = String(rec?.type ?? "");
    if (!type) return null;
    const data = rec.data ?? {};

    // Spoken text lands in transcription_finished; started/dropped carry no text.
    if (type === "transcription_finished") {
      const text = String(data.text ?? "");
      if (!text.trim()) return null;
      const when = data.start || rec.time;
      return { line: `- ${hms(when)} ${resolveSpeaker(data.user_id)}: ${text}`, urgent: isWake(text), sortMs: timestampMs(when) };
    }
    if (type === "transcription_started" || type === "transcription_dropped") return null;

    // Otherwise the record is a call-event category; `type` is the category.
    if (type === SCREEN_START) screenSharing = true;
    if (type === SCREEN_STOP) screenSharing = false;
    if (data.user) {
      const id = userIdKey(data.user);
      const name = displayName(data.user);
      const email = pickString((data.user as any).email);
      if (id && (name || email)) speakers[id] = { name: name || speakers[id]?.name || "", email: email || speakers[id]?.email || "" };
    }
    if (SKIP_EVENT_CATEGORIES.has(type)) return null;
    return {
      line: `- ${hms(rec.time)} event: ${type}${data.message ? ` (${data.message})` : ""}`,
      urgent: STOP_OR_END_EVENT_CATEGORIES.has(type),
      sortMs: timestampMs(rec.time),
    };
  }

  function parseBatch(out: string): { lines: string[]; urgent: boolean } {
    const records: ParsedLine[] = [];
    for (const raw of out.split("\n")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const rec = readEnvelope(trimmed);
      if (rec) records.push(rec);
    }
    // Records without a parseable timestamp (sortMs === Infinity) sort to the end
    // deterministically — never produce NaN in the comparator.
    const key = (r: ParsedLine) => (Number.isFinite(r.sortMs) ? r.sortMs : Number.MAX_SAFE_INTEGER);
    records.sort((a, b) => key(a) - key(b));
    return { lines: records.map((r) => r.line), urgent: records.some((r) => r.urgent) };
  }

  // Push a batch into the main thread. Plain triggerTurn starts a turn when Pi is
  // idle (its normal state between batches) and queues behind the user's own turn
  // when busy.
  function deliver(content: string) {
    pi.sendMessage({ customType: "tuple-call-sidekick", content, display: false }, { triggerTurn: true });
  }

  // The feed: loop `transcription show --wait` with a fresh per-process cursor.
  // The first run returns the full catch-up; later runs return only new speech
  // (the cursor guarantees no gaps and no repeats).
  async function followLoop(ctx: any) {
    const cursor = `sidecar-${Date.now()}`;
    let first = true;
    let consecutiveErrors = 0;
    while (!stopped && !ended) {
      let out = "";
      try {
        out = await tuple(buildStreamArgs(WATCH_WORDS, watchMode, cursor), 45_000);
        consecutiveErrors = 0;
      } catch (err: any) {
        if (stopped || ended) break;
        // Surface the failure once (instead of dying silently), then keep retrying
        // on a longer cooldown — a transient outage shouldn't end the feed for good.
        if (++consecutiveErrors === 6) {
          const detail = String(err?.stderr || err?.message || err).trim().slice(0, 300);
          deliver(`⚠️ The live transcript feed errored — I can't read the call right now, but I'll keep retrying. Last error:\n\n${detail}\n\nYou can still talk to me directly.`);
        }
        await new Promise((r) => setTimeout(r, consecutiveErrors >= 6 ? 10_000 : 2000));
        continue;
      }
      if (!out.trim()) continue; // silence window elapsed; re-check

      const { lines, urgent } = parseBatch(out);
      if (lines.length) {
        batchCount += 1;
        setStatus(ctx);
        if (first) {
          first = false;
          const recent = lines.length > CATCHUP_MAX_LINES ? lines.slice(-CATCHUP_MAX_LINES) : lines;
          const omitted = lines.length - recent.length;
          const preface = omitted > 0 ? `(${omitted} earlier lines omitted — this is the recent tail)\n\n` : "";
          deliver(`The call so far, for context — do not comment on it retroactively:\n\n${preface}${recent.join("\n")}`);
        } else {
          const tail = urgent
            ? "This includes a line addressed to you or a recording stop / call-end — respond per your instructions."
            : "Leave a one-line `·` summary of what they just covered; escalate to `👋` only if something matters.";
          deliver(`New on the call:\n\n${lines.join("\n")}\n\n${tail}`);
        }
      }
      if (ended) break;
    }
  }

  pi.registerTool({
    name: "set_watch_mode",
    label: "Set Watch Mode",
    description: "Adjust how aggressively the live-call companion batches transcript before sending it to you.",
    promptSnippet: "Set the live-call watch pace to realtime, balanced, or low_noise.",
    promptGuidelines: [
      "Use set_watch_mode when the call's shape changes enough to warrant a faster or less chatty pace (e.g. a long presentation → low_noise); don't call it every batch.",
    ],
    parameters: Type.Object({
      mode: StringEnum(["realtime", "balanced", "low_noise"] as const, { description: "How quickly to deliver future transcript batches" }),
      reason: Type.Optional(Type.String({ description: "Why this pace fits the current call" })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const mode = String(params?.mode ?? "").trim().toLowerCase().replace(/-/g, "_") as WatchMode;
      if (!(mode in MODE_INTERVAL)) throw new Error("mode must be one of: realtime, balanced, low_noise");
      watchMode = mode; // the next --wait iteration picks up the new --interval
      setStatus(ctx);
      const reason = typeof params?.reason === "string" && params.reason.trim() ? ` Reason: ${params.reason.trim()}` : "";
      return { content: [{ type: "text", text: `Watch mode set to ${mode} (${MODE_DESC[mode]}); applies from the next batch.${reason}` }] };
    },
  });

  pi.on("session_start", async (_event: any, ctx: any) => {
    try {
      if (ctx?.hasUI) ctx.ui.notify("Tuple Pi companion loaded — following the call in the background.", "info");
    } catch {
      // notify is best-effort
    }
    setStatus(ctx);
    followLoop(ctx).catch(() => {});
  });

  // First turn: override connect's "follow the transcript yourself" instruction.
  // Re-applied every turn so it stays in effect.
  pi.on("before_agent_start", async (event: any) => {
    return { systemPrompt: `${event?.systemPrompt ?? ""}${FEED_OVERRIDE}` };
  });

  pi.on("session_shutdown", async () => {
    stopped = true;
  });
}
