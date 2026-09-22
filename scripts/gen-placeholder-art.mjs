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

/**
 * Frames drawn by mirroring another frame, so the art requirement stays at three
 * directions instead of four. Kept in sync with MIRRORED in
 * src/game/assets/animationSpec.ts, which is what the game reads at runtime.
 */
function mirrorOf(spec) {
  const match = /^player_left_(idle|walkA|walkB)$/.exec(spec.id);
  if (!match) return null;
  const pose = match[1];

  const source = ALL_ASSETS.find((a) => a.id === `player_right_${pose}`);
  if (!source) {
    console.error(`Cannot mirror ${spec.id}: player_right_${pose} is missing from the manifest`);
    process.exit(1);
  }
  return source;
}

/** Flip a raster horizontally in place. */
function flipHorizontally(raster) {
  const { width, height, pixels } = raster;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const a = (y * width + x) * 4;
      const b = (y * width + (width - 1 - x)) * 4;
      for (let c = 0; c < 4; c++) {
        const tmp = pixels[a + c];
        pixels[a + c] = pixels[b + c];
        pixels[b + c] = tmp;
      }
    }
  }
}

let written = 0;
const seen = new Set();

for (const spec of ALL_ASSETS) {
  if (seen.has(spec.id)) {
    console.error(`Duplicate asset id in manifest: ${spec.id}`);
    process.exit(1);
  }
  seen.add(spec.id);

  const source = mirrorOf(spec);
  const raster = source ? renderPlaceholder(source) : renderPlaceholder(spec);
  if (source) flipHorizontally(raster);

  writeFileSync(join(outDir, `${spec.id}.png`), raster.toPNG());
  written++;
}

console.log(`Generated ${written} placeholder sprite(s) into assets/generated/`);
