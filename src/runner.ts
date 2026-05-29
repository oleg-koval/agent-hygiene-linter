import type {
  CommandExecutor,
  Playbook,
  PlaybookRunResult,
  RunOptions,
  StepFinalStatus,
  StepRunResult,
} from "./types.js";
import { interpolatePlaybook } from "./interpolate.js";
import {
  buildEnvironment,
  clearState,
  createDefaultExecutor,
  defaultStatePath,
  executeAttempt,
  hashPlaybook,
  makePlannedStep,
  makeSkippedStep,
  nowUtc,
  normalizeTimeout,
  readState,
  writeState,
} from "./runner-helpers.js";

function createInitialResults(
  playbook: Playbook,
  cwd: string,
  dryRun: boolean,
): StepRunResult[] {
  return playbook.steps.map((step) => {
    if (dryRun) {
      return makePlannedStep(step);
    }

    return {
      name: step.name,
      command: step.command,
      cwd: step.cwd ?? cwd,
      attempts: 0,
      finalStatus: "planned",
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: 0,
    };
  });
}

async function runStep(
  stepIndex: number,
  playbook: Playbook,
  options: RunOptions,
  results: StepRunResult[],
  executor: CommandExecutor,
  env: NodeJS.ProcessEnv,
  statePath: string,
  stateHash: string,
): Promise<PlaybookRunResult | null> {
  const step = playbook.steps[stepIndex];
  if (step === undefined) {
    return null;
  }

  const result = results[stepIndex];
  if (result === undefined) {
    return null;
  }

  const timeoutSeconds = normalizeTimeout(step.timeoutSeconds);
  const maxAttempts = step.retries + 1;
  const startedAt = Date.now();
  let lastError: string | undefined;
  let lastStdout = "";
  let lastStderr = "";
  let lastExitCode: number | null = null;
  let finalStatus: StepFinalStatus = "failed";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    result.attempts = attempt;
    const outcome = await executeAttempt(executor, step.command, {
      cwd: step.cwd ?? options.cwd,
      env,
      timeoutSeconds,
    });

    if (outcome.kind === "result") {
      lastStdout = outcome.result.stdout;
      lastStderr = outcome.result.stderr;
      lastExitCode = outcome.result.exitCode;
      if (outcome.result.exitCode === 0) {
        finalStatus = "succeeded";
        break;
      }

      lastError = `Step "${step.name}" failed with exit code ${String(outcome.result.exitCode)}`;
    } else if (outcome.kind === "timeout") {
      lastError = `Step "${step.name}" timed out after ${String(timeoutSeconds)} seconds`;
      finalStatus = "timed_out";
    } else {
      lastError = `Step "${step.name}" errored: ${outcome.error.message}`;
      lastExitCode = 1;
    }

    if (finalStatus === "timed_out") {
      if (attempt < maxAttempts) {
        continue;
      }
      break;
    }

    if (attempt < maxAttempts) {
      continue;
    }
  }

  result.finalStatus = finalStatus;
  result.stdout = lastStdout;
  result.stderr = lastStderr;
  result.exitCode = lastExitCode;
  result.durationMs = Date.now() - startedAt;
  if (finalStatus === "succeeded") {
    delete result.error;
  } else {
    result.error = lastError ?? `Step "${step.name}" failed`;
  }

  if (finalStatus !== "succeeded") {
    for (
      let nextIndex = stepIndex + 1;
      nextIndex < results.length;
      nextIndex += 1
    ) {
      const nextStep = playbook.steps[nextIndex];
      if (nextStep === undefined) {
        continue;
      }
      results[nextIndex] = makeSkippedStep(
        nextStep,
        nextStep.cwd ?? options.cwd,
      );
    }
    await writeState(statePath, {
      playbookHash: stateHash,
      lastCompletedStepIndex: stepIndex - 1,
      updatedAtUtc: nowUtc(),
    });
    return {
      title: playbook.title,
      objective: playbook.objective,
      status: "failed",
      resumedFromStepIndex: 0,
      statePath,
      steps: results,
    };
  }

  await writeState(statePath, {
    playbookHash: stateHash,
    lastCompletedStepIndex: stepIndex,
    updatedAtUtc: nowUtc(),
  });
  return null;
}

export async function runPlaybook(
  playbook: Playbook,
  options: RunOptions,
): Promise<PlaybookRunResult> {
  const interpolated = interpolatePlaybook(playbook, options.variables ?? {});
  const executor = options.executor ?? createDefaultExecutor();
  const statePath = options.statePath ?? defaultStatePath(options.cwd);
  const env = buildEnvironment(options.variables);
  const stateHash = hashPlaybook(interpolated);
  const existingState =
    options.resume === true ? await readState(statePath) : null;

  if (existingState !== null && existingState.playbookHash !== stateHash) {
    throw new Error("Saved resume state does not match this playbook");
  }

  const resumedFromStepIndex =
    existingState === null ? 0 : existingState.lastCompletedStepIndex + 1;
  const results = createInitialResults(
    interpolated,
    options.cwd,
    options.dryRun === true,
  );

  if (options.dryRun === true) {
    return {
      title: interpolated.title,
      objective: interpolated.objective,
      status: "dry-run",
      resumedFromStepIndex,
      statePath,
      steps: results,
    };
  }

  for (
    let stepIndex = resumedFromStepIndex;
    stepIndex < interpolated.steps.length;
    stepIndex += 1
  ) {
    const outcome = await runStep(
      stepIndex,
      interpolated,
      options,
      results,
      executor,
      env,
      statePath,
      stateHash,
    );
    if (outcome !== null) {
      return {
        ...outcome,
        resumedFromStepIndex,
      };
    }
  }

  await clearState(statePath);
  return {
    title: interpolated.title,
    objective: interpolated.objective,
    status: "succeeded",
    resumedFromStepIndex,
    statePath,
    steps: results,
  };
}
