import type { Direction, PropKind } from "../types";
import { drawPixelMatrix, drawSaveStar, type PixelSpriteData } from "./pixelCanvas";

// Unified high-contrast Deltarune-inspired pixel palette for the player (小徐, Yuanwang tech crewman)
const PLAYER_PALETTE: Record<string, string> = {
  k: "#090a14", // crisp dark outline
  h: "#1e293b", // dark hair / cap base
  H: "#334155", // cap highlight
  s: "#fbd3b0", // warm skin
  S: "#d99b78", // skin shade
  e: "#0f172a", // crisp eyes
  c: "#38bdf8", // Yuanwang cyan visor/badge
  g: "#fbbf24", // gold collar/rank stripe
  j: "#1d3557", // deep cobalt EVA jacket
  J: "#3b5b8c", // jacket highlight
  d: "#111c33", // jacket shadow
  p: "#475569", // pants
  b: "#0f172a", // boots
  w: "#f8fafc"  // crisp white highlight
};

const PLAYER_DOWN_IDLE = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..kcccccccck..",
  "..kssssssssk..",
  "..kseesssesk..",
  "...kSssssSk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjccjjjJk.",
  ".kJjjjjjjjjJk.",
  ".ksdjjjjjjdsk.",
  "..kddddddddk..",
  "...kppkkppk...",
  "...kppkkppk...",
  "...kbbkkbbk...",
  "...kkkkkkkk..."
];

const PLAYER_DOWN_STEP1 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..kcccccccck..",
  "..kssssssssk..",
  "..kseesssesk..",
  "...kSssssSk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjccjjjJk.",
  ".ksjjjjjjjjJk.",
  "..kdjjjjjjdsk.",
  "...kddddddk...",
  "..kppk..kppk..",
  "..kbbk...kpk..",
  "..kkkk...kbk..",
  ".........kkk.."
];

const PLAYER_DOWN_STEP2 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..kcccccccck..",
  "..kssssssssk..",
  "..kseesssesk..",
  "...kSssssSk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjccjjjJk.",
  ".kJjjjjjjjjsk.",
  ".ksdjjjjjjdk..",
  "...kddddddk...",
  "..kppk..kppk..",
  "..kpk...kbbk..",
  "..kbk...kkkk..",
  "..kkk........."
];

const PLAYER_UP_IDLE = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..khhhhhhhhk..",
  "..khhhhhhhhk..",
  "..khhhkkhhhk..",
  "...khhhhhhk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjjjjjjJk.",
  ".kJjjjwwjjjJk.",
  ".kJdjccccjdJk.",
  "..kddddddddk..",
  "...kppkkppk...",
  "...kppkkppk...",
  "...kbbkkbbk...",
  "...kkkkkkkk..."
];

const PLAYER_UP_STEP1 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..khhhhhhhhk..",
  "..khhhhhhhhk..",
  "..khhhkkhhhk..",
  "...khhhhhhk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjjjjjjJk.",
  ".kJjjjwwjjjJk.",
  ".kJdjccccjdJk.",
  "..kddddddddk..",
  "..kppk..kppk..",
  "..kbbk...kpk..",
  "..kkkk...kbk..",
  ".........kkk.."
];

const PLAYER_UP_STEP2 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..kHhhhhhhHk..",
  "..khhhhhhhhk..",
  "..khhhhhhhhk..",
  "..khhhkkhhhk..",
  "...khhhhhhk...",
  "..kkggggggkk..",
  ".kJJjjjjjjJJk.",
  ".kJjjjjjjjjJk.",
  ".kJjjjwwjjjJk.",
  ".kJdjccccjdJk.",
  "..kddddddddk..",
  "..kppk..kppk..",
  "..kpk...kbbk..",
  "..kbk...kkkk..",
  "..kkk........."
];

const PLAYER_RIGHT_IDLE = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..khhhhHHccc..",
  "..khhhhssssk..",
  "..khhhsssesk..",
  "..khhhsssssk..",
  "...khhSssSk...",
  "...kkggggkk...",
  "..kJJjjjjJJk..",
  "..kJjjjjcjjk..",
  "..kJjjjjjjjk..",
  "..kJdjjsjjjk..",
  "...kddddddk...",
  "....kppppk....",
  "....kppppk....",
  "....kbbbbk....",
  "....kkkkkk...."
];

const PLAYER_RIGHT_STEP1 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..khhhhHHccc..",
  "..khhhhssssk..",
  "..khhhsssesk..",
  "..khhhsssssk..",
  "...khhSssSk...",
  "...kkggggkk...",
  "..kJJjjjjJJk..",
  "..kJjjjjcjjk..",
  "..ksjjjjjjjk..",
  "...kdjjjjjsk..",
  "...kddddddk...",
  "...kppkkppk...",
  "..kppk..kppk..",
  "..kbbk..kbbk..",
  "..kkkk..kkkk.."
];

