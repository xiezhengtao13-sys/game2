import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { RpgSystem } from "../src/game/systems/RpgSystem";
import { Dialogue } from "../src/game/systems/Dialogue";
import { Player } from "../src/game/entities/Player";
import { ShipAtmosphere } from "../src/game/scenes/shipLighting";
import { SpaceFlight } from "../src/game/scenes/SpaceFlight";
import { PlanetSurface } from "../src/game/scenes/PlanetSurface";
import { ExplorationSystem } from "../src/game/systems/ExplorationSystem";
import { fakeInput, ship } from "./shipWorld";
import type { Renderer } from "../src/engine/graphics/Renderer";

function stubRenderer(): Renderer & { calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const bump = (k: string) => {
    calls[k] = (calls[k] ?? 0) + 1;
  };
  return {
    width: 1280,
    height: 720,
    camera: { worldX: 0, worldY: 0, viewportWidth: 1280, viewportHeight: 720, centerOn() {}, clampTo() {} },
    calls,
    clear() { bump("clear"); },
    drawRect() { bump("drawRect"); },
    drawSprite() { bump("drawSprite"); },
    drawText() { bump("drawText"); },
    drawWorldText() { bump("drawWorldText"); },
    drawGradientRect() { bump("drawGradientRect"); },
    drawEllipse() { bump("drawEllipse"); },
    drawRadialLight() { bump("drawRadialLight"); },
    drawLine() { bump("drawLine"); },
    beginLightMask() { bump("beginLightMask"); },
    punchLightHole() { bump("punchLightHole"); },
    endLightMask() { bump("endLightMask"); }
  };
}

describe("Classic Fallout RpgSystem core mechanics", () => {
  test("archetypes configure S.P.E.C.I.A.L. stats, starting skills, and switch rules", () => {
    const rpg = new RpgSystem("veteran");
    assert.equal(rpg.level, 1);
    assert.equal(rpg.skillPoints, 20);
    assert.equal(rpg.canSwitchArchetype(), true);
    const vetRepair = rpg.getSkill("repair");
    const vetSci = rpg.getSkill("science");

    rpg.applyArchetype("archivist");
    assert.ok(rpg.getSkill("science") > vetSci, "archivist boosts science");
    assert.ok(rpg.getSkill("repair") < vetRepair, "veteran has stronger repair");

    rpg.applyArchetype("fixer");
    assert.ok(rpg.maxAp >= 12, "fixer gains bonus AP");
    assert.ok(rpg.getSkill("speech") > 60, "fixer specializes in speech");

    rpg.grantXp(25, "test xp");
    assert.equal(rpg.canSwitchArchetype(), false, "origin locks after gaining XP");
  });

  test("skill point investment, item bonuses, deterministic skill checks, and leveling", () => {
    const rpg = new RpgSystem("veteran");
    const baseRepair = rpg.getSkill("repair");

    assert.equal(rpg.investSkillPoint("repair", 5), true);
    assert.equal(rpg.skillPoints, 15);
    assert.equal(rpg.getSkill("repair"), baseRepair + 5);

    rpg.addItem({
      id: "wrench_heavy",
      name: "Heavy Wrench",
      icon: "🔧",
      category: "gear",
      desc: "Test",
      equipped: true
    });
    assert.equal(rpg.getSkill("repair"), baseRepair + 20, "wrench adds passive +15 repair");

    const pass = rpg.attemptSkillCheck("test_ok", "repair", 50, 260, 100, 100, 1);
    assert.equal(pass.ok, true);
    assert.equal(pass.firstCompletion, true);
    assert.equal(rpg.level, 2, "260 XP crosses level 2 threshold (250)");
    assert.ok(rpg.maxHp > 120, "level up raises max HP");
    assert.ok(rpg.skillPoints > 15, "level up grants bonus skill points");

    const fail = rpg.attemptSkillCheck("test_fail", "speech", 85, 100, 100, 100, 99);
    assert.equal(fail.ok, false);
  });

  test("med_stim heals HP, purges RAD, and EVA suit mitigates reactor thermal hazard", () => {
    const rpg = new RpgSystem("veteran");
    rpg.damage(35, 45, "Steam leak");
    assert.equal(rpg.hp, rpg.maxHp - 35);
    assert.equal(rpg.rad, 45);

    const beforeQty = rpg.items.get("med_stim")!.quantity;
    assert.equal(rpg.useItem("med_stim"), true);
    assert.equal(rpg.items.get("med_stim")!.quantity, beforeQty - 1);
    assert.equal(rpg.hp, rpg.maxHp, "stim restores up to 40 HP");
    assert.equal(rpg.rad, 0, "stim removes up to 50 RAD");

    // Thermal damage unshielded vs shielded
    const unshielded = new RpgSystem("archivist");
    const hpStart = unshielded.hp;
    unshielded.update(0.6, true, false, 100, 100);
    assert.ok(unshielded.hp < hpStart, "reactor hot zone burns unshielded player");

    const shielded = new RpgSystem("archivist");
    const shieldedHp = shielded.hp;
    shielded.update(0.6, true, true, 100, 100);
    assert.equal(shielded.hp, shieldedHp, "EVA suit blocks thermal HP loss");
  });
});

