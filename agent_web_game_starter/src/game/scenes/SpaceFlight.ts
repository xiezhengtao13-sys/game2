import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { Camera } from "../../engine/graphics/Camera";

/**
 * Star System Celestial Body.
 */
export interface CelestialBody {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly glowColor: string;
  readonly desc: string;
}

export interface Asteroid {
  x: number;
  y: number;
  radius: number;
  angle: number;
  rotSpeed: number;
}

export interface IonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Macro-Scale Star System Navigation & Shuttle Flight.
 */
export class SpaceFlight {
  // System space bounds: 4400 x 3200 px
  readonly width = 4400;
  readonly height = 3200;

  // Shuttle state
  x = 880;
  y = 750;
  vx = 0;
  vy = 0;
  angle = Math.PI / 4; // Radians, 0 is east
  speed = 0;
  fuel = 100; // Percentage

  // Mothership docking port position
  readonly mothership = {
    x: 800,
    y: 700,
    width: 280,
    height: 90
  };

  // Target Planet Farthest-IV (远境-IV)
  readonly targetPlanet: CelestialBody = {
    id: "farthest_iv",
    name: "行星 · 远境-IV",
    x: 3400,
    y: 2300,
    radius: 84,
    color: "#4aa5d8",
    glowColor: "rgba(90, 180, 245, 0.25)",
    desc: "富含重氢冰晶与高密度硅酸盐矿脉的极地冻原行星"
  };

  // Central Star Dawn Star (恒星 · 初辉)
  readonly centralStar: CelestialBody = {
    id: "dawn_star",
    name: "恒星 · 初辉",
    x: 2200,
    y: 400,
    radius: 140,
    color: "#fff2cc",
    glowColor: "rgba(255, 210, 100, 0.35)",
    desc: "G型主序恒星，为全星系提供光与热"
  };

  // Derelict Research Buoy
  readonly researchBuoy = {
    id: "buoy_kaiyang",
    name: "开阳-03 废弃深空科研浮标",
    x: 2150,
    y: 1550,
    radius: 18,
    scanned: false
  };

  // Asteroid belt
  readonly asteroids: Asteroid[] = [];
  private readonly particles: IonParticle[] = [];
  private elapsedTime = 0;

  constructor() {
    // Generate deterministic asteroids along the Kaiyang Ring
    const beltX0 = 1600;
    const beltX1 = 2800;
    const beltY0 = 1200;
    const beltY1 = 1900;
    for (let i = 0; i < 32; i++) {
      const rx = beltX0 + (i * 137.5) % (beltX1 - beltX0);
      const ry = beltY0 + ((i * 269.3) % (beltY1 - beltY0));
      this.asteroids.push({
        x: rx,
        y: ry,
        radius: 12 + (i % 7) * 4,
        angle: (i * 45 * Math.PI) / 180,
        rotSpeed: ((i % 5) - 2) * 0.2
      });
    }
  }

  /** Reset shuttle back outside mothership bay. */
  spawnAtMothership(): void {
    this.x = 880;
    this.y = 750;
    this.vx = 25;
    this.vy = 25;
    this.angle = Math.PI / 4;
    this.fuel = 100;
  }

  /** Distance from shuttle to mothership dock. */
  distanceToMothership(): number {
    return Math.hypot(this.x - this.mothership.x, this.y - this.mothership.y);
  }

  /** Distance from shuttle to destination planet Farthest-IV. */
  distanceToPlanet(): number {
    return Math.hypot(this.x - this.targetPlanet.x, this.y - this.targetPlanet.y);
  }

  /** Distance to research buoy. */
  distanceToBuoy(): number {
    return Math.hypot(this.x - this.researchBuoy.x, this.y - this.researchBuoy.y);
  }

