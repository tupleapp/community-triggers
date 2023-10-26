const childProcess = require("child_process");
const { mkdirSync } = require("fs");
const { promisify } = require("util");
const extractChangedTriggers = require("./support/extract-changed-triggers.js");

const exec = promisify(childProcess.exec);
const outputDirectory = `${process.env.RUNNER_TEMP}/archives`;

async function archiveTrigger(trigger) {
  const inputPath = `triggers/${trigger}`;
  const outputPath = `${outputDirectory}/${trigger}.zip`;

  console.log(`Archiving ${inputPath} to ${outputPath}`);

  return exec(`cd ${inputPath} && zip -r ${outputPath} .`);
}

module.exports = async function archiveChangedTriggers({ github, context }) {
  const changedTriggers = await extractChangedTriggers({
    github,
    context,
  });

  mkdirSync(outputDirectory, { recursive: true });

  return Promise.all(changedTriggers.map(archiveTrigger));
};
