import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SoundEffects } from "../src/engine/audio/SoundEffects";
import { ship } from "./shipWorld";

describe("SoundEffects procedural engine", () => {
  test("safely initializes and handles sound triggers without AudioContext in test runtime", () => {
    const sfx = new SoundEffects();
    // In headless Node, Web Audio is gracefully skipped
    assert.doesNotThrow(() => {
      sfx.playClick();
      sfx.playBeep(880);
      sfx.playSteam(0.1);
      sfx.playClank();
      sfx.playTransitChime();
      sfx.playBeaconPulse();
      sfx.startAlarm();
      sfx.stopAlarm();
      sfx.startThruster();
      sfx.stopThruster();
    });
  });
});

describe("Camera Screen Shake mechanics", () => {
  test("shake intensity applies camera offset and decays smoothly over time", () => {
    const world = ship();
    const baseCamera = world.getCamera();

    // Trigger screen shake
    world.addShake(10, 0.5);

    // Camera now returns perturbed coordinate
    const shakingCam = world.getCamera();
    assert.ok(
      shakingCam.x !== baseCamera.x || shakingCam.y !== baseCamera.y,
      "camera coordinate is shaken by intensity"
    );

    // Advance time beyond shake duration
    const mockInput = { isDown: () => false, wasPressed: () => false };
    world.update(0.6, mockInput as any);

    // Shake has fully decayed back to center
    const quietCam = world.getCamera();
    assert.equal(quietCam.x, world.player.centerX);
    assert.equal(quietCam.y, world.player.centerY);
  });
});

describe("Central Transit Maglev Fast-Travel", () => {
  test("interacts with transit terminal to cycle across the 4 major ship hubs", () => {
    const world = ship();
    const initialY = world.player.y;

    // Cycle to station 2 (transit station)
    world.cycleTransitHub();
    assert.notEqual(world.player.y, initialY);
    assert.match(world.placeLabel, /主交通干线|生活区|中央交通站/);

    // Cycle to station 3 (hangar bay)
    world.cycleTransitHub();
    assert.match(world.placeLabel, /机库/);

    // Cycle to station 4 (reactor bay)
    world.cycleTransitHub();
    assert.match(world.placeLabel, /动力|反应堆/);

    // Cycle wraps back to station 1 (bridge)
    world.cycleTransitHub();
    assert.match(world.placeLabel, /舰桥/);
  });
});
