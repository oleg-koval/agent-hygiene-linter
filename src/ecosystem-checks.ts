import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { exists } from "./hygiene-checks.js";

export async function detectEcosystems(root: string): Promise<Set<string>> {
  const markers: Record<string, string[]> = {
    node: ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    python: [
      "pyproject.toml",
      "setup.py",
      "setup.cfg",
      "requirements.txt",
      "Pipfile",
      "main.py",
      "__main__.py",
      "src/main.py",
      "src/__main__.py",
    ],
    go: ["go.mod", "main.go"],
    rust: ["Cargo.toml", "src/main.rs", "src/lib.rs", "main.rs", "lib.rs"],
  };
  const detected = new Set<string>();
  for (const [ecosystem, paths] of Object.entries(markers)) {
    for (const path of paths) {
      if (await exists(join(root, path))) {
        detected.add(ecosystem);
        break;
      }
    }
  }

  const pythonSrc = join(root, "src");
  const pythonEntries = await readdir(pythonSrc, { withFileTypes: true }).catch(
    () => [],
  );
  if (
    pythonEntries.some((entry) => entry.isFile() && entry.name.endsWith(".py"))
  ) {
    detected.add("python");
  }
  for (const entry of pythonEntries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const packageEntries = await readdir(join(pythonSrc, entry.name), {
      withFileTypes: true,
    }).catch(() => []);
    if (
      packageEntries.some(
        (file) =>
          file.isFile() &&
          (file.name.endsWith(".py") || file.name === "__init__.py"),
      )
    ) {
      detected.add("python");
    }
  }
  return detected;
}

export async function findEntrypoint(
  root: string,
  ecosystem: string,
): Promise<string | null> {
  const candidates: Record<string, string[]> = {
    node: [
      "src/index.ts",
      "src/lib.ts",
      "index.ts",
      "main.ts",
      "src/index.js",
      "src/lib.js",
      "index.js",
      "main.js",
      "index.mjs",
      "index.cjs",
    ],
    python: [
      "main.py",
      "src/main.py",
      "__main__.py",
      "src/__main__.py",
      "__init__.py",
    ],
    go: ["main.go"],
    rust: ["src/main.rs", "src/lib.rs", "main.rs", "lib.rs"],
  };
  if (ecosystem === "node") {
    try {
      const manifest = JSON.parse(
        await readFile(join(root, "package.json"), "utf8"),
      ) as {
        main?: unknown;
        module?: unknown;
        types?: unknown;
        exports?: unknown;
      };
      const paths: string[] = [];
      const collect = (value: unknown): void => {
        if (typeof value === "string") paths.push(value);
        else if (Array.isArray(value)) value.forEach(collect);
        else if (typeof value === "object" && value !== null)
          Object.values(value).forEach(collect);
      };
      collect(manifest.main);
      collect(manifest.module);
      collect(manifest.types);
      collect(manifest.exports);
      for (const path of paths) {
        const relative = path.startsWith("./") ? path.slice(2) : path;
        if (relative.length > 0 && (await exists(join(root, relative))))
          return relative;
      }
    } catch {
      // Continue with conventional filenames if package.json is absent or invalid.
    }
  }
  for (const candidate of candidates[ecosystem] ?? []) {
    if (await exists(join(root, candidate))) return candidate;
  }
  if (ecosystem === "python") {
    const dirs = [join(root, "src"), root];
    for (const dir of dirs) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(
        () => [],
      );
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        for (const name of ["__main__.py", "__init__.py"]) {
          const candidate = join(dir, entry.name, name);
          if (await exists(candidate)) return candidate.slice(root.length + 1);
        }
      }
    }
  }
  if (ecosystem === "go") {
    for (const dir of [root, join(root, "pkg")]) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(
        () => [],
      );
      const found = entries.find(
        (entry) => entry.isFile() && entry.name.endsWith(".go"),
      );
      if (found !== undefined)
        return join(dir, found.name).slice(root.length + 1);
    }
    const cmdDir = join(root, "cmd");
    const commands = await readdir(cmdDir, { withFileTypes: true }).catch(
      () => [],
    );
    for (const command of commands) {
      if (!command.isDirectory()) continue;
      const candidate = join("cmd", command.name, "main.go");
      if (await exists(join(root, candidate))) return candidate;
    }
  }
  if (ecosystem === "rust") {
    const binDir = join(root, "src", "bin");
    const bins = await readdir(binDir, { withFileTypes: true }).catch(() => []);
    const found = bins.find(
      (entry) => entry.isFile() && entry.name.endsWith(".rs"),
    );
    if (found !== undefined) return join("src", "bin", found.name);
  }
  return null;
}
