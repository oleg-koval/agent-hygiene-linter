import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const githubPluginEntry = require.resolve("@semantic-release/github");
const githubPluginFailPath = resolve(dirname(githubPluginEntry), "lib/fail.js");
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportsGitHubPlugin =
  (nodeMajor === 22 && nodeMinor >= 14) ||
  (nodeMajor === 24 && nodeMinor >= 10) ||
  nodeMajor > 24;

describe("semantic-release GitHub failure reporting", () => {
  it.skipIf(!supportsGitHubPlugin)(
    "searches existing failure issues with the repository owner and name",
    async () => {
      const { default: failRelease } = await import(
        pathToFileURL(githubPluginFailPath).href
      );
      let graphQlVariables: Record<string, unknown> | undefined;

      class TestOctokit {
        request = vi.fn(async () => ({
          data: { full_name: "oleg-koval/agent-hygiene-linter" },
        }));

        graphql = vi.fn(
          async (_query: string, variables: Record<string, unknown>) => {
            graphQlVariables = variables;
            return { repository: { issues: { nodes: [] } } };
          },
        );
      }

      await failRelease(
        {},
        {
          options: {
            repositoryUrl:
              "https://github.com/oleg-koval/agent-hygiene-linter.git",
          },
          branch: { name: "main" },
          errors: [new Error("npm authentication failed")],
          logger: { log: vi.fn(), warn: vi.fn() },
          env: { GITHUB_TOKEN: "test-token" },
        },
        { Octokit: TestOctokit },
      );

      expect(graphQlVariables?.owner).toBe("oleg-koval");
      expect(graphQlVariables?.repo).toBe("agent-hygiene-linter");
    },
  );
});
