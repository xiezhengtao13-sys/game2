import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ExplorationSystem } from "../src/game/systems/ExplorationSystem";
import { SpaceFlight } from "../src/game/scenes/SpaceFlight";
import { PlanetSurface } from "../src/game/scenes/PlanetSurface";
import { ship } from "./shipWorld";

describe("Chapter 2 ExplorationSystem state machine", () => {
  test("starts in ready_to_board and progresses through flight, landing, and surface EVA", () => {
    const exp = new ExplorationSystem();

    assert.equal(exp.stage, "ready_to_board");
    assert.equal(exp.isSpaceFlightActive, false);
    assert.equal(exp.isSurfaceActive, false);
    assert.equal(exp.isChapter2Done, false);
    assert.equal(exp.currentObjective.id, "board_shuttle");

    // Launch sequence initiated
    assert.ok(exp.startLaunchSequence());
    assert.equal(exp.stage, "launch_sequence");
    assert.equal(exp.currentObjective.id, "launch_countdown");

    // Enters space flight
    assert.ok(exp.enterSpaceFlight());
    assert.equal(exp.stage, "space_flight");
    assert.equal(exp.isSpaceFlightActive, true);
    assert.equal(exp.currentObjective.id, "navigate_farthest");

    // Approaching destination planet Farthest-IV
    assert.ok(exp.reachPlanetOrbit());
    assert.equal(exp.stage, "approaching_planet");
    assert.equal(exp.isSpaceFlightActive, true);
    assert.equal(exp.currentObjective.id, "enter_orbit");

    // Lands on planetary surface
    assert.ok(exp.landOnSurface());
    assert.equal(exp.stage, "surface_eva");
    assert.equal(exp.isSurfaceActive, true);
    assert.equal(exp.currentObjective.id, "deploy_beacon");

    // Deploys research beacon
    assert.ok(exp.deployBeacon());
    assert.equal(exp.beaconDeployed, true);
    assert.equal(exp.sampleCollected, false);
    assert.equal(exp.currentObjective.id, "collect_sample");

    // Collects heavy hydrogen deuterium sample
    assert.ok(exp.collectSample());
    assert.equal(exp.sampleCollected, true);
    assert.equal(exp.stage, "chapter2_resolved");
    assert.equal(exp.isChapter2Done, true);
    assert.equal(exp.currentObjective.id, "return_mothership");
  });

  test("rejects invalid out-of-order transitions", () => {
    const exp = new ExplorationSystem();
    assert.equal(exp.reachPlanetOrbit(), false);
    assert.equal(exp.landOnSurface(), false);
    assert.equal(exp.deployBeacon(), false);
    assert.equal(exp.collectSample(), false);
  });
});

describe("SpaceFlight mechanics & celestial navigation", () => {
  test("shuttle spawns near mothership and computes distance to celestial targets", () => {
    const flight = new SpaceFlight();
    flight.spawnAtMothership();

    assert.ok(flight.distanceToMothership() < 120, "shuttle spawns near mothership dock");
    assert.ok(flight.distanceToPlanet() > 2000, "planet Farthest-IV is across the system");
    assert.equal(flight.fuel, 100);
    assert.equal(flight.asteroids.length, 32, "Kaiyang ring contains 32 asteroids");
  });

  test("shuttle steering and thrust physics update correctly", () => {
    const flight = new SpaceFlight();
    flight.spawnAtMothership();
    const initialAngle = flight.angle;

    // Simulate steering right (KeyD)
    const mockInputTurn = {
      isDown: (k: string) => k === "KeyD",
      wasPressed: () => false
    };
    flight.update(0.1, mockInputTurn as any);
    assert.ok(flight.angle > initialAngle, "turning right increases heading angle");

    // Simulate thruster burn (KeyW)
    const initialSpeed = flight.speed;
    const mockInputThrust = {
      isDown: (k: string) => k === "KeyW",
      wasPressed: () => false
    };
    flight.update(0.2, mockInputThrust as any);
    assert.ok(flight.speed > initialSpeed, "forward thruster accelerates shuttle");
    assert.ok(flight.fuel < 100, "thruster burn consumes fuel");
  });
});

