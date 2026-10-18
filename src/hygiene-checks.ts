import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
  HygieneBucket,
  HygieneCounts,
  HygieneFinding,
} from "./hygiene-types.js";

const CONVENTIONAL_COMMIT =
  /^(feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert)(\([^)]+\))?: .+/u;

export function makeFinding(
  code: string,
  bucket: HygieneBucket,
  title: string,
  detail: string,
): HygieneFinding {
  return { code, bucket, title, detail };
}

export function countBuckets(findings: HygieneFinding[]): HygieneCounts {
  return findings.reduce<HygieneCounts>(
    (accumulator, finding) => {
      if (finding.bucket === "good") {
        accumulator.good += 1;
      } else if (finding.bucket === "warning") {
        accumulator.warning += 1;
      } else if (finding.bucket === "fix now") {
        accumulator.fixNow += 1;
      } else {
        accumulator.notApplicable += 1;
      }
      return accumulator;
    },
    { good: 0, warning: 0, fixNow: 0, notApplicable: 0 },
  );
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function listMarkdownFiles(
  root: string,
  limitDepth: number,
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > limitDepth) {
      return;
    }

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath, depth + 1);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(nextPath);
      }
    }
  }

  if (await exists(root)) {
    await walk(root, 0);
  }

  return results;
}

export async function detectEcosystems(root: string): Promise<Set<string>> {
  const markers: Record<string, string[]> = {
    node: [
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "tsconfig.json",
      "src/index.ts",
      "index.ts",
      "main.ts",
      "src/index.js",
      "index.js",
      "main.js",
    ],
    python: [
      "pyproject.toml",
      "setup.py",
      "setup.cfg",
      "requirements.txt",
      "Pipfile",
    ],
    go: ["go.mod"],
    rust: ["Cargo.toml"],
  };
  const detected = new Set<string>();
  for (const [ecosystem, paths] of Object.entries(markers)) {
    for (const path of paths) {
      if (await exists(join(root, path))) {
        detected.add(ecosystem);
        break;
      }
    }
  }
  return detected;
}

export async function findEntrypoint(
  root: string,
  ecosystems: Set<string>,
): Promise<string | null> {
  const candidates: Record<string, string[]> = {
    node: [
      "src/index.ts",
      "index.ts",
      "main.ts",
      "src/index.js",
      "index.js",
      "main.js",
    ],
    python: ["main.py", "src/main.py", "__main__.py", "src/__main__.py"],
    go: ["main.go", "cmd/main.go"],
    rust: ["src/main.rs", "src/lib.rs"],
  };
  for (const ecosystem of ecosystems) {
    for (const candidate of candidates[ecosystem] ?? []) {
      if (await exists(join(root, candidate))) return candidate;
    }
  }
  return null;
}

export async function readPackageScripts(root: string): Promise<string[]> {
  const packagePath = join(root, "package.json");
  if (!(await exists(packagePath))) {
    return [];
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    scripts?: Record<string, unknown>;
  };

  return Object.keys(packageJson.scripts ?? {});
}

export function collectCommitSubjects(root: string): string[] {
  try {
    const output = execFileSync(
      "git",
      ["-C", root, "log", "--pretty=%s", "-n", "25"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

export function classifyCommitStyle(subjects: string[]): {
  ratio: number | null;
  findings: HygieneFinding[];
} {
  if (subjects.length === 0) {
    return {
      ratio: null,
      findings: [
        makeFinding(
          "commit-history-missing",
          "warning",
          "No commit history found",
          "Git history was unavailable, so commit hygiene could not be scored.",
        ),
      ],
    };
  }

  const conventionalCount = subjects.filter((subject) =>
    CONVENTIONAL_COMMIT.test(subject),
  ).length;
  const ratio = conventionalCount / subjects.length;

  if (ratio >= 0.7) {
    return {
      ratio,
      findings: [
        makeFinding(
          "commit-style-good",
          "good",
          "Commit style is consistent",
          `${String(conventionalCount)} of ${String(subjects.length)} recent commits follow Conventional Commits.`,
        ),
      ],
    };
  }

  if (ratio >= 0.4) {
    return {
      ratio,
      findings: [
        makeFinding(
          "commit-style-mixed",
          "warning",
          "Commit style is mixed",
          `${String(conventionalCount)} of ${String(subjects.length)} commits are conventional. Cleanup would make release automation less noisy.`,
        ),
      ],
    };
  }

  return {
    ratio,
    findings: [
      makeFinding(
        "commit-style-weak",
        "fix now",
        "Commit style is too vague",
        `${String(conventionalCount)} of ${String(subjects.length)} recent commits are conventional. Use a small commit template before automation gets confused.`,
      ),
    ],
  };
}
