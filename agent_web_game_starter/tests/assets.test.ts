import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_ASSETS, getAssetSpec } from "../src/game/assets/manifest";
import { findUrl, selectAssetSource } from "../src/game/assets/sources";

// The art pipeline, checked against the files that are actually on disk.
//
// This file exists because of the most expensive bug in this project's history:
// for ten tasks every sprite silently rendered as a flat placeholder colour, and
// the screenshots looked fine, because the fallback colours were picked to match
// the real art. Since then the rule is that art is verified by reading state, not
// by looking at pictures.
//
// Nothing here needs a browser: the manifest is plain data and a PNG's size is in
// its first 24 bytes. So a wrong-size export, a typo'd file name, or a manifest
// entry nobody ever drew all fail here instead of turning up as a funny-looking
// screenshot three tasks later.

const projectRoot = process.env.TOWN_PROJECT_ROOT;
if (!projectRoot) throw new Error("TOWN_PROJECT_ROOT is not set; run tests via `npm test`");

const spritesDir = join(projectRoot, "assets", "sprites");
const generatedDir = join(projectRoot, "assets", "generated");

/** File names of the PNGs in a directory, or [] when the directory is absent. */
function pngNames(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith(".png"))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Width and height from a PNG's IHDR chunk.
 *
 * Read straight out of the header rather than decoding the image: the only thing
 * being checked is the declared size, and 8 bytes of big-endian integers is the
 * whole of what that needs.
 */
function pngSize(path: string): { w: number; h: number } {
  const bytes = readFileSync(path).subarray(0, 24);

  assert.equal(bytes.subarray(1, 4).toString("latin1"), "PNG", `${path} is not a PNG`);
  assert.equal(bytes.subarray(12, 16).toString("latin1"), "IHDR", `${path} has no IHDR chunk`);

  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

const generated = pngNames(generatedDir).map((name) => ({ name, id: name.replace(/\.png$/i, "") }));

/** Files sitting in either art directory that the manifest has never heard of. */
function orphans(names: string[]): string[] {
  return names
    .map((name) => name.replace(/\.png$/i, ""))
    .filter((id) => !ALL_ASSETS.some((spec) => spec.id === id));
}

describe("every asset in the manifest has art on disk (TASK-S1)", () => {
  test("the manifest is not empty, and every entry is complete", () => {
    assert.ok(ALL_ASSETS.length >= 40, `only ${ALL_ASSETS.length} assets are declared`);

    for (const spec of ALL_ASSETS) {
      assert.ok(spec.id.length > 0, "an asset has no id");
      assert.ok(spec.nameZh.length > 0, `${spec.id} has no Chinese name`);
      assert.ok(spec.descZh.length > 0, `${spec.id} has no Chinese description`);
      assert.ok(spec.descEn.length > 0, `${spec.id} has no image prompt`);
      assert.ok(spec.size.w > 0 && spec.size.h > 0, `${spec.id} declares no size`);
    }
  });

  test("ids are unique, because a duplicate would silently shadow another asset", () => {
    const ids = ALL_ASSETS.map((spec) => spec.id);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    assert.equal(duplicate, undefined, `${duplicate} is declared twice`);
  });

  test("a placeholder exists for every declared asset", () => {
    const missing = ALL_ASSETS.filter((spec) => !generated.some((file) => file.id === spec.id));

    assert.deepEqual(
      missing.map((spec) => spec.id),
      [],
      "run `npm run art` to regenerate the placeholders"
    );
  });

  test("nothing sits in the art directories that the manifest does not declare", () => {
    // A typo'd file name is invisible otherwise: the game simply never finds it
    // and keeps drawing the placeholder, which looks deliberate.
    assert.deepEqual(orphans(pngNames(generatedDir)), [], "unknown file in assets/generated/");
    assert.deepEqual(orphans(pngNames(spritesDir)), [], "unknown file in assets/sprites/");
  });
});

describe("art files are the size the manifest declares (TASK-S1)", () => {
  for (const { name, id } of generated) {
    test(`${name} is ${getAssetSpec(id).size.w}x${getAssetSpec(id).size.h}`, () => {
      const spec = getAssetSpec(id);
      const size = pngSize(join(generatedDir, name));

      assert.equal(size.w, spec.size.w, `${name} is the wrong width`);
      assert.equal(size.h, spec.size.h, `${name} is the wrong height`);
    });
  }

  test("the same is checked for real art, whenever some has been dropped in", () => {
    const sprites = pngNames(spritesDir);
    for (const name of sprites) {
      const spec = getAssetSpec(name.replace(/\.png$/i, ""));
      const size = pngSize(join(spritesDir, name));

      assert.equal(size.w, spec.size.w, `${name} is the wrong width; the game will squash it`);
      assert.equal(size.h, spec.size.h, `${name} is the wrong height; the game will squash it`);
    }
  });
});

describe("which file supplies an asset (TASK-S1)", () => {
  test("real art wins over the placeholder", () => {
    const sprites = { "/assets/sprites/tile_deck.png": "/real.png" };
    const placeholders = { "/assets/generated/tile_deck.png": "/placeholder.png" };

    assert.equal(selectAssetSource("tile_deck", sprites, placeholders), "/real.png");
  });

  test("a missing sprite falls back to the placeholder, and then to nothing", () => {
    const placeholders = { "/assets/generated/tile_deck.png": "/placeholder.png" };

    assert.equal(selectAssetSource("tile_deck", {}, placeholders), "/placeholder.png");
    assert.equal(selectAssetSource("tile_hull", {}, placeholders), undefined);
  });

  test("an id only matches a whole file name", () => {
    // `deck` must not be satisfied by `tile_deck.png`, or assets would borrow
    // each other's art in a way that is very hard to see.
    const urls = { "/assets/generated/tile_deck.png": "/tile.png" };

    assert.equal(findUrl(urls, "deck"), undefined);
    assert.equal(findUrl(urls, "tile_deck"), "/tile.png");
  });

  test("windows-style paths resolve too", () => {
    const urls = { "C:\\game\\assets\\generated\\tile_hull.png": "/hull.png" };
    assert.equal(findUrl(urls, "tile_hull"), "/hull.png");
  });
});
