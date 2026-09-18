const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const triggersRoot = path.join(root, "triggers");

const recordingScopedCompletedTriggers = [
  "call-summary-chatgpt-desktop",
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
  "call-summary-chatgpt-desktop",
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

const promptStartedTriggers = [
  "sidekick-chatgpt-desktop",
  "sidekick-claude-desktop",
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
    assert.doesNotMatch(
      path.basename(file),
      /^call-transcription-(started|complete)$/,
      path.relative(root, file),
    );
    const contents = fs.readFileSync(file, "utf8");
    for (const pattern of retired) {
      assert.doesNotMatch(contents, pattern, path.relative(root, file));
    }
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
      /(?:tuple|%s) capture show --recording (?:"\$TUPLE_TRIGGER_RECORDING_ID"|<recording-id-above>)/,
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
      /(?:tuple|%s) capture show --recording (?:(?:"\$TUPLE_TRIGGER_RECORDING_ID")|(?:<recording-id-above>)) --exclude events,content/,
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
    [...connectStartedTriggers, ...promptStartedTriggers].sort(),
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

test("desktop sidekicks open a live prompt for the triggering call", (t) => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "tuple-trigger-test-"));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));

  const tuple = path.join(bin, "custom-tuple");
  fs.writeFileSync(
    tuple,
    `#!/bin/sh
printf '%s\n' "$*" > "$TUPLE_TEST_ARGS"
printf "live prompt for %s" "$4"
`,
  );
  fs.chmodSync(tuple, 0o755);

  const cases = [
    {
      name: "sidekick-claude-desktop",
      dryRun: "SIDEKICK_CLAUDE_DESKTOP_DRY_RUN",
      outputPrefix: "sidekick-claude-desktop: dry run — would open ",
      protocol: "claude:",
      host: "code",
      directoryParameter: "folder",
    },
    {
      name: "sidekick-chatgpt-desktop",
      dryRun: "SIDEKICK_CHATGPT_DESKTOP_DRY_RUN",
      outputPrefix: "sidekick-chatgpt-desktop: dry run — would open ",
      protocol: "codex:",
      host: "threads",
      directoryParameter: "path",
    },
  ];

  for (const item of cases) {
    const argsFile = path.join(bin, `${item.name}-args`);
    const result = spawnSync(
      path.join(triggersRoot, item.name, "call-capture-started"),
      [],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
          TUPLE_BIN: tuple,
          TUPLE_TEST_ARGS: argsFile,
          TUPLE_DESKTOP_WORKSPACE_ROOT: bin,
          TUPLE_TRIGGER_CALL_ID: "call/ü",
          TUPLE_TRIGGER_RECORDING_ID: "recording-id",
          [item.dryRun]: "1",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      fs.readFileSync(argsFile, "utf8"),
      "connect prompt --call call/ü\n",
    );
    assert.ok(result.stdout.startsWith(item.outputPrefix));

    const url = new URL(result.stdout.slice(item.outputPrefix.length).trim());
    assert.equal(url.protocol, item.protocol);
    assert.equal(url.host, item.host);
    assert.equal(url.pathname, "/new");
    assert.equal(url.searchParams.get("prompt"), "live prompt for call/ü");

    const workingDirectory = url.searchParams.get(item.directoryParameter);
    assert.equal(workingDirectory, bin);
    assert.equal(fs.statSync(workingDirectory).isDirectory(), true);

    if (item.name === "sidekick-chatgpt-desktop") {
      assert.equal(url.searchParams.get("mode"), "work");
    }
  }
});

test("desktop summaries open a local prompt for the triggering recording", (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "tuple-summary-trigger-test-"),
  );
  t.after(() =>
    fs.rmSync(temporaryDirectory, { recursive: true, force: true }),
  );

  const cases = [
    {
      name: "call-summary-claude-cowork",
      dryRun: "CALL_SUMMARY_COWORK_DRY_RUN",
      outputPrefix: "call-summary-claude-cowork: dry run — would open ",
      protocol: "claude:",
      host: "code",
      directoryParameter: "folder",
    },
    {
      name: "call-summary-chatgpt-desktop",
      dryRun: "CALL_SUMMARY_CHATGPT_DESKTOP_DRY_RUN",
      outputPrefix:
        "call-summary-chatgpt-desktop: dry run — would open ",
      protocol: "codex:",
      host: "threads",
      directoryParameter: "path",
    },
  ];

  for (const item of cases) {
    const result = spawnSync(
      path.join(triggersRoot, item.name, "call-capture-complete"),
      [],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          HOME: temporaryDirectory,
          TUPLE_BIN: "/custom/tuple-bin",
          TUPLE_DESKTOP_WORKSPACE_ROOT: "",
          TUPLE_TRIGGER_CALL_ID: "call/ü",
          TUPLE_TRIGGER_RECORDING_ID: "recording-id",
          [item.dryRun]: "1",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.ok(result.stdout.startsWith(item.outputPrefix));

    const url = new URL(result.stdout.slice(item.outputPrefix.length).trim());
    assert.equal(url.protocol, item.protocol);
    assert.equal(url.host, item.host);
    assert.equal(url.pathname, "/new");
    assert.match(url.searchParams.get("prompt"), /Call ID: `call\/ü`/);
    assert.match(
      url.searchParams.get("prompt"),
      /Recording ID: `recording-id`/,
    );
    assert.match(
      url.searchParams.get("prompt"),
      /\/custom\/tuple-bin capture show --recording <recording-id-above>/,
    );
    assert.match(
      url.searchParams.get("prompt"),
      /\/custom\/tuple-bin call edit <call-id-above>/,
    );

    const workingDirectory = url.searchParams.get(item.directoryParameter);
    assert.equal(
      workingDirectory,
      path.join(temporaryDirectory, ".tuple", "tuple-calls"),
    );
    assert.equal(fs.statSync(workingDirectory).isDirectory(), true);

    if (item.name === "call-summary-chatgpt-desktop") {
      assert.equal(url.searchParams.get("mode"), "work");
    }
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
