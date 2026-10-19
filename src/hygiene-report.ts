import type { HygieneFinding, HygieneReport } from "./hygiene-types.js";

function sortFindings(findings: HygieneFinding[]): HygieneFinding[] {
  const rank: Record<HygieneFinding["bucket"], number> = {
    "fix now": 0,
    warning: 1,
    good: 2,
  };

  return [...findings].sort((left, right) => {
    if (left.applicability !== right.applicability) {
      return left.applicability === "not-applicable" ? 1 : -1;
    }
    const bucketDelta = rank[left.bucket] - rank[right.bucket];
    if (bucketDelta !== 0) {
      return bucketDelta;
    }
    return left.title.localeCompare(right.title);
  });
}

export function renderMarkdownReport(report: HygieneReport): string {
  const sortedFindings = sortFindings(report.findings);
  const lines = [
    `# Agent Hygiene Linter`,
    ``,
    `Repo: \`${report.repoName}\``,
    `Path: \`${report.repoPath}\``,
    `Score: **${String(report.score)}/100**`,
    `Scanned: ${report.scannedAt}`,
    ``,
    `## Bucket summary`,
    `- Good: ${String(report.counts.good)}`,
    `- Warning: ${String(report.counts.warning)}`,
    `- Fix now: ${String(report.counts.fixNow)}`,
    `- Not applicable: ${String(report.counts.notApplicable ?? 0)}`,
    ``,
    `## Findings`,
  ];

  for (const finding of sortedFindings) {
    lines.push(
      `- [${finding.applicability === "not-applicable" ? "not applicable" : finding.bucket}] **${finding.title}** - ${finding.detail}`,
    );
  }

  const topIssues = sortedFindings
    .filter(
      (finding) => finding.bucket === "warning" || finding.bucket === "fix now",
    )
    .slice(0, 5);
  if (topIssues.length > 0) {
    lines.push(``, `## Highest-impact fixes`);
    for (const finding of topIssues) {
      lines.push(`- ${finding.title}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderTextReport(report: HygieneReport): string {
  const lines = [
    `Agent hygiene score: ${String(report.score)}/100`,
    `Repo: ${report.repoName}`,
    `Path: ${report.repoPath}`,
    `Good: ${String(report.counts.good)} | Warning: ${String(report.counts.warning)} | Fix now: ${String(report.counts.fixNow)} | Not applicable: ${String(report.counts.notApplicable)}`,
    ``,
  ];

  for (const finding of sortFindings(report.findings)) {
    lines.push(
      `[${finding.applicability === "not-applicable" ? "not applicable" : finding.bucket}] ${finding.title}`,
    );
    lines.push(`  ${finding.detail}`);
  }

  return `${lines.join("\n")}\n`;
}

export function renderJsonReport(report: HygieneReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
