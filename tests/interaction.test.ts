import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  facingVector,
  findInteractable,
  reachPoint,
  type Interactable
} from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH, PLAYER_SPAWN } from "../src/game/config";
import { createTownMap, TOWN_INTERACTABLES } from "../src/game/map/townMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { Player } from "../src/game/entities/Player";
import { TileMap, type TileType } from "../src/game/map/TileMap";
import type { Facing } from "../src/game/assets/animationSpec";
import type { Input } from "../src/engine/input/Input";

// TASK-107: the player is prompted about the thing they are facing, and about
// the nearest such thing. Both halves matter: facing keeps the prompt relevant,
// and nearest-wins keeps it from flickering when two objects are in reach.

const item = (id: string, x: number, y: number, radius = 40): Interactable => ({
  id,
  label: id,
  x,
  y,
  radius
});

function openMap() {
  return new TileMap(new Array(40 * 40).fill("grass"), 40, 40, 48);
}

/** A stand-in Input that reports a fixed set of held keys and no fresh presses. */
function fakeInput(codes: string[]): Input {
  return {
    isDown: (code: string) => codes.includes(code),
    wasPressed: () => false
  } as unknown as Input;
}

describe("facingVector (TASK-107)", () => {
  test("points the right way on screen, where y grows downwards", () => {
    assert.deepEqual(facingVector("up"), { x: 0, y: -1 });
    assert.deepEqual(facingVector("down"), { x: 0, y: 1 });
    assert.deepEqual(facingVector("left"), { x: -1, y: 0 });
    assert.deepEqual(facingVector("right"), { x: 1, y: 0 });
  });
});

describe("reachPoint (TASK-107)", () => {
  test("sits in front of the player at the given distance", () => {
    assert.deepEqual(reachPoint(100, 200, "down", 44), { x: 100, y: 244 });
    assert.deepEqual(reachPoint(100, 200, "up", 44), { x: 100, y: 156 });
    assert.deepEqual(reachPoint(100, 200, "left", 44), { x: 56, y: 200 });
    assert.deepEqual(reachPoint(100, 200, "right", 44), { x: 144, y: 200 });
  });
});

describe("findInteractable (TASK-107)", () => {
  test("returns null when nothing is in range", () => {
    assert.equal(findInteractable([item("a", 1000, 1000)], { x: 0, y: 0 }), null);
  });

  test("returns null for an empty list", () => {
    assert.equal(findInteractable([], { x: 0, y: 0 }), null);
  });

  test("finds a single object in range", () => {
    assert.equal(findInteractable([item("door", 10, 0)], { x: 0, y: 0 })?.id, "door");
  });

  test("picks the nearest of several in range", () => {
    const list = [item("far", 30, 0), item("near", 10, 0), item("mid", 20, 0)];

    assert.equal(findInteractable(list, { x: 0, y: 0 })?.id, "near");
  });

  test("the nearest does not depend on list order", () => {
    const a = [item("far", 30, 0), item("near", 10, 0)];
    const b = [item("near", 10, 0), item("far", 30, 0)];

    assert.equal(findInteractable(a, { x: 0, y: 0 })?.id, "near");
    assert.equal(findInteractable(b, { x: 0, y: 0 })?.id, "near");
  });

  test("chooses stably when two objects are exactly equidistant", () => {
    // Without a tie-break the winner would follow iteration order, which is
    // exactly the flicker this task must avoid.
    const left = item("aaa", -20, 0);
    const right = item("bbb", 20, 0);

    assert.equal(findInteractable([left, right], { x: 0, y: 0 })?.id, "aaa");
    assert.equal(findInteractable([right, left], { x: 0, y: 0 })?.id, "aaa");
  });

  test("does not switch target when the reach point drifts slightly", () => {
    // The player standing still while the reach point wobbles by a fraction of a
    // pixel must not alternate between two objects.
    const list = [item("near", 10, 0, 30), item("far", 34, 0, 60)];
    const seen = new Set<string>();

    for (let i = 0; i < 200; i++) {
      const wobble = (i % 2) * 0.01;
      seen.add(findInteractable(list, { x: wobble, y: 0 })?.id ?? "none");
    }

    assert.deepEqual([...seen], ["near"], `prompt flickered between ${[...seen].join(", ")}`);
  });

  test("ignores objects beyond their own radius", () => {
    // "tiny" is closer but has a small radius; "generous" reaches further.
    const list = [item("tiny", 15, 0, 5), item("generous", 25, 0, 40)];

    assert.equal(findInteractable(list, { x: 0, y: 0 })?.id, "generous");
  });
});

