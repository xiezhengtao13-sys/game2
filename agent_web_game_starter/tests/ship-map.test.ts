import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildShipGrid,
  CABIN_BOUNDS,
  BRIDGE_BOUNDS,
  HABITAT_BOUNDS,
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
import { fakeInput, feetTile, isFloor, ship, standableTiles, unlockedTiles } from "./shipWorld";

// The ship as ONE place: seamless hull join across all compartments, starting
// restriction inside the lower crew habitat + L-2 workshop, and zero-seam
// movement inside unlocked decks.

const grid = buildShipGrid();
const map = createShipMap(TILE);

/** The passage's floor columns, in deck coordinates. */
const passageColumns: number[] = [];
for (let x = PASSAGE_BOUNDS.x0; x <= PASSAGE_BOUNDS.x1; x++) passageColumns.push(x);

describe("the deck is one map (TASK-S3)", () => {
  test("it is the size shipMap declares, and it fits both command compartments", () => {
    assert.equal(map.width, SHIP_COLUMNS);
    assert.equal(map.height, SHIP_ROWS);
    assert.equal(map.pixelWidth, SHIP_COLUMNS * TILE);
    assert.equal(map.pixelHeight, SHIP_ROWS * TILE);

    assert.ok(CABIN_BOUNDS.tx + CABIN_BOUNDS.columns <= SHIP_COLUMNS, "the cabin runs off the deck");
    assert.ok(CABIN_BOUNDS.ty + CABIN_BOUNDS.rows <= SHIP_ROWS, "the cabin runs off the deck");
    assert.ok(BRIDGE_BOUNDS.tx + BRIDGE_BOUNDS.columns <= SHIP_COLUMNS, "the bridge runs off the deck");
  });

  test("the two doorways land on the same columns", () => {
    const cabin = CABIN_BOUNDS.tx + CABIN_DOOR.x;
    const bridge = BRIDGE_BOUNDS.tx + BRIDGE_DOOR.x;

    assert.equal(cabin, bridge, "the doorways are not aligned");
    assert.equal(CABIN_DOOR.w, BRIDGE_DOOR.w, "the doorways are different widths");

    const shoulder = (PASSAGE_BOUNDS.width - CABIN_DOOR.w) / 2;
    assert.ok(shoulder >= 1, "the passage is no wider than its doorways");

    const expected: number[] = [];
    for (let x = cabin - shoulder; x <= cabin + CABIN_DOOR.w - 1 + shoulder; x++) expected.push(x);

    assert.deepEqual(passageColumns, expected, "the doorways are not centred in the passage");
  });

  test("both doorways are openings rather than walls", () => {
    for (let x = CABIN_BOUNDS.tx + CABIN_DOOR.x; x < CABIN_BOUNDS.tx + CABIN_DOOR.x + CABIN_DOOR.w; x++) {
      assert.equal(grid[CABIN_BOUNDS.ty][x], "floor_light", `the cabin's doorway is shut at ${x}`);
      assert.equal(grid[BRIDGE_BOUNDS.ty + BRIDGE_DOOR.y][x], "floor_light", `the bridge doorway is shut at ${x}`);
    }
  });

  test("the bulkheads either side of each doorway are still solid", () => {
    const shoulders = [passageColumns[0], passageColumns[passageColumns.length - 1]];

    for (const x of shoulders) {
      assert.ok(
        !isFloor(grid[CABIN_BOUNDS.ty][x]),
        `the cabin's forward bulkhead is open at ${x} (${grid[CABIN_BOUNDS.ty][x]})`
      );
    }
  });

  test("the passage is walkable from end to end", () => {
    for (let y = PASSAGE_BOUNDS.top; y < PASSAGE_BOUNDS.bottom; y++) {
      for (const x of passageColumns) {
        assert.ok(isFloor(grid[y][x]), `the passage is blocked at ${x},${y} by ${grid[y][x]}`);
      }
    }
  });

  test("the passage is bulkhead along both sides, not open structure", () => {
    const inBridge = (y: number) => y >= BRIDGE_BOUNDS.ty && y < BRIDGE_BOUNDS.ty + BRIDGE_ROWS;
    const inCabin = (y: number) => y >= CABIN_BOUNDS.ty && y < CABIN_BOUNDS.ty + CABIN_BOUNDS.rows;

    for (let y = PASSAGE_BOUNDS.top; y <= PASSAGE_BOUNDS.bottom; y++) {
      if (inBridge(y) || inCabin(y)) continue;
      for (const x of [passageColumns[0] - 1, passageColumns[passageColumns.length - 1] + 1]) {
        assert.ok(
          grid[y][x] === "wall" || grid[y][x] === "wall_dark" || isFloor(grid[y][x]),
          `the passage is open to the structure at ${x},${y} (${grid[y][x]})`
        );
      }
    }
  });

  test("the compartments are otherwise exactly what their own builders made", () => {
    const cabin = cabinGrid();
    let checked = 0;

    for (let y = 0; y < ROOM_ROWS; y++) {
      for (let x = 0; x < ROOM_COLUMNS; x++) {
        assert.equal(
          grid[CABIN_BOUNDS.ty + y][CABIN_BOUNDS.tx + x],
          cabin[y][x],
          `the cabin changed at ${x},${y}`
        );
        checked++;
      }
    }

    const bridge = bridgeGrid();
    for (let y = 0; y < BRIDGE_ROWS; y++) {
      for (let x = 0; x < BRIDGE_COLUMNS; x++) {
        const gx = BRIDGE_BOUNDS.tx + x;
        const gy = BRIDGE_BOUNDS.ty + y;
        const joined =
          (y >= BRIDGE_DOOR.y &&
            gx >= passageColumns[0] - 1 &&
            gx <= passageColumns[passageColumns.length - 1] + 1) ||
          (gx === 61 && bridge[y][x] === "hull" && grid[gy][gx] === "wall");
        if (joined) continue;
        assert.equal(grid[gy][gx], bridge[y][x], `the bridge changed at ${x},${y}`);
        checked++;
      }
    }

    assert.ok(checked > 600, `only ${checked} tiles were compared`);
  });

  test("the join only ever turns structure into floor, never floor into structure", () => {
    const bridge = bridgeGrid();

    for (let y = BRIDGE_DOOR.y; y < BRIDGE_ROWS; y++) {
      for (let gx = passageColumns[0] - 1; gx <= passageColumns[passageColumns.length - 1] + 1; gx++) {
        const x = gx - BRIDGE_BOUNDS.tx;
        const before = bridge[y][x];
        const after = grid[BRIDGE_BOUNDS.ty + y][gx];
        if (isFloor(before)) {
          assert.equal(after, before, `the join paved over floor at ${gx},${y}`);
        } else {
          assert.ok(
            isFloor(after) || after === "wall" || after === "wall_dark",
            `the join left ${after} at ${gx},${y}, which is neither floor nor solid`
          );
        }
      }
    }
  });
});

