import type { EnemyId } from "../types";

export interface BossRigState {
  enemyId: EnemyId;
  t: number;
  hurtTimer: number;
  spareable: boolean;
  ruthlessMode: boolean;
  sparedProgress: number;
  destroyedProgress: number;
  talking: boolean;
  soulX: number;
  soulY: number;
}

/** Draw crisp pixel-aligned polygon with bold dark outline for sculpted retro pixel art. */
function drawPixelPoly(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<[number, number]>,
  fill: string,
  stroke = "#090a14",
  lineWidth = 3
): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(Math.round(pts[i][0]), Math.round(pts[i][1]));
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function px(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  color: string,
  ps = 3
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(ox + gx * ps), Math.round(oy + gy * ps), Math.round(gw * ps), Math.round(gh * ps));
}

/**
 * Renders dramatic, high-contrast Deltarune/Undertale-grade sculpted pixel-art Battle Rigs.
 * Centered at (cx, cy), strictly fitting cleanly inside y = 68..298 and x = 440..840.
 */
export function drawBattleBoss(ctx: CanvasRenderingContext2D, cx: number, cy: number, st: BossRigState): void {
  ctx.save();

  const shakeX = st.hurtTimer > 0 ? Math.round(Math.sin(st.hurtTimer * 70) * 14 * (st.hurtTimer / 0.45)) : 0;
  const ox = Math.round(cx + shakeX);
  const oy = Math.round(cy);

  if (st.sparedProgress > 0) {
    ctx.globalAlpha = Math.max(0.15, 1 - st.sparedProgress * 0.82);
  }
  if (st.destroyedProgress > 0) {
    ctx.globalAlpha = Math.max(0, 1 - st.destroyedProgress);
    ctx.translate(0, -st.destroyedProgress * 22);
  }

  // Layered atmospheric spotlight & orbiting pixel motes behind Boss
  const auraColor = st.spareable
    ? "rgba(250, 204, 21, 0.22)"
    : st.ruthlessMode
    ? "rgba(239, 68, 68, 0.24)"
    : st.enemyId === "weaver"
    ? "rgba(168, 85, 247, 0.22)"
    : st.enemyId === "med07"
    ? "rgba(34, 211, 238, 0.20)"
    : st.enemyId === "vark"
    ? "rgba(239, 68, 68, 0.18)"
    : "rgba(56, 189, 248, 0.18)";

  const grad = ctx.createRadialGradient(ox, oy, 16, ox, oy, 140);
  grad.addColorStop(0, auraColor);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ox, oy, 140, 0, Math.PI * 2);
  ctx.fill();

  const flash = st.hurtTimer > 0.25 && Math.floor(st.hurtTimer * 30) % 2 === 0;

  switch (st.enemyId) {
    case "kiosk":
      drawKioskBoss(ctx, ox, oy, st, flash);
      break;
    case "med07":
      drawMed07Boss(ctx, ox, oy, st, flash);
      break;
    case "weaver":
      drawWeaverBoss(ctx, ox, oy, st, flash);
      break;
    case "vark":
      drawVarkBoss(ctx, ox, oy, st, flash);
      break;
    case "charon":
      drawCharonBoss(ctx, ox, oy, st, flash);
      break;
  }

  // Disintegration dust rising on DESTROY
  if (st.destroyedProgress > 0) {
    for (let i = 0; i < 48; i++) {
      const h1 = Math.abs(Math.sin(i * 127.1 + 31.7) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(i * 269.5 + 11.3) * 43758.5453) % 1;
      const dx = (h1 - 0.5) * 240;
      const dy = (h2 - 0.5) * 160 - st.destroyedProgress * (80 + (i % 5) * 28);
      ctx.fillStyle = i % 3 === 0 ? "#ffffff" : "#94a3b8";
      ctx.fillRect(Math.round(ox + dx), Math.round(oy + dy), 4, 4);
    }
  }

  ctx.restore();
}

