import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { scanRepository } from "../src/index.js";

const cleanup: string[] = [];

afterEach(async () => {
  while (cleanup.length > 0) {
    const path = cleanup.pop();
    if (path !== undefined) {
      await rm(path, { recursive: true, force: true });
    }
  }
});

async function initGitRepo(root: string): Promise<void> {
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "tester@example.com"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "Tester"], {
    cwd: root,
    stdio: "ignore",
  });
}

describe("scanRepository", () => {
  it("scores a repo with strong hygiene signals", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-"));
    cleanup.push(root);

    await initGitRepo(root);
    await writeFile(join(root, "README.md"), "# Repo\n", "utf8");
    await writeFile(join(root, "AGENTS.md"), "# Agent notes\n", "utf8");
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "guide.md"), "# Guide\n", "utf8");
    await writeFile(join(root, "CHANGELOG.md"), "# Changelog\n", "utf8");
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          scripts: {
            build: "tsup",
            test: "vitest",
            lint: "eslint",
            ci: "npm run test",
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "index.ts"), "export {};\n", "utf8");
    await writeFile(join(root, "note.txt"), "hello\n", "utf8");
    execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "feat: add repo hygiene docs"], {
      cwd: root,
      stdio: "ignore",
    });

    const report = await scanRepository(root);
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.counts.fixNow).toBe(0);
    expect(
      report.findings.some((finding) => finding.code === "agent-doc-present"),
    ).toBe(true);
  });

  it("does not penalize Python repos for Node-specific checks", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-python-"));
    cleanup.push(root);

    await initGitRepo(root);
    await writeFile(join(root, "README.md"), "# sample\\n", "utf8");
    await writeFile(join(root, "AGENTS.md"), "# Instructions\\n", "utf8");
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "guide.md"), "# Guide\\n", "utf8");
    await writeFile(join(root, "CHANGELOG.md"), "# Changelog\\n", "utf8");
    await writeFile(
      join(root, "pyproject.toml"),
      "[project]\\nname = 'sample'\\n",
      "utf8",
    );
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "main.py"), "print('hello')\\n", "utf8");
    execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "feat: add python sample"], {
      cwd: root,
      stdio: "ignore",
    });

    const report = await scanRepository(root);
    const packageScripts = report.findings.find(
      (finding) =>
        finding.code.startsWith("package-") ||
        finding.code === "package-json-missing",
    );
    const entrypoint = report.findings.find((finding) =>
      finding.code.startsWith("entrypoint-"),
    );

    expect(packageScripts?.bucket).toBe("not applicable");
    expect(packageScripts?.code).toBe("package-scripts-not-applicable");
    expect(entrypoint?.code).toBe("entrypoint-present");
    expect(report.score).toBe(100);
  });

  it("recognizes Go and Rust entrypoints without npm scripts", async () => {
    const goRoot = await mkdtemp(join(tmpdir(), "agent-hygiene-go-"));
    cleanup.push(goRoot);
    await initGitRepo(goRoot);
    await writeFile(join(goRoot, "go.mod"), "module example\\n", "utf8");
    await writeFile(join(goRoot, "main.go"), "package main\\n", "utf8");

    const rustRoot = await mkdtemp(join(tmpdir(), "agent-hygiene-rust-"));
    cleanup.push(rustRoot);
    await initGitRepo(rustRoot);
    await writeFile(
      join(rustRoot, "Cargo.toml"),
      "[package]\\nname = 'sample'\\n",
      "utf8",
    );
    await mkdir(join(rustRoot, "src"));
    await writeFile(
      join(rustRoot, "src", "lib.rs"),
      "pub fn run() {}\\n",
      "utf8",
    );

    for (const root of [goRoot, rustRoot]) {
      const report = await scanRepository(root);
      expect(
        report.findings.find(
          (finding) => finding.code === "entrypoint-present",
        ),
      ).toBeDefined();
      expect(
        report.findings.find(
          (finding) => finding.code === "package-scripts-not-applicable",
        ),
      ).toBeDefined();
    }
  });

  it("flags a repo that is missing the basics", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-messy-"));
    cleanup.push(root);

    await initGitRepo(root);
    await writeFile(join(root, "notes.txt"), "nothing useful\n", "utf8");
    execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "update stuff"], {
      cwd: root,
      stdio: "ignore",
    });

    const report = await scanRepository(root);
    expect(report.score).toBeLessThanOrEqual(70);
    expect(report.counts.fixNow).toBeGreaterThan(0);
    expect(
      report.findings.some((finding) => finding.code === "readme-missing"),
    ).toBe(true);
  });
});
