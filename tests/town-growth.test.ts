import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { STRUCTURES, TownGrowth } from "../src/game/systems/TownGrowth";
import { TOWN_INTERACTABLES, createTownMap } from "../src/game/map/townMap";
import { TownWorld } from "../src/game/TownWorld";
import { isBoxBlocked } from "../src/game/map/collision";
import { getAssetSpec } from "../src/game/assets/manifest";
import type { Input } from "../src/engine/input/Input";

// TASK-112: handing bread to the mayor, and the town changing because of it.
// The point of this task is the payoff, so the tests care most about two
// things: a delivery either happens completely or not at all, and the building
// only appears when it is genuinely earned.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

/** A world with the player standing at the mayor, facing him. */
function worldAtMayor() {
  const world = new TownWorld(createTownMap(), null);
  const mayorSpot = TOWN_INTERACTABLES.find((i) => i.id === "mayor")!;

  world.player.x = mayorSpot.x - world.player.width / 2;
  world.player.y = mayorSpot.y + 48 - world.player.height;
  world.player.animation.face("up");
  return { world, mayorSpot };
}

/** Press E at the mayor. */
const press = (world: TownWorld) => world.update(0.016, fakeInput([], ["KeyE"]));

/** Clear any open dialogue box. */
function dismiss(world: TownWorld) {
  while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
}

describe("TownGrowth (TASK-112)", () => {
  test("starts with nothing contributed and nothing built", () => {
    const growth = new TownGrowth();

    assert.equal(growth.reputationCount, 0);
    assert.equal(growth.deliveredCount, 0);
    assert.deepEqual(growth.built(), []);
    assert.equal(growth.stateOf(STRUCTURES[0]), "none");
  });

  test("contributing raises reputation", () => {
    const growth = new TownGrowth();
    growth.contribute(2);

    assert.equal(growth.reputationCount, 2);
    assert.equal(growth.deliveredCount, 2);
  });

  test("reputation only ever goes up", () => {
    const growth = new TownGrowth();
    growth.contribute(3);

    growth.contribute(0);
    growth.contribute(-5);
    growth.contribute(NaN);

    assert.equal(growth.reputationCount, 3, "bad input must not reduce reputation");
  });

  test("the site appears as soon as anything is contributed", () => {
    const growth = new TownGrowth();
    const market = STRUCTURES[0];

    growth.contribute(1);

    assert.equal(growth.stateOf(market), "underConstruction");
    assert.deepEqual(growth.built(), [], "but it is not built yet");
  });

  test("the structure is built once the threshold is reached", () => {
    const growth = new TownGrowth();
    const market = STRUCTURES[0];

    growth.contribute(market.threshold);

    assert.equal(growth.stateOf(market), "built");
    assert.deepEqual(growth.built(), [market]);
  });

  test("the unlock is reported exactly once", () => {
    const growth = new TownGrowth();
    const market = STRUCTURES[0];

    // Deliver one at a time: only the delivery that crosses the line unlocks.
    const results = [];
    for (let i = 0; i < market.threshold + 2; i++) {
      results.push(growth.contribute(1).unlocked);
    }

    const unlocks = results.filter((r) => r !== null);
    assert.equal(unlocks.length, 1, `expected one unlock, got ${unlocks.length}`);
    assert.equal(unlocks[0]?.id, market.id);

    // And it was the delivery that reached the threshold, not an earlier one.
    assert.equal(results[market.threshold - 1]?.id, market.id);
  });

  test("nextGoal reports what is still missing, then null when all are done", () => {
    const growth = new TownGrowth();

    assert.ok(growth.nextGoal(), "a fresh town should have a goal");

    for (const structure of STRUCTURES) growth.contribute(structure.threshold);

    assert.equal(growth.nextGoal(), null, "nothing left to build");
  });
});