const PLAYER_RIGHT_STEP2 = [
  "....kkkkkk....",
  "...kHHHHHHk...",
  "..khhhhHHccc..",
  "..khhhhssssk..",
  "..khhhsssesk..",
  "..khhhsssssk..",
  "...khhSssSk...",
  "...kkggggkk...",
  "..kJJjjjjJJk..",
  "..kJjjjjcjjk..",
  "..kJjjjjjjsk..",
  "..ksdjjjjjdk..",
  "...kddddddk...",
  "....kppppk....",
  "...kpk..kpk...",
  "...kbk..kbk...",
  "...kkk..kkk..."
];

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  dir: Direction,
  walkFrame: number
): void {
  const scale = 3;
  const flipX = dir === "left";
  let grid = PLAYER_DOWN_IDLE;
  let key = "player_down_0";

  const step = walkFrame % 4;
  const frameIdx = step === 1 ? 1 : step === 3 ? 2 : 0;

  if (dir === "down") {
    grid = frameIdx === 1 ? PLAYER_DOWN_STEP1 : frameIdx === 2 ? PLAYER_DOWN_STEP2 : PLAYER_DOWN_IDLE;
    key = `player_down_${frameIdx}`;
  } else if (dir === "up") {
    grid = frameIdx === 1 ? PLAYER_UP_STEP1 : frameIdx === 2 ? PLAYER_UP_STEP2 : PLAYER_UP_IDLE;
    key = `player_up_${frameIdx}`;
  } else {
    grid = frameIdx === 1 ? PLAYER_RIGHT_STEP1 : frameIdx === 2 ? PLAYER_RIGHT_STEP2 : PLAYER_RIGHT_IDLE;
    key = `player_side_${frameIdx}`;
  }

  // Crisp grounded pixel oval shadow
  ctx.fillStyle = "rgba(3, 5, 14, 0.55)";
  ctx.fillRect(Math.round(cx - 16), Math.round(footY - 6), 32, 8);

  const spriteW = grid[0].length * scale;
  const spriteH = grid.length * scale;
  const bob = frameIdx !== 0 ? -2 : 0;
  drawPixelMatrix(
    ctx,
    key,
    { grid, palette: PLAYER_PALETTE },
    cx - spriteW / 2,
    footY - spriteH + bob,
    scale,
    { flipX }
  );
}

// --- Overworld Enemy & Prop Pixel Sprites ------------------------------------

