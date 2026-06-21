import { basename, join } from "node:path";
import { exists, readPackageScripts } from "./hygiene-checks.js";
import { scanRepository } from "./hygiene-scan.js";
import {
  renderAgents,
  renderChangelog,
  renderDocsReadme,
  renderReadme,
} from "./fix-templates.js";
import { createIfAbsent } from "./fix-writer.js";
import type { FixFacts, FixResult } from "./hygiene-types.js";

interface Fixer {
  code: string;
  relPath: string;
  render: (facts: FixFacts) => string;
}

// Only findings that can be closed by creating a file from scan facts alone.
const FIXERS: Fixer[] = [
  { code: "readme-missing", relPath: "README.md", render: renderReadme },
  { code: "agent-doc-missing", relPath: "AGENTS.md", render: renderAgents },
  {
    code: "docs-shape-missing",
    relPath: "docs/README.md",
    render: () => renderDocsReadme(),
  },
  {
    code: "changelog-missing",
    relPath: "CHANGELOG.md",
    render: () => renderChangelog(),
  },
];

async function detectPackageManager(repoPath: string): Promise<string> {
  if (await exists(join(repoPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (await exists(join(repoPath, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

async function detectEntrypoint(repoPath: string): Promise<string | null> {
  for (const rel of ["src/index.ts", "index.ts", "main.ts"]) {
    if (await exists(join(repoPath, rel))) {
      return rel;
    }
  }
  return null;
}

export async function gatherFixFacts(repoPath: string): Promise<FixFacts> {
  return {
    repoName: basename(repoPath) || repoPath,
    packageManager: await detectPackageManager(repoPath),
    scripts: await readPackageScripts(repoPath),
    entrypoint: await detectEntrypoint(repoPath),
  };
}

export async function applyFixes(
  repoPath: string,
  options: { dryRun: boolean },
): Promise<FixResult> {
  const before = await scanRepository(repoPath);
  const codes = new Set(before.findings.map((finding) => finding.code));
  const facts = await gatherFixFacts(repoPath);

  const planned: string[] = [];
  const written: string[] = [];

  for (const fixer of FIXERS) {
    if (!codes.has(fixer.code)) {
      continue;
    }
    const target = join(repoPath, fixer.relPath);
    if (await exists(target)) {
      continue;
    }
    planned.push(fixer.relPath);
    if (!options.dryRun) {
      const created = await createIfAbsent(target, fixer.render(facts));
      if (created) {
        written.push(fixer.relPath);
      }
    }
  }

  const after = options.dryRun ? before : await scanRepository(repoPath);
  return { before, after, planned, written };
}
