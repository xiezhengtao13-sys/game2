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
    assert.equal(crisis.currentObjective?.id, "report_supervisor");

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

describe("Chapter 1 Crisis & Progressive Security Integration in ShipWorld", () => {
  test("Phase 1 -> Phase 2 anomaly report triggers Crisis (unlocking Hangar/Reactor), and resolving Crisis grants Bridge Pass (leaving Cabin still locked)", () => {
    const world = ship();

    // 1. Initial starting state: locked out of upper decks & bridge
    assert.equal(world.duty.isInspectionDone(), false);
    assert.equal(world.crisis.stage, "routine");
    assert.equal(world.crisis.isAlarmActive, false);
    assert.equal(world.security.canAccessPlace("crew_habitat"), true);
    assert.equal(world.security.canAccessPlace("industrial_bay"), true);
    assert.equal(world.security.canAccessPlace("transit_hub"), false);
    assert.equal(world.security.canAccessPlace("hangar_bay"), false);
    assert.equal(world.security.canAccessPlace("bridge"), false);
    assert.equal(world.security.canAccessPlace("cabin"), false);

    // 2. Complete Phase 1 lower tasks & earn midship_pass from Lao Zhou
    world.duty.complete("water");
    world.duty.complete("workshop");
    const engineerTarget = world.examinable.find((t) => t.id === "person-engineer");
    assert.ok(engineerTarget, "engineer interactable found");

    // @ts-expect-error accessing private examine for deterministic test
    world.examine(engineerTarget);
    assert.equal(world.security.hasClearance("midship_pass"), true);
    assert.equal(world.security.canAccessPlace("transit_hub"), true);
    assert.equal(world.security.canAccessPlace("agri_module"), true);
    assert.equal(world.security.canAccessPlace("science_lab"), true);
    assert.equal(world.security.canAccessPlace("medical_bay"), true);
    assert.equal(world.security.canAccessPlace("hangar_bay"), false);
    assert.equal(world.security.canAccessPlace("bridge"), false);
    world.dialogue.close();

    // 3. Complete Phase 2 midship checks -> report anomalies to Lao Zhou -> triggers Crisis & crisis_override
    world.duty.complete("agri");
    world.duty.complete("radar");
    world.duty.complete("cryo");
    assert.ok(world.duty.isMidTasksDone());

    // @ts-expect-error accessing private examine
    world.examine(engineerTarget);
    assert.ok(world.dialogue.isOpen);
    assert.ok(world.duty.tasks.find((t) => t.id === "report_mid")?.completed);
    assert.equal(world.crisis.stage, "eva_gear");
    assert.equal(world.crisis.isAlarmActive, true);
    assert.equal(world.security.hasClearance("crisis_override"), true);
    assert.equal(world.security.canAccessPlace("hangar_bay"), true);
    assert.equal(world.security.canAccessPlace("reactor_bay"), true);
    assert.equal(world.security.canAccessPlace("propulsion_aft"), true);
    assert.equal(world.security.canAccessPlace("bridge"), false, "bridge stays closed during crisis");
    world.dialogue.close();

    // 4. Lao Zhou gives urgent crisis directives during alarm
    // @ts-expect-error accessing private examine
    world.examine(engineerTarget);
    assert.ok(world.dialogue.current?.text.includes("主回路压力快把高压管顶爆了"));
    world.dialogue.close();

    // 5. Player equips heavy thermal suit in Hangar bay
    const suitTarget = world.examinable.find((t) => t.label === "重型防热工程服备勤架");
    assert.ok(suitTarget, "eva suit rack prop found");
    // @ts-expect-error accessing private examine
    world.examine(suitTarget);
    assert.equal(world.crisis.stage, "valve_vent");
    assert.ok(world.dialogue.current?.text.includes("应急装备穿戴完毕"));
    world.dialogue.close();

    // 6. Player vents coolant valve in Reactor bay
    const valveTarget = world.examinable.find((t) => t.label === "应急旁路泄压转轮");
    assert.ok(valveTarget, "coolant wheel prop found");
    // @ts-expect-error accessing private examine
    world.examine(valveTarget);
    assert.equal(world.crisis.stage, "eject_lever");
    assert.ok(world.dialogue.current?.text.includes("旁路泄压成功"));
    world.dialogue.close();

    // 7. Player pulls ejection lever in Reactor bay -> Resolves crisis & grants Bridge Commendation!
    const leverTarget = world.examinable.find((t) => t.label === "副散热翼机械强制展开栓");
    assert.ok(leverTarget, "ejection lever prop found");
    // @ts-expect-error accessing private examine
    world.examine(leverTarget);
    assert.equal(world.crisis.stage, "resolved");
    assert.equal(world.crisis.isAlarmActive, false);
    assert.equal(world.crisis.isResolved, true);
    assert.equal(world.security.hasClearance("bridge_pass"), true);
    assert.equal(world.security.canAccessPlace("bridge"), true);
    assert.equal(world.security.canAccessPlace("fore_sensors"), true);
    assert.equal(world.security.canAccessPlace("cabin"), false, "Captain's cabin remains strictly biometric locked post-Crisis!");
    assert.ok(world.dialogue.current?.text.includes("副散热翼应急展开"));
    world.dialogue.close();

    // 8. Post-crisis grounded debriefing with Lao Zhou concludes Chapter 1
    // @ts-expect-error accessing private examine
    world.examine(engineerTarget);
    assert.ok(world.dialogue.current?.text.includes("老周坐在翻倒的工具箱上"));
    world.dialogue.advance();
    assert.ok(world.dialogue.current?.text.includes("手脚硬朗得像块铁啊"));
    world.dialogue.close();
  });
});