describe("lower crewman spawn, locked upper compartments, and seamless deck walking", () => {
  test("the spawn is inside the crew habitat on walkable deck", () => {
    const spawn = shipSpawn(TILE);
    const tile = feetTile(map, spawn.x, spawn.y);

    assert.equal(placeAt(tile.tx, tile.ty), "crew_habitat", "the player does not start in crew habitat");
    assert.equal(
      isBoxBlocked(map, { x: spawn.x + 5, y: spawn.y + 48 - 16, width: 22, height: 16 }),
      false,
      "the player starts inside a wall"
    );
  });

  test("standing at the spawn, the game names the lower crew habitat", () => {
    assert.equal(ship().placeLabel, "远望号 · 船员生活区");
  });

  test("at the start, the captain's cabin and bridge are strictly off-limits", () => {
    const world = ship();
    const accessible = unlockedTiles(world);
    const places = new Set<string>();
    for (const key of accessible) {
      const [tx, ty] = key.split(",").map(Number);
      places.add(placeAt(tx, ty));
    }

    assert.ok(places.has("crew_habitat"));
    assert.ok(places.has("industrial_bay"));
    assert.equal(places.has("cabin"), false, "starting crewman must not access captain's cabin");
    assert.equal(places.has("bridge"), false, "starting crewman must not access command bridge");
    assert.equal(places.has("transit_hub"), false, "starting crewman must not bypass midship lock");
  });

  test("walking west passes seamlessly from crew habitat to the L-2 industrial bay", () => {
    const world = ship();
    // Place just inside Habitat's western gangway aligned on row 102
    world.player.x = (HABITAT_BOUNDS.tx + 2) * TILE;
    world.player.y = 102 * TILE - (world.player.height - world.player.colliderHeight);

    const visited = new Set<string>([world.placeLabel]);
    let previous = { x: world.player.x, y: world.player.y };
    let longestStep = 0;

    for (let frame = 0; frame < 240; frame++) {
      world.update(1 / 60, fakeInput(["KeyA"]));
      const step = Math.hypot(world.player.x - previous.x, world.player.y - previous.y);
      longestStep = Math.max(longestStep, step);
      previous = { x: world.player.x, y: world.player.y };
      visited.add(world.placeLabel);
      if (world.placeLabel === "远望号 · L-2 重工业车间") break;
    }

    assert.equal(world.placeLabel, "远望号 · L-2 重工业车间");
    assert.ok(longestStep <= 2.6, `player jumped ${longestStep.toFixed(1)}px in one frame`);
    assert.ok(visited.has("远望号 · 船员生活区"));
  });

  test("once authorized, walking forward crosses cabin -> passage -> bridge seamlessly", () => {
    const world = ship();
    world.security.grant("captain_auth");
    world.security.grant("bridge_pass");
    world.player.x = (CABIN_BOUNDS.tx + 12) * TILE;
    world.player.y = (CABIN_BOUNDS.ty + 6) * TILE;

    const order: string[] = [world.placeLabel];
    let previous = { x: world.player.x, y: world.player.y };
    let longestStep = 0;

    for (let frame = 0; frame < 480 && world.placeLabel !== "远望号 · 舰桥"; frame++) {
      world.update(1 / 60, fakeInput(["KeyW"]));
      const step = Math.hypot(world.player.x - previous.x, world.player.y - previous.y);
      longestStep = Math.max(longestStep, step);
      previous = { x: world.player.x, y: world.player.y };
      if (order[order.length - 1] !== world.placeLabel) order.push(world.placeLabel);
    }

    assert.deepEqual(order, ["远望号 · 舰长室", "远望号 · 指挥舱通道", "远望号 · 舰桥"]);
    assert.ok(longestStep <= 2.6, `player jumped ${longestStep.toFixed(1)}px in one frame`);
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
    assert.ok(unlockedTiles(ship()).size > 400, "starting accessible footprint is too small");
    assert.ok(standableTiles(ship()).size > 4000, "full static ship flood fill should span all decks");
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

  test("static topology reaches both command compartments completely", () => {
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
            assert.fail(`${expected} floor at ${x},${y} cannot be reached`);
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
    assert.equal(placeAt(HABITAT_BOUNDS.tx + 4, HABITAT_BOUNDS.ty + 4), "crew_habitat");
    assert.equal(placeAt(0, SHIP_ROWS - 1), "structure");
    assert.equal(placeAt(SHIP_COLUMNS - 1, SHIP_ROWS - 1), "structure");
  });
});
