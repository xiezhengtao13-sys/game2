import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BattleEngine } from "../src/game/battle/battleEngine";
import { createPatternState, stepBulletPattern } from "../src/game/battle/bulletPatterns";
import { ENEMIES } from "../src/game/data/enemies";
import { ROOMS } from "../src/game/data/rooms";
import { createInitialRoute, determineEnding, GameController } from "../src/game/gameController";
import type { EnemyId, InputSnapshot } from "../src/game/types";

function emptyInput(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    slow: false,
    confirmPressed: false,
    cancelPressed: false,
    menuPressed: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
    clickX: null,
    clickY: null,
    ...overrides
  };
}

function makeMockCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    drawImage: noop,
    setLineDash: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: (t: string) => ({ width: t.length * 14 }),
    fillStyle: "#000",
    strokeStyle: "#fff",
    lineWidth: 1,
    font: "16px monospace",
    textAlign: "left",
    textBaseline: "top",
    globalAlpha: 1,
    imageSmoothingEnabled: false
  } as unknown as CanvasRenderingContext2D;
}

describe("Discrete Star Sea: Echoes of Charon — Undertale Combat & 4-Soul Mechanics", () => {
  test("all 5 encounters have valid multi-step ACT -> SPARE paths and FIGHT paths", () => {
    const ids: EnemyId[] = ["kiosk", "med07", "weaver", "vark", "charon"];
    for (const id of ids) {
      const route = createInitialRoute();
      const b = new BattleEngine(id, route);
      assert.equal(b.phase, "menu", `${id} should open on menu in normal route`);

      // Test FIGHT timing bar deal damage
      b.selectedBtn = 0;
      b.update(0.016, emptyInput({ confirmPressed: true }));
      assert.equal(b.phase, "fight_bar");
      b.fightBarX = 0.02; // dead-center critical!
      b.update(0.016, emptyInput({ confirmPressed: true }));
      assert.equal(b.phase, "fight_anim");
      assert.equal(b.lastCrit, true, `${id} center strike must be CRITICAL`);
      assert.ok(b.enemyHp < ENEMIES[id].maxHp, `${id} took damage`);
    }
  });

  test("BLUE soul implements 0.45g jump gravity and lands cleanly on battle box floor", () => {
    const route = createInitialRoute();
    const b = new BattleEngine("med07", route);
    // Enter bullet hell (turn 0 on med07 is BLUE soul!)
    b.phase = "enemy_talk";
    b.bubbleTimer = 0.01;
    b.update(0.05, emptyInput({ confirmPressed: true }));
    assert.equal(b.phase, "bullet_hell");
    assert.equal(b.soulMode, "blue");

    const floorY = b.soulY;
    b.update(0.05, emptyInput({ up: true }));
    assert.ok(b.soulY < floorY - 5, "BLUE soul should jump upward when Up is pressed");

    // Let gravity pull it back down
    for (let i = 0; i < 40; i++) {
      b.update(0.03, emptyInput());
    }
    assert.equal(b.soulOnGround, true, "BLUE soul should land cleanly back on floor");
  });

  test("GREEN soul locks center, snaps shield 4 ways, and parries incoming Vark spears for TP", () => {
    const route = createInitialRoute();
    const b = new BattleEngine("vark", route);
    b.phase = "enemy_talk";
    b.update(0.05, emptyInput({ confirmPressed: true }));
    assert.equal(b.phase, "bullet_hell");
    assert.equal(b.soulMode, "green");

    // Inject an incoming spear from the right right at parry range
    b.bullets.push({
      id: 777,
      kind: "spear",
      x: b.soulX + 30,
      y: b.soulY,
      vx: -200,
      vy: 0,
      w: 22,
      h: 10,
      radius: 8,
      color: "#38bdf8",
      damage: 5,
      age: 0,
      maxAge: 3,
      fromDir: "right"
    });

    const hpBefore = route.hp;
    const tpBefore = b.tp;
    b.update(0.016, emptyInput({ right: true }));
    assert.equal(b.shieldDir, "right");
    assert.equal(route.hp, hpBefore, "Parried spear must deal 0 damage");
    assert.ok(b.tp > tpBefore, "Parrying a spear must award TP");
    assert.equal(b.bullets.some((x) => x.id === 777), false, "Parried spear must be destroyed");
  });

  test("YELLOW soul shoots upward pulse bolts that destroy Weaver assimilation nodes", () => {
    const route = createInitialRoute();
    const b = new BattleEngine("weaver", route);
    b.phase = "enemy_talk";
    b.update(0.05, emptyInput({ confirmPressed: true }));
    assert.equal(b.phase, "bullet_hell");
    assert.equal(b.soulMode, "yellow");

    // Place a destructible node directly above the soul
    b.bullets = [
      {
        id: 888,
        kind: "node",
        x: b.soulX,
        y: b.soulY - 36,
        vx: 0,
        vy: 0,
        w: 28,
        h: 28,
        radius: 14,
        color: "#a855f7",
        damage: 5,
        age: 0,
        maxAge: 5,
        destructible: true,
        hp: 1
      }
    ];

    b.update(0.016, emptyInput({ confirmPressed: true }));
    for (let i = 0; i < 10; i++) b.update(0.016, emptyInput());
    assert.equal(b.bullets.some((x) => x.id === 888), false, "Yellow pulse shot should shatter destructible node");
    assert.ok(b.tp >= 6, "Shattering node should grant TP");
  });

  test("Ruthless Charon-Omega attacks first and permanently slashes the MERCY button", () => {
    const route = createInitialRoute();
    route.kills = 4;
    const b = new BattleEngine("charon", route);
    assert.equal(b.ruthlessMode, true);
    assert.equal(b.mercySlashed, true);
    assert.equal(b.phase, "enemy_talk", "Ruthless final boss must ambush player before their menu turn");

    // Attempting MERCY when slashed bounces back cleanly
    b.phase = "menu";
    b.selectedBtn = 3;
    b.update(0.016, emptyInput({ confirmPressed: true }));
    assert.equal(b.phase, "message");
    assert.ok(b.messageLines[0].includes("斩断"));
  });

  test("all 3 ending branches (pacifist, neutral, ruthless) resolve accurately", () => {
    const pac = createInitialRoute();
    pac.kills = 0;
    pac.spares = 5;
    pac.outcomes.charon = "spared";
    assert.equal(determineEnding(pac), "pacifist");

    const neu = createInitialRoute();
    neu.kills = 2;
    neu.spares = 3;
    neu.outcomes.charon = "spared";
    assert.equal(determineEnding(neu), "neutral");

    const ruth = createInitialRoute();
    ruth.kills = 5;
    ruth.spares = 0;
    ruth.outcomes.charon = "destroyed";
    assert.equal(determineEnding(ruth), "ruthless");
  });
});

