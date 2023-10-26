const { writeFileSync } = require("fs");

module.exports = async function downloadValidationArtifact({
  github,
  context,
  core,
  runID,
}) {
  const artifacts = await github.rest.actions.listWorkflowRunArtifacts({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: runID,
  });

  const validationArtifact = artifacts.data.artifacts.find(
    (artifact) => artifact.name === "validation-results.json"
  );

  if (!validationArtifact) {
    core.setFailed("No validation artifacts found");
    return;
  }

  const download = await github.rest.actions.downloadArtifact({
    owner: context.repo.owner,
    repo: context.repo.repo,
    artifact_id: validationArtifact.id,
    archive_format: "zip",
  });

  const buffer = Buffer.from(download.data);

  writeFileSync("validation-results.zip", buffer);
};
