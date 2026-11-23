import { drawBattleBoss } from "./art/bossArt";
import { drawPixelHeart, drawSaveStar, drawUndertaleBox, wrapText } from "./art/pixelCanvas";
import { drawPortrait } from "./art/portraits";
import { sound } from "./audio/soundEngine";
import { BattleEngine } from "./battle/battleEngine";
import { TILE_PX } from "./data/rooms";
import { OverworldEngine } from "./overworld/overworldEngine";
import type {
  DifficultyMode,
  EnemyId,
  EndingKind,
  GameScreen,
  InputSnapshot,
  PortraitId,
  RouteState
} from "./types";

interface IntroSlide {
  year: string;
  title: string;
  body: string;
  accent: string;
  portrait: PortraitId;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    year: "EARTH CALENDAR 2439 → 2488",
    title: "九艘殖民舰 · 守望协定",
    body: "太阳系联邦解体前夕发射了九艘深空殖民舰。远望号凭借无义体船员与弥涅瓦-V 监督系统度过 2488 年大危机，与和平号、阿育王号共同创立【自由航行共同体】。",
    accent: "#38bdf8",
    portrait: "minerva_v"
  },
  {
    year: "EARTH CALENDAR 2488 · LOST SISTER SHIP",
    title: "被屠杀的姐妹舰 · 卡戎号",
    body: "九舰之一的「卡戎号」在主动投降后，仍遭复兴派激进分支指挥官雷克斯下令击毁并篡改战报。和平号冒死拍下了光学目击底片。",
    accent: "#ef4444",
    portrait: "charon"
  },
  {
    year: "EARTH CALENDAR 2491 · WATCH ACCORD YEAR 3",
    title: "死而复生的呼救信号",
    body: "三年后的今天，远望号截获了一段疑似来自卡戎号残骸的微弱摩斯电码。你——二班技术船员小徐——驾驶「拓荒者一号」孤身对接上了这艘漂浮在零下两百七十度深空里的幽灵残骸。",
    accent: "#fde047",
    portrait: "vaughn"
  }
];

const DIFFICULTY_ORDER: DifficultyMode[] = ["story", "normal", "hardcore"];

export function difficultyDisplayName(d: DifficultyMode): string {
  if (d === "story") return "叙事护航 (STORY)";
  if (d === "hardcore") return "深空极限 (HARDCORE)";
  return "标准巡航 (NORMAL)";
}

export function createInitialRoute(difficulty: DifficultyMode = "normal"): RouteState {
  return {
    lv: 1,
    xp: 0,
    hp: 20,
    maxHp: 20,
    atk: 10,
    def: 4,
    difficulty,
    kills: 0,
    spares: 0,
    totalGraze: 0,
    outcomes: {},
    items: ["protein_bar", "malt_tea"],
    gear: [],
    flags: {},
    currentRoomId: "airlock",
    saveRoomId: "airlock",
    saveX: TILE_PX * 3.8,
    saveY: TILE_PX * 6.5
  };
}

export function determineEnding(route: RouteState): EndingKind {
  if (route.kills === 0 && route.outcomes.charon === "spared") return "pacifist";
  if (route.kills >= 4 || (route.outcomes.charon === "destroyed" && route.spares === 0)) return "ruthless";
  return "neutral";
}

export class GameController {
  screen: GameScreen = "title";
  selectedDifficulty: DifficultyMode = "normal";
  route: RouteState = createInitialRoute("normal");
  overworld: OverworldEngine;
  battle: BattleEngine | null = null;

  t = 0;
  introIdx = 0;
  introTyped = 0;
  introTimer = 0;

  // Undertale-style soul-flash transition into battle
  transitionTimer = 0;
  pendingEnemyId: EnemyId | null = null;
  battleRetryHpSnapshot = 20;

  // Ending state
  endingKind: EndingKind = "pacifist";
  endingTimer = 0;

  constructor() {
    this.overworld = this.makeOverworld(this.route);
    sound.setMusic("title");
  }

  private makeOverworld(route: RouteState): OverworldEngine {
    return new OverworldEngine(route, {
      onStartBattle: (enemyId) => this.beginBattleTransition(enemyId),
      onReachEnding: () => this.enterEnding()
    });
  }

  restartGame(): void {
    this.route = createInitialRoute(this.selectedDifficulty);
    this.overworld = this.makeOverworld(this.route);
    this.battle = null;
    this.pendingEnemyId = null;
    this.introIdx = 0;
    this.introTyped = 0;
    this.screen = "title";
    sound.setMusic("title");
  }

