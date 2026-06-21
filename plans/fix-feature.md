# Feature scope: `--fix`

> Status: proposed, not built. The 10x that turns a niche linter into
> "make any repo agent-ready in one command."

## Why

Linters that only complain die. Linters that auto-fix get adopted. Today
`agent-hygiene-linter` reports seven findings and a score. `--fix` makes it
_close_ the gaps it can close safely, so a 46/100 repo becomes 90+/100 in one run.

## Principle: only fix what is safe and deterministic

A fix is in-scope only if it can be generated from a repo scan with zero
guesswork and zero risk of clobbering author intent. Each fixer:

- only ever **creates** a missing file or **appends** to a clearly-owned one
- **never** overwrites an existing file
- **never** rewrites code or git history
- is **idempotent** — running `--fix` twice changes nothing the second time

## Which findings are fixable

| Finding code              | Fixable? | Action                                                                                                                               |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `readme-missing`          | Yes      | Scaffold a minimal `README.md` from repo name + detected scripts                                                                     |
| `agent-doc-missing`       | Yes      | Generate `AGENTS.md` from detected package manager, scripts, entrypoint, test runner                                                 |
| `docs-shape-missing`      | Yes      | Create `docs/README.md` stub linking back to the root README                                                                         |
| `changelog-missing`       | Yes      | Create `CHANGELOG.md` with a Keep-a-Changelog header + `[Unreleased]`                                                                |
| `package-scripts-missing` | Partial  | Only suggest in report; editing `package.json` scripts is too opinionated to auto-write. Print the recommended scripts block instead |
| `commit-style-weak`       | No       | Cannot rewrite history. Print guidance + a sample `.gitmessage` template (do not install it)                                         |
| `entrypoint-missing`      | No       | Cannot guess the main surface. Report only                                                                                           |

So `--fix` writes at most 4 files: `README.md`, `AGENTS.md`, `docs/README.md`,
`CHANGELOG.md`. Everything else stays advisory.

## Content generation (deterministic, from scan facts)

The scanner already collects the facts the generators need. Reuse them:

- **`AGENTS.md`** — from `readPackageScripts()` (which scripts exist → which
  commands to document) + detected entrypoint + detected package manager
  (presence of `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`). No LLM call.
- **`README.md`** — repo name (from path), one-line description placeholder,
  install/run section built from the same script list.
- **`CHANGELOG.md`** — static Keep-a-Changelog skeleton.
- **`docs/README.md`** — static stub.

Templates live in a new `src/fix-templates.ts`. Pure functions:
`(facts) => string`. No side effects until the writer runs.

## CLI surface

```bash
agent-hygiene-linter . --fix            # apply safe fixes, then re-scan and report
agent-hygiene-linter . --fix --dry-run  # print what WOULD be written, write nothing
```

Behavior:

- `--fix` runs scan → apply fixers for missing files → re-scan → print the new
  report and which files were created.
- Files that already exist are skipped silently (idempotent).
- Exit code still honors `--min-score` against the post-fix score.

## New `CliOptions` fields

```ts
export interface CliOptions {
  repoPath: string;
  format: "text" | "markdown" | "json";
  outputPath?: string;
  minScore: number;
  fix: boolean; // NEW — default false
  dryRun: boolean; // NEW — default false, only meaningful with fix
}
```

## File layout (respects 300-line cap)

- `src/fix.ts` — orchestrator: scan → pick fixable findings → write → re-scan
- `src/fix-templates.ts` — pure template functions, one per generated file
- `src/fix-writer.ts` — the only module that touches the filesystem (create-if-absent)
- `src/cli.ts` — add `--fix` / `--dry-run` parsing + branch into `fix.ts`
- `src/index.ts` — export `applyFixes` for programmatic use
- `tests/fix.test.ts` — E2E: messy temp repo → `--fix` → assert files created,
  score rose, second run is a no-op (idempotency)

## Acceptance criteria

1. `--fix` on a repo missing all four fixable files creates exactly those four
   and raises the score by the expected deductions (4 × 8 + 2 × 18 recovered as applicable).
2. `--fix` is idempotent: a second run writes nothing.
3. `--fix` never overwrites an existing README/AGENTS.md/CHANGELOG.
4. `--fix --dry-run` writes nothing and lists the planned files.
5. Generated `AGENTS.md` documents only scripts that actually exist.
6. No new runtime dependencies.

## Out of scope (explicitly)

- LLM-generated prose (keep it deterministic and offline for v1)
- Editing `package.json`
- Rewriting commit history or installing git hooks
- Touching source code or the entrypoint

## Effort

Small. The scanner already produces the findings; this adds three pure-ish
modules plus CLI wiring and one E2E test. ~1 focused session.
