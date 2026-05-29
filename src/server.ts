import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { resolve } from "node:path";
import { loadPlaybookFile } from "./load.js";
import { parsePlaybookMarkdown } from "./parse.js";
import { renderHtml } from "./server-html.js";
import { runPlaybook } from "./runner.js";
import type {
  PlaybookRunResult,
  RunningServer,
  ServerOptions,
  ServerRunInput,
} from "./types.js";

async function readJsonBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  request.setEncoding("utf8");
  const textRequest: AsyncIterable<string> = request;
  let raw = "";
  for await (const chunk of textRequest) {
    raw += chunk;
  }

  if (raw.trim().length === 0) {
    return {};
  }

  return JSON.parse(raw) as Record<string, unknown>;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

async function runRequest(
  input: ServerRunInput,
  workspaceRoot: string,
  runner: ServerOptions["runner"],
): Promise<PlaybookRunResult> {
  if (runner !== undefined) {
    return runner(input);
  }

  const runOptions: Parameters<typeof runPlaybook>[1] = {
    cwd: input.cwd,
  };

  if (input.dryRun === true) {
    runOptions.dryRun = true;
  }

  if (input.resume === true) {
    runOptions.resume = true;
  }

  if (input.statePath !== undefined) {
    runOptions.statePath = input.statePath;
  }

  if (input.playbookPath !== undefined) {
    const resolved = resolve(workspaceRoot, input.playbookPath);
    const playbook = await loadPlaybookFile(resolved);
    return runPlaybook(playbook, runOptions);
  }

  const playbook = parsePlaybookMarkdown(input.playbookText ?? "", {
    sourcePath: resolve(workspaceRoot, "inline-playbook.md"),
  });
  return runPlaybook(playbook, runOptions);
}

export async function startServer(
  options: ServerOptions,
): Promise<RunningServer> {
  const server = createServer(async (request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderHtml());
      return;
    }

    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    if (request.url === "/api/run" && request.method === "POST") {
      try {
        const body = await readJsonBody(request);
        const input: ServerRunInput = {
          cwd: toStringValue(body.cwd) ?? options.workspaceRoot,
        };

        const playbookText = toStringValue(body.playbook);
        const playbookPath = toStringValue(body.playbookPath);
        const statePath = toStringValue(body.statePath);
        const dryRun = toBooleanValue(body.dryRun);
        const resume = toBooleanValue(body.resume);

        if (playbookText !== undefined) {
          input.playbookText = playbookText;
        }
        if (playbookPath !== undefined) {
          input.playbookPath = playbookPath;
        }
        if (statePath !== undefined) {
          input.statePath = statePath;
        }
        if (dryRun) {
          input.dryRun = true;
        }
        if (resume) {
          input.resume = true;
        }
        if (
          input.playbookText === undefined &&
          input.playbookPath === undefined
        ) {
          throw new Error("Provide either playbookPath or playbook markdown");
        }

        const runResult = await runRequest(
          input,
          options.workspaceRoot,
          options.runner,
        );
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify(runResult, null, 2));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        response.writeHead(400, {
          "content-type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify({ error: message }, null, 2));
      }
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  await new Promise<void>((resolvePromise) => {
    server.listen(options.port, options.host, resolvePromise);
  });

  const address = server.address();
  const port =
    typeof address === "object" && address !== null
      ? address.port
      : options.port;

  return {
    port,
    stop: async () => {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error !== undefined) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
      });
    },
  };
}
