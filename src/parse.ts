import type {
  ParseOptions,
  Playbook,
  PlaybookStep,
  SectionName,
} from "./types.js";
import {
  commitSection,
  commitStep,
  createDraft,
  finalizeStep,
  normalizeFieldName,
  normalizeSectionLabel,
  parseNumber,
  unquote,
} from "./parse-helpers.js";

export function parsePlaybookMarkdown(
  markdown: string,
  options: ParseOptions = {},
): Playbook {
  const draft = createDraft(options);
  const lines = markdown.split(/\r?\n/);
  let section: SectionName | null = null;
  const buffer: string[] = [];
  let currentStep: {
    name: string;
    command?: string;
    cwd?: string;
    retries?: number;
    timeoutSeconds?: number;
  } | null = null;

  for (const line of lines) {
    const titleMatch = /^#\s+(.*)$/.exec(line);
    if (titleMatch !== null && draft.title.length === 0) {
      draft.title = unquote(titleMatch[1] ?? "");
      continue;
    }

    const headingMatch = /^##\s+(.*)$/.exec(line);
    if (headingMatch !== null) {
      commitStep(draft, currentStep);
      currentStep = null;
      commitSection(draft, section, buffer);
      section = normalizeSectionLabel(headingMatch[1] ?? "");
      continue;
    }

    if (section === "steps") {
      const stepHeadingMatch = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (stepHeadingMatch !== null) {
        commitStep(draft, currentStep);
        currentStep = {
          name: unquote(stepHeadingMatch[1] ?? ""),
          retries: 0,
        };
        continue;
      }

      if (currentStep === null || line.trim().length === 0) {
        continue;
      }

      const fieldMatch =
        /^\s*(?:[-*]\s*)?([A-Za-z_][A-Za-z0-9_\- ]*?):\s*(.*)$/.exec(line);
      if (fieldMatch === null) {
        continue;
      }

      const fieldName = normalizeFieldName(fieldMatch[1] ?? "");
      const rawValue = unquote(fieldMatch[2] ?? "");

      switch (fieldName) {
        case "name":
          currentStep.name = rawValue;
          break;
        case "command":
          currentStep.command = rawValue;
          break;
        case "cwd":
          currentStep.cwd = rawValue;
          break;
        case "retries":
          currentStep.retries = parseNumber(rawValue, 0);
          break;
        case "timeout_seconds":
          currentStep.timeoutSeconds = parseNumber(rawValue, 0);
          break;
        default: {
          const unknownField = fieldMatch[1] ?? "";
          throw new Error(`Unknown step field: ${unknownField}`);
        }
      }

      continue;
    }

    if (section === null) {
      continue;
    }

    if (line.trim().length === 0) {
      continue;
    }

    buffer.push(line);
  }

  commitStep(draft, currentStep);
  commitSection(draft, section, buffer);

  if (draft.title.length === 0) {
    throw new Error("Playbook is missing a title");
  }

  const playbookSteps = draft.steps.map(
    (step): PlaybookStep => finalizeStep(step),
  );
  const playbook: Playbook = {
    title: draft.title,
    objective: draft.objective,
    preconditions: [...draft.preconditions],
    variables: { ...draft.variables },
    steps: playbookSteps,
    validation: [...draft.validation],
    rollback: [...draft.rollback],
    successCriteria: [...draft.successCriteria],
    killCriteria: [...draft.killCriteria],
  };

  if (draft.inheritedTemplate !== undefined) {
    playbook.inheritedTemplate = draft.inheritedTemplate;
  }

  if (draft.sourcePath !== undefined) {
    playbook.sourcePath = draft.sourcePath;
  }

  return playbook;
}