  update(dt: number, input: Input): void {
    this.elapsedTime += dt;

    // Rotate asteroids
    for (const a of this.asteroids) {
      a.angle += a.rotSpeed * dt;
    }

    // Steering controls (A / D or Left / Right)
    const turnRate = 2.4; // Radians / sec
    if (input.isDown("KeyA") || input.isDown("ArrowLeft")) {
      this.angle -= turnRate * dt;
    }
    if (input.isDown("KeyD") || input.isDown("ArrowRight")) {
      this.angle += turnRate * dt;
    }

    // Main thruster acceleration (W or Up)
    let thrusting = false;
    const accel = 180; // px / sec^2
    if (input.isDown("KeyW") || input.isDown("ArrowUp")) {
      thrusting = true;
      this.vx += Math.cos(this.angle) * accel * dt;
      this.vy += Math.sin(this.angle) * accel * dt;
      this.fuel = Math.max(0, this.fuel - dt * 0.5);

      // Emit ion particles
      const backX = this.x - Math.cos(this.angle) * 16;
      const backY = this.y - Math.sin(this.angle) * 16;
      for (let i = 0; i < 2; i++) {
        const spread = (Math.random() - 0.5) * 0.4;
        this.particles.push({
          x: backX,
          y: backY,
          vx: -Math.cos(this.angle + spread) * (80 + Math.random() * 40) + (Math.random() - 0.5) * 10,
          vy: -Math.sin(this.angle + spread) * (80 + Math.random() * 40) + (Math.random() - 0.5) * 10,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.2
        });
      }
    }

    // Retro-brake (S or Down)
    if (input.isDown("KeyS") || input.isDown("ArrowDown")) {
      this.vx *= Math.max(0, 1 - 2.5 * dt);
      this.vy *= Math.max(0, 1 - 2.5 * dt);
    }

    // Space: active RCS stabilizer
    if (input.isDown("Space")) {
      this.vx *= Math.max(0, 1 - 4.5 * dt);
      this.vy *= Math.max(0, 1 - 4.5 * dt);
    }

    // Drag / drift dampening
    const spaceDamp = 0.992;
    this.vx *= Math.pow(spaceDamp, dt * 60);
    this.vy *= Math.pow(spaceDamp, dt * 60);

    // Speed clamp (max 320 px/s)
    const currentSpeed = Math.hypot(this.vx, this.vy);
    const maxSpeed = 320;
    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    }
    this.speed = Math.hypot(this.vx, this.vy);

    // Apply movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp within star system boundaries
    this.x = Math.max(60, Math.min(this.width - 60, this.x));
    this.y = Math.max(60, Math.min(this.height - 60, this.y));

    // Update exhaust particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(renderer: Renderer): void {
    const { camera } = renderer;

    // 1. Deep Space Void with Parallax Stars
    this.renderStars(renderer, camera);

    // 2. Central Star Dawn Star (恒星 · 初辉)
    this.renderCentralStar(renderer);

    // 3. Planet Farthest-IV with Orbit Ring
    this.renderTargetPlanet(renderer);

    // 4. Asteroid Belt (开阳环)
    this.renderAsteroids(renderer);

    // 5. Research Buoy
    this.renderBuoy(renderer);

    // 6. Yuanwang Mothership (远望号母舰)
    this.renderMothership(renderer);

    // 7. Exhaust Particle Trails
    this.renderParticles(renderer);

    // 8. Player Shuttle Pioneer-1
    this.renderShuttle(renderer);

