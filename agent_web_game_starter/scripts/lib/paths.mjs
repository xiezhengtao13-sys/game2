import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const esbuildBin = join(projectRoot, "node_modules", "esbuild", "bin", "esbuild");
export const manifestEntry = join(projectRoot, "src", "game", "assets", "manifest.ts");
