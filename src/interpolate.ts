import type { InterpolateVariables, Playbook } from "./types.js";

function interpolateString(
  value: string,
  variables: InterpolateVariables,
): string {
  return value.replace(
    /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
    (match, key: string) => {
      const resolved = variables[key];
      if (resolved === undefined) {
        throw new Error(`Missing placeholder: ${key}`);
      }

      return resolved;
    },
  );
}

function mergeVariables(
  playbookVariables: InterpolateVariables,
  runtimeVariables: InterpolateVariables,
): InterpolateVariables {
  return {
    ...playbookVariables,
    ...runtimeVariables,
  };
}

export function interpolatePlaybook(
  playbook: Playbook,
  runtimeVariables: InterpolateVariables,
): Playbook {
  const variables = mergeVariables(playbook.variables, runtimeVariables);
  const interpolated: Playbook = {
    title: interpolateString(playbook.title, variables),
    objective: interpolateString(playbook.objective, variables),
    preconditions: playbook.preconditions.map((value) =>
      interpolateString(value, variables),
    ),
    variables: { ...playbook.variables },
    steps: playbook.steps.map((step) => {
      const interpolatedStep: Playbook["steps"][number] = {
        name: interpolateString(step.name, variables),
        command: interpolateString(step.command, variables),
        retries: step.retries,
      };

      if (step.cwd !== undefined) {
        interpolatedStep.cwd = interpolateString(step.cwd, variables);
      }

      if (step.timeoutSeconds !== undefined) {
        interpolatedStep.timeoutSeconds = step.timeoutSeconds;
      }

      return interpolatedStep;
    }),
    validation: playbook.validation.map((value) =>
      interpolateString(value, variables),
    ),
    rollback: playbook.rollback.map((value) =>
      interpolateString(value, variables),
    ),
    successCriteria: playbook.successCriteria.map((value) =>
      interpolateString(value, variables),
    ),
    killCriteria: playbook.killCriteria.map((value) =>
      interpolateString(value, variables),
    ),
  };

  if (playbook.inheritedTemplate !== undefined) {
    interpolated.inheritedTemplate = interpolateString(
      playbook.inheritedTemplate,
      variables,
    );
  }

  if (playbook.sourcePath !== undefined) {
    interpolated.sourcePath = playbook.sourcePath;
  }

  return interpolated;
}
