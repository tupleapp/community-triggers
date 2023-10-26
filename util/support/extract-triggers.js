const { readdirSync } = require("fs");

module.exports = function extractTriggers() {
  return readdirSync("triggers", { withFileTypes: true })
    .filter((f) => f.isDirectory())
    .map((f) => f.name);
};
