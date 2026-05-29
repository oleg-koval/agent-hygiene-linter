import { describe, expect, it } from "vitest";
import {
  interpolatePlaybook,
  mergePlaybooks,
  parsePlaybookMarkdown,
} from "../src/index.js";

const baseMarkdown = `# Base playbook

## Objective
Normalize import paths.

## Preconditions
- repo is clean
- tests are green

## Variables
- repo_root: /repo
- branch: main

## Steps
1. Lint fix
   - command: npm run lint:fix
   - cwd: {{repo_root}}
   - retries: 1
   - timeout_seconds: 45

## Validation
- npm test

## Rollback
- git restore .

## Success criteria
- lint passes

## Kill criteria
- a step fails twice
`;

const childMarkdown = `# Child playbook

## Objective
Normalize import paths and update snapshots.

## Inherited template
./templates/base.md

## Variables
- branch: feature/refactor
- snapshot_mode: write

## Preconditions
- worktree is isolated

## Steps
1. Lint fix
   - command: npm run lint:fix -- --cache
   - cwd: {{repo_root}}
   - retries: 2
   - timeout_seconds: 60
2. Update snapshots
   - command: npm test -- -u
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 90
`;

describe("playbook parsing", () => {
  it("parses the markdown sections into a structured playbook", () => {
    const playbook = parsePlaybookMarkdown(baseMarkdown, {
      sourcePath: "/repo/playbooks/base.md",
    });

    expect(playbook.title).toBe("Base playbook");
    expect(playbook.objective).toBe("Normalize import paths.");
    expect(playbook.preconditions).toEqual([
      "repo is clean",
      "tests are green",
    ]);
    expect(playbook.variables).toEqual({ repo_root: "/repo", branch: "main" });
    expect(playbook.steps).toHaveLength(1);
    expect(playbook.steps[0]).toEqual({
      name: "Lint fix",
      command: "npm run lint:fix",
      cwd: "{{repo_root}}",
      retries: 1,
      timeoutSeconds: 45,
    });
    expect(playbook.validation).toEqual(["npm test"]);
    expect(playbook.rollback).toEqual(["git restore ."]);
    expect(playbook.successCriteria).toEqual(["lint passes"]);
    expect(playbook.killCriteria).toEqual(["a step fails twice"]);
  });

  it("merges inherited playbooks without losing explicit overrides", () => {
    const base = parsePlaybookMarkdown(baseMarkdown, {
      sourcePath: "/repo/templates/base.md",
    });
    const child = parsePlaybookMarkdown(childMarkdown, {
      sourcePath: "/repo/playbooks/child.md",
    });

    const merged = mergePlaybooks(base, child);

    expect(merged.objective).toBe(
      "Normalize import paths and update snapshots.",
    );
    expect(merged.inheritedTemplate).toBe("./templates/base.md");
    expect(merged.variables).toEqual({
      repo_root: "/repo",
      branch: "feature/refactor",
      snapshot_mode: "write",
    });
    expect(merged.preconditions).toEqual([
      "repo is clean",
      "tests are green",
      "worktree is isolated",
    ]);
    expect(merged.steps).toHaveLength(2);
    expect(merged.steps[0]).toEqual({
      name: "Lint fix",
      command: "npm run lint:fix -- --cache",
      cwd: "{{repo_root}}",
      retries: 2,
      timeoutSeconds: 60,
    });
    expect(merged.steps[1].name).toBe("Update snapshots");
  });

  it("interpolates placeholders in step names, commands, and cwd", () => {
    const playbook = parsePlaybookMarkdown(baseMarkdown, {
      sourcePath: "/repo/playbooks/base.md",
    });

    const interpolated = interpolatePlaybook(playbook, {
      repo_root: "/Users/olegkoval/projects/app",
      branch: "main",
    });

    expect(interpolated.steps[0]).toEqual({
      name: "Lint fix",
      command: "npm run lint:fix",
      cwd: "/Users/olegkoval/projects/app",
      retries: 1,
      timeoutSeconds: 45,
    });
    expect(interpolated.variables).toEqual({
      repo_root: "/repo",
      branch: "main",
    });
  });
});
