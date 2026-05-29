#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaybookFile } from "./load.js";
import { startServer } from "./server.js";
import { runPlaybook } from "./runner.js";
import type { CliArgs } from "./types.js";

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid port: ${value}`);
  }

  return parsed;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const args = [...argv];
  const command = (args[0] ?? "run") as "serve" | "run";
  let host = "127.0.0.1";
  let port = 8787;
  let playbookPath: string | undefined;
  let dryRun = false;
  let resume = false;
  let statePath: string | undefined;
  let cwd: string | undefined;
  let root: string | undefined;

  if (command === "run") {
    playbookPath = args[1];
  }

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }

    switch (token) {
      case "--host":
        host = args[index + 1] ?? host;
        index += 1;
        break;
      case "--port":
        port = parsePort(args[index + 1], port);
        index += 1;
        break;
      case "--playbook":
      case "--playbook-path":
        playbookPath = args[index + 1];
        index += 1;
        break;
      case "--cwd":
        cwd = args[index + 1];
        index += 1;
        break;
      case "--state-file":
        statePath = args[index + 1];
        index += 1;
        break;
      case "--root":
        root = args[index + 1];
        index += 1;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--resume":
        resume = true;
        break;
      default:
        break;
    }
  }

  const parsed: CliArgs = {
    command,
    host,
    port,
    dryRun,
    resume,
  };

  if (playbookPath !== undefined) {
    parsed.playbookPath = playbookPath;
  }
  if (statePath !== undefined) {
    parsed.statePath = statePath;
  }
  if (cwd !== undefined) {
    parsed.cwd = cwd;
  }
  if (root !== undefined) {
    parsed.root = root;
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const workspaceRoot = args.root ?? process.cwd();

  if (args.command === "serve") {
    const server = await startServer({
      host: args.host,
      port: args.port,
      workspaceRoot,
    });

    console.log(
      `AI Refactor Playbook Runner listening on http://${args.host}:${String(server.port)}`,
    );
    console.log(
      "Bind to 0.0.0.0 and use your Tailscale IP or MagicDNS name from mobile.",
    );
    return;
  }

  if (args.playbookPath === undefined) {
    throw new Error("Provide a playbook path");
  }

  const resolvedPath = resolve(workspaceRoot, args.playbookPath);
  const playbook = await loadPlaybookFile(resolvedPath);
  const runOptions: Parameters<typeof runPlaybook>[1] = {
    cwd: args.cwd ?? dirname(resolvedPath),
    dryRun: args.dryRun,
    resume: args.resume,
  };

  if (args.statePath !== undefined) {
    runOptions.statePath = args.statePath;
  }

  const result = await runPlaybook(playbook, runOptions);

  console.log(JSON.stringify(result, null, 2));
}

const entryPoint =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (entryPoint !== undefined && fileURLToPath(import.meta.url) === entryPoint) {
  void main();
}
