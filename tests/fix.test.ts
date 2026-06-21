import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyFixes } from "../src/fix.js";

const dirs: string[] = [];

async function messyRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "hygiene-fix-"));
  dirs.push(dir);
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ scripts: { build: "tsup", test: "vitest run" } }),
    "utf8",
  );
  return dir;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true })));
});

describe("applyFixes", () => {
  it("creates the four fixable files and raises the score", async () => {
    const dir = await messyRepo();
    const result = await applyFixes(dir, { dryRun: false });

    expect(result.written.sort()).toEqual([
      "AGENTS.md",
      "CHANGELOG.md",
      "README.md",
      "docs/README.md",
    ]);
    expect(result.after.score).toBeGreaterThan(result.before.score);
    expect(await fileExists(join(dir, "README.md"))).toBe(true);
    expect(await fileExists(join(dir, "docs", "README.md"))).toBe(true);
  });

  it("is idempotent — a second run writes nothing", async () => {
    const dir = await messyRepo();
    await applyFixes(dir, { dryRun: false });
    const second = await applyFixes(dir, { dryRun: false });

    expect(second.written).toEqual([]);
    expect(second.planned).toEqual([]);
  });

  it("dry-run plans the files but writes nothing", async () => {
    const dir = await messyRepo();
    const result = await applyFixes(dir, { dryRun: true });

    expect(result.planned.length).toBe(4);
    expect(result.written).toEqual([]);
    expect(await fileExists(join(dir, "README.md"))).toBe(false);
  });

  it("never overwrites an existing README", async () => {
    const dir = await messyRepo();
    await writeFile(join(dir, "README.md"), "# Keep me", "utf8");
    await applyFixes(dir, { dryRun: false });

    const { readFile } = await import("node:fs/promises");
    expect(await readFile(join(dir, "README.md"), "utf8")).toBe("# Keep me");
  });
});