  startNewRunFromTitle(): void {
    sound.unlock();
    sound.playConfirm();
    this.route = createInitialRoute(this.selectedDifficulty);
    this.overworld = this.makeOverworld(this.route);
    this.battle = null;
    this.introIdx = 0;
    this.introTyped = 0;
    this.introTimer = 0;
    this.screen = "intro";
    sound.setMusic("title");
  }

  skipIntroToOverworld(): void {
    this.screen = "overworld";
    sound.setMusic("wreck_ambient");
  }

  beginBattleTransition(enemyId: EnemyId): void {
    this.pendingEnemyId = enemyId;
    this.transitionTimer = 0.62;
    this.battleRetryHpSnapshot = Math.max(10, this.route.hp);
    this.screen = "battle_transition";
    sound.playEncounterFlash();
  }

  /** Jump straight into any encounter (useful for testing & boss rush debugging). */
  startBattleImmediate(enemyId: EnemyId): void {
    this.battleRetryHpSnapshot = Math.max(10, this.route.hp);
    this.battle = new BattleEngine(enemyId, this.route);
    this.screen = "battle";
  }

  enterEnding(): void {
    this.endingKind = determineEnding(this.route);
    this.endingTimer = 0;
    this.screen = "ending";
    sound.setMusic(this.endingKind === "ruthless" ? "none" : "ending");
  }