describe("structure definitions (TASK-112)", () => {
  test("each has a name, artwork id and description", () => {
    for (const structure of STRUCTURES) {
      assert.ok(structure.id.length > 0);
      assert.ok(structure.name.length > 0, `${structure.id} has no name`);
      assert.ok(structure.promiseText.length > 0, `${structure.id} has no promise text`);
      assert.ok(structure.doneText.length > 0, `${structure.id} has no completion text`);
      assert.ok(structure.threshold > 0, `${structure.id} needs a positive threshold`);
    }
  });

  test("ids are unique", () => {
    const ids = STRUCTURES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("every site is clear ground inside the map", () => {
    // A building on top of a wall or in the river would look broken.
    const map = createTownMap();

    for (const structure of STRUCTURES) {
      for (let dy = 0; dy < structure.tilesTall; dy++) {
        for (let dx = 0; dx < structure.tilesWide; dx++) {
          const tx = structure.tx + dx;
          const ty = structure.ty + dy;
          assert.ok(map.inBounds(tx, ty), `${structure.id} runs off the map at ${tx},${ty}`);

          const box = { x: tx * 48 + 4, y: ty * 48 + 4, width: 40, height: 40 };
          assert.equal(
            isBoxBlocked(map, box),
            false,
            `${structure.id} site overlaps something solid at ${tx},${ty}`
          );
        }
      }
    }
  });

  test("sites do not overlap each other", () => {
    for (let i = 0; i < STRUCTURES.length; i++) {
      for (let j = i + 1; j < STRUCTURES.length; j++) {
        const a = STRUCTURES[i];
        const b = STRUCTURES[j];
        const apart =
          a.tx + a.tilesWide <= b.tx ||
          b.tx + b.tilesWide <= a.tx ||
          a.ty + a.tilesTall <= b.ty ||
          b.ty + b.tilesTall <= a.ty;
        assert.ok(apart, `${a.id} and ${b.id} overlap`);
      }
    }
  });

  test("a site does not sit on top of an interactable", () => {
    // Otherwise the prompt would be buried under a building.
    for (const structure of STRUCTURES) {
      for (const entry of TOWN_INTERACTABLES) {
        const tx = Math.floor(entry.x / 48);
        const ty = Math.floor(entry.y / 48);
        const inside =
          tx >= structure.tx &&
          tx < structure.tx + structure.tilesWide &&
          ty >= structure.ty &&
          ty < structure.ty + structure.tilesTall;
        assert.equal(inside, false, `${structure.id} covers interactable ${entry.id}`);
      }
    }
  });
});

describe("the mayor and delivery (TASK-112)", () => {
  test("the mayor is prompted when standing in front of him", () => {
    const { world } = worldAtMayor();
    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "mayor");
  });

  test("the first conversation explains what the town needs", () => {
    const { world } = worldAtMayor();

    press(world);

    assert.equal(world.dialogue.isOpen, true);
    assert.equal(world.growth.reputationCount, 0, "talking alone earns nothing");

    const texts: string[] = [];
    while (world.dialogue.isOpen) {
      texts.push(world.dialogue.current!.text);
      world.update(0.016, fakeInput([], ["Space"]));
    }

    const joined = texts.join("\n");
    assert.match(joined, /面包/, "should say what to bring");
    assert.match(joined, /集市/, "and what it is for");
  });

  test("delivering without bread takes nothing and says so", () => {
    const { world } = worldAtMayor();
    press(world);
    dismiss(world);

    press(world);

    assert.equal(world.growth.reputationCount, 0, "nothing should have been contributed");
    assert.match(world.dialogue.current?.text ?? "", /面包/);
  });

  test("delivering bread consumes it and earns a contribution", () => {
    const { world } = worldAtMayor();
    press(world);
    dismiss(world);
    world.inventory.add("bread", 2);

    press(world);

    assert.equal(world.inventory.count("bread"), 1, "exactly one loaf should be taken");
    assert.equal(world.growth.reputationCount, 1);
    assert.equal(world.growth.deliveredCount, 1);
  });

  test("a failed delivery does not consume other items", () => {
    const { world } = worldAtMayor();
    press(world);
    dismiss(world);
    world.inventory.add("wheat", 4);
    world.inventory.add("flour", 2);

    press(world);

    assert.equal(world.inventory.count("wheat"), 4);
    assert.equal(world.inventory.count("flour"), 2);
    assert.equal(world.growth.reputationCount, 0);
  });

  test("the delivery feedback counts what has been given", () => {
    const { world } = worldAtMayor();
    press(world);
    dismiss(world);
    world.inventory.add("bread", 2);

    press(world);

    const texts: string[] = [];
    while (world.dialogue.isOpen) {
      texts.push(world.dialogue.current!.text);
      world.update(0.016, fakeInput([], ["Space"]));
    }
    assert.match(texts.join("\n"), /第 1 份/, "should report the running total");
  });
});

describe("the town changes when it is earned (TASK-112)", () => {
  test("the site is not there before anything is contributed", () => {
    const world = new TownWorld(createTownMap(), null);
    assert.equal(world.growth.stateOf(STRUCTURES[0]), "none");
  });

  test("contributing raises the site, then finishes the building", () => {
    const { world } = worldAtMayor();
    const market = STRUCTURES[0];

    press(world); // explain
    dismiss(world);
    world.inventory.add("bread", market.threshold);

    // Deliver until it is built, one at a time.
    for (let i = 0; i < market.threshold; i++) {
      press(world);
      dismiss(world);
    }

    assert.equal(world.growth.stateOf(market), "built");
    assert.equal(world.inventory.count("bread"), 0, "all loaves should have been handed over");
  });

  test("the completion is announced in the conversation that earned it", () => {
    const { world } = worldAtMayor();
    const market = STRUCTURES[0];

    press(world);
    dismiss(world);
    world.inventory.add("bread", market.threshold);

    let announced = false;
    for (let i = 0; i < market.threshold; i++) {
      press(world);
      const texts: string[] = [];
      while (world.dialogue.isOpen) {
        texts.push(world.dialogue.current!.text);
        world.update(0.016, fakeInput([], ["Space"]));
      }
      if (texts.join("\n").includes("集市搭起来了")) announced = true;
    }

    assert.ok(announced, "the finished building should be announced when it completes");
  });

  test("the announcement happens only once", () => {
    const { world } = worldAtMayor();
    const market = STRUCTURES[0];

    press(world);
    dismiss(world);
    world.inventory.add("bread", market.threshold + 3);

    let announcements = 0;
    for (let i = 0; i < market.threshold + 3; i++) {
      press(world);
      const texts: string[] = [];
      while (world.dialogue.isOpen) {
        texts.push(world.dialogue.current!.text);
        world.update(0.016, fakeInput([], ["Space"]));
      }
      if (texts.join("\n").includes("集市搭起来了")) announcements++;
    }

    assert.equal(announcements, 1, `announced ${announcements} times`);
  });

  test("the site stays a site until the threshold, then becomes the building", () => {
    const growth = new TownGrowth();
    const market = STRUCTURES[0];
    const seen = new Set<string>();

    seen.add(growth.stateOf(market));
    for (let i = 0; i < market.threshold; i++) {
      growth.contribute(1);
      seen.add(growth.stateOf(market));
    }

    assert.deepEqual(
      [...seen].sort(),
      ["built", "none", "underConstruction"],
      `expected all three states, saw ${[...seen].join(", ")}`
    );
  });
});

describe("delivery needs the whole chain (TASK-112)", () => {
  test("bread from the field reaches the town's reputation", () => {
    // The v1 loop end to end: job, field, mill, oven, mayor.
    const world = new TownWorld(createTownMap(), null);

    world.jobs.take("farmer");

    // Grow and harvest two wheat.
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");
    const pressE = () => world.update(0.016, fakeInput([], ["KeyE"]));

    for (let round = 0; round < 2; round++) {
      pressE(); // till
      pressE(); // sow
      world.update(10, fakeInput());
      pressE(); // harvest
      dismiss(world);
    }
    assert.equal(world.inventory.count("wheat"), 2);

    // Grind.
    const mill = TOWN_INTERACTABLES.find((i) => i.id === "mill")!;
    world.player.x = mill.x - world.player.width / 2;
    world.player.y = mill.y + 48 - world.player.height;
    pressE();
    dismiss(world);
    assert.equal(world.inventory.count("flour"), 1);

    // Bake.
    const bakery = TOWN_INTERACTABLES.find((i) => i.id === "bakery")!;
    world.player.x = bakery.x - world.player.width / 2;
    world.player.y = bakery.y + 48 - world.player.height;
    pressE();
    dismiss(world);
    assert.equal(world.inventory.count("bread"), 1);

    // Deliver.
    const mayorSpot = TOWN_INTERACTABLES.find((i) => i.id === "mayor")!;
    world.player.x = mayorSpot.x - world.player.width / 2;
    world.player.y = mayorSpot.y + 48 - world.player.height;
    pressE(); // explanation
    dismiss(world);
    pressE(); // hand it over

    assert.equal(world.growth.reputationCount, 1, "the loaf should have counted");
    assert.equal(world.growth.deliveredCount, 1);
    assert.equal(world.inventory.count("bread"), 0);
  });
});

describe("art the town renders must actually be requested (TASK-112)", () => {
  test("every asset the world can draw is loaded", () => {
    // Regression guard for a real bug: the game loaded a hand-written list of
    // only the player frames and tiles, so buildings, crops, items and UI were
    // never fetched and silently rendered as flat fallback colour blocks. No
    // error appeared anywhere, and it went unnoticed for several tasks.
    const scriptAssetIds = [
      "player_down_idle",
      "tile_grass",
      "tile_wall",
      "tile_roof",
      "bld_noticeboard",
      "bld_construction",
      "bld_market",
      "npc_mayor",
      "crop_wheat_stage1",
      "ui_prompt_e"
    ];

    // `loadGameAssets()` with no argument loads the whole manifest; this asserts
    // the ids the world draws are in that manifest, so a rename or a typo fails
    // here rather than becoming another invisible fallback block.
    for (const id of scriptAssetIds) {
      assert.doesNotThrow(() => getAssetSpec(id), `${id} is drawn but not in the manifest`);
    }
  });

  test("the world's drawn ids cover every category the manifest defines", async () => {
    const { ALL_ASSETS } = await import("../src/game/assets/manifest");
    const categories = new Set(ALL_ASSETS.map((a) => a.category));

    // If a category exists it must be one the game actually uses, otherwise it
    // is dead art.
    for (const expected of ["terrain", "character", "crop", "building", "item", "ui"]) {
      assert.ok(categories.has(expected as never), `manifest has no ${expected} assets`);
    }
  });
});

describe("delivery does not disturb the rest of the game (TASK-112)", () => {
  test("crops keep growing while delivering", () => {
    const { world } = worldAtMayor();
    const plot = world.farm.all[0];
    world.farm.till(plot);
    world.farm.plant(plot);

    world.inventory.add("bread", 1);
    press(world); // explain
    dismiss(world);
    press(world); // deliver
    for (let i = 0; i < 40; i++) world.update(0.5, fakeInput());

    assert.equal(plot.state, "mature", "the clock should not pause for a delivery");
  });

  test("the mayor is not also a dialogue target", async () => {
    // He has his own two-step handling, so a static entry would be dead data.
    const { dialogueFor } = await import("../src/game/text/dialogue");
    assert.equal(dialogueFor("mayor"), null);
  });
});
