export type SectionName =
  | "objective"
  | "preconditions"
  | "inheritedTemplate"
  | "variables"
  | "steps"
  | "validation"
  | "rollback"
  | "successCriteria"
  | "killCriteria";

export interface ParseOptions {
  sourcePath?: string;
}

export interface PlaybookStep {
  name: string;
  command: string;
  cwd?: string;
  retries: number;
  timeoutSeconds?: number;
}

export interface Playbook {
  title: string;
  objective: string;
  preconditions: string[];
  inheritedTemplate?: string;
  variables: Record<string, string>;
  steps: PlaybookStep[];
  validation: string[];
  rollback: string[];
  successCriteria: string[];
  killCriteria: string[];
  sourcePath?: string;
}

export type InterpolateVariables = Record<string, string>;

export interface CommandExecutionOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface CommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandExecutor = (
  command: string,
  options: CommandExecutionOptions,
) => Promise<CommandExecutionResult>;

export interface RunOptions {
  cwd: string;
  statePath?: string;
  resume?: boolean;
  dryRun?: boolean;
  variables?: InterpolateVariables;
  executor?: CommandExecutor;
}

export type StepFinalStatus =
  | "planned"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "skipped";

export interface StepRunResult {
  name: string;
  command: string;
  cwd: string;
  attempts: number;
  finalStatus: StepFinalStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  error?: string;
}

export interface PlaybookRunResult {
  title: string;
  objective: string;
  status: "succeeded" | "failed" | "dry-run";
  resumedFromStepIndex: number;
  statePath?: string;
  steps: StepRunResult[];
}

export interface PlaybookState {
  playbookHash: string;
  lastCompletedStepIndex: number;
  updatedAtUtc: string;
}

export interface CliArgs {
  command: "serve" | "run";
  host: string;
  port: number;
  playbookPath?: string;
  dryRun: boolean;
  resume: boolean;
  statePath?: string;
  cwd?: string;
  root?: string;
}

export interface ServerRunInput {
  playbookText?: string;
  playbookPath?: string;
  dryRun?: boolean;
  resume?: boolean;
  cwd: string;
  statePath?: string;
}

export interface ServerOptions {
  host: string;
  port: number;
  workspaceRoot: string;
  runner?: (input: ServerRunInput) => Promise<PlaybookRunResult>;
}

export interface RunningServer {
  port: number;
  stop: () => Promise<void>;
}
