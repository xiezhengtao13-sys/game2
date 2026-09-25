import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildShipGrid,
  CABIN_BOUNDS,
  BRIDGE_BOUNDS,
  PASSAGE_BOUNDS,
  SHIP_COLUMNS,
  SHIP_ROWS,
  createShipMap,
  placeAt,
  shipSpawn
} from "../src/game/map/shipMap";
import { cabinGrid, CABIN_DOOR, ROOM_COLUMNS, ROOM_ROWS } from "../src/game/map/captainRoomMap";
import { bridgeGrid, BRIDGE_DOOR, BRIDGE_COLUMNS, BRIDGE_ROWS } from "../src/game/map/bridgeMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { TILE } from "../src/game/config";
import { fakeInput, feetTile, isFloor, ship, standableTiles } from "./shipWorld";

// The ship as ONE place: the join between the cabin and the bridge, and the fact
// that you get from one to the other by walking.
//
// This is the file that matters for "no seam". A two-scene arrangement can look
// seamless in a screenshot and still be a boundary; the only thing that proves
// otherwise is walking the route with the real collision and the real update
// loop, and checking nothing interrupted it.

const grid = buildShipGrid();
const map = createShipMap(TILE);

/** The passage's floor columns, in deck coordinates. */
const passageColumns: number[] = [];
for (let x = PASSAGE_BOUNDS.x0; x <= PASSAGE_BOUNDS.x1; x++) passageColumns.push(x);

