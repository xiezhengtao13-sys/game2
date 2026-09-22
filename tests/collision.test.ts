import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TileMap, isSolidTile, type TileType } from "../src/game/map/TileMap";
import { isBoxBlocked, resolveMovement, type Box } from "../src/game/map/collision";
import { Player } from "../src/game/entities/Player";

// TASK-105: tile collision. Per-axis resolution is the whole point -- resolving
// both axes at once is what produces a player who sticks to walls instead of
// sliding along them.

const SIZE = 48;

/**
 * Build a small map from rows of single characters.
 *   "." grass (walkable)   "#" wall (solid)   "~" water (solid)
 */
function buildMap(rows: string[]): TileMap {
  const legend: Record<string, TileType> = { ".": "grass", "#": "wall", "~": "water" };
  const width = rows[0].length;
  const grid: TileType[] = [];
  for (const row of rows) {
    assert.equal(row.length, width, "test map rows must be the same length");
    for (const char of row) {
      const type = legend[char];
      assert.ok(type, `unknown test map char "${char}"`);
      grid.push(type);
    }
  }
  return new TileMap(grid, width, rows.length, SIZE);
}

/** A 20x20 box at the given pixel position. */
function boxAt(x: number, y: number, w = 20, h = 20): Box {
  return { x, y, width: w, height: h };
}

describe("solid tiles (TASK-105)", () => {
  test("water, walls and roofs block; grass, path and farmland do not", () => {
    assert.equal(isSolidTile("water"), true);
    assert.equal(isSolidTile("wall"), true);
    assert.equal(isSolidTile("roof"), true);

    assert.equal(isSolidTile("grass"), false);
    assert.equal(isSolidTile("path"), false);
    assert.equal(isSolidTile("farmland"), false);
  });
});

describe("isBoxBlocked (TASK-105)", () => {
  // A 3x3 map with a single wall tile at (1, 1), i.e. pixels 48..96.
  const map = buildMap(["...", ".#.", "..."]);

  test("open ground is not blocked", () => {
    assert.equal(isBoxBlocked(map, boxAt(0, 0)), false);
    assert.equal(isBoxBlocked(map, boxAt(96, 96)), false);
  });

  test("overlapping a wall tile is blocked", () => {
    assert.equal(isBoxBlocked(map, boxAt(50, 50)), true);
    assert.equal(isBoxBlocked(map, boxAt(40, 40)), true, "partially overlapping counts");
  });

  test("a box that only touches the wall's edge is not blocked", () => {
    // Right edge exactly on x = 48, which is the wall's left boundary.
    assert.equal(isBoxBlocked(map, boxAt(28, 54)), false);
    assert.equal(isBoxBlocked(map, boxAt(96, 54)), false, "left edge on the far boundary");
  });

  test("outside the map counts as blocked", () => {
    assert.equal(isBoxBlocked(map, boxAt(-1, 0)), true);
    assert.equal(isBoxBlocked(map, boxAt(0, -1)), true);
    assert.equal(isBoxBlocked(map, boxAt(SIZE * 3 - 10, 0, 20, 20)), true);
  });
});

describe("resolveMovement: blocking (TASK-105)", () => {
  // Wall across the whole right-hand column, x = 2 (pixels 96..144).
  const map = buildMap(["..#", "..#", "..#"]);

  test("a clear move is applied exactly", () => {
    const moved = resolveMovement(map, boxAt(0, 0), 30, 20);
    assert.equal(moved.x, 30);
    assert.equal(moved.y, 20);
  });

  test("moving into a wall stops flush against it", () => {
    const box = boxAt(60, 0, 20, 20);

    // Ask for far more than the gap allows; must stop with the right edge at 96.
    const moved = resolveMovement(map, box, 500, 0);

    assert.ok(Math.abs(moved.x + box.width - 96) < 1e-6, `stopped at ${moved.x + box.width}, expected 96`);
    assert.ok(!isBoxBlocked(map, { ...box, x: moved.x }));
  });

  test("moving left into a wall stops flush against it", () => {
    // Wall down the left-hand column instead, for a leftward test.
    const leftWall = buildMap(["#..", "#..", "#.."]);
    const box = boxAt(70, 0, 20, 20);

    const moved = resolveMovement(leftWall, box, -500, 0);

    assert.ok(Math.abs(moved.x - 48) < 1e-6, `stopped at ${moved.x}, expected 48`);
  });

  test("a single huge step cannot tunnel through a wall", () => {
    const box = boxAt(60, 0, 20, 20);

    // One absurd frame: 100000px. A fixed-step sweep would jump the wall.
    const moved = resolveMovement(map, box, 100000, 0);

    assert.ok(moved.x + box.width <= 96 + 1e-6, `tunnelled to ${moved.x}`);
  });

  test("a tiny step does not creep into a wall over many frames", () => {
    let box = boxAt(60, 0, 20, 20);
    for (let i = 0; i < 5000; i++) {
      const moved = resolveMovement(map, box, 0.01, 0);
      box = { ...box, x: moved.x };
    }

    assert.ok(box.x + box.width <= 96 + 1e-6, `crept to ${box.x + box.width}`);
    assert.ok(box.x + box.width > 95.9, "should end up pressed against the wall");
  });

  test("cannot leave the map", () => {
    const open = buildMap(["...", "...", "..."]);

    const left = resolveMovement(open, boxAt(0, 0), -100, 0);
    assert.equal(left.x, 0);

    const top = resolveMovement(open, boxAt(0, 0), 0, -100);
    assert.equal(top.y, 0);

    const right = resolveMovement(open, boxAt(100, 0, 20, 20), 9999, 0);
    assert.ok(right.x + 20 <= SIZE * 3 + 1e-6);

    const bottom = resolveMovement(open, boxAt(0, 100, 20, 20), 0, 9999);
    assert.ok(bottom.y + 20 <= SIZE * 3 + 1e-6);
  });
});

