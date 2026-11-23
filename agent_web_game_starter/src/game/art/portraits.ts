import type { PortraitId } from "../types";
import { drawPixelMatrix, type PixelSpriteData } from "./pixelCanvas";

const PORTRAIT_MAP: Record<Exclude<PortraitId, "none">, PixelSpriteData> = {
  minerva_v: {
    palette: { ".": "", d: "#081226", c: "#38bdf8", C: "#bae6fd", v: "#a78bfa", w: "#ffffff" },
    grid: [
      "......................",
      "..........cc..........",
      ".........cCCc.........",
      "........cCwwCc........",
      ".......cCvwwvCc.......",
      "......cCvvwwvvCc......",
      ".....cCvddwwddvCc.....",
      "....cCvdCCwwCCdvCc....",
      "...cCvdCwwwwwwCdvCc...",
      "..cCvdCwwddddwwCdvCc..",
      "..cCvdCwwdCCdwwCdvCc..",
      "..cCvdCwwddddwwCdvCc..",
      "...cCvdCwwwwwwCdvCc...",
      "....cCvdCCwwCCdvCc....",
      ".....cCvddwwddvCc.....",
      "......cCvvwwvvCc......",
      ".......cCvwwvCc.......",
      "........cCwwCc........",
      ".........cCCc.........",
      "..........cc.........."
    ]
  },
  vaughn: {
    palette: { k: "#090a14", h: "#94a3b8", H: "#e2e8f0", s: "#f1c7a6", S: "#c9926b", e: "#0f172a", c: "#38bdf8", j: "#1e293b", g: "#fbbf24" },
    grid: [
      "......kkkkkkkkkk......",
      "....kkHHHHHHHHHHkk....",
      "...kHHhhhhhhhhhhHHk...",
      "..kHhhsssssssssshhHk..",
      "..khhsssssssssssshhk..",
      "..khsskksssssskksshk..",
      "..khssseesssseessshk..",
      "..kssssssssssssssssk..",
      "..kSssssssSSssssssSk..",
      "...kSsssskkkkssssSk...",
      "...kSssssssssssssSk...",
      "....kSSssssssssSSk....",
      ".....kkSSssssSSkk.....",
      "...kkjjkcccccckjjkk...",
      "..kjjjjjkkggkkjjjjjk..",
      ".kjjjjjjjjkkjjjjjjjjk.",
      ".kjjjjjjjjjjjjjjjjjjk.",
      ".kjjjjjjjjjjjjjjjjjjk.",
      ".kkkkkkkkkkkkkkkkkkkk."
    ]
  },
  ailin: {
    palette: { k: "#090a14", h: "#1e1b4b", H: "#312e81", s: "#fde0c8", S: "#dba582", e: "#0f172a", g: "#67e8f9", w: "#f8fafc", c: "#38bdf8" },
    grid: [
      ".....kkkkkkkkkkkk.....",
      "...kkHHHHHHHHHHHHkk...",
      "..kHHhhhhhhhhhhhhHHk..",
      "..kHhhsssssssssshhHk..",
      ".kHhhsssssssssssshhHk.",
      ".kHhssggggssggggsshhk.",
      ".kHhssgeegssgeegsshhk.",
      ".kHhssggggssggggsshhk.",
      ".kHhsssssssssssssshhk.",
      ".kHhSssssskksssssShhk.",
      "..khSssssssssssssShk..",
      "..khhSSssssssssSShhk..",
      "...khkkSSssssSSkkhk...",
      "..kwwwwwkcccckwwwwwk..",
      ".kwwwwwwwkkkkwwwwwwwk.",
      ".kwwwwwwwwwwwwwwwwwwk.",
      ".kwwwwwwwwwwwwwwwwwwk.",
      ".kkkkkkkkkkkkkkkkkkkk."
    ]
  },
  captain: {
    palette: { k: "#090a14", h: "#334155", H: "#64748b", s: "#f3c7a2", S: "#c48d68", e: "#0f172a", g: "#fbbf24", j: "#0f172a", w: "#e2e8f0" },
    grid: [
      "....kkkkkkkkkkkkkk....",
      "...kHHHHHHHHHHHHHHk...",
      "..kHhhhhhhhhhhhhhhHk..",
      "..kggggggggggggggggk..",
      "..kssssssssssssssssk..",
      "..ksskksssssssskkssk..",
      "..kssseesssssseesssk..",
      "..kssssssssssssssssk..",
      "..kSssssssSSssssssSk..",
      "...kSsssskkkkssssSk...",
      "...kSssssssssssssSk...",
      "....kkSSssssssSSkk....",
      "..kkjjjkwwwwwwkjjjkk..",
      ".kjjggjjkkggkkjjggjjk.",
      ".kjjjjjjjjkkjjjjjjjjk.",
      ".kjjjjjjjjjjjjjjjjjjk.",
      ".kkkkkkkkkkkkkkkkkkkk."
    ]
  },
  mna01: {
    palette: { k: "#090a14", m: "#44403c", M: "#78716c", d: "#1c1917", a: "#f59e0b", A: "#fde047" },
    grid: [
      "..kkkkkkkkkkkkkkkkkk..",
      ".kMMMMMMMMMMMMMMMMMMk.",
      ".kMddddddddddddddddMk.",
      ".kMdAAAAAAAAAAAAAAdMk.",
      ".kMdAddddddddddddAdMk.",
      ".kMdAdAAddddddAAdAdMk.",
      ".kMdAdAAddddddAAdAdMk.",
      ".kMdAddddddddddddAdMk.",
      ".kMdAdddAAAAAAdddAdMk.",
      ".kMdAddddddddddddAdMk.",
      ".kMdAAAAAAAAAAAAAAdMk.",
      ".kMddddddddddddddddMk.",
      ".kMMMMMMMMMMMMMMMMMMk.",
      "..kmmmmmmaammmmmmmmk..",
      "..kkkkkkkkkkkkkkkkkk..",
      "......kmmmmmmmmk......",
      "....kkmmmmmmmmmmkk....",
      "....kkkkkkkkkkkkkk...."
    ]
  },
  kiosk: {
    palette: { k: "#090a14", M: "#cbd5e1", d: "#0f172a", g: "#4ade80", w: "#f8fafc" },
    grid: [
      "..kkkkkkkkkkkkkkkkkk..",
      ".kMMMMMMMMMMMMMMMMMMk.",
      ".kMddddddddddddddddMk.",
      ".kMdggggggggggggggdMk.",
      ".kMdgwwggggggggwwgdMk.",
      ".kMdgwwggggggggwwgdMk.",
      ".kMdggggggggggggggdMk.",
      ".kMdgwwggggggggwwgdMk.",
      ".kMdggwwwwwwwwwwggdMk.",
      ".kMdggggggggggggggdMk.",
      ".kMddddddddddddddddMk.",
      ".kMMMMMMMMMMMMMMMMMMk.",
      "..kkkkkkkkkkkkkkkkkk.."
    ]
  },
  kiosk_mad: {
    palette: { k: "#090a14", M: "#cbd5e1", d: "#1f0909", r: "#ef4444", y: "#fde047", w: "#ffffff" },
    grid: [
      "..kkkkkkkkkkkkkkkkkk..",
      ".kMMMMMMMMMMMMMMMMMMk.",
      ".kMddddddddddddddddMk.",
      ".kMdrrrrrrrrrrrrrrdMk.",
      ".kMdryyrrrrrrrrryrdMk.",
      ".kMdrrryyrrrrryyrrdMk.",
      ".kMdrrrrrrrrrrrrrrdMk.",
      ".kMdrwwwwwwwwwwwwrdMk.",
      ".kMdrwrrwrrwrrwrrrdMk.",
      ".kMdrwwwwwwwwwwwwrdMk.",
      ".kMddddddddddddddddMk.",
      ".kMMMMMMMMMMMMMMMMMMk.",
      "..kkkkkkkkkkkkkkkkkk.."
    ]
  },
  med07: {
    palette: { k: "#090a14", w: "#f1f5f9", s: "#94a3b8", d: "#0f172a", c: "#22d3ee", C: "#cffafe", r: "#ef4444" },
    grid: [
      ".....kkkkkkkkkkkk.....",
      "...kkwwwwwwwwwwwwkk...",
      "..kwwwwwwwrrwwwwwwwk..",
      "..kwwwwwrrrrrrwwwwwk..",
      "..kwwwwwwwrrwwwwwwwk..",
      ".kwwddddddddddddddwwk.",
      ".kwdccccccccccccccdwk.",
      ".kwdccCccCccCccCccdwk.",
      ".kwdcCccCccCccCcccdwk.",
      ".kwdccccccccccccccdwk.",
      ".kwwddddddddddddddwwk.",
      "..kssssssssssssssssk..",
      "...kksssssssssssskk...",
      ".....kkkkkkkkkkkk....."
    ]
  },
  weaver: {
    palette: { k: "#090a14", d: "#2e1065", v: "#a855f7", V: "#f0abfc", g: "#facc15", w: "#ffffff" },
    grid: [
      ".........kkkk.........",
      ".......kkggggkk.......",
      ".....kkggddddggkk.....",
      "....kggdvvvvvvdggk....",
      "...kgdvVVwwwwVVvdgk...",
      "..kgdvVwwggggwwVvdgk..",
      "..kgdvVwggwwggwVvdgk..",
      "..kgdvVwwggggwwVvdgk..",
      "...kgdvVVwwwwVVvdgk...",
      "....kggdvvvvvvdggk....",
      ".....kkggddddggkk.....",
      ".......kkggggkk.......",
      ".........kkkk........."
    ]
  },
  vark: {
    palette: { k: "#090a14", a: "#475569", A: "#94a3b8", d: "#0f172a", r: "#ef4444", R: "#fca5a5", y: "#fde047" },
    grid: [
      "....kkkkkkkkkkkkkk....",
      "...kAAAAAAAAAAAAAAk...",
      "..kAAaaaaaaaaaaaaAAk..",
      "..kAaaadddddddaaaaAk..",
      ".kAaaadddddddddaaaaAk.",
      ".kAaaadrrRRRRrrdaaaAk.",
      ".kAaaadrRRyyRRrdaaaAk.",
      ".kAaaadddddddddaaaaAk.",
      ".kAaaaaaaddddaaaaaaAk.",
      "..kAaaadddddddaaaaAk..",
      "..kAaaadaaddaadaaaAk..",
      "...kAaaaddddddaaaAk...",
      "....kkAAAAAAAAAAkk....",
      "......kkkkkkkkkk......"
    ]
  },
  vark_doubt: {
    palette: { k: "#090a14", a: "#475569", A: "#94a3b8", d: "#0f172a", r: "#ef4444", s: "#f1c7a6", w: "#ffffff" },
    grid: [
      "....kkkkkkkkkkkkkk....",
      "...kAAAAAAAAAAAAAAk...",
      "..kAAaaaaaaaaaaaaAAk..",
      "..kAaaadddddddaaaaAk..",
      ".kAaaaddssddssdaaaaAk.",
      ".kAaaadswdrrdsdaaaaAk.",
      ".kAaaaddssddssdaaaaAk.",
      ".kAaaadddddddddaaaaAk.",
      ".kAaaaaaaddddaaaaaaAk.",
      "..kAaaadddddddaaaaAk..",
      "..kAaaadaaddaadaaaAk..",
      "...kAaaaddddddaaaAk...",
      "....kkAAAAAAAAAAkk....",
      "......kkkkkkkkkk......"
    ]
  },
  charon: {
    palette: { k: "#090a14", g: "#fde047", o: "#f59e0b", d: "#0a1020", c: "#38bdf8", w: "#ffffff" },
    grid: [
      "......kkkkkk......",
      "....kkggggggkk....",
      "...kggwwwwwggkk...",
      "..kgwddddddddwkk..",
      ".kgwddccccccddwgk.",
      ".kgwdcddddddcdwgk.",
      "kgwdcdwwwddwwwdwgk",
      "kgwdcdwccddccwdwgk",
      "kgwdcdwwwddwwwdwgk",
      "kgwdcdccddddccdwgk",
      "kgwdcdccddddccdwgk",
      ".kgwdcddddddcdwgk.",
      ".kgwdcdwwwwdcdwgk.",
      "..kgwddccccccdwgk.",
      "..kggwddddddddwgk.",
      "...kkggwwwwwwggk..",
      ".....kkggggggkk...",
      ".......kkkkkk....."
    ]
  },
  charon_mad: {
    palette: { k: "#090a14", r: "#ef4444", R: "#fca5a5", d: "#180509", w: "#ffffff", y: "#fde047" },
    grid: [
      "......kkkkkk......",
      "....kkrrrrrrkk....",
      "...krrRRRRRRrrk...",
      "..krRddddddddRrk..",
      ".krRddrrrrrrddRrk.",
      ".krRdrddddddrdRrk.",
      "krRdrdwwwddwwwdRrk",
      "krRdrdwrrddrrwdRrk",
      "krRdrdrrddddrrdRrk",
      "krRdrddddddddddRrk",
      "krRdrdyyyyyyyydRrk",
      ".krRdrdyrdyrdyRrk.",
      ".krRdrdyyyyyydRrk.",
      "..krRddrrrrrrddrk.",
      "..krrRddddddddRrk.",
      "...kkrrRRRRRRrrk..",
      ".....kkrrrrrrkk...",
      ".......kkkkkk....."
    ]
  },
  charon_warm: {
    palette: { k: "#090a14", g: "#fde047", o: "#f59e0b", w: "#ffffff", d: "#0f172a", c: "#38bdf8" },
    grid: [
      "......kkkkkk......",
      "....kkggggggkk....",
      "...kggwwwwwwggk...",
      "..kgwwccccccwwgk..",
      ".kgwwcddddddcwggk.",
      ".kgwcdggggggdcwgk.",
      "kgwcdggddddggdcwgk",
      "kgwcdgddggddgdcwgk",
      "kgwcddddddddddcwkg",
      "kgwcdggddddggdcwgk",
      "kgwcddggggggddcwgk",
      ".kgwcdggggggdcwgk.",
      ".kgwwcddddddcwggk.",
      "..kgwwccccccwwgk..",
      "..kggwwwwwwwwggk..",
      "...kkggggggggkk...",
      ".....kkggggkk.....",
      ".......kkkk......."
    ]
  }
};

