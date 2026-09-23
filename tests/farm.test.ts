import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Farm, WHEAT_GROW_MINUTES, cropStageFor } from "../src/game/systems/Farm";
import { GameTime, MINUTES_PER_DAY } from "../src/game/systems/Time";
import { createFarm, createGameTime, TILE } from "../src/game/config";
import { createTownMap, TOWN_INTERACTABLES } from "../src/game/map/townMap";
import { TownWorld } from "../src/game/TownWorld";
import { reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH } from "../src/game/config";
import type { Input } from "../src/engine/input/Input";

// TASK-109: farming. Growth is driven by in-game minutes rather than frames, so
// these tests advance the clock directly instead of simulating thousands of
// frames -- and the same property means crop speed cannot drift with frame rate.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

/** A farm with one plot, plus the clock that drives it. */
function onePlot() {
  const farm = new Farm();
  const plot = farm.addPlot(0, 0);
  const time = new GameTime(1);
  return { farm, plot, time };
}

/** Grow the plot to ripe by advancing the clock. */
function ripen(farm: Farm, time: GameTime) {
  farm.update(WHEAT_GROW_MINUTES, time);
}

describe("GameTime (TASK-109)", () => {
  test("starts at day 1, midnight", () => {
    const time = new GameTime(1);

    assert.equal(time.minutes, 0);
    assert.equal(time.day, 1);
    assert.equal(time.clock, "00:00");
  });

  test("advances minutes from real seconds", () => {
    const time = new GameTime(1);
    time.update(90);

    assert.equal(time.minutes, 90);
    assert.equal(time.clock, "01:30");
  });

  test("respects a custom rate", () => {
    const time = new GameTime(2);
    time.update(120);

    assert.equal(time.minutes, 60, "2 real seconds per game minute");
  });

  test("rolls over into the next day", () => {
    const time = new GameTime(1);
    time.update(MINUTES_PER_DAY + 60);

    assert.equal(time.day, 2);
    assert.equal(time.clock, "01:00");
  });

  test("ignores non-positive or non-finite dt", () => {
    const time = new GameTime(1);
    time.update(0);
    time.update(-5);
    time.update(NaN);
    time.update(Infinity);

    assert.equal(time.minutes, 0);
  });
});

describe("Farm state machine (TASK-109)", () => {
  test("a new plot is untilled and empty", () => {
    const { plot } = onePlot();

    assert.equal(plot.state, "untilled");
    assert.equal(plot.crop, null);
    assert.equal(plot.growthMinutes, 0);
  });

  test("cannot plant untilled ground", () => {
    const { farm, plot } = onePlot();

    assert.equal(farm.plant(plot), false);
    assert.equal(plot.state, "untilled", "a failed plant must not change the plot");
  });

  test("cannot harvest an untilled or tilled plot", () => {
    const { farm, plot } = onePlot();

    assert.equal(farm.canHarvest(plot), false);
    assert.equal(farm.harvest(plot), null);

    farm.till(plot);
    assert.equal(farm.canHarvest(plot), false);
    assert.equal(farm.harvest(plot), null);
  });

  test("till then plant then grow then harvest", () => {
    const { farm, plot, time } = onePlot();

    assert.equal(farm.till(plot), true);
    assert.equal(plot.state, "tilled");

    assert.equal(farm.plant(plot), true);
    assert.equal(plot.state, "seeded");
    assert.equal(plot.crop, "wheat");

    ripen(farm, time);
    assert.equal(plot.state, "mature");
    assert.equal(farm.canHarvest(plot), true);

    const gathered = farm.harvest(plot);
    assert.deepEqual(gathered, { crop: "wheat", amount: 1 });
  });

  test("harvesting leaves the ground tilled, ready to replant", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);
    ripen(farm, time);

    farm.harvest(plot);

    assert.equal(plot.state, "tilled");
    assert.equal(plot.crop, null);
    assert.equal(plot.growthMinutes, 0);
    assert.equal(farm.plant(plot), true, "should be immediately replantable");
  });

  test("cannot till ground twice", () => {
    const { farm, plot } = onePlot();
    assert.equal(farm.till(plot), true);
    assert.equal(farm.till(plot), false);
  });

  test("cannot plant on a plot that is already growing", () => {
    const { farm, plot } = onePlot();
    farm.till(plot);
    farm.plant(plot);

    assert.equal(farm.plant(plot), false);
    assert.equal(plot.growthMinutes, 0, "a failed plant must not reset growth");
  });
});

