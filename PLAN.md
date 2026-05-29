# AI Refactor Playbook Runner Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a markdown-driven refactor runner that executes repeatable codebase cleanup playbooks with retries, timeouts, inheritance, dry-run, and resume.

**Architecture:** CLI-first executor. Parse a markdown playbook into a canonical model, merge inherited templates, expand placeholders, run steps deterministically, and emit structured step results. The focus is repeatable refactors, not a general workflow engine.

**Tech Stack:** TypeScript, Node.js, starter repo from `ts-npm-starter`, Vitest, ESLint, Prettier, tsup.

---

### Task 1: Scaffold the CLI package

**Objective:** Create the starter repo and basic command entrypoint.

**Files:**

- Create: `package.json`
- Create: `src/index.ts`
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

**Step 1: Write failing test**

- Assert the CLI prints help and accepts a playbook path.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: fail because the CLI does not exist yet.

**Step 3: Write minimal implementation**

- Add a tiny parser and a placeholder handler.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 2: Define the markdown playbook schema

**Objective:** Parse objective, preconditions, inherited template, variables, steps, validation, rollback, success criteria, and kill criteria.

**Files:**

- Create: `src/spec/parse.ts`
- Create: `src/spec/types.ts`
- Create: `tests/spec-parse.test.ts`

**Step 1: Write failing test**

- Parse a sample playbook and assert the structured output.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: parser fails or returns incomplete data.

**Step 3: Write minimal implementation**

- Add markdown parsing for the core sections.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 3: Add inheritance merge logic

**Objective:** Merge a base template with a child playbook without losing explicit overrides.

**Files:**

- Create: `src/spec/merge.ts`
- Create: `tests/spec-merge.test.ts`

**Step 1: Write failing test**

- Verify inherited fields merge correctly and child overrides win.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: merge logic missing.

**Step 3: Write minimal implementation**

- Add deterministic merge behavior for inherited specs.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 4: Add placeholder interpolation

**Objective:** Expand `{{placeholder}}` values in step names, commands, and cwd.

**Files:**

- Create: `src/runtime/interpolate.ts`
- Create: `tests/interpolate.test.ts`

**Step 1: Write failing test**

- Assert placeholders expand in all supported fields.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: interpolation tests fail.

**Step 3: Write minimal implementation**

- Add placeholder replacement with plain string substitution.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 5: Implement step execution with retries and timeouts

**Objective:** Execute steps sequentially and surface clear timeout reporting.

**Files:**

- Create: `src/runtime/runner.ts`
- Create: `tests/runner.test.ts`

**Step 1: Write failing test**

- Verify step retries happen and timeout errors include step context.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: fails until execution logic exists.

**Step 3: Write minimal implementation**

- Add step execution, retry policy, and timeout handling.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 6: Add dry-run and resume

**Objective:** Support preview mode and resuming from the last successful step.

**Files:**

- Modify: `src/cli.ts`
- Modify: `src/runtime/runner.ts`
- Create: `tests/dry-run.test.ts`
- Create: `tests/resume.test.ts`

**Step 1: Write failing test**

- Verify dry-run prints the plan without executing commands.
- Verify resume restarts from the correct step.

**Step 2: Run test to verify failure**

- Run: `npm test`
- Expected: fail until the flags exist.

**Step 3: Write minimal implementation**

- Add `--dry-run` and `--resume` behavior.

**Step 4: Run test to verify pass**

- Run: `npm test`
- Expected: pass.

### Task 7: Add examples and docs

**Objective:** Make the runner usable without reading source.

**Files:**

- Modify: `README.md`
- Create: `examples/base-template.md`
- Create: `examples/usage-demo.md`

**Step 1: Write example playbooks**

- Add one inherited template and one demo playbook.

**Step 2: Update README**

- Document the schema, flags, and one-command usage.

**Step 3: Verify**

- Run the CLI against the example playbooks.
- Expected: dry-run works, execution works, resume works.