// ============================================================================
// 1. CRN-GREET HOSPITALITY KIOSK (Expressive Vintage Mascot Terminal)
// ============================================================================
function drawKioskBoss(ctx: CanvasRenderingContext2D, ox: number, oy: number, st: BossRigState, flash: boolean): void {
  const bob = Math.sin(st.t * 4.8) * 5;
  const tilt = Math.sin(st.t * 2.4) * 0.04;
  const y = oy + bob;

  // Dangling coiled severed power cable from pedestal
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox + 18, oy + 68);
  ctx.quadraticCurveTo(ox + 56, oy + 76, ox + 78, oy + 58 + Math.sin(st.t * 6) * 4);
  ctx.stroke();
  if (Math.sin(st.t * 14) > 0.3 && !st.spareable) {
    ctx.fillStyle = "#fde047";
    ctx.fillRect(ox + 76, oy + 54, 6, 6);
  }

  // Grounded tapered chrome pedestal & hazard trim
  drawPixelPoly(
    ctx,
    [
      [ox - 46, oy + 82],
      [ox + 46, oy + 82],
      [ox + 34, oy + 64],
      [ox - 34, oy + 64]
    ],
    "#334155"
  );
  drawPixelPoly(
    ctx,
    [
      [ox - 16, oy + 66],
      [ox + 16, oy + 66],
      [ox + 12, y + 26],
      [ox - 12, y + 26]
    ],
    "#64748b"
  );
  px(ctx, ox, oy, -8, 22, 16, 3, "#fbbf24", 3);

  ctx.save();
  ctx.translate(ox, y - 8);
  ctx.rotate(tilt);

  // Expressive spring-mounted waving mechanical arms + cartoon mittens!
  const waveL = Math.sin(st.t * 6.5) * 16;
  const waveR = Math.cos(st.t * 6.5) * 16;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-66, 4);
  ctx.quadraticCurveTo(-96, -8 + waveL * 0.5, -104, -22 + waveL);
  ctx.moveTo(66, 4);
  ctx.quadraticCurveTo(96, -8 + waveR * 0.5, 104, -22 + waveR);
  ctx.stroke();

  // Left & Right White Service Gloves / Emitter Clamps
  for (const [gx, gy] of [
    [-108, -26 + waveL],
    [108, -26 + waveR]
  ]) {
    ctx.fillStyle = flash ? "#ffffff" : "#f8fafc";
    ctx.fillRect(Math.round(gx - 12), Math.round(gy - 12), 24, 24);
    ctx.strokeStyle = "#090a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(gx - 12), Math.round(gy - 12), 24, 24);
    ctx.fillStyle = st.spareable ? "#4ade80" : "#ef4444";
    ctx.fillRect(Math.round(gx - 4), Math.round(gy - 4), 8, 8);
  }

  // Curved vintage CRT casing (beveled retro beige/silver shell)
  drawPixelPoly(
    ctx,
    [
      [-68, -56],
      [68, -56],
      [76, -44],
      [72, 42],
      [58, 52],
      [-58, 52],
      [-72, 42],
      [-76, -44]
    ],
    flash ? "#ffffff" : "#e2e8f0"
  );
  // Side cooling vents & yellow hospitality badge
  px(ctx, 0, 0, -22, 12, 8, 2, "#64748b", 3);
  px(ctx, 0, 0, 14, 12, 8, 2, "#fbbf24", 3);

  // Inner curved CRT screen glass
  drawPixelPoly(
    ctx,
    [
      [-56, -44],
      [56, -44],
      [60, -34],
      [56, 30],
      [-56, 30],
      [-60, -34]
    ],
    st.spareable ? "#064e3b" : st.hurtTimer > 0 ? "#450a0a" : "#072017",
    "#0f172a",
    4
  );
  // Subtle CRT scanline sheen + glass crack on top right!
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  for (let sy = -38; sy < 26; sy += 6) ctx.fillRect(-54, sy, 108, 2);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(46, -44);
  ctx.lineTo(36, -32);
  ctx.lineTo(44, -22);
  ctx.stroke();

  // Expressive Animated Face
  const fg = st.spareable ? "#fde047" : st.hurtTimer > 0 ? "#fca5a5" : "#4ade80";
  if (st.hurtTimer > 0) {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-34, -24); ctx.lineTo(-16, -6);
    ctx.moveTo(-16, -24); ctx.lineTo(-34, -6);
    ctx.moveTo(16, -24); ctx.lineTo(34, -6);
    ctx.moveTo(34, -24); ctx.lineTo(16, -6);
    ctx.stroke();
    px(ctx, 0, 0, -6, 3, 12, 5, "#ef4444", 3);
  } else if (st.spareable) {
    // Warm happy ^ ◡ ^
    ctx.strokeStyle = fg;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-34, -12); ctx.lineTo(-24, -24); ctx.lineTo(-14, -12);
    ctx.moveTo(14, -12); ctx.lineTo(24, -24); ctx.lineTo(34, -12);
    ctx.arc(0, 2, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    // Mischievous glowing eyes & chattering jagged smile
    px(ctx, 0, 0, -11, -8, 6, 7, fg, 3);
    px(ctx, 0, 0, -9, -7, 2, 3, "#ffffff", 3);
    px(ctx, 0, 0, 5, -8, 6, 7, fg, 3);
    px(ctx, 0, 0, 7, -7, 2, 3, "#ffffff", 3);
    const open = st.talking && Math.floor(st.t * 14) % 2 === 0 ? 5 : 3;
    px(ctx, 0, 0, -10, 2, 20, open, "#f8fafc", 3);
    px(ctx, 0, 0, -6, 2, 2, open, "#072017", 3);
    px(ctx, 0, 0, 0, 2, 2, open, "#072017", 3);
    px(ctx, 0, 0, 6, 2, 2, open, "#072017", 3);
  }

  // Twin curved radio antennae + blinking warning beacon
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -56); ctx.lineTo(-32, -78);
  ctx.moveTo(20, -56); ctx.lineTo(32, -78);
  ctx.stroke();
  ctx.fillStyle = Math.sin(st.t * 10) > 0 ? "#ef4444" : "#fde047";
  ctx.beginPath();
  ctx.arc(-32, -80, 6, 0, Math.PI * 2);
  ctx.arc(32, -80, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================================================
// 2. MED-07 FROZEN CRYO-DROID (Sleek Sculpted Hover Medic + Live ECG Spline)
// ============================================================================
function drawMed07Boss(ctx: CanvasRenderingContext2D, ox: number, oy: number, st: BossRigState, flash: boolean): void {
  const hover = Math.sin(st.t * 3.0) * 7;
  const y = oy + hover;

  // Frosty plasma hover jet & drifting snowflakes under thruster
  const jetH = 20 + Math.sin(st.t * 16) * 8;
  drawPixelPoly(
    ctx,
    [
      [ox - 24, y + 60],
      [ox + 24, y + 60],
      [ox, y + 60 + jetH]
    ],
    "#38bdf8",
    "#0284c7",
    2
  );
  drawPixelPoly(
    ctx,
    [
      [ox - 12, y + 60],
      [ox + 12, y + 60],
      [ox, y + 54 + jetH * 0.7]
    ],
    "#e0f2fe",
    "#ffffff",
    0
  );

  // Twin Multi-Joint Cryo-Injector & Defibrillator Arms
  const sway = Math.sin(st.t * 3.8) * 9;
  for (const side of [-1, 1]) {
    const sy = side < 0 ? sway : -sway;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ox + side * 52, y - 6);
    ctx.lineTo(ox + side * 88, y - 22 + sy * 0.5);
    ctx.lineTo(ox + side * 98, y + 22 + sy);
    ctx.stroke();

    // Glowing cryo vial cannula at hand tip
    drawPixelPoly(
      ctx,
      [
        [ox + side * 88, y + 12 + sy],
        [ox + side * 108, y + 12 + sy],
        [ox + side * 104, y + 48 + sy],
        [ox + side * 92, y + 48 + sy]
      ],
      "#22d3ee"
    );
    ctx.fillStyle = "#ecfeff";
    ctx.fillRect(Math.round(ox + side * 96 - 2), Math.round(y + 18 + sy), 4, 20);
  }

  // Sculpted Egg-Domed Clinical Capsule Shell (glacier white + cool slate underside)
  drawPixelPoly(
    ctx,
    [
      [ox - 34, y - 82],
      [ox + 34, y - 82],
      [ox + 58, y - 54],
      [ox + 60, y + 26],
      [ox + 40, y + 58],
      [ox - 40, y + 58],
      [ox - 60, y + 26],
      [ox - 58, y - 54]
    ],
    flash ? "#ffffff" : "#f1f5f9"
  );
  // Shaded underside engine ring
  drawPixelPoly(
    ctx,
    [
      [ox - 52, y + 32],
      [ox + 52, y + 32],
      [ox + 38, y + 58],
      [ox - 38, y + 58]
    ],
    "#475569"
  );
  // Icy frost crystals clinging to right shoulder!
  drawPixelPoly(
    ctx,
    [
      [ox + 36, y - 78],
      [ox + 56, y - 92],
      [ox + 54, y - 62],
      [ox + 68, y - 72],
      [ox + 58, y - 48]
    ],
    "#67e8f9",
    "#cffafe",
    2
  );

  // Crisp Red Medical Cross on crown
  px(ctx, ox, y, -3, -24, 6, 12, "#ef4444", 3);
  px(ctx, ox, y, -6, -21, 12, 6, "#ef4444", 3);

  // Curved Panoramic ECG Monitor Visor
  drawPixelPoly(
    ctx,
    [
      [ox - 48, y - 24],
      [ox + 48, y - 24],
      [ox + 52, y + 18],
      [ox - 52, y + 18]
    ],
    "#061829",
    "#38bdf8",
    3
  );

  // Continuous live scrolling ECG heart-rate trace!
  ctx.strokeStyle = st.spareable ? "#34d399" : st.hurtTimer > 0 ? "#ef4444" : "#67e8f9";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -42; i <= 42; i += 4) {
    const phase = (i * 0.14 + st.t * (st.spareable ? 2.5 : 7.5)) % (Math.PI * 2);
    let dy = Math.sin(phase) * 3;
    if (!st.spareable && Math.abs(Math.sin(phase)) > 0.88) dy = -16;
    else if (st.spareable && Math.abs(Math.sin(phase)) > 0.92) dy = -10;
    if (i === -42) ctx.moveTo(ox + i, y - 1 + dy);
    else ctx.lineTo(ox + i, y - 1 + dy);
  }
  ctx.stroke();
}