describe("harvesting too early (TASK-109)", () => {
  test("an unripe crop yields nothing", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);

    farm.update(WHEAT_GROW_MINUTES / 2, time);

    assert.equal(farm.harvest(plot), null);
  });

  test("a failed early harvest does not damage the crop", () => {
    // The point of this test: a mis-timed press must not cost the player the
    // crop they are still growing.
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);
    farm.update(WHEAT_GROW_MINUTES / 2, time);
    const growthBefore = plot.growthMinutes;

    farm.harvest(plot);

    assert.equal(plot.state, "seeded", "should still be growing");
    assert.equal(plot.crop, "wheat", "should still be planted");
    assert.equal(plot.growthMinutes, growthBefore, "growth should not be reset");

    // And it still ripens afterwards.
    ripen(farm, time);
    assert.equal(plot.state, "mature");
  });
});

describe("crop growth (TASK-109)", () => {
  test("growth is measured in in-game minutes, not frames", () => {
    // One big step and many small steps must reach the same place.
    const big = onePlot();
    big.farm.till(big.plot);
    big.farm.plant(big.plot);
    big.farm.update(WHEAT_GROW_MINUTES, big.time);

    const small = onePlot();
    small.farm.till(small.plot);
    small.farm.plant(small.plot);
    for (let i = 0; i < 600; i++) small.farm.update(WHEAT_GROW_MINUTES / 600, small.time);

    assert.equal(big.plot.state, "mature");
    assert.equal(small.plot.state, "mature");
    assert.ok(
      Math.abs(big.plot.growthMinutes - small.plot.growthMinutes) < 1e-9,
      `growth differs: ${big.plot.growthMinutes} vs ${small.plot.growthMinutes}`
    );
  });

  test("ripens exactly at the threshold, not before", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);

    farm.update(WHEAT_GROW_MINUTES - 0.01, time);
    assert.equal(plot.state, "seeded", "should not be ripe a hair early");

    farm.update(0.02, time);
    assert.equal(plot.state, "mature");
  });

  test("an idle plot does not grow", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);

    farm.update(100, time);

    assert.equal(plot.state, "tilled");
    assert.equal(plot.growthMinutes, 0);
  });

  test("the clock advances even with nothing planted", () => {
    const { farm, time } = onePlot();
    farm.update(120, time);

    assert.equal(time.minutes, 120);
  });
});

describe("crop stages are visually distinct (TASK-109)", () => {
  test("every growing stage maps to a different sprite", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);

    const stages: number[] = [];
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      farm.update(WHEAT_GROW_MINUTES / steps, time);
      stages.push(cropStageFor(plot));
    }

    // Guard against a vacuous check: the plot must actually have grown.
    assert.equal(plot.state, "mature");

    const distinct = new Set(stages);
    assert.ok(distinct.size >= 3, `expected several stages, saw ${[...distinct].join(",")}`);
    assert.ok(distinct.has(4), "should reach the ripe stage");
  });

  test("stage is 0 for ground with nothing on it", () => {
    const { farm, plot } = onePlot();
    assert.equal(cropStageFor(plot), 0, "untilled");

    farm.till(plot);
    assert.equal(cropStageFor(plot), 0, "tilled but unsown");
  });

  test("stage never exceeds 4 or drops below 1 while planted", () => {
    const { farm, plot, time } = onePlot();
    farm.till(plot);
    farm.plant(plot);

    for (let i = 0; i < 40; i++) {
      farm.update(WHEAT_GROW_MINUTES / 20, time);
      const stage = cropStageFor(plot);
      assert.ok(stage >= 1 && stage <= 4, `stage out of range: ${stage}`);
    }
  });

  test("the manifest has art for every stage", async () => {
    const { getAssetSpec } = await import("../src/game/assets/manifest");
    for (const stage of [1, 2, 3, 4]) {
      assert.doesNotThrow(() => getAssetSpec(`crop_wheat_stage${stage}`));
    }
  });
});