describe("Fallout branching Dialogue & Player click-to-move", () => {
  test("Dialogue supports both branching selectChoice() and linear advance()", () => {
    const d = new Dialogue();
    let branchVisited = false;
    d.open([
      { speaker: "NPC", text: "Intro line" },
      {
        speaker: "NPC",
        text: "Decision line",
        choices: [
          {
            tag: "[话术 80%]",
            label: "Persuade",
            action: () => {
              branchVisited = true;
              return [{ speaker: "NPC", text: "Succeeded branch!" }];
            }
          }
        ]
      }
    ]);

    assert.equal(d.hasChoices, false);
    d.advance();
    assert.equal(d.hasChoices, true);
    assert.equal(d.selectChoice(0), true);
    assert.equal(branchVisited, true);
    assert.equal(d.current?.text, "Succeeded branch!");
    assert.equal(d.advance(), false);
  });

  test("Player moves smoothly toward click target and cancels on WASD override", () => {
    const world = ship();
    const p = new Player(world.player.x, world.player.y);
    const startX = p.x;
    p.setMoveTarget(startX + 48, p.y + p.height - p.colliderHeight / 2);

    for (let i = 0; i < 30; i++) {
      p.update(0.03, fakeInput([]), world.tileMap);
    }
    assert.ok(p.x > startX + 20, "player walked east toward click destination");
    assert.equal(p.moveTarget, null, "moveTarget cleared after reaching destination");

    p.setMoveTarget(p.x + 200, p.y + p.height);
    p.update(0.016, fakeInput(["KeyW"]), world.tileMap);
    assert.equal(p.moveTarget, null, "manual keyboard input cancels pending mouse move");
  });
});

describe("BG3/Diablo ShipWorld CRPG integration & lighting pipeline", () => {
  test("Captain dialogue grants captain_cipher via deterministic Fallout speech choice", () => {
    const world = ship();
    const origRandom = Math.random;
    Math.random = () => 0.05; // Guarantee roll <= 5
    try {
      const cap = world.examinable.find((e) => e.id === "person-captain")!;
      // Move player below captain and interact
      world.player.x = cap.x - world.player.width / 2;
      world.player.y = cap.y + 42 - world.player.height;
      world.player.animation.face("up");
      world.interactInReach();

      while (!world.dialogue.hasChoices && world.dialogue.isOpen) {
        world.dialogue.advance();
      }
      assert.equal(world.dialogue.hasChoices, true, "captain final line exposes Fallout choices");
      world.selectDialogueChoice(0);
      assert.equal(world.rpg.hasItem("captain_cipher"), true, "passing speech check awards captain cipher");
      assert.ok(world.rpg.xp > 0, "passing check awards XP");
    } finally {
      Math.random = origRandom;
    }
  });

  test("Atmospheric multi-pass renderer invokes extrusion gradients, light mask cutouts, and blooms", () => {
    const world = ship();
    const mock = stubRenderer();
    const atmo = new ShipAtmosphere();
    atmo.update(0.1, 0, 0, 1280, 720, "bridge", false);
    atmo.renderWallDepthAndAO(mock, world.tileMap);
    atmo.renderLightingPass(mock, world.tileMap, [], world.player.centerX, world.player.y + 48, 0, "bridge", false, 1.0);

    assert.ok((mock.calls.drawGradientRect ?? 0) > 0, "2.5D wall extrusion gradients drawn");
    assert.equal(mock.calls.beginLightMask, 1, "light mask initialized");
    assert.ok((mock.calls.punchLightHole ?? 0) >= 2, "headlamp circle and beam cone punched");
    assert.equal(mock.calls.endLightMask, 1, "light mask composited");

    // SpaceFlight and PlanetSurface atmospheric render passes remain error-free
    const flight = new SpaceFlight();
    flight.render(mock);
    const surface = new PlanetSurface(null, new ExplorationSystem());
    surface.render(mock);
    assert.ok((mock.calls.drawRadialLight ?? 0) > 5, "radial atmospheric glows emitted across scenes");
  });
});
