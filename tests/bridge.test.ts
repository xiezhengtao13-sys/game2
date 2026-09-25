import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BRIDGE_PROPS, BRIDGE_PEOPLE } from "../src/game/scenes/bridgeProps";
import { Bridge } from "../src/game/scenes/Bridge";
import { createBridgeMap, BRIDGE_COLUMNS, BRIDGE_ROWS, BRIDGE_SHAPES, BRIDGE_HALL } from "../src/game/map/bridgeMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";
import { BRIDGE_TILE, PLAYER_INTERACT_REACH } from "../src/game/config";
import type { Input } from "../src/engine/input/Input";

// The bridge: an elliptical command hall, deliberately larger than the cabin.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

const bridge = () => new Bridge(createBridgeMap(BRIDGE_TILE), null);
const bridgeMap = () => createBridgeMap(BRIDGE_TILE);

/** True when this tile is floor the player could stand on. */
function isFloor(type: string | null): boolean {
  return type === "deck" || type === "deck_dark" || type === "deck_rug" || type === "floor_light";
}

/** Every tile the player can stand on, reached by walking from the spawn. */
function standableTiles(scene: Bridge): Set<string> {
  const map = scene.tileMap;
  const size = map.tileSize;
  const collider = { width: 22, height: 16 };

  const free = (tx: number, ty: number) =>
    !isBoxBlocked(map, {
      x: tx * size + (size - collider.width) / 2,
      y: ty * size + (size - collider.height) / 2,
      ...collider
    });

  const startTx = Math.floor(scene.player.centerX / size);
  const startTy = Math.floor((scene.player.y + scene.player.height - 8) / size);
  const seen = new Set<string>();
  if (!free(startTx, startTy)) return seen;

  const queue = [{ tx: startTx, ty: startTy }];
  seen.add(`${startTx},${startTy}`);

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
      if (seen.has(key) || !map.inBounds(nx, ny) || !free(nx, ny)) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }

  return seen;
}

