import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { exists } from "./hygiene-checks.js";

/** Writes content only when the target is absent. Returns true if a file was created. */
export async function createIfAbsent(
  path: string,
  content: string,
): Promise<boolean> {
  if (await exists(path)) {
    return false;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return true;
}
