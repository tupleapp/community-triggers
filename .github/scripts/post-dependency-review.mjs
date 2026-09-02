import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const marker = "<!-- claude-dependabot-review -->";

export function parseStructuredOutput(value) {
  let review;
  try {
    review = JSON.parse(value);
  } catch {
    throw new Error("The dependency review was not valid JSON.");
  }

  if (
    review === null ||
    typeof review !== "object" ||
    Array.isArray(review) ||
    review.event !== "COMMENT" ||
    !Array.isArray(review.comments) ||
    review.comments.length !== 0 ||
    typeof review.summary !== "string" ||
    review.summary.trim().length === 0
  ) {
    throw new Error("The dependency review did not match the required output contract.");
  }

  return review;
}

export function buildCommentBody(review) {
  const body = `${marker}\n${review.summary}`;
  if (body.length > 65_000) {
    throw new Error("The dependency review is too large to post safely.");
  }
  return body;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function main() {
  const repository = requiredEnvironment("GITHUB_REPOSITORY");
  const pullRequest = requiredEnvironment("PR_NUMBER");
  const structuredOutput = requiredEnvironment("STRUCTURED_OUTPUT");

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY has an invalid value.");
  }
  if (!/^[1-9][0-9]*$/.test(pullRequest)) {
    throw new Error("PR_NUMBER has an invalid value.");
  }

  const body = buildCommentBody(parseStructuredOutput(structuredOutput));
  execFileSync(
    "gh",
    [
      "api",
      "--method",
      "POST",
      `repos/${repository}/issues/${pullRequest}/comments`,
      "-f",
      `body=${body}`,
    ],
    { stdio: "inherit" },
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
