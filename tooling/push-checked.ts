import { spawnSync } from "node:child_process";

const run = (command: string, args: readonly string[]): void => {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const getWorkingTreeChanges = (): string => {
  const result = spawnSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Could not read Git status.");
  return result.stdout;
};

try {
  if (getWorkingTreeChanges() !== "") {
    throw new Error("Commit or stash local changes before using push:checked.");
  }

  run("bun", ["run", "check:fix"]);
  if (getWorkingTreeChanges() !== "") {
    run("git", ["add", "--update"]);
    run("git", ["commit", "-m", "style: apply automatic quality fixes"]);
  }

  run("git", ["push"]);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
