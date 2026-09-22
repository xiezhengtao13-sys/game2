import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TileMap, type WorldRect } from "../src/game/map/TileMap";
import { createTownMap, TOWN_SHAPES } from "../src/game/map/townMap";
import { MAP_COLUMNS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT, TILE, PLAYER_SPAWN } from "../src/game/config";

// TASK-104: the tile map. The rendering itself is checked by eye, but which
// tiles a view touches -- and staying inside the grid while doing it -- is pure
// logic and belongs here.

/** Collect the tiles a view yields, for order-independent assertions. */
function visible(map: TileMap, view: WorldRect) {
  const tiles = [...map.visibleTiles(view)];
  return {
    tiles,
    count: tiles.length,
    keys: new Set(tiles.map((t) => `${t.tx},${t.ty}`))
  };
}

/** A view covering the whole map, and one far bigger than it. */
const wholeMap: WorldRect = { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };
const oversized: WorldRect = { x: -5000, y: -5000, width: 99999, height: 99999 };

describe("TileMap basics (TASK-104)", () => {
  test("rejects a grid that does not match its declared size", () => {
    assert.throws(() => new TileMap(["grass"], 2, 2, 48), /expected 4/);
  });

  test("reports pixel size from the tile size", () => {
    const map = createTownMap();
    assert.equal(map.pixelWidth, MAP_WIDTH);
    assert.equal(map.pixelHeight, MAP_HEIGHT);
  });

  test("tileAt returns null outside the map instead of undefined", () => {
    const map = createTownMap();

    assert.equal(map.tileAt(-1, 0), null);
    assert.equal(map.tileAt(0, -1), null);
    assert.equal(map.tileAt(MAP_COLUMNS, 0), null);
    assert.equal(map.tileAt(0, MAP_ROWS), null);
    assert.notEqual(map.tileAt(0, 0), null);
  });

  test("atPixel converts pixels to the containing tile", () => {
    const map = createTownMap();

    assert.equal(map.atPixel(0, 0), map.tileAt(0, 0));
    assert.equal(map.atPixel(TILE - 1, TILE - 1), map.tileAt(0, 0));
    assert.equal(map.atPixel(TILE, TILE), map.tileAt(1, 1));
  });
});

describe("TileMap.visibleTiles (TASK-104)", () => {
  test("covers exactly the tiles the view touches", () => {
    const map = createTownMap();

    // A viewport-sized window somewhere in the middle.
    const got = visible(map, { x: 480, y: 480, width: 1280, height: 720 });

    // Tiles 10..36 across and 10..24 down, inclusive.
    assert.equal(got.count, (36 - 10 + 1) * (24 - 10 + 1));
    assert.ok(got.keys.has("10,10"), "top-left tile missing");
    assert.ok(got.keys.has("36,24"), "bottom-right tile missing");
    assert.ok(!got.keys.has("9,10"), "one tile too far left");
    assert.ok(!got.keys.has("37,24"), "one tile too far right");
  });

  test("never yields a tile outside the grid, even for a huge view", () => {
    const map = createTownMap();
    const got = visible(map, oversized);

    assert.equal(got.count, MAP_COLUMNS * MAP_ROWS);
    for (const tile of got.tiles) {
      assert.ok(map.inBounds(tile.tx, tile.ty), `out of bounds: ${tile.tx},${tile.ty}`);
    }
  });

  test("clamps a view hanging off each edge independently", () => {
    const map = createTownMap();

    // Off the top-left: a window whose far edge sits exactly on tile (10, 10),
    // so tiles 0..9 on each axis are touched and nothing outside may appear.
    const topLeft = visible(map, { x: -1000, y: -1000, width: 1000 + 10 * TILE, height: 1000 + 10 * TILE });
    assert.ok(topLeft.keys.has("0,0"));
    assert.ok(!topLeft.keys.has("-1,0"));
    assert.equal(Math.max(...topLeft.tiles.map((t) => t.tx)), 9);
    assert.equal(Math.max(...topLeft.tiles.map((t) => t.ty)), 9);

    // Off the bottom-right: the last column and row must still be included.
    const bottomRight = visible(map, {
      x: MAP_WIDTH - 10,
      y: MAP_HEIGHT - 10,
      width: 5000,
      height: 5000
    });
    assert.ok(bottomRight.keys.has(`${MAP_COLUMNS - 1},${MAP_ROWS - 1}`));
  });

  test("yields nothing for a view entirely outside the map", () => {
    const map = createTownMap();

    assert.equal([...map.visibleTiles({ x: -5000, y: -5000, width: 100, height: 100 })].length, 0);
    assert.equal(
      [...map.visibleTiles({ x: MAP_WIDTH + 10, y: 0, width: 100, height: 100 })].length,
      0
    );
    assert.equal(
      [...map.visibleTiles({ x: 0, y: MAP_HEIGHT + 10, width: 100, height: 100 })].length,
      0
    );
  });

  test("draws far fewer tiles than the map holds", () => {
    const map = createTownMap();
    const viewportOnly = visible(map, { x: 0, y: 0, width: 1280, height: 720 });

    // The point of visible-tile culling: cost tracks the viewport, not the map.
    assert.ok(
      viewportOnly.count < (MAP_COLUMNS * MAP_ROWS) / 2,
      `expected culling, got ${viewportOnly.count} of ${MAP_COLUMNS * MAP_ROWS}`
    );
  });

  test("a whole-map view yields every tile exactly once", () => {
    const map = createTownMap();
    const got = visible(map, wholeMap);

    assert.equal(got.count, MAP_COLUMNS * MAP_ROWS);
    assert.equal(got.keys.size, MAP_COLUMNS * MAP_ROWS, "some tile was yielded twice");
  });
});