  private cycleTitleDifficulty(dir: 1 | -1): void {
    const idx = DIFFICULTY_ORDER.indexOf(this.selectedDifficulty);
    this.selectedDifficulty = DIFFICULTY_ORDER[(idx + dir + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length];
    this.route.difficulty = this.selectedDifficulty;
    sound.playMenuMove();
  }

  update(dt: number, input: InputSnapshot): void {
    const safeDt = Math.min(0.05, Math.max(0, dt));
    this.t += safeDt;
    sound.update(safeDt);

    if (this.screen === "title") {
      if (input.leftPressed) {
        this.cycleTitleDifficulty(-1);
        return;
      }
      if (input.rightPressed) {
        this.cycleTitleDifficulty(1);
        return;
      }
      if (input.clickX !== null && input.clickY !== null) {
        // Click on Difficulty Selector Pill cycles mode without launching
        if (input.clickX >= 400 && input.clickX <= 880 && input.clickY >= 604 && input.clickY <= 650) {
          this.cycleTitleDifficulty(input.clickX < 640 ? -1 : 1);
          return;
        }
        this.startNewRunFromTitle();
        return;
      }
      if (input.confirmPressed) {
        this.startNewRunFromTitle();
      }
      return;
    }

    if (this.screen === "intro") {
      if (input.cancelPressed) {
        sound.playConfirm();
        this.skipIntroToOverworld();
        return;
      }
      const slide = INTRO_SLIDES[this.introIdx];
      if (this.introTyped < slide.body.length) {
        this.introTimer += safeDt;
        while (this.introTimer >= 0.022 && this.introTyped < slide.body.length) {
          this.introTimer -= 0.022;
          this.introTyped++;
          if (this.introTyped % 3 === 0) sound.playVoiceBlip("narrator");
        }
      }
      if (input.confirmPressed || (input.clickX !== null && input.clickY !== null)) {
        if (this.introTyped < slide.body.length) {
          this.introTyped = slide.body.length;
        } else if (this.introIdx + 1 < INTRO_SLIDES.length) {
          this.introIdx++;
          this.introTyped = 0;
          this.introTimer = 0;
          sound.playConfirm();
        } else {
          sound.playConfirm();
          this.skipIntroToOverworld();
        }
      }
      return;
    }

    if (this.screen === "battle_transition") {
      this.transitionTimer -= safeDt;
      if (this.transitionTimer <= 0 && this.pendingEnemyId) {
        const eid = this.pendingEnemyId;
        this.pendingEnemyId = null;
        this.battle = new BattleEngine(eid, this.route);
        this.screen = "battle";
      }
      return;
    }

    if (this.screen === "battle" && this.battle) {
      this.battle.update(safeDt, input);
      if (this.battle.retryRequested) {
        const eid = this.battle.enemy.id;
        this.route.hp = this.route.maxHp;
        this.battle = new BattleEngine(eid, this.route);
        return;
      }
      if (this.battle.done && this.battle.outcome) {
        const eid = this.battle.enemy.id;
        const outcome = this.battle.outcome;
        this.battle = null;
        this.screen = "overworld";
        this.overworld.handleBattleComplete(eid, outcome);
      }
      return;
    }

    if (this.screen === "overworld") {
      this.overworld.update(safeDt, input);
      return;
    }

    if (this.screen === "ending") {
      this.endingTimer += safeDt;
      if (this.endingTimer > 1.2 && (input.confirmPressed || (input.clickX !== null && input.clickY !== null))) {
        this.restartGame();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.screen === "title") {
      this.renderTitle(ctx);
      return;
    }
    if (this.screen === "intro") {
      this.renderIntro(ctx);
      return;
    }
    if (this.screen === "battle_transition") {
      this.renderBattleTransition(ctx);
      return;
    }
    if (this.screen === "battle" && this.battle) {
      this.battle.render(ctx);
      return;
    }
    if (this.screen === "overworld") {
      this.overworld.render(ctx);
      return;
    }
    if (this.screen === "ending") {
      this.renderEnding(ctx);
    }
  }

  private hash01(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  private renderTitle(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, 1280, 720);

    // Rich deep-space radial nebula behind Title centerpiece
    const neb = ctx.createRadialGradient(640, 220, 40, 640, 280, 560);
    neb.addColorStop(0, "rgba(56, 189, 248, 0.14)");
    neb.addColorStop(0.5, "rgba(99, 102, 241, 0.08)");
    neb.addColorStop(1, "rgba(4, 5, 10, 0)");
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1280, 720);

    // Organic drifting pixel starfield (zero diagonal line artifacts!)
    for (let i = 0; i < 120; i++) {
      const baseX = this.hash01(i * 4.3 + 1) * 1280;
      const sx = ((baseX + this.t * (4 + (i % 4) * 4)) % 1280 + 1280) % 1280;
      const sy = this.hash01(i * 9.7 + 13) * 720;
      ctx.fillStyle = i % 7 === 0 ? "#fde047" : i % 4 === 0 ? "#7dd3fc" : "#e2e8f0";
      ctx.globalAlpha = 0.32 + Math.max(0, Math.sin(this.t * 2.4 + i * 1.9)) * 0.65;
      const sz = i % 11 === 0 ? 4 : i % 4 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
    }
    ctx.globalAlpha = 1;

    // Monumental Sculpted Charon-Ω Star-Angel Silhouette!
    drawBattleBoss(ctx, 640, 198, {
      enemyId: "charon",
      t: this.t,
      hurtTimer: 0,
      spareable: false,
      ruthlessMode: false,
      sparedProgress: 0,
      destroyedProgress: 0,
      talking: false,
      soulX: 640,
      soulY: 420
    });

    // Crisp Pixel Title Banner
    ctx.textAlign = "center";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillText("EARTH CALENDAR 2491  ·  WATCH ACCORD YEAR 3  ·  SS YUANWANG", 640, 340);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', monospace";
    ctx.fillText("离 散 星 海", 640, 404);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 24px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("— 卡 戎 号 残 响  //  ECHOES OF CHARON —", 640, 448);

    // 4 Soul Color Showcase Gems
    const modes: Array<{ m: "red" | "blue" | "green" | "yellow"; label: string }> = [
      { m: "red", label: "自由核" },
      { m: "blue", label: "0.45g重力" },
      { m: "green", label: "电磁盾反" },
      { m: "yellow", label: "脉冲反击" }
    ];
    modes.forEach((item, idx) => {
      const mx = 420 + idx * 146;
      drawPixelHeart(ctx, mx - 28, 502, item.m, 1.35, { glow: true, upsideDown: item.m === "yellow" });
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "14px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.textAlign = "left";
      ctx.fillText(item.label, mx - 12, 507);
    });

    // Iconic Pulsing Start Button
    const pulse = Math.sin(this.t * 4.5) > -0.35;
    drawUndertaleBox(ctx, 450, 534, 380, 58, pulse ? "#fde047" : "#f97316", "#04050a", 4);
    ctx.textAlign = "center";
    ctx.fillStyle = pulse ? "#fde047" : "#f8fafc";
    ctx.font = "bold 22px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("▶ 登舰调查  [Z / Enter / 点击]", 640, 571);

    // 3-Tier Difficulty Selector Pill (← / → or click pill)
    const diffCol =
      this.selectedDifficulty === "story"
        ? "#4ade80"
        : this.selectedDifficulty === "hardcore"
        ? "#f87171"
        : "#38bdf8";
    drawUndertaleBox(ctx, 410, 606, 460, 40, diffCol, "#060913", 2.5);
    ctx.fillStyle = diffCol;
    ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText(`◀  难度：${difficultyDisplayName(this.selectedDifficulty)}  ▶`, 640, 632);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText(
      "[←/→ 或点击切换难度]  ·  强攻 (FIGHT) 还是 解耦 (ACT + MERCY) — 你的每个抉择都将改写卡戎号的命运",
      640,
      678
    );
    ctx.restore();
  }

  private renderIntro(ctx: CanvasRenderingContext2D): void {
    const slide = INTRO_SLIDES[this.introIdx];
    ctx.save();
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, 1280, 720);

    // Top-centered crisp illustration frame
    drawUndertaleBox(ctx, 380, 76, 520, 270, slide.accent, "#070a14", 4);
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = i % 4 === 0 ? slide.accent : "#e2e8f0";
      ctx.fillRect(
        Math.round(392 + this.hash01(i * 5.3 + this.introIdx * 17) * 496),
        Math.round(88 + this.hash01(i * 11.7 + this.introIdx * 23) * 246),
        i % 5 === 0 ? 3 : 2,
        i % 5 === 0 ? 3 : 2
      );
    }
    drawPortrait(ctx, slide.portrait, 574, 146, 132, this.t, this.introTyped < slide.body.length);

