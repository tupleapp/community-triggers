const { readdirSync } = require("fs");
const { readFile } = require("fs/promises");
const crypto = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { AVAILABLE_TRIGGERS } = require("./support/config");
const extractChangedTriggers = require("./support/extract-changed-triggers");

const dynamoDBClient = new DynamoDBClient();
const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);

function getTriggerFiles(trigger, prefix = "") {
  const files = readdirSync(`triggers/${trigger}${prefix}`, {
    withFileTypes: true,
  });

  return files.flatMap((e) =>
    e.isDirectory()
      ? getTriggerFiles(trigger, `${prefix}/${e.name}`)
      : `${prefix}/${e.name}`
  );
}

async function getArchiveChecksum(trigger) {
  const contents = await readFile(
    `${process.env.RUNNER_TEMP}/archives/${trigger}.zip`
  );

  return crypto.createHash("sha1").update(contents).digest("hex");
}

async function getTriggerFileChecksums(trigger) {
  const files = getTriggerFiles(trigger);
  const checksums = await Promise.all(
    files.map(async (file) => {
      const contents = await readFile(`triggers/${trigger}${file}`);

      return {
        file: file.replace(/^\//, ""),
        checksum: crypto.createHash("sha1").update(contents).digest("hex"),
      };
    })
  );

  return checksums.reduce((acc, { file, checksum }) => {
    return { ...acc, [file]: checksum };
  }, {});
}

async function getTriggerContributors(trigger, { github, context }) {
  const commits = await github.paginate(github.rest.repos.listCommits, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: `triggers/${trigger}`,
  });

  const usernames = [...new Set(commits.map((commit) => commit.author.login))];

  return Promise.all(
    usernames.map(async (username) => {
      const { data } = await github.rest.users.getByUsername({ username });

      return {
        gitHubUserID: data.id.toString(),
        gitHubUsername: data.login,
        gitHubAvatarURL: data.avatar_url,
        twitterUsername: data.twitter_username,
        name: data.name,
      };
    })
  );
}

module.exports = async function uploadMetadata({
  github,
  context,
  metadataDynamoDBTableName,
  contributorsDynamoDBTableName,
}) {
  let updatedContributors = new Set();

  const triggers = await extractChangedTriggers({ github, context });
  const metadataItems = await Promise.all(
    triggers.map(async (id) => {
      const configContents = await readFile(
        `triggers/${id}/config.json`,
        "utf-8"
      );
      const { name, description, platforms, language } =
        JSON.parse(configContents);
      const readme = await readFile(`triggers/${id}/README.md`, "utf-8");
      const files = await getTriggerFileChecksums(id);
      const executables = AVAILABLE_TRIGGERS.filter((h) => files[h]);
      const contributors = await getTriggerContributors(id, {
        github,
        context,
      });
      const archiveChecksum = await getArchiveChecksum(id);

      contributors.forEach((contributor) =>
        updatedContributors.add(contributor)
      );

      return {
        id,
        name,
        description,
        platforms: new Set(platforms),
        contributorGitHubUserIDs: new Set(
          contributors.map((c) => c.gitHubUserID)
        ),
        language,
        readme,
        executables: new Set(executables),
        files,
        archiveChecksum,
      };
    })
  );

  const metadataCommands = metadataItems.map(
    (item) =>
      new PutCommand({
        TableName: metadataDynamoDBTableName,
        Item: item,
      })
  );

  const contributorCommands = [...updatedContributors].map(
    (contributor) =>
      new PutCommand({
        TableName: contributorsDynamoDBTableName,
        Item: contributor,
      })
  );

  await Promise.all(
    [...metadataCommands, ...contributorCommands].map((command) =>
      dynamoDBDocumentClient.send(command)
    )
  );
};
