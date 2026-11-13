import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DutySystem } from "../src/game/systems/DutySystem";
import { ship, fakeInput } from "./shipWorld";
import { HABITAT_PROPS, INDUSTRIAL_PROPS, BRIDGE_PROPS } from "../src/game/scenes/shipProps";
import { TILE } from "../src/game/config";

describe("three-phase progressive routine duty progression", () => {
  test("initializes in lower restricted phase with 3 visible tasks (11 total across all phases)", () => {
    const duty = new DutySystem();
    assert.equal(duty.tasks.length, 11);
    assert.equal(duty.phase, "lower");
    assert.equal(duty.visibleTasks.length, 3);
    assert.equal(duty.completedCount, 0);
    assert.equal(duty.isLowerTasksDone(), false);
  });

  test("completing Phase 1 -> Phase 2 -> Phase 3 advances cleanly without skipping tiers", () => {
    const duty = new DutySystem();

    assert.equal(duty.complete("water"), true);
    assert.equal(duty.complete("water"), false); // idempotent
    assert.equal(duty.isLowerTasksDone(), false);

    assert.equal(duty.complete("workshop"), true);
    assert.equal(duty.isLowerTasksDone(), true);
    assert.equal(duty.phase, "lower");

    duty.complete("report_lower");
    assert.equal(duty.phase, "mid");
    assert.equal(duty.visibleTasks.length, 4);

    duty.complete("agri");
    duty.complete("radar");
    duty.complete("cryo");
    assert.equal(duty.isMidTasksDone(), true);
    assert.equal(duty.isInspectionDone(), true);

    duty.complete("report_mid");
    assert.equal(duty.phase, "bridge");
    duty.unlockBridgePhase();
    duty.complete("power");
    duty.complete("switch");
    duty.complete("plant");
    assert.equal(duty.isBridgeTasksDone(), true);

    duty.complete("report_bridge");
    assert.equal(duty.phase, "complete");
    assert.equal(duty.isAllCompleted(), true);
  });

  test("examining lower habitat & L-2 workshop stations completes Phase 1 tasks and earns Midship Pass from Lao Zhou", () => {
    const world = ship();
    assert.equal(world.security.hasClearance("midship_pass"), false);

    // 1. Inspect Water Cycle Valve (水循环监测阀台) inside Crew Habitat (stand west of desk/terminal)
    const water = HABITAT_PROPS.find((p) => p.label === "水循环监测阀台")!;
    world.player.x = water.x - TILE - world.player.width / 2;
    world.player.y = water.y + 8 - world.player.height;
    world.player.animation.face("right");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "water")?.completed, true);

    // 2. Inspect Hydraulic Arm Bench (机械臂液压装配台) inside open L-2 Workshop
    const bench = INDUSTRIAL_PROPS.find((p) => p.label === "机械臂液压装配台")!;
    world.player.x = bench.x - world.player.width / 2;
    world.player.y = bench.y + TILE + 8 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "workshop")?.completed, true);
    assert.equal(world.duty.isLowerTasksDone(), true);

    // 3. Report to Lao Zhou -> grants Midship Pass & advances to Phase 2
    const zhouTarget = world.examinable.find((e) => e.id === "person-engineer")!;
    // @ts-expect-error accessing private examine
    world.examine(zhouTarget);
    assert.equal(world.security.hasClearance("midship_pass"), true);
    assert.equal(world.duty.phase, "mid");
    world.dialogue.close();

    // Verify Phase 3 Bridge station also marks complete when inspected
    const power = BRIDGE_PROPS.find((p) => p.label === "动力席")!;
    world.player.x = power.x + TILE - world.player.width / 2;
    world.player.y = power.y + 8 - world.player.height;
    world.player.animation.face("left");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "power")?.completed, true);
  });
});
