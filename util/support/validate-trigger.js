const { z } = require("zod");
const { existsSync, readFileSync } = require("fs");
const {
  AVAILABLE_TRIGGERS,
  AVAILABLE_PLATFORMS,
  AVAILABLE_LANGUAGES,
} = require("./config");

const configSchema = z.object({
  name: z.string({
    error: (issue) => {
      if (issue.input === undefined) {
        return "`name` must be provided in your `config.json` file.";
      }
      return "The `name` in your `config.json` file must be a string.";
    },
  }),
  description: z.string({
    error: (issue) => {
      if (issue.input === undefined) {
        return "`description` must be provided in your `config.json` file.";
      }
      return "The `description` in your `config.json` file must be a string.";
    },
  }),
  platforms: z
    .enum(AVAILABLE_PLATFORMS, {
      errorMap: (issue, ctx) => {
        if (issue.code === "invalid_type") {
          return {
            message: "`platforms` must be provided in your `config.json` file.",
          };
        }

        if (issue.code === "invalid_enum_value") {
          return {
            message: `The platform \`${
              issue.received
            }\` in your \`config.json\` file is not valid. Valid platforms are: ${AVAILABLE_PLATFORMS.map(
              (c) => `\`${c}\``
            ).join(", ")}.`,
          };
        }

        return { message: ctx.defaultError };
      },
    })
    .array()
    .nonempty({
      message:
        "`platforms` in your `config.json` file must contain at least one platform.",
    }),
  language: z.enum(AVAILABLE_LANGUAGES, {
    errorMap: (issue, ctx) => {
      if (issue.code === "invalid_type") {
        return {
          message: "`language` must be provided in your `config.json` file.",
        };
      }

      if (issue.code === "invalid_enum_value") {
        return {
          message: `The language \`${
            issue.received
          }\` in your \`config.json\` file is not valid. Valid languages are: ${AVAILABLE_LANGUAGES.map(
              (c) => `\`${c}\``
            ).join(", ")}.`,
        };
      }

      return { message: ctx.defaultError };
    },
  }),
});

module.exports = function validateTrigger(triggerName) {
  if (!/^[0-9A-Za-z\-]+$/.test(triggerName)) {
    return {
      success: false,
      errors: [
        `The trigger name \`${triggerName}\` is invalid. Trigger names can only contain letters, numbers, and hyphens.`,
      ],
    };
  }

  const path = `triggers/${triggerName}`;

  const anyTriggersFound = AVAILABLE_TRIGGERS.some((trigger) =>
    existsSync(`${path}/${trigger}`)
  );
  if (!anyTriggersFound) {
    return {
      success: false,
      errors: [
        `We couldn't find any trigger files in \`${path}\`. Try adding an executable file with one of the following names: ${AVAILABLE_TRIGGERS.map(
          (h) => `\`${h}\``
        ).join(", ")}.`,
      ],
    };
  }

  const readmePath = `${path}/README.md`;

  if (!existsSync(readmePath)) {
    return {
      success: false,
      errors: [
        `Your trigger doesn't seem to have a README. We'll use this in the triggers directory to tell users more about your app. Please add one at \`${readmePath}\`.`,
      ],
    };
  }

  const configPath = `${path}/config.json`;

  if (!existsSync(configPath)) {
    return {
      success: false,
      errors: [
        `We couldn't find a triggers configuration file at \`${configPath}\`. Please add one to let us know how we should show your app in the triggers directory.`,
      ],
    };
  }

  const iconPath = `${path}/assets/icon.png`;
  if (!existsSync(iconPath)) {
    return {
      success: false,
      errors: [
        `We couldn't find an icon for your trigger at \`${iconPath}\`. Please add one to let us know how we should show your app in the triggers directory.`,
      ],
    };
  }

  let config;

  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (e) {
    return {
      success: false,
      errors: [
        `The triggers configuration file at \`${configPath}\` doesn't appear to be valid JSON.`,
      ],
    };
  }

  const parsedConfig = configSchema.safeParse(config);

  if (!parsedConfig.success) {
    return {
      success: false,
      errors: parsedConfig.error.issues.map((i) => i.message),
    };
  }

  return { success: true, config: parsedConfig.data };
};