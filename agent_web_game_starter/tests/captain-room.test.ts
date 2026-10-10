import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CABIN_PROPS } from "../src/game/scenes/shipProps";
import { CABIN_BOUNDS, PASSAGE_BOUNDS, createShipMap } from "../src/game/map/shipMap";
import { CABIN_DOOR } from "../src/game/map/captainRoomMap";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH, TILE } from "../src/game/config";
import { fakeInput, isFloor, ship, standableTiles } from "./shipWorld";

// The captain's quarters: what is in the room, and whether the player can walk up
// to all of it.
//
// The room is now one compartment of the ship rather than a scene of its own, so
// the geometry checks below are about the cabin's footprint on the deck. What is
// inside the room is unchanged, and these tests are what says so.

const map = createShipMap(TILE);

/** The cabin's own rectangle on the deck, in world pixels. */
const room = {
  left: CABIN_BOUNDS.tx * TILE,
  top: CABIN_BOUNDS.ty * TILE,
  right: (CABIN_BOUNDS.tx + CABIN_BOUNDS.columns) * TILE,
  bottom: (CABIN_BOUNDS.ty + CABIN_BOUNDS.rows) * TILE
};

/** Is this deck tile inside the cabin's rectangle? */
function inCabin(tx: number, ty: number): boolean {
  return (
    tx >= CABIN_BOUNDS.tx &&
    tx < CABIN_BOUNDS.tx + CABIN_BOUNDS.columns &&
    ty >= CABIN_BOUNDS.ty &&
    ty < CABIN_BOUNDS.ty + CABIN_BOUNDS.rows
  );
}

describe("the cabin is laid out to the setting document (TASK-S1)", () => {
  test("it is a 24 x 16 compartment of the deck", () => {
    assert.equal(CABIN_BOUNDS.columns, 24);
    assert.equal(CABIN_BOUNDS.rows, 16);
  });

  test("every prop sits inside the room", () => {
    for (const prop of CABIN_PROPS) {
      const halfW = (prop.w * TILE) / 2;
      const halfH = (prop.h * TILE) / 2;
      assert.ok(prop.x - halfW >= room.left, `${prop.label} hangs off the west wall`);
      assert.ok(prop.x + halfW <= room.right, `${prop.label} hangs off the east wall`);
      assert.ok(prop.y - halfH >= room.top, `${prop.label} hangs off the forward wall`);
      assert.ok(prop.y + halfH <= room.bottom, `${prop.label} hangs off the aft wall`);
    }
  });

  test("every prop has a label, so the prompt can always name it", () => {
    for (const prop of CABIN_PROPS) {
      assert.ok(prop.label.length > 0, `${prop.assetId} has no label`);
    }
  });

  test("the six zones from the setting document are all present", () => {
    // 办公区, 星空观测墙, 会客区, 私人卧室, 阅读区, plus wall decoration.
    const ids = CABIN_PROPS.map((p) => p.assetId);

    for (const required of [
      "fx_desk",
      "fx_obswall",
      "fx_starchart",
      "fx_meeting_table",
      "fx_bed",
      "fx_bookshelf",
      "fx_reading_chair",
      "fx_terminal"
    ]) {
      assert.ok(ids.includes(required), `the room is missing ${required}`);
    }
  });

  test("the meeting table is surrounded by six fixed chairs", () => {
    const chairs = CABIN_PROPS.filter((p) => p.assetId === "fx_chair");
    assert.equal(chairs.length, 6, "设定集 specifies six seats at the round table");

    const table = CABIN_PROPS.find((p) => p.assetId === "fx_meeting_table")!;
    for (const chair of chairs) {
      const distance = Math.hypot(chair.x - table.x, chair.y - table.y);
      assert.ok(distance > 0, "a chair is inside the table");
      assert.ok(distance < TILE * 4, `a chair is ${distance.toFixed(0)}px away, too far to be at the table`);
    }
  });

  test("the doorway is in the forward wall, opening onto the passage to the bridge", () => {
    const doorTx = CABIN_BOUNDS.tx + CABIN_DOOR.x;
    const shoulder = (PASSAGE_BOUNDS.width - CABIN_DOOR.w) / 2;

    assert.equal(CABIN_DOOR.y, 0, "the cabin is entered from forward");
    assert.ok(doorTx >= CABIN_BOUNDS.tx && doorTx + CABIN_DOOR.w <= CABIN_BOUNDS.tx + CABIN_BOUNDS.columns);
    assert.equal(doorTx - shoulder, PASSAGE_BOUNDS.x0, "the doorway is not centred in the passage");

    for (let x = doorTx; x < doorTx + CABIN_DOOR.w; x++) {
      assert.equal(map.tileAt(x, CABIN_BOUNDS.ty), "floor_light", `the doorway is shut at ${x}`);
    }
  });
});