describe("Chapter 2 End-to-End integration in ShipWorld", () => {
  test("hangar shuttle console blocks launch until Chapter 1 is resolved, then launches seamlessly", () => {
    const world = ship();

    // 1. In deck mode before crisis resolved
    assert.equal(world.currentMode, "deck");
    const hangarConsole = world.examinable.find((t) => t.label === "穿梭机登机舷梯控制台");
    assert.ok(hangarConsole, "shuttle boarding console exists in hangar");

    // Examine console: blocked because crisis is not yet resolved
    // @ts-expect-error accessing private examine
    world.examine(hangarConsole);
    assert.ok(world.dialogue.isOpen);
    assert.match(world.dialogue.current?.text ?? "", /特级管损警报|锁定/);
    assert.equal(world.currentMode, "deck", "shuttle launch is blocked during Chapter 1");
    world.dialogue.close();

    // 2. Resolve Chapter 1 crisis
    world.duty.complete("power");
    world.duty.complete("switch");
    world.duty.complete("plant");
    world.duty.complete("report");
    world.crisis.triggerAlarm();
    world.crisis.advanceToEva();
    world.crisis.equipEvaSuit();
    world.crisis.ventCoolantValve();
    world.crisis.pullEjectionLever();
    assert.ok(world.crisis.isResolved, "Chapter 1 crisis is fully resolved");

    // 3. Now interact with shuttle console to launch Chapter 2!
    // @ts-expect-error accessing private examine
    world.examine(hangarConsole);
    assert.equal(world.currentMode, "space_flight", "launches into space flight mode");
    assert.equal(world.placeLabel, "深空航线 · 初辉恒星系 (Dawn Star System)");
    assert.equal(world.exploration.stage, "space_flight");

    // Close launch dialogue
    world.dialogue.close();

    // 4. Fly to Planet Farthest-IV and land
    world.spaceFlight.x = world.spaceFlight.targetPlanet.x - 30;
    world.spaceFlight.y = world.spaceFlight.targetPlanet.y - 30;
    assert.ok(world.spaceFlight.distanceToPlanet() < 100);
    assert.equal(world.interactionLabel, "着陆远境-IV");

    // Land on planet
    world.interactInReach();
    assert.equal(world.currentMode, "planetary_surface", "lands on planetary surface");
    assert.equal(world.placeLabel, "行星地表 · 远境-IV 玄武岩极地 (Farthest-IV)");
    assert.equal(world.exploration.stage, "surface_eva");

    // Close landing dialogue
    world.dialogue.close();

    // 5. Ground Survey: Deploy beacon
    const beaconTarget = { id: "surface_beacon", label: world.planetSurface.beaconSite.label, x: world.planetSurface.beaconSite.x, y: world.planetSurface.beaconSite.y, radius: 46 };
    world.examineSurface(beaconTarget);
    assert.ok(world.exploration.beaconDeployed, "research beacon is deployed");
    world.dialogue.close();

    // 6. Ground Survey: Collect Deuterium crystal sample
    const sampleTarget = { id: "surface_sample", label: world.planetSurface.sampleSite.label, x: world.planetSurface.sampleSite.x, y: world.planetSurface.sampleSite.y, radius: 46 };
    world.examineSurface(sampleTarget);
    assert.ok(world.exploration.sampleCollected, "heavy hydrogen deuterium crystal sampled");
    assert.ok(world.exploration.isChapter2Done, "Chapter 2 exploration is now fully complete!");
    world.dialogue.close();

    // 7. Board shuttle to return to space flight
    const shuttleTarget = { id: "surface_shuttle", label: world.planetSurface.landingShuttle.label, x: world.planetSurface.landingShuttle.x, y: world.planetSurface.landingShuttle.y, radius: 46 };
    world.examineSurface(shuttleTarget);
    assert.equal(world.currentMode, "space_flight", "returns to space flight mode");
    world.dialogue.close();

    // 8. Fly back to Yuanwang mothership and dock
    world.spaceFlight.x = world.spaceFlight.mothership.x;
    world.spaceFlight.y = world.spaceFlight.mothership.y;
    assert.ok(world.spaceFlight.distanceToMothership() < 50);
    assert.equal(world.interactionLabel, "返回远望号母舰");

    world.interactInReach();
    assert.equal(world.currentMode, "deck", "docks back inside Yuanwang mothership hangar");
    assert.match(world.placeLabel, /机库|生活区|舰桥/);
  });
});