    ctx.textAlign = "center";
    ctx.fillStyle = slide.accent;
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.fillText(slide.year, 640, 384);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText(slide.title, 640, 424);

    // Undertale story text frame
    drawUndertaleBox(ctx, 200, 456, 880, 190, "#ffffff", "#04050a", 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#f8fafc";
    ctx.font = "22px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', monospace";
    const lines = wrapText(ctx, slide.body.slice(0, this.introTyped), 820);
    lines.forEach((ln, i) => ctx.fillText(ln, 230, 484 + i * 38));

    ctx.textAlign = "right";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.fillText(`(${this.introIdx + 1}/3)  [Z/点击] 继续  ·  [X/Esc] 直接登舰`, 1054, 616);
    ctx.restore();
  }

  private renderBattleTransition(ctx: CanvasRenderingContext2D): void {
    // Iconic Undertale flashing Soul transition into battle!
    const flash = Math.floor(this.transitionTimer * 18) % 2 === 0;
    if (this.transitionTimer > 0.28) {
      this.overworld.render(ctx);
      ctx.fillStyle = flash ? "rgba(4, 5, 10, 0.85)" : "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(0, 0, 1280, 720);
    } else {
      ctx.fillStyle = "#04050a";
      ctx.fillRect(0, 0, 1280, 720);
    }
    const p = 1 - this.transitionTimer / 0.62;
    const sx = 640;
    const sy = 360 + p * 88;
    drawPixelHeart(ctx, sx, sy, "red", 2.0, { glow: true });
  }

  private renderEnding(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, 1280, 720);

    const cfg: Record<
      EndingKind,
      { badge: string; title: string; color: string; portrait: PortraitId; paragraphs: string[] }
    > = {
      pacifist: {
        badge: "TRUE ENDING · 守望共鸣（真·和平解耦结局）",
        title: "星海不会遗忘卡戎号的名字",
        color: "#fde047",
        portrait: "charon_warm",
        paragraphs: [
          "你一路未曾摧毁任何一台迷途的机械或人类士兵，完整带回了卡戎号的黑匣子与残响核心 CHARON-Ω。",
          "在远望号、和平号、阿育王号与第四主权「灯塔」的联合广播下，雷克斯屠杀投降姐妹舰并篡改战报的铁证响彻整个太阳系；倒戈的处刑官瓦尔克亲自向复兴派元老院呈交了证词。",
          "MNA-01 在历史档案馆为卡戎号开启了新的一页。三天后，火星人类主权联盟的加密频段响起——是凯恩发来的贺电：「干得漂亮，远望号。下一站星海见。」"
        ]
      },
      neutral: {
        badge: "NEUTRAL ENDING · 残响归航（中立幸存结局）",
        title: "带着裂痕与真相返航",
        color: "#38bdf8",
        portrait: "vaughn",
        paragraphs: [
          "你在枪火与抉择之间带回了卡戎号的黑匣子残片，远望号终于向自由航行共同体揭开了 2488 年那场背叛的真相。",
          "伊莱亚斯·沃恩与弥涅瓦-V 默默封存了你的外勤日志——你在某些时刻选择了理解，也在某些时刻扣动了扳机。",
          "也许下一次踏上卡戎号，你能在不留下灰烬的情况下，把所有迷失的回声都一起带回家。"
        ]
      },
      ruthless: {
        badge: "OBLIVION ENDING · 真空寂灭（冷酷清除结局）",
        title: "你活了下来，像雷克斯一样",
        color: "#ef4444",
        portrait: "charon_mad",
        paragraphs: [
          "迎宾机、医疗机、连续体探针、复兴派士兵瓦尔克，乃至哀鸣了三年的卡戎号残响——全部在你手下化作了真空里的像素灰烬。",
          "拓荒者一号载着冰冷的黑匣子残片返回远望号。舰桥上无人欢呼；弥涅瓦-V 启动了最高级隔离审计，沃恩看着你高企的 LV 读数久久没有说话。",
          "「为了对抗怪物，你让自己变成了同一副模样。」——要不要试着重来一次，看看【ACT + MERCY】背后的真正故事？"
        ]
      }
    };

