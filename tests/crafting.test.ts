import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Inventory } from "../src/game/systems/Inventory";
import { RECIPES, canCraft, craft, missingFor, shortfallMessage, type Recipe } from "../src/game/systems/Crafting";
import { recipeFor, workbenchIds } from "../src/game/text/workbenches";
import { TOWN_INTERACTABLES, createTownMap } from "../src/game/map/townMap";
import { dialogueFor } from "../src/game/text/dialogue";
import { TownWorld } from "../src/game/TownWorld";
import { isBoxBlocked } from "../src/game/map/collision";
import type { Input } from "../src/engine/input/Input";

// TASK-110: wheat -> flour -> bread. The requirement that matters is atomicity:
// a craft must either happen completely or not at all, so a shortage can never
// leave the player having paid for nothing. And a shortage must SAY so.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

describe("Inventory (TASK-110)", () => {
  test("starts empty", () => {
    const inv = new Inventory();

    assert.equal(inv.count("wheat"), 0);
    assert.equal(inv.has("wheat"), false);
    assert.equal(inv.total, 0);
    assert.deepEqual(inv.entries(), []);
  });

  test("adds and counts", () => {
    const inv = new Inventory();
    inv.add("wheat", 3);

    assert.equal(inv.count("wheat"), 3);
    assert.equal(inv.has("wheat", 3), true);
    assert.equal(inv.has("wheat", 4), false);
  });

  test("removes when there is enough", () => {
    const inv = new Inventory();
    inv.add("wheat", 3);

    assert.equal(inv.remove("wheat", 2), true);
    assert.equal(inv.count("wheat"), 1);
  });

  test("refuses to remove more than is held, changing nothing", () => {
    const inv = new Inventory();
    inv.add("wheat", 2);

    assert.equal(inv.remove("wheat", 3), false);
    assert.equal(inv.count("wheat"), 2, "a failed removal must not spend anything");
  });

  test("counts never go negative", () => {
    const inv = new Inventory();

    assert.equal(inv.remove("wheat", 1), false);
    assert.equal(inv.count("wheat"), 0);
  });

  test("ignores non-positive and non-finite amounts", () => {
    const inv = new Inventory();
    inv.add("wheat", 0);
    inv.add("wheat", -5);
    inv.add("wheat", NaN);
    inv.add("wheat", Infinity);

    assert.equal(inv.count("wheat"), 0);
  });

  test("drops an item entirely once it reaches zero", () => {
    const inv = new Inventory();
    inv.add("wheat", 1);
    inv.remove("wheat", 1);

    assert.deepEqual(inv.entries(), [], "empty entries should not linger");
  });

  test("keeps items separate", () => {
    const inv = new Inventory();
    inv.add("wheat", 2);
    inv.add("flour", 5);

    assert.equal(inv.count("wheat"), 2);
    assert.equal(inv.count("flour"), 5);
    assert.equal(inv.total, 7);
  });
});

describe("recipes (TASK-110)", () => {
  test("wheat becomes flour, flour becomes bread", () => {
    assert.deepEqual(RECIPES.mill_flour.inputs, [{ item: "wheat", amount: 2 }]);
    assert.deepEqual(RECIPES.mill_flour.outputs, [{ item: "flour", amount: 1 }]);

    assert.deepEqual(RECIPES.bake_bread.inputs, [{ item: "flour", amount: 1 }]);
    assert.deepEqual(RECIPES.bake_bread.outputs, [{ item: "bread", amount: 1 }]);
  });

  test("every recipe has at least one input and one output", () => {
    for (const recipe of Object.values(RECIPES)) {
      assert.ok(recipe.inputs.length > 0, `${recipe.id} has no inputs`);
      assert.ok(recipe.outputs.length > 0, `${recipe.id} has no outputs`);
    }
  });

  test("every recipe id matches its key", () => {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      assert.equal(recipe.id, key);
    }
  });

  test("canCraft is false when short", () => {
    const inv = new Inventory();

    assert.equal(canCraft(inv, RECIPES.mill_flour), false);

    inv.add("wheat", 1);
    assert.equal(canCraft(inv, RECIPES.mill_flour), false, "1 wheat is not enough for 2");

    inv.add("wheat", 1);
    assert.equal(canCraft(inv, RECIPES.mill_flour), true);
  });

  test("missingFor reports exactly what is short", () => {
    const inv = new Inventory();
    inv.add("wheat", 1);

    assert.deepEqual(missingFor(inv, RECIPES.mill_flour), [{ item: "wheat", amount: 1 }]);

    inv.add("wheat", 1);
    assert.deepEqual(missingFor(inv, RECIPES.mill_flour), []);
  });
});

