// Loads an ES module written in TypeScript from plain Node.
//
// The project's TS is only consumable by a bundler, and every bundler here
// (Vite, esbuild's service API) needs piped child processes, which the sandbox
// denies. esbuild's CLI works, so: bundle to a temp file, then import it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { esbuildBin, projectRoot } from "./paths.mjs";

/**
 * Bundle a TypeScript entry point and import the result.
 * @param {string} entry absolute path to the .ts file
 * @returns {Promise<Record<string, unknown>>} the module's exports
 */
export async function loadTsModule(entry) {
  const outDir = mkdtempSync(join(tmpdir(), "town-ts-"));
  const outfile = join(outDir, "module.mjs");

  try {
    const built = spawnSync(
      process.execPath,
      [esbuildBin, entry, "--bundle", "--platform=node", "--format=esm", `--outfile=${outfile}`, "--log-level=warning"],
      { stdio: "inherit", cwd: projectRoot }
    );

    if (built.error) throw new Error(`Failed to run esbuild: ${built.error.message}`);
    if (built.status !== 0) throw new Error(`esbuild failed to bundle ${entry}`);

    const module = await import(pathToFileURL(outfile).href);
    return module;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}