describe("the town's field (TASK-109)", () => {
  test("every farmland tile becomes a plot", () => {
    const map = createTownMap();
    const farm = createFarm(map);

    assert.equal(farm.size, map.tilesOfType("farmland").length);
    assert.ok(farm.size > 0, "the town should have a field");
  });

  test("plots line up with the farmland tiles", () => {
    const map = createTownMap();
    const farm = createFarm(map);

    for (const { tx, ty } of map.tilesOfType("farmland")) {
      assert.ok(farm.plotAt(tx, ty), `no plot at farmland tile ${tx},${ty}`);
    }
  });

  test("the clock and farm are wired up", () => {
    const world = new TownWorld(createTownMap(), null);

    assert.equal(world.farm.size, createFarm(createTownMap()).size);
    assert.equal(world.time.clock, "00:00");
  });
});

describe("working the field through TownWorld (TASK-109)", () => {
  /**
   * A world with the player standing on the field gate, facing the crops.
   *
   * Placed directly rather than walked there: the field is solid ground the
   * player walks onto, and simulating the walk would just add collision noise to
   * what these tests are actually about.
   */
  function worldAtField() {
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;

    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");

    // The field is the farmer's work (TASK-111), so take the job first. The
    // gating itself is covered in tests/jobs.test.ts.
    world.jobs.take("farmer");
    return { world, gate };
  }

  /** Press E at the field. No keys held, so the player stays put. */
  function pressAtField(world: TownWorld) {
    world.update(0.016, fakeInput([], ["KeyE"]));
  }

  test("the field is prompted when the player stands at it", () => {
    const { world } = worldAtField();
    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "farm");
  });
  test("first press tills the nearest plot", () => {
    const { world } = worldAtField();
    pressAtField(world);

    assert.equal(world.farm.all.filter((p) => p.state === "tilled").length, 1);
  });

  test("second press sows it", () => {
    const { world } = worldAtField();
    pressAtField(world);
    pressAtField(world);

    assert.equal(world.farm.all.filter((p) => p.state === "seeded").length, 1);
  });

  test("an unripe plot does nothing when pressed", () => {
    const { world } = worldAtField();
    pressAtField(world);
    pressAtField(world);
    const seeded = world.farm.all.find((p) => p.state === "seeded")!;

    // Measured AFTER the press, because the clock advances with every frame --
    // growth legitimately ticks up even when the press does nothing.
    pressAtField(world);
    const growthAfter = seeded.growthMinutes;

    pressAtField(world);

    assert.equal(seeded.state, "seeded", "should still be growing");
    assert.ok(
      seeded.growthMinutes >= growthAfter,
      "growth should not be reset by a press on an unripe plot"
    );
    assert.ok(
      seeded.growthMinutes < WHEAT_GROW_MINUTES,
      "an unripe plot should not have ripened"
    );
    assert.equal(world.harvestedCount, 0, "nothing should have been harvested");
  });

  test("once ripe, pressing harvests and counts the wheat", () => {
    const { world } = worldAtField();
    pressAtField(world);
    pressAtField(world);

    // Let it ripen: run the clock well past the growth time.
    for (let i = 0; i < 40; i++) world.update(0.5, fakeInput());
    assert.equal(
      world.farm.all.filter((p) => p.state === "mature").length,
      1,
      "expected the crop to ripen"
    );

    pressAtField(world);

    assert.equal(world.harvestedCount, 1);
    assert.equal(world.farm.all.filter((p) => p.state === "mature").length, 0);
    assert.equal(world.farm.all.filter((p) => p.state === "tilled").length, 1);
  });

  test("the plot worked is the one nearest the player", () => {
    const { world } = worldAtField();

    const plot = world.farm.nearest(
      world.player.centerX,
      world.player.y + world.player.height,
      world.tileMap.tileSize
    );
    assert.ok(plot, "expected a nearest plot");

    pressAtField(world);

    assert.equal(plot.state, "tilled", "the nearest plot should have been worked");
  });

  test("the player is not frozen while working, unlike dialogue", () => {
    const { world } = worldAtField();
    pressAtField(world);

    assert.equal(world.dialogue.isOpen, false, "farming should not open a dialogue box");
  });

  test("the whole cycle runs from one standing spot", () => {
    // The v1 loop must be completable without the field being fiddly.
    const { world } = worldAtField();
    pressAtField(world); // till
    pressAtField(world); // sow
    assert.equal(world.farm.all.filter((p) => p.state === "seeded").length, 1);

    for (let i = 0; i < 40; i++) world.update(0.5, fakeInput());
    pressAtField(world); // harvest

    assert.equal(world.harvestedCount, 1);
  });

  test("working one plot walks it round the whole cycle", () => {
    // Pressing E on the same plot repeatedly should till, sow, ripen and harvest
    // and then start over -- never getting stuck. Each transition is checked
    // rather than sampling states over time, because a single long update can
    // legitimately pass straight through "seeded" to "mature".
    const { world } = worldAtField();
    const plot = world.farm.nearest(
      world.player.centerX,
      world.player.y + world.player.height,
      world.tileMap.tileSize
    )!;
    assert.equal(plot.state, "untilled", "the nearest plot should start bare");

    pressAtField(world);
    assert.equal(plot.state, "tilled", "first press should break the ground");

    pressAtField(world);
    assert.equal(plot.state, "seeded", "second press should sow it");

    // Too early: pressing again must not harvest.
    pressAtField(world);
    assert.equal(plot.state, "seeded", "an unripe plot must not be harvested");
    assert.equal(world.harvestedCount, 0);

    world.update(10, fakeInput());
    assert.equal(plot.state, "mature", "it should ripen on its own");

    pressAtField(world);
    assert.equal(world.harvestedCount, 1, "the ripe crop should have been gathered");
    assert.equal(plot.state, "tilled", "and the ground left ready to replant");

    // And the cycle repeats.
    pressAtField(world);
    assert.equal(plot.state, "seeded", "should be replantable straight away");
  });

  test("harvesting and replanting can be repeated many times", () => {
    const { world } = worldAtField();
    const plot = world.farm.nearest(
      world.player.centerX,
      world.player.y + world.player.height,
      world.tileMap.tileSize
    )!;

    let harvests = 0;
    for (let i = 0; i < 400 && harvests < 5; i++) {
      pressAtField(world);
      // 10 seconds is 10 game minutes, past the 8 wheat needs. Time advances
      // *after* the press, so a ripe plot is harvested before it can grow again.
      world.update(10, fakeInput());
      if (world.harvestedCount > harvests) harvests = world.harvestedCount;
    }

    assert.equal(harvests, 5, `expected five harvests, got ${harvests}`);
    assert.ok(plot.crop === null || plot.crop === "wheat");
  });
});

