import { drawBattleBoss } from "../art/bossArt";
import {
  drawGreenShield,
  drawPixelHeart,
  drawSpeechBubble,
  drawUndertaleBox,
  soulPalette,
  wrapText
} from "../art/pixelCanvas";
import { sound } from "../audio/soundEngine";
import { ENEMIES } from "../data/enemies";
import { getItem } from "../data/items";
import type {
  ActOption,
  BattleActContext,
  BattleParticle,
  Bullet,
  Direction,
  EnemyDef,
  EnemyId,
  EncounterOutcome,
  FloatingNumber,
  InputSnapshot,
  RouteState,
  SoulMode
} from "../types";
import { createPatternState, stepBulletPattern, type PatternState } from "./bulletPatterns";

export type BattlePhase =
  | "menu"
  | "submenu"
  | "fight_bar"
  | "fight_anim"
  | "message"
  | "enemy_talk"
  | "bullet_hell"
  | "victory"
  | "game_over";

export type MainAction = 0 | 1 | 2 | 3; // FIGHT, ACT, ITEM, MERCY

const MENU_BOX_W = 700;
const MENU_BOX_H = 205;
const BOX_CENTER_X = 640;
const BOX_CENTER_Y = 448;

export class BattleEngine {
  readonly enemy: EnemyDef;
  readonly route: RouteState;
  readonly ruthlessMode: boolean;

  phase: BattlePhase = "menu";
  selectedBtn: MainAction = 0;
  subIndex = 0;

  enemyHp: number;
  enemyDef: number;
  actStage = 0;
  turn = 0;
  spareable = false;
  tp = 0; // Deltarune-style 0..100 Tension Gauge from grazing & parrying!
  mercySlashed = false;
  barrierActive = false;
  weakenNextWave = false;

  // Typewriter message state
  messageLines: string[] = [];
  messageIdx = 0;
  typedChars = 0;
  typeTimer = 0;
  afterMessage: "enemy_talk" | "menu" | "victory" = "enemy_talk";

  // Enemy speech bubble before attack
  bubbleText = "";
  bubbleTimer = 0;

  // Fight timing reticle
  fightBarX = 0; // -1..1 normalized across box
  fightBarDir = 1;
  fightBarSpeed = 2.05;
  slashTimer = 0;
  lastCrit = false;

  // Battle box smooth interpolation
  boxW = MENU_BOX_W;
  boxH = MENU_BOX_H;
  targetBoxW = MENU_BOX_W;
  targetBoxH = MENU_BOX_H;
  boxOffX = 0;
  boxOffY = 0;

  // Soul state inside bullet-hell box
  soulMode: SoulMode = "red";
  soulX = BOX_CENTER_X;
  soulY = BOX_CENTER_Y;
  soulVx = 0;
  soulVy = 0;
  soulOnGround = false;
  shieldDir: Direction = "up";
  parryFlash = 0;
  shootCooldown = 0;
  iFrames = 0;
  grazeFlash = 0;

  // Wave & projectiles
  waveTimer = 0;
  waveDuration = 5;
  patternState: PatternState | null = null;
  bullets: Bullet[] = [];
  particles: BattleParticle[] = [];
  floatNums: FloatingNumber[] = [];

  // Visual juice
  t = 0;
  hurtTimer = 0;
  shakeTimer = 0;
  shakeMag = 0;
  hitStop = 0;
  sparedProgress = 0;
  destroyedProgress = 0;
  outcome: EncounterOutcome | null = null;
  done = false;
  retryRequested = false;

  // Game Over Heart-Shatter animation
  gameOverTimer = 0;
  shards: Array<{ x: number; y: number; vx: number; vy: number; color: string }> = [];

  // Local battle flags
  flags: Record<string, boolean> = {};

  constructor(enemyId: EnemyId, route: RouteState) {
    this.enemy = ENEMIES[enemyId];
    this.route = route;
    this.ruthlessMode = enemyId === "charon" && route.kills >= 4;
    this.enemyHp = this.ruthlessMode ? this.enemy.maxHp + 60 : this.enemy.maxHp;
    this.enemyDef = this.ruthlessMode ? this.enemy.def + 2 : this.enemy.def;
    this.mercySlashed = this.ruthlessMode;

    sound.setMusic(this.ruthlessMode && this.enemy.ruthlessMusic ? this.enemy.ruthlessMusic : this.enemy.music);

    // Ruthless Charon-Ω Sans-style ambush: strikes FIRST before player menu!
    if (this.ruthlessMode) {
      this.bubbleText = "你以为我还会让你先挑按钮吗？！你的【解耦】按钮，我亲手替你斩断了！";
      this.bubbleTimer = 2.6;
      this.phase = "enemy_talk";
      this.addShake(10, 0.45);
      sound.playSlash(true);
    } else {
      this.messageLines = [this.enemy.introText];
      this.phase = "menu";
      this.typedChars = this.enemy.introText.length;
    }
  }

  private get ctx(): BattleActContext {
    return {
      enemyId: this.enemy.id,
      actStage: this.actStage,
      turn: this.turn,
      enemyHp: this.enemyHp,
      enemyMaxHp: this.ruthlessMode ? this.enemy.maxHp + 60 : this.enemy.maxHp,
      spareable: this.spareable,
      ruthlessMode: this.ruthlessMode,
      tp: this.tp,
      barrierActive: this.barrierActive,
      route: this.route,
      flags: this.flags
    };
  }

  getVisibleActs(): ActOption[] {
    const c = this.ctx;
    return this.enemy.acts.filter((a) => !a.visible || a.visible(c));
  }

  private getBoxRect() {
    const cx = BOX_CENTER_X + this.boxOffX;
    const cy = BOX_CENTER_Y + this.boxOffY;
    return {
      x: cx - this.boxW / 2,
      y: cy - this.boxH / 2,
      w: this.boxW,
      h: this.boxH,
      cx,
      cy
    };
  }

  addShake(mag: number, dur: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTimer = Math.max(this.shakeTimer, dur);
  }