describe("resolveMovement: sliding (TASK-105)", () => {
  // Wall column at x=2 running the full height.
  const map = buildMap(["..#", "..#", "..#"]);

  test("a diagonal move into a wall still slides along it", () => {
    const box = boxAt(60, 0, 20, 20);

    // Push right and down: the x move is blocked, the y move is free.
    const moved = resolveMovement(map, box, 100, 30);

    assert.ok(Math.abs(moved.x + box.width - 96) < 1e-6, "should stop flush against the wall");
    assert.equal(moved.y, 30, "the free axis must still complete its move");
  });

  test("sliding keeps working across many frames", () => {
    let box = boxAt(60, 0, 20, 20);
    for (let i = 0; i < 60; i++) {
      const moved = resolveMovement(map, box, 1, 1);
      box = { ...box, x: moved.x, y: moved.y };
    }

    assert.ok(Math.abs(box.x + box.width - 96) < 1e-6, "should stay pressed against the wall");
    assert.ok(box.y > 55, `should have slid down, ended at ${box.y}`);
    assert.ok(!isBoxBlocked(map, box));
  });

  test("moving directly away from a wall is never blocked by it", () => {
    const box = boxAt(76, 0, 20, 20); // right edge flush with the wall at 96
    const moved = resolveMovement(map, box, -50, 0);

    assert.equal(moved.x, 26);
  });

  test("moving parallel to a wall is unobstructed", () => {
    const box = boxAt(76, 0, 20, 20);
    const moved = resolveMovement(map, box, 0, 60);

    assert.equal(moved.y, 60);
    assert.equal(moved.x, box.x);
  });

  test("a corner cannot be cut through diagonally", () => {
    // Wall at (1,1) only. A box sliding into the corner must not pass through.
    const corner = buildMap(["...", ".#.", "..."]);
    const box = boxAt(20, 20, 20, 20);

    // Drive hard toward the bottom-right, straight at the wall's corner.
    const moved = resolveMovement(corner, box, 200, 200);

    assert.ok(!isBoxBlocked(corner, { ...box, x: moved.x, y: moved.y }), "ended inside a wall");
  });

  test("diagonal movement never ends inside a solid tile", () => {
    // A pillar field: any hard diagonal will meet a corner at some point.
    const pillars = buildMap([".....", ".#.#.", ".....", ".#.#.", "....."]);

    let box = boxAt(10, 10, 20, 20);
    const dirs: Array<[number, number]> = [
      [3, 2],
      [-3, 2],
      [3, -2],
      [-3, -2],
      [0, 4],
      [4, 0]
    ];

    for (let i = 0; i < 400; i++) {
      const [dx, dy] = dirs[i % dirs.length];
      const moved = resolveMovement(pillars, box, dx, dy);
      box = { ...box, x: moved.x, y: moved.y };
      assert.ok(!isBoxBlocked(pillars, box), `ended inside a tile at step ${i}: ${JSON.stringify(box)}`);
    }
  });
});

describe("player collision box (TASK-105)", () => {
  test("the collider sits at the player's feet, centred", () => {
    const player = new Player(100, 200);

    const collider = player.colliderAt();

    assert.equal(collider.width, player.colliderWidth);
    assert.equal(collider.height, player.colliderHeight);
    // Horizontally centred on the sprite.
    assert.equal(collider.x + collider.width / 2, 100 + player.width / 2);
    // Vertically flush with the sprite's bottom.
    assert.equal(collider.y + collider.height, 200 + player.height);
  });

  test("the collider is narrower than the sprite", () => {
    // So the player can squeeze through gaps a full-width box would refuse.
    const player = new Player(0, 0);

    assert.ok(player.colliderWidth < player.width);
    assert.ok(player.colliderHeight < player.height);
  });
});
