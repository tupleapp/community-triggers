module.exports = async function extractChangedTriggers({ github, context }) {
  let baseSha, headSha;

  if (context.eventName === "pull_request") {
    baseSha = context.payload.pull_request?.base?.sha;
    headSha = context.payload.pull_request?.head?.sha;
  } else if (context.eventName === "push") {
    baseSha = context.payload.before;
    headSha = context.payload.after;
  }

  if (!baseSha || !headSha) {
    throw new Error("Missing base or head SHA to compare between");
  }

  const { data } = await github.rest.repos.compareCommitsWithBasehead({
    basehead: `${baseSha}...${headSha}`,
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  return [
    ...new Set(
      data.files
        .map((file) => file.filename)
        .filter((filename) => filename.startsWith("triggers/"))
        .map((filename) => filename.split("/")[1])
    ),
  ];
};
