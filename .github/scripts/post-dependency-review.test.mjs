import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommentBody,
  parseStructuredOutput,
} from "./post-dependency-review.mjs";

test("accepts the required review contract", () => {
  const review = parseStructuredOutput(
    JSON.stringify({ event: "COMMENT", summary: "Safe to merge", comments: [] }),
  );

  assert.equal(review.summary, "Safe to merge");
  assert.equal(
    buildCommentBody(review),
    "<!-- claude-dependabot-review -->\nSafe to merge",
  );
});

test("rejects missing, blank, or malformed summaries", () => {
  assert.throws(() => parseStructuredOutput("not JSON"), /valid JSON/);
  assert.throws(
    () => parseStructuredOutput(JSON.stringify({ event: "COMMENT", comments: [] })),
    /output contract/,
  );
  assert.throws(
    () =>
      parseStructuredOutput(
        JSON.stringify({ event: "COMMENT", summary: "  \n", comments: [] }),
      ),
    /output contract/,
  );
});

test("rejects unsupported events and inline comments", () => {
  assert.throws(
    () =>
      parseStructuredOutput(
        JSON.stringify({ event: "APPROVE", summary: "Looks good", comments: [] }),
      ),
    /output contract/,
  );
  assert.throws(
    () =>
      parseStructuredOutput(
        JSON.stringify({
          event: "COMMENT",
          summary: "Review",
          comments: [{ body: "unexpected" }],
        }),
      ),
    /output contract/,
  );
});
