const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const validateTrigger = require("../support/validate-trigger");

function withTrigger(files, callback) {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "capture-transition-"),
  );
  const triggerDirectory = path.join(temporaryDirectory, "triggers", "example");

  fs.mkdirSync(path.join(triggerDirectory, "assets"), { recursive: true });
  fs.writeFileSync(path.join(triggerDirectory, "README.md"), "# Example\n");
  fs.writeFileSync(path.join(triggerDirectory, "assets", "icon.png"), "icon");
  fs.writeFileSync(
    path.join(triggerDirectory, "config.json"),
    JSON.stringify({
      name: "Example",
      description: "Example trigger",
      platforms: ["macos"],
      language: "bash",
      category: "Workflow",
    }),
  );

  for (const [name, mode] of Object.entries(files)) {
    const target = path.join(triggerDirectory, name);
    fs.writeFileSync(target, "#!/bin/sh\n");
    fs.chmodSync(target, mode);
  }

  try {
    process.chdir(temporaryDirectory);
    callback();
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

for (const [captureTrigger, transcriptionTrigger] of [
  ["call-capture-started", "call-transcription-started"],
  ["call-capture-complete", "call-transcription-complete"],
]) {
  test(`${captureTrigger} requires its executable compatibility pair`, () => {
    withTrigger({ [captureTrigger]: 0o755 }, () => {
      const result = validateTrigger("example");
      assert.equal(result.success, false);
      assert.match(result.errors[0], new RegExp(transcriptionTrigger));
    });

    withTrigger(
      { [captureTrigger]: 0o755, [transcriptionTrigger]: 0o644 },
      () => {
        const result = validateTrigger("example");
        assert.equal(result.success, false);
        assert.match(result.errors[0], /executable/);
      },
    );

    withTrigger(
      { [captureTrigger]: 0o755, [transcriptionTrigger]: 0o755 },
      () => assert.equal(validateTrigger("example").success, true),
    );
  });
}

test("unrelated lifecycle triggers do not require a transcription pair", () => {
  withTrigger({ "call-ended": 0o755 }, () => {
    assert.equal(validateTrigger("example").success, true);
  });
});