describe("the bridge hall (TASK-S2)", () => {
  test("the map is the size the config declares", () => {
    const map = bridgeMap();

    assert.equal(map.width, BRIDGE_COLUMNS);
    assert.equal(map.height, BRIDGE_ROWS);
    assert.equal(map.pixelWidth, BRIDGE_COLUMNS * BRIDGE_TILE);
    assert.equal(map.pixelHeight, BRIDGE_ROWS * BRIDGE_TILE);
  });

  test("it is far larger than the captain's cabin", () => {
    // The setting document repeatedly asks for scale differences between parts of
    // the ship to be obvious. Compared against the cabin directly, so the test
    // says what it means rather than quoting an arbitrary tile count.
    const map = bridgeMap();
    const cabin = 24 * 40 * (16 * 40);

    assert.ok(
      map.pixelWidth * map.pixelHeight > cabin * 2,
      `the bridge is ${map.pixelWidth * map.pixelHeight}px2 against the cabin's ${cabin}`
    );

    // And it does not fit on one screen, which is what makes it feel big.
    assert.ok(map.pixelWidth > 1280, "the bridge should not fit on one screen");
  });

  test("every declared shape fits inside the hall", () => {
    for (const shape of BRIDGE_SHAPES) {
      assert.ok(shape.x >= 0 && shape.y >= 0, `shape starts outside: ${shape.note}`);
      assert.ok(shape.x + shape.w <= BRIDGE_COLUMNS, `shape too wide: ${shape.note}`);
      assert.ok(shape.y + shape.h <= BRIDGE_ROWS, `shape too tall: ${shape.note}`);
    }
  });

  test("the player cannot walk from the hall to the hull", () => {
    // The property that matters, checked against the real collision and the real
    // route rather than tile-by-tile adjacency: flood-fill outward from where the
    // player arrives, and assert that nowhere they can stand touches the hull.
    const scene = bridge();
    const map = scene.tileMap;
    const reached = standableTiles(scene);

    assert.ok(reached.size > 200, `only ${reached.size} tiles reachable`);

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

  test("the hall is the size the prop layout assumes", () => {
    // Props are hand-placed inside rows 5..15, columns 5..34. If the hall is ever
    // retuned, this fails before the props silently end up in a bulkhead.
    const map = bridgeMap();
    let minTx = Infinity;
    let maxTx = -Infinity;
    let minTy = Infinity;
    let maxTy = -Infinity;

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const type = map.tileAt(tx, ty);
        if (type !== "deck_dark" && type !== "screen") continue;
        minTx = Math.min(minTx, tx);
        maxTx = Math.max(maxTx, tx);
        minTy = Math.min(minTy, ty);
        maxTy = Math.max(maxTy, ty);
      }
    }

    assert.equal(minTx, BRIDGE_HALL.x0, "the port edge of the hall moved");
    assert.equal(maxTx, BRIDGE_HALL.x1, "the starboard edge of the hall moved");
    assert.equal(minTy, BRIDGE_HALL.y0, "the forward edge of the hall moved");
    assert.equal(maxTy, BRIDGE_HALL.y1, "the aft edge of the hall moved");
  });

  test("the hall is ringed by bulkheads and the outside is solid", () => {
    const map = bridgeMap();

    // Corners of the grid are outside the ellipse, so they must be solid.
    for (const [tx, ty] of [
      [0, 0],
      [BRIDGE_COLUMNS - 1, 0],
      [0, BRIDGE_ROWS - 1],
      [BRIDGE_COLUMNS - 1, BRIDGE_ROWS - 1]
    ]) {
      assert.equal(map.tileAt(tx, ty), "hull", `corner ${tx},${ty} is not solid hull`);
    }

    // And the centre is deck you can walk on.
    const cx = Math.floor(BRIDGE_COLUMNS / 2);
    const cy = Math.floor(BRIDGE_ROWS / 2);
    assert.notEqual(map.tileAt(cx, cy), "hull");
  });

  test("the wrap-around display runs continuously across the front", () => {
    // Not an exact tile count: the display follows the forward bulkhead, so its
    // width is whatever the hull's curve allows at that row. What matters is
    // that it is one unbroken run, and that it is wide.
    const map = bridgeMap();
    const runs: number[] = [];

    for (let ty = 0; ty < map.height; ty++) {
      let run = 0;
      for (let tx = 0; tx < map.width; tx++) {
        if (map.tileAt(tx, ty) === "screen") {
          run++;
        } else if (run > 0) {
          runs.push(run);
          run = 0;
        }
      }
      if (run > 0) runs.push(run);
    }

    assert.equal(runs.length, 1, `the display is broken into ${runs.length} pieces`);
    assert.ok(runs[0] >= 12, `the display is only ${runs[0]} tiles wide`);
  });

  test("the display is forward of the captain's chair", () => {
    // Forward is north, matching how the player reads the screen.
    const map = bridgeMap();
    let screenY = -1;
    for (let ty = 0; ty < map.height && screenY < 0; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.tileAt(tx, ty) === "screen") {
          screenY = ty;
          break;
        }
      }
    }

    const chair = BRIDGE_PROPS.find((p) => p.assetId === "fx_command_chair")!;
    assert.ok(screenY >= 0, "no display found");
    assert.ok(chair.y / BRIDGE_TILE > screenY, "the chair is not aft of the display");
  });

  test("the player arrives in the hall, on walkable deck", () => {
    const scene = bridge();
    const map = scene.tileMap;
    const size = map.tileSize;

    const collider = {
      x: scene.player.x + 5,
      y: scene.player.y + 48 - 16,
      width: 22,
      height: 16
    };
    assert.equal(isBoxBlocked(map, collider), false, "the player arrives inside the hull");

    // Specifically inside the command floor, not out in the aisle.
    const feetTy = Math.floor((scene.player.y + 48 - 8) / size);
    const tx = Math.floor(scene.player.centerX / size);
    assert.equal(
      map.tileAt(tx, feetTy),
      "deck_dark",
      `the player arrives on ${map.tileAt(tx, feetTy)} rather than the hall floor`
    );
  });
});

