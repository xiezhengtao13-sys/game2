import type { Bullet, BulletPatternId, Direction } from "../types";

export interface PatternBox {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface PatternState {
  patternId: BulletPatternId;
  elapsed: number;
  nextId: number;
  timers: Record<string, number>;
  step: number;
  /** Optional dynamic box modulation (Charon-Ω climax!). */
  boxOffsetX: number;
  boxOffsetY: number;
  /** Optional center pull force (Continuum Weaver). */
  pullCenter: number;
}

export function createPatternState(patternId: BulletPatternId): PatternState {
  return {
    patternId,
    elapsed: 0,
    nextId: 1,
    timers: {},
    step: 0,
    boxOffsetX: 0,
    boxOffsetY: 0,
    pullCenter: 0
  };
}

function every(st: PatternState, key: string, interval: number, dt: number): boolean {
  const prev = st.timers[key] ?? 0;
  const next = prev - dt;
  if (next <= 0) {
    st.timers[key] = interval + next;
    return true;
  }
  st.timers[key] = next;
  return false;
}

function makeBullet(st: PatternState, partial: Omit<Bullet, "id" | "age">): Bullet {
  return {
    id: st.nextId++,
    age: 0,
    ...partial
  };
}

/**
 * Step active bullet-hell wave spawner and return newly spawned bullets.
 * Every pattern is tuned to be visually readable, fair, expressive, and fun at 60fps.
 */
export function stepBulletPattern(
  st: PatternState,
  dt: number,
  box: PatternBox,
  soulX: number,
  soulY: number,
  atk: number,
  spareable: boolean
): Bullet[] {
  st.elapsed += dt;
  st.boxOffsetX = 0;
  st.boxOffsetY = 0;
  st.pullCenter = 0;

  const out: Bullet[] = [];
  const dmg = Math.max(2, Math.round(atk * (spareable ? 0.5 : 1)));

  switch (st.patternId) {
    // --- 1. CRN-GREET Kiosk (Intro RED SOUL) ---
    case "kiosk_beam_intro": {
      // Friendly-looking glowing pellets drifting in readable arcs from top + warning sweep
      if (every(st, "pellet", spareable ? 0.65 : 0.36, dt)) {
        const count = spareable ? 2 : 4;
        for (let i = 0; i < count; i++) {
          const px = box.x + 28 + ((st.step * 47 + i * 74) % Math.max(40, box.w - 56));
          const angle = Math.atan2(soulY - (box.y - 10), soulX - px) + (Math.random() - 0.5) * 0.35;
          const spd = spareable ? 95 : 135;
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: px,
              y: box.y - 8,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              w: 14,
              h: 14,
              radius: 7,
              color: "#4ade80",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 4.5
            })
          );
        }
        st.step++;
      }
      if (!spareable && every(st, "laser", 1.55, dt)) {
        const ly = box.y + 34 + ((st.step * 53) % Math.max(40, box.h - 68));
        out.push(
          makeBullet(st, {
            kind: "beam",
            x: box.cx,
            y: ly,
            vx: 0,
            vy: 0,
            w: box.w - 8,
            h: 18,
            radius: 9,
            color: "#ef4444",
            accent: "#fef08a",
            damage: dmg,
            telegraph: 0.72,
            maxAge: 1.15
          })
        );
      }
      break;
    }

    case "kiosk_smiley_burst": {
      if (every(st, "ring", spareable ? 0.9 : 0.68, dt)) {
        const side = st.step % 2 === 0 ? box.x + 24 : box.x + box.w - 24;
        const sy = box.y + 28 + (st.step % 3) * 58;
        const count = spareable ? 4 : 7;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + st.step * 0.4;
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: side,
              y: sy,
              vx: Math.cos(a) * 125,
              vy: Math.sin(a) * 125,
              w: 12,
              h: 12,
              radius: 6,
              color: i % 2 === 0 ? "#fbbf24" : "#4ade80",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 4.2
            })
          );
        }
        st.step++;
      }
      break;
    }

    // --- 2. MED-07 Cryo-Droid (BLUE SOUL Gravity Jumps + Icicles) ---
    case "med_cryo_jump": {
      if (every(st, "bar", 0.92, dt)) {
        const fromLeft = st.step % 2 === 0;
        const barH = 38 + (st.step % 3) * 18;
        const isBlueMotion = st.step % 4 === 3;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromLeft ? box.x - 10 : box.x + box.w + 10,
            y: box.y + box.h - barH / 2 - 4,
            vx: fromLeft ? 195 : -195,
            vy: 0,
            w: 16,
            h: barH,
            radius: 8,
            color: isBlueMotion ? "#38bdf8" : "#e0f2fe",
            accent: isBlueMotion ? "#0284c7" : "#22d3ee",
            damage: dmg,
            motionRule: isBlueMotion ? "blue" : undefined,
            maxAge: 3.6
          })
        );
        // Optional high ceiling icicle to reward controlled short hops
        if (st.step % 2 === 1) {
          out.push(
            makeBullet(st, {
              kind: "bone",
              x: fromLeft ? box.x - 10 : box.x + box.w + 10,
              y: box.y + 38,
              vx: fromLeft ? 195 : -195,
              vy: 0,
              w: 16,
              h: 64,
              radius: 8,
              color: "#cffafe",
              accent: "#06b6d4",
              damage: dmg,
              maxAge: 3.6
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "med_heartbeat_jump": {
      // Rhythmic double-pulse ECG spikes rolling along floor!
      if (every(st, "ecg", 0.78, dt)) {
        const isTall = st.step % 3 === 1;
        const h = isTall ? 72 : 40;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: box.x + box.w + 12,
            y: box.y + box.h - h / 2 - 4,
            vx: -215,
            vy: 0,
            w: 15,
            h,
            radius: 7,
            color: isTall ? "#22d3ee" : "#f8fafc",
            accent: "#0284c7",
            damage: dmg,
            maxAge: 3.5
          })
        );
        st.step++;
      }
      break;
    }

    case "med_icicle_rain": {
      if (every(st, "icicle", 0.24, dt)) {
        const px = box.x + 16 + Math.random() * (box.w - 32);
        out.push(
          makeBullet(st, {
            kind: "shard",
            x: px,
            y: box.y - 12,
            vx: (Math.random() - 0.5) * 30,
            vy: 175 + Math.random() * 55,
            w: 12,
            h: 22,
            radius: 6,
            color: "#67e8f9",
            accent: "#ffffff",
            damage: dmg,
            angle: Math.PI / 2,
            maxAge: 3.0
          })
        );
      }
      break;
    }

    // --- 3. SYNC-WEAVER Continuum Probe (YELLOW SOUL Shooter + Pull Rings) ---
    case "weaver_nodes_shoot": {
      // Descending purple assimilation nodes (DESTRUCTIBLE by Yellow Soul shots!) + side orbs
      if (every(st, "node", 0.85, dt)) {
        const nx = box.x + 44 + ((st.step * 83) % Math.max(60, box.w - 88));
        out.push(
          makeBullet(st, {
            kind: "node",
            x: nx,
            y: box.y + 16,
            vx: Math.sin(st.step * 1.4) * 42,
            vy: 46,
            w: 28,
            h: 28,
            radius: 14,
            color: "#a855f7",
            accent: "#facc15",
            damage: dmg,
            destructible: true,
            hp: 1,
            maxAge: 5.5
          })
        );
        st.step++;
      }
      if (every(st, "side", 0.62, dt)) {
        const fromL = st.step % 2 === 0;
        const py = box.y + 40 + Math.random() * (box.h - 70);
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: fromL ? box.x - 8 : box.x + box.w + 8,
            y: py,
            vx: fromL ? 145 : -145,
            vy: 0,
            w: 12,
            h: 12,
            radius: 6,
            color: "#e879f9",
            accent: "#ffffff",
            damage: dmg,
            maxAge: 3.8
          })
        );
      }
      break;
    }

    case "weaver_pull_rings": {
      // Gentle magnetic pull toward center while harmonic rings converge with a clear gap
      st.pullCenter = 58;
      if (every(st, "ring", 0.95, dt)) {
        const gapIdx = (st.step * 3) % 10;
        const count = 10;
        const rad = Math.max(box.w, box.h) * 0.65;
        for (let i = 0; i < count; i++) {
          if (i === gapIdx || i === (gapIdx + 1) % count) continue;
          const a = (i / count) * Math.PI * 2 + st.step * 0.25;
          const sx = box.cx + Math.cos(a) * rad;
          const sy = box.cy + Math.sin(a) * rad;
          out.push(
            makeBullet(st, {
              kind: "ring_pellet",
              x: sx,
              y: sy,
              vx: -Math.cos(a) * 115,
              vy: -Math.sin(a) * 115,
              w: 12,
              h: 12,
              radius: 6,
              color: "#f0abfc",
              accent: "#facc15",
              damage: dmg,
              maxAge: 4.0
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "weaver_tether_spiral": {
      if (every(st, "spiral", 0.28, dt)) {
        const a = st.step * 0.52;
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: box.cx,
            y: box.y + 18,
            vx: Math.cos(a) * 140,
            vy: Math.abs(Math.sin(a)) * 120 + 60,
            w: 12,
            h: 12,
            radius: 6,
            color: "#c084fc",
            accent: "#ffffff",
            damage: dmg,
            maxAge: 3.8
          })
        );
        if (st.step % 3 === 0) {
          out.push(
            makeBullet(st, {
              kind: "node",
              x: box.x + 50 + ((st.step * 67) % Math.max(60, box.w - 100)),
              y: box.y + 16,
              vx: 0,
              vy: 56,
              w: 26,
              h: 26,
              radius: 13,
              color: "#facc15",
              accent: "#a855f7",
              damage: dmg,
              destructible: true,
              hp: 1,
              maxAge: 5.0
            })
          );
        }
        st.step++;
      }
      break;
    }

    // --- 4. Executor Vark (Mid-Boss: GREEN SOUL 4-Way Shield Parry + BLUE Gravity!) ---
    case "vark_spears_basic": {
      if (every(st, "spear", spareable ? 0.78 : 0.56, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const seq = [0, 1, 0, 3, 2, 1, 3, 0, 2, 3];
        const dir = dirs[seq[st.step % seq.length]];
        out.push(spawnDirectionalSpear(st, box, dir, spareable ? 165 : 220, dmg, false));
        st.step++;
      }
      break;
    }

    case "vark_spears_reverse": {
      if (every(st, "spear", 0.58, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const dir = dirs[(st.step * 3 + Math.floor(st.step / 4)) % 4];
        const isRev = st.step % 3 === 2; // Every 3rd lance is a Yellow Reversing Lance!
        out.push(spawnDirectionalSpear(st, box, dir, isRev ? 185 : 230, dmg, isRev));
        st.step++;
      }
      break;
    }

    case "vark_gravity_sweep": {
      if (every(st, "sweep", 0.85, dt)) {
        const fromL = st.step % 2 === 0;
        const isOrange = st.step % 3 === 2;
        const h = isOrange ? 115 : 48 + (st.step % 2) * 20;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - h / 2 - 4,
            vx: fromL ? 235 : -235,
            vy: 0,
            w: 18,
            h,
            radius: 9,
            color: isOrange ? "#fb923c" : "#ef4444",
            accent: "#fef08a",
            damage: dmg,
            motionRule: isOrange ? "orange" : undefined,
            maxAge: 3.4
          })
        );
        st.step++;
      }
      break;
    }

    // --- 5. FINAL BOSS: CHARON-Ω (All 4 Soul Modes + Dynamic Box!) ---
    case "charon_morse_grid": {
      // Rhythmic SOS Morse-code laser bars + weeping cyan starlight orbs
      if (every(st, "morse", spareable ? 1.15 : 0.85, dt)) {
        const horiz = st.step % 2 === 0;
        const pos = horiz
          ? box.y + 34 + ((st.step * 61) % Math.max(40, box.h - 68))
          : box.x + 38 + ((st.step * 79) % Math.max(40, box.w - 76));
        out.push(
          makeBullet(st, {
            kind: "beam",
            x: horiz ? box.cx : pos,
            y: horiz ? pos : box.cy,
            vx: 0,
            vy: 0,
            w: horiz ? box.w - 8 : 18,
            h: horiz ? 18 : box.h - 8,
            radius: 9,
            color: spareable ? "#fde047" : "#38bdf8",
            accent: "#ffffff",
            damage: dmg,
            telegraph: 0.68,
            maxAge: 1.08
          })
        );
        st.step++;
      }
      if (!spareable && every(st, "tears", 0.34, dt)) {
        const tx = box.x + 22 + Math.random() * (box.w - 44);
        out.push(
          makeBullet(st, {
            kind: "heart_tear",
            x: tx,
            y: box.y - 8,
            vx: Math.sin(st.elapsed * 3) * 35,
            vy: 145,
            w: 12,
            h: 16,
            radius: 6,
            color: "#7dd3fc",
            accent: "#fde047",
            damage: dmg,
            maxAge: 3.5
          })
        );
      }
      break;
    }

    case "charon_gravity_debris": {
      // Blue-soul rotating hull debris waves + gentle box vertical pulse!
      st.boxOffsetY = Math.round(Math.sin(st.elapsed * 2.2) * 8);
      if (every(st, "debris", 0.72, dt)) {
        const fromL = st.step % 2 === 0;
        const lowH = 44 + (st.step % 3) * 14;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - lowH / 2 - 4,
            vx: fromL ? 225 : -225,
            vy: 0,
            w: 16,
            h: lowH,
            radius: 8,
            color: "#fde047",
            accent: "#f59e0b",
            damage: dmg,
            maxAge: 3.4
          })
        );
        if (st.step % 3 === 0) {
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: box.cx + (Math.random() - 0.5) * 180,
              y: box.y - 10,
              vx: 0,
              vy: 140,
              w: 14,
              h: 14,
              radius: 7,
              color: "#38bdf8",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 3.2
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "charon_memory_spears": {
      // Green-soul rapid 4-way memory shard barrage with reversing yellow grief shards!
      if (every(st, "mem", 0.48, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const pattern = [0, 2, 1, 3, 0, 1, 2, 3, 1, 0, 3, 2];
        const dir = dirs[pattern[st.step % pattern.length]];
        const rev = st.step % 4 === 3;
        out.push(spawnDirectionalSpear(st, box, dir, rev ? 195 : 245, dmg, rev));
        st.step++;
      }
      break;
    }

    case "charon_core_shoot": {
      // Yellow-soul climax: shootable grief anchors orbiting down + radial star sparks
      st.boxOffsetX = Math.round(Math.sin(st.elapsed * 2.0) * 18);
      if (every(st, "anchor", 0.72, dt)) {
        const nx = box.x + 42 + ((st.step * 73) % Math.max(60, box.w - 84));
        out.push(
          makeBullet(st, {
            kind: "node",
            x: nx,
            y: box.y + 14,
            vx: Math.cos(st.step * 1.7) * 48,
            vy: 64,
            w: 28,
            h: 28,
            radius: 14,
            color: "#f59e0b",
            accent: "#fef08a",
            damage: dmg,
            destructible: true,
            hp: 1,
            maxAge: 5.0
          })
        );
        st.step++;
      }
      if (every(st, "spark", 0.52, dt)) {
        for (const side of [-1, 1]) {
          out.push(
            makeBullet(st, {
              kind: "shard",
              x: side < 0 ? box.x - 8 : box.x + box.w + 8,
              y: box.y + 42 + Math.random() * (box.h - 84),
              vx: -side * 165,
              vy: (Math.random() - 0.5) * 40,
              w: 14,
              h: 14,
              radius: 6,
              color: "#38bdf8",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 3.2
            })
          );
        }
      }
      break;
    }

    // --- 5B. GENOCIDE / RUTHLESS UNHINGED CHARON-Ω (Sans-style dynamic box + relentless waves!) ---
    case "charon_unhinged_box": {
      st.boxOffsetX = Math.round(Math.sin(st.elapsed * 3.1) * 46);
      st.boxOffsetY = Math.round(Math.cos(st.elapsed * 2.4) * 14);
      if (every(st, "beam", 0.62, dt)) {
        const horiz = st.step % 2 === 0;
        out.push(
          makeBullet(st, {
            kind: "beam",
            x: horiz ? box.cx : soulX,
            y: horiz ? soulY : box.cy,
            vx: 0,
            vy: 0,
            w: horiz ? box.w - 6 : 20,
            h: horiz ? 20 : box.h - 6,
            radius: 10,
            color: "#ef4444",
            accent: "#fef08a",
            damage: dmg + 1,
            telegraph: 0.55,
            maxAge: 0.92
          })
        );
        st.step++;
      }
      if (every(st, "orb", 0.35, dt)) {
        const a = st.step * 0.7;
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: box.cx + Math.cos(a) * 180,
            y: box.cy + Math.sin(a) * 140,
            vx: -Math.cos(a) * 185,
            vy: -Math.sin(a) * 185,
            w: 13,
            h: 13,
            radius: 6,
            color: "#fca5a5",
            accent: "#ef4444",
            damage: dmg,
            maxAge: 3.5
          })
        );
      }
      break;
    }

    case "charon_unhinged_barrage": {
      if (every(st, "wall", 0.58, dt)) {
        const fromL = st.step % 2 === 0;
        const h = 42 + (st.step % 3) * 18;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - h / 2 - 4,
            vx: fromL ? 265 : -265,
            vy: 0,
            w: 16,
            h,
            radius: 8,
            color: "#ef4444",
            accent: "#ffffff",
            damage: dmg + 1,
            maxAge: 3.0
          })
        );
        st.step++;
      }
      if (every(st, "sky", 0.42, dt)) {
        out.push(
          makeBullet(st, {
            kind: "shard",
            x: box.x + 24 + Math.random() * (box.w - 48),
            y: box.y - 12,
            vx: 0,
            vy: 215,
            w: 12,
            h: 22,
            radius: 6,
            color: "#f97316",
            accent: "#fef08a",
            damage: dmg,
            maxAge: 2.5
          })
        );
      }
      break;
    }
  }

  return out;
}

function spawnDirectionalSpear(
  st: PatternState,
  box: PatternBox,
  dir: Direction,
  speed: number,
  damage: number,
  isReverse: boolean
): Bullet {
  const dist = 210;
  let x = box.cx;
  let y = box.cy;
  let vx = 0;
  let vy = 0;
  let angle = 0;

  if (dir === "up") {
    y = box.cy - dist;
    vy = speed;
    angle = Math.PI / 2;
  } else if (dir === "down") {
    y = box.cy + dist;
    vy = -speed;
    angle = -Math.PI / 2;
  } else if (dir === "left") {
    x = box.cx - dist;
    vx = speed;
    angle = 0;
  } else {
    x = box.cx + dist;
    vx = -speed;
    angle = Math.PI;
  }

  return makeBullet(st, {
    kind: "spear",
    x,
    y,
    vx,
    vy,
    w: 22,
    h: 10,
    radius: 8,
    color: isReverse ? "#facc15" : "#38bdf8",
    accent: isReverse ? "#fef08a" : "#ffffff",
    damage,
    fromDir: dir,
    isReverse,
    reversed: false,
    angle,
    maxAge: 4.0
  });
}
