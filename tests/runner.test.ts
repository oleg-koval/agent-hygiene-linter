import { describe, it, expect } from "vitest";
import { parsePlaybookMarkdown, runPlaybook } from "../src/index.js";

const playbookMarkdown = `# Refactor api client

## Objective
Make the API client deterministic.

## Variables
- repo_root: /repo

## Steps
1. First step
   - command: npm run first
   - cwd: {{repo_root}}
   - retries: 1
   - timeout_seconds: 30
2. Second step
   - command: npm run second
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 30
`;

describe("runPlaybook", () => {
  it("retries failed steps and persists resume state", async () => {
    const playbook = parsePlaybookMarkdown(playbookMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const calls: Array<string> = [];
    const firstRun = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      statePath: "/tmp/playbook-state.json",
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async (command) => {
        calls.push(command);
        if (command === "npm run first") {
          const attempts = calls.filter((value) => value === command).length;
          return attempts === 1
            ? { exitCode: 1, stdout: "", stderr: "boom" }
            : { exitCode: 0, stdout: "ok", stderr: "" };
        }

        return { exitCode: 1, stdout: "", stderr: "still broken" };
      },
    });

    expect(firstRun.status).toBe("failed");
    expect(firstRun.steps[0].attempts).toBe(2);
    expect(firstRun.steps[0].finalStatus).toBe("succeeded");
    expect(firstRun.steps[1].finalStatus).toBe("failed");

    const resumedCalls: Array<string> = [];
    const resumed = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      statePath: "/tmp/playbook-state.json",
      resume: true,
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async (command) => {
        resumedCalls.push(command);
        return { exitCode: 0, stdout: "ok", stderr: "" };
      },
    });

    expect(resumed.status).toBe("succeeded");
    expect(resumedCalls).toEqual(["npm run second"]);
  });

  it("supports dry-run without executing commands", async () => {
    const playbook = parsePlaybookMarkdown(playbookMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const result = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      dryRun: true,
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async () => {
        throw new Error("should not execute");
      },
    });

    expect(result.status).toBe("dry-run");
    expect(result.steps[0].finalStatus).toBe("planned");
    expect(result.steps[1].finalStatus).toBe("planned");
  });

  it("reports timeouts with step context", async () => {
    const timeoutMarkdown = `# Refactor api client

## Objective
Make the API client deterministic.

## Variables
- repo_root: /repo

## Steps
1. First step
   - command: npm run first
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 0
`;

    const playbook = parsePlaybookMarkdown(timeoutMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const result = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async () =>
        new Promise(() => {
          // never settles
        }),
    });

    expect(result.status).toBe("failed");
    expect(result.steps[0].finalStatus).toBe("timed_out");
    expect(result.steps[0].error).toContain("First step");
    expect(result.steps[0].error).toContain("timed out");
  });
});
