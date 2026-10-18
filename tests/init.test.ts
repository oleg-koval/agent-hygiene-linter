import { describe, expect, it } from "vitest";
import { renderMarkdownReport, renderTextReport } from "../src/index.js";
import type { HygieneReport } from "../src/hygiene-types.js";

const report: HygieneReport = {
  repoPath: "/tmp/repo",
  repoName: "repo",
  scannedAt: "2026-06-14T09:00:00.000Z",
  score: 88,
  counts: { good: 4, warning: 1, fixNow: 0, notApplicable: 0 },
  findings: [
    {
      code: "readme-present",
      bucket: "good",
      title: "README exists",
      detail: "The repo has a top-level README for quick orientation.",
    },
    {
      code: "agent-doc-present",
      bucket: "good",
      title: "Agent instructions exist",
      detail: "Found repo-level instructions for agent onboarding.",
    },
    {
      code: "docs-shape-present",
      bucket: "good",
      title: "Docs directory is navigable",
      detail: "Found 3 Markdown doc(s) under docs/.",
    },
    {
      code: "changelog-missing",
      bucket: "warning",
      title: "No changelog found",
      detail:
        "Add CHANGELOG.md or another update log if dependency churn matters here.",
    },
    {
      code: "entrypoint-present",
      bucket: "good",
      title: "An obvious entrypoint exists",
      detail: "Found a clear code entrypoint for navigation.",
    },
  ],
};

describe("report renderers", () => {
  it("renders markdown with bucket summary and issues", () => {
    const markdown = renderMarkdownReport(report);
    expect(markdown).toContain("# Agent Hygiene Linter");
    expect(markdown).toContain("Good: 4");
    expect(markdown).toContain("No changelog found");
  });

  it("renders text output", () => {
    const text = renderTextReport(report);
    expect(text).toContain("Agent hygiene score: 88/100");
    expect(text).toContain("[warning] No changelog found");
  });
});
