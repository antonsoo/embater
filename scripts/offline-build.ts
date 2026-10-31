import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

async function filesIn(directory: string): Promise<string[]> {
  const files = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      files.map((f) =>
        f.isDirectory()
          ? filesIn(path.join(directory, f.name))
          : Promise.resolve([path.join(directory, f.name)]),
      ),
    )
  ).flat();
}

export async function offlineBuild(
  name: string,
  pages: string[],
): Promise<{ edition: string; plugin: Plugin }> {
  const inputs = [
    ...(await filesIn("src")),
    ...(await filesIn("public")),
    ...pages,
    "scripts/offline-build.ts",
    "scripts/offline-worker.js",
    "vite.config.ts",
    "package.json",
    "package-lock.json",
  ].sort();
  const hash = createHash("sha256");
  for (const file of inputs) {
    hash.update(file);
    hash.update(await readFile(file));
  }
  const edition = hash.digest("hex");
  const base = `/${name}/`;
  return {
    edition,
    plugin: {
      name: "complete-offline-edition",
      apply: "build",
      async closeBundle() {
        const files = (await filesIn("dist")).filter((f) => !f.endsWith("sw.js")).sort();
        const urls = files.map((f) => base + path.relative("dist", f).split(path.sep).join("/"));
        const integrity = Object.fromEntries(
          await Promise.all(
            files.map(async (f, i) => [
              urls[i],
              `sha256-${createHash("sha256")
                .update(await readFile(f))
                .digest("base64")}`,
            ]),
          ),
        );
        await writeFile(
          "dist/sw.js",
          `/* Complete edition ${edition}; generated from the build. */
const CACHE = ${JSON.stringify(`${name}-${edition}`)};
const PREFIX = ${JSON.stringify(`${name}-`)};
const EDITION = ${JSON.stringify(edition)};
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(urls)};
const INTEGRITY = ${JSON.stringify(integrity)};
${await readFile("scripts/offline-worker.js", "utf8")}
`,
        );
      },
    },
  };
}
