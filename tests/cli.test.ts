import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { isEntrypoint } from "../src/cli.js";
import { parseCliArgs } from "../src/index.js";

describe("parseCliArgs", () => {
  it("parses repo path, format, output, and score threshold", () => {
    expect(
      parseCliArgs([
        "/tmp/repo",
        "--format",
        "markdown",
        "--output",
        "report.md",
        "--min-score",
        "82",
      ]),
    ).toEqual({
      repoPath: "/tmp/repo",
      format: "markdown",
      outputPath: "report.md",
      minScore: 82,
      fix: false,
      dryRun: false,
    });
  });

  it("defaults to the current directory and text output", () => {
    expect(parseCliArgs([])).toEqual({
      repoPath: process.cwd(),
      format: "text",
      minScore: 75,
      fix: false,
      dryRun: false,
    });
  });

  it("parses --fix and --dry-run flags", () => {
    expect(parseCliArgs(["/tmp/repo", "--fix", "--dry-run"])).toEqual({
      repoPath: "/tmp/repo",
      format: "text",
      minScore: 75,
      fix: true,
      dryRun: true,
    });
  });
});

describe("isEntrypoint", () => {
  const dir = mkdtempSync(join(tmpdir(), "ahl-entry-"));
  const real = join(dir, "cli.js");
  const link = join(dir, "agent-hygiene-linter");
  const other = join(dir, "other.js");
  writeFileSync(real, "// stub\n");
  writeFileSync(other, "// stub\n");
  symlinkSync(real, link);
  const moduleUrl = pathToFileURL(real).href;

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("treats a bin symlink to the module as the entrypoint (npx/global install)", () => {
    // Regression: comparing without realpath() makes the CLI silently no-op.
    expect(isEntrypoint(link, moduleUrl)).toBe(true);
  });

  it("treats the real module path as the entrypoint", () => {
    expect(isEntrypoint(real, moduleUrl)).toBe(true);
  });

  it("is false when imported as a library (different invoker)", () => {
    expect(isEntrypoint(other, moduleUrl)).toBe(false);
  });

  it("is false when there is no invoker", () => {
    expect(isEntrypoint(undefined, moduleUrl)).toBe(false);
  });
});
