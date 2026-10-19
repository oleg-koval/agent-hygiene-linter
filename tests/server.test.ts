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

    expect(packageScripts?.applicability).toBe("not-applicable");
    expect(packageScripts?.code).toBe("package-scripts-not-applicable");
    expect(entrypoint?.code).toBe("entrypoint-present");
    expect(entrypoint?.detail).toContain("src/main.py");
    expect(report.score).toBe(100);
  });

  it("recognizes Go and Rust entrypoints without npm scripts", async () => {
    const goRoot = await mkdtemp(join(tmpdir(), "agent-hygiene-go-"));
    cleanup.push(goRoot);
    await initGitRepo(goRoot);
    await writeFile(join(goRoot, "go.mod"), "module example\\n", "utf8");
    await mkdir(join(goRoot, "cmd", "server"), { recursive: true });
    await writeFile(
      join(goRoot, "cmd", "server", "main.go"),
      "package main\\n",
      "utf8",
    );

    const rustRoot = await mkdtemp(join(tmpdir(), "agent-hygiene-rust-"));
    cleanup.push(rustRoot);
    await initGitRepo(rustRoot);
    await writeFile(
      join(rustRoot, "Cargo.toml"),
      "[package]\\nname = 'sample'\\n",
      "utf8",
    );
    await mkdir(join(rustRoot, "src", "bin"), { recursive: true });
    await writeFile(
      join(rustRoot, "src", "bin", "cli.rs"),
      "fn main() {}\\n",
      "utf8",
    );

    const goReport = await scanRepository(goRoot);
    const rustReport = await scanRepository(rustRoot);
    expect(
      goReport.findings.find((finding) => finding.code === "entrypoint-present")
        ?.detail,
    ).toContain("cmd/server/main.go");
    expect(
      rustReport.findings.find(
        (finding) => finding.code === "entrypoint-present",
      )?.detail,
    ).toContain("src/bin/cli.rs");
    for (const report of [goReport, rustReport]) {
      expect(
        report.findings.find(
          (finding) => finding.code === "package-scripts-not-applicable",
        ),
      ).toBeDefined();
    }
  });

  it("does not classify TypeScript configs and entrypoints alone as Node", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-deno-"));
    cleanup.push(root);
    await initGitRepo(root);
    await writeFile(join(root, "deno.json"), "{}\\n", "utf8");
    await writeFile(join(root, "tsconfig.json"), "{}\\n", "utf8");
    await writeFile(join(root, "main.ts"), "console.log('hello');\\n", "utf8");

    const report = await scanRepository(root);
    expect(
      report.findings.find(
        (finding) => finding.code === "package-scripts-not-applicable",
      )?.applicability,
    ).toBe("not-applicable");
    expect(
      report.findings.find(
        (finding) => finding.code === "entrypoint-not-applicable",
      )?.applicability,
    ).toBe("not-applicable");
  });

  it("recognizes Python library packages under src/<package>", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-python-lib-"));
    cleanup.push(root);
    await initGitRepo(root);
    await mkdir(join(root, "src", "sample_pkg"), { recursive: true });
    await writeFile(join(root, "src", "sample_pkg", "__init__.py"), "", "utf8");

    const report = await scanRepository(root);
    expect(
      report.findings.find((finding) => finding.code === "entrypoint-present")
        ?.detail,
    ).toContain("src/sample_pkg/__init__.py");
  });

  it("recognizes Node package entrypoints declared in package.json", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-node-library-"));
    cleanup.push(root);
    await initGitRepo(root);
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ exports: { ".": { import: "./lib/index.js" } } }),
      "utf8",
    );
    await mkdir(join(root, "lib"));
    await writeFile(join(root, "lib", "index.js"), "export {};\\n", "utf8");

    const report = await scanRepository(root);
    expect(
      report.findings.find((finding) => finding.code === "entrypoint-present")
        ?.detail,
    ).toContain("lib/index.js");
  });

  it("checks entrypoints independently for each detected ecosystem", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-hygiene-multistack-"));
    cleanup.push(root);
    await initGitRepo(root);
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { test: "node test.js" } }),
      "utf8",
    );
    await writeFile(join(root, "index.js"), "export {};\\n", "utf8");
    await writeFile(
      join(root, "pyproject.toml"),
      "[project]\\nname='demo'\\n",
      "utf8",
    );

    const report = await scanRepository(root);
    const nodeFinding = report.findings.find(
      (finding) =>
        finding.code === "entrypoint-present" &&
        finding.detail.includes("node"),
    );
    const pythonFinding = report.findings.find(
      (finding) =>
        finding.code === "entrypoint-missing" &&
        finding.detail.includes("python"),
    );
    expect(nodeFinding?.detail).toContain("index.js");
    expect(pythonFinding).toBeDefined();
  });

  it("detects standalone Python, Go, and Rust entrypoints", async () => {
    const fixtures = [
      { ecosystem: "python", file: "main.py", body: "print('hello')" },
      { ecosystem: "go", file: "main.go", body: "package main" },
      { ecosystem: "rust", file: "main.rs", body: "fn main() {}" },
    ];
    for (const fixture of fixtures) {
      const root = await mkdtemp(
        join(tmpdir(), `agent-hygiene-${fixture.ecosystem}-standalone-`),
      );
      cleanup.push(root);
      await writeFile(join(root, fixture.file), fixture.body, "utf8");
      const report = await scanRepository(root);
      expect(
        report.findings.find(
          (finding) =>
            finding.code === "entrypoint-present" &&
            finding.detail.includes(fixture.ecosystem),
        )?.detail,
      ).toContain(fixture.file);
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
