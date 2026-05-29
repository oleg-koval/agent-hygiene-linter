# Prompt: AI refactor playbook runner

Build a small MVP that makes codebase-wide refactors cheap, repeatable, and safe.

## Context

AI agents make refactors much cheaper than before, which means teams should do more cleanup instead of letting tech debt pile up. I want a reusable markdown-driven playbook runner that can execute a refactor plan step by step with retries, timeouts, and clear reporting.

## Goal

Create a tool that reads a markdown refactor playbook, expands placeholders, executes each step, and reports progress and failures in a way that makes refactors easy to repeat.

## Non-goals

- No general-purpose workflow engine
- No full IDE integration
- No monorepo orchestration system
- No production deployment pipeline
- No GUI unless the MVP absolutely needs it

## Suggested stack

Use TypeScript and a CLI-first approach. Prefer the `ts-npm-starter` pattern if starting from scratch.

## Core requirements

- Read reusable markdown specs
- Support `{{placeholder}}` interpolation in step names, commands, and cwd
- Support per-step retries
- Support per-step timeout_seconds
- Support `--dry-run`
- Support `--resume`
- Produce better timeout reporting in results
- Support clean merge behavior for inherited specs
- Keep the runner deterministic and easy to reason about

## User flow

1. User writes a refactor playbook in markdown.
2. Tool parses the playbook and resolves inherited sections.
3. Tool interpolates placeholders.
4. Tool runs each step with the configured retry and timeout policy.
5. If a step fails or times out, the user gets a clear result.
6. If the run is interrupted, the user can resume from the last successful step.

## Proposed markdown shape

- Title
- Objective
- Preconditions
- Inherited template
- Variables
- Steps
- Validation
- Rollback
- Success criteria
- Kill criteria

## Example use cases

- Rename a domain concept across a codebase
- Replace a repeated pattern across multiple files
- Sweep a new convention through the repo
- Standardize a refactor with a repeatable playbook

## Acceptance criteria

- Can run a sample refactor playbook end to end
- Can dry-run without executing commands
- Can resume after interruption
- Can report timeouts clearly with step context
- Can merge inherited templates without losing explicit overrides
- Can interpolate placeholders in all supported fields

## Tests

- Unit tests for markdown parsing and inheritance merge logic
- Unit tests for placeholder interpolation
- Integration test for a complete playbook run
- Regression test for timeout and resume behavior

## Deliverable

Build the MVP as a small CLI with example playbooks and tests. Keep it focused on refactor orchestration, not a generic workflow platform.

## Prompt for the coding agent

Implement this from scratch as a compact CLI MVP. Start with the markdown schema and inheritance model, then add execution, retries, and timeout handling, then finish with dry-run and resume support. Do not broaden the scope beyond repeatable refactor execution unless it is required to validate the MVP.