describe("what the player can examine in the cabin (TASK-S1)", () => {
  test("scenery props are not interaction targets", () => {
    // A chair with nothing to say should not produce a prompt.
    const world = ship();
    const scenery = CABIN_PROPS.filter((p) => p.lines === null);
    assert.ok(scenery.length > 0, "expected some pure scenery in the room");

    // Walking around, no prompt should ever name a scenery prop.
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      world.update(0.016, fakeInput(i % 4 === 0 ? ["KeyD"] : ["KeyA"]));
      const label = world.interactionLabel;
      if (label) seen.add(label);
    }

    for (const prop of scenery) {
      assert.ok(!seen.has(prop.label), `scenery prop ${prop.label} produced a prompt`);
    }
  });

  test("every examinable prop has at least one line of text", () => {
    for (const prop of CABIN_PROPS) {
      if (!prop.lines) continue;
      assert.ok(prop.lines.length > 0, `${prop.label} has an empty line list`);
      for (const line of prop.lines) {
        assert.ok(line.text.trim().length > 0, `${prop.label} has a blank line`);
      }
    }
  });

  test("the room has enough to look at to be worth walking around", () => {
    const examinable = CABIN_PROPS.filter((p) => p.lines && p.lines.length > 0);
    assert.ok(examinable.length >= 8, `only ${examinable.length} props can be examined`);
  });
});

describe("every prop in the cabin can actually be walked up to (TASK-S1)", () => {
  const tiles = standableTiles(ship());

  test("the player is not trapped at spawn", () => {
    assert.ok(tiles.size > 50, `only ${tiles.size} tiles reachable from spawn`);
  });

  test("the room's floor is almost entirely reachable", () => {
    // Guards against a layout that walls off half the room.
    let open = 0;
    let reached = 0;

    for (let ty = CABIN_BOUNDS.ty; ty < CABIN_BOUNDS.ty + CABIN_BOUNDS.rows; ty++) {
      for (let tx = CABIN_BOUNDS.tx; tx < CABIN_BOUNDS.tx + CABIN_BOUNDS.columns; tx++) {
        if (!isFloor(map.tileAt(tx, ty))) continue;
        open++;
        if (tiles.has(`${tx},${ty}`)) reached++;
      }
    }

    assert.ok(open > 250, `the cabin has only ${open} floor tiles`);
    assert.ok(reached > open * 0.9, `only ${reached} of ${open} open tiles are reachable`);
  });

  for (const prop of CABIN_PROPS.filter((p) => p.lines && p.lines.length > 0)) {
    test(`the ${prop.label} can be examined from somewhere the player can stand`, () => {
      // Build the same interactable list the world does, then try every reachable
      // tile facing every direction.
      const world = ship();
      let found = false;

      for (const key of tiles) {
        const [tx, ty] = key.split(",").map(Number);
        if (!inCabin(tx, ty)) continue;
        const centerX = tx * TILE + TILE / 2;
        const feetY = ty * TILE + TILE / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          if (findInteractable(world.examinable, reach)?.label === prop.label) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      assert.ok(found, `no reachable tile prompts for ${prop.label}`);
    });
  }
});

describe("examining a prop in the cabin (TASK-S1)", () => {
  const desk = CABIN_PROPS.find((p) => p.assetId === "fx_desk")!;

  /** Stand just aft of something, looking forward at it. */
  function standInFrontOf(world: ReturnType<typeof ship>, prop: { x: number; y: number }) {
    world.player.x = prop.x - world.player.width / 2;
    world.player.y = prop.y + TILE - world.player.height;
    world.player.animation.face("up");
  }

  test("pressing E in front of the desk opens its description", () => {
    const world = ship();
    standInFrontOf(world, desk);

    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.dialogue.isOpen, true, "the description should have opened");
    assert.equal(world.dialogue.current?.text, desk.lines![0].text);
  });

  test("the player is frozen while reading", () => {
    const world = ship();
    standInFrontOf(world, desk);
    world.update(0.016, fakeInput([], ["KeyE"]));

    const before = { x: world.player.x, y: world.player.y };
    for (let i = 0; i < 60; i++) world.update(0.016, fakeInput(["KeyD"]));

    assert.deepEqual({ x: world.player.x, y: world.player.y }, before);
  });

  test("E or space steps through the lines and then closes the box", () => {
    const world = ship();
    standInFrontOf(world, desk);
    world.update(0.016, fakeInput([], ["KeyE"]));

    const total = world.dialogue.lineCount;
    assert.ok(total > 1, "the desk description should have several lines");

    for (let i = 0; i < total; i++) world.update(0.016, fakeInput([], ["Space"]));

    assert.equal(world.dialogue.isOpen, false, "the box should have closed");
  });

  test("the player can walk again once the box is closed", () => {
    const world = ship();
    standInFrontOf(world, desk);
    world.update(0.016, fakeInput([], ["KeyE"]));
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));

    const before = world.player.y;
    for (let i = 0; i < 20; i++) world.update(0.016, fakeInput(["KeyS"]));

    assert.ok(world.player.y > before, "the player should be able to move again");
  });

  test("the UI is told when the box opens and when it closes", () => {
    const world = ship();
    const seen: boolean[] = [];
    world.onDialogueChange = (dialogue) => seen.push(dialogue !== null);

    standInFrontOf(world, desk);
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.deepEqual(seen, [true]);

    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));

    assert.equal(seen[seen.length - 1], false, "the close should be reported");
  });
});
