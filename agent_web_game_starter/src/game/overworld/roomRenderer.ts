import { drawPixelHeart, drawUndertaleBox, wrapText } from "../art/pixelCanvas";
import { drawOverworldProp, drawPlayerSprite } from "../art/pixelSprites";
import { drawPortrait } from "../art/portraits";
import { getCurrentObjective, TILE_PX } from "../data/rooms";
import type {
  DialogueLine,
  DifficultyMode,
  Direction,
  RoomDecor,
  RoomDef,
  RoomFloorZone,
  RoomTheme,
  RouteState
} from "../types";

interface ThemeAccent {
  bgSpace: string;
  nebula: string;
  wallTop: string;
  wallFace: string;
  wallTrim: string;
  conduit: string;
  ambientDot: string;
}

// 60-30-10 color discipline: every room uses calm neutral graphite steel for the 60% floor base,
// reserving crisp theme accents for wall trim, conduits, and bounded architectural zones!
const THEME_ACCENTS: Record<RoomTheme, ThemeAccent> = {
  airlock: {
    bgSpace: "#050711",
    nebula: "rgba(56, 189, 248, 0.08)",
    wallTop: "#44506a",
    wallFace: "#242b3d",
    wallTrim: "#38bdf8",
    conduit: "rgba(56, 189, 248, 0.65)",
    ambientDot: "#bae6fd"
  },
  cryo: {
    bgSpace: "#040b14",
    nebula: "rgba(34, 211, 238, 0.09)",
    wallTop: "#3d5e73",
    wallFace: "#1f3445",
    wallTrim: "#67e8f9",
    conduit: "rgba(34, 211, 238, 0.65)",
    ambientDot: "#cffafe"
  },
  vault: {
    bgSpace: "#0a0705",
    nebula: "rgba(251, 191, 36, 0.09)",
    wallTop: "#63513d",
    wallFace: "#33281d",
    wallTrim: "#fbbf24",
    conduit: "rgba(251, 191, 36, 0.68)",
    ambientDot: "#fde68a"
  },
  relay: {
    bgSpace: "#080512",
    nebula: "rgba(168, 85, 247, 0.10)",
    wallTop: "#4f376e",
    wallFace: "#2a1c3d",
    wallTrim: "#e879f9",
    conduit: "rgba(232, 121, 249, 0.68)",
    ambientDot: "#f0abfc"
  },
  corridor: {
    bgSpace: "#0b0608",
    nebula: "rgba(239, 68, 68, 0.08)",
    wallTop: "#573940",
    wallFace: "#2e1d22",
    wallTrim: "#f87171",
    conduit: "rgba(239, 68, 68, 0.70)",
    ambientDot: "#fca5a5"
  },
  sanctum: {
    bgSpace: "#03050d",
    nebula: "rgba(250, 204, 21, 0.08)",
    wallTop: "#475569",
    wallFace: "#1e293b",
    wallTrim: "#fde047",
    conduit: "rgba(250, 204, 21, 0.78)",
    ambientDot: "#fef08a"
  }
};

