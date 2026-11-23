import type { Direction, SoulMode } from "../types";

export interface PixelSpriteData {
  grid: readonly string[];
  palette: Record<string, string>;
}

const spriteCache = new Map<string, HTMLCanvasElement>();

export type SpriteCanvasFactory = (w: number, h: number) => HTMLCanvasElement;

let canvasFactory: SpriteCanvasFactory | null = null;

export function setSpriteCanvasFactory(factory: SpriteCanvasFactory): void {
  canvasFactory = factory;
}

/**
 * Draw a palette-indexed pixel matrix at crisp integer scale.
 * Caches baked 1:1 canvases in browser for zero per-pixel overhead.
 */
export function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  cacheKey: string,
  sprite: PixelSpriteData,
  x: number,
  y: number,
  scale: number,
  options?: { flipX?: boolean; alpha?: number; tintOverlay?: string }
): void {
  const rows = sprite.grid.length;
  const cols = sprite.grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  const drawX = Math.round(x);
  const drawY = Math.round(y);
  const alpha = options?.alpha ?? 1;
  const flipX = options?.flipX ?? false;

  ctx.save();
  if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
  ctx.imageSmoothingEnabled = false;

  if (canvasFactory && !options?.tintOverlay) {
    let baked = spriteCache.get(cacheKey);
    if (!baked) {
      baked = canvasFactory(cols, rows);
      const bctx = baked.getContext("2d");
      if (bctx) {
        for (let r = 0; r < rows; r++) {
          const line = sprite.grid[r];
          for (let c = 0; c < cols; c++) {
            const ch = line[c];
            if (ch === "." || ch === " ") continue;
            const col = sprite.palette[ch];
            if (!col) continue;
            bctx.fillStyle = col;
            bctx.fillRect(c, r, 1, 1);
          }
        }
      }
      spriteCache.set(cacheKey, baked);
    }

    if (flipX) {
      ctx.translate(drawX + cols * scale, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(baked, 0, 0, cols * scale, rows * scale);
    } else {
      ctx.drawImage(baked, drawX, drawY, cols * scale, rows * scale);
    }
  } else {
    for (let r = 0; r < rows; r++) {
      const line = sprite.grid[r];
      for (let c = 0; c < cols; c++) {
        const ch = line[c];
        if (ch === "." || ch === " ") continue;
        const col = options?.tintOverlay ?? sprite.palette[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        const px = flipX ? drawX + (cols - 1 - c) * scale : drawX + c * scale;
        ctx.fillRect(px, drawY + r * scale, scale, scale);
      }
    }
  }

  ctx.restore();
}

const HEART_GRID = [
  "..111...111..",
  ".12221.12221.",
  "1222221222221",
  "1223222222221",
  "1222222222221",
  "1222222222221",
  ".12222222221.",
  "..122222221..",
  "...1222221...",
  "....12221....",
  ".....121.....",
  "......1......"
];

const HEART_CRACKED_GRID = [
  "..111....111..",
  ".12221..12221.",
  "122221..122221",
  "122221...12221",
  "12221....12221",
  "122221..122221",
  ".12221...1221.",
  "..1221..1221..",
  "...121...11...",
  "....11..11....",
  ".....1..1....."
];

export function soulPalette(mode: SoulMode): { fill: string; hi: string; outline: string; glow: string } {
  switch (mode) {
    case "blue":
      return { fill: "#2563eb", hi: "#93c5fd", outline: "#0b1120", glow: "rgba(59, 130, 246, 0.45)" };
    case "green":
      return { fill: "#10b981", hi: "#a7f3d0", outline: "#052e16", glow: "rgba(16, 185, 129, 0.45)" };
    case "yellow":
      return { fill: "#facc15", hi: "#fef9c3", outline: "#422006", glow: "rgba(250, 204, 21, 0.45)" };
    default:
      return { fill: "#ef4444", hi: "#fecaca", outline: "#450a0a", glow: "rgba(239, 68, 68, 0.45)" };
  }
}

/** Crisp pixel heart (Continuity Soul) with mode colors & optional upside-down yellow shooter mode. */
export function drawPixelHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  mode: SoulMode,
  scale = 1.6,
  options?: { cracked?: boolean; alpha?: number; glow?: boolean; upsideDown?: boolean }
): void {
  const pal = soulPalette(mode);
  const grid = options?.cracked ? HEART_CRACKED_GRID : HEART_GRID;
  const rows = grid.length;
  const cols = grid[0].length;
  const px = Math.max(1, Math.round(scale));
  const w = cols * px;
  const h = rows * px;

  ctx.save();
  if (options?.alpha !== undefined) ctx.globalAlpha = Math.max(0, options.alpha);
  if (options?.glow) {
    ctx.fillStyle = pal.glow;
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), w * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(Math.round(cx), Math.round(cy));
  if (options?.upsideDown) ctx.scale(1, -1);

  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      ctx.fillStyle = ch === "1" ? pal.outline : ch === "3" ? pal.hi : pal.fill;
      ctx.fillRect(Math.round(-w / 2 + c * px), Math.round(-h / 2 + r * px), px, px);
    }
  }
  ctx.restore();
}