export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  portrait: PortraitId,
  x: number,
  y: number,
  size: number,
  t: number,
  talking: boolean
): void {
  if (portrait === "none") return;
  const data = PORTRAIT_MAP[portrait];
  if (!data) return;

  ctx.save();
  // Crisp portrait bezel inside dialogue frame
  ctx.fillStyle = "#080b16";
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  const cols = data.grid[0].length;
  const rows = data.grid.length;
  const scale = Math.max(2, Math.floor((size - 12) / Math.max(cols, rows)));
  const sw = cols * scale;
  const sh = rows * scale;
  const bob = talking && Math.floor(t * 14) % 2 === 0 ? -2 : 0;

  drawPixelMatrix(
    ctx,
    `portrait_${portrait}`,
    data,
    x + (size - sw) / 2,
    y + (size - sh) / 2 + bob,
    scale
  );

  // Subtle live animated audio equalizer bar under AI/radio portraits when talking
  if (
    talking &&
    (portrait === "minerva_v" ||
      portrait === "mna01" ||
      portrait === "charon" ||
      portrait === "charon_mad" ||
      portrait === "charon_warm")
  ) {
    const barCol =
      portrait === "mna01" ? "#fbbf24" : portrait === "charon_mad" ? "#ef4444" : "#38bdf8";
    ctx.fillStyle = barCol;
    for (let i = 0; i < 6; i++) {
      const bh = 3 + Math.floor(Math.abs(Math.sin(t * 18 + i * 1.4)) * 9);
      ctx.fillRect(x + 14 + i * 11, y + size - 5 - bh, 6, bh);
    }
  }
  ctx.restore();
}