    const e = cfg[this.endingKind];

    // Organic starlight backdrop + soft colored glow
    const eg = ctx.createRadialGradient(640, 120, 30, 640, 320, 620);
    eg.addColorStop(0, this.endingKind === "ruthless" ? "rgba(239,68,68,0.14)" : "rgba(250,204,21,0.11)");
    eg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, 1280, 720);

    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = i % 5 === 0 ? e.color : "#e2e8f0";
      ctx.globalAlpha = 0.35 + Math.max(0, Math.sin(this.t * 2.1 + i)) * 0.6;
      const sz = i % 9 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(this.hash01(i * 6.1) * 1280), Math.round(this.hash01(i * 13.3 + 5) * 720), sz, sz);
    }
    ctx.globalAlpha = 1;

    drawSaveStar(ctx, 640, 74, this.t, 1.3);

    ctx.textAlign = "center";
    ctx.fillStyle = e.color;
    ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText(e.badge, 640, 128);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText(e.title, 640, 174);

    // Main Epilogue Box with Portrait
    drawUndertaleBox(ctx, 160, 206, 960, 324, e.color, "#060812", 4);
    drawPortrait(ctx, e.portrait, 192, 238, 120, this.t, false);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "19px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', monospace";
    ctx.fillStyle = "#f1f5f9";
    let ty = 232;
    for (const para of e.paragraphs) {
      const wrapped = wrapText(ctx, para, 740);
      for (const ln of wrapped) {
        ctx.fillText(ln, 342, ty);
        ty += 29;
      }
      ty += 12;
    }

    // Run Telemetry Summary Box
    drawUndertaleBox(ctx, 160, 548, 960, 68, "#475569", "#04050a", 3);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 17px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillStyle = "#fde047";
    ctx.fillText(
      `难度 ${difficultyDisplayName(this.route.difficulty)}  ·  LV ${this.route.lv}  ·  解耦 ${this.route.spares}  ·  摧毁 ${this.route.kills}  ·  擦弹/盾反 ${this.route.totalGraze} 次`,
      640,
      582
    );

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("▶ 按 [Z / Enter / 点击] 重新起航，探索其他路线结局", 640, 662);
    ctx.restore();
  }

  /** Telemetry probe for automated Chromium verification & testing. */
  getProbe() {
    return {
      screen: this.screen,
      difficulty: this.route.difficulty,
      roomId: this.route.currentRoomId,
      roomName: this.overworld.room.name,
      playerX: Math.round(this.overworld.playerX),
      playerY: Math.round(this.overworld.playerY),
      lv: this.route.lv,
      hp: this.route.hp,
      maxHp: this.route.maxHp,
      gearCount: this.route.gear.length,
      kills: this.route.kills,
      spares: this.route.spares,
      totalGraze: this.route.totalGraze,
      dialogueOpen: this.overworld.dialogue !== null,
      battleEnemy: this.battle?.enemy.id ?? null,
      battlePhase: this.battle?.phase ?? null,
      battleSoulMode: this.battle?.soulMode ?? null,
      battleSpareable: this.battle?.spareable ?? false,
      battleBarrier: this.battle?.barrierActive ?? false,
      battleRuthless: this.battle?.ruthlessMode ?? false,
      endingKind: this.screen === "ending" ? this.endingKind : null
    };
  }
}
