#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderJsonReport,
  renderMarkdownReport,
  renderTextReport,
} from "./hygiene-report.js";
import { scanRepository } from "./hygiene-scan.js";
import { applyFixes } from "./fix.js";
import type { CliOptions, HygieneReport } from "./hygiene-types.js";

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let repoPath = process.cwd();
  let format: CliOptions["format"] = "text";
  let outputPath: string | undefined;
  let minScore = 75;
  let fix = false;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }

    if (token === "--fix") {
      fix = true;
      continue;
    }

    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (token === "--format") {
      const next = args[index + 1];
      if (next === "json" || next === "markdown" || next === "text") {
        format = next;
      }
      index += 1;
      continue;
    }

    if (token === "--output") {
      outputPath = args[index + 1];
      index += 1;
      continue;
    }

    if (token === "--min-score") {
      minScore = parseNumber(args[index + 1], minScore);
      index += 1;
      continue;
    }

    if (!token.startsWith("--")) {
      repoPath = token;
    }
  }

  const parsed: CliOptions = { repoPath, format, minScore, fix, dryRun };
  if (outputPath !== undefined) {
    parsed.outputPath = outputPath;
  }
  return parsed;
}

function renderReport(
  report: HygieneReport,
  format: CliOptions["format"],
): string {
  return format === "json"
    ? renderJsonReport(report)
    : format === "markdown"
      ? renderMarkdownReport(report)
      : renderTextReport(report);
}

async function runFix(repoPath: string, args: CliOptions): Promise<void> {
  const result = await applyFixes(repoPath, { dryRun: args.dryRun });
  if (args.dryRun) {
    const lines =
      result.planned.length === 0
        ? ["Nothing to fix — no missing files this run."]
        : ["Would create:", ...result.planned.map((p) => `  + ${p}`)];
    console.log(lines.join("\n"));
  } else if (result.written.length > 0) {
    console.log(
      ["Created:", ...result.written.map((p) => `  + ${p}`)].join("\n"),
    );
  } else {
    console.log("Nothing to fix — no missing files this run.");
  }

  const report = args.dryRun ? result.before : result.after;
  process.stdout.write(renderReport(report, args.format));
  if (report.score < args.minScore) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const repoPath = resolve(process.cwd(), args.repoPath);

  if (args.fix) {
    await runFix(repoPath, args);
    return;
  }

  const report = await scanRepository(repoPath);
  const output = renderReport(report, args.format);

  if (args.outputPath !== undefined) {
    const resolvedOutput = resolve(dirname(repoPath), args.outputPath);
    await writeFile(resolvedOutput, output, "utf8");
    console.log(`Saved report to ${resolvedOutput}`);
  } else {
    process.stdout.write(output);
  }

  if (report.score < args.minScore) {
    process.exitCode = 1;
  }
}

const entryPoint =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (entryPoint !== undefined && fileURLToPath(import.meta.url) === entryPoint) {
  void main();
}
