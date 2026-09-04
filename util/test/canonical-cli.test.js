const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const triggersRoot = path.join(root, "triggers");

const recordingScopedCompletedTriggers = [
  "call-summary-claude-cowork",
  "call-summary-claude",
  "call-summary-codex",
  "call-summary-copilot",
  "call-summary-cursor",
  "call-summary-opencode",
  "call-summary-pi",
  "call-summary-qmd",
  "slack-call-summary-claude",
  "slack-call-summary-codex",
];

const transcriptOnlyTextCompletedTriggers = [
  "call-summary-claude-cowork",
  "call-summary-claude",
  "call-summary-codex",
  "call-summary-copilot",
  "call-summary-cursor",
  "call-summary-opencode",
  "call-summary-pi",
];

const structuredCompletedTriggers = [
  "call-summary-qmd",
  "slack-call-summary-claude",
  "slack-call-summary-codex",
];

const connectStartedTriggers = [
  "coach-drama-triangle-claude",
  "coach-pairing-claude",
  "sidekick-claude",
  "sidekick-codex",
  "sidekick-copilot",
  "sidekick-cursor",
  "sidekick-opencode",
  "sidekick-pi",
];

const legacyCompatibilityBasenames = new Set([
  "call-transcription-started",
  "call-transcription-complete",
  "export-summaries-transcription",
  "tuple-call-sidekick-transcription.ts",
]);

const legacyCompletedTriggerDryRuns = [
  ["call-summary-claude-cowork", "CALL_SUMMARY_COWORK_DRY_RUN"],
  ["call-summary-claude", "CALL_SUMMARY_CLAUDE_DRY_RUN"],
  ["call-summary-codex", "CALL_SUMMARY_CODEX_DRY_RUN"],
  ["call-summary-copilot", "CALL_SUMMARY_COPILOT_DRY_RUN"],
  ["call-summary-cursor", "CALL_SUMMARY_CURSOR_DRY_RUN"],
  ["call-summary-opencode", "CALL_SUMMARY_OPENCODE_DRY_RUN"],
  ["call-summary-pi", "CALL_SUMMARY_PI_DRY_RUN"],
  ["call-summary-qmd", "CALL_SUMMARY_QMD_DRY_RUN"],
  ["slack-call-summary-claude", "SLACK_CALL_SUMMARY_CLAUDE_DRY_RUN"],
  ["slack-call-summary-codex", "SLACK_CALL_SUMMARY_CODEX_DRY_RUN"],
];

function textFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "assets" ? [] : textFiles(target);
    }
    return entry.name === ".DS_Store" ? [] : [target];
  });
}

