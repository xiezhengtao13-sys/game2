import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TileMap } from "../src/game/map/TileMap";
import {
  createCaptainRoomMap,
  ROOM_COLUMNS,
  ROOM_ROWS,
  ROOM_SHAPES
} from "../src/game/map/captainRoomMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { TILE, PLAYER_SPAWN } from "../src/game/config";

// The captain's quarters map: the shell, the visible-tile culling, and the fact
// that the room is actually enclosed and the player starts on solid deck.

function visible(map: TileMap, view: { x: number; y: number; width: number; height: number }) {
  const tiles = [...map.visibleTiles(view)];
  return { tiles, count: tiles.length, keys: new Set(tiles.map((t) => `${t.tx},${t.ty}`)) };
}

const room = () => createCaptainRoomMap(TILE);
const roomWidthPx = ROOM_COLUMNS * TILE;
const roomHeightPx = ROOM_ROWS * TILE;

/** The four kinds of tile that make up the hull. */
const SHELL = new Set(["wall", "wall_dark", "window"]);

describe("captain's room map (TASK-S1)", () => {
  test("is the size the config declares", () => {
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

  test("the north and side walls are sealed", () => {
    // A gap would let the player walk out of the ship.
    const map = room();

    for (let tx = 0; tx < ROOM_COLUMNS; tx++) {
      assert.ok(SHELL.has(map.tileAt(tx, 0)!), `north wall open at ${tx},0`);
    }
    for (let ty = 0; ty < ROOM_ROWS; ty++) {
      assert.ok(SHELL.has(map.tileAt(0, ty)!), `west wall open at 0,${ty}`);
      assert.ok(SHELL.has(map.tileAt(ROOM_COLUMNS - 1, ty)!), `east wall open at ${ROOM_COLUMNS - 1},${ty}`);
    }
  });

  test("the south wall is sealed apart from the doorway", () => {
    const map = room();
    let doorways = 0;

    for (let tx = 0; tx < ROOM_COLUMNS; tx++) {
      const type = map.tileAt(tx, ROOM_ROWS - 1);
      if (SHELL.has(type!)) continue;
      assert.equal(type, "floor_light", `south wall has a non-doorway gap at ${tx}`);
      doorways++;
    }

    assert.ok(doorways > 0, "the room has no way in");
    assert.ok(doorways <= 2, `the doorway is ${doorways} tiles wide, which is too many`);
  });

  test("the observation wall runs along the north side", () => {
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

describe("the player starts inside the room (TASK-S1)", () => {
  test("the spawn point is on walkable deck", () => {
    const map = room();

    const collider = { x: PLAYER_SPAWN.x - 11, y: PLAYER_SPAWN.y + 48 - 16, width: 22, height: 16 };
    assert.equal(
      isBoxBlocked(map, collider),
      false,
      "the player would start inside the hull or a wall"
    );
  });

  test("the spawn is inside the room's bounds", () => {
    assert.ok(PLAYER_SPAWN.x > 0 && PLAYER_SPAWN.x < roomWidthPx);
    assert.ok(PLAYER_SPAWN.y > 0 && PLAYER_SPAWN.y < roomHeightPx);
  });
});
