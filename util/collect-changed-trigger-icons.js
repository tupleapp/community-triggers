const { mkdirSync, copyFileSync } = require("fs");
const extractChangedTriggers = require("./support/extract-changed-triggers.js");
const outputDirectory = `${process.env.RUNNER_TEMP}/icons`;

module.exports = async function collectChangedTriggerIcons({
  github,
  context,
}) {
  mkdirSync(outputDirectory, { recursive: true });

  const changedTriggers = await extractChangedTriggers({
    github,
    context,
  });

  changedTriggers.forEach((trigger) => {
    copyFileSync(
      `triggers/${trigger}/assets/icon.png`,
      `${outputDirectory}/${trigger}.png`
    );
  });
};
