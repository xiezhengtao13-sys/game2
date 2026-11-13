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
  test("blocks locked destinations at game start and cycles across unlocked stations progressively", () => {
    const world = ship();
    const initialY = world.player.y;

    // 1. At start without midship_pass, transit refuses to depart Crew Habitat
    world.cycleTransitHub();
    assert.equal(world.player.y, initialY);
    assert.equal(world.placeLabel, "远望号 · 船员生活区");

    // 2. Grant all sector clearances -> cycles smoothly through all 6 ship stations
    world.security.grant("midship_pass");
    world.security.grant("crisis_override");
    world.security.grant("bridge_pass");

    world.cycleTransitHub();
    assert.match(world.placeLabel, /中央交通枢纽/);

    world.cycleTransitHub();
    assert.match(world.placeLabel, /L-1 生态农业模块/);

    world.cycleTransitHub();
    assert.match(world.placeLabel, /机库/);

    world.cycleTransitHub();
    assert.match(world.placeLabel, /动力|反应堆/);

    world.cycleTransitHub();
    assert.match(world.placeLabel, /舰桥/);

    // Wraps back to Crew Habitat start station
    world.cycleTransitHub();
    assert.match(world.placeLabel, /船员生活区/);
  });
});
