import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  CommandExecutor,
  InterpolateVariables,
  Playbook,
  PlaybookState,
  StepRunResult,
} from "./types.js";

export function nowUtc(): string {
  return new Date().toISOString();
}

export function hashPlaybook(playbook: Playbook): string {
  return createHash("sha256").update(JSON.stringify(playbook)).digest("hex");
}

export function defaultStatePath(cwd: string): string {
  return resolve(cwd, ".ai-refactor-playbook-runner-state.json");
}

export function buildEnvironment(
  overrides: InterpolateVariables | undefined,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides,
  };
}

export function createDefaultExecutor(): CommandExecutor {
  return async (command, options: CommandExecutionOptions) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = "";
    let stderr = "";
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    if (options.timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        child.kill("SIGKILL");
      }, options.timeoutMs);
    }

    return await new Promise<CommandExecutionResult>(
      (resolvePromise, rejectPromise) => {
        child.once("error", rejectPromise);
        child.once("close", (code) => {
          if (timeoutHandle !== undefined) {
            clearTimeout(timeoutHandle);
          }
          resolvePromise({
            exitCode: code ?? 1,
            stdout,
            stderr,
          });
        });
      },
    );
  };
}

export async function readState(
  statePath: string,
): Promise<PlaybookState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    return JSON.parse(raw) as PlaybookState;
  } catch (error) {
    const known = error as NodeJS.ErrnoException;
    if (known.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeState(
  statePath: string,
  state: PlaybookState,
): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function clearState(statePath: string): Promise<void> {
  await rm(statePath, { force: true });
}

export async function executeAttempt(
  executor: CommandExecutor,
  command: string,
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutSeconds: number },
): Promise<
  | { kind: "result"; result: CommandExecutionResult }
  | { kind: "timeout" }
  | { kind: "error"; error: Error }
> {
  const timeoutMs = options.timeoutSeconds * 1000;

  const executorPromise = executor(command, {
    cwd: options.cwd,
    env: options.env,
    timeoutMs,
  })
    .then((result) => ({ kind: "result" as const, result }))
    .catch((error: unknown) => ({
      kind: "error" as const,
      error: error instanceof Error ? error : new Error(String(error)),
    }));

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ kind: "timeout" }>((resolvePromise) => {
    timeoutHandle = setTimeout(() => {
      resolvePromise({ kind: "timeout" });
    }, timeoutMs);
  });

  const outcome = await Promise.race([executorPromise, timeoutPromise]);
  if (timeoutHandle !== undefined) {
    clearTimeout(timeoutHandle);
  }

  return outcome;
}

export function makePlannedStep(
  step: Playbook["steps"][number],
): StepRunResult {
  return {
    name: step.name,
    command: step.command,
    cwd: step.cwd ?? "",
    attempts: 0,
    finalStatus: "planned",
    stdout: "",
    stderr: "",
    exitCode: null,
    durationMs: 0,
  };
}

export function makeSkippedStep(
  step: Playbook["steps"][number],
  cwd: string,
): StepRunResult {
  return {
    name: step.name,
    command: step.command,
    cwd,
    attempts: 0,
    finalStatus: "skipped",
    stdout: "",
    stderr: "",
    exitCode: null,
    durationMs: 0,
  };
}

export function normalizeTimeout(
  stepTimeoutSeconds: number | undefined,
): number {
  return stepTimeoutSeconds ?? 300;
}
