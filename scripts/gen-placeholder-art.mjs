// Generates placeholder PNGs for every asset in the manifest.
//
//   npm run art
//
// Output: assets/generated/<id>.png
//
// These are throwaway stand-ins whose only job is to make the game playable and
// visually parseable before real art exists. Real art goes in assets/sprites/
// and takes priority -- see docs/ART_PIPELINE.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTsModule } from "./lib/load-ts.mjs";
import { renderPlaceholder } from "./lib/draw.mjs";
import { manifestEntry, projectRoot } from "./lib/paths.mjs";

const outDir = join(projectRoot, "assets", "generated");
mkdirSync(outDir, { recursive: true });

const { ALL_ASSETS } = await loadTsModule(manifestEntry);

let written = 0;
const seen = new Set();

for (const spec of ALL_ASSETS) {
  if (seen.has(spec.id)) {
    console.error(`Duplicate asset id in manifest: ${spec.id}`);
    process.exit(1);
  }
  seen.add(spec.id);

  const raster = renderPlaceholder(spec);
  writeFileSync(join(outDir, `${spec.id}.png`), raster.toPNG());
  written++;
}

console.log(`Generated ${written} placeholder sprite(s) into assets/generated/`);
