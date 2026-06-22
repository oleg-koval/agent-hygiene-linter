<p align="center">
  <a href="./.github/workflows/ci.yml"><img src="https://github.com/oleg-koval/agent-hygiene-linter/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/oleg-koval/agent-hygiene-linter/releases"><img src="https://img.shields.io/github/v/release/oleg-koval/agent-hygiene-linter" alt="GitHub release"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://www.npmjs.com/package/agent-hygiene-linter"><img src="https://img.shields.io/npm/v/agent-hygiene-linter" alt="npm version"></a>
  <a href="https://github.com/marketplace/actions/agent-hygiene-linter"><img src="https://img.shields.io/badge/marketplace-agent--hygiene--linter-2088FF?logo=githubactions&logoColor=white" alt="GitHub Marketplace"></a>
</p>

<p align="center">
  <img src="./logo.svg" width="120" height="120" alt="Agent Hygiene Linter logo">
</p>

<h1 align="center">agent-hygiene-linter</h1>

<p align="center">
  Scan any repo and get a hygiene score in seconds<br>
  <strong>README · AGENTS.md · docs · changelog · scripts · commit style — all in one pass</strong>
</p>

---

## What it does

`agent-hygiene-linter` runs a quick structural audit of any repository and emits a score from 0–100 along with categorised findings: **good**, **warning**, or **fix now**.

It checks:

| Finding code                                                     | What it looks for                                  |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `readme-present` / `readme-missing`                              | Top-level `README.md`                              |
| `agent-doc-present` / `agent-doc-missing`                        | `AGENTS.md` or `CLAUDE.md`                         |
| `docs-shape-present` / `docs-shape-missing`                      | At least one `.md` file under `docs/`              |
| `changelog-present` / `changelog-missing`                        | `CHANGELOG.md` or `docs/changelog.md`              |
| `package-scripts-good` / `package-scripts-missing`               | Standard `build`, `test`, `lint`, `ci` npm scripts |
| `commit-style-good` / `commit-style-mixed` / `commit-style-weak` | Conventional Commits ratio over last 25 commits    |
| `entrypoint-present` / `entrypoint-missing`                      | `src/index.ts`, `index.ts`, or `main.ts`           |

**Scoring:** each `fix now` finding costs 18 points; each `warning` costs 8 points. Minimum score is 0.

## Install

```bash
npm install -g agent-hygiene-linter
```

Or run without installing:

```bash
npx agent-hygiene-linter <path>
```

## Usage

```bash
# Scan the current directory (text output)
agent-hygiene-linter .

# Scan a specific repo
agent-hygiene-linter /path/to/your/repo

# Markdown report
agent-hygiene-linter . --format markdown

# JSON report (for CI pipelines / dashboards)
agent-hygiene-linter . --format json

# Save report to a file
agent-hygiene-linter . --format markdown --output hygiene-report.md

# Fail with exit code 1 if score is below threshold (default: 75)
agent-hygiene-linter . --min-score 80

# Auto-create the missing files it can generate safely, then re-scan
agent-hygiene-linter . --fix

# Preview what --fix would create without writing anything
agent-hygiene-linter . --fix --dry-run
```

### `--fix`

`--fix` closes the gaps it can close from the repo scan alone — it scaffolds any
missing `README.md`, `AGENTS.md`, `docs/README.md`, and `CHANGELOG.md` from
detected facts (package manager, scripts, entrypoint), then re-scans and prints
the new score. It is deterministic and offline (no LLM), it **never overwrites**
an existing file, and it is idempotent — a second run writes nothing. Everything
it cannot generate safely (package scripts, commit history, the entrypoint) stays
advisory in the report.

## Example output

```
Agent hygiene score: 92/100
Repo: my-project
Path: /home/user/my-project
Good: 6 | Warning: 1 | Fix now: 0

[warning] Docs directory is thin
  Add a small docs/ tree or module notes so the repo is easier to navigate.
[good] Agent instructions exist
  Found repo-level instructions for agent onboarding.
[good] An obvious entrypoint exists
  Found a clear code entrypoint for navigation.
[good] Changelog or release notes exist
  The repo has a visible change log path for updates.
[good] Commit style is consistent
  14 of 14 recent commits follow Conventional Commits.
[good] Package scripts are predictable
  Found 4 of the expected build/test/lint/ci scripts.
[good] README exists
  The repo has a top-level README for quick orientation.
```

## CI integration

Add a hygiene gate to your pipeline:

```yaml
- name: Hygiene check
  run: npx agent-hygiene-linter . --min-score 75
```

Exit code `0` = score is at or above the threshold. Exit code `1` = below threshold.

## Use as a GitHub Action

Published on the [GitHub Actions Marketplace](https://github.com/marketplace/actions/agent-hygiene-linter). Add a hygiene gate without writing any shell:

```yaml
- uses: actions/checkout@v4
- uses: oleg-koval/agent-hygiene-linter@v1
  with:
    path: .
    min-score: 75
    format: text
```

The step fails when the score is below `min-score`.

| Input         | Default   | Description                                                        |
| ------------- | --------- | ------------------------------------------------------------------ |
| `path`        | `.`       | Repository path to lint.                                           |
| `min-score`   | `75`      | Minimum hygiene score (0-100); the step exits non-zero below this. |
| `format`      | `text`    | `text`, `markdown`, or `json`.                                     |
| `fix`         | `false`   | Set to `true` to scaffold missing hygiene files.                   |
| `output-file` | _(unset)_ | Also write the rendered report to this file.                       |
| `args`        | _(unset)_ | Extra raw CLI arguments appended verbatim.                         |
| `version`     | `latest`  | npm version or dist-tag of the CLI to run.                         |

## Programmatic API

```typescript
import { scanRepository, renderTextReport } from "agent-hygiene-linter";

const report = await scanRepository("/path/to/repo");
console.log(renderTextReport(report));
// report.score, report.findings, report.counts
```

## System requirements

- Node.js 20.10 or newer

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## License

MIT. See [LICENSE](./LICENSE).

## Author

Oleg Koval — [olegkoval.com](https://olegkoval.com)

---

<p align="center">
  <a href="https://oleg-koval.github.io/agent-hygiene-linter/">Website</a> ·
  <a href="https://github.com/oleg-koval/agent-hygiene-linter">GitHub</a> ·
  <a href="https://github.com/oleg-koval/agent-hygiene-linter/releases">Releases</a> ·
  <a href="https://github.com/oleg-koval/agent-hygiene-linter/issues">Issues</a>
</p>