const PROP_SPRITES: Record<string, PixelSpriteData> = {
  kiosk_npc: {
    palette: { k: "#090a14", m: "#64748b", M: "#cbd5e1", d: "#1e293b", g: "#4ade80", w: "#f8fafc", r: "#ef4444", y: "#fbbf24" },
    grid: [
      "..kkkkkkkkkk..",
      ".kMMMMMMMMMMk.",
      ".kMddddddddMk.",
      ".kMdggggggdMk.",
      ".kMdgwggwgdMk.",
      ".kMdggggggdMk.",
      ".kMdgwggwgdMk.",
      ".kMdggwwggdMk.",
      ".kMddddddddMk.",
      ".kMMMMMMMMMMk.",
      "..kkmmmmmmkk..",
      "....kmmmmk....",
      "...kmmymmmk...",
      "..kmmmmmmmmk..",
      "..kkkkkkkkkk.."
    ]
  },
  med07_npc: {
    palette: { k: "#090a14", w: "#f1f5f9", s: "#cbd5e1", c: "#22d3ee", b: "#0284c7", r: "#ef4444", d: "#1e293b" },
    grid: [
      "....kkkkkk....",
      "..kkwwwwwwkk..",
      ".kwwwwwrwwwwk.",
      ".kwwwwrrrwwwk.",
      ".kwwwwwrwwwwk.",
      ".kwwdddddddwwk",
      ".kwdcccccccddk",
      ".kwdccwccwcddk",
      ".kwwdddddddwwk",
      "..ksssssssssk.",
      "..kssbbbbsssk.",
      "...kssbbsssk..",
      "....kkcckk....",
      ".....kcck....."
    ]
  },
  weaver_npc: {
    palette: { k: "#090a14", v: "#a855f7", V: "#e879f9", d: "#3b0764", g: "#facc15", w: "#ffffff" },
    grid: [
      "......kk......",
      "....kkggkk....",
      "...kgddddgk...",
      "..kgdvVVvdgk..",
      ".kgdvVwwVvdgk.",
      "kgdvVwggwVvdgk",
      "kgdvVwggwVvdgk",
      ".kgdvVwwVvdgk.",
      "..kgdvVVvdgk..",
      "...kgddddgk...",
      "....kkggkk....",
      "......kk......"
    ]
  },
  vark_npc: {
    palette: { k: "#090a14", a: "#475569", A: "#94a3b8", d: "#1e293b", r: "#ef4444", R: "#fca5a5", o: "#f97316", y: "#fde047" },
    grid: [
      "....kkkkkk....",
      "...kAAAAAAk...",
      "..kAaaaaaaAk..",
      "..kaddddddak..",
      "..kadrRRrdak..",
      "..kaddddddak..",
      ".kkAaaaaaaAkk.",
      "kAAaarrraaAAak",
      "kAaaarrraaaAak",
      "kAaaaaaaaaaaAk",
      ".kdaaaaaaaadk.",
      ".kdadddddadk..",
      "..kddk..kddk..",
      "..kaak..kaak..",
      "..kaak..kaak..",
      "..kkkk..kkkk.."
    ]
  },
  charon_core: {
    palette: { k: "#090a14", g: "#fde047", o: "#f59e0b", c: "#38bdf8", w: "#ffffff", d: "#1e293b", m: "#94a3b8" },
    grid: [
      "......kkkk......",
      "....kkggggkk....",
      "..kkggwwwwggkk..",
      ".kggwccccccwggk.",
      ".kgwcddddddcwkg.",
      "kgwcddwwwwddcwkg",
      "kgwcddwccwddcwkg",
      "kgwcddwwwwddcwkg",
      ".kgwcddddddcwkg.",
      ".kggwccccccwggk.",
      "..kkggwwwwggkk..",
      "....kkggggkk....",
      ".....kmmmmk.....",
      "....kmmmmmmk...."
    ]
  },
  cryo_pod: {
    palette: { k: "#090a14", m: "#475569", M: "#94a3b8", c: "#22d3ee", C: "#cffafe", d: "#0f2942", g: "#34d399" },
    grid: [
      "..kkkkkkkkkk..",
      ".kMMMMMMMMMMk.",
      ".kMddddddddMk.",
      ".kMdccccccdMk.",
      ".kMdcCccCcdMk.",
      ".kMdcCccccdMk.",
      ".kMdccccccdMk.",
      ".kMdccCcccdMk.",
      ".kMdccccccdMk.",
      ".kMddddddddMk.",
      ".kMmmggggmmMk.",
      ".kMMMMMMMMMMk.",
      "..kkkkkkkkkk.."
    ]
  },
  frozen_wheat: {
    palette: { k: "#090a14", m: "#334155", M: "#64748b", c: "#67e8f9", C: "#ecfeff", g: "#34d399", y: "#fde047" },
    grid: [
      "..k..k..k..k..",
      ".kCkkykkCkkCk.",
      ".kCkgCkgCkgCk.",
      "..kgcgCgcgck..",
      "..kcgcgcgcgk..",
      ".kkkkkkkkkkkk.",
      ".kMMMMMMMMMMk.",
      ".kmmmmmmmmmmk.",
      ".kmmccccccmmk.",
      ".kkkkkkkkkkkk."
    ]
  },
  terminal: {
    palette: { k: "#090a14", m: "#334155", M: "#94a3b8", d: "#0f172a", c: "#38bdf8", g: "#4ade80", a: "#fbbf24" },
    grid: [
      ".kkkkkkkkkk.",
      "kMMMMMMMMMMk",
      "kMddddddddMk",
      "kMdccccccdMk",
      "kMdcddddcdMk",
      "kMdccggccdMk",
      "kMddddddddMk",
      "kMMaammggMMk",
      ".kmmmmmmmmk.",
      ".kmmmmmmmmk.",
      ".kkkkkkkkkk."
    ]
  },
  supply_crate: {
    palette: { k: "#090a14", a: "#f59e0b", A: "#fde047", d: "#78350f", m: "#475569", w: "#f8fafc" },
    grid: [
      ".kkkkkkkkkk.",
      "kAAAAAAAAAAk",
      "kAaaaaaaaaAk",
      "kAammwwmmaAk",
      "kAamwwwwmaAk",
      "kAammwwmmaAk",
      "kAddddddddAk",
      "kAaaaaaaaaAk",
      ".kkkkkkkkkk."
    ]
  },
  surrender_beacon: {
    palette: { k: "#090a14", w: "#f8fafc", s: "#cbd5e1", c: "#38bdf8", r: "#ef4444", m: "#475569" },
    grid: [
      "....kkkk....",
      "...kwwwwk...",
      "..kwccccwk..",
      "..kwcwwcwk..",
      "...kwwwwk...",
      "....ksskk...",
      "...ksssssk..",
      "..kmmrrmmmk.",
      "..kmmmmmmmk.",
      "..kkkkkkkkk."
    ]
  },
  radio_node: {
    palette: { k: "#090a14", m: "#475569", M: "#cbd5e1", a: "#f59e0b", A: "#fde047", d: "#1c1917" },
    grid: [
      ".....kk.....",
      "....kAAk....",
      ".....kk.....",
      ".kkkkkkkkkk.",
      "kMMMMMMMMMMk",
      "kMddddddddMk",
      "kMdAAaaAAdMk",
      "kMdaaddaddMk",
      "kMddddddddMk",
      "kmmmmmmmmmmk",
      ".kkkkkkkkkk."
    ]
  }
};