function renderLegacyPrompt(triggerName, dryRunVariable, callArgument, environmentCallId) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "legacy-call-scope-"),
  );
  const script = path.join(
    triggersRoot,
    triggerName,
    "call-transcription-complete",
  );
  const args = callArgument ? [callArgument] : [];
  const env = {
    ...process.env,
    TMPDIR: temporaryDirectory,
    [dryRunVariable]: "1",
  };
  if (environmentCallId) {
    env.TUPLE_TRIGGER_CALL_ID = environmentCallId;
  } else {
    delete env.TUPLE_TRIGGER_CALL_ID;
  }

  try {
    const result = spawnSync(script, args, {
      cwd: root,
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${triggerName}: ${result.stderr}`);

    if (triggerName === "call-summary-claude-cowork") {
      const match = result.stdout.match(/claude:\/\/cowork\/new\?q=(\S+)/);
      assert.ok(match, `${triggerName}: missing dry-run deep link`);
      return decodeURIComponent(match[1]);
    }

    const prompts = textFiles(temporaryDirectory).filter((file) =>
      file.endsWith("-prompt.md"),
    );
    assert.equal(prompts.length, 1, `${triggerName}: expected one prompt`);
    return fs.readFileSync(prompts[0], "utf8");
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function triggerNamesWithEvent(eventName) {
  return fs.readdirSync(triggersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(triggersRoot, name, eventName)))
    .sort();
}

test("published triggers contain no retired Tuple CLI examples", () => {
  const retired = [
    /\btuple transcription\b/i,
    /\btuple call current\b/i,
    /--with-events\b/,
    /Tuple transcription/i,
    /call transcription/i,
    /Transcription settings/i,
  ];

  for (const file of textFiles(triggersRoot)) {
    if (legacyCompatibilityBasenames.has(path.basename(file))) continue;
    const contents = fs.readFileSync(file, "utf8");
    for (const pattern of retired) {
      assert.doesNotMatch(contents, pattern, path.relative(root, file));
    }
  }
});

test("legacy compatibility helpers retain the transcription CLI", () => {
  const qmdTrigger = fs.readFileSync(
    path.join(triggersRoot, "call-summary-qmd", "call-transcription-complete"),
    "utf8",
  );
  assert.match(qmdTrigger, /export-summaries-transcription/);

  const qmdExporter = fs.readFileSync(
    path.join(triggersRoot, "call-summary-qmd", "export-summaries-transcription"),
    "utf8",
  );
  assert.match(qmdExporter, /\[TUPLE, "transcription", "list"/);

  const piTrigger = fs.readFileSync(
    path.join(triggersRoot, "sidekick-pi", "call-transcription-started"),
    "utf8",
  );
  assert.match(piTrigger, /tuple-call-sidekick-transcription\.ts/);

  const piExtension = fs.readFileSync(
    path.join(triggersRoot, "sidekick-pi", "tuple-call-sidekick-transcription.ts"),
    "utf8",
  );
  assert.match(piExtension, /\["transcription", "show", "--wait"/);
});

test("legacy completed triggers preserve the triggering call id", () => {
  assert.deepEqual(
    triggerNamesWithEvent("call-transcription-complete"),
    [...recordingScopedCompletedTriggers].sort(),
  );

  for (const [triggerName, dryRunVariable] of legacyCompletedTriggerDryRuns) {
    const positionalId = "11111111-1111-1111-1111-111111111111";
    const environmentId = "22222222-2222-2222-2222-222222222222";
    const positionalPrompt = renderLegacyPrompt(
      triggerName,
      dryRunVariable,
      positionalId,
      environmentId,
    );
    assert.match(positionalPrompt, new RegExp(positionalId), triggerName);
    assert.doesNotMatch(positionalPrompt, new RegExp(environmentId), triggerName);

    const environmentPrompt = renderLegacyPrompt(
      triggerName,
      dryRunVariable,
      "",
      environmentId,
    );
    assert.match(environmentPrompt, new RegExp(environmentId), triggerName);

    const fallbackPrompt = renderLegacyPrompt(
      triggerName,
      dryRunVariable,
      "",
      "",
    );
    assert.match(
      fallbackPrompt,
      /tuple call current|tuple transcription list/,
      triggerName,
    );
    assert.doesNotMatch(fallbackPrompt, /## Triggering call\n/, triggerName);
  }
});

test("completed Capture consumers retain recording scope", () => {
  assert.deepEqual(
    triggerNamesWithEvent("call-capture-complete"),
    [...recordingScopedCompletedTriggers].sort(),
  );
  assert.deepEqual(
    [...transcriptOnlyTextCompletedTriggers, ...structuredCompletedTriggers].sort(),
    [...recordingScopedCompletedTriggers].sort(),
  );

  for (const triggerName of recordingScopedCompletedTriggers) {
    const trigger = path.join(triggersRoot, triggerName, "call-capture-complete");
    const contents = fs.readFileSync(trigger, "utf8");

    assert.match(contents, /TUPLE_TRIGGER_RECORDING_ID/, triggerName);
    assert.match(
      contents,
      /tuple capture show --recording (?:"\$TUPLE_TRIGGER_RECORDING_ID"|<recording-id-above>)/,
      triggerName,
    );
  }

  for (const triggerName of transcriptOnlyTextCompletedTriggers) {
    const contents = fs.readFileSync(
      path.join(triggersRoot, triggerName, "call-capture-complete"),
      "utf8",
    );
    assert.match(
      contents,
      /tuple capture show --recording (?:(?:"\$TUPLE_TRIGGER_RECORDING_ID")|(?:<recording-id-above>)) --exclude events,content/,
      triggerName,
    );
  }

  for (const triggerName of structuredCompletedTriggers) {
    const contents = fs.readFileSync(
      path.join(triggersRoot, triggerName, "call-capture-complete"),
      "utf8",
    );
    assert.match(
      contents,
      /tuple capture show --recording "\$TUPLE_TRIGGER_RECORDING_ID" --exclude content --format json/,
      triggerName,
    );
    assert.match(contents, /JSON error from stderr/i, triggerName);
  }
});

test("live connect launchers preserve trigger context", () => {
  assert.deepEqual(
    triggerNamesWithEvent("call-capture-started"),
    [...connectStartedTriggers].sort(),
  );

  for (const triggerName of connectStartedTriggers) {
    const trigger = fs.readFileSync(
      path.join(triggersRoot, triggerName, "call-capture-started"),
      "utf8",
    );

    assert.match(trigger, /TUPLE_TRIGGER_CALL_ID/, triggerName);
    assert.match(trigger, /TUPLE_TRIGGER_RECORDING_ID/, triggerName);
    assert.match(trigger, /trigger-context\.sh/, triggerName);
    assert.match(trigger, /source .*trigger-context\.sh/, triggerName);
    assert.match(trigger, /tuple connect --harness/, triggerName);
  }
});

test("structured Capture reads request JSON explicitly", () => {
  const qmdTrigger = fs.readFileSync(
    path.join(triggersRoot, "call-summary-qmd", "call-capture-complete"),
    "utf8",
  );
  assert.match(
    qmdTrigger,
    /tuple call show "\$TUPLE_TRIGGER_CALL_ID" --format json/,
  );
  const qmd = fs.readFileSync(
    path.join(triggersRoot, "call-summary-qmd", "export-summaries"),
    "utf8",
  );
  assert.match(
    qmd,
    /\[TUPLE, "capture", "list", "--format", "json"/,
  );
  assert.match(qmd, /structured_error\(proc\.stderr\)/);

  const sidekick = fs.readFileSync(
    path.join(triggersRoot, "sidekick-pi", "tuple-call-sidekick.ts"),
    "utf8",
  );
  assert.match(
    sidekick,
    /\["capture", "next", "--recording", RECORDING_ID,[^\n]+"--exclude", "content", "--format", "json"\]/,
  );
  assert.match(sidekick, /if \(cursor\) args\.push\("--cursor", cursor\)/);
  assert.match(sidekick, /Number\.isSafeInteger\(rec\?\.id\)/);
  assert.match(sidekick, /if \(batch\.cursor\) cursor = batch\.cursor/);
  assert.doesNotMatch(sidekick, /sidecar-\$\{Date\.now\(\)\}/);
  assert.match(sidekick, /if \(type === RECORDING_END\) ended = true/);
  assert.match(sidekick, /MODE_INTERVAL_MS\[watchMode\].*STREAM_TIMEOUT_MS \+ 15_000/);
  assert.match(sidekick, /streamExecMs\(watchMode\)/);
  assert.match(sidekick, /const isInitialBatch = first/);
  assert.match(sidekick, /if \(isInitialBatch && !ended\)/);
  assert.match(sidekick, /err\?\.stderr/);
});

test("release notes retain the compatibility removal gate", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");

  assert.match(readme, /temporarily ship two event\s+executables/);
  assert.match(readme, /remove the legacy files and frozen helpers.*rolled out/s);
  assert.match(changelog, /Remove the compatibility files only after/);
  assert.match(changelog, /installed lifecycle events pass a smoke test/);
});