describe("town map layout (TASK-104)", () => {
  test("is the size the config declares", () => {
    const map = createTownMap();

    assert.equal(map.width, MAP_COLUMNS);
    assert.equal(map.height, MAP_ROWS);
  });

  test("every declared shape fits inside the map", () => {
    for (const shape of TOWN_SHAPES) {
      assert.ok(shape.x >= 0 && shape.y >= 0, `shape starts outside: ${shape.note}`);
      assert.ok(shape.x + shape.w <= MAP_COLUMNS, `shape too wide: ${shape.note}`);
      assert.ok(shape.y + shape.h <= MAP_ROWS, `shape too tall: ${shape.note}`);
    }
  });

  test("the shapes produce the intended terrain", () => {
    const map = createTownMap();

    // River down the east edge, and the bridge crossing it.
    assert.equal(map.tileAt(38, 5), "water");
    assert.equal(map.tileAt(39, 29), "water");
    assert.equal(map.tileAt(36, 12), "path", "bridge should cross the river");

    // Main street runs west-east along row 12.
    assert.equal(map.tileAt(4, 12), "path");
    assert.equal(map.tileAt(34, 12), "path");

    // Side street runs north-south along column 18, crossing the main street.
    assert.equal(map.tileAt(18, 6), "path");
    assert.equal(map.tileAt(18, 26), "path");
    assert.equal(map.tileAt(18, 12), "path", "crossroads should be path");

    // Farmland in the south-west, with its access spur.
    assert.equal(map.tileAt(4, 18), "farmland");
    assert.equal(map.tileAt(7, 25), "farmland");
    assert.equal(map.tileAt(6, 17), "path", "farm spur should reach the field");
    assert.equal(map.tileAt(8, 18), "grass", "field should not bleed east");
  });

  test("the farmland is a solid block, not a ragged patch", () => {
    const map = createTownMap();
    const field = TOWN_SHAPES.find((s) => s.type === "farmland");
    assert.ok(field, "expected a farmland shape");

    for (let y = field.y; y < field.y + field.h; y++) {
      for (let x = field.x; x < field.x + field.w; x++) {
        assert.equal(map.tileAt(x, y), "farmland", `hole in farmland at ${x},${y}`);
      }
    }
  });

  test("the player spawns on ground they can stand on", () => {
    const map = createTownMap();

    // Not inside the river, and inside the map at all.
    const under = map.atPixel(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    assert.equal(under, "grass");
  });
});
