import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "../src/index.js";

let cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const dispose of cleanup.reverse()) {
    await dispose();
  }
  cleanup = [];
});

describe("server", () => {
  it("serves the web ui and runs playbooks over http", async () => {
    const root = await mkdtemp(join(tmpdir(), "playbook-server-"));
    const server = await startServer({
      host: "127.0.0.1",
      port: 0,
      workspaceRoot: root,
      runner: async () => ({
        status: "succeeded",
        title: "Demo",
        objective: "Demo objective",
        steps: [
          {
            name: "Only step",
            command: "echo ok",
            cwd: root,
            attempts: 1,
            finalStatus: "succeeded",
            stdout: "ok",
            stderr: "",
            exitCode: 0,
          },
        ],
      }),
    });

    cleanup.push(async () => {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    });

    const baseUrl = `http://127.0.0.1:${server.port}`;
    const home = await fetch(baseUrl);
    const html = await home.text();
    expect(home.status).toBe(200);
    expect(html).toContain("AI Refactor Playbook Runner");
    expect(html).toContain("Prepared data");
    expect(html).toContain('id="playbook-file"');
    expect(html).toContain("Smoke test");

    const response = await fetch(`${baseUrl}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playbook: `# Demo\n\n## Objective\nDemo objective\n\n## Steps\n1. Only step\n   - command: echo ok\n   - cwd: ${root}\n   - retries: 0\n   - timeout_seconds: 10\n`,
      }),
    });

    const payload = (await response.json()) as {
      status: string;
      title: string;
    };
    expect(response.status).toBe(200);
    expect(payload.status).toBe("succeeded");
    expect(payload.title).toBe("Demo");
  });
});
