import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_ASSETS, getAssetSpec, TILE_SIZE } from "../src/game/assets/manifest";

// TASK-102: the placeholder art pipeline must stay in sync with the manifest.
//
// The manifest is the single source of truth (docs/ART_PIPELINE.md). The
// generated PNGs are committed, so they can silently drift out of date after a
// manifest edit -- these tests are what catch that.

// Test files are bundled into a temp directory before running, so the project
// root cannot be derived from import.meta.url. scripts/run-tests.mjs sets this.
const projectRoot = process.env.TOWN_PROJECT_ROOT;
if (!projectRoot) {
  throw new Error("TOWN_PROJECT_ROOT is not set; run tests via `npm test`");
}
const generatedDir = join(projectRoot, "assets", "generated");

/** Read width/height straight out of a PNG's IHDR chunk. */
function readPngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    assert.equal(buf[i], signature[i], `${file} is not a PNG`);
  }
  assert.equal(buf.toString("ascii", 12, 16), "IHDR", `${file} has no IHDR chunk`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const VALID_CATEGORIES = ["terrain", "character", "crop", "building", "item", "ui"];
const VALID_ANCHORS = ["center", "bottom-center"];

describe("asset manifest integrity (TASK-102)", () => {
  test("asset ids are unique", () => {
    const seen = new Set<string>();
    for (const spec of ALL_ASSETS) {
      assert.ok(!seen.has(spec.id), `duplicate asset id: ${spec.id}`);
      seen.add(spec.id);
    }
  });

  test("every spec has the fields the pipeline depends on", () => {
    for (const spec of ALL_ASSETS) {
      assert.ok(spec.id.length > 0, "empty id");
      assert.ok(VALID_CATEGORIES.includes(spec.category), `${spec.id}: bad category ${spec.category}`);
      assert.ok(VALID_ANCHORS.includes(spec.anchor), `${spec.id}: bad anchor ${spec.anchor}`);
      assert.ok(spec.size.w > 0 && spec.size.h > 0, `${spec.id}: non-positive size`);
      assert.ok(Number.isInteger(spec.size.w) && Number.isInteger(spec.size.h), `${spec.id}: non-integer size`);
      assert.ok(spec.placeholder.shapes.length > 0, `${spec.id}: no placeholder shapes`);
    }
  });

  test("every color is a valid hex literal", () => {
    // Guards against typos like "#c9c martial", which would only surface as a
    // thrown error at generation time.
    const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    for (const spec of ALL_ASSETS) {
      for (const shape of spec.placeholder.shapes) {
        assert.match(shape.color, hex, `${spec.id}: bad shape color "${shape.color}"`);
        if (shape.stroke) assert.match(shape.stroke.color, hex, `${spec.id}: bad stroke color`);
      }
      if (spec.placeholder.speckles) {
        assert.match(spec.placeholder.speckles.color, hex, `${spec.id}: bad speckle color`);
      }
    }
  });

  test("every image-generation prompt is substantial enough to be usable", () => {
    // descEn is fed straight to an image generator, so a one-word description
    // would silently produce unusable art.
    for (const spec of ALL_ASSETS) {
      assert.ok(spec.descEn.length >= 40, `${spec.id}: descEn too short to be a usable prompt`);
      assert.ok(/[a-zA-Z]/.test(spec.descEn), `${spec.id}: descEn should be English`);
      assert.ok(spec.nameZh.length > 0, `${spec.id}: missing nameZh`);
    }
  });

  test("getAssetSpec throws on an unknown id instead of returning undefined", () => {
    assert.throws(() => getAssetSpec("no_such_asset"), /Unknown asset id/);
  });
});

describe("generated placeholder art (TASK-102)", () => {
  test("every manifest asset has a generated PNG of the declared size", () => {
    for (const spec of ALL_ASSETS) {
      const file = join(generatedDir, `${spec.id}.png`);
      assert.ok(existsSync(file), `missing generated art: ${spec.id} (run \`npm run art\`)`);

      const size = readPngSize(file);
      assert.equal(size.width, spec.size.w, `${spec.id}: generated width mismatch`);
      assert.equal(size.height, spec.size.h, `${spec.id}: generated height mismatch`);
    }
  });

  test("placeholder art is not blank", () => {
    // A regression guard: an early bug in the drawing maths silently produced
    // fully transparent PNGs, which passed every size check.
    for (const spec of ALL_ASSETS) {
      const file = join(generatedDir, `${spec.id}.png`);
      const buf = readFileSync(file);
      // Compare compressed size against an all-one-color image of the same
      // dimensions; a truly blank RGBA image deflates to almost nothing.
      assert.ok(
        buf.length > 120,
        `${spec.id}: generated PNG is suspiciously small (${buf.length}B) -- probably blank`
      );
    }
  });

  test("tiles are all TILE_SIZE and share one size", () => {
    const tiles = ALL_ASSETS.filter((a) => a.category === "terrain");
    assert.ok(tiles.length > 0, "expected terrain tiles in the manifest");
    for (const spec of tiles) {
      assert.equal(spec.size.w, TILE_SIZE, `${spec.id}: tile width should be TILE_SIZE`);
      assert.equal(spec.size.h, TILE_SIZE, `${spec.id}: tile height should be TILE_SIZE`);
    }
  });
});

describe("asset source selection (TASK-102)", () => {
  test("real art wins over placeholder art", async () => {
    const { selectAssetSource } = await import("../src/game/assets/index");
    const chosen = selectAssetSource(
      "player",
      { "/assets/sprites/player.png": "REAL" },
      { "/assets/generated/player.png": "PLACEHOLDER" }
    );
    assert.equal(chosen, "REAL");
  });

  test("falls back to placeholder art when no real art exists", async () => {
    const { selectAssetSource } = await import("../src/game/assets/index");
    const chosen = selectAssetSource("player", {}, { "/assets/generated/player.png": "PLACEHOLDER" });
    assert.equal(chosen, "PLACEHOLDER");
  });

  test("returns undefined when neither exists, so the recipe is used", async () => {
    const { selectAssetSource } = await import("../src/game/assets/index");
    assert.equal(selectAssetSource("player", {}, {}), undefined);
  });

  test("does not match an id that is merely a suffix of another file name", async () => {
    const { selectAssetSource } = await import("../src/game/assets/index");
    // "grass.png" must not be satisfied by "tile_grass.png".
    const chosen = selectAssetSource("grass", {}, { "/assets/generated/tile_grass.png": "WRONG" });
    assert.equal(chosen, undefined);
  });
});