describe("facing decides what is in reach (TASK-107)", () => {
  const north = item("north", 500, 500 - PLAYER_INTERACT_REACH, 30);
  const south = item("south", 500, 500 + PLAYER_INTERACT_REACH, 30);
  const list = [north, south];

  const reachFor = (facing: Facing) => reachPoint(500, 500, facing, PLAYER_INTERACT_REACH);

  test("prompts the object the player is facing", () => {
    assert.equal(findInteractable(list, reachFor("up"))?.id, "north");
    assert.equal(findInteractable(list, reachFor("down"))?.id, "south");
  });

  test("does not prompt when facing away from everything", () => {
    assert.equal(findInteractable(list, reachFor("left")), null);
  });

  test("turning around swaps the prompt", () => {
    assert.equal(findInteractable(list, reachFor("up"))?.id, "north");
    assert.equal(findInteractable(list, reachFor("down"))?.id, "south");
    assert.equal(findInteractable(list, reachFor("up"))?.id, "north");
  });
});

describe("town interactables (TASK-107)", () => {
  test("ids are unique", () => {
    const ids = TOWN_INTERACTABLES.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(", ")}`);
  });

  test("every one has a label and a positive reach", () => {
    for (const entry of TOWN_INTERACTABLES) {
      assert.ok(entry.label.length > 0, `${entry.id}: empty label`);
      assert.ok(entry.radius > 0, `${entry.id}: non-positive radius`);
    }
  });

  test("every one sits on walkable ground inside the map", () => {
    // An interactable inside a wall could never be reached.
    const map = createTownMap();

    for (const entry of TOWN_INTERACTABLES) {
      assert.ok(
        entry.x >= 0 && entry.y >= 0 && entry.x < map.pixelWidth && entry.y < map.pixelHeight,
        `${entry.id} is outside the map`
      );

      const box = { x: entry.x - 8, y: entry.y - 8, width: 16, height: 16 };
      assert.equal(isBoxBlocked(map, box), false, `${entry.id} is inside a solid tile`);
    }
  });

  /**
   * Flood-fill the walkable tiles reachable from the player's spawn.
   *
   * Used to prove each interactable is actually reachable by walking, with real
   * collision, instead of trusting that the coordinates look sensible.
   */
  function reachableTiles(map: TileMap, fromX: number, fromY: number): Set<string> {
    const size = map.tileSize;
    const collider = { width: 22, height: 16 };

    const blocked = (tx: number, ty: number): boolean => {
      // The collider is narrower than a tile, so test it centred in the tile.
      const box = {
        x: tx * size + (size - collider.width) / 2,
        y: ty * size + (size - collider.height) / 2,
        ...collider
      };
      return isBoxBlocked(map, box);
    };

    const start = { tx: Math.floor(fromX / size), ty: Math.floor(fromY / size) };
    const seen = new Set<string>();
    if (blocked(start.tx, start.ty)) return seen;

    const queue = [start];
    seen.add(`${start.tx},${start.ty}`);

    while (queue.length > 0) {
      const { tx, ty } = queue.shift()!;
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const nx = tx + ox;
        const ny = ty + oy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !map.inBounds(nx, ny) || blocked(nx, ny)) continue;
        seen.add(key);
        queue.push({ tx: nx, ty: ny });
      }
    }

    return seen;
  }

  /** Every walkable tile the player can stand on, from their spawn. */
  function walkableFromSpawn() {
    const map = createTownMap();
    return { map, tiles: reachableTiles(map, PLAYER_SPAWN.x, PLAYER_SPAWN.y) };
  }

  test("the spawn is on the reachable set", () => {
    const { map, tiles } = walkableFromSpawn();
    const size = map.tileSize;
    const key = `${Math.floor(PLAYER_SPAWN.x / size)},${Math.floor(PLAYER_SPAWN.y / size)}`;

    assert.ok(tiles.has(key), "the player cannot stand where they spawn");
  });

  test("walkable ground is a decent chunk of the town, not a sealed box", () => {
    const { map, tiles } = walkableFromSpawn();

    // Guards against a map edit walling the player into a small pocket.
    assert.ok(
      tiles.size > map.width * map.height * 0.3,
      `only ${tiles.size} of ${map.width * map.height} tiles are reachable`
    );
  });

  for (const id of TOWN_INTERACTABLES.map((i) => i.id)) {
    test(`the ${id} can be prompted from a tile the player can actually walk to`, () => {
      const { map, tiles } = walkableFromSpawn();
      const target = TOWN_INTERACTABLES.find((i) => i.id === id)!;
      const size = map.tileSize;

      // Try standing on each reachable tile, facing each of the four ways, and
      // see whether any of them prompts for this target.
      let found: string | null = null;

      for (const key of tiles) {
        const [tx, ty] = key.split(",").map(Number);
        const centerX = tx * size + size / 2;
        const feetY = ty * size + size / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          if (findInteractable(TOWN_INTERACTABLES, reach)?.id === id) {
            found = `${key} facing ${facing}`;
            break;
          }
        }
        if (found) break;
      }

      assert.ok(found, `no reachable tile prompts for ${id}`);
    });
  }

  test("standing on a reachable tile never prompts for something unreachable", () => {
    // Every id the prompt can ever name must be in the list.
    const known = new Set(TOWN_INTERACTABLES.map((i) => i.id));
    const { map, tiles } = walkableFromSpawn();
    const size = map.tileSize;

    for (const key of tiles) {
      const [tx, ty] = key.split(",").map(Number);
      const centerX = tx * size + size / 2;
      const feetY = ty * size + size / 2;

      for (const facing of ["up", "down", "left", "right"] as const) {
        const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
        const target = findInteractable(TOWN_INTERACTABLES, reach);
        if (target) assert.ok(known.has(target.id), `prompted for unknown ${target.id}`);
      }
    }
  });
});

describe("TownWorld exposes the current target (TASK-107)", () => {
  test("starts with no target at the crossroads", async () => {
    const { TownWorld } = await import("../src/game/TownWorld");
    const world = new TownWorld(createTownMap(), null);

    world.update(0.016, fakeInput([]));

    assert.equal(world.interactionTarget, null, "nothing should be in reach at spawn");
  });

  test("targets the notice board when standing on the side street facing it", async () => {
    const { TownWorld } = await import("../src/game/TownWorld");
    const map = createTownMap();
    const world = new TownWorld(map, null);

    const board = TOWN_INTERACTABLES.find((i) => i.id === "noticeboard")!;
    // Stand one tile south of the board, facing north to look at it.
    world.player.x = board.x - world.player.width / 2;
    world.player.y = board.y + 48 - world.player.height;

    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "noticeboard");
  });

  test("loses the target after turning away", async () => {
    const { TownWorld } = await import("../src/game/TownWorld");
    const world = new TownWorld(createTownMap(), null);

    const board = TOWN_INTERACTABLES.find((i) => i.id === "noticeboard")!;
    world.player.x = board.x - world.player.width / 2;
    world.player.y = board.y + 48 - world.player.height;

    world.update(0.016, fakeInput(["KeyW"]));
    assert.equal(world.interactionTarget?.id, "noticeboard");

    world.update(0.016, fakeInput(["KeyS"]));
    assert.notEqual(world.interactionTarget?.id, "noticeboard", "should not still be prompting");
  });
});