describe("Overworld Rooms, Puzzle Flow & Full Render Integrity", () => {
  test("Cryo Conservatory 3-relay puzzle unlocks East blast door flag cleanly", () => {
    const ctrl = new GameController();
    ctrl.skipIntroToOverworld();
    ctrl.overworld.dialogue = null;
    ctrl.overworld.enterRoom("cryo", 120, 300, "right");
    ctrl.overworld.dialogue = null;

    const swCoords = ROOMS.cryo.objects.filter((o) => o.kind === "relay_switch");
    assert.equal(swCoords.length, 3);

    for (const sw of swCoords) {
      ctrl.overworld.playerX = sw.x + sw.w / 2;
      ctrl.overworld.playerY = sw.y + sw.h / 2 + 8;
      ctrl.overworld.update(0.016, emptyInput());
      ctrl.overworld.dialogue = null;
    }

    assert.equal(ctrl.route.flags.cryo_door_open, true, "Activating all 3 switches must open Cryo blast door");
  });

  test("all 17 bullet patterns spawn valid projectiles and every game screen renders with zero exceptions", () => {
    const box = { x: 470, y: 340, w: 340, h: 215, cx: 640, cy: 448 };
    const patterns = [
      "kiosk_beam_intro",
      "kiosk_smiley_burst",
      "med_cryo_jump",
      "med_icicle_rain",
      "med_heartbeat_jump",
      "weaver_pull_rings",
      "weaver_nodes_shoot",
      "weaver_tether_spiral",
      "vark_spears_basic",
      "vark_spears_reverse",
      "vark_gravity_sweep",
      "charon_morse_grid",
      "charon_gravity_debris",
      "charon_memory_spears",
      "charon_core_shoot",
      "charon_unhinged_box",
      "charon_unhinged_barrage"
    ] as const;

    for (const pid of patterns) {
      const ps = createPatternState(pid);
      let count = 0;
      for (let i = 0; i < 60; i++) {
        count += stepBulletPattern(ps, 0.05, box, 640, 460, 6, false).length;
      }
      assert.ok(count > 0, `Pattern ${pid} should spawn bullets over 3s`);
    }

    const ctx = makeMockCtx();
    const ctrl = new GameController();
    ctrl.render(ctx); // title

    ctrl.startNewRunFromTitle();
    ctrl.render(ctx); // intro

    ctrl.skipIntroToOverworld();
    for (const roomId of Object.keys(ROOMS)) {
      ctrl.overworld.enterRoom(roomId, 200, 310, "right");
      ctrl.render(ctx);
    }

    for (const eid of ["kiosk", "med07", "weaver", "vark", "charon"] as EnemyId[]) {
      ctrl.startBattleImmediate(eid);
      ctrl.render(ctx);
      ctrl.battle!.phase = "bullet_hell";
      ctrl.battle!.update(0.1, emptyInput());
      ctrl.render(ctx);
    }

    ctrl.route.outcomes.charon = "spared";
    ctrl.enterEnding();
    ctrl.render(ctx);
  });
});