describe("farming and dialogue do not interfere (TASK-109)", () => {
  test("crops keep growing while a dialogue box is open", () => {
    // The clock is not paused by talking; only the player is.
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;
    world.jobs.take("farmer");
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");

    // Sow a plot directly, then open a conversation elsewhere.
    world.jobs.take("farmer");
    const plot = world.farm.nearest(gate.x, gate.y, world.tileMap.tileSize)!;
    world.farm.till(plot);
    world.farm.plant(plot);

    const mayor = TOWN_INTERACTABLES.find((i) => i.id === "mayor")!;
    world.player.x = mayor.x - world.player.width / 2;
    world.player.y = mayor.y + 48 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput(["KeyW"], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true, "expected to be talking");

    for (let i = 0; i < 40; i++) world.update(0.5, fakeInput());

    assert.equal(plot.state, "mature", "crops should ripen during a conversation");
  });

  test("harvested wheat lands in the inventory", () => {
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;
    world.jobs.take("farmer");
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");

    const press = () => world.update(0.016, fakeInput([], ["KeyE"]));
    press(); // till
    press(); // sow
    world.update(10, fakeInput());
    press(); // harvest

    assert.equal(world.inventory.count("wheat"), 1);
    assert.equal(world.harvestedCount, 1);
  });
});
