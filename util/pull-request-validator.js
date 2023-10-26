const { writeFileSync } = require("fs");
const validateTrigger = require("./support/validate-trigger");
const extractChangedTriggers = require("./support/extract-changed-triggers");

module.exports = async function validatePullRequest({ github, context, core }) {
  const changedTriggers = await extractChangedTriggers({ github, context });

  if (changedTriggers.length === 0) {
    core.warning("No triggers changed, nothing to do");
    return;
  }

  const validationResults = changedTriggers.map((trigger) => ({
    trigger,
    ...validateTrigger(trigger),
  }));

  const output = JSON.stringify(
    { number: context.issue.number, results: validationResults },
    null,
    2
  );

  writeFileSync("validation-results.json", output, "utf-8");

  const allSucceeded = validationResults.every((r) => r.success);

  if (!allSucceeded) {
    core.setFailed(
      "Some triggers failed validation. Please see the comment left on your PR for more details."
    );
    console.error(validationResults);
  }
};