describe("the bridge is a functioning scene (TASK-S2)", () => {
  test("the camera follows the player, because the hall is bigger than the viewport", () => {
    const scene = bridge();
    const map = scene.tileMap;

    // The map is wider and taller than any plausible viewport, so the camera
    // must be free to move rather than pinned.
    assert.ok(map.pixelWidth > 1280, "the bridge should not fit on one screen");
    assert.ok(map.pixelHeight > 720, "the bridge should not fit on one screen");

    const first = scene.getCamera();
    assert.equal(first.mapWidth, map.pixelWidth);

    // Walk east and the camera should follow.
    for (let i = 0; i < 120; i++) scene.update(0.016, fakeInput(["KeyD"]));
    const after = scene.getCamera();
    assert.ok(after.x > first.x, "the camera did not follow the player");
  });

  test("every prop sits inside the hall", () => {
    for (const prop of BRIDGE_PROPS) {
      const halfW = (prop.w * BRIDGE_TILE) / 2;
      const halfH = (prop.h * BRIDGE_TILE) / 2;
      assert.ok(prop.x - halfW >= 0, `${prop.label} hangs off the west side`);
      assert.ok(prop.x + halfW <= BRIDGE_COLUMNS * BRIDGE_TILE, `${prop.label} hangs off the east`);
      assert.ok(prop.y - halfH >= 0, `${prop.label} hangs off the forward side`);
      assert.ok(prop.y + halfH <= BRIDGE_ROWS * BRIDGE_TILE, `${prop.label} hangs off the aft`);
    }
  });

  test("the six departments the document lists all have a station", () => {
    const labels = BRIDGE_PROPS.map((p) => p.label);
    for (const station of ["导航席", "通信席", "动力席", "防务席", "科学席", "人员席"]) {
      assert.ok(labels.includes(station), `the bridge has no ${station}`);
    }
  });

  test("the captain is on the bridge, with his own lines", () => {
    const captain = BRIDGE_PEOPLE.find((p) => p.id === "captain");
    assert.ok(captain, "no captain on the bridge");
    assert.ok(captain.lines.length > 0, "the captain says nothing");
    assert.ok(captain.promptLabel.includes(captain.name));
  });

  test("his bridge lines differ from his quarters lines", async () => {
    // Finding him in two places should feel like two places, not one line set
    // pasted twice.
    const { ROOM_PEOPLE } = await import("../src/game/scenes/captainRoomPeople");
    const here = BRIDGE_PEOPLE.find((p) => p.id === "captain")!.lines.map((l) => l.text);
    const there = ROOM_PEOPLE.find((p) => p.id === "captain")!.lines.map((l) => l.text);

    assert.notDeepEqual(here, there, "the captain says the same thing in both rooms");
  });

  test("everyone standing on the bridge is on walkable deck and clear of furniture", () => {
    const map = bridgeMap();

    for (const person of BRIDGE_PEOPLE) {
      const collider = { x: person.x - 11, y: person.y - 16, width: 22, height: 16 };
      assert.equal(isBoxBlocked(map, collider), false, `${person.name} stands in a bulkhead`);

      for (const prop of BRIDGE_PROPS) {
        const halfW = (prop.w * BRIDGE_TILE) / 2;
        const halfH = (prop.h * BRIDGE_TILE) / 2;
        const inside =
          person.x > prop.x - halfW &&
          person.x < prop.x + halfW &&
          person.y > prop.y - halfH &&
          person.y < prop.y + halfH;
        assert.equal(inside, false, `${person.name} is standing inside the ${prop.label}`);
      }
    }
  });

  test("every person and prop can be reached by walking", () => {
    const scene = bridge();
    const tiles = standableTiles(scene);

    assert.ok(tiles.size > 200, `only ${tiles.size} tiles reachable on the bridge`);

    const wanted = [
      ...BRIDGE_PROPS.filter((p) => p.lines && p.lines.length > 0).map((p) => p.label),
      ...BRIDGE_PEOPLE.map((p) => p.promptLabel)
    ];

    for (const label of wanted) {
      let found = false;

      for (const key of tiles) {
        const [tx, ty] = key.split(",").map(Number);
        const centerX = tx * BRIDGE_TILE + BRIDGE_TILE / 2;
        const feetY = ty * BRIDGE_TILE + BRIDGE_TILE / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          if (findInteractable(scene.examinable, reach)?.label === label) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      assert.ok(found, `nothing reachable prompts for ${label}`);
    }
  });

  test("scenery props are not interaction targets", () => {
    const scene = bridge();
    const scenery = BRIDGE_PROPS.filter((p) => p.lines === null);

    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const keys = i % 4 === 0 ? ["KeyD"] : i % 4 === 1 ? ["KeyW"] : i % 4 === 2 ? ["KeyA"] : ["KeyS"];
      scene.update(0.016, fakeInput(keys));
      if (scene.interactionLabel) seen.add(scene.interactionLabel);
    }

    for (const prop of scenery) {
      assert.ok(!seen.has(prop.label), `scenery prop ${prop.label} produced a prompt`);
    }
  });
});
