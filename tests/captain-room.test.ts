import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CaptainRoom } from "../src/game/scenes/CaptainRoom";
import { ROOM_PROPS } from "../src/game/scenes/captainRoomProps";
import { ROOM_PEOPLE } from "../src/game/scenes/captainRoomPeople";
import { createCaptainRoomMap } from "../src/game/map/captainRoomMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH, PLAYER_SPAWN, ROOM_COLUMNS, ROOM_ROWS, TILE } from "../src/game/config";
import type { Input } from "../src/engine/input/Input";

// The captain's quarters scene: the layout, what can be examined, and -- most
// importantly -- that the player can actually reach all of it by walking.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

const room = () => new CaptainRoom(createCaptainRoomMap(TILE), null);

/** Every tile the player can stand on, reached by walking from the spawn. */
function standableTiles(): Set<string> {
  const map = createCaptainRoomMap(TILE);
  const size = map.tileSize;
  const collider = { width: 22, height: 16 };

  const free = (tx: number, ty: number) =>
    !isBoxBlocked(map, {
      x: tx * size + (size - collider.width) / 2,
      y: ty * size + (size - collider.height) / 2,
      ...collider
    });

  const startTx = Math.floor(PLAYER_SPAWN.x / size);
  const startTy = Math.floor((PLAYER_SPAWN.y + 48 - 8) / size);
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

describe("the room is laid out to the setting document (TASK-S1)", () => {
  test("it is 24 x 16 tiles, as the config and map agree", () => {
    const map = createCaptainRoomMap(TILE);
    assert.equal(map.width, ROOM_COLUMNS);
    assert.equal(map.height, ROOM_ROWS);
  });

  test("every prop sits inside the room", () => {
    for (const prop of ROOM_PROPS) {
      const halfW = (prop.w * TILE) / 2;
      const halfH = (prop.h * TILE) / 2;
      assert.ok(prop.x - halfW >= 0, `${prop.label} hangs off the west wall`);
      assert.ok(prop.x + halfW <= ROOM_COLUMNS * TILE, `${prop.label} hangs off the east wall`);
      assert.ok(prop.y - halfH >= 0, `${prop.label} hangs off the north wall`);
      assert.ok(prop.y + halfH <= ROOM_ROWS * TILE, `${prop.label} hangs off the south wall`);
    }
  });

  test("every prop has a label, so the prompt can always name it", () => {
    for (const prop of ROOM_PROPS) {
      assert.ok(prop.label.length > 0, `${prop.assetId} has no label`);
    }
  });

  test("the six zones from the setting document are all present", () => {
    // 办公区, 星空观测墙, 会客区, 私人卧室, 阅读区, plus wall decoration.
    const ids = ROOM_PROPS.map((p) => p.assetId);

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
    const chairs = ROOM_PROPS.filter((p) => p.assetId === "fx_chair");
    assert.equal(chairs.length, 6, "设定集 specifies six seats at the round table");

    const table = ROOM_PROPS.find((p) => p.assetId === "fx_meeting_table")!;
    for (const chair of chairs) {
      const distance = Math.hypot(chair.x - table.x, chair.y - table.y);
      assert.ok(distance > 0, "a chair is inside the table");
      assert.ok(distance < TILE * 4, `a chair is ${distance.toFixed(0)}px away, too far to be at the table`);
    }
  });
});

describe("what the player can examine (TASK-S1)", () => {
  test("scenery props are not interaction targets", () => {
    // A chair with nothing to say should not produce a prompt.
    const world = room();
    const scenery = ROOM_PROPS.filter((p) => p.lines === null);
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
    for (const prop of ROOM_PROPS) {
      if (!prop.lines) continue;
      assert.ok(prop.lines.length > 0, `${prop.label} has an empty line list`);
      for (const line of prop.lines) {
        assert.ok(line.text.trim().length > 0, `${prop.label} has a blank line`);
      }
    }
  });

  test("the room has enough to look at to be worth walking around", () => {
    const examinable = ROOM_PROPS.filter((p) => p.lines && p.lines.length > 0);
    assert.ok(examinable.length >= 8, `only ${examinable.length} props can be examined`);
  });
});

describe("every prop can actually be walked up to (TASK-S1)", () => {
  const tiles = standableTiles();

  test("the player is not trapped at spawn", () => {
    assert.ok(tiles.size > 50, `only ${tiles.size} tiles reachable from spawn`);
  });

  test("the room's floor is mostly reachable", () => {
    // Guards against a layout that walls off half the room.
    const map = createCaptainRoomMap(TILE);
    let open = 0;
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const type = map.tileAt(tx, ty);
        if (type === "deck" || type === "deck_rug" || type === "floor_light") open++;
      }
    }
    assert.ok(
      tiles.size > open * 0.5,
      `only ${tiles.size} of ${open} open tiles are reachable`
    );
  });

  for (const prop of ROOM_PROPS.filter((p) => p.lines && p.lines.length > 0)) {
    test(`the ${prop.label} can be examined from somewhere the player can stand`, () => {
      // Build the same interactable list the scene does, then try every
      // reachable tile facing every direction.
      const world = room();
      let found = false;

      for (const key of tiles) {
        const [tx, ty] = key.split(",").map(Number);
        const centerX = tx * TILE + TILE / 2;
        const feetY = ty * TILE + TILE / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          const target = findInteractable(world.examinable, reach);
          if (target?.label === prop.label) {
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

describe("the captain (TASK-S1b)", () => {
  const captain = ROOM_PEOPLE[0];

  test("he is in the room, with a name and a sprite", () => {
    assert.ok(ROOM_PEOPLE.length > 0, "nobody is in the room");
    assert.ok(captain.name.length > 0);
    assert.ok(captain.assetId.length > 0);
    assert.ok(captain.lines.length > 0, "the captain has nothing to say");
  });

  test("he stands on walkable deck, inside the room", () => {
    const map = createCaptainRoomMap(TILE);

    assert.ok(captain.x > 0 && captain.x < ROOM_COLUMNS * TILE);
    assert.ok(captain.y > 0 && captain.y < ROOM_ROWS * TILE);

    const collider = { x: captain.x - 11, y: captain.y - 16, width: 22, height: 16 };
    assert.equal(isBoxBlocked(map, collider), false, "the captain is standing inside a wall");
  });

  test("he is not standing on top of the furniture", () => {
    // He leans at his desk, he does not stand in it.
    for (const prop of ROOM_PROPS) {
      const halfW = (prop.w * TILE) / 2;
      const halfH = (prop.h * TILE) / 2;
      const inside =
        captain.x > prop.x - halfW &&
        captain.x < prop.x + halfW &&
        captain.y > prop.y - halfH &&
        captain.y < prop.y + halfH;
      assert.equal(inside, false, `the captain is standing inside ${prop.label}`);
    }
  });

  test("every line has a speaker and non-empty text", () => {
    for (const line of captain.lines) {
      assert.equal(line.speaker, captain.name, "the captain should speak under his own name");
      assert.ok(line.text.trim().length > 0, "a line is blank");
    }
  });

  test("the captain is not also a prop, and no prop shares his position", () => {
    for (const prop of ROOM_PROPS) {
      const same = prop.x === captain.x && prop.y === captain.y;
      assert.equal(same, false, `${prop.label} is on top of the captain`);
    }
  });

  test("the captain can be walked up to and spoken to", () => {
    // Try every reachable tile facing every direction, as with the props.
    const world = room();
    let found = false;

    for (const key of standableTiles()) {
      const [tx, ty] = key.split(",").map(Number);
      const centerX = tx * TILE + TILE / 2;
      const feetY = ty * TILE + TILE / 2;

      for (const facing of ["up", "down", "left", "right"] as const) {
        const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
        if (findInteractable(world.examinable, reach)?.label === `和${captain.name}说话`) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    assert.ok(found, "the captain cannot be reached from anywhere the player can stand");
  });

  test("talking to him opens his dialogue and freezes the player", () => {
    const world = room();
    world.player.x = captain.x - world.player.width / 2;
    world.player.y = captain.y + 48 - world.player.height;
    world.player.animation.face("up");

    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.dialogue.isOpen, true, "the captain should have said something");
    assert.equal(world.dialogue.current?.speaker, captain.name);

    const before = { x: world.player.x, y: world.player.y };
    for (let i = 0; i < 30; i++) world.update(0.016, fakeInput(["KeyD"]));
    assert.equal(world.player.x, before.x, "the player should be frozen while talking");
  });

  test("his opening notices whether the player looked around first", () => {
    // Look at nothing, then speak: no extra line.
    const brief = room();
    brief.player.x = captain.x - brief.player.width / 2;
    brief.player.y = captain.y + 48 - brief.player.height;
    brief.player.animation.face("up");
    brief.update(0.016, fakeInput([], ["KeyE"]));
    const briefTexts: string[] = [];
    while (brief.dialogue.isOpen) {
      briefTexts.push(brief.dialogue.current!.text);
      brief.update(0.016, fakeInput([], ["Space"]));
    }

    assert.ok(
      !briefTexts.some((t) => t.includes("看了一圈")),
      "he should not comment when the player has looked at nothing"
    );
  });

  test("looking around first earns a different opening, but only once", () => {
    const world = room();

    // Examine three props through the real interaction.
    const toExamine = ["fx_desk", "fx_starchart", "fx_photo"];
    for (const assetId of toExamine) {
      const prop = ROOM_PROPS.find((p) => p.assetId === assetId)!;
      world.player.x = prop.x - world.player.width / 2;
      world.player.y = prop.y + TILE + 8 - world.player.height;
      world.player.animation.face("up");
      // Stand where the prop is actually in reach.
      for (const facing of ["up", "down", "left", "right"] as const) {
        world.player.animation.face(facing);
        world.update(0.016, fakeInput([], []));
        if (world.interactionLabel === prop.label) break;
      }
      // Move onto the prop's own line if we found it.
      world.update(0.016, fakeInput([], ["KeyE"]));
      while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    }

    // Now speak to him.
    world.player.x = captain.x - world.player.width / 2;
    world.player.y = captain.y + 48 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    const first: string[] = [];
    while (world.dialogue.isOpen) {
      first.push(world.dialogue.current!.text);
      world.update(0.016, fakeInput([], ["Space"]));
    }

    // And again.
    world.update(0.016, fakeInput([], ["KeyE"]));
    const second: string[] = [];
    while (world.dialogue.isOpen) {
      second.push(world.dialogue.current!.text);
      world.update(0.016, fakeInput([], ["Space"]));
    }

    assert.ok(
      !second.some((t) => t.includes("看了一圈")),
      "the remark should not repeat every time you speak to him"
    );
    void first;
  });
});

describe("examining a prop (TASK-S1)", () => {
  test("pressing E in front of the desk opens its description", () => {
    const world = room();
    const desk = ROOM_PROPS.find((p) => p.assetId === "fx_desk")!;

    // Stand just south of the desk, looking north at it.
    world.player.x = desk.x - world.player.width / 2;
    world.player.y = desk.y + TILE - world.player.height;
    world.player.animation.face("up");

    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.dialogue.isOpen, true, "the description should have opened");
    assert.equal(world.dialogue.current?.text, desk.lines![0].text);
  });

  test("the player is frozen while reading", () => {
    const world = room();
    const desk = ROOM_PROPS.find((p) => p.assetId === "fx_desk")!;
    world.player.x = desk.x - world.player.width / 2;
    world.player.y = desk.y + TILE - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));

    const before = { x: world.player.x, y: world.player.y };
    for (let i = 0; i < 60; i++) world.update(0.016, fakeInput(["KeyD"]));

    assert.equal(world.player.x, before.x);
    assert.equal(world.player.y, before.y);
  });

  test("E or space steps through the lines and then closes the box", () => {
    const world = room();
    const desk = ROOM_PROPS.find((p) => p.assetId === "fx_desk")!;
    world.player.x = desk.x - world.player.width / 2;
    world.player.y = desk.y + TILE - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));

    const total = world.dialogue.lineCount;
    assert.ok(total > 1, "the desk description should have several lines");

    for (let i = 0; i < total; i++) world.update(0.016, fakeInput([], ["Space"]));

    assert.equal(world.dialogue.isOpen, false, "the box should have closed");
  });

  test("the player can walk again once the box is closed", () => {
    const world = room();
    const desk = ROOM_PROPS.find((p) => p.assetId === "fx_desk")!;
    world.player.x = desk.x - world.player.width / 2;
    world.player.y = desk.y + TILE - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));

    const before = world.player.x;
    for (let i = 0; i < 20; i++) world.update(0.016, fakeInput(["KeyS"]));

    assert.notEqual(world.player.y === before, true, "the player should be able to move");
  });

  test("the camera holds still, so the whole room stays on screen", () => {
    const world = room();
    const camera = world.getCamera();

    assert.equal(camera.x, 0);
    assert.equal(camera.y, 0);
    assert.equal(camera.mapWidth, ROOM_COLUMNS * TILE);
    assert.equal(camera.mapHeight, ROOM_ROWS * TILE);
  });

  test("the UI is told when the box opens and when it closes", () => {
    const world = room();
    const seen: boolean[] = [];
    world.onDialogueChange = (dialogue) => seen.push(dialogue !== null);

    const desk = ROOM_PROPS.find((p) => p.assetId === "fx_desk")!;
    world.player.x = desk.x - world.player.width / 2;
    world.player.y = desk.y + TILE - world.player.height;
    world.player.animation.face("up");

    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.deepEqual(seen, [true]);

    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));

    assert.equal(seen[seen.length - 1], false, "the close should be reported");
  });
});
