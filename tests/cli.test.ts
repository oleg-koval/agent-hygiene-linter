import { describe, expect, it } from "vitest";
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