describe("the deck is one map (TASK-S3)", () => {
  test("it is the size shipMap declares, and it fits both compartments", () => {
    assert.equal(map.width, SHIP_COLUMNS);
    assert.equal(map.height, SHIP_ROWS);
    assert.equal(map.pixelWidth, SHIP_COLUMNS * TILE);
    assert.equal(map.pixelHeight, SHIP_ROWS * TILE);

    assert.ok(CABIN_BOUNDS.tx + CABIN_BOUNDS.columns <= SHIP_COLUMNS, "the cabin runs off the deck");
    assert.ok(CABIN_BOUNDS.ty + CABIN_BOUNDS.rows <= SHIP_ROWS, "the cabin runs off the deck");
    assert.ok(BRIDGE_BOUNDS.tx + BRIDGE_BOUNDS.columns <= SHIP_COLUMNS, "the bridge runs off the deck");
  });

  test("the two doorways land on the same columns", () => {
    // The property the merge rests on. shipMap asserts it at import time; this
    // states it where a reader will look for it.
    const cabin = CABIN_BOUNDS.tx + CABIN_DOOR.x;
    const bridge = BRIDGE_BOUNDS.tx + BRIDGE_DOOR.x;

    assert.equal(cabin, bridge, "the doorways are not aligned");
    assert.equal(CABIN_DOOR.w, BRIDGE_DOOR.w, "the doorways are different widths");
    assert.deepEqual(passageColumns, [cabin, cabin + 1, cabin + 2]);
  });

  test("both doorways are openings rather than walls", () => {
    for (const x of passageColumns) {
      assert.equal(grid[CABIN_BOUNDS.ty][x], "floor_light", `the cabin's doorway is shut at ${x}`);
      assert.equal(grid[BRIDGE_BOUNDS.ty + BRIDGE_DOOR.y][x], "floor_light", `the bridge doorway is shut at ${x}`);
    }
  });

  test("the passage runs wall-to-wall between them, and is walkable throughout", () => {
    for (let y = PASSAGE_BOUNDS.top; y <= PASSAGE_BOUNDS.bottom; y++) {
      for (const x of passageColumns) {
        assert.ok(isFloor(grid[y][x]), `the passage is blocked at ${x},${y} by ${grid[y][x]}`);
      }
    }
  });

  test("the passage is bulkhead along both sides, not open structure", () => {
    // Rows inside a compartment are exempt: there the passage passes through the
    // compartment's own aft structure, which is already built.
    const inBridge = (y: number) => y >= BRIDGE_BOUNDS.ty && y < BRIDGE_BOUNDS.ty + BRIDGE_ROWS;
    const inCabin = (y: number) => y >= CABIN_BOUNDS.ty && y < CABIN_BOUNDS.ty + CABIN_BOUNDS.rows;

    for (let y = PASSAGE_BOUNDS.top; y <= PASSAGE_BOUNDS.bottom; y++) {
      if (inBridge(y) || inCabin(y)) continue;
      for (const x of [passageColumns[0] - 1, passageColumns[passageColumns.length - 1] + 1]) {
        assert.equal(grid[y][x], "wall", `the passage is open to the structure at ${x},${y}`);
      }
    }
  });

  test("the compartments are otherwise exactly what their own builders made", () => {
    // The merge composes the two rooms; it must not quietly redraw them. Any
    // difference outside the join is a room that changed when the door moved.
    const cabin = cabinGrid();
    let checked = 0;

    for (let y = 0; y < ROOM_ROWS; y++) {
      for (let x = 0; x < ROOM_COLUMNS; x++) {
        const expected = cabin[y][x];
        assert.equal(
          grid[CABIN_BOUNDS.ty + y][CABIN_BOUNDS.tx + x],
          expected,
          `the cabin changed at ${x},${y}`
        );
        checked++;
      }
    }

    const bridge = bridgeGrid();
    for (let y = 0; y < BRIDGE_ROWS; y++) {
      for (let x = 0; x < BRIDGE_COLUMNS; x++) {
        const joined =
          y >= BRIDGE_DOOR.y &&
          x >= passageColumns[0] - 1 &&
          x <= passageColumns[passageColumns.length - 1] + 1;
        if (joined) continue;
        assert.equal(grid[y][x], bridge[y][x], `the bridge changed at ${x},${y}`);
        checked++;
      }
    }

    assert.ok(checked > 600, `only ${checked} tiles were compared`);
  });

  test("the join only ever turns structure into floor, never floor into structure", () => {
    const bridge = bridgeGrid();

    for (let y = BRIDGE_DOOR.y; y < BRIDGE_ROWS; y++) {
      for (let x = passageColumns[0] - 1; x <= passageColumns[passageColumns.length - 1] + 1; x++) {
        const before = bridge[y][x];
        const after = grid[y][x];
        if (isFloor(before)) {
          assert.equal(after, before, `the join paved over floor at ${x},${y}`);
        } else {
          assert.ok(
            isFloor(after) || after === "wall",
            `the join left ${after} at ${x},${y}, which is neither floor nor bulkhead`
          );
        }
      }
    }
  });
});

