import { describe, expect, it } from "vitest";
import { parseCliArgs, renderJsonReport } from "../src/index.js";
import type { HygieneReport } from "../src/hygiene-types.js";

describe("json output", () => {
  it("renders valid json for the report", () => {
    const report: HygieneReport = {
      repoPath: "/tmp/example",
      repoName: "example",
      scannedAt: "2026-06-14T09:00:00.000Z",
      score: 80,
      counts: { good: 1, warning: 1, fixNow: 0 },
      findings: [],
    };

    expect(JSON.parse(renderJsonReport(report))).toEqual(report);
  });

  it("keeps unknown flags from breaking parseCliArgs", () => {
    expect(parseCliArgs(["--unknown", "value", "/tmp/repo"])).toEqual({
      repoPath: "/tmp/repo",
      format: "text",
      minScore: 75,
      fix: false,
      dryRun: false,
    });
  });
});