export function drawOverworldProp(
  ctx: CanvasRenderingContext2D,
  kind: PropKind,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  options?: { active?: boolean; spared?: boolean; destroyed?: boolean; locked?: boolean }
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (kind === "save_star") {
    drawSaveStar(ctx, cx, cy, t, 1.15);
    return;
  }

  if (kind === "shuttle") {
    // Crisp docked Pioneer-1 Shuttle nose protruding from west docking collar
    ctx.save();
    ctx.fillStyle = "#090a14";
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = "#334155";
    ctx.fillRect(x, y + 10, w - 16, h - 20);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x, y + 18, w - 8, h - 36);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + w - 26, y + 26, 22, h - 52);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x + w - 22, y + 32, 12, h - 64);
    // Amber docking chevrons
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x + 12, y + 22, 8, 8);
    ctx.fillRect(x + 12, y + h - 30, 8, 8);
    // Label
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PIONEER-1", x + w * 0.42, cy + 4);
    ctx.restore();
    return;
  }

  if (kind === "relay_switch") {
    const on = !!options?.active;
    ctx.save();
    ctx.fillStyle = "#090a14";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = on ? "#064e3b" : "#1e293b";
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = on ? "#34d399" : "#ef4444";
    ctx.fillRect(x + 9, y + 9, w - 18, h - 18);
    if (on) {
      ctx.fillStyle = "#d1fae5";
      ctx.fillRect(x + 14, y + 14, w - 28, h - 28);
    }
    ctx.restore();
    return;
  }

  if (kind === "blast_door") {
    const locked = options?.locked ?? false;
    ctx.save();
    ctx.fillStyle = "#090a14";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = locked ? "#450a0a" : "#064e3b";
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = locked ? "#ef4444" : "#34d399";
    ctx.fillRect(x + 10, cy - 4, w - 20, 8);
    ctx.restore();
    return;
  }

  if (kind === "scorched_debris") {
    ctx.save();
    ctx.fillStyle = "#090a14";
    ctx.fillRect(x + 4, y + 8, w - 8, h - 14);
    ctx.fillStyle = "#334155";
    ctx.fillRect(x + 8, y + 12, w - 16, h - 22);
    ctx.fillStyle = "#f97316";
    if (Math.sin(t * 7 + x) > 0.2) {
      ctx.fillRect(x + 16, y + 16, 6, 6);
    }
    ctx.restore();
    return;
  }

  const sprite = PROP_SPRITES[kind];
  if (!sprite) return;

  if (options?.destroyed) {
    // Pile of smoking gray pixel ash / cracked casing
    ctx.save();
    ctx.fillStyle = "#334155";
    ctx.fillRect(cx - 16, y + h - 14, 32, 10);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(cx - 10, y + h - 18, 20, 6);
    ctx.restore();
    return;
  }

  const scale = kind === "charon_core" || kind === "vark_npc" ? 3.5 : 3;
  const sw = sprite.grid[0].length * scale;
  const sh = sprite.grid.length * scale;
  const hover =
    kind === "med07_npc" || kind === "weaver_npc" || kind === "charon_core"
      ? Math.round(Math.sin(t * 3.2 + x * 0.05) * 4)
      : 0;

  // Ground shadow
  ctx.fillStyle = "rgba(3, 5, 14, 0.5)";
  ctx.fillRect(Math.round(cx - sw * 0.36), Math.round(y + h - 6), Math.round(sw * 0.72), 8);

  drawPixelMatrix(
    ctx,
    `prop_${kind}`,
    sprite,
    cx - sw / 2,
    y + h - sh + hover,
    scale,
    { alpha: options?.spared ? 0.78 : 1 }
  );

  // Spared golden halo badge
  if (options?.spared) {
    ctx.fillStyle = "#fde047";
    ctx.fillRect(Math.round(cx - 4), Math.round(y + h - sh + hover - 10), 8, 4);
  }
}
