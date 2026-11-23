import type { Bullet, BulletPatternId, DifficultyMode, Direction } from "../types";

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
  boxOffsetX: number;
  boxOffsetY: number;
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

export interface PatternTuning {
  difficulty: DifficultyMode;
  weakened: boolean;
}

/**
 * Step active bullet-hell wave spawner with fair difficulty scaling (`story`/`normal`/`hardcore`)
 * and tactical weaken modifiers when the player successfully appeals to or disrupts the enemy.
 */
export function stepBulletPattern(
  st: PatternState,
  dt: number,
  box: PatternBox,
  soulX: number,
  soulY: number,
  atk: number,
  spareable: boolean,
  tuning: PatternTuning = { difficulty: "normal", weakened: false }
): Bullet[] {
  st.elapsed += dt;
  st.boxOffsetX = 0;
  st.boxOffsetY = 0;
  st.pullCenter = 0;

  const diffSpd = tuning.difficulty === "story" ? 0.78 : tuning.difficulty === "hardcore" ? 1.18 : 1.0;
  const diffInt = tuning.difficulty === "story" ? 1.28 : tuning.difficulty === "hardcore" ? 0.85 : 1.0;
  const weakSpd = tuning.weakened ? 0.8 : 1.0;
  const weakInt = tuning.weakened ? 1.18 : 1.0;

  const spdMul = diffSpd * weakSpd * (spareable ? 0.75 : 1.0);
  const intMul = diffInt * weakInt * (spareable ? 1.35 : 1.0);

  const out: Bullet[] = [];
  const dmg = Math.max(2, Math.round(atk * (spareable ? 0.55 : 1)));

  switch (st.patternId) {
    // --- 1. CRN-GREET Kiosk (Gentle Onboarding RED SOUL) ---
    case "kiosk_beam_intro": {
      if (every(st, "pellet", 0.44 * intMul, dt)) {
        const count = spareable ? 2 : 3;
        for (let i = 0; i < count; i++) {
          const px = box.x + 30 + ((st.step * 53 + i * 84) % Math.max(40, box.w - 60));
          const angle = Math.atan2(soulY - (box.y - 10), soulX - px) + (Math.random() - 0.5) * 0.3;
          const spd = 118 * spdMul;
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: px,
              y: box.y - 8,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              w: 13,
              h: 13,
              radius: 6.5,
              color: "#4ade80",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 4.5
            })
          );
        }
        st.step++;
      }
      if (!spareable && every(st, "laser", 1.75 * intMul, dt)) {
        const ly = box.y + 38 + ((st.step * 57) % Math.max(40, box.h - 76));
        out.push(
          makeBullet(st, {
            kind: "beam",
            x: box.cx,
            y: ly,
            vx: 0,
            vy: 0,
            w: box.w - 8,
            h: 16,
            radius: 8,
            color: "#ef4444",
            accent: "#fef08a",
            damage: dmg,
            telegraph: 0.78,
            maxAge: 1.18
          })
        );
      }
      break;
    }

    case "kiosk_smiley_burst": {
      if (every(st, "ring", 0.82 * intMul, dt)) {
        const side = st.step % 2 === 0 ? box.x + 26 : box.x + box.w - 26;
        const sy = box.y + 32 + (st.step % 3) * 58;
        const count = spareable ? 4 : 6;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + st.step * 0.45;
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: side,
              y: sy,
              vx: Math.cos(a) * 112 * spdMul,
              vy: Math.sin(a) * 112 * spdMul,
              w: 12,
              h: 12,
              radius: 6,
              color: i % 2 === 0 ? "#fbbf24" : "#4ade80",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 4.4
            })
          );
        }
        st.step++;
      }
      break;
    }

    // --- 2. MED-07 Cryo-Droid (Fair Rhythmic BLUE SOUL Gravity Jumps) ---
    case "med_cryo_jump": {
      if (every(st, "bar", 1.05 * intMul, dt)) {
        const fromLeft = st.step % 2 === 0;
        const isBlueMotion = st.step % 4 === 3;
        const barH = isBlueMotion ? 110 : 38 + (st.step % 2) * 16;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromLeft ? box.x - 10 : box.x + box.w + 10,
            y: box.y + box.h - barH / 2 - 4,
            vx: (fromLeft ? 175 : -175) * spdMul,
            vy: 0,
            w: 16,
            h: barH,
            radius: 8,
            color: isBlueMotion ? "#38bdf8" : "#e0f2fe",
            accent: isBlueMotion ? "#0284c7" : "#22d3ee",
            damage: dmg,
            motionRule: isBlueMotion ? "blue" : undefined,
            maxAge: 4.0
          })
        );
        // Safe generous vertical gap (>= 98px) when ceiling icicle accompanies low hurdle
        if (!isBlueMotion && st.step % 2 === 1) {
          out.push(
            makeBullet(st, {
              kind: "bone",
              x: fromLeft ? box.x - 10 : box.x + box.w + 10,
              y: box.y + 30,
              vx: (fromLeft ? 175 : -175) * spdMul,
              vy: 0,
              w: 16,
              h: 50,
              radius: 8,
              color: "#cffafe",
              accent: "#06b6d4",
              damage: dmg,
              maxAge: 4.0
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "med_heartbeat_jump": {
      if (every(st, "ecg", 0.92 * intMul, dt)) {
        const isTall = st.step % 3 === 1;
        const h = isTall ? 60 : 36;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: box.x + box.w + 12,
            y: box.y + box.h - h / 2 - 4,
            vx: -188 * spdMul,
            vy: 0,
            w: 15,
            h,
            radius: 7,
            color: isTall ? "#22d3ee" : "#f8fafc",
            accent: "#0284c7",
            damage: dmg,
            maxAge: 4.0
          })
        );
        st.step++;
      }
      break;
    }

    case "med_icicle_rain": {
      if (every(st, "icicle", 0.30 * intMul, dt)) {
        const px = box.x + 18 + Math.random() * (box.w - 36);
        out.push(
          makeBullet(st, {
            kind: "shard",
            x: px,
            y: box.y - 12,
            vx: (Math.random() - 0.5) * 24,
            vy: (155 + Math.random() * 45) * spdMul,
            w: 12,
            h: 22,
            radius: 6,
            color: "#67e8f9",
            accent: "#ffffff",
            damage: dmg,
            angle: Math.PI / 2,
            maxAge: 3.2
          })
        );
      }
      break;
    }

    // --- 3. SYNC-WEAVER Continuum Probe (YELLOW SOUL Shooter + Pull Rings) ---
    case "weaver_nodes_shoot": {
      if (every(st, "node", 0.94 * intMul, dt)) {
        const nx = box.x + 48 + ((st.step * 83) % Math.max(60, box.w - 96));
        out.push(
          makeBullet(st, {
            kind: "node",
            x: nx,
            y: box.y + 18,
            vx: Math.sin(st.step * 1.4) * 34 * spdMul,
            vy: 42 * spdMul,
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
      if (every(st, "side", 0.72 * intMul, dt)) {
        const fromL = st.step % 2 === 0;
        const py = box.y + 42 + Math.random() * (box.h - 74);
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: fromL ? box.x - 8 : box.x + box.w + 8,
            y: py,
            vx: (fromL ? 128 : -128) * spdMul,
            vy: 0,
            w: 12,
            h: 12,
            radius: 6,
            color: "#e879f9",
            accent: "#ffffff",
            damage: dmg,
            maxAge: 4.0
          })
        );
      }
      break;
    }

    case "weaver_pull_rings": {
      st.pullCenter = 44 * spdMul;
      if (every(st, "ring", 1.08 * intMul, dt)) {
        const gapIdx = (st.step * 3) % 10;
        const count = 10;
        const rad = Math.max(box.w, box.h) * 0.65;
        for (let i = 0; i < count; i++) {
          // Generous 3-slot exit corridor through converging harmonic ring
          if (i === gapIdx || i === (gapIdx + 1) % count || i === (gapIdx + 2) % count) continue;
          const a = (i / count) * Math.PI * 2 + st.step * 0.25;
          const sx = box.cx + Math.cos(a) * rad;
          const sy = box.cy + Math.sin(a) * rad;
          out.push(
            makeBullet(st, {
              kind: "ring_pellet",
              x: sx,
              y: sy,
              vx: -Math.cos(a) * 104 * spdMul,
              vy: -Math.sin(a) * 104 * spdMul,
              w: 12,
              h: 12,
              radius: 6,
              color: "#f0abfc",
              accent: "#facc15",
              damage: dmg,
              maxAge: 4.2
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "weaver_tether_spiral": {
      if (every(st, "spiral", 0.34 * intMul, dt)) {
        const a = st.step * 0.56;
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: box.cx,
            y: box.y + 18,
            vx: Math.cos(a) * 124 * spdMul,
            vy: (Math.abs(Math.sin(a)) * 108 + 52) * spdMul,
            w: 12,
            h: 12,
            radius: 6,
            color: "#c084fc",
            accent: "#ffffff",
            damage: dmg,
            maxAge: 4.0
          })
        );
        if (st.step % 3 === 0) {
          out.push(
            makeBullet(st, {
              kind: "node",
              x: box.x + 52 + ((st.step * 67) % Math.max(60, box.w - 104)),
              y: box.y + 16,
              vx: 0,
              vy: 50 * spdMul,
              w: 26,
              h: 26,
              radius: 13,
              color: "#facc15",
              accent: "#a855f7",
              damage: dmg,
              destructible: true,
              hp: 1,
              maxAge: 5.2
            })
          );
        }
        st.step++;
      }
      break;
    }

    // --- 4. Executor Vark (Mid-Boss: Crisp Rhythmic GREEN SOUL Spears + BLUE Sweep!) ---
    case "vark_spears_basic": {
      if (every(st, "spear", 0.64 * intMul, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const seq = [0, 1, 0, 3, 2, 1, 3, 0, 2, 3];
        const dir = dirs[seq[st.step % seq.length]];
        out.push(spawnDirectionalSpear(st, box, dir, 195 * spdMul, dmg, false));
        st.step++;
      }
      break;
    }

    case "vark_spears_reverse": {
      if (every(st, "spear", 0.68 * intMul, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const dir = dirs[(st.step * 3 + Math.floor(st.step / 4)) % 4];
        const isRev = st.step % 3 === 2;
        out.push(spawnDirectionalSpear(st, box, dir, (isRev ? 168 : 202) * spdMul, dmg, isRev));
        st.step++;
      }
      break;
    }

    case "vark_gravity_sweep": {
      if (every(st, "sweep", 0.96 * intMul, dt)) {
        const fromL = st.step % 2 === 0;
        const isOrange = st.step % 3 === 2;
        const h = isOrange ? 115 : 44 + (st.step % 2) * 18;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - h / 2 - 4,
            vx: (fromL ? 205 : -205) * spdMul,
            vy: 0,
            w: 18,
            h,
            radius: 9,
            color: isOrange ? "#fb923c" : "#ef4444",
            accent: "#fef08a",
            damage: dmg,
            motionRule: isOrange ? "orange" : undefined,
            maxAge: 3.8
          })
        );
        st.step++;
      }
      break;
    }

    // --- 5. FINAL BOSS: CHARON-Ω (All 4 Soul Modes + Dynamic Box!) ---
    case "charon_morse_grid": {
      if (every(st, "morse", 0.94 * intMul, dt)) {
        const horiz = st.step % 2 === 0;
        const pos = horiz
          ? box.y + 38 + ((st.step * 61) % Math.max(40, box.h - 76))
          : box.x + 42 + ((st.step * 79) % Math.max(40, box.w - 84));
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
            telegraph: 0.74,
            maxAge: 1.14
          })
        );
        st.step++;
      }
      if (!spareable && every(st, "tears", 0.42 * intMul, dt)) {
        const tx = box.x + 24 + Math.random() * (box.w - 48);
        out.push(
          makeBullet(st, {
            kind: "heart_tear",
            x: tx,
            y: box.y - 8,
            vx: Math.sin(st.elapsed * 3) * 30,
            vy: 130 * spdMul,
            w: 12,
            h: 16,
            radius: 6,
            color: "#7dd3fc",
            accent: "#fde047",
            damage: dmg,
            maxAge: 3.6
          })
        );
      }
      break;
    }

    case "charon_gravity_debris": {
      st.boxOffsetY = Math.round(Math.sin(st.elapsed * 2.0) * 7);
      if (every(st, "debris", 0.86 * intMul, dt)) {
        const fromL = st.step % 2 === 0;
        const lowH = 42 + (st.step % 2) * 16;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - lowH / 2 - 4,
            vx: (fromL ? 198 : -198) * spdMul,
            vy: 0,
            w: 16,
            h: lowH,
            radius: 8,
            color: "#fde047",
            accent: "#f59e0b",
            damage: dmg,
            maxAge: 3.8
          })
        );
        if (st.step % 3 === 1) {
          out.push(
            makeBullet(st, {
              kind: "orb",
              x: box.cx + (Math.random() - 0.5) * 180,
              y: box.y - 10,
              vx: 0,
              vy: 124 * spdMul,
              w: 14,
              h: 14,
              radius: 7,
              color: "#38bdf8",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 3.5
            })
          );
        }
        st.step++;
      }
      break;
    }

    case "charon_memory_spears": {
      if (every(st, "mem", 0.56 * intMul, dt)) {
        const dirs: Direction[] = ["up", "right", "down", "left"];
        const pattern = [0, 2, 1, 3, 0, 1, 2, 3, 1, 0, 3, 2];
        const dir = dirs[pattern[st.step % pattern.length]];
        const rev = st.step % 4 === 3;
        out.push(spawnDirectionalSpear(st, box, dir, (rev ? 175 : 215) * spdMul, dmg, rev));
        st.step++;
      }
      break;
    }

    case "charon_core_shoot": {
      st.boxOffsetX = Math.round(Math.sin(st.elapsed * 1.8) * 16);
      if (every(st, "anchor", 0.84 * intMul, dt)) {
        const nx = box.x + 44 + ((st.step * 73) % Math.max(60, box.w - 88));
        out.push(
          makeBullet(st, {
            kind: "node",
            x: nx,
            y: box.y + 14,
            vx: Math.cos(st.step * 1.7) * 40 * spdMul,
            vy: 56 * spdMul,
            w: 28,
            h: 28,
            radius: 14,
            color: "#f59e0b",
            accent: "#fef08a",
            damage: dmg,
            destructible: true,
            hp: 1,
            maxAge: 5.2
          })
        );
        st.step++;
      }
      if (every(st, "spark", 0.62 * intMul, dt)) {
        for (const side of [-1, 1]) {
          out.push(
            makeBullet(st, {
              kind: "shard",
              x: side < 0 ? box.x - 8 : box.x + box.w + 8,
              y: box.y + 44 + Math.random() * (box.h - 88),
              vx: -side * 145 * spdMul,
              vy: (Math.random() - 0.5) * 34,
              w: 14,
              h: 14,
              radius: 6,
              color: "#38bdf8",
              accent: "#ffffff",
              damage: dmg,
              maxAge: 3.5
            })
          );
        }
      }
      break;
    }

    // --- 5B. GENOCIDE / RUTHLESS UNHINGED CHARON-Ω ---
    case "charon_unhinged_box": {
      st.boxOffsetX = Math.round(Math.sin(st.elapsed * 2.8) * 40);
      st.boxOffsetY = Math.round(Math.cos(st.elapsed * 2.2) * 12);
      if (every(st, "beam", 0.72 * intMul, dt)) {
        const horiz = st.step % 2 === 0;
        out.push(
          makeBullet(st, {
            kind: "beam",
            x: horiz ? box.cx : soulX,
            y: horiz ? soulY : box.cy,
            vx: 0,
            vy: 0,
            w: horiz ? box.w - 6 : 19,
            h: horiz ? 19 : box.h - 6,
            radius: 9.5,
            color: "#ef4444",
            accent: "#fef08a",
            damage: dmg + 1,
            telegraph: 0.62,
            maxAge: 0.98
          })
        );
        st.step++;
      }
      if (every(st, "orb", 0.44 * intMul, dt)) {
        const a = st.step * 0.72;
        out.push(
          makeBullet(st, {
            kind: "orb",
            x: box.cx + Math.cos(a) * 180,
            y: box.cy + Math.sin(a) * 140,
            vx: -Math.cos(a) * 165 * spdMul,
            vy: -Math.sin(a) * 165 * spdMul,
            w: 13,
            h: 13,
            radius: 6,
            color: "#fca5a5",
            accent: "#ef4444",
            damage: dmg,
            maxAge: 3.6
          })
        );
      }
      break;
    }

    case "charon_unhinged_barrage": {
      if (every(st, "wall", 0.70 * intMul, dt)) {
        const fromL = st.step % 2 === 0;
        const h = 40 + (st.step % 3) * 16;
        out.push(
          makeBullet(st, {
            kind: "bone",
            x: fromL ? box.x - 14 : box.x + box.w + 14,
            y: box.y + box.h - h / 2 - 4,
            vx: (fromL ? 235 : -235) * spdMul,
            vy: 0,
            w: 16,
            h,
            radius: 8,
            color: "#ef4444",
            accent: "#ffffff",
            damage: dmg + 1,
            maxAge: 3.4
          })
        );
        st.step++;
      }
      if (every(st, "sky", 0.50 * intMul, dt)) {
        out.push(
          makeBullet(st, {
            kind: "shard",
            x: box.x + 24 + Math.random() * (box.w - 48),
            y: box.y - 12,
            vx: 0,
            vy: 190 * spdMul,
            w: 12,
            h: 22,
            radius: 6,
            color: "#f97316",
            accent: "#fef08a",
            damage: dmg,
            maxAge: 2.8
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
  const dist = 215;
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
    maxAge: 4.2
  });
}
