import type { Playbook } from "./types.js";

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    merged.push(trimmed);
  }

  return merged;
}

function mergeStepArrays(
  baseSteps: Playbook["steps"],
  childSteps: Playbook["steps"],
): Playbook["steps"] {
  const merged = baseSteps.map((step) => ({ ...step }));

  for (const step of childSteps) {
    const existingIndex = merged.findIndex(
      (current) => current.name === step.name,
    );
    if (existingIndex === -1) {
      merged.push({ ...step });
      continue;
    }

    merged[existingIndex] = { ...step };
  }

  return merged;
}

export function mergePlaybooks(base: Playbook, child: Playbook): Playbook {
  const merged: Playbook = {
    title: child.title.length > 0 ? child.title : base.title,
    objective: child.objective.length > 0 ? child.objective : base.objective,
    preconditions: uniqueStrings([
      ...base.preconditions,
      ...child.preconditions,
    ]),
    variables: {
      ...base.variables,
      ...child.variables,
    },
    steps: mergeStepArrays(base.steps, child.steps),
    validation: uniqueStrings([...base.validation, ...child.validation]),
    rollback: uniqueStrings([...base.rollback, ...child.rollback]),
    successCriteria: uniqueStrings([
      ...base.successCriteria,
      ...child.successCriteria,
    ]),
    killCriteria: uniqueStrings([...base.killCriteria, ...child.killCriteria]),
  };

  const inheritedTemplate = child.inheritedTemplate ?? base.inheritedTemplate;
  if (inheritedTemplate !== undefined) {
    merged.inheritedTemplate = inheritedTemplate;
  }

  const sourcePath = child.sourcePath ?? base.sourcePath;
  if (sourcePath !== undefined) {
    merged.sourcePath = sourcePath;
  }

  return merged;
}