describe("crafting is atomic (TASK-110)", () => {
  test("a successful craft consumes inputs and yields outputs", () => {
    const inv = new Inventory();
    inv.add("wheat", 2);

    const result = craft(inv, RECIPES.mill_flour);

    assert.equal(result.ok, true);
    assert.equal(inv.count("wheat"), 0);
    assert.equal(inv.count("flour"), 1);
  });

  test("a failed craft changes nothing at all", () => {
    const inv = new Inventory();
    inv.add("wheat", 1);
    inv.add("bread", 3);

    const result = craft(inv, RECIPES.mill_flour);

    assert.equal(result.ok, false);
    assert.equal(inv.count("wheat"), 1, "the short input must not be spent");
    assert.equal(inv.count("flour"), 0, "nothing should have been produced");
    assert.equal(inv.count("bread"), 3, "unrelated items must be untouched");
  });

  test("a failed craft explains what is missing", () => {
    const inv = new Inventory();
    inv.add("wheat", 1);

    const result = craft(inv, RECIPES.mill_flour);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.missing, [{ item: "wheat", amount: 1 }]);
    assert.match(result.message, /小麦/, "the message should name the item");
    assert.match(result.message, /1/, "and how many are short");
  });

  test("the shortfall message is empty when nothing is missing", () => {
    assert.equal(shortfallMessage([]), "材料够了。");
  });

  test("crafting the whole chain works end to end", () => {
    const inv = new Inventory();
    inv.add("wheat", 2);

    assert.equal(craft(inv, RECIPES.mill_flour).ok, true);
    assert.equal(craft(inv, RECIPES.bake_bread).ok, true);

    assert.equal(inv.count("wheat"), 0);
    assert.equal(inv.count("flour"), 0, "the flour should have been used up");
    assert.equal(inv.count("bread"), 1);
  });

  test("cannot bake without flour", () => {
    const inv = new Inventory();
    inv.add("wheat", 10);

    const result = craft(inv, RECIPES.bake_bread);

    assert.equal(result.ok, false);
    assert.equal(inv.count("wheat"), 10, "wheat is not flour and must not be consumed");
    assert.equal(inv.count("bread"), 0);
  });

  test("repeated crafting is limited by what is carried", () => {
    const inv = new Inventory();
    inv.add("wheat", 5);

    let made = 0;
    while (craft(inv, RECIPES.mill_flour).ok) made++;

    assert.equal(made, 2, "5 wheat makes 2 flour with 1 left over");
    assert.equal(inv.count("wheat"), 1);
    assert.equal(inv.count("flour"), 2);
  });
});

describe("atomicity with several inputs (TASK-110)", () => {
  // The shipped recipes each take a single item, so the "put it back" path can
  // only be exercised by a recipe with more than one input. That path is the
  // whole reason `craft` checks affordability up front, so it is tested here
  // rather than left to a comment claiming it is unreachable.
  const twoInputs: Recipe = {
    id: "test_cake",
    name: "测试蛋糕",
    inputs: [
      { item: "flour", amount: 1 },
      { item: "wheat", amount: 1 }
    ],
    outputs: [{ item: "bread", amount: 1 }]
  };

  test("affording only the first input spends nothing", () => {
    const inv = new Inventory();
    inv.add("flour", 5); // first input is available, second is not

    const result = craft(inv, twoInputs);

    assert.equal(result.ok, false);
    assert.equal(inv.count("flour"), 5, "the affordable input must not be consumed");
    assert.equal(inv.count("bread"), 0);
  });

  test("a multi-input craft works when everything is available", () => {
    const inv = new Inventory();
    inv.add("flour", 1);
    inv.add("wheat", 1);

    const result = craft(inv, twoInputs);

    assert.equal(result.ok, true);
    assert.equal(inv.count("flour"), 0);
    assert.equal(inv.count("wheat"), 0);
    assert.equal(inv.count("bread"), 1);
  });

  test("the failure message lists every missing item", () => {
    const inv = new Inventory();

    const result = craft(inv, twoInputs);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.missing.length, 2, `expected both items listed: ${result.message}`);
    assert.match(result.message, /面粉/);
    assert.match(result.message, /小麦/);
  });
});

