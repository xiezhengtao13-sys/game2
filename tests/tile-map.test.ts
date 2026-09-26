import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TileMap } from "../src/game/map/TileMap";
import {
  createCaptainRoomMap,
  CABIN_DOOR,
  ROOM_COLUMNS,
  ROOM_ROWS,
  ROOM_SHAPES
} from "../src/game/map/captainRoomMap";
import { TILE } from "../src/game/config";

// TileMap mechanics, plus the cabin's own shell: the room is one compartment of
// the ship now, so its shell is worth checking on its own terms -- the deck's
// join cuts into one wall of it, and that is exactly the sort of thing that can
// hide a hole in the other three.

const room = () => createCaptainRoomMap(TILE);
const roomWidthPx = ROOM_COLUMNS * TILE;
const roomHeightPx = ROOM_ROWS * TILE;

function visible(map: TileMap, view: { x: number; y: number; width: number; height: number }) {
  const tiles = [...map.visibleTiles(view)];
  return { tiles, count: tiles.length, keys: new Set(tiles.map((t) => `${t.tx},${t.ty}`)) };
}

/** The four kinds of tile that make up the shell. */
const SHELL = new Set(["wall", "wall_dark", "window"]);

describe("captain's room map (TASK-S1)", () => {
  test("is the size the room declares", () => {
    const map = room();

    assert.equal(map.width, ROOM_COLUMNS);
    assert.equal(map.height, ROOM_ROWS);
    assert.equal(map.pixelWidth, roomWidthPx);
    assert.equal(map.pixelHeight, roomHeightPx);
  });

  test("every declared shape fits inside the room", () => {
    for (const shape of ROOM_SHAPES) {
      assert.ok(shape.x >= 0 && shape.y >= 0, `shape starts outside: ${shape.note}`);
      assert.ok(shape.x + shape.w <= ROOM_COLUMNS, `shape too wide: ${shape.note}`);
      assert.ok(shape.y + shape.h <= ROOM_ROWS, `shape too tall: ${shape.note}`);
    }
  });

  test("the side walls and the aft wall are sealed", () => {
    // A gap would let the player walk out of the ship.
    const map = room();

    for (let tx = 0; tx < ROOM_COLUMNS; tx++) {
      assert.ok(SHELL.has(map.tileAt(tx, ROOM_ROWS - 1)!), `aft wall open at ${tx}`);
    }
    for (let ty = 0; ty < ROOM_ROWS; ty++) {
      assert.ok(SHELL.has(map.tileAt(0, ty)!), `west wall open at 0,${ty}`);
      assert.ok(SHELL.has(map.tileAt(ROOM_COLUMNS - 1, ty)!), `east wall open at ${ROOM_COLUMNS - 1},${ty}`);
    }
  });

  test("the forward wall is sealed apart from the doorway", () => {
    const map = room();
    const open: number[] = [];

    for (let tx = 0; tx < ROOM_COLUMNS; tx++) {
      if (SHELL.has(map.tileAt(tx, 0)!)) continue;
      assert.equal(map.tileAt(tx, 0), "floor_light", `forward wall has a gap at ${tx}`);
      open.push(tx);
    }

    const doorway: number[] = [];
    for (let tx = CABIN_DOOR.x; tx < CABIN_DOOR.x + CABIN_DOOR.w; tx++) doorway.push(tx);

    assert.deepEqual(open, doorway, "the doorway is not where CABIN_DOOR says it is");
  });

  test("the observation wall runs along the forward side", () => {
    const map = room();
    let windows = 0;

    for (let tx = 0; tx < ROOM_COLUMNS; tx++) {
      if (map.tileAt(tx, 0) === "window") windows++;
    }

    assert.equal(windows, 6, "设定集 gives the observation wall as six tiles wide");
  });

  test("the middle of the room is open deck", () => {
    const map = room();

    assert.equal(map.tileAt(12, 8), "floor_light", "the guide light runs up the middle");
    assert.equal(map.tileAt(4, 6), "deck", "the working end should be open floor");
  });
});

describe("visible tile culling (TASK-S1)", () => {
  test("covers exactly the tiles a view touches", () => {
    const map = room();
    const got = visible(map, { x: 0, y: 0, width: TILE * 4, height: TILE * 3 });

    assert.equal(got.count, 4 * 3);
    assert.ok(got.keys.has("0,0"));
    assert.ok(got.keys.has("3,2"));
    assert.ok(!got.keys.has("4,0"), "one tile too far right");
  });

  test("never yields a tile outside the grid, even for a huge view", () => {
    const map = room();
    const got = visible(map, { x: -9999, y: -9999, width: 99999, height: 99999 });

    assert.equal(got.count, ROOM_COLUMNS * ROOM_ROWS);
    for (const tile of got.tiles) {
      assert.ok(map.inBounds(tile.tx, tile.ty), `out of bounds: ${tile.tx},${tile.ty}`);
    }
  });

  test("yields nothing for a view entirely outside the room", () => {
    const map = room();

    assert.equal([...map.visibleTiles({ x: -500, y: -500, width: 50, height: 50 })].length, 0);
    assert.equal(
      [...map.visibleTiles({ x: roomWidthPx + 50, y: 0, width: 50, height: 50 })].length,
      0
    );
  });

  test("a whole-room view yields every tile exactly once", () => {
    const map = room();
    const got = visible(map, { x: 0, y: 0, width: roomWidthPx, height: roomHeightPx });

    assert.equal(got.count, ROOM_COLUMNS * ROOM_ROWS);
    assert.equal(got.keys.size, ROOM_COLUMNS * ROOM_ROWS, "some tile was yielded twice");
  });
});
