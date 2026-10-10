import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DutySystem } from "../src/game/systems/DutySystem";
import { ship, fakeInput } from "./shipWorld";
import { BRIDGE_PROPS } from "../src/game/scenes/shipProps";
import { TILE } from "../src/game/config";

describe("the routine duty maintenance system (TASK-G1)", () => {
  test("duty tasks initialize with 4 standard tasks and 0 completed", () => {
    const duty = new DutySystem();
    assert.equal(duty.tasks.length, 4);
    assert.equal(duty.completedCount, 0);
    assert.equal(duty.isInspectionDone(), false);
  });

  test("completing inspection tasks advances inspection state", () => {
    const duty = new DutySystem();
    assert.equal(duty.complete("power"), true);
    assert.equal(duty.complete("power"), false); // idempotent
    assert.equal(duty.isInspectionDone(), false);

    duty.complete("switch");
    assert.equal(duty.isInspectionDone(), false);

    duty.complete("plant");
    assert.equal(duty.isInspectionDone(), true);
    assert.equal(duty.completedCount, 3);

    duty.complete("report");
    assert.equal(duty.completedCount, 4);
    assert.equal(duty.isAllCompleted(), true);
  });

  test("examining bridge stations in-game completes respective duty tasks", () => {
    const world = ship();

    // 1. Examine power station (动力席)
    const power = BRIDGE_PROPS.find((p) => p.label === "动力席")!;
    world.player.x = power.x - world.player.width / 2;
    world.player.y = power.y + TILE + 8 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "power")?.completed, true);

    // 2. Examine right emergency switch (右舷机械应急开关)
    const sw = BRIDGE_PROPS.find((p) => p.label === "机械应急开关" && p.x > 20 * TILE)!;
    world.player.x = sw.x - world.player.width / 2;
    world.player.y = sw.y + TILE + 8 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "switch")?.completed, true);

    // 3. Examine bridge plant (人员席绿植)
    const plant = BRIDGE_PROPS.find((p) => p.label === "绿植" && p.y < 20 * TILE)!;
    world.player.x = plant.x - world.player.width / 2;
    world.player.y = plant.y + TILE + 8 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    assert.equal(world.duty.tasks.find((t) => t.id === "plant")?.completed, true);

    assert.equal(world.duty.isInspectionDone(), true);
  });
});
