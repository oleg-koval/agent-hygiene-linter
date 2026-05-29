import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mergePlaybooks } from "./merge.js";
import { parsePlaybookMarkdown } from "./parse.js";
import type { Playbook } from "./types.js";

async function loadRecursive(
  filePath: string,
  stack: string[],
): Promise<Playbook> {
  const absolutePath = resolve(filePath);
  if (stack.includes(absolutePath)) {
    throw new Error(`Circular inherited template detected: ${absolutePath}`);
  }

  const markdown = await readFile(absolutePath, "utf8");
  const parsed = parsePlaybookMarkdown(markdown, { sourcePath: absolutePath });
  if (parsed.inheritedTemplate === undefined) {
    return parsed;
  }

  const inheritedPath = resolve(
    dirname(absolutePath),
    parsed.inheritedTemplate,
  );
  const base = await loadRecursive(inheritedPath, [...stack, absolutePath]);
  return mergePlaybooks(base, parsed);
}

export async function loadPlaybookFile(filePath: string): Promise<Playbook> {
  return loadRecursive(filePath, []);
}
