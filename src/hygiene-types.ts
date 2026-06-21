export type HygieneBucket = "good" | "warning" | "fix now";

export interface HygieneFinding {
  code: string;
  bucket: HygieneBucket;
  title: string;
  detail: string;
}

export interface HygieneCounts {
  good: number;
  warning: number;
  fixNow: number;
}

export interface HygieneReport {
  repoPath: string;
  repoName: string;
  scannedAt: string;
  score: number;
  counts: HygieneCounts;
  findings: HygieneFinding[];
}

export interface CliOptions {
  repoPath: string;
  format: "text" | "markdown" | "json";
  outputPath?: string;
  minScore: number;
  fix: boolean;
  dryRun: boolean;
}

export interface FixFacts {
  repoName: string;
  packageManager: string;
  scripts: string[];
  entrypoint: string | null;
}

export interface FixResult {
  before: HygieneReport;
  after: HygieneReport;
  planned: string[];
  written: string[];
}
