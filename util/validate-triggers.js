const extractTriggers = require("./support/extract-triggers");
const validateTrigger = require("./support/validate-trigger");

module.exports = function validateTriggers({ core }) {
  const triggers = extractTriggers();
  const results = triggers.map(validateTrigger);

  const allSucceeded = results.every((r) => r.success);

  if (!allSucceeded) {
    core.setFailed(
      "Some triggers failed validation. Cowardly refusing to proceed."
    );
    console.error(results);
    return;
  }

  console.log("All triggers passed validation");
};