    // 9. Spaceflight Cockpit HUD Telemetry
    this.renderSpaceHud(renderer);
  }

  private renderStars(renderer: Renderer, camera: Camera): void {
    // Clear background to pitch black void
    renderer.clear("#04070d");

    // Draw multi-layer star grid
    const cols = 22;
    const rows = 16;
    const cellW = this.width / cols;
    const cellH = this.height / rows;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const sx = i * cellW + ((i * 73 + j * 91) % cellW);
        const sy = j * cellH + ((i * 127 + j * 43) % cellH);
        const brightness = ((i * 17 + j * 31) % 100) / 100;
        const color =
          brightness > 0.8
            ? "#cfe4ff"
            : brightness > 0.5
            ? "#e2ecf8"
            : "rgba(180, 205, 235, 0.4)";
        const size = brightness > 0.85 ? 2.5 : 1.5;
        renderer.drawRect(sx, sy, size, size, { color });
      }
    }
  }

  private renderCentralStar(renderer: Renderer): void {
    const star = this.centralStar;
    // Radiant coronal layers
    renderer.drawRect(star.x - 220, star.y - 220, 440, 440, {
      color: "rgba(255, 220, 110, 0.06)",
      radius: 220
    });
    renderer.drawRect(star.x - 170, star.y - 170, 340, 340, {
      color: "rgba(255, 230, 140, 0.15)",
      radius: 170
    });
    renderer.drawRect(star.x - star.radius, star.y - star.radius, star.radius * 2, star.radius * 2, {
      color: star.color,
      radius: star.radius
    });
    // Core flare
    renderer.drawRect(star.x - 60, star.y - 60, 120, 120, {
      color: "#ffffff",
      radius: 60
    });
    renderer.drawWorldText("恒星 · 初辉 (Dawn Star)", star.x - 70, star.y + star.radius + 15, {
      color: "#ffe082",
      size: 13
    });
  }

  private renderTargetPlanet(renderer: Renderer): void {
    const p = this.targetPlanet;

    // Atmospheric outer halo
    renderer.drawRect(p.x - p.radius - 24, p.y - p.radius - 24, (p.radius + 24) * 2, (p.radius + 24) * 2, {
      color: "rgba(70, 175, 240, 0.18)",
      radius: p.radius + 24
    });

    // Planetary body (Azure / ice blue)
    renderer.drawRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2, {
      color: p.color,
      radius: p.radius,
      stroke: { width: 2, color: "#92d4f8" }
    });

    // Cloud bands & ice polar cap
    renderer.drawRect(p.x - p.radius + 12, p.y - p.radius + 8, (p.radius - 12) * 2, 22, {
      color: "#e6f5ff",
      radius: 10
    });
    renderer.drawRect(p.x - p.radius + 8, p.y + 10, (p.radius - 8) * 2, 14, {
      color: "rgba(220, 240, 255, 0.6)",
      radius: 6
    });

    // Label and distance prompt
    const dist = Math.round(this.distanceToPlanet());
    renderer.drawWorldText(
      `🎯 远境-IV (Farthest-IV) · ${dist} km`,
      p.x - 90,
      p.y + p.radius + 16,
      { color: "#80d0ff", size: 14 }
    );
  }

  private renderAsteroids(renderer: Renderer): void {
    for (const a of this.asteroids) {
      renderer.drawRect(a.x - a.radius, a.y - a.radius, a.radius * 2, a.radius * 2, {
        color: "#6b7280",
        radius: a.radius * 0.7,
        stroke: { width: 1, color: "#4b5563" }
      });
      // Crater detail
      renderer.drawRect(a.x - a.radius * 0.3, a.y - a.radius * 0.3, a.radius * 0.5, a.radius * 0.5, {
        color: "#424855",
        radius: 3
      });
    }
  }

  private renderBuoy(renderer: Renderer): void {
    const b = this.researchBuoy;
    const pulse = (Math.sin(this.elapsedTime * 5) + 1) / 2;
    // Signal wave
    renderer.drawRect(b.x - 28, b.y - 28, 56, 56, {
      color: `rgba(100, 220, 255, ${(0.1 + pulse * 0.2).toFixed(2)})`,
      radius: 28
    });
    renderer.drawRect(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2, {
      color: "#d97706",
      radius: 4,
      stroke: { width: 2, color: "#fbbf24" }
    });
    renderer.drawWorldText("📡 开阳-03 科研浮标", b.x - 55, b.y + 24, {
      color: "#fcd34d",
      size: 11
    });
  }

  private renderMothership(renderer: Renderer): void {
    const m = this.mothership;
    // Central Spine
    renderer.drawRect(m.x - m.width / 2, m.y - 14, m.width, 28, {
      color: "#cbd5e1",
      radius: 6,
      stroke: { width: 2, color: "#334155" }
    });

    // 6 Modular Habitat blocks
    for (let i = 0; i < 3; i++) {
      const ox = m.x - 70 + i * 65;
      renderer.drawRect(ox - 20, m.y - 36, 40, 18, {
        color: "#94a3b8",
        radius: 4,
        stroke: { width: 1, color: "#1e293b" }
      });
      renderer.drawRect(ox - 20, m.y + 18, 40, 18, {
        color: "#94a3b8",
        radius: 4,
        stroke: { width: 1, color: "#1e293b" }
      });
    }

    // Dual Rotating Habitat Rings
    const ringAngle = this.elapsedTime * 0.8;
    const ringH = 55 + Math.sin(ringAngle) * 10;
    renderer.drawRect(m.x - 100, m.y - ringH / 2, 16, ringH, {
      color: "#64748b",
      radius: 8,
      stroke: { width: 2, color: "#0f172a" }
    });
    renderer.drawRect(m.x + 84, m.y - ringH / 2, 16, ringH, {
      color: "#64748b",
      radius: 8,
      stroke: { width: 2, color: "#0f172a" }
    });

    // Radiator Wings at Stern
    renderer.drawRect(m.x - m.width / 2 - 20, m.y - 48, 26, 96, {
      color: "#dc2626",
      radius: 3,
      stroke: { width: 1, color: "#7f1d1d" }
    });

    // Docking Berth Beacon
    const dockPulse = (Math.sin(this.elapsedTime * 6) + 1) / 2;
    renderer.drawRect(m.x - 12, m.y + 20, 24, 24, {
      color: `rgba(34, 197, 94, ${(0.4 + dockPulse * 0.4).toFixed(2)})`,
      radius: 12
    });
    renderer.drawWorldText("⚓ 远望号母舰 (Yuanwang Mothership)", m.x - 110, m.y - 60, {
      color: "#38bdf8",
      size: 14
    });
  }

  private renderParticles(renderer: Renderer): void {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      const size = 3 * alpha;
      renderer.drawRect(p.x - size / 2, p.y - size / 2, size, size, {
        color: `rgba(90, 210, 255, ${alpha.toFixed(2)})`,
        radius: size / 2
      });
    }
  }

  private renderShuttle(renderer: Renderer): void {
    // Draw shuttle oriented according to heading angle
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    // Shuttle nose, left wing, right wing, fuselage
    const noseX = this.x + cos * 16;
    const noseY = this.y + sin * 16;
    const tailX = this.x - cos * 12;
    const tailY = this.y - sin * 12;

    const leftWingX = this.x - cos * 6 - sin * 13;
    const leftWingY = this.y - sin * 6 + cos * 13;
    const rightWingX = this.x - cos * 6 + sin * 13;
    const rightWingY = this.y - sin * 6 - cos * 13;

    // Wings
    renderer.drawRect(leftWingX - 3, leftWingY - 3, 6, 6, {
      color: "#e2e8f0",
      radius: 2,
      stroke: { width: 1, color: "#1e293b" }
    });
    renderer.drawRect(rightWingX - 3, rightWingY - 3, 6, 6, {
      color: "#e2e8f0",
      radius: 2,
      stroke: { width: 1, color: "#1e293b" }
    });

    // Fuselage
    renderer.drawRect(this.x - 8, this.y - 8, 16, 16, {
      color: "#f8fafc",
      radius: 6,
      stroke: { width: 2, color: "#0f172a" }
    });

    // Cockpit canopy (cyan glowing glass)
    renderer.drawRect(noseX - 4, noseY - 4, 8, 8, {
      color: "#38bdf8",
      radius: 3,
      stroke: { width: 1, color: "#0369a1" }
    });

    // Twin Ion engine nozzles at tail
    renderer.drawRect(tailX - 4, tailY - 4, 8, 8, {
      color: "#f59e0b",
      radius: 2
    });
  }

  private renderSpaceHud(renderer: Renderer): void {
    // Cockpit telemetry readouts pinned to screen corners
    const distP = Math.round(this.distanceToPlanet());
    const distM = Math.round(this.distanceToMothership());
    const spd = Math.round(this.speed);

    // Space Flight status prompt
    let prompt = "";
    if (distP <= 140) {
      prompt = "【已进入行星引力井】按 E 启动大气耐磨绝热瓦着陆程序";
    } else if (distM <= 110) {
      prompt = "【已接近远望号机库泊位】按 E 对接并返回母舰";
    } else if (this.distanceToBuoy() <= 80) {
      prompt = "【已接近科研浮标】按 E 接收深空远古星图遥测数据";
    }

    if (prompt) {
      renderer.drawText(prompt, renderer.width / 2 - 180, renderer.height - 70, {
        color: "#fef08a",
        size: 15
      });
    }

    renderer.drawText(`⚡ 航行航速: ${spd} km/s  |  燃料储备: ${Math.round(this.fuel)}%`, 24, renderer.height - 40, {
      color: "#7dd3fc",
      size: 13
    });
    renderer.drawText(`🎯 目标距离: ${distP} km  |  母舰距离: ${distM} km`, renderer.width - 320, renderer.height - 40, {
      color: "#a7f3d0",
      size: 13
    });
  }
}