  private spawnBurst(x: number, y: number, color: string, count: number, speed = 160): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 4 + Math.floor(Math.random() * 4),
        color,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35,
        gravity: 220
      });
    }
  }

  private showMessage(lines: string[], after: "enemy_talk" | "menu" | "victory"): void {
    this.messageLines = lines.length > 0 ? lines : ["* ……"];
    this.messageIdx = 0;
    this.typedChars = 0;
    this.typeTimer = 0;
    this.afterMessage = after;
    this.phase = "message";
    this.targetBoxW = MENU_BOX_W;
    this.targetBoxH = MENU_BOX_H;
  }

  update(dt: number, input: InputSnapshot): void {
    this.t += dt;

    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }

    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.iFrames > 0) this.iFrames = Math.max(0, this.iFrames - dt);
    if (this.parryFlash > 0) this.parryFlash = Math.max(0, this.parryFlash - dt);
    if (this.grazeFlash > 0) this.grazeFlash = Math.max(0, this.grazeFlash - dt);
    if (this.shootCooldown > 0) this.shootCooldown = Math.max(0, this.shootCooldown - dt);

    // Smooth battle box resize lerp
    const lerp = Math.min(1, dt * 12);
    this.boxW += (this.targetBoxW - this.boxW) * lerp;
    this.boxH += (this.targetBoxH - this.boxH) * lerp;

    // Update particles & floating numbers
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
    }
    for (let i = this.floatNums.length - 1; i >= 0; i--) {
      const f = this.floatNums[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.floatNums.splice(i, 1);
        continue;
      }
      f.y += f.vy * dt;
      f.vy *= 0.94;
    }

    switch (this.phase) {
      case "menu":
        this.updateMenu(dt, input);
        break;
      case "submenu":
        this.updateSubmenu(input);
        break;
      case "fight_bar":
        this.updateFightBar(dt, input);
        break;
      case "fight_anim":
        this.updateFightAnim(dt);
        break;
      case "message":
        this.updateMessage(dt, input);
        break;
      case "enemy_talk":
        this.updateEnemyTalk(dt, input);
        break;
      case "bullet_hell":
        this.updateBulletHell(dt, input);
        break;
      case "victory":
        this.updateVictory(dt, input);
        break;
      case "game_over":
        this.updateGameOver(dt, input);
        break;
    }
  }

  private updateMenu(dt: number, input: InputSnapshot): void {
    this.boxOffX = 0;
    this.boxOffY = 0;
    this.targetBoxW = MENU_BOX_W;
    this.targetBoxH = MENU_BOX_H;

    // Type flavor text gently
    const line = this.messageLines[0] ?? "";
    if (this.typedChars < line.length) {
      this.typeTimer += dt;
      while (this.typeTimer >= 0.022 && this.typedChars < line.length) {
        this.typeTimer -= 0.022;
        this.typedChars++;
      }
    }

    // Mouse click on the 4 bottom action buttons
    if (input.clickX !== null && input.clickY !== null) {
      const clickedBtn = this.hitTestMainButtons(input.clickX, input.clickY);
      if (clickedBtn !== null) {
        this.selectedBtn = clickedBtn;
        this.confirmMainButton();
        return;
      }
    }

    if (input.leftPressed) {
      this.selectedBtn = ((this.selectedBtn + 3) % 4) as MainAction;
      sound.playMenuMove();
    } else if (input.rightPressed) {
      this.selectedBtn = ((this.selectedBtn + 1) % 4) as MainAction;
      sound.playMenuMove();
    } else if (input.confirmPressed) {
      this.confirmMainButton();
    }
  }

  private hitTestMainButtons(mx: number, my: number): MainAction | null {
    const startX = 240;
    const gap = 205;
    const by = 626;
    const bw = 185;
    const bh = 58;
    for (let i = 0; i < 4; i++) {
      const bx = startX + i * gap;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        return i as MainAction;
      }
    }
    return null;
  }

  private confirmMainButton(): void {
    if (this.selectedBtn === 0) {
      // FIGHT -> Launch timing reticle!
      sound.playConfirm();
      this.fightBarX = -1;
      this.fightBarDir = 1;
      const baseSpeed =
        this.route.difficulty === "story" ? 1.65 : this.route.difficulty === "hardcore" ? 2.35 : 2.0;
      this.fightBarSpeed = baseSpeed + (this.ruthlessMode ? 0.35 : 0);
      this.phase = "fight_bar";
      return;
    }

    if (this.selectedBtn === 3 && this.mercySlashed) {
      sound.playCancel();
      this.addShake(5, 0.2);
      this.showMessage(["* 【MERCY 解耦】已被卡戎号的怒火彻底斩断。你没有回头路了。"], "menu");
      return;
    }

    if (this.selectedBtn === 2 && this.route.items.length === 0) {
      sound.playCancel();
      this.showMessage(["* 随身补给包里已经空空如也。"], "menu");
      return;
    }

    sound.playConfirm();
    this.subIndex = 0;
    this.phase = "submenu";
  }

  private updateSubmenu(input: InputSnapshot): void {
    if (input.cancelPressed) {
      sound.playCancel();
      this.phase = "menu";
      return;
    }

    const count =
      this.selectedBtn === 1
        ? this.getVisibleActs().length
        : this.selectedBtn === 2
        ? this.route.items.length
        : 2; // MERCY: [解耦/饶恕, 尝试撤退]

    if (count === 0) {
      this.phase = "menu";
      return;
    }

    // Mouse click inside submenu grid (2 cols x up to 4 rows)
    if (input.clickX !== null && input.clickY !== null) {
      const box = this.getBoxRect();
      const rowStep = count > 6 ? 37 : 42;
      const startY = count > 6 ? 31 : 36;
      for (let i = 0; i < count; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ox = box.x + 56 + col * 324;
        const oy = box.y + startY + row * rowStep;
        if (input.clickX >= ox - 24 && input.clickX <= ox + 296 && input.clickY >= oy - 17 && input.clickY <= oy + 17) {
          this.subIndex = i;
          this.executeSubmenuChoice();
          return;
        }
      }
      // Clicking bottom main buttons switches category cleanly
      const btn = this.hitTestMainButtons(input.clickX, input.clickY);
      if (btn !== null) {
        this.selectedBtn = btn;
        this.confirmMainButton();
        return;
      }
    }

    if (input.leftPressed || input.rightPressed) {
      const next = this.subIndex % 2 === 0 ? this.subIndex + 1 : this.subIndex - 1;
      if (next >= 0 && next < count) {
        this.subIndex = next;
        sound.playMenuMove();
      }
    }
    if (input.upPressed) {
      this.subIndex = (this.subIndex - 2 + count * 2) % count;
      sound.playMenuMove();
    } else if (input.downPressed) {
      this.subIndex = (this.subIndex + 2) % count;
      sound.playMenuMove();
    }

    if (input.confirmPressed) {
      this.executeSubmenuChoice();
    }
  }

  private executeSubmenuChoice(): void {
    sound.playConfirm();

    // ACT
    if (this.selectedBtn === 1) {
      const acts = this.getVisibleActs();
      const chosen = acts[this.subIndex];
      if (!chosen) return;
      if (chosen.tpCost && this.tp < chosen.tpCost) {
        sound.playCancel();
        return;
      }
      const res = this.enemy.handleAct(chosen.id, this.ctx);
      if (res.nextStage !== undefined) this.actStage = res.nextStage;
      if (res.makeSpareable && !this.ruthlessMode) {
        this.spareable = true;
        sound.playSpare();
      }
      if (res.grantBarrier) {
        this.barrierActive = true;
        sound.playParry();
      }
      if (res.weakenNextWave) {
        this.weakenNextWave = true;
      }
      if (res.healPlayer) {
        const before = this.route.hp;
        this.route.hp = Math.min(this.route.maxHp, this.route.hp + res.healPlayer);
        sound.playHeal();
        const gained = this.route.hp - before;
        if (gained > 0) {
          this.floatNums.push({
            x: 560,
            y: 585,
            vy: -55,
            text: `+${gained} HP`,
            color: "#4ade80",
            life: 0,
            maxLife: 0.95
          });
        }
      }
      if (res.enemyDefDelta) this.enemyDef = Math.max(0, this.enemyDef + res.enemyDefDelta);
      if (res.tpDelta) this.tp = Math.max(0, Math.min(100, this.tp + res.tpDelta));
      if (res.setFlag) this.flags[res.setFlag] = true;
      if (res.bubble) this.bubbleText = res.bubble;
      this.showMessage(res.lines, "enemy_talk");
      return;
    }

    // ITEM
    if (this.selectedBtn === 2) {
      const itemId = this.route.items[this.subIndex];
      const item = itemId ? getItem(itemId) : undefined;
      if (!item) return;
      this.route.items.splice(this.subIndex, 1);
      const before = this.route.hp;
      this.route.hp = Math.min(this.route.maxHp, this.route.hp + item.heal);
      if (item.tpGain) this.tp = Math.min(100, this.tp + item.tpGain);
      sound.playHeal();
      this.floatNums.push({
        x: 560,
        y: 585,
        vy: -55,
        text: `+${this.route.hp - before} HP`,
        color: "#4ade80",
        life: 0,
        maxLife: 1.0
      });
      this.showMessage([item.useText], "enemy_talk");
      return;
    }

    // MERCY
    if (this.selectedBtn === 3) {
      if (this.subIndex === 0) {
        // SPARE / DECOUPLE
        if (this.spareable && !this.ruthlessMode) {
          this.outcome = "spared";
          this.route.spares++;
          this.route.outcomes[this.enemy.id] = "spared";
          sound.playSpare();
          sound.setMusic("none");
          this.spawnBurst(640, 210, "#fde047", 28, 190);
          this.showMessage(
            [
              `* 你发出了温柔的《守望协定》解耦信号！`,
              `* ${this.enemy.name} 停止了敌对。获得 0 LV，守望共鸣深化！`
            ],
            "victory"
          );
        } else {
          this.showMessage(
            ["* 你试着发出和平解耦信号……但对方的名字还没变成金色！先用【ACT 干预】触动它的内心吧！"],
            "enemy_talk"
          );
        }
      } else {
        // FLEE
        this.showMessage(
          [
            this.enemy.isBoss
              ? "* 舱门已被彻底锁死，无处可逃！唯有正面对决或解耦！"
              : "* 气闸正在充压，现在撤退太危险了——先化解眼前的威胁吧！"
          ],
          "enemy_talk"
        );
      }
    }
  }

  private getCritThreshold(): number {
    if (this.route.difficulty === "story") return 0.72;
    if (this.route.gear.includes("pulse_lens")) return 0.78;
    return 0.86;
  }

  private updateFightBar(dt: number, input: InputSnapshot): void {
    this.fightBarX += this.fightBarDir * this.fightBarSpeed * dt;
    const triggered = input.confirmPressed || (input.clickX !== null && input.clickY !== null);

    if (triggered) {
      const accuracy = Math.max(0, 1 - Math.abs(this.fightBarX));
      this.lastCrit = accuracy >= this.getCritThreshold();
      const baseDmg = Math.max(7, this.route.atk * 1.65 - this.enemyDef * 0.35);
      const dealt = Math.max(5, Math.round(baseDmg * (0.5 + accuracy * 0.95) * (this.lastCrit ? 1.32 : 1)));

      this.enemyHp = Math.max(0, this.enemyHp - dealt);
      this.tp = Math.min(100, this.tp + (this.lastCrit ? 12 : 6));
      this.hurtTimer = 0.48;
      this.hitStop = this.lastCrit ? 0.08 : 0.04;
      this.addShake(this.lastCrit ? 12 : 6, this.lastCrit ? 0.35 : 0.2);
      sound.playSlash(this.lastCrit);
      this.spawnBurst(640, 200, this.lastCrit ? "#fde047" : "#ef4444", this.lastCrit ? 22 : 12, 220);

      this.floatNums.push({
        x: 640,
        y: 160,
        vy: -85,
        text: this.lastCrit ? `${dealt}!` : `${dealt}`,
        color: this.lastCrit ? "#fde047" : "#ef4444",
        life: 0,
        maxLife: 1.1,
        scale: this.lastCrit ? 1.35 : 1.0
      });

      this.slashTimer = 0.55;
      this.phase = "fight_anim";
      return;
    }

    if (this.fightBarX > 1.05) {
      // Missed completely!
      this.floatNums.push({
        x: 640,
        y: 170,
        vy: -45,
        text: "MISS",
        color: "#94a3b8",
        life: 0,
        maxLife: 0.9
      });
      this.slashTimer = 0.45;
      this.phase = "fight_anim";
    }
  }

  private updateFightAnim(dt: number): void {
    this.slashTimer -= dt;
    if (this.slashTimer > 0) return;

    if (this.enemyHp <= 0) {
      this.outcome = "destroyed";
      this.route.kills++;
      this.route.outcomes[this.enemy.id] = "destroyed";
      this.route.xp += this.enemy.xpReward;
      const oldLv = this.route.lv;
      const newLv = 1 + Math.floor(this.route.xp / 35);
      let lvMsg = "";
      if (newLv > oldLv) {
        const diff = newLv - oldLv;
        this.route.lv = newLv;
        this.route.maxHp += diff * 4;
        this.route.hp = Math.min(this.route.maxHp, this.route.hp + diff * 4);
        this.route.atk += diff * 3;
        this.route.def += diff;
        lvMsg = ` 你的暴力等级 (LV) 升到了 ${newLv}！`;
      }
      sound.playVaporize();
      sound.setMusic("none");
      this.spawnBurst(640, 210, "#cbd5e1", 36, 175);
      this.showMessage(
        [`* ${this.enemy.name} 在电弧与灰烬中彻底崩解。获得 ${this.enemy.xpReward} EXP。${lvMsg}`],
        "victory"
      );
      return;
    }

    this.beginEnemyTalk();
  }

  private updateMessage(dt: number, input: InputSnapshot): void {
    const line = this.messageLines[this.messageIdx] ?? "";
    if (this.typedChars < line.length) {
      if (input.cancelPressed) {
        this.typedChars = line.length;
        return;
      }
      this.typeTimer += dt;
      while (this.typeTimer >= 0.022 && this.typedChars < line.length) {
        this.typeTimer -= 0.022;
        this.typedChars++;
        if (this.typedChars % 2 === 0) sound.playVoiceBlip("narrator");
      }
      return;
    }

    if (input.confirmPressed || (input.clickX !== null && input.clickY !== null)) {
      if (this.messageIdx + 1 < this.messageLines.length) {
        this.messageIdx++;
        this.typedChars = 0;
        this.typeTimer = 0;
        sound.playConfirm();
        return;
      }
      if (this.afterMessage === "victory") {
        this.phase = "victory";
      } else if (this.afterMessage === "menu") {
        this.returnToMenu();
      } else {
        this.beginEnemyTalk();
      }
    }
  }

  private beginEnemyTalk(): void {
    if (!this.bubbleText) {
      this.bubbleText = this.enemy.enemyTurnBubble(this.ctx);
    }
    this.bubbleTimer = 2.0;
    this.phase = "enemy_talk";
    sound.playVoiceBlip(this.enemy.voice);
  }

  private updateEnemyTalk(dt: number, input: InputSnapshot): void {
    this.bubbleTimer -= dt;
    if (
      this.bubbleTimer <= 0 ||
      input.confirmPressed ||
      (input.clickX !== null && input.clickY !== null)
    ) {
      this.bubbleText = "";
      this.startBulletWave();
    }
  }

  private startBulletWave(): void {
    const spec = this.enemy.selectWave(this.ctx);
    this.soulMode = spec.soulMode;
    this.targetBoxW = spec.boxW;
    this.targetBoxH = spec.boxH;
    this.waveDuration = spec.duration;
    this.waveTimer = spec.duration;
    this.patternState = createPatternState(spec.patternId);
    this.bullets = [];
    this.soulX = BOX_CENTER_X;
    this.soulY = spec.soulMode === "blue" ? BOX_CENTER_Y + spec.boxH / 2 - 16 : BOX_CENTER_Y;
    this.soulVx = 0;
    this.soulVy = 0;
    this.soulOnGround = spec.soulMode === "blue";
    this.shieldDir = "up";
    this.phase = "bullet_hell";
  }

  private updateBulletHell(dt: number, input: InputSnapshot): void {
    this.waveTimer -= dt;

    // 1. Spawn wave bullets & dynamic box modulation
    const box = this.getBoxRect();
    if (this.patternState) {
      const spawned = stepBulletPattern(
        this.patternState,
        dt,
        box,
        this.soulX,
        this.soulY,
        this.enemy.atk,
        this.spareable,
        { difficulty: this.route.difficulty, weakened: this.weakenNextWave }
      );
      if (spawned.length > 0) this.bullets.push(...spawned);
      this.boxOffX = this.patternState.boxOffsetX;
      this.boxOffY = this.patternState.boxOffsetY;
    }

    const activeBox = this.getBoxRect();

    // 2. Soul Controls per Color Mode!
    const prevSoulX = this.soulX;
    const prevSoulY = this.soulY;

    if (this.soulMode === "green") {
      // Lock center + instantaneous 4-way shield direction snap
      this.soulX = activeBox.cx;
      this.soulY = activeBox.cy;
      if (input.up) this.shieldDir = "up";
      else if (input.down) this.shieldDir = "down";
      else if (input.left) this.shieldDir = "left";
      else if (input.right) this.shieldDir = "right";
    } else if (this.soulMode === "blue") {
      // 0.45g Gravity Jump Physics!
      const moveSpd = input.slow ? 120 : 215;
      let mx = 0;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      this.soulX += mx * moveSpd * dt;

      if (input.up && this.soulOnGround) {
        this.soulVy = -410;
        this.soulOnGround = false;
      }
      // Variable jump cut for crisp platforming control
      if (!input.up && this.soulVy < -140) {
        this.soulVy *= 0.72;
      }
      this.soulVy += 980 * dt;
      this.soulY += this.soulVy * dt;

      const floorY = activeBox.y + activeBox.h - 14;
      if (this.soulY >= floorY) {
        this.soulY = floorY;
        this.soulVy = 0;
        this.soulOnGround = true;
      }
    } else {
      // RED & YELLOW Free 360° Movement
      const moveSpd = input.slow ? 115 : 225;
      let mx = 0;
      let my = 0;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (input.up) my -= 1;
      if (input.down) my += 1;
      if (mx !== 0 && my !== 0) {
        mx *= 0.7071;
        my *= 0.7071;
      }
      this.soulX += mx * moveSpd * dt;
      this.soulY += my * moveSpd * dt;

      // Continuum Weaver gentle center pull
      if (this.patternState && this.patternState.pullCenter > 0) {
        const dx = activeBox.cx - this.soulX;
        const dy = activeBox.cy - this.soulY;
        const d = Math.hypot(dx, dy);
        if (d > 8) {
          this.soulX += (dx / d) * this.patternState.pullCenter * dt;
          this.soulY += (dy / d) * this.patternState.pullCenter * dt;
        }
      }

      // YELLOW SOUL PULSE SHOOTER! (Pulse Lens accelerates cooldown!)
      if (this.soulMode === "yellow" && input.confirmPressed && this.shootCooldown <= 0) {
        this.shootCooldown = this.route.gear.includes("pulse_lens") ? 0.11 : 0.16;
        sound.playLaserShoot();
        this.bullets.push({
          id: 900000 + Math.floor(Math.random() * 99999),
          kind: "player_shot",
          x: this.soulX,
          y: this.soulY - 14,
          vx: 0,
          vy: -540,
          w: 6,
          h: 18,
          radius: 7,
          color: "#fef08a",
          accent: "#ffffff",
          damage: 0,
          age: 0,
          maxAge: 1.1
        });
      }
    }

    // Clamp Soul strictly inside Battle Box walls
    const pad = 14;
    this.soulX = Math.max(activeBox.x + pad, Math.min(activeBox.x + activeBox.w - pad, this.soulX));
    this.soulY = Math.max(activeBox.y + pad, Math.min(activeBox.y + activeBox.h - pad, this.soulY));
    const soulMoved = Math.hypot(this.soulX - prevSoulX, this.soulY - prevSoulY) > 0.6;

    // 3. Step all bullets, check player shots, shield parries, heal orbs, grazes, and hits
    const soulHitRadius = 7.5;
    const grazeRadius = 26;
    const droppedOrbs: Bullet[] = [];

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      if (b.age >= b.maxAge) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Yellow reversing spear (Undyne magic!): fair 118px reaction beat before flipping!
      if (b.kind === "spear" && b.isReverse && !b.reversed) {
        const dist = Math.hypot(b.x - activeBox.cx, b.y - activeBox.cy);
        if (dist <= 118) {
          b.reversed = true;
          const opp: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
          b.fromDir = opp[b.fromDir ?? "up"];
          const dx = b.x - activeBox.cx;
          const dy = b.y - activeBox.cy;
          b.x = activeBox.cx - dx * 1.12;
          b.y = activeBox.cy - dy * 1.12;
          b.vx = -b.vx;
          b.vy = -b.vy;
          b.angle = (b.angle ?? 0) + Math.PI;
          this.spawnBurst(b.x, b.y, "#facc15", 5, 80);
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Player Yellow-Soul shots hit destructible purple/gold nodes & drop +2 HP Heal Orbs!
      if (b.kind === "player_shot") {
        let consumed = false;
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const target = this.bullets[j];
          if (!target.destructible) continue;
          if (Math.hypot(b.x - target.x, b.y - target.y) <= target.radius + b.radius + 5) {
            this.spawnBurst(target.x, target.y, "#fde047", 12, 170);
            sound.playParry();
            this.tp = Math.min(100, this.tp + 6);
            droppedOrbs.push({
              id: 800000 + Math.floor(Math.random() * 99999),
              kind: "heal_orb",
              x: target.x,
              y: target.y,
              vx: 0,
              vy: 56,
              w: 16,
              h: 16,
              radius: 8,
              color: "#4ade80",
              accent: "#ffffff",
              damage: 0,
              age: 0,
              maxAge: 4.5
            });
            this.bullets.splice(j, 1);
            if (j < i) i--;
            consumed = true;
            break;
          }
        }
        if (consumed) this.bullets.splice(i, 1);
        continue;
      }

      // Collectible Green Heal Orbs dropped from destroyed Yellow-Soul nodes!
      if (b.kind === "heal_orb") {
        if (Math.hypot(b.x - this.soulX, b.y - this.soulY) <= b.radius + soulHitRadius + 8) {
          const before = this.route.hp;
          this.route.hp = Math.min(this.route.maxHp, this.route.hp + 2);
          const healed = this.route.hp - before;
          sound.playHeal();
          this.spawnBurst(b.x, b.y, "#4ade80", 8, 130);
          this.floatNums.push({
            x: this.soulX,
            y: this.soulY - 16,
            vy: -52,
            text: healed > 0 ? `+${healed}` : "+TP",
            color: "#4ade80",
            life: 0,
            maxLife: 0.75
          });
          if (healed === 0) this.tp = Math.min(100, this.tp + 4);
          this.bullets.splice(i, 1);
        }
        continue;
      }

      // Skip telegraphed warning beams until active
      if (b.kind === "beam" && b.telegraph !== undefined && b.age < b.telegraph) {
        continue;
      }

      // GREEN SOUL SHIELD PARRY!
      if (this.soulMode === "green" && b.kind === "spear" && b.fromDir) {
        const dist = Math.hypot(b.x - this.soulX, b.y - this.soulY);
        if (dist <= 38 && dist >= 16 && b.fromDir === this.shieldDir) {
          sound.playParry();
          this.parryFlash = 0.16;
          this.tp = Math.min(100, this.tp + 5);
          this.route.totalGraze++;
          this.spawnBurst(b.x, b.y, "#7dd3fc", 8, 150);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Hit & Graze geometry check
      const hit = this.bulletIntersectsSoul(b, this.soulX, this.soulY, soulHitRadius);
      if (hit) {
        // Check Undertale Blue/Orange motion rules
        const ignoredByMotion =
          (b.motionRule === "blue" && !soulMoved) || (b.motionRule === "orange" && soulMoved);
        if (!ignoredByMotion && this.iFrames <= 0) {
          this.damagePlayer(b.damage);
          if (b.kind !== "beam" && b.kind !== "bone") {
            this.bullets.splice(i, 1);
          }
          if (this.route.hp <= 0) return;
        }
        continue;
      }

      // Graze check (Deltarune TP Spark!)
      if (!b.grazed && b.kind !== "beam") {
        const grazed = this.bulletIntersectsSoul(b, this.soulX, this.soulY, grazeRadius);
        if (grazed) {
          b.grazed = true;
          this.grazeFlash = 0.18;
          this.tp = Math.min(100, this.tp + 3);
          this.route.totalGraze++;
          sound.playGraze();
        }
      }
    }

    if (droppedOrbs.length > 0) {
      this.bullets.push(...droppedOrbs);
    }

    if (this.waveTimer <= 0) {
      this.turn++;
      this.bullets = [];
      this.returnToMenu();
    }
  }

  private bulletIntersectsSoul(b: Bullet, sx: number, sy: number, r: number): boolean {
    if (b.kind === "beam" || b.kind === "bone") {
      const halfW = b.w / 2;
      const halfH = b.h / 2;
      const cx = Math.max(b.x - halfW, Math.min(sx, b.x + halfW));
      const cy = Math.max(b.y - halfH, Math.min(sy, b.y + halfH));
      return Math.hypot(sx - cx, sy - cy) <= r;
    }
    return Math.hypot(b.x - sx, b.y - sy) <= b.radius + r;
  }

  private damagePlayer(rawDmg: number): void {
    // 25% TP Energy Barrier absorbs 1 full hit cleanly with 0 HP lost!
    if (this.barrierActive) {
      this.barrierActive = false;
      this.iFrames = 0.78;
      this.hitStop = 0.05;
      this.addShake(5, 0.16);
      sound.playParry();
      this.spawnBurst(this.soulX, this.soulY, "#38bdf8", 14, 175);
      this.floatNums.push({
        x: this.soulX,
        y: this.soulY - 18,
        vy: -58,
        text: "SHIELD!",
        color: "#38bdf8",
        life: 0,
        maxLife: 0.85
      });
      return;
    }

    const diffMul =
      this.route.difficulty === "story" ? 0.65 : this.route.difficulty === "hardcore" ? 1.25 : 1.0;
    const reduced = Math.max(1, Math.round((rawDmg - this.route.def * 0.42) * diffMul));
    this.route.hp = Math.max(0, this.route.hp - reduced);
    const baseIFrames =
      this.route.difficulty === "story" ? 1.25 : this.route.difficulty === "hardcore" ? 0.72 : 0.95;
    this.iFrames = baseIFrames + (this.route.gear.includes("fifth_charm") ? 0.25 : 0);
    this.hitStop = 0.05;
    this.addShake(9, 0.26);
    sound.playHit();
    this.spawnBurst(this.soulX, this.soulY, "#ef4444", 10, 140);
    this.floatNums.push({
      x: this.soulX,
      y: this.soulY - 16,
      vy: -55,
      text: `-${reduced}`,
      color: "#ef4444",
      life: 0,
      maxLife: 0.75
    });

    if (this.route.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.phase = "game_over";
    this.gameOverTimer = 0;
    this.bullets = [];
    this.shards = [];
    sound.setMusic("none");
    sound.playSoulCrack();
  }

  private returnToMenu(): void {
    this.phase = "menu";
    this.soulMode = "red";
    this.weakenNextWave = false;
    this.boxOffX = 0;
    this.boxOffY = 0;
    this.targetBoxW = MENU_BOX_W;
    this.targetBoxH = MENU_BOX_H;
    const text = this.spareable
      ? this.enemy.spareableFlavorText
      : this.enemy.flavorTexts[this.turn % this.enemy.flavorTexts.length];
    this.messageLines = [text];
    this.typedChars = 0;
    this.typeTimer = 0;
  }

  private updateVictory(dt: number, input: InputSnapshot): void {
    if (this.outcome === "spared") {
      this.sparedProgress = Math.min(1, this.sparedProgress + dt * 1.4);
    } else {
      this.destroyedProgress = Math.min(1, this.destroyedProgress + dt * 1.2);
    }
    if ((this.sparedProgress >= 0.85 || this.destroyedProgress >= 0.85) && (input.confirmPressed || this.sparedProgress >= 1 || this.destroyedProgress >= 1)) {
      this.done = true;
    }
  }

  private updateGameOver(dt: number, input: InputSnapshot): void {
    const prev = this.gameOverTimer;
    this.gameOverTimer += dt;

    // At 0.65s shatter heart into 6 tumbling shards!
    if (prev < 0.65 && this.gameOverTimer >= 0.65) {
      sound.playSoulShatter();
      const col = soulPalette(this.soulMode).fill;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        this.shards.push({
          x: this.soulX,
          y: this.soulY,
          vx: Math.cos(a) * (110 + Math.random() * 80),
          vy: Math.sin(a) * 110 - 120,
          color: col
        });
      }
    }

    for (const sh of this.shards) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.vy += 380 * dt;
    }

    if (this.gameOverTimer > 1.4 && (input.confirmPressed || (input.clickX !== null && input.clickY !== null))) {
      this.retryRequested = true;
    }
  }

  // ===========================================================================
  // RENDERING (Crisp Undertale / Deltarune Stage!)
  // ===========================================================================

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Screen shake transform
    if (this.shakeTimer > 0) {
      const sx = Math.round((Math.random() - 0.5) * 2 * this.shakeMag);
      const sy = Math.round((Math.random() - 0.5) * 2 * this.shakeMag);
      ctx.translate(sx, sy);
    }

    // Pure obsidian battle void with crisp retro gridlines behind Boss (classic Undertale green/cyan battle backdrop!)
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, 1280, 720);

    if (this.phase === "game_over") {
      this.renderGameOver(ctx);
      ctx.restore();
      return;
    }

    // Subtle crisp architectural stage grid in upper battle arena
    const gridCol = this.ruthlessMode
      ? "rgba(239, 68, 68, 0.16)"
      : this.spareable
      ? "rgba(250, 204, 21, 0.16)"
      : "rgba(56, 189, 248, 0.14)";
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1.5;
    for (let gx = 160; gx <= 1120; gx += 64) {
      ctx.beginPath();
      ctx.moveTo(gx, 42);
      ctx.lineTo(gx, 304);
      ctx.stroke();
    }
    for (let gy = 42; gy <= 304; gy += 44) {
      ctx.beginPath();
      ctx.moveTo(160, gy);
      ctx.lineTo(1120, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = this.ruthlessMode ? "rgba(239, 68, 68, 0.35)" : "rgba(56, 189, 248, 0.3)";
    ctx.strokeRect(160, 42, 960, 262);

    // Enemy Nameplate & Crisp HP Bar at top
    this.renderBossHeader(ctx);

    // Animated Multi-Part Boss Rig!
    drawBattleBoss(ctx, 640, 186, {
      enemyId: this.enemy.id,
      t: this.t,
      hurtTimer: this.hurtTimer,
      spareable: this.spareable,
      ruthlessMode: this.ruthlessMode,
      sparedProgress: this.sparedProgress,
      destroyedProgress: this.destroyedProgress,
      talking: this.phase === "enemy_talk",
      soulX: this.soulX,
      soulY: this.soulY
    });

    // Slash Arc VFX during fight_anim
    if (this.phase === "fight_anim" && this.slashTimer > 0.15) {
      const p = 1 - (this.slashTimer - 0.15) / 0.4;
      ctx.save();
      ctx.strokeStyle = this.lastCrit ? "#fde047" : "#ffffff";
      ctx.lineWidth = this.lastCrit ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(560, 108);
      ctx.lineTo(560 + p * 165, 108 + p * 170);
      ctx.stroke();
      ctx.restore();
    }

    // Enemy Speech Bubble positioned clear of boss wings!
    if (this.phase === "enemy_talk" && this.bubbleText) {
      drawSpeechBubble(ctx, 824, 96, 286, 128, this.bubbleText, this.ruthlessMode ? "#7f1d1d" : "#0f172a");
    }

    // Deltarune-style Vertical TP / Resonance Gauge on left flank!
    this.renderTpBar(ctx);

    // Central White-Bordered Battle Box!
    const box = this.getBoxRect();
    const borderCol =
      this.phase === "bullet_hell"
        ? soulPalette(this.soulMode).hi
        : this.ruthlessMode
        ? "#fca5a5"
        : "#ffffff";
    drawUndertaleBox(ctx, box.x, box.y, box.w, box.h, borderCol, "#04050a", 4);

    // Box Contents per Phase
    if (this.phase === "menu" || this.phase === "message") {
      this.renderBoxText(ctx, box);
    } else if (this.phase === "submenu") {
      this.renderSubmenu(ctx, box);
    } else if (this.phase === "fight_bar") {
      this.renderFightBar(ctx, box);
    } else if (this.phase === "bullet_hell") {
      this.renderBulletHell(ctx, box);
    }

    // Particles & Floating Damage Numbers
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of this.floatNums) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.font = `bold ${Math.round(32 * (f.scale ?? 1))}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
      ctx.restore();
    }

    // Bottom Player Stats Row & Iconic 4 Undertale Action Buttons
    this.renderBottomHud(ctx);

    ctx.restore();
  }

  private renderBossHeader(ctx: CanvasRenderingContext2D): void {
    const maxHp = this.ruthlessMode ? this.enemy.maxHp + 60 : this.enemy.maxHp;
    const ratio = Math.max(0, this.enemyHp / maxHp);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 20px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', monospace";
    ctx.fillStyle = this.spareable ? "#fde047" : this.ruthlessMode ? "#ef4444" : "#f8fafc";
    const title = this.spareable ? `★ ${this.enemy.name} [可解耦]` : this.enemy.name;
    ctx.fillText(title, 640, 28);

    // Compact enemy HP bar under header
    const bw = 240;
    const bx = 640 - bw / 2;
    const by = 52;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = this.spareable ? "#fde047" : "#22c55e";
    ctx.fillRect(bx, by, Math.round(bw * ratio), 10);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, 10);
    ctx.restore();
  }

  private renderTpBar(ctx: CanvasRenderingContext2D): void {
    const x = 186;
    const y = 348;
    const w = 26;
    const h = 196;
    const fillH = Math.round((this.tp / 100) * (h - 6));

    ctx.save();
    ctx.fillStyle = "#090a14";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = this.tp >= 50 ? "#fde047" : this.tp >= 25 ? "#38bdf8" : "#64748b";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = this.tp >= 50 ? "#f59e0b" : "#38bdf8";
    ctx.fillRect(x + 3, y + h - 3 - fillH, w - 6, fillH);

    // Subtle 25% (Barrier) & 50% (Resonance) tactical threshold notches
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillRect(x + 2, Math.round(y + h - 3 - (h - 6) * 0.25), w - 4, 2);
    ctx.fillRect(x + 2, Math.round(y + h - 3 - (h - 6) * 0.5), w - 4, 2);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("TP", x + w / 2, y - 12);
    ctx.fillStyle = this.tp >= 50 ? "#fde047" : this.tp >= 25 ? "#7dd3fc" : "#94a3b8";
    ctx.fillText(`${Math.round(this.tp)}%`, x + w / 2, y + h + 18);
    ctx.restore();
  }

  private renderBoxText(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }): void {
    const raw = this.messageLines[this.messageIdx] ?? "";
    const visible = raw.slice(0, this.typedChars);
    ctx.save();
    ctx.font = "21px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace";
    ctx.fillStyle = this.spareable && this.phase === "menu" ? "#fde047" : "#f8fafc";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, visible, box.w - 56);
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, box.x + 28, box.y + 26 + idx * 34);
    });
    if (this.phase === "message" && this.typedChars >= raw.length) {
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 15px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText("▼ [Z / 点击继续]", box.x + box.w - 22, box.y + box.h - 28);
    }
    ctx.restore();
  }

  private renderSubmenu(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }): void {
    ctx.save();
    const entries: Array<{ label: string; gold?: boolean; disabled?: boolean }> = [];
    if (this.selectedBtn === 1) {
      for (const a of this.getVisibleActs()) {
        entries.push({
          label: a.label,
          gold: a.hintGold,
          disabled: a.tpCost !== undefined && this.tp < a.tpCost
        });
      }
    } else if (this.selectedBtn === 2) {
      for (const id of this.route.items) {
        const it = getItem(id);
        entries.push({ label: it ? `${it.shortName} (+${it.heal}HP)` : id });
      }
    } else if (this.selectedBtn === 3) {
      entries.push({
        label: this.spareable ? "★ 解耦 / 饶恕 (SPARE!)" : "解耦 / 饶恕",
        gold: this.spareable
      });
      entries.push({ label: "尝试撤退" });
    }

    const fontPx = entries.length > 6 ? 17 : entries.length > 4 ? 18 : 20;
    const rowStep = entries.length > 6 ? 37 : 42;
    const startY = entries.length > 6 ? 31 : 36;
    ctx.font = `bold ${fontPx}px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    entries.forEach((e, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ox = box.x + 56 + col * 324;
      const oy = box.y + startY + row * rowStep;
      const sel = idx === this.subIndex;
      if (sel) {
        drawPixelHeart(ctx, ox - 22, oy, "red", 1.2);
      }
      ctx.fillStyle = e.disabled ? "#475569" : e.gold ? "#fde047" : sel ? "#ffffff" : "#cbd5e1";
      ctx.fillText(`* ${e.label}`, ox, oy);
    });

    ctx.fillStyle = "#64748b";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("[方向键选择 · Z确认 · X返回]", box.x + box.w - 20, box.y + box.h - 18);
    ctx.restore();
  }

  private renderFightBar(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number; cx: number; cy: number }): void {
    ctx.save();
    // Classic Undertale glowing target eye reticle
    const rx = box.w * 0.42;
    const ry = box.h * 0.34;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(box.cx, box.cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sweet-spot critical gold core (dynamically widens with Pulse Lens / Story mode!)
    const halfGold = Math.max(24, Math.round((1 - this.getCritThreshold()) * (box.w * 0.46)));
    ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
    ctx.fillRect(box.cx - halfGold, box.y + 20, halfGold * 2, box.h - 40);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.cx - halfGold, box.y + 20, halfGold * 2, box.h - 40);

    // Sweeping vertical strike bar
    const barPx = box.cx + this.fightBarX * (box.w * 0.46);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(barPx - 5), box.y + 14, 10, box.h - 28);
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(barPx - 5), box.y + 14, 10, box.h - 28);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("对准金色中心按 [Z / 空格 / 点击] 暴击！", box.cx, box.y + box.h - 14);
    ctx.restore();
  }

  private renderBulletHell(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; w: number; h: number; cx: number; cy: number }
  ): void {
    ctx.save();

    // Soul Mode Hint Badge right above Battle Box
    const modeHints: Record<SoulMode, { text: string; color: string }> = {
      red: { text: "♥ 自由核 · WASD/方向键闪避 (Shift微调)", color: "#fca5a5" },
      blue: { text: "♥ 0.45g 重力核 · W/↑跳跃躲避低空光束", color: "#93c5fd" },
      green: { text: "♥ 电磁护盾核 · 方向键切换四向盾牌格挡！(黄矛会翻转)", color: "#6ee7b7" },
      yellow: { text: "♥ 脉冲射击核 · 移动并按 Z/空格 击碎节点掉落绿球回血！", color: "#fde047" }
    };
    const hint = modeHints[this.soulMode];
    ctx.fillStyle = hint.color;
    ctx.font = "bold 14px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.textAlign = "center";
    const statusSuffix = this.weakenNextWave ? "  [✦共鸣减速]" : "";
    ctx.fillText(`${hint.text}${statusSuffix}`, box.cx, box.y - 12);

    // Clip non-spear projectiles cleanly inside box
    ctx.save();
    if (this.soulMode !== "green") {
      ctx.beginPath();
      ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
      ctx.clip();
    }

    // Draw Bullets
    for (const b of this.bullets) {
      if (b.kind === "beam") {
        const isTele = b.telegraph !== undefined && b.age < b.telegraph;
        if (isTele) {
          ctx.save();
          ctx.strokeStyle = "rgba(254, 240, 138, 0.85)";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          ctx.restore();
        } else {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          ctx.fillStyle = b.accent ?? "#ffffff";
          ctx.fillRect(b.x - b.w / 2 + 3, b.y - b.h / 2 + 4, Math.max(4, b.w - 6), Math.max(4, b.h - 8));
        }
      } else if (b.kind === "bone") {
        ctx.fillStyle = b.color;
        ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        ctx.fillStyle = b.accent ?? "#ffffff";
        ctx.fillRect(Math.round(b.x - b.w / 2 - 3), Math.round(b.y - b.h / 2), b.w + 6, 5);
        ctx.fillRect(Math.round(b.x - b.w / 2 - 3), Math.round(b.y + b.h / 2 - 5), b.w + 6, 5);
      } else if (b.kind === "spear") {
        ctx.save();
        ctx.translate(Math.round(b.x), Math.round(b.y));
        ctx.rotate(b.angle ?? 0);
        ctx.fillStyle = b.color;
        ctx.fillRect(-14, -3, 22, 6);
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(4, -7);
        ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = b.accent ?? "#ffffff";
        ctx.fillRect(-10, -1, 14, 2);
        ctx.restore();
      } else if (b.kind === "node") {
        // Destructible diamond target node
        ctx.save();
        ctx.translate(Math.round(b.x), Math.round(b.y));
        ctx.rotate(this.t * 3);
        ctx.fillStyle = b.color;
        ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = b.accent ?? "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-11, -11, 22, 22);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      } else if (b.kind === "heal_orb") {
        // Glowing emerald +2 HP recovery orb dropped from destroyed Yellow-Soul nodes!
        const pulseR = b.radius + Math.sin(this.t * 10 + b.id) * 1.2;
        ctx.fillStyle = "rgba(74, 222, 128, 0.28)";
        ctx.beginPath();
        ctx.arc(Math.round(b.x), Math.round(b.y), pulseR + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(Math.round(b.x), Math.round(b.y), pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(b.x - 4), Math.round(b.y - 1.5), 8, 3);
        ctx.fillRect(Math.round(b.x - 1.5), Math.round(b.y - 4), 3, 8);
      } else if (b.kind === "player_shot") {
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(Math.round(b.x - 3), Math.round(b.y - 9), 6, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 7), 2, 14);
      } else {
        // Crisp glowing pixel orb / shard / heart tear
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(Math.round(b.x), Math.round(b.y), b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.accent ?? "#ffffff";
        ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 4, 4);
      }
    }

    ctx.restore();

    // 25% TP Energy Barrier glowing cyan aura around Soul!
    if (this.barrierActive) {
      const br = 20 + Math.sin(this.t * 8) * 1.5;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(Math.round(this.soulX), Math.round(this.soulY), br, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Math.round(this.soulX), Math.round(this.soulY), br + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Graze Ring Spark around Soul!
    if (this.grazeFlash > 0) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(this.grazeFlash / 0.18).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(Math.round(this.soulX), Math.round(this.soulY), 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Green-Soul Directional Shield
    if (this.soulMode === "green") {
      drawGreenShield(ctx, this.soulX, this.soulY, this.shieldDir, 30, this.parryFlash);
    }

    // Player Soul Heart (blinks during i-frames)
    const blinkHide = this.iFrames > 0 && Math.floor(this.iFrames * 18) % 2 === 0;
    if (!blinkHide) {
      drawPixelHeart(ctx, this.soulX, this.soulY, this.soulMode, 1.5, {
        glow: true,
        upsideDown: this.soulMode === "yellow"
      });
    }

    // Subtle remaining wave timer strip along bottom inside edge
    const pct = Math.max(0, this.waveTimer / Math.max(0.1, this.waveDuration));
    ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
    ctx.fillRect(box.x + 6, box.y + box.h - 7, Math.round((box.w - 12) * pct), 3);

    ctx.restore();
  }

  private renderBottomHud(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Player Status Row (`小徐 (远望号)   LV 1   HP [====] 20 / 20  [✦护盾就绪]`)
    const sy = 588;
    ctx.font = "bold 20px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(`小徐 (远望号)`, 240, sy);
    ctx.fillStyle = this.route.kills > 0 ? "#fca5a5" : "#93c5fd";
    ctx.fillText(`LV ${this.route.lv}`, 425, sy);

    ctx.fillStyle = "#f8fafc";
    ctx.fillText("HP", 525, sy);
    const barW = Math.min(200, this.route.maxHp * 7);
    const ratio = Math.max(0, this.route.hp / this.route.maxHp);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(565, sy - 11, barW, 22);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(565, sy - 11, Math.round(barW * ratio), 22);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(565, sy - 11, barW, 22);

    ctx.fillStyle = "#f8fafc";
    const hpText = `${this.route.hp} / ${this.route.maxHp}`;
    ctx.fillText(hpText, 580 + barW, sy);

    if (this.barrierActive) {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.fillText("[✦护盾就绪]", 686 + barW, sy);
    }

    // 4 Iconic Undertale Action Buttons
    const labels = ["⚔ FIGHT 强攻", "◈ ACT 干预", "✦ ITEM 补给", "✧ MERCY 解耦"];
    const startX = 240;
    const gap = 205;
    const by = 626;
    const bw = 185;
    const bh = 58;

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * gap;
      const active = (this.phase === "menu" || this.phase === "submenu") && this.selectedBtn === i;
      const isMercyGold = i === 3 && this.spareable && !this.mercySlashed;
      const isBroken = i === 3 && this.mercySlashed;

      ctx.fillStyle = active ? "rgba(251, 191, 36, 0.14)" : "#04050a";
      ctx.fillRect(bx, by, bw, bh);

      ctx.strokeStyle = isBroken
        ? "#450a0a"
        : active || isMercyGold
        ? "#fde047"
        : "#f97316";
      ctx.lineWidth = active ? 4 : 3;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = isBroken
        ? "#7f1d1d"
        : active || isMercyGold
        ? "#fde047"
        : "#fb923c";
      ctx.fillText(labels[i], bx + bw / 2 + (active ? 8 : 0), by + bh / 2);

      if (active) {
        drawPixelHeart(ctx, bx + 20, by + bh / 2, "red", 1.15);
      }

      // Crimson scar slash across MERCY button in Ruthless Climax!
      if (isBroken) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by + bh + 4);
        ctx.lineTo(bx + bw + 6, by - 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.gameOverTimer < 0.65) {
      drawPixelHeart(ctx, this.soulX, this.soulY, this.soulMode, 2.0, { cracked: true });
    } else {
      for (const sh of this.shards) {
        ctx.fillStyle = sh.color;
        ctx.fillRect(Math.round(sh.x - 4), Math.round(sh.y - 4), 8, 8);
      }
    }

    if (this.gameOverTimer > 1.0) {
      const alpha = Math.min(1, (this.gameOverTimer - 1.0) * 1.5);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 54px 'JetBrains Mono', monospace";
      ctx.fillText("SIGNAL LOST", 640, 220);

      ctx.fillStyle = "#7dd3fc";
      ctx.font = "22px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.fillText("「小徐！守住你的个体连续性——远望号还在等你回来！」", 640, 340);

      ctx.fillStyle = "#fde047";
      ctx.font = "bold 20px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.fillText("▶ 按 [Z / Enter / 点击] 重新同步至本场战斗", 640, 440);
    }
    ctx.restore();
  }
}