// ============================================================================
// 3. SYNC-WEAVER CONTINUUM PROBE (Radiant Seraphim Mandala + Tracking Eye)
// ============================================================================
function drawWeaverBoss(ctx: CanvasRenderingContext2D, ox: number, oy: number, st: BossRigState, flash: boolean): void {
  const hover = Math.sin(st.t * 2.4) * 7;
  const y = oy + hover;

  ctx.save();
  ctx.translate(ox, y);

  // 3 Interlocking Sacred-Geometry Continuum Gyro-Rings
  for (let r = 0; r < 3; r++) {
    ctx.save();
    ctx.rotate(st.t * (r % 2 === 0 ? 0.7 : -0.9) + r * 1.05);
    ctx.strokeStyle = st.spareable ? "#fde047" : r === 0 ? "#f0abfc" : r === 1 ? "#a855f7" : "#facc15";
    ctx.lineWidth = r === 0 ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 108 - r * 12, 36 + r * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6 Floating Faceted Crystal Petals
  for (let i = 0; i < 6; i++) {
    const a = st.t * 0.85 + (i * Math.PI) / 3;
    const px0 = Math.cos(a) * 86;
    const py0 = Math.sin(a) * 62;
    drawPixelPoly(
      ctx,
      [
        [px0, py0 - 14],
        [px0 + 10, py0],
        [px0, py0 + 14],
        [px0 - 10, py0]
      ],
      i % 2 === 0 ? "#c084fc" : "#facc15"
    );
  }

  // Sculpted Faceted Octahedral Core with Inner Light Grading
  drawPixelPoly(
    ctx,
    [
      [0, -76],
      [56, 0],
      [0, 76],
      [-56, 0]
    ],
    flash ? "#ffffff" : "#581c87"
  );
  drawPixelPoly(
    ctx,
    [
      [0, -76],
      [56, 0],
      [0, 16],
      [-56, 0]
    ],
    flash ? "#ffffff" : "#7e22ce",
    "#facc15",
    2.5
  );

  // Luminous Almond-Shaped Seraph Eye tracking Player Soul!
  drawPixelPoly(
    ctx,
    [
      [-36, 0],
      [-14, -22],
      [14, -22],
      [36, 0],
      [14, 22],
      [-14, 22]
    ],
    "#fdf4ff",
    "#3b0764",
    3
  );
  const dx = Math.max(-10, Math.min(10, (st.soulX - ox) * 0.04));
  const dy = Math.max(-6, Math.min(6, (st.soulY - y) * 0.03));
  ctx.fillStyle = st.spareable ? "#f59e0b" : "#9333ea";
  ctx.beginPath();
  ctx.arc(dx, dy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#090a14";
  ctx.fillRect(Math.round(dx - 3), Math.round(dy - 9), 6, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(dx - 5), Math.round(dy - 7), 4, 4);

  ctx.restore();
}

// ============================================================================
// 4. EXECUTOR VARK — MID-BOSS (Sculpted Revanchist Knight + Billowing Cape!)
// ============================================================================
function drawVarkBoss(ctx: CanvasRenderingContext2D, ox: number, oy: number, st: BossRigState, flash: boolean): void {
  const breathe = Math.sin(st.t * 3.6) * 3.5;
  const y = oy + breathe;
  const capeWave = Math.sin(st.t * 5.2) * 10;

  // 1. Billowing Torn Crimson Revanchist War-Cloak behind armor!
  drawPixelPoly(
    ctx,
    [
      [ox - 46, y - 34],
      [ox + 46, y - 34],
      [ox + 86 + capeWave, oy + 86],
      [ox + 34 + capeWave * 0.5, oy + 72],
      [ox - 12 + capeWave * 0.3, oy + 88],
      [ox - 82 + capeWave * 0.7, oy + 80]
    ],
    "#7f1d1d",
    "#090a14",
    3
  );
  drawPixelPoly(
    ctx,
    [
      [ox - 38, y - 28],
      [ox + 38, y - 28],
      [ox + 64 + capeWave * 0.7, oy + 72],
      [ox - 58 + capeWave * 0.5, oy + 68]
    ],
    "#991b1b",
    "#450a0a",
    2
  );

  // 2. Massive Diagonal Non-AI Thermal Halberd!
  ctx.save();
  ctx.strokeStyle = "#090a14";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(ox - 96, oy + 74);
  ctx.lineTo(ox + 106, y - 82);
  ctx.stroke();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ox - 96, oy + 74);
  ctx.lineTo(ox + 106, y - 82);
  ctx.stroke();

  // Razor Crescent Plasma Halberd Blade (turns serene blue if spared!)
  drawPixelPoly(
    ctx,
    [
      [ox + 68, y - 56],
      [ox + 128, y - 102],
      [ox + 132, y - 48],
      [ox + 104, y - 18],
      [ox + 88, y - 44]
    ],
    st.spareable ? "#38bdf8" : "#ef4444",
    "#fef08a",
    2.5
  );
  ctx.restore();

  // 3. Articulated Armored Greaves & Knee Guards (grounded at oy)
  for (const side of [-1, 1]) {
    drawPixelPoly(
      ctx,
      [
        [ox + side * 12, oy + 26],
        [ox + side * 42, oy + 26],
        [ox + side * 48, oy + 84],
        [ox + side * 10, oy + 84]
      ],
      "#334155"
    );
    // Knee plate accent
    drawPixelPoly(
      ctx,
      [
        [ox + side * 14, oy + 38],
        [ox + side * 40, oy + 38],
        [ox + side * 36, oy + 54],
        [ox + side * 18, oy + 54]
      ],
      "#64748b"
    );
  }

  // 4. Sculpted V-Tapered Heavy Power-Armor Cuirass
  drawPixelPoly(
    ctx,
    [
      [ox - 46, y - 34],
      [ox + 46, y - 34],
      [ox + 34, y + 32],
      [ox - 34, y + 32]
    ],
    flash ? "#ffffff" : "#475569"
  );
  // Inner dark chest armor plate + glowing anti-AI emblem
  drawPixelPoly(
    ctx,
    [
      [ox - 32, y - 24],
      [ox + 32, y - 24],
      [ox + 22, y + 20],
      [ox - 22, y + 20]
    ],
    "#1e293b"
  );
  // Glowing Thermal Core V-Insignia
  drawPixelPoly(
    ctx,
    [
      [ox - 18, y - 14],
      [ox + 18, y - 14],
      [ox, y + 12]
    ],
    st.spareable ? "#38bdf8" : "#ef4444",
    "#fde047",
    2
  );

  // 5. Layered Spiked Pauldrons & Gauntlets gripping the halberd!
  for (const side of [-1, 1]) {
    drawPixelPoly(
      ctx,
      [
        [ox + side * 36, y - 42],
        [ox + side * 82, y - 34],
        [ox + side * 74, y + 8],
        [ox + side * 36, y + 2]
      ],
      flash ? "#ffffff" : "#64748b"
    );
    // Crimson pauldron horn trim
    drawPixelPoly(
      ctx,
      [
        [ox + side * 58, y - 40],
        [ox + side * 86, y - 52],
        [ox + side * 78, y - 28]
      ],
      "#ef4444"
    );
  }
  // Armored fists gripping diagonal shaft
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(ox - 54, y + 24, 22, 22);
  ctx.fillRect(ox + 38, y - 42, 22, 22);
  ctx.strokeStyle = "#090a14";
  ctx.lineWidth = 3;
  ctx.strokeRect(ox - 54, y + 24, 22, 22);
  ctx.strokeRect(ox + 38, y - 42, 22, 22);

  // 6. Iconic Angled Revanchist Knight Helmet + Glowing Visor!
  drawPixelPoly(
    ctx,
    [
      [ox - 24, y - 84],
      [ox + 24, y - 84],
      [ox + 34, y - 56],
      [ox + 22, y - 32],
      [ox - 22, y - 32],
      [ox - 34, y - 56]
    ],
    flash ? "#ffffff" : "#94a3b8"
  );
  // Central helmet crest ridge
  drawPixelPoly(
    ctx,
    [
      [ox - 6, y - 94],
      [ox + 6, y - 94],
      [ox + 10, y - 62],
      [ox - 10, y - 62]
    ],
    "#ef4444"
  );
  // Recessed dark visor slot
  drawPixelPoly(
    ctx,
    [
      [ox - 24, y - 62],
      [ox + 24, y - 62],
      [ox + 18, y - 48],
      [ox - 18, y - 48]
    ],
    "#090a14"
  );

  if (st.spareable) {
    // Cracked visor revealing stunned, solemn human eyes!
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(ox - 14, y - 58, 8, 6);
    ctx.fillRect(ox + 6, y - 58, 8, 6);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(ox - 11, y - 56, 3, 4);
    ctx.fillRect(ox + 9, y - 56, 3, 4);
  } else {
    // Fierce glowing crimson-gold cyclops/knight slit
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(ox - 20, y - 57, 40, 6);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(ox - 10, y - 56, 20, 3);
  }
}

// ============================================================================
// 5. FINAL BOSS: CHARON-Ω (Monumental Shattered Star-Angel Core!)
// ============================================================================
function drawCharonBoss(ctx: CanvasRenderingContext2D, ox: number, oy: number, st: BossRigState, flash: boolean): void {
  const hover = Math.sin(st.t * 2.1) * 7;
  const wingPulse = Math.sin(st.t * 2.8) * 8;
  const y = oy + hover;
  const mad = st.ruthlessMode;
  const hullCol = flash ? "#ffffff" : mad ? "#ef4444" : st.spareable ? "#fde047" : "#f8fafc";
  const accent = mad ? "#fca5a5" : st.spareable ? "#7dd3fc" : "#fbbf24";
  const wingDark = mad ? "#450a0a" : "#111b33";

  // 1. Dangling Severed Fiber-Optic & Spine Cables hanging from cracked core below!
  for (let c = -2; c <= 2; c++) {
    const sway = Math.sin(st.t * 3.1 + c * 1.2) * 8;
    ctx.strokeStyle = mad ? "#991b1b" : c % 2 === 0 ? "#38bdf8" : "#64748b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox + c * 14, y + 48);
    ctx.quadraticCurveTo(ox + c * 18 + sway, y + 72, ox + c * 22 + sway * 1.4, y + 92);
    ctx.stroke();
  }

  // 2. Sculpted Sweeping Angelic Crystal-Server Wings (3 feathered tiers each side!)
  for (const side of [-1, 1]) {
    // Upper soaring wing blade
    drawPixelPoly(
      ctx,
      [
        [ox + side * 46, y - 20],
        [ox + side * (138 + wingPulse), y - 76],
        [ox + side * (152 + wingPulse), y - 34],
        [ox + side * 56, y + 2]
      ],
      wingDark,
      accent,
      3
    );
    // Mid feathered blade
    drawPixelPoly(
      ctx,
      [
        [ox + side * 50, y + 2],
        [ox + side * (126 + wingPulse * 0.7), y - 22],
        [ox + side * (134 + wingPulse * 0.7), y + 18],
        [ox + side * 52, y + 24]
      ],
      wingDark,
      accent,
      2.5
    );
    // Lower tapered pinion
    drawPixelPoly(
      ctx,
      [
        [ox + side * 46, y + 24],
        [ox + side * (104 + wingPulse * 0.4), y + 26],
        [ox + side * (94 + wingPulse * 0.4), y + 58],
        [ox + side * 42, y + 42]
      ],
      wingDark,
      mad ? "#ef4444" : "#38bdf8",
      2.5
    );
    // Glowing telemetry veins along wing blades
    ctx.strokeStyle = mad ? "#ef4444" : st.spareable ? "#fde047" : "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox + side * 62, y - 16);
    ctx.lineTo(ox + side * (132 + wingPulse), y - 54);
    ctx.moveTo(ox + side * 64, y + 8);
    ctx.lineTo(ox + side * (118 + wingPulse * 0.6), y - 4);
    ctx.stroke();
  }

  // 3. Rotating Fractured Golden Astrolabe Halo behind Head
  ctx.save();
  ctx.translate(ox, y - 6);
  ctx.rotate(st.t * (mad ? 1.5 : 0.45));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([28, 12, 8, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 4. Sculpted Crowned Octagonal Star-Core Monolith (with railgun fracture scar!)
  drawPixelPoly(
    ctx,
    [
      [ox - 32, y - 66],
      [ox + 20, y - 66],
      [ox + 28, y - 44], // jagged railgun chip!
      [ox + 48, y - 48],
      [ox + 58, y - 16],
      [ox + 52, y + 42],
      [ox + 24, y + 58],
      [ox - 24, y + 58],
      [ox - 52, y + 42],
      [ox - 58, y - 16],
      [ox - 46, y - 50]
    ],
    hullCol,
    "#090a14",
    4
  );

  // Dark obsidian heart visor recess
  drawPixelPoly(
    ctx,
    [
      [ox - 40, y - 40],
      [ox + 40, y - 40],
      [ox + 44, y + 28],
      [ox + 20, y + 42],
      [ox - 20, y + 42],
      [ox - 44, y + 28]
    ],
    "#070a14",
    accent,
    2.5
  );

  // 5. Haunting Expressive Core Face
  if (mad) {
    // UNHINGED GENOCIDE MODE: jagged bleeding crimson eyes + glitch teeth!
    const jit = Math.floor(st.t * 26) % 2 === 0 ? 3 : -3;
    drawPixelPoly(
      ctx,
      [
        [ox - 30 + jit, y - 22],
        [ox - 8 + jit, y - 10],
        [ox - 26 + jit, y + 2]
      ],
      "#ef4444",
      "#ffffff",
      2
    );
    drawPixelPoly(
      ctx,
      [
        [ox + 30 - jit, y - 22],
        [ox + 8 - jit, y - 10],
        [ox + 26 - jit, y + 2]
      ],
      "#ef4444",
      "#ffffff",
      2
    );
    // Blazing jagged grin
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(ox - 26, y + 14, 52, 16);
    ctx.fillStyle = "#fef08a";
    for (let tx = -22; tx <= 18; tx += 10) {
      ctx.fillRect(ox + tx, y + 16, 6, 12);
    }
  } else if (st.spareable) {
    // Restored warm golden starlight smile!
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ox - 18, y - 10, 10, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + 18, y - 10, 10, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox, y + 8, 16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    // Sorrowful luminous cyan eyes + streaming pixel starlight tears + pulsing SOS bar
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(ox - 28, y - 22, 18, 18);
    ctx.fillRect(ox + 10, y - 22, 18, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ox - 22, y - 18, 8, 8);
    ctx.fillRect(ox + 16, y - 18, 8, 8);

    // Falling glowing cyan tears
    const tearOff = (st.t * 28) % 28;
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(ox - 22, Math.round(y - 2 + tearOff), 5, 10);
    ctx.fillRect(ox + 18, Math.round(y - 2 + ((tearOff + 14) % 28)), 5, 10);

    // Trembling mouth waveform
    const mh = st.talking && Math.floor(st.t * 12) % 2 === 0 ? 8 : 4;
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(ox - 16, y + 18, 32, mh);
  }
}
