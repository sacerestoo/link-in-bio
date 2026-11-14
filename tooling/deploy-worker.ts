import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getProductionKeyErrors,
  productionSecretKeys,
} from "./check-prod-keys.ts";
import { readDotenvEntries } from "./dotenv.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const workers = {
  web: {
    env: "WEB_ENV_PRODUCTION",
    config: "apps/web/wrangler.jsonc",
    builtConfig: "apps/web/dist/server/wrangler.json",
    secrets: productionSecretKeys.web,
  },
  server: {
    env: "SERVER_ENV_PRODUCTION",
    config: "apps/server/wrangler.jsonc",
    builtConfig: "apps/server/dist/grabbin_server/wrangler.json",
    secrets: productionSecretKeys.server,
  },
  cron: {
    env: "CRON_ENV_PRODUCTION",
    config: "apps/cron/wrangler.jsonc",
    builtConfig: "apps/cron/dist/grabbin_cron/wrangler.json",
    secrets: productionSecretKeys.cron,
  },
} as const;

type Worker = keyof typeof workers;

function run(command: string, args: string[], env = process.env): void {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} exited with status ${result.status ?? "unknown"}.`,
    );
  }
}

function workerDeployEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.WEB_ENV_PRODUCTION;
  delete env.SERVER_ENV_PRODUCTION;
  delete env.CRON_ENV_PRODUCTION;
  return env;
}

function buildCheckEnv(): NodeJS.ProcessEnv {
  const env = workerDeployEnv();
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  return env;
}

function readSettings(worker: Worker): Record<string, string> {
  const raw = process.env[workers[worker].env];
  if (raw === undefined || raw.trim() === "") {
    throw new Error(`Missing production setting: ${workers[worker].env}`);
  }
  return Object.fromEntries(
    [...readDotenvEntries(raw, workers[worker].env)].map(([key, entry]) => [
      key,
      entry.value,
    ]),
  );
}

function runBuild(
  worker: Worker,
  vars: Array<[string, string]>,
  settings: Record<string, string>,
): void {
  const buildEnv = { ...process.env };
  delete buildEnv.CLOUDFLARE_API_TOKEN;
  delete buildEnv.CLOUDFLARE_ACCOUNT_ID;
  delete buildEnv.WEB_ENV_PRODUCTION;
  delete buildEnv.SERVER_ENV_PRODUCTION;
  delete buildEnv.CRON_ENV_PRODUCTION;
  Object.assign(buildEnv, Object.fromEntries(vars));
  if (worker === "web" && settings.SENTRY_AUTH_TOKEN) {
    buildEnv.SENTRY_AUTH_TOKEN = settings.SENTRY_AUTH_TOKEN;
  }
  run("bun", ["run", "--cwd", `apps/${worker}`, "build"], buildEnv);
}

function runDryRun(
  worker: Worker,
  varArgs: string[],
  env: NodeJS.ProcessEnv,
): void {
  run(
    "bunx",
    [
      "wrangler",
      "deploy",
      "--dry-run",
      "--config",
      workers[worker].builtConfig,
      ...varArgs,
    ],
    env,
  );
}

function uploadSecrets(
  worker: Worker,
  secretsFile: string,
  env: NodeJS.ProcessEnv,
): void {
  run(
    "bunx",
    [
      "wrangler",
      "secret",
      "bulk",
      secretsFile,
      "--config",
      workers[worker].config,
    ],
    env,
  );
}

function deployBuild(
  worker: Worker,
  varArgs: string[],
  env: NodeJS.ProcessEnv,
): void {
  run(
    "bunx",
    ["wrangler", "deploy", "--config", workers[worker].builtConfig, ...varArgs],
    env,
  );
}

function deploy(worker: Worker): void {
  const settings = readSettings(worker);
  const secretEntries = Object.entries(settings).filter(([key]) =>
    workers[worker].secrets.has(key),
  );
  const vars = Object.entries(settings).filter(
    ([key]) => !workers[worker].secrets.has(key),
  );
  const tempDir = mkdtempSync(join(tmpdir(), "grabbin-deploy-"));
  const deployEnv = workerDeployEnv();

  try {
    const secretsFile = join(tempDir, "secrets.json");
    writeFileSync(
      secretsFile,
      JSON.stringify(Object.fromEntries(secretEntries)),
      {
        mode: 0o600,
      },
    );
    const varArgs = vars.flatMap(([key, value]) => [
      "--var",
      `${key}:${value}`,
    ]);

    runBuild(worker, vars, settings);
    runDryRun(worker, varArgs, buildCheckEnv());
    uploadSecrets(worker, secretsFile, deployEnv);
    deployBuild(worker, varArgs, deployEnv);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main(): void {
  const worker = process.argv[2];
  if (worker !== "web" && worker !== "server" && worker !== "cron") {
    throw new Error("Choose one Worker: web, server or cron.");
  }
  const errors = getProductionKeyErrors(process.env);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  deploy(worker);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Worker deploy failed.",
    );
    process.exitCode = 1;
  }
}
