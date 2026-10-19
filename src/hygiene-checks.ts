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
  applicability?: HygieneFinding["applicability"],
): HygieneFinding {
  return applicability === undefined
    ? { code, bucket, title, detail }
    : { code, bucket, title, detail, applicability };
}

export function countBuckets(findings: HygieneFinding[]): HygieneCounts {
  return findings.reduce<HygieneCounts>(
    (accumulator, finding) => {
      if (finding.applicability === "not-applicable") {
        accumulator.notApplicable = (accumulator.notApplicable ?? 0) + 1;
      } else if (finding.bucket === "good") {
        accumulator.good += 1;
      } else if (finding.bucket === "warning") {
        accumulator.warning += 1;
      } else {
        accumulator.fixNow += 1;
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
