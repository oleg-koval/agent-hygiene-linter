import type { FixFacts } from "./hygiene-types.js";

const SCRIPT_DESCRIPTIONS: Record<string, string> = {
  build: "compile the project",
  test: "run the test suite",
  lint: "check code style",
  typecheck: "run the type checker",
  ci: "run the full quality gate",
  dev: "start the dev server",
  start: "run the built app",
};

const DOCUMENTED_ORDER = [
  "build",
  "test",
  "lint",
  "typecheck",
  "ci",
  "dev",
  "start",
];

function documentedScripts(facts: FixFacts): string[] {
  const present = new Set(facts.scripts);
  return DOCUMENTED_ORDER.filter((name) => present.has(name));
}

function describeScript(name: string): string {
  return SCRIPT_DESCRIPTIONS[name] ?? "run this script";
}

function usageLines(facts: FixFacts): string[] {
  const scripts = documentedScripts(facts);
  if (scripts.length === 0) {
    return ["## Usage", "", "Document how to run this project here.", ""];
  }

  const rows = scripts.map(
    (name) =>
      `- \`${facts.packageManager} run ${name}\` — ${describeScript(name)}`,
  );
  return ["## Usage", "", ...rows, ""];
}

export function renderReadme(facts: FixFacts): string {
  return [
    `# ${facts.repoName}`,
    "",
    "> One-line description of what this project does — replace this line.",
    "",
    "## Install",
    "",
    "```bash",
    `${facts.packageManager} install`,
    "```",
    "",
    ...usageLines(facts),
    "## License",
    "",
    "See [LICENSE](./LICENSE).",
    "",
  ].join("\n");
}

export function renderAgents(facts: FixFacts): string {
  const scripts = documentedScripts(facts);
  const commandLines =
    scripts.length === 0
      ? ["Document the project commands here."]
      : scripts.map(
          (name) =>
            `- \`${facts.packageManager} run ${name}\` — ${describeScript(name)}`,
        );

  const entrypointLine =
    facts.entrypoint === null
      ? "Document the main entry point here."
      : `Main surface: \`${facts.entrypoint}\`.`;

  return [
    "# Agent guide",
    "",
    "Repo-level instructions for AI agents and humans working in this project.",
    "",
    "## Commands",
    "",
    `Package manager: ${facts.packageManager}`,
    "",
    ...commandLines,
    "",
    "## Entry point",
    "",
    entrypointLine,
    "",
    "## Conventions",
    "",
    "- Use Conventional Commits for commit messages.",
    "- Keep changes small and covered by tests.",
    "",
  ].join("\n");
}

export function renderDocsReadme(): string {
  return [
    "# Documentation",
    "",
    "Project documentation lives here.",
    "Start with the [root README](../README.md).",
    "",
  ].join("\n");
}

export function renderChangelog(): string {
  return [
    "# Changelog",
    "",
    "All notable changes to this project are documented in this file.",
    "",
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)",
    "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
    "",
    "## [Unreleased]",
    "",
  ].join("\n");
}