describe("the player starts in the cabin and can walk to the bridge (TASK-S3)", () => {
  test("the spawn is inside the cabin, on walkable deck", () => {
    const spawn = shipSpawn(TILE);
    const tile = feetTile(map, spawn.x, spawn.y);

    assert.equal(placeAt(tile.tx, tile.ty), "cabin", "the player does not start in the cabin");
    assert.equal(
      isBoxBlocked(map, { x: spawn.x + 5, y: spawn.y + 48 - 16, width: 22, height: 16 }),
      false,
      "the player starts inside a wall"
    );
  });

  test("standing at the spawn, the game can say which room this is", () => {
    assert.equal(ship().placeLabel, "远望号 · 舰长室");
  });

  test("holding forward walks all the way from the cabin to the bridge", () => {
    const world = ship();
    const visited = new Set<string>([world.placeLabel]);

    let previous = { x: world.player.x, y: world.player.y };
    let longestStep = 0;

    for (let frame = 0; frame < 420; frame++) {
      world.update(1 / 60, fakeInput(["KeyW"]));

      const step = Math.hypot(world.player.x - previous.x, world.player.y - previous.y);
      longestStep = Math.max(longestStep, step);
      previous = { x: world.player.x, y: world.player.y };

      visited.add(world.placeLabel);
      if (world.placeLabel === "远望号 · 舰桥") break;
    }

    assert.equal(world.placeLabel, "远望号 · 舰桥", "the player never reached the bridge");

    // A scene change hidden behind a fade would show up here as one enormous
    // step, or as a jump in position with no movement in between. Walking is
    // bounded by the player's speed: 150 px/s at 1/60 s is 2.5 px.
    assert.ok(longestStep <= 2.6, `the player moved ${longestStep.toFixed(1)}px in one frame`);

    // And the route was the passage, not around it.
    assert.ok(visited.has("远望号 · 通道"), "the walk never passed through the passage");
  });

  test("the walk passes through every compartment in order", () => {
    const world = ship();
    const order: string[] = [world.placeLabel];

    for (let frame = 0; frame < 420 && world.placeLabel !== "远望号 · 舰桥"; frame++) {
      world.update(1 / 60, fakeInput(["KeyW"]));
      if (order[order.length - 1] !== world.placeLabel) order.push(world.placeLabel);
    }

    assert.deepEqual(order, ["远望号 · 舰长室", "远望号 · 通道", "远望号 · 舰桥"]);
  });

  test("the camera follows the player, because the ship is bigger than the screen", () => {
    const world = ship();
    const first = world.getCamera();

    assert.equal(first.mapWidth, map.pixelWidth);
    assert.ok(map.pixelWidth > 1280, "the deck should not fit on one screen");

    for (let i = 0; i < 120; i++) world.update(1 / 60, fakeInput(["KeyA"]));
    const after = world.getCamera();

    assert.notDeepEqual({ x: after.x, y: after.y }, { x: first.x, y: first.y });
  });
});

describe("nothing on the deck leaks into the ship's structure (TASK-S3)", () => {
  test("the player is not trapped where they start", () => {
    assert.ok(standableTiles(ship()).size > 400, "the walk from spawn barely goes anywhere");
  });

  test("nowhere the player can stand touches bare structure", () => {
    const reached = standableTiles(ship());

    for (const key of reached) {
      const [tx, ty] = key.split(",").map(Number);
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        assert.notEqual(
          map.tileAt(tx + ox, ty + oy),
          "hull",
          `the player can stand at ${tx},${ty}, which touches hull`
        );
      }
    }
  });

  test("the walk reaches both compartments and every floor tile in them", () => {
    const reached = standableTiles(ship());
    let cabinFloor = 0;
    let bridgeFloor = 0;
    let missed = 0;

    for (const [bounds, expected] of [
      [CABIN_BOUNDS, "cabin"],
      [BRIDGE_BOUNDS, "bridge"]
    ] as const) {
      for (let y = bounds.ty; y < bounds.ty + bounds.rows; y++) {
        for (let x = bounds.tx; x < bounds.tx + bounds.columns; x++) {
          if (!isFloor(map.tileAt(x, y))) continue;
          if (expected === "cabin") cabinFloor++;
          else bridgeFloor++;

          if (!reached.has(`${x},${y}`)) {
            missed++;
            assert.fail(`${expected} floor at ${x},${y} cannot be walked to`);
          }
        }
      }
    }

    assert.ok(cabinFloor > 250, `the cabin has only ${cabinFloor} floor tiles`);
    assert.ok(bridgeFloor > 250, `the bridge has only ${bridgeFloor} floor tiles`);
    assert.equal(missed, 0);
  });

  test("every place on the deck is named, and the structure between is not walkable", () => {
    assert.equal(placeAt(CABIN_BOUNDS.tx + 1, CABIN_BOUNDS.ty + 1), "cabin");
    assert.equal(placeAt(BRIDGE_BOUNDS.tx + 1, BRIDGE_BOUNDS.ty + 1), "bridge");
    assert.equal(placeAt(passageColumns[0], PASSAGE_BOUNDS.bottom - 1), "passage");
    assert.equal(placeAt(0, SHIP_ROWS - 1), "structure");
    assert.equal(placeAt(SHIP_COLUMNS - 1, SHIP_ROWS - 1), "structure");
  });
});