/** Draw Undertale-style directional Green Soul electromagnetic shield. */
export function drawGreenShield(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Direction,
  radius: number,
  parryFlash: number
): void {
  ctx.save();
  // Subtle outer tracking ring
  ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const angleMap: Record<Direction, number> = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2
  };
  const a = angleMap[dir];
  const spread = 0.72;

  ctx.strokeStyle = parryFlash > 0 ? "#fef08a" : "#38bdf8";
  ctx.lineWidth = parryFlash > 0 ? 7 : 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, a - spread, a + spread);
  ctx.stroke();

  // Crisp shield end-caps
  ctx.fillStyle = parryFlash > 0 ? "#ffffff" : "#7dd3fc";
  for (const endA of [a - spread, a + spread]) {
    ctx.fillRect(Math.round(cx + Math.cos(endA) * radius - 3), Math.round(cy + Math.sin(endA) * radius - 3), 6, 6);
  }
  ctx.restore();
}

/** Crisp Undertale black frame with sharp pixel border (never blurry). */
export function drawUndertaleBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor = "#ffffff",
  fillColor = "#04050a",
  borderWidth = 4
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(rx + borderWidth / 2, ry + borderWidth / 2, rw - borderWidth, rh - borderWidth);
  ctx.restore();
}

/** Crisp white Undertale enemy speech bubble pointing left toward the Boss sprite. */
export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  accentColor = "#090a14"
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.save();
  // Crisp white rounded-pixel box + left pointer triangle
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(rx + 4, ry, rw - 8, rh);
  ctx.fillRect(rx, ry + 4, rw, rh - 8);
  // Pointer triangle on left edge
  ctx.beginPath();
  ctx.moveTo(rx, ry + 26);
  ctx.lineTo(rx - 16, ry + 34);
  ctx.lineTo(rx, ry + 44);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);

  ctx.fillStyle = accentColor;
  ctx.font = "bold 17px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, text, rw - 24);
  lines.slice(0, 4).forEach((ln, idx) => {
    ctx.fillText(ln, rx + 12, ry + 12 + idx * 24);
  });
  ctx.restore();
}

/** CJK + Latin word wrapper for crisp Canvas dialogue boxes. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    let line = "";
    for (const ch of para) {
      const candidate = line + ch;
      if (ctx.measureText(candidate).width > maxWidth && line.length > 0) {
        out.push(line);
        line = ch;
      } else {
        line = candidate;
      }
    }
    if (line.length > 0 || para.length === 0) out.push(line);
  }
  return out;
}

/** Spinning 4-point Undertale Save Star (`✦`). */
export function drawSaveStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, scale = 1): void {
  const pulse = 0.88 + Math.sin(t * 4.2) * 0.14;
  const rOut = Math.round(16 * scale * pulse);
  const rIn = Math.round(5 * scale);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  // Soft cyan/gold halo
  ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, rOut * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(Math.sin(t * 2.1) * 0.22);
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (i * Math.PI) / 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Inner bright ivory spark
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}
