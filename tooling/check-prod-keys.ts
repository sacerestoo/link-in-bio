import { readFileSync } from "node:fs";
import * as v from "valibot";
import { cronEnvSchema } from "../apps/cron/src/env.ts";
import { serverEnvSchema } from "../apps/server/src/lib/env.ts";
import { webEnvSchema } from "../apps/web/lib/env.ts";
import { readDotenvEntries } from "./dotenv.ts";

const root = new URL("../", import.meta.url);
const workerSettings = [
  {
    name: "web",
    input: "WEB_ENV_PRODUCTION",
    example: "apps/web/.env.example",
    schema: webEnvSchema,
  },
  {
    name: "cron",
    input: "CRON_ENV_PRODUCTION",
    example: "apps/cron/.env.example",
    schema: cronEnvSchema,
  },
  {
    name: "server",
    input: "SERVER_ENV_PRODUCTION",
    example: "apps/server/.env.example",
    schema: serverEnvSchema,
  },
] as const;

export const productionSecretKeys = {
  web: new Set([
    "SENTRY_DSN",
    "SENTRY_AUTH_TOKEN",
    "RESEND_API_KEY",
    "GOOGLE_CLIENT_SECRET",
    "CHZZK_CLIENT_SECRET",
    "TWITTER_CLIENT_SECRET",
    "TWITCH_CLIENT_SECRET",
    "TWITCH_USER_ACCESS_TOKEN",
    "CALENDLY_CLIENT_SECRET",
    "GITHUB_TOKEN",
    "PRODUCT_HUNT_TOKEN",
    "INSTAGRAM_SESSION_ID",
    "CLOUDFLARE_SAAS_API_TOKEN",
    "GA_MEASUREMENT_PROTOCOL_API_SECRET",
  ]),
  cron: new Set(["SENTRY_DSN", "CLOUDFLARE_SAAS_API_TOKEN", "CREEM_API_KEY"]),
  server: new Set([
    "BETTER_AUTH_SECRET",
    "SENTRY_DSN",
    "CREEM_API_KEY",
    "CREEM_WEBHOOK_SECRET",
  ]),
} as const;

const deployKeys = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"] as const;

function parseSettings(raw: string, input: string): Record<string, string> {
  return Object.fromEntries(
    [...readDotenvEntries(raw, input)].map(([key, entry]) => [
      key,
      entry.value,
    ]),
  );
}

function validateDeployKeys(
  bindings: Readonly<Record<string, string | undefined>>,
): string[] {
  const errors = deployKeys.flatMap((key) => {
    const value = bindings[key];
    return value === undefined || value.trim() === ""
      ? [`Missing production setting: ${key}`]
      : [];
  });
  const accountId = bindings.CLOUDFLARE_ACCOUNT_ID;
  if (
    accountId !== undefined &&
    accountId.trim() !== "" &&
    !/^[\da-f]{32}$/iu.test(accountId.trim())
  ) {
    errors.push("CLOUDFLARE_ACCOUNT_ID must be a 32-character hex ID.");
  }
  return errors;
}

function getExampleNames(path: string): Set<string> {
  const source = readFileSync(new URL(path, root), "utf8");
  return new Set(readDotenvEntries(source, path).keys());
}

function validateSettingNames(
  settings: Record<string, unknown>,
  input: string,
  expectedNames: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const key of expectedNames) {
    if (!Object.hasOwn(settings, key)) {
      errors.push(`${input} is missing setting: ${key}`);
    }
  }
  for (const key of Object.keys(settings)) {
    if (!expectedNames.has(key)) {
      errors.push(`${input} has an undeclared setting: ${key}`);
    }
    const value = settings[key];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${input} has an empty or non-text value for: ${key}`);
    }
  }
  return errors;
}

function validateWorkerSettings(
  worker: (typeof workerSettings)[number],
  raw: string | undefined,
): string[] {
  if (raw === undefined || raw.trim() === "") {
    return [`Missing production setting: ${worker.input}`];
  }

  let settings: Record<string, unknown>;
  try {
    settings = parseSettings(raw, worker.input);
  } catch (error) {
    return [`${worker.input} is invalid dotenv: ${errorMessage(error)}`];
  }

  const errors = validateSettingNames(
    settings,
    worker.input,
    getExampleNames(worker.example),
  );
  const result = v.safeParse(worker.schema, settings);
  if (!result.success) {
    for (const issue of result.issues) {
      const key = v.getDotPath(issue) ?? "(root)";
      errors.push(
        `${worker.input} has an invalid setting: ${key} (${issue.type})`,
      );
    }
  }
  return errors;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "check the file format.";
}

export function getProductionKeyErrors(
  bindings: Readonly<Record<string, string | undefined>>,
): string[] {
  return [
    ...validateDeployKeys(bindings),
    ...workerSettings.flatMap((worker) =>
      validateWorkerSettings(worker, bindings[worker.input]),
    ),
  ];
}

if (import.meta.main) {
  const errors = getProductionKeyErrors(process.env);
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exitCode = 1;
}
