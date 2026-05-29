import type { ParseOptions, PlaybookStep, SectionName } from "./types.js";

const sectionLabels: ReadonlyMap<string, SectionName> = new Map([
  ["objective", "objective"],
  ["preconditions", "preconditions"],
  ["inherited template", "inheritedTemplate"],
  ["inherited-template", "inheritedTemplate"],
  ["variables", "variables"],
  ["steps", "steps"],
  ["validation", "validation"],
  ["rollback", "rollback"],
  ["success criteria", "successCriteria"],
  ["success-criteria", "successCriteria"],
  ["kill criteria", "killCriteria"],
  ["kill-criteria", "killCriteria"],
]);

export interface StepDraft {
  name: string;
  command?: string;
  cwd?: string;
  retries?: number;
  timeoutSeconds?: number;
}

export interface DraftPlaybook {
  title: string;
  objective: string;
  preconditions: string[];
  inheritedTemplate?: string;
  variables: Record<string, string>;
  steps: StepDraft[];
  validation: string[];
  rollback: string[];
  successCriteria: string[];
  killCriteria: string[];
  sourcePath?: string;
}

export function createDraft(options: ParseOptions): DraftPlaybook {
  const draft: DraftPlaybook = {
    title: "",
    objective: "",
    preconditions: [],
    variables: {},
    steps: [],
    validation: [],
    rollback: [],
    successCriteria: [],
    killCriteria: [],
  };

  if (options.sourcePath !== undefined) {
    draft.sourcePath = options.sourcePath;
  }

  return draft;
}

export function normalizeSectionLabel(label: string): SectionName {
  const normalized = label.trim().toLowerCase();
  const mapped = sectionLabels.get(normalized);

  if (mapped === undefined) {
    throw new Error(`Unknown playbook section: ${label}`);
  }

  return mapped;
}

export function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const wrapped =
    first === last && (first === "`" || first === '"' || first === "'");
  return wrapped ? trimmed.slice(1, -1).trim() : trimmed;
}

export function parseListItem(line: string): string | null {
  const match = /^\s*[-*]\s+(.*)$/.exec(line);
  if (match === null) {
    return null;
  }

  const value = unquote(match[1] ?? "");
  return value.length === 0 ? null : value;
}

export function parseVariablesItem(line: string): [string, string] | null {
  const item = parseListItem(line);
  if (item === null) {
    return null;
  }

  const separator = item.indexOf(":");
  if (separator === -1) {
    return null;
  }

  const key = item.slice(0, separator).trim();
  const value = unquote(item.slice(separator + 1));
  if (key.length === 0) {
    return null;
  }

  return [key, value];
}

export function parseNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

export function normalizeFieldName(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function finalizeStep(step: StepDraft): PlaybookStep {
  if (step.command === undefined || step.command.trim().length === 0) {
    throw new Error(`Step "${step.name}" is missing a command`);
  }

  if (step.name.trim().length === 0) {
    throw new Error("Playbook step is missing a name");
  }

  const finalized: PlaybookStep = {
    name: step.name,
    command: step.command,
    retries: step.retries ?? 0,
  };

  if (step.cwd !== undefined) {
    finalized.cwd = step.cwd;
  }

  if (step.timeoutSeconds !== undefined) {
    finalized.timeoutSeconds = step.timeoutSeconds;
  }

  return finalized;
}

export function commitSection(
  draft: DraftPlaybook,
  section: SectionName | null,
  buffer: string[],
): void {
  const content = buffer
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (section === null || content.length === 0) {
    buffer.length = 0;
    return;
  }

  switch (section) {
    case "objective":
      draft.objective = content.join(" ");
      break;
    case "preconditions":
      draft.preconditions.push(
        ...content.map((line) => parseListItem(line) ?? unquote(line)),
      );
      break;
    case "inheritedTemplate":
      draft.inheritedTemplate = unquote(content.join(" "));
      break;
    case "variables":
      for (const line of content) {
        const parsed = parseVariablesItem(line);
        if (parsed === null) {
          throw new Error(`Invalid variables line: ${line}`);
        }

        const [key, value] = parsed;
        draft.variables[key] = value;
      }
      break;
    case "validation":
      draft.validation.push(
        ...content.map((line) => parseListItem(line) ?? unquote(line)),
      );
      break;
    case "rollback":
      draft.rollback.push(
        ...content.map((line) => parseListItem(line) ?? unquote(line)),
      );
      break;
    case "successCriteria":
      draft.successCriteria.push(
        ...content.map((line) => parseListItem(line) ?? unquote(line)),
      );
      break;
    case "killCriteria":
      draft.killCriteria.push(
        ...content.map((line) => parseListItem(line) ?? unquote(line)),
      );
      break;
    case "steps":
      break;
    default: {
      const unreachable: never = section;
      throw new Error(`Unhandled section: ${String(unreachable)}`);
    }
  }

  buffer.length = 0;
}

export function commitStep(draft: DraftPlaybook, step: StepDraft | null): void {
  if (step === null) {
    return;
  }

  draft.steps.push(finalizeStep(step));
}
