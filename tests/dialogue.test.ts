import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Dialogue } from "../src/game/systems/Dialogue";
import { dialogueFor, interactablesWithDialogue } from "../src/game/text/dialogue";
import { TOWN_INTERACTABLES, TOWN_NPCS, createTownMap } from "../src/game/map/townMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { TownWorld } from "../src/game/TownWorld";
import { reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH } from "../src/game/config";
import { findInteractable } from "../src/game/systems/Interaction";
import type { Input } from "../src/engine/input/Input";

// TASK-108: talking to people. The rules that matter are that one key press
// advances exactly one line, that the player is frozen while a box is open, and
// that closing the box leaves no input stuck on.

/** An Input that reports a fixed set of keys as pressed this frame. */
function inputWith(held: string[], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

const fakeInput = (held: string[], pressed: string[] = []) => inputWith(held, pressed);

describe("Dialogue (TASK-108)", () => {
  test("starts closed", () => {
    const dialogue = new Dialogue();
    assert.equal(dialogue.isOpen, false);
    assert.equal(dialogue.current, null);
  });

  test("opening shows the first line", () => {
    const dialogue = new Dialogue();
    dialogue.open([
      { speaker: "镇长", text: "一" },
      { speaker: "镇长", text: "二" }
    ]);

    assert.equal(dialogue.isOpen, true);
    assert.equal(dialogue.current?.text, "一");
    assert.equal(dialogue.lineNumber, 1);
    assert.equal(dialogue.lineCount, 2);
  });

  test("advance steps one line at a time", () => {
    const dialogue = new Dialogue();
    dialogue.open([
      { speaker: null, text: "一" },
      { speaker: null, text: "二" },
      { speaker: null, text: "三" }
    ]);

    dialogue.advance();
    assert.equal(dialogue.current?.text, "二");

    dialogue.advance();
    assert.equal(dialogue.current?.text, "三");
    assert.equal(dialogue.isLastLine, true);
  });

  test("advancing past the last line closes the conversation", () => {
    const dialogue = new Dialogue();
    dialogue.open([{ speaker: null, text: "only" }]);

    assert.equal(dialogue.isOpen, true);
    const stillOpen = dialogue.advance();

    assert.equal(stillOpen, false);
    assert.equal(dialogue.isOpen, false);
    assert.equal(dialogue.current, null);
  });

  test("advancing a closed conversation does nothing", () => {
    const dialogue = new Dialogue();
    assert.equal(dialogue.advance(), false);
    assert.equal(dialogue.isOpen, false);
  });

  test("opening an empty list closes rather than showing a blank box", () => {
    const dialogue = new Dialogue();
    dialogue.open([{ speaker: null, text: "x" }]);
    dialogue.open([]);

    assert.equal(dialogue.isOpen, false);
  });

  test("opening again replaces the previous conversation", () => {
    // Otherwise talking to a second NPC would queue its lines behind the first.
    const dialogue = new Dialogue();
    dialogue.open([
      { speaker: "a", text: "1" },
      { speaker: "a", text: "2" }
    ]);
    dialogue.advance();

    dialogue.open([{ speaker: "b", text: "z" }]);

    assert.equal(dialogue.lineCount, 1);
    assert.equal(dialogue.lineNumber, 1);
    assert.equal(dialogue.current?.text, "z");
  });

  test("open() copies the lines, so later edits to the source do not leak in", () => {
    const source = [{ speaker: null, text: "original" }];
    const dialogue = new Dialogue();
    dialogue.open(source);

    source[0].text = "changed";

    assert.equal(dialogue.current?.text, "original");
  });

  test("close() clears everything", () => {
    const dialogue = new Dialogue();
    dialogue.open([{ speaker: null, text: "x" }]);
    dialogue.close();

    assert.equal(dialogue.isOpen, false);
    assert.equal(dialogue.lineCount, 0);
  });
});

describe("dialogue content (TASK-108)", () => {
  test("the mayor has something to say", () => {
    const lines = dialogueFor("mayor");
    assert.ok(lines && lines.length > 0, "the mayor should have dialogue");
    assert.ok(lines.some((l) => l.speaker === "镇长"), "the mayor should speak in their own name");
  });

  test("every line has non-empty text", () => {
    for (const id of interactablesWithDialogue()) {
      for (const line of dialogueFor(id) ?? []) {
        assert.ok(line.text.trim().length > 0, `${id} has an empty line`);
      }
    }
  });

  test("dialogue only exists for interactables that are actually in the town", () => {
    // A typo in the dialogue table would otherwise be a silently dead entry.
    const known = new Set(TOWN_INTERACTABLES.map((i) => i.id));
    for (const id of interactablesWithDialogue()) {
      assert.ok(known.has(id), `dialogue for unknown interactable "${id}"`);
    }
  });

  test("an interactable with no dialogue returns null rather than throwing", () => {
    assert.equal(dialogueFor("no_such_thing"), null);
  });
});

describe("town NPCs (TASK-108)", () => {
  test("there is at least one person to talk to", () => {
    assert.ok(TOWN_NPCS.length > 0);
  });

  test("ids and names are set", () => {
    for (const npc of TOWN_NPCS) {
      assert.ok(npc.id.length > 0, "empty npc id");
      assert.ok(npc.name.length > 0, `${npc.id} has no name`);
      assert.ok(npc.spriteId.length > 0, `${npc.id} has no sprite`);
    }
  });

  test("every NPC stands on walkable ground inside the map", () => {
    const map = createTownMap();

    for (const npc of TOWN_NPCS) {
      assert.ok(
        npc.x > 0 && npc.y > 0 && npc.x < map.pixelWidth && npc.y < map.pixelHeight,
        `${npc.id} is outside the map`
      );

      // The NPC's feet, where they stand.
      const box = { x: npc.x - 11, y: npc.y - 16, width: 22, height: 16 };
      assert.equal(isBoxBlocked(map, box), false, `${npc.id} is standing inside a solid tile`);
    }
  });

  test("an NPC has dialogue reachable under their own id", () => {
    // The prompt shows the interactable's label, and pressing E looks the
    // dialogue up by that same id.
    for (const npc of TOWN_NPCS) {
      assert.ok(dialogueFor(npc.id), `${npc.id} has a sprite but nothing to say`);
    }
  });
});

describe("talking, through TownWorld (TASK-108)", () => {
  /** A world with the player placed right in front of `targetId`, facing it. */
  function worldFacingTarget(targetId: string) {
    const world = new TownWorld(createTownMap(), null);
    const target = TOWN_INTERACTABLES.find((i) => i.id === targetId)!;

    // Stand one tile south of the target and look north at it. The player's
    // sprite is 32x48 with feet at the bottom.
    world.player.x = target.x - world.player.width / 2;
    world.player.y = target.y + 48 - world.player.height;
    world.player.animation.face("up");
    return { world, target };
  }

  test("pressing E in front of the mayor opens the box on the first line", () => {
    const { world } = worldFacingTarget("mayor");
    let notified = 0;
    world.onDialogueChange = () => notified++;

    // W to keep facing north, E to talk.
    world.update(0.016, fakeInput(["KeyW"], ["KeyE"]));

    assert.equal(world.dialogue.isOpen, true);
    assert.equal(world.dialogue.lineNumber, 1);
    assert.equal(world.dialogue.current?.speaker, "镇长");
    assert.equal(notified, 1, "the UI should have been told once");
  });

  test("E advances one line per press, not the whole conversation", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));
    const first = world.dialogue.current?.text;

    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.dialogue.lineNumber, 2);
    assert.notEqual(world.dialogue.current?.text, first);
  });

  test("space also advances", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    world.update(0.016, fakeInput([], ["Space"]));

    assert.equal(world.dialogue.lineNumber, 2);
  });

  test("holding E does not race through: only a fresh press counts", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    // Held but not newly pressed, as every frame after the first would be.
    for (let i = 0; i < 20; i++) world.update(0.016, fakeInput(["KeyE"], []));

    assert.equal(world.dialogue.lineNumber, 1, "holding E should not advance");
  });

  test("the player cannot move while the box is open", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    const before = { x: world.player.x, y: world.player.y };
    for (let i = 0; i < 60; i++) world.update(0.016, fakeInput(["KeyD"], []));

    assert.equal(world.player.x, before.x, "player moved while talking");
    assert.equal(world.player.y, before.y);
  });

  test("the prompt is hidden while talking", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.interactionTarget, null, "no prompt should show during dialogue");
  });

  test("advancing through the last line closes the box", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    const total = world.dialogue.lineCount;
    for (let i = 0; i < total; i++) {
      world.update(0.016, fakeInput([], ["KeyE"]));
    }

    assert.equal(world.dialogue.isOpen, false, "should have closed after the last line");
  });

  test("after closing, the player can move again", () => {
    const { world } = worldFacingTarget("mayor");
    world.update(0.016, fakeInput([], ["KeyE"]));

    const total = world.dialogue.lineCount;
    for (let i = 0; i < total; i++) world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, false);

    const before = world.player.x;
    for (let i = 0; i < 30; i++) world.update(0.016, fakeInput(["KeyD"], []));

    assert.ok(world.player.x > before, "player should be able to walk again");
  });

  test("the UI is told once when the box opens and once when it closes", () => {
    const { world } = worldFacingTarget("mayor");
    const seen: boolean[] = [];
    world.onDialogueChange = (dialogue) => seen.push(dialogue !== null);

    // Opening reports once.
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.deepEqual(seen, [true]);

    // Every advance reports too, so the box redraws; the last one closes it.
    const total = world.dialogue.lineCount;
    for (let i = 0; i < total; i++) world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(seen[0], true, "first notification should be an open");
    assert.equal(seen[seen.length - 1], false, "last notification should be a close");
    assert.equal(
      seen.filter((open) => !open).length,
      1,
      "the close should be reported exactly once, not once per advance"
    );
  });

  test("pressing E with nothing in reach does nothing", () => {
    const world = new TownWorld(createTownMap(), null);
    // Spawn is the crossroads, with nothing interactable in reach.
    world.update(0.016, fakeInput([], ["KeyE"]));

    assert.equal(world.dialogue.isOpen, false);
  });

  test("facing a target with no dialogue opens nothing", () => {
    // The world must tolerate a target that has nothing to say yet, rather than
    // opening an empty box or throwing.
    const world = new TownWorld(createTownMap(), null, [
      { id: "silent", label: "沉默的东西", x: 888, y: 600, radius: 60 }
    ]);
    world.player.x = 888 - world.player.width / 2;
    world.player.y = 600 + 48 - world.player.height;
    world.player.animation.face("up");

    world.update(0.016, fakeInput(["KeyW"], ["KeyE"]));

    assert.equal(world.interactionTarget?.id, "silent", "should still be prompted");
    assert.equal(world.dialogue.isOpen, false, "but pressing E should open nothing");
  });
});

describe("dialogue and interaction do not conflict (TASK-108)", () => {
  test("no NPC shares a position with an interactable", () => {
    // Two targets at one point would make it ambiguous who is being addressed.
    for (const npc of TOWN_NPCS) {
      for (const entry of TOWN_INTERACTABLES) {
        const same = npc.x === entry.x && npc.y === entry.y;
        assert.equal(same, false, `${npc.id} and interactable ${entry.id} are at the same spot`);
      }
    }
  });

  test("the mayor's interactable is in reach of a tile the player can stand on", () => {
    const map = createTownMap();
    const mayor = TOWN_NPCS[0];
    const target = TOWN_INTERACTABLES.find((i) => i.id === mayor.id)!;

    // Stand just south of the mayor's interactable and face north.
    const feetY = (target.y + 48) - 24 + 24;
    const reach = reachPoint(target.x, feetY, "up", PLAYER_INTERACT_REACH);
    const found = findInteractable(TOWN_INTERACTABLES, reach);

    assert.equal(found?.id, "mayor");

    const box = { x: target.x - 11, y: feetY - 16, width: 22, height: 16 };
    assert.equal(isBoxBlocked(map, box), false, "that spot is inside a wall");
  });
});
