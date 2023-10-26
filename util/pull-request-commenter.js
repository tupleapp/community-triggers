const ejs = require("ejs");
const fs = require("fs");

function renderTemplate(templateName, context) {
  return ejs.render(
    fs.readFileSync(`${__dirname}/templates/${templateName}.ejs`, "utf8"),
    context,
    { rmWhitespace: true }
  );
}

async function upsertComment({ github, context, body, number }) {
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: number,
  });

  const existingComment = comments.find(
    (comment) => comment.user.login == "github-actions[bot]"
  );

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existingComment.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: number,
      body,
    });
  }
}

module.exports = async function pullRequestCommenter({ github, context }) {
  const { number, results } = JSON.parse(
    fs.readFileSync("validation-results.json")
  );

  await upsertComment({
    github,
    context,
    body: renderTemplate("pull-request-comment", {
      context,
      results,
    }),
    number,
  });
};