function hash01(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export interface OverworldRenderState {
  room: RoomDef;
  route: RouteState;
  playerX: number;
  playerY: number;
  playerDir: Direction;
  walkFrame: number;
  t: number;
  promptLabel: string | null;
  dialogue: DialogueLine[] | null;
  dialogueIdx: number;
  typedChars: number;
  menuOpen: boolean;
  menuIdx: number;
  menuSub: "root" | "items" | "status";
  itemIdx: number;
}

export function renderOverworld(ctx: CanvasRenderingContext2D, st: OverworldRenderState): void {
  const pal = THEME_ACCENTS[st.room.theme];
  const roomW = st.room.cols * TILE_PX;
  const roomH = st.room.rows * TILE_PX;
  const ox = Math.round((1280 - roomW) / 2);
  const oy = Math.round((720 - roomH) / 2) + 8;

  ctx.save();
  // 1. Deep Starfield Void Backdrop
  ctx.fillStyle = st.room.theme === "sanctum" && st.route.kills >= 4 ? "#120408" : pal.bgSpace;
  ctx.fillRect(0, 0, 1280, 720);

  const neb = ctx.createRadialGradient(640, 360, 100, 640, 360, 680);
  neb.addColorStop(0, st.room.theme === "sanctum" && st.route.kills >= 4 ? "rgba(239,68,68,0.14)" : pal.nebula);
  neb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, 1280, 720);

  for (let i = 0; i < 95; i++) {
    const sx = Math.round(hash01(i * 3.1 + 1) * 1280);
    const sy = Math.round(hash01(i * 7.3 + 19) * 720);
    const twinkle = 0.3 + Math.max(0, Math.sin(st.t * 2.2 + i * 1.7)) * 0.65;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = i % 6 === 0 ? pal.ambientDot : "#e2e8f0";
    const sz = i % 9 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }
  ctx.globalAlpha = 1;

  // 2. Room World Layer
  ctx.save();
  ctx.translate(ox, oy);

  // Neutral calm structural steel deck (60% base — never loud colored puddle!)
  for (let r = 0; r < st.room.rows; r++) {
    for (let c = 0; c < st.room.cols; c++) {
      const tx = c * TILE_PX;
      const ty = r * TILE_PX;
      const isSanctumVoid = st.room.theme === "sanctum" && (r < 3 || r >= 10);
      if (isSanctumVoid) {
        ctx.fillStyle = st.route.kills >= 4 ? "#120408" : "#03050d";
        ctx.fillRect(tx, ty, TILE_PX, TILE_PX);
        const sSeed = r * 37 + c * 19;
        if (hash01(sSeed) > 0.52) {
          const sx = tx + Math.round(hash01(sSeed + 3) * 38) + 4;
          const sy = ty + Math.round(hash01(sSeed + 7) * 38) + 4;
          ctx.fillStyle = st.route.kills >= 4 ? "#fca5a5" : hash01(sSeed + 11) > 0.6 ? "#fde047" : "#7dd3fc";
          ctx.fillRect(sx, sy, 3, 3);
        }
        continue;
      }

      ctx.fillStyle = (r + c) % 2 === 0 ? "#161b29" : "#121723";
      ctx.fillRect(tx, ty, TILE_PX, TILE_PX);
      ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
      ctx.fillRect(tx + 4, ty + 4, 2, 2);
      ctx.fillRect(tx + TILE_PX - 6, ty + TILE_PX - 6, 2, 2);
    }
  }

  // Distinct Bounded Architectural Sub-Zones (30% framing hierarchy!)
  for (const z of st.room.zones) {
    drawFloorZone(ctx, z, pal, st.t);
  }

  // Room-Specific Conduits & Wiring
  drawRoomConduits(ctx, st.room, st.route, pal, st.t);

  // Crisp Beveled Solid Walls
  drawRoomWalls(ctx, st.room, pal);

  // Panoramic Viewports along North Wall
  drawNorthViewports(ctx, st.room, pal, st.t);

  // Sculpted Environmental Storytelling Decor (racks, barricades, craters, pillars, signs!)
  for (const d of st.room.decor) {
    drawRoomDecor(ctx, d, pal, st.t);
  }

  // Glowing Exit Thresholds (supports Left, Right, Top Secret Hatch, Bottom Return!)
  for (const ex of st.room.exits) {
    const locked =
      (ex.requireEnemyResolved && !st.route.outcomes[ex.requireEnemyResolved]) ||
      (ex.requireFlag && !st.route.flags[ex.requireFlag]);
    const col = locked ? "#ef4444" : "#34d399";
    const pulse = 0.55 + Math.sin(st.t * 4.5) * 0.25;
    ctx.fillStyle = locked ? `rgba(239, 68, 68, ${pulse * 0.35})` : `rgba(52, 211, 153, ${pulse * 0.35})`;
    ctx.fillRect(ex.rect.x, ex.rect.y, ex.rect.w, ex.rect.h);
    ctx.fillStyle = col;
    if (ex.edge === "left") ctx.fillRect(ex.rect.x + 4, ex.rect.y + 8, 6, ex.rect.h - 16);
    else if (ex.edge === "right") ctx.fillRect(ex.rect.x + ex.rect.w - 10, ex.rect.y + 8, 6, ex.rect.h - 16);
    else if (ex.edge === "top") ctx.fillRect(ex.rect.x + 8, ex.rect.y + 4, ex.rect.w - 16, 6);
    else ctx.fillRect(ex.rect.x + 8, ex.rect.y + ex.rect.h - 10, ex.rect.w - 16, 6);
  }

  // Focused Overhead Spotlights highlighting key focal points!
  for (const sp of st.room.spotlights) {
    const g = ctx.createRadialGradient(sp.x, sp.y, 10, sp.x, sp.y, sp.radius);
    g.addColorStop(0, sp.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Y-sorted Interactive Objects & Player
  const drawables: Array<{ sortY: number; draw: () => void }> = [];
  for (const obj of st.room.objects) {
    if ((obj.pickupItemId || obj.pickupGearId) && st.route.flags[`picked_${obj.id}`]) continue;
    const outcome = obj.enemyId ? st.route.outcomes[obj.enemyId] : undefined;
    const swActive = obj.switchIndex !== undefined ? !!st.route.flags[`cryo_sw_${obj.switchIndex}`] : false;

    drawables.push({
      sortY: obj.kind === "relay_switch" ? 0 : obj.y + obj.h,
      draw: () =>
        drawOverworldProp(ctx, obj.kind, obj.x, obj.y, obj.w, obj.h, st.t, {
          active: swActive,
          spared: outcome === "spared",
          destroyed: outcome === "destroyed"
        })
    });
  }
  drawables.push({
    sortY: st.playerY,
    draw: () => drawPlayerSprite(ctx, st.playerX, st.playerY, st.playerDir, st.walkFrame)
  });
  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) d.draw();

  // Subtle Ambient Motes
  for (let i = 0; i < 16; i++) {
    const px = ((hash01(i * 11.3) * (roomW - 96) + st.t * (10 + (i % 4) * 4)) % (roomW - 96)) + 48;
    const rawY = hash01(i * 5.7) * (roomH - 140) + st.t * (st.room.theme === "cryo" ? 18 : -10);
    const py = (((rawY % (roomH - 140)) + (roomH - 140)) % (roomH - 140)) + 96;
    ctx.fillStyle = pal.ambientDot;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(Math.round(px), Math.round(py), 3, 3);
  }
  ctx.globalAlpha = 1;

  // Interactive `[Z] Label` Prompt
  if (st.promptLabel && !st.dialogue && !st.menuOpen) {
    const bw = Math.max(128, st.promptLabel.length * 16 + 46);
    const bx = Math.max(12, Math.min(roomW - bw - 12, Math.round(st.playerX - bw / 2)));
    const by = Math.max(16, Math.round(st.playerY - 82));
    drawUndertaleBox(ctx, bx, by, bw, 32, "#fde047", "#04050a", 2);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 14px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`[Z] ${st.promptLabel}`, bx + bw / 2, by + 16);
  }

  ctx.restore();

  // 3. Crisp Header with Mini Route Map (`01-02-03-04-05`) + Bottom Objective Bar
  renderOverworldHeader(ctx, st);

  // 4. Undertale Dialogue Box Overlay
  if (st.dialogue) {
    renderOverworldDialogue(ctx, st.dialogue[st.dialogueIdx], st.typedChars, st.t);
  }

  // 5. Quick Undertale Field Menu
  if (st.menuOpen) {
    renderFieldMenu(ctx, st);
  }

  ctx.restore();
}

