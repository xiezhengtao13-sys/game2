import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CrisisSystem } from "../src/game/systems/CrisisSystem";
import { ship } from "./shipWorld";

describe("Chapter 1 CrisisSystem state machine (TASK-G3)", () => {
  test("starts in routine peaceful patrol and transitions linearly through the crisis stages", () => {
    const crisis = new CrisisSystem();

    assert.equal(crisis.stage, "routine");
    assert.equal(crisis.isAlarmActive, false);
    assert.equal(crisis.isResolved, false);
    assert.equal(crisis.currentObjective, null);

    // Alarm triggers
    assert.ok(crisis.triggerAlarm());
    assert.equal(crisis.stage, "anomaly");
    assert.equal(crisis.isAlarmActive, true);
    assert.equal(crisis.isResolved, false);
    assert.equal(crisis.currentObjective?.id, "report_captain");

    // Advance to EVA gear prep
    assert.ok(crisis.advanceToEva());
    assert.equal(crisis.stage, "eva_gear");
    assert.equal(crisis.currentObjective?.id, "equip_eva");

    // Equip heavy thermal suit in hangar
    assert.ok(crisis.equipEvaSuit());
    assert.equal(crisis.stage, "valve_vent");
    assert.equal(crisis.currentObjective?.id, "vent_valve");

    // Vent emergency coolant wheel in reactor bay
    assert.ok(crisis.ventCoolantValve());
    assert.equal(crisis.stage, "eject_lever");
    assert.equal(crisis.currentObjective?.id, "eject_lever");

    // Pull secondary radiator ejection lever
    assert.ok(crisis.pullEjectionLever());
    assert.equal(crisis.stage, "resolved");
    assert.equal(crisis.isAlarmActive, false);
    assert.equal(crisis.isResolved, true);
    assert.equal(crisis.currentObjective?.id, "all_clear");
  });

  test("invalid or out-of-order transitions are rejected", () => {
    const crisis = new CrisisSystem();
    assert.equal(crisis.equipEvaSuit(), false);
    assert.equal(crisis.ventCoolantValve(), false);
    assert.equal(crisis.pullEjectionLever(), false);
  });
});

describe("Chapter 1 Crisis end-to-end integration with ShipWorld (TASK-G3)", () => {
  test("routine duty sign-off triggers alarm, and physical bay fixtures resolve Chapter 1", () => {
    const world = ship();

    // 1. Routine patrol
    assert.equal(world.duty.isInspectionDone(), false);
    assert.equal(world.crisis.stage, "routine");
    assert.equal(world.crisis.isAlarmActive, false);

    world.duty.complete("power");
    world.duty.complete("switch");
    world.duty.complete("plant");
    assert.ok(world.duty.isInspectionDone());

    // 2. Report to Captain triggers crisis
    const captainTarget = world.examinable.find((t) => t.id === "person-captain");
    assert.ok(captainTarget, "captain interactable found");

    // Trigger examine captain
    // @ts-expect-error accessing private examine for deterministic test
    world.examine(captainTarget);

    assert.ok(world.dialogue.isOpen);
    assert.ok(world.duty.tasks.find((t) => t.id === "report")?.completed);
    assert.equal(world.crisis.stage, "eva_gear");
    assert.equal(world.crisis.isAlarmActive, true);
    world.dialogue.close();

    // 3. Crew members provide urgent crisis directives during alarm
    const engineerTarget = world.examinable.find((t) => t.id === "person-engineer");
    assert.ok(engineerTarget);
    // @ts-expect-error accessing private examine
    world.examine(engineerTarget);
    assert.ok(world.dialogue.current?.text.includes("主回路气压快把高压管顶爆了"));
    world.dialogue.close();

    // 4. Player equips heavy thermal suit in Hangar bay
    const suitTarget = world.examinable.find((t) => t.label === "重型防热工程服备勤架");
    assert.ok(suitTarget, "eva suit rack prop found");
    // @ts-expect-error accessing private examine
    world.examine(suitTarget);
    assert.equal(world.crisis.stage, "valve_vent");
    assert.ok(world.dialogue.current?.text.includes("应急装备穿戴完毕"));
    world.dialogue.close();

    // 5. Player vents coolant valve in Reactor bay
    const valveTarget = world.examinable.find((t) => t.label === "应急旁路泄压转轮");
    assert.ok(valveTarget, "coolant wheel prop found");
    // @ts-expect-error accessing private examine
    world.examine(valveTarget);
    assert.equal(world.crisis.stage, "eject_lever");
    assert.ok(world.dialogue.current?.text.includes("旁路泄压成功"));
    world.dialogue.close();

    // 6. Player pulls ejection lever in Reactor bay
    const leverTarget = world.examinable.find((t) => t.label === "副散热翼机械强制展开栓");
    assert.ok(leverTarget, "ejection lever prop found");
    // @ts-expect-error accessing private examine
    world.examine(leverTarget);
    assert.equal(world.crisis.stage, "resolved");
    assert.equal(world.crisis.isAlarmActive, false);
    assert.equal(world.crisis.isResolved, true);
    assert.ok(world.dialogue.current?.text.includes("副散热翼应急展开"));
    world.dialogue.close();

    // 7. Post-crisis debriefing with Captain concludes Chapter 1
    // @ts-expect-error accessing private examine
    world.examine(captainTarget);
    assert.ok(world.dialogue.current?.text.includes("干得漂亮"));
    world.dialogue.advance();
    world.dialogue.advance();
    assert.ok(world.dialogue.current?.text.includes("准备迎接属于全人类的星际探索纪元吧"));
    world.dialogue.close();
  });
});