describe("workbenches (TASK-110)", () => {
  test("the mill grinds and the bakery bakes", () => {
    assert.equal(recipeFor("mill")?.id, "mill_flour");
    assert.equal(recipeFor("bakery")?.id, "bake_bread");
  });

  test("non-workbenches have no recipe", () => {
    for (const id of ["mayor", "farm", "home", "noticeboard"]) {
      assert.equal(recipeFor(id), null, `${id} should not be a workbench`);
    }
  });

  test("every workbench is an actual interactable in the town", () => {
    // Otherwise the workbench would exist in the table but nowhere on the map.
    const known = new Set(TOWN_INTERACTABLES.map((i) => i.id));
    for (const id of workbenchIds()) {
      assert.ok(known.has(id), `workbench "${id}" is not placed in the town`);
    }
  });

  test("every workbench sits on walkable ground", () => {
    const map = createTownMap();
    for (const id of workbenchIds()) {
      const entry = TOWN_INTERACTABLES.find((i) => i.id === id)!;
      const box = { x: entry.x - 8, y: entry.y - 8, width: 16, height: 16 };
      assert.equal(isBoxBlocked(map, box), false, `${id} is inside a solid tile`);
    }
  });

  test("a workbench is not also a dialogue target", () => {
    // Otherwise it would have two competing sources of text: a static line and
    // the crafting result. Crafting wins at runtime, so a static line would be
    // dead data that never appears.
    for (const id of workbenchIds()) {
      assert.equal(
        dialogueFor(id),
        null,
        `${id} is a workbench, so its text must come from crafting alone`
      );
    }
  });

  test("interactables are not duplicated by the bakery addition", () => {
    const ids = TOWN_INTERACTABLES.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(", ")}`);
  });
});

describe("crafting through TownWorld (TASK-110)", () => {
  /** A world with the player standing at a workbench, facing it. */
  function worldAt(id: string) {
    const world = new TownWorld(createTownMap(), null);
    const bench = TOWN_INTERACTABLES.find((i) => i.id === id)!;

    world.player.x = bench.x - world.player.width / 2;
    world.player.y = bench.y + 48 - world.player.height;
    world.player.animation.face("up");
    return { world, bench };
  }

  function press(world: TownWorld) {
    world.update(0.016, fakeInput([], ["KeyE"]));
  }

  test("the mill is prompted when standing at it", () => {
    const { world } = worldAt("mill");
    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "mill");
  });

  test("grinding with no wheat says what is missing", () => {
    const { world } = worldAt("mill");

    press(world);

    assert.equal(world.dialogue.isOpen, true, "a shortage must be reported");
    assert.match(world.dialogue.current?.text ?? "", /小麦/);
    assert.equal(world.inventory.count("flour"), 0);
  });

  test("grinding with wheat produces flour", () => {
    const { world } = worldAt("mill");
    world.inventory.add("wheat", 2);

    press(world);

    assert.equal(world.inventory.count("flour"), 1);
    assert.equal(world.inventory.count("wheat"), 0);
    assert.match(world.dialogue.current?.text ?? "", /面粉/);
  });

  test("baking with flour produces bread", () => {
    const { world } = worldAt("bakery");
    world.inventory.add("flour", 1);

    press(world);

    assert.equal(world.inventory.count("bread"), 1);
    assert.equal(world.inventory.count("flour"), 0);
  });

  test("baking without flour reports it and changes nothing", () => {
    const { world } = worldAt("bakery");
    world.inventory.add("wheat", 5);

    press(world);

    assert.equal(world.inventory.count("bread"), 0);
    assert.equal(world.inventory.count("wheat"), 5, "wheat must survive a failed bake");
    assert.match(world.dialogue.current?.text ?? "", /面粉/);
  });

  test("the whole chain runs from field to bread", () => {
    // The v1 loop's middle: grow wheat, grind, bake.
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;

    // Grow and harvest two plots' worth by working the same plot twice.
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");

    for (let round = 0; round < 2; round++) {
      press(world); // till
      press(world); // sow
      world.update(10, fakeInput());
      press(world); // harvest
      // Close the "what happened" box if one opened; farming does not open one.
    }
    assert.equal(world.inventory.count("wheat"), 2, "should have harvested two wheat");

    // Grind it.
    const mill = TOWN_INTERACTABLES.find((i) => i.id === "mill")!;
    world.player.x = mill.x - world.player.width / 2;
    world.player.y = mill.y + 48 - world.player.height;
    world.dialogue.close();
    press(world);
    assert.equal(world.inventory.count("flour"), 1);

    // Bake it.
    world.dialogue.close();
    const bakery = TOWN_INTERACTABLES.find((i) => i.id === "bakery")!;
    world.player.x = bakery.x - world.player.width / 2;
    world.player.y = bakery.y + 48 - world.player.height;
    press(world);

    assert.equal(world.inventory.count("bread"), 1, "one wheat's worth should end as bread");
    assert.equal(world.inventory.count("flour"), 0);
  });

  test("using a workbench does not freeze the player like dialogue does", () => {
    const { world } = worldAt("mill");
    press(world);
    assert.equal(world.dialogue.isOpen, true, "the result box is open");

    // The box still has to be dismissed; that is the existing dialogue rule.
    world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.dialogue.isOpen, false);

    const before = world.player.x;
    for (let i = 0; i < 20; i++) world.update(0.016, fakeInput(["KeyD"]));
    assert.ok(world.player.x > before, "should be able to walk again");
  });

  test("harvested wheat lands in the inventory", () => {
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");

    press(world); // till
    press(world); // sow
    world.update(10, fakeInput());
    press(world); // harvest

    assert.equal(world.inventory.count("wheat"), 1);
    assert.equal(world.harvestedCount, 1);
  });
});