function drawFloorZone(ctx: CanvasRenderingContext2D, z: RoomFloorZone, pal: ThemeAccent, t: number): void {
  ctx.save();
  if (z.kind === "walkway") {
    ctx.fillStyle = "#20273b";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(z.x, z.y, z.w, 3);
    ctx.fillRect(z.x, z.y + z.h - 3, z.w, 3);
    // Subtle panel seam joints along walkway
    ctx.fillStyle = "rgba(9, 10, 20, 0.35)";
    for (let sx = z.x + 48; sx < z.x + z.w - 12; sx += 96) {
      ctx.fillRect(sx, z.y + 4, 2, z.h - 8);
    }
  } else if (z.kind === "grate") {
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = "rgba(148, 163, 184, 0.14)";
    for (let gy = z.y + 8; gy < z.y + z.h - 6; gy += 10) {
      ctx.fillRect(z.x + 6, gy, z.w - 12, 3);
    }
    ctx.strokeStyle = "rgba(148, 163, 184, 0.42)";
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
  } else if (z.kind === "cryo_bay") {
    ctx.fillStyle = "#0e293b";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    ctx.fillStyle = "rgba(103, 232, 249, 0.08)";
    ctx.fillRect(z.x + 6, z.y + 6, z.w - 12, z.h - 12);
  } else if (z.kind === "warm_pad") {
    ctx.fillStyle = "#291e14";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    ctx.strokeStyle = "rgba(253, 224, 71, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(z.x + 7, z.y + 7, z.w - 14, z.h - 14);
  } else if (z.kind === "hazard_pad") {
    ctx.fillStyle = "#1c181d";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = pal.wallTrim;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    // Crisp OSHA hazard dashes along west & east edges
    for (let hy = z.y + 6; hy < z.y + z.h - 10; hy += 18) {
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(z.x + 4, hy, 6, 9);
      ctx.fillRect(z.x + z.w - 10, hy, 6, 9);
    }
  } else if (z.kind === "evidence_pad") {
    ctx.fillStyle = "#1a273c";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    const pulse = 0.65 + Math.sin(t * 4) * 0.25;
    ctx.strokeStyle = `rgba(224, 242, 254, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
  } else if (z.kind === "server_pit") {
    ctx.fillStyle = "#080414";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    // Blinking purple fiber LEDs recessed inside pit
    for (let i = 0; i < 12; i++) {
      const lx = z.x + 14 + ((i * 23) % Math.max(20, z.w - 28));
      const ly = z.y + 12 + ((i * 19) % Math.max(20, z.h - 24));
      ctx.fillStyle = Math.sin(t * 5 + i * 1.3) > 0 ? "#f0abfc" : "#4c1d95";
      ctx.fillRect(lx, ly, 5, 5);
    }
  } else if (z.kind === "void_breach") {
    ctx.fillStyle = "#03050d";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#38bdf8" : "#ffffff";
      ctx.fillRect(
        Math.round(z.x + 8 + hash01(i * 9.1) * (z.w - 16)),
        Math.round(z.y + 8 + hash01(i * 4.3) * (z.h - 16)),
        2,
        2
      );
    }
    // Flickering cyan containment forcefield along torn breach rim!
    const alpha = 0.45 + Math.sin(t * 11) * 0.2;
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
  } else if (z.kind === "sanctum_carpet") {
    ctx.fillStyle = "#1b1d36";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    for (let dx = z.x + 84; dx < z.x + z.w - 60; dx += 120) {
      ctx.strokeStyle = "rgba(253, 224, 71, 0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx, z.y + z.h / 2 - 22);
      ctx.lineTo(dx + 22, z.y + z.h / 2);
      ctx.lineTo(dx, z.y + z.h / 2 + 22);
      ctx.lineTo(dx - 22, z.y + z.h / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Crisp subtle floor zone stencil tag in bottom-right of bounded pad
  if (z.label) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.48)";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const rightInset = z.kind === "hazard_pad" ? 16 : 8;
    ctx.fillText(z.label, z.x + z.w - rightInset, z.y + z.h - 5);
  }
  ctx.restore();
}

function drawRoomConduits(
  ctx: CanvasRenderingContext2D,
  room: RoomDef,
  route: RouteState,
  pal: ThemeAccent,
  t: number
): void {
  const W = room.cols * TILE_PX;
  const midY = TILE_PX * 6.5;

  if (room.theme !== "vault") {
    ctx.fillStyle = pal.conduit;
    ctx.fillRect(TILE_PX, midY - 2, W - TILE_PX * 2, 4);
    const pulseX = TILE_PX + ((t * 155) % (W - TILE_PX * 2));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(pulseX), midY - 4, 16, 8);
  }

  if (room.theme === "cryo") {
    // Glowing power lines connecting the 3 cryo switches cleanly to East Door + North Vault Hatch!
    const swPos = [
      [TILE_PX * 5.4, TILE_PX * 9.5],
      [TILE_PX * 12.0, TILE_PX * 9.5],
      [TILE_PX * 18.4, TILE_PX * 3.9]
    ];
    swPos.forEach(([sx, sy], idx) => {
      const lit = !!route.flags[`cryo_sw_${idx}`];
      ctx.strokeStyle = lit ? "#34d399" : "rgba(239, 68, 68, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, midY);
      ctx.lineTo(W - TILE_PX, midY);
      ctx.stroke();
    });
    // Wire from Switch γ straight to North Secret Hatch (02B)!
    ctx.strokeStyle = route.flags.cryo_sw_2 ? "#fde047" : "rgba(239, 68, 68, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TILE_PX * 18.4, TILE_PX * 3.9);
    ctx.lineTo(TILE_PX * 16.0, TILE_PX * 3.9);
    ctx.lineTo(TILE_PX * 16.0, TILE_PX * 2.1);
    ctx.stroke();
  } else if (room.theme === "relay") {
    const morse = [18, 18, 18, 44, 44, 44, 18, 18, 18];
    let mx = TILE_PX * 4.2;
    for (let i = 0; i < morse.length; i++) {
      const glow = Math.sin(t * 5 - i * 0.6) > 0.1;
      ctx.fillStyle = glow ? "#fde047" : "rgba(168, 85, 247, 0.45)";
      ctx.fillRect(mx, midY - 16, morse[i], 5);
      ctx.fillRect(mx, midY + 11, morse[i], 5);
      mx += morse[i] + 16;
    }
  } else if (room.theme === "corridor") {
    const strobe = Math.max(0, Math.sin(t * 4.2)) * 0.08;
    ctx.fillStyle = `rgba(239, 68, 68, ${strobe.toFixed(3)})`;
    ctx.fillRect(TILE_PX * 14.5, TILE_PX * 2.8, TILE_PX * 6.0, TILE_PX * 7.4);
  }
}

function drawRoomWalls(ctx: CanvasRenderingContext2D, room: RoomDef, pal: ThemeAccent): void {
  for (const w of room.walls) {
    // Skip void_breach / server_pit wall-collision boxes so their rich floor zones stay visible!
    const overlapsPitOrBreach = room.zones.some(
      (z) =>
        (z.kind === "void_breach" || z.kind === "server_pit") &&
        w.x < z.x + z.w &&
        w.x + w.w > z.x &&
        w.y < z.y + z.h &&
        w.y + w.h > z.y
    );
    if (overlapsPitOrBreach && w.y >= TILE_PX * 2 && w.h < TILE_PX * 3) continue;

    if (room.theme === "sanctum") {
      if (w.y === 0 || w.y >= TILE_PX * 11) continue;
      if (w.w > TILE_PX * 10) {
        const isNorthRail = w.y < TILE_PX * 5;
        const railY = isNorthRail ? w.y + w.h - 10 : w.y;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(w.x, railY - 2, w.w, 12);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(w.x, railY + 2, w.w, 4);
        for (let px = w.x + 36; px < w.x + w.w - 24; px += 96) {
          ctx.fillStyle = "#090a14";
          ctx.fillRect(px - 2, railY - 10, 16, 24);
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(px, railY - 8, 12, 20);
          ctx.fillStyle = "#fef9c3";
          ctx.fillRect(px + 3, railY - 4, 6, 6);
        }
        continue;
      }
      const topY = Math.max(w.y, TILE_PX * 3 + 12);
      const botY = Math.min(w.y + w.h, TILE_PX * 10 - 12);
      if (botY <= topY) continue;
      ctx.fillStyle = pal.wallFace;
      ctx.fillRect(w.x, topY, w.w, botY - topY);
      ctx.strokeStyle = "#090a14";
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x + 1, topY + 1, w.w - 2, botY - topY - 2);
      ctx.fillStyle = pal.wallTrim;
      ctx.fillRect(w.x + 4, botY - 5, Math.max(0, w.w - 8), 3);
      continue;
    }

    ctx.fillStyle = pal.wallFace;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = pal.wallTop;
    ctx.fillRect(w.x, w.y, w.w, Math.min(20, w.h * 0.38));

    if (w.y === 0 && w.w > TILE_PX * 6) {
      ctx.fillStyle = "rgba(9, 10, 20, 0.35)";
      for (let rx = w.x + TILE_PX * 2; rx < w.x + w.w - TILE_PX; rx += TILE_PX * 2) {
        ctx.fillRect(rx, 20, 6, w.h - 24);
      }
    }

    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    ctx.fillStyle = pal.wallTrim;
    ctx.fillRect(w.x + 4, w.y + w.h - 5, Math.max(0, w.w - 8), 3);
  }
}

function drawRoomDecor(ctx: CanvasRenderingContext2D, d: RoomDecor, pal: ThemeAccent, t: number): void {
  ctx.save();
  if (d.kind === "cargo_stack") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, 12);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(d.x + 10, d.y + d.h / 2, d.w - 20, 6);
  } else if (d.kind === "server_rack") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    for (let sx = d.x + 10; sx < d.x + d.w - 14; sx += 22) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(sx, d.y + 6, 16, d.h - 12);
      const blink = Math.sin(t * 6 + sx) > 0;
      ctx.fillStyle = blink ? pal.wallTrim : "#475569";
      ctx.fillRect(sx + 4, d.y + 12, 8, 4);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(sx + 4, d.y + 22, 8, 4);
    }
  } else if (d.kind === "desk_unit") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(d.x + 14, d.y + 10, 42, 16);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(d.x + 70, d.y + 12, 22, 10);
  } else if (d.kind === "barricade") {
    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    for (let bx = d.x + 6; bx < d.x + d.w - 10; bx += 18) {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(bx, d.y + 6, 9, d.h - 12);
    }
  } else if (d.kind === "crater") {
    // Scorched outer blast ring + molten railgun gouge
    ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
    ctx.fillRect(d.x - 6, d.y - 4, d.w + 12, d.h + 8);
    ctx.fillStyle = "#090407";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#1c0d10";
    ctx.fillRect(d.x + 8, d.y + 6, d.w - 16, d.h - 12);
    ctx.strokeStyle = "rgba(249, 115, 22, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
    // Jagged scorch gouge & pulsing molten ember crack
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(d.x + 14, d.y + Math.round(d.h * 0.45), d.w - 28, 4);
    ctx.fillStyle = Math.sin(t * 7 + d.x) > 0 ? "#fde047" : "#fb923c";
    ctx.fillRect(d.x + Math.round(d.w * 0.35), d.y + Math.round(d.h * 0.42), 26, 5);
    ctx.fillRect(d.x + Math.round(d.w * 0.62), d.y + Math.round(d.h * 0.32), 6, 12);
  } else if (d.kind === "frost_drift") {
    ctx.fillStyle = "rgba(165, 243, 252, 0.16)";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "rgba(224, 242, 254, 0.32)";
    ctx.fillRect(d.x + 10, d.y + 8, d.w - 24, 10);
  } else if (d.kind === "med_cross_inlay") {
    ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
    ctx.fillRect(d.x + d.w * 0.35, d.y, d.w * 0.3, d.h);
    ctx.fillRect(d.x, d.y + d.h * 0.35, d.w, d.h * 0.3);
  } else if (d.kind === "holo_sign" && d.text) {
    ctx.fillStyle = "#090a14";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = pal.wallTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = pal.wallTrim;
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.text, d.x + d.w / 2, d.y + d.h / 2);
  } else if (d.kind === "gold_pillar") {
    // Sculpted Judgement Hall golden obelisk pillar + subtle light ray
    ctx.fillStyle = "rgba(253, 224, 71, 0.09)";
    ctx.fillRect(d.x - 6, d.y + d.h, d.w + 12, 42);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(d.x + 8, d.y + 8, d.w - 16, d.h - 16);
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(d.x + 12, d.y + 12, d.w - 24, 10);
  }
  ctx.restore();
}

function drawNorthViewports(ctx: CanvasRenderingContext2D, room: RoomDef, pal: ThemeAccent, t: number): void {
  if (room.theme === "sanctum" || room.theme === "vault") return;
  const slots =
    room.theme === "cryo"
      ? [{ x: TILE_PX * 4.2, w: TILE_PX * 4.2, showYuanwang: true }]
      : [
          { x: TILE_PX * 4.2, w: TILE_PX * 4.2, showYuanwang: true },
          { x: TILE_PX * 13.5, w: TILE_PX * 4.2, showYuanwang: false }
        ];

  for (const s of slots) {
    ctx.fillStyle = "#040610";
    ctx.fillRect(s.x, 14, s.w, 60);

    for (let i = 0; i < 14; i++) {
      const seed = s.x + i * 17;
      ctx.fillStyle = i % 4 === 0 ? pal.wallTrim : "#f8fafc";
      ctx.fillRect(
        s.x + 8 + Math.round(hash01(seed) * (s.w - 16)),
        18 + Math.round(hash01(seed + 5) * 48),
        2,
        2
      );
    }

    if (s.showYuanwang) {
      const yx = s.x + s.w * 0.52;
      const yy = 44;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(yx - 42, yy - 3, 84, 6);
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.strokeRect(yx - 14, yy - 14, 8, 28);
      ctx.strokeRect(yx + 2, yy - 14, 8, 28);
      ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
      ctx.fillRect(yx + 24, yy - 15, 14, 3);
      ctx.fillRect(yx + 24, yy + 12, 14, 3);
      if (Math.sin(t * 4) > 0) {
        ctx.fillStyle = "#fde047";
        ctx.fillRect(yx - 44, yy - 1, 3, 3);
      }
    } else {
      const drift = Math.sin(t * 0.6) * 4;
      ctx.fillStyle = "#334155";
      ctx.fillRect(s.x + 42, 34 + drift, 54, 15);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(s.x + 110, 42 - drift, 26, 10);
      ctx.fillStyle = "#ef4444";
      if (Math.sin(t * 3.5) > 0.2) ctx.fillRect(s.x + 90, 38 + drift, 4, 4);
    }

    ctx.fillStyle = "rgba(186, 230, 253, 0.14)";
    ctx.fillRect(s.x + 14, 14, 8, 60);
    ctx.strokeStyle = pal.wallTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x, 14, s.w, 60);
  }
}

function difficultyLabel(d: DifficultyMode): string {
  return d === "story" ? "护航" : d === "hardcore" ? "极限" : "标准";
}

function renderOverworldHeader(ctx: CanvasRenderingContext2D, st: OverworldRenderState): void {
  ctx.save();
  ctx.fillStyle = "rgba(4, 5, 10, 0.92)";
  ctx.fillRect(0, 0, 1280, 50);
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fillRect(0, 49, 1280, 2);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
  const titleText = `✦ ${st.room.name}`;
  ctx.fillStyle = "#fde047";
  ctx.fillText(titleText, 22, 25);

  // Compact Mini Ship Route Map (`01—02—03—04—05` + `02B` vault dot!)
  const nodes = [
    { id: "airlock", code: "01", x: 520 },
    { id: "cryo", code: "02", x: 566 },
    { id: "relay", code: "03", x: 612 },
    { id: "corridor", code: "04", x: 658 },
    { id: "sanctum", code: "05", x: 704 }
  ];
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(520, 25);
  ctx.lineTo(704, 25);
  ctx.stroke();

  for (const n of nodes) {
    const active = st.room.id === n.id || (st.room.id === "vault" && n.id === "cryo");
    const visited = !!st.route.flags[`entered_${n.id}`] || active;
    ctx.fillStyle = active ? "#fde047" : visited ? "#38bdf8" : "#1e293b";
    ctx.beginPath();
    ctx.arc(n.x, 25, active ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Tiny Vault 02B indicator pip above node 02
  const vaultVisited = !!st.route.flags.entered_vault || st.room.id === "vault";
  ctx.fillStyle = st.room.id === "vault" ? "#fde047" : vaultVisited ? "#34d399" : "#475569";
  ctx.fillRect(563, 7, 6, 6);

  // Right-aligned status telemetry (zero overlap!)
  ctx.textAlign = "right";
  ctx.font = "bold 15px 'JetBrains Mono', 'Noto Sans SC', monospace";
  const statStr = `[${difficultyLabel(st.route.difficulty)}]  LV ${st.route.lv}  ·  HP ${st.route.hp}/${st.route.maxHp}  ·  解耦 ${st.route.spares}  ·  摧毁 ${st.route.kills}`;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(statStr, 1256, 25);

  // Clean Bottom Navigation Objective + Quiet Controls Strip (hidden while dialogue open)
  if (!st.dialogue) {
    ctx.fillStyle = "rgba(4, 5, 10, 0.84)";
    ctx.fillRect(0, 672, 1280, 48);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(0, 672, 1280, 1);

    ctx.textAlign = "left";
    ctx.font = "bold 14px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(`◈ 当前目标：${getCurrentObjective(st.route)}`, 24, 696);

    ctx.textAlign = "right";
    ctx.font = "13px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("[WASD/方向]移动  [Z]互动  [C/Tab]背包与难度", 1070, 696);
  }
  ctx.restore();
}

function renderOverworldDialogue(
  ctx: CanvasRenderingContext2D,
  line: DialogueLine,
  typedChars: number,
  t: number
): void {
  const bx = 180;
  const by = 500;
  const bw = 920;
  const bh = 192;
  drawUndertaleBox(ctx, bx, by, bw, bh, "#ffffff", "#04050a", 4);

  const hasPortrait = !!line.portrait && line.portrait !== "none";
  const textX = hasPortrait ? bx + 148 : bx + 32;
  const textW = hasPortrait ? bw - 180 : bw - 64;
  const talking = typedChars < line.text.length;

  if (hasPortrait && line.portrait) {
    drawPortrait(ctx, line.portrait, bx + 22, by + 34, 108, t, talking);
  }

  ctx.save();
  if (line.speaker) {
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 17px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`【${line.speaker}】`, textX, by + 18);
  }

  const visible = line.text.slice(0, typedChars);
  ctx.fillStyle = line.color ?? "#f8fafc";
  ctx.font = "21px 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, visible, textW);
  const startY = line.speaker ? by + 50 : by + 28;
  lines.slice(0, 4).forEach((ln, idx) => {
    ctx.fillText(ln, textX, startY + idx * 34);
  });

  if (!talking) {
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("▼ [Z / 点击继续]", bx + bw - 22, by + bh - 26);
  }
  ctx.restore();
}

function renderFieldMenu(ctx: CanvasRenderingContext2D, st: OverworldRenderState): void {
  drawUndertaleBox(ctx, 48, 76, 240, 154, "#ffffff", "#04050a", 4);
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px 'JetBrains Mono', 'Noto Sans SC', monospace";
  ctx.textAlign = "left";
  ctx.fillText("小徐 · 远望号", 68, 108);
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`LV   ${st.route.lv}`, 68, 140);
  ctx.fillText(`HP   ${st.route.hp} / ${st.route.maxHp}`, 68, 168);
  ctx.fillStyle = "#fde047";
  ctx.fillText(`解耦 ${st.route.spares} · 摧毁 ${st.route.kills}`, 68, 198);

  drawUndertaleBox(ctx, 48, 244, 240, 210, "#ffffff", "#04050a", 4);
  const menuItems = [
    "随身补给 (ITEM)",
    "档案与装备 (STAT)",
    `难度：${difficultyLabel(st.route.difficulty)}`,
    "关闭菜单"
  ];
  ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
  menuItems.forEach((label, idx) => {
    const y = 284 + idx * 42;
    if (st.menuSub === "root" && st.menuIdx === idx) {
      drawPixelHeart(ctx, 72, y - 5, "red", 1.15);
      ctx.fillStyle = "#fde047";
    } else {
      ctx.fillStyle = "#f8fafc";
    }
    ctx.fillText(label, 92, y);
  });

  if (st.menuSub === "items") {
    drawUndertaleBox(ctx, 306, 76, 380, 378, "#ffffff", "#04050a", 4);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("✦ 随身补给包 (Z使用 / X返回)", 328, 110);
    if (st.route.items.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "17px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.fillText("（空空如也）", 336, 162);
    } else {
      ctx.font = "18px 'JetBrains Mono', 'Noto Sans SC', monospace";
      st.route.items.forEach((id, idx) => {
        const y = 154 + idx * 38;
        if (st.itemIdx === idx) {
          drawPixelHeart(ctx, 330, y - 5, "red", 1.1);
          ctx.fillStyle = "#fde047";
        } else {
          ctx.fillStyle = "#f8fafc";
        }
        ctx.fillText(`* ${itemNameLabel(id)}`, 352, y);
      });
    }
  } else if (st.menuSub === "status") {
    drawUndertaleBox(ctx, 306, 76, 460, 378, "#ffffff", "#04050a", 4);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 19px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("「远望号 · 外勤档案与装备」", 330, 110);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "16px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("身份：二班技术船员（无植入义体）", 330, 148);
    ctx.fillText(`路线倾向：${routeTendency(st.route)}`, 330, 180);
    ctx.fillText(`攻击力 (AT)：${st.route.atk}   防御力 (DF)：${st.route.def}`, 330, 212);
    ctx.fillText(`累计擦弹 / 盾反次数：${st.route.totalGraze}`, 330, 244);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("已装备外勤模块：", 330, 286);
    ctx.fillStyle = "#fde68a";
    ctx.font = "15px 'JetBrains Mono', 'Noto Sans SC', monospace";
    if (st.route.gear.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("（暂无 — 探索支线密室或和平解耦可获得强力模块！）", 330, 314);
    } else {
      st.route.gear.forEach((g, idx) => {
        ctx.fillText(`★ ${gearNameLabel(g)}`, 330, 314 + idx * 26);
      });
    }
  }
  ctx.restore();
}

function itemNameLabel(id: string): string {
  const map: Record<string, string> = {
    malt_tea: "烘烤麦芽热饮 (+12HP, +12TP)",
    protein_bar: "无菌蛋白谷饼 (+9HP)",
    ma_soup: "老马浓麦芽汤 (+18HP, +15TP)",
    fifth_ampoule: "第五协议稳定剂 (+15HP, +35TP)",
    nano_gel: "陈医生急救凝胶 (HP全满)"
  };
  return map[id] ?? id;
}

function gearNameLabel(id: string): string {
  const map: Record<string, string> = {
    med_shield: "MED-07 恒温护盾模块 (HP+6, DEF+2)",
    fifth_charm: "第五协议稳定护符 (HP+6, 无敌帧延长)",
    pulse_lens: "脉冲校准镜 (ATK+3, 暴击区加宽/射速提升)",
    vark_plate: "瓦尔克非AI陶瓷护板 (HP+4, DEF+3)"
  };
  return map[id] ?? id;
}

function routeTendency(r: RouteState): string {
  if (r.kills === 0 && r.spares > 0) return "✦ 守望共鸣（和平解耦路线）";
  if (r.kills >= 3 && r.spares === 0) return "⚠ 冷酷清除（毁灭路线）";
  if (r.kills === 0 && r.spares === 0) return "尚未定调";
  return "◈ 艰难权衡（中立路线）";
}
