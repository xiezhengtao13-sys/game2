import { drawPixelHeart, drawUndertaleBox, wrapText } from "../art/pixelCanvas";
import { drawOverworldProp, drawPlayerSprite } from "../art/pixelSprites";
import { drawPortrait } from "../art/portraits";
import type { DialogueLine, Direction, RoomDef, RoomTheme, RouteState } from "../types";
import { TILE_PX } from "../data/rooms";

interface ThemePalette {
  bgSpace: string;
  nebula: string;
  floorA: string;
  floorB: string;
  floorAccent: string;
  wallTop: string;
  wallFace: string;
  wallTrim: string;
  conduit: string;
  ambientDot: string;
}

const THEME_PALETTES: Record<RoomTheme, ThemePalette> = {
  airlock: {
    bgSpace: "#050712",
    nebula: "rgba(56, 189, 248, 0.08)",
    floorA: "#1a223a",
    floorB: "#151b30",
    floorAccent: "#f59e0b",
    wallTop: "#3f4d70",
    wallFace: "#232b44",
    wallTrim: "#38bdf8",
    conduit: "rgba(56, 189, 248, 0.58)",
    ambientDot: "#bae6fd"
  },
  cryo: {
    bgSpace: "#040d18",
    nebula: "rgba(34, 211, 238, 0.09)",
    floorA: "#112b40",
    floorB: "#0c2233",
    floorAccent: "#34d399",
    wallTop: "#33607c",
    wallFace: "#1d3d54",
    wallTrim: "#67e8f9",
    conduit: "rgba(34, 211, 238, 0.60)",
    ambientDot: "#cffafe"
  },
  relay: {
    bgSpace: "#090414",
    nebula: "rgba(168, 85, 247, 0.11)",
    floorA: "#20133d",
    floorB: "#180d30",
    floorAccent: "#facc15",
    wallTop: "#522b82",
    wallFace: "#2e174f",
    wallTrim: "#e879f9",
    conduit: "rgba(232, 121, 249, 0.62)",
    ambientDot: "#f0abfc"
  },
  corridor: {
    bgSpace: "#0d0608",
    nebula: "rgba(239, 68, 68, 0.09)",
    floorA: "#26181e",
    floorB: "#1c1116",
    floorAccent: "#ef4444",
    wallTop: "#57323c",
    wallFace: "#351c23",
    wallTrim: "#f87171",
    conduit: "rgba(239, 68, 68, 0.64)",
    ambientDot: "#fca5a5"
  },
  sanctum: {
    bgSpace: "#03050d",
    nebula: "rgba(250, 204, 21, 0.08)",
    floorA: "#161f38",
    floorB: "#10172b",
    floorAccent: "#fde047",
    wallTop: "#334155",
    wallFace: "#1e293b",
    wallTrim: "#fde047",
    conduit: "rgba(250, 204, 21, 0.72)",
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

/**
 * Renders crisp, vibrant Deltarune-style compact pixel rooms centered neatly in 1280x720.
 */
export function renderOverworld(ctx: CanvasRenderingContext2D, st: OverworldRenderState): void {
  const pal = THEME_PALETTES[st.room.theme];
  const roomW = st.room.cols * TILE_PX;
  const roomH = st.room.rows * TILE_PX;
  const ox = Math.round((1280 - roomW) / 2);
  const oy = Math.round((720 - roomH) / 2) + 8;

  ctx.save();
  // 1. Deep Starfield Void + Organic Nebula Backdrop
  ctx.fillStyle = pal.bgSpace;
  ctx.fillRect(0, 0, 1280, 720);

  // Soft deep-space nebula glow bands
  const neb = ctx.createRadialGradient(640, 360, 120, 640, 360, 680);
  neb.addColorStop(0, pal.nebula);
  neb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, 1280, 720);

  // Truly organic 2D twinkling starfield (zero diagonal line artifacts!)
  for (let i = 0; i < 90; i++) {
    const sx = Math.round(hash01(i * 3.1 + 1) * 1280);
    const sy = Math.round(hash01(i * 7.3 + 19) * 720);
    const twinkle = 0.35 + Math.max(0, Math.sin(st.t * 2.2 + i * 1.7)) * 0.65;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = i % 6 === 0 ? pal.ambientDot : "#e2e8f0";
    const sz = i % 9 === 0 ? 3 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }
  ctx.globalAlpha = 1;

  // 2. Room World Layer
  ctx.save();
  ctx.translate(ox, oy);

  // Crisp pixel deck tiles
  for (let r = 0; r < st.room.rows; r++) {
    for (let c = 0; c < st.room.cols; c++) {
      const tx = c * TILE_PX;
      const ty = r * TILE_PX;
      const isSanctumVoid = st.room.theme === "sanctum" && (r < 3 || r >= 10);
      if (isSanctumVoid) {
        ctx.fillStyle = "#03050d";
        ctx.fillRect(tx, ty, TILE_PX, TILE_PX);
        // Scattered glowing stars inside open starry rift!
        const sSeed = r * 37 + c * 19;
        if (hash01(sSeed) > 0.55) {
          const sx = tx + Math.round(hash01(sSeed + 3) * 38) + 4;
          const sy = ty + Math.round(hash01(sSeed + 7) * 38) + 4;
          ctx.fillStyle = hash01(sSeed + 11) > 0.65 ? "#fde047" : "#7dd3fc";
          ctx.fillRect(sx, sy, 3, 3);
        }
        continue;
      }

      ctx.fillStyle = (r + c) % 2 === 0 ? pal.floorA : pal.floorB;
      ctx.fillRect(tx, ty, TILE_PX, TILE_PX);
      // Subtle industrial deck corner rivets
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(tx + 4, ty + 4, 3, 3);
      ctx.fillRect(tx + TILE_PX - 7, ty + TILE_PX - 7, 3, 3);
    }
  }

  // Bespoke Room Floor Conduits & Rich Environmental Storytelling Craft
  drawRoomThemeFloorCraft(ctx, st.room, st.route, pal, st.t);

  // Crisp Beveled Solid Walls
  for (const w of st.room.walls) {
    if (st.room.theme === "sanctum") {
      // Top & bottom outer borders stay transparent starry space; inner parapets become golden bridge rails!
      if (w.y === 0 || w.y >= TILE_PX * 11) continue;
      if (w.w > TILE_PX * 10) {
        const isNorthRail = w.y < TILE_PX * 5;
        const railY = isNorthRail ? w.y + w.h - 10 : w.y;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(w.x, railY - 2, w.w, 12);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(w.x, railY + 2, w.w, 4);
        // Sculpted golden cathedral bridge lamps
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
      // Clip vertical bridge gateway walls strictly to bridge height (rows 3..10)
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
    ctx.fillRect(w.x, w.y, w.w, Math.min(22, w.h * 0.4));

    // Vertical structural bulkhead ribs across tall north wall
    if (w.y === 0 && w.w > TILE_PX * 8) {
      ctx.fillStyle = "rgba(9, 10, 20, 0.35)";
      for (let rx = TILE_PX * 2; rx < w.w - TILE_PX; rx += TILE_PX * 2) {
        ctx.fillRect(rx, 20, 6, w.h - 24);
      }
      // Wall utility conduits
      ctx.fillStyle = pal.wallTrim;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(TILE_PX, w.h - 18, w.w - TILE_PX * 2, 4);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    ctx.fillStyle = pal.wallTrim;
    ctx.fillRect(w.x + 4, w.y + w.h - 6, Math.max(0, w.w - 8), 3);
  }

  // Panoramic Space Viewports with Distant SS Yuanwang Silhouette!
  drawNorthViewports(ctx, st.room, pal, st.t);

  // Glowing Exit Thresholds
  for (const ex of st.room.exits) {
    const locked =
      (ex.requireEnemyResolved && !st.route.outcomes[ex.requireEnemyResolved]) ||
      (ex.requireFlag && !st.route.flags[ex.requireFlag]);
    const col = locked ? "#ef4444" : "#34d399";
    const pulse = 0.55 + Math.sin(st.t * 4.5) * 0.25;
    ctx.fillStyle = locked ? `rgba(239, 68, 68, ${pulse * 0.34})` : `rgba(52, 211, 153, ${pulse * 0.34})`;
    ctx.fillRect(ex.rect.x, ex.rect.y, ex.rect.w, ex.rect.h);
    ctx.fillStyle = col;
    const barX = ex.rect.x < 100 ? ex.rect.x + 4 : ex.rect.x + ex.rect.w - 10;
    ctx.fillRect(barX, ex.rect.y + 8, 6, ex.rect.h - 16);
  }

  // Y-sorted Props & Player
  const drawables: Array<{ sortY: number; draw: () => void }> = [];
  for (const obj of st.room.objects) {
    if (obj.pickupItemId && st.route.flags[`picked_${obj.id}`]) continue;
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

  // Floating Ambient Room Particles
  for (let i = 0; i < 18; i++) {
    const px = ((hash01(i * 11.3) * (roomW - 96) + st.t * (10 + (i % 4) * 5)) % (roomW - 96)) + 48;
    const rawY = hash01(i * 5.7) * (roomH - 140) + st.t * (st.room.theme === "cryo" ? 20 : -12);
    const py = (((rawY % (roomH - 140)) + (roomH - 140)) % (roomH - 140)) + 96;
    ctx.fillStyle = pal.ambientDot;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(Math.round(px), Math.round(py), 3, 3);
  }
  ctx.globalAlpha = 1;

  // Interactive `[Z] Label` Prompt
  if (st.promptLabel && !st.dialogue && !st.menuOpen) {
    const bw = Math.max(120, st.promptLabel.length * 16 + 44);
    const bx = Math.max(12, Math.min(roomW - bw - 12, Math.round(st.playerX - bw / 2)));
    const by = Math.max(16, Math.round(st.playerY - 82));
    drawUndertaleBox(ctx, bx, by, bw, 32, "#fde047", "#04050a", 2);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 14px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`[Z] ${st.promptLabel}`, bx + bw / 2, by + 16);
  }

  ctx.restore(); // end room translate

  // 3. Clean Non-Overlapping Top Header + Quiet Bottom Control Strip
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

function drawRoomThemeFloorCraft(
  ctx: CanvasRenderingContext2D,
  room: RoomDef,
  route: RouteState,
  pal: ThemePalette,
  t: number
): void {
  const W = room.cols * TILE_PX;
  const midY = TILE_PX * 6.5;

  // Central illuminated corridor walkway & pulsing spine conduit
  ctx.fillStyle = "rgba(9, 10, 20, 0.44)";
  ctx.fillRect(TILE_PX, midY - 28, W - TILE_PX * 2, 56);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(TILE_PX, midY - 28, W - TILE_PX * 2, 2);
  ctx.fillRect(TILE_PX, midY + 26, W - TILE_PX * 2, 2);
  ctx.fillStyle = pal.conduit;
  ctx.fillRect(TILE_PX, midY - 2, W - TILE_PX * 2, 4);

  const pulseX = TILE_PX + ((t * 155) % (W - TILE_PX * 2));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(pulseX), midY - 4, 18, 8);

  if (room.theme === "airlock") {
    // Yellow/Black docking hazard chevrons around Pioneer-1 collar & East airlock!
    for (let hy = TILE_PX * 4.5; hy < TILE_PX * 8.4; hy += 18) {
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(TILE_PX * 3.1, hy, 8, 9);
      ctx.fillRect(W - TILE_PX * 1.4, hy, 8, 9);
    }
    // Recessed floor airlock pressure grating panels
    for (const gx of [TILE_PX * 6.5, TILE_PX * 10.5, TILE_PX * 16.5]) {
      ctx.fillStyle = "rgba(9, 10, 20, 0.48)";
      ctx.fillRect(gx, TILE_PX * 3.2, 84, 52);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, TILE_PX * 3.2, 84, 52);
    }
  } else if (room.theme === "cryo") {
    // Frosted hydroponic floor grates + power lines from 3 switches to blast door
    for (const [fx, fy] of [
      [TILE_PX * 4.5, TILE_PX * 2.4],
      [TILE_PX * 10.0, TILE_PX * 2.4]
    ]) {
      ctx.fillStyle = "rgba(34, 211, 238, 0.14)";
      ctx.fillRect(fx, fy, 108, 66);
      ctx.strokeStyle = "rgba(103, 232, 249, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fy, 108, 66);
    }
    const swPos = [
      [TILE_PX * 5.6, TILE_PX * 9.6],
      [TILE_PX * 11.8, TILE_PX * 9.6],
      [TILE_PX * 17.9, TILE_PX * 3.5]
    ];
    swPos.forEach(([sx, sy], idx) => {
      const lit = !!route.flags[`cryo_sw_${idx}`];
      ctx.strokeStyle = lit ? "#34d399" : "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, midY);
      ctx.lineTo(W - TILE_PX, midY);
      ctx.stroke();
    });
  } else if (room.theme === "relay") {
    // Glowing Morse-code SOS bus + violet harmonic data tiles
    const morse = [18, 18, 18, 46, 46, 46, 18, 18, 18];
    let mx = TILE_PX * 4;
    for (let i = 0; i < morse.length; i++) {
      const glow = Math.sin(t * 5 - i * 0.6) > 0.1;
      ctx.fillStyle = glow ? "#fde047" : "rgba(168, 85, 247, 0.4)";
      ctx.fillRect(mx, midY - 16, morse[i], 6);
      ctx.fillRect(mx, midY + 10, morse[i], 6);
      mx += morse[i] + 18;
    }
    // Glowing server floor circuits north & south
    ctx.strokeStyle = "rgba(232, 121, 249, 0.25)";
    ctx.lineWidth = 2;
    for (let sx = TILE_PX * 3; sx < W - TILE_PX * 3; sx += TILE_PX * 3) {
      ctx.beginPath();
      ctx.moveTo(sx, TILE_PX * 2.2);
      ctx.lineTo(sx, midY - 28);
      ctx.moveTo(sx, midY + 28);
      ctx.lineTo(sx, TILE_PX * 10.6);
      ctx.stroke();
    }
  } else if (room.theme === "corridor") {
    // Railgun blast craters, cracked floor plates & rhythmic emergency crimson strobe
    for (const [cx, cy, rw, rh] of [
      [TILE_PX * 9.0, TILE_PX * 3.8, 124, 42],
      [TILE_PX * 12.6, TILE_PX * 7.6, 98, 34]
    ]) {
      ctx.fillStyle = "rgba(8, 3, 5, 0.72)";
      ctx.fillRect(cx, cy, rw, rh);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 2, cy + 2, rw - 4, rh - 4);
    }
    const strobe = Math.max(0, Math.sin(t * 4.5)) * 0.11;
    ctx.fillStyle = `rgba(239, 68, 68, ${strobe.toFixed(3)})`;
    ctx.fillRect(TILE_PX, TILE_PX * 2, W - TILE_PX * 2, room.rows * TILE_PX - TILE_PX * 3);
  } else if (room.theme === "sanctum") {
    // Golden starlight Judgement Bridge carpet + ceremonial diamond inlay
    ctx.fillStyle = "rgba(250, 204, 21, 0.12)";
    ctx.fillRect(TILE_PX * 1.5, midY - 58, W - TILE_PX * 3, 116);
    ctx.strokeStyle = "rgba(253, 224, 71, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(TILE_PX * 1.5, midY - 58, W - TILE_PX * 3, 116);
    for (let dx = TILE_PX * 3.5; dx < W - TILE_PX * 3; dx += TILE_PX * 3) {
      ctx.strokeStyle = "rgba(253, 224, 71, 0.3)";
      ctx.beginPath();
      ctx.moveTo(dx, midY - 22);
      ctx.lineTo(dx + 22, midY);
      ctx.lineTo(dx, midY + 22);
      ctx.lineTo(dx - 22, midY);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function drawNorthViewports(ctx: CanvasRenderingContext2D, room: RoomDef, pal: ThemePalette, t: number): void {
  if (room.theme === "sanctum") return;
  const slots = [
    { x: TILE_PX * 5, w: TILE_PX * 4.5, showYuanwang: true },
    { x: TILE_PX * 12.5, w: TILE_PX * 4.5, showYuanwang: false }
  ];
  for (const s of slots) {
    ctx.fillStyle = "#040610";
    ctx.fillRect(s.x, 14, s.w, 64);

    // Organic twinkling stars inside viewport
    for (let i = 0; i < 16; i++) {
      const seed = s.x + i * 17;
      const sx = s.x + 8 + Math.round(hash01(seed) * (s.w - 16));
      const sy = 20 + Math.round(hash01(seed + 5) * 52);
      ctx.fillStyle = i % 4 === 0 ? pal.wallTrim : "#f8fafc";
      ctx.fillRect(sx, sy, 2, 2);
    }

    if (s.showYuanwang) {
      // Distant SS Yuanwang silhouette with twin rotating rings & warm aft radiator glow!
      const yx = s.x + s.w * 0.52;
      const yy = 46;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(yx - 42, yy - 3, 84, 6);
      // Twin 440m rotating habitat rings
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.strokeRect(yx - 14, yy - 14, 8, 28);
      ctx.strokeRect(yx + 2, yy - 14, 8, 28);
      // Glowing amber radiator wings at stern
      ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
      ctx.fillRect(yx + 24, yy - 16, 14, 3);
      ctx.fillRect(yx + 24, yy + 13, 14, 3);
      // Blinking navigation beacon
      if (Math.sin(t * 4) > 0) {
        ctx.fillStyle = "#fde047";
        ctx.fillRect(yx - 44, yy - 1, 3, 3);
      }
    } else {
      // Sheared broken Charon hull debris drifting slowly across starfield
      const drift = Math.sin(t * 0.6) * 4;
      ctx.fillStyle = "#334155";
      ctx.fillRect(s.x + 48, 36 + drift, 56, 16);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(s.x + 118, 44 - drift, 26, 10);
      ctx.fillStyle = "#ef4444";
      if (Math.sin(t * 3.5) > 0.2) ctx.fillRect(s.x + 98, 40 + drift, 4, 4);
    }

    // Crisp glass glint + viewport frame
    ctx.fillStyle = "rgba(186, 230, 253, 0.14)";
    ctx.fillRect(s.x + 14, 14, 9, 64);
    ctx.fillRect(s.x + 28, 14, 3, 64);
    ctx.strokeStyle = pal.wallTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x, 14, s.w, 64);
  }
}

function renderOverworldHeader(ctx: CanvasRenderingContext2D, st: OverworldRenderState): void {
  ctx.save();
  ctx.fillStyle = "rgba(4, 5, 10, 0.90)";
  ctx.fillRect(0, 0, 1280, 50);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(0, 49, 1280, 2);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
  const titleText = `✦ ${st.room.name}`;
  ctx.fillStyle = "#fde047";
  ctx.fillText(titleText, 24, 25);

  const titleW = ctx.measureText(titleText).width;
  ctx.font = "14px 'JetBrains Mono', 'Noto Sans SC', monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(st.room.subtitle, 24 + titleW + 22, 25);

  // Right-aligned crisp player telemetry (ZERO overlap!)
  ctx.textAlign = "right";
  ctx.font = "bold 16px 'JetBrains Mono', 'Noto Sans SC', monospace";
  const statStr = `LV ${st.route.lv}   ·   HP ${st.route.hp}/${st.route.maxHp}   ·   解耦 ${st.route.spares}   ·   摧毁 ${st.route.kills}`;
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(statStr, 1256, 25);

  // Quiet bottom control bar when dialogue isn't occupying bottom
  if (!st.dialogue) {
    ctx.textAlign = "center";
    ctx.font = "13px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText("[WASD / 方向键] 移动    ·    [Z / 空格] 调查互动    ·    [C / Tab] 随身补给与档案    ·    [M] 音效", 640, 698);
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
  drawUndertaleBox(ctx, 48, 82, 220, 152, "#ffffff", "#04050a", 4);
  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px 'JetBrains Mono', 'Noto Sans SC', monospace";
  ctx.textAlign = "left";
  ctx.fillText("小徐 · 远望号", 68, 114);
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`LV   ${st.route.lv}`, 68, 148);
  ctx.fillText(`HP   ${st.route.hp} / ${st.route.maxHp}`, 68, 176);
  ctx.fillStyle = "#fde047";
  ctx.fillText(`解耦 ${st.route.spares} · 摧毁 ${st.route.kills}`, 68, 206);

  drawUndertaleBox(ctx, 48, 248, 220, 168, "#ffffff", "#04050a", 4);
  const menuItems = ["随身补给 (ITEM)", "船员档案 (STAT)", "关闭菜单"];
  ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
  menuItems.forEach((label, idx) => {
    const y = 286 + idx * 42;
    if (st.menuSub === "root" && st.menuIdx === idx) {
      drawPixelHeart(ctx, 72, y - 5, "red", 1.15);
      ctx.fillStyle = "#fde047";
    } else {
      ctx.fillStyle = "#f8fafc";
    }
    ctx.fillText(label, 92, y);
  });

  if (st.menuSub === "items") {
    drawUndertaleBox(ctx, 286, 82, 360, 334, "#ffffff", "#04050a", 4);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 18px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("✦ 随身补给包 (Z使用 / X返回)", 308, 114);
    if (st.route.items.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "17px 'JetBrains Mono', 'Noto Sans SC', monospace";
      ctx.fillText("（空空如也）", 316, 166);
    } else {
      ctx.font = "18px 'JetBrains Mono', 'Noto Sans SC', monospace";
      st.route.items.forEach((id, idx) => {
        const y = 158 + idx * 38;
        if (st.itemIdx === idx) {
          drawPixelHeart(ctx, 310, y - 5, "red", 1.1);
          ctx.fillStyle = "#fde047";
        } else {
          ctx.fillStyle = "#f8fafc";
        }
        ctx.fillText(`* ${itemNameLabel(id)}`, 332, y);
      });
    }
  } else if (st.menuSub === "status") {
    drawUndertaleBox(ctx, 286, 82, 420, 334, "#ffffff", "#04050a", 4);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 19px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("「远望号 · 外勤个人档案」", 310, 116);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "17px 'JetBrains Mono', 'Noto Sans SC', monospace";
    ctx.fillText("身份：二班技术船员（无植入义体）", 310, 158);
    ctx.fillText(`当前路线倾向：${routeTendency(st.route)}`, 310, 192);
    ctx.fillText(`攻击力 (AT)：${st.route.atk}   防御力 (DF)：${st.route.def}`, 310, 226);
    ctx.fillText(`累计擦弹 / 盾反次数：${st.route.totalGraze}`, 310, 260);
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText("护航主系统：弥涅瓦-V ⇄ 沃恩顾问", 310, 304);
    ctx.fillText("年代：地球历 2491（守望协定第3年）", 310, 338);
  }
  ctx.restore();
}

function itemNameLabel(id: string): string {
  const map: Record<string, string> = {
    malt_tea: "烘烤麦芽热饮 (+10HP)",
    protein_bar: "无菌蛋白谷饼 (+8HP)",
    ma_soup: "老马浓麦芽汤 (+18HP)",
    fifth_ampoule: "第五协议稳定剂 (+14HP, +35TP)",
    nano_gel: "陈医生急救凝胶 (HP全满)"
  };
  return map[id] ?? id;
}

function routeTendency(r: RouteState): string {
  if (r.kills === 0 && r.spares > 0) return "✦ 守望共鸣（和平解耦路线）";
  if (r.kills >= 3 && r.spares === 0) return "⚠ 冷酷清除（毁灭路线）";
  if (r.kills === 0 && r.spares === 0) return "尚未定调";
  return "◈ 艰难权衡（中立路线）";
}
