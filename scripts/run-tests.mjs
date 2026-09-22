// Test runner for this project.
//
// Why this exists instead of Vitest:
//   Vitest (via Vite) transforms TypeScript by spawning esbuild's *service* API,
//   which is a long-lived child process using piped stdio. The DSH workspace
//   sandbox denies piped child processes ("spawn EPERM"), so `vitest run` cannot
//   start at all in this environment. This is an environment limit, not a code
//   defect -- see docs/TESTING.md for the full story and how to switch back.
//
// What this does instead:
//   1. bundles each test file with esbuild's *CLI* (works under the sandbox)
//   2. runs the bundle on plain `node --test`
//
// Output goes to a temp directory outside tests/ so the sources stay clean.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(projectRoot, "tests");
const esbuildBin = join(projectRoot, "node_modules", "esbuild", "bin", "esbuild");

/** Recursively collect *.test.ts files under tests/. */
function findTestFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      found.push(full);
    }
  }
  return found.sort();
}

const testFiles = findTestFiles(testsDir);
if (testFiles.length === 0) {
  console.error(`No *.test.ts files found under ${relative(projectRoot, testsDir)}`);
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), "town-tests-"));
const bundles = [];

try {
  for (const file of testFiles) {
    // Mirror the tests/ sub-structure into a flat, collision-free name.
    const name = relative(testsDir, file).replace(/[\\/]/g, "__").replace(/\.ts$/, ".mjs");
    const outfile = join(outDir, name);

    const built = spawnSync(
      process.execPath,
      [esbuildBin, file, "--bundle", "--platform=node", "--format=esm", `--outfile=${outfile}`, "--log-level=warning"],
      { stdio: "inherit", cwd: projectRoot }
    );

    if (built.error) {
      console.error(`Failed to run esbuild: ${built.error.message}`);
      process.exit(1);
    }
    if (built.status !== 0) {
      console.error(`\nBundling failed for ${relative(projectRoot, file)}`);
      process.exit(built.status ?? 1);
    }
    bundles.push(outfile);
  }

  mkdirSync(outDir, { recursive: true });
  // NOTE: run each bundle as a plain `node <file>` process rather than
  // `node --test <files>`. The --test runner spawns one child process per test
  // file over pipes, which the sandbox denies ("spawn EPERM"). A bundle run
  // directly still registers and reports through node:test; it is just not
  // isolated per file. Failures are aggregated below.
  const failed = [];
  for (const bundle of bundles) {
    const run = spawnSync(process.execPath, [bundle], { stdio: "inherit", cwd: projectRoot });

    if (run.error) {
      console.error(`Failed to run ${bundle}: ${run.error.message}`);
      failed.push(bundle);
      continue;
    }
    if (run.signal) {
      console.error(`${bundle} terminated by ${run.signal}`);
      failed.push(bundle);
      continue;
    }
    if (run.status !== 0) failed.push(bundle);
  }

  if (failed.length > 0) {
    console.error(
      `\n${failed.length} of ${bundles.length} test file(s) failed:\n` +
        failed.map((f) => `  - ${f}`).join("\n")
    );
    process.exit(1);
  }

  console.log(`\nAll ${bundles.length} test file(s) passed.`);
  process.exit(0);
} finally {
  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch {
    // Temp cleanup is best-effort; never mask the real test result.
  }
}
