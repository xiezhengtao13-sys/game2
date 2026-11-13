import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { Camera } from "../../engine/graphics/Camera";
import { sounds } from "../../engine/audio/SoundEffects";

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
      sounds.startThruster();
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
    } else {
      sounds.stopThruster();
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
    // Clear background to deep cosmic obsidian
    renderer.clear("#03050a");

    // Volumetric deep-space nebula clouds (soft additive blooms at sector anchors)
    if (renderer.drawRadialLight) {
      renderer.drawRadialLight(1250, 900, 680, "rgba(30, 58, 138, 0.14)", "rgba(3, 5, 10, 0)", false);
      renderer.drawRadialLight(2900, 1450, 760, "rgba(88, 28, 135, 0.09)", "rgba(3, 5, 10, 0)", false);
      renderer.drawRadialLight(3400, 2300, 540, "rgba(14, 116, 144, 0.14)", "rgba(3, 5, 10, 0)", false);
      renderer.drawRadialLight(2200, 400, 920, "rgba(180, 83, 9, 0.13)", "rgba(3, 5, 10, 0)", false);
    }

    // Draw multi-layer parallax stars
    const cols = 26;
    const rows = 18;
    const cellW = this.width / cols;
    const cellH = this.height / rows;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const pxOffset = (i + j) % 2 === 0 ? camera.worldX * 0.08 : camera.worldX * 0.03;
        const pyOffset = (i + j) % 2 === 0 ? camera.worldY * 0.08 : camera.worldY * 0.03;
        const sx = (i * cellW + ((i * 73 + j * 91) % cellW) - pxOffset + this.width) % this.width;
        const sy = (j * cellH + ((i * 127 + j * 43) % cellH) - pyOffset + this.height) % this.height;
        const brightness = ((i * 17 + j * 31) % 100) / 100;
        const color =
          brightness > 0.88
            ? "#fde68a"
            : brightness > 0.72
            ? "#bae6fd"
            : brightness > 0.45
            ? "#cbd5e1"
            : "rgba(148, 163, 184, 0.35)";
        const size = brightness > 0.88 ? 2.6 : brightness > 0.65 ? 1.8 : 1.2;
        if (brightness > 0.92 && renderer.drawRadialLight) {
          renderer.drawRadialLight(sx + 1, sy + 1, 9, "rgba(186, 230, 253, 0.25)", "rgba(0,0,0,0)", true);
        }
        renderer.drawRect(sx, sy, size, size, { color });
      }
    }

    // Faint tactical nav trajectory guides from shuttle
    if (renderer.drawLine) {
      renderer.drawLine(
        this.x,
        this.y,
        this.targetPlanet.x,
        this.targetPlanet.y,
        "rgba(56, 189, 248, 0.16)",
        1.2,
        [8, 8]
      );
      if (!this.researchBuoy.scanned) {
        renderer.drawLine(
          this.x,
          this.y,
          this.researchBuoy.x,
          this.researchBuoy.y,
          "rgba(245, 158, 11, 0.18)",
          1.2,
          [5, 7]
        );
      }
    }
  }

  private renderCentralStar(renderer: Renderer): void {
    const star = this.centralStar;
    const pulse = Math.sin(this.elapsedTime * 1.8) * 14;

    if (renderer.drawRadialLight) {
      renderer.drawRadialLight(star.x, star.y, 440 + pulse, "rgba(234, 88, 12, 0.22)", "rgba(0,0,0,0)", true);
      renderer.drawRadialLight(star.x, star.y, 290 + pulse * 0.5, "rgba(251, 191, 36, 0.36)", "rgba(0,0,0,0)", true);
    }

    renderer.drawRect(star.x - star.radius, star.y - star.radius, star.radius * 2, star.radius * 2, {
      color: "#fde68a",
      radius: star.radius
    });
    renderer.drawRect(star.x - 86, star.y - 86, 172, 172, {
      color: "#fef3c7",
      radius: 86
    });
    renderer.drawRect(star.x - 48, star.y - 48, 96, 96, {
      color: "#ffffff",
      radius: 48
    });
    renderer.drawWorldText("✦ 恒星 · 初辉 (Dawn Star)", star.x, star.y + star.radius + 16, {
      color: "#fcd34d",
      size: 13,
      align: "center"
    });
  }

  private renderTargetPlanet(renderer: Renderer): void {
    const p = this.targetPlanet;

    // Luminous cryogenic azure atmosphere rim
    if (renderer.drawRadialLight) {
      renderer.drawRadialLight(p.x - 16, p.y - 18, p.radius + 54, "rgba(56, 189, 248, 0.32)", "rgba(0,0,0,0)", true);
    }

    // Lit planetary sphere
    renderer.drawRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2, {
      color: "#226799",
      radius: p.radius,
      stroke: { width: 2, color: "#7dd3fc" }
    });

    // Illuminated polar continent / cloud swirls on sunward upper-left hemisphere
    renderer.drawRect(p.x - p.radius + 14, p.y - p.radius + 10, (p.radius - 14) * 1.7, 24, {
      color: "#cbd5e1",
      radius: 11
    });
    renderer.drawRect(p.x - p.radius + 10, p.y - 6, (p.radius - 16) * 1.4, 14, {
      color: "rgba(186, 230, 253, 0.65)",
      radius: 7
    });

    // Nightside terminator shadow (cast opposite Dawn Star)
    renderer.drawEllipse?.(p.x + 20, p.y + 18, p.radius * 0.78, p.radius * 0.82, "rgba(2, 6, 14, 0.68)");

    const dist = Math.round(this.distanceToPlanet());
    renderer.drawWorldText(
      `🎯 远境-IV (Farthest-IV) · ${dist} km`,
      p.x,
      p.y + p.radius + 18,
      { color: "#7dd3fc", size: 13, align: "center" }
    );
  }

  private renderAsteroids(renderer: Renderer): void {
    for (const a of this.asteroids) {
      // Dark rocky underside + sunlit upper-left bevel
      renderer.drawRect(a.x - a.radius, a.y - a.radius, a.radius * 2, a.radius * 2, {
        color: "#334155",
        radius: a.radius * 0.65,
        stroke: { width: 1.5, color: "#64748b" }
      });
      renderer.drawRect(a.x - a.radius * 0.65, a.y - a.radius * 0.65, a.radius * 0.85, a.radius * 0.75, {
        color: "#64748b",
        radius: a.radius * 0.35
      });
      renderer.drawRect(a.x + a.radius * 0.05, a.y + a.radius * 0.05, a.radius * 0.55, a.radius * 0.55, {
        color: "#0f172a",
        radius: 4
      });
    }
  }

  private renderBuoy(renderer: Renderer): void {
    const b = this.researchBuoy;
    const pulse = (Math.sin(this.elapsedTime * 5) + 1) / 2;
    const beaconCol = b.scanned ? "rgba(52, 211, 153, 0.32)" : `rgba(245, 158, 11, ${(0.22 + pulse * 0.28).toFixed(2)})`;
    if (renderer.drawRadialLight) {
      renderer.drawRadialLight(b.x, b.y, 44 + pulse * 10, beaconCol, "rgba(0,0,0,0)", true);
    }
    renderer.drawRect(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2, {
      color: b.scanned ? "#0f766e" : "#b45309",
      radius: 4,
      stroke: { width: 2, color: b.scanned ? "#5eead4" : "#fbbf24" }
    });
    renderer.drawWorldText(
      b.scanned ? "✓ 开阳-03 浮标 (已下载)" : "📡 开阳-03 科研浮标",
      b.x,
      b.y + 24,
      { color: b.scanned ? "#6ee7b7" : "#fcd34d", size: 12, align: "center" }
    );
  }

  private renderMothership(renderer: Renderer): void {
    const m = this.mothership;
    // Engine plume & bay worklights
    if (renderer.drawRadialLight) {
      renderer.drawRadialLight(m.x - m.width / 2 - 22, m.y, 70, "rgba(239, 68, 68, 0.28)", "rgba(0,0,0,0)", true);
      renderer.drawRadialLight(m.x, m.y + 28, 52, "rgba(52, 211, 153, 0.25)", "rgba(0,0,0,0)", true);
    }

    // Central Spine (Brushed Titanium Dark)
    renderer.drawRect(m.x - m.width / 2, m.y - 14, m.width, 28, {
      color: "#64748b",
      radius: 6,
      stroke: { width: 2, color: "#1e293b" }
    });
    renderer.drawRect(m.x - m.width / 2 + 8, m.y - 8, m.width - 16, 8, {
      color: "#94a3b8",
      radius: 3
    });

    // 6 Modular Habitat blocks
    for (let i = 0; i < 3; i++) {
      const ox = m.x - 70 + i * 65;
      renderer.drawRect(ox - 20, m.y - 38, 40, 18, {
        color: "#475569",
        radius: 4,
        stroke: { width: 1.5, color: "#94a3b8" }
      });
      renderer.drawRect(ox - 20, m.y + 20, 40, 18, {
        color: "#475569",
        radius: 4,
        stroke: { width: 1.5, color: "#94a3b8" }
      });
    }

    // Dual Rotating Habitat Rings
    const ringAngle = this.elapsedTime * 0.8;
    const ringH = 58 + Math.sin(ringAngle) * 10;
    renderer.drawRect(m.x - 102, m.y - ringH / 2, 16, ringH, {
      color: "#334155",
      radius: 8,
      stroke: { width: 2, color: "#cbd5e1" }
    });
    renderer.drawRect(m.x + 86, m.y - ringH / 2, 16, ringH, {
      color: "#334155",
      radius: 8,
      stroke: { width: 2, color: "#cbd5e1" }
    });

    // Radiator Wings at Stern (dull ember copper)
    renderer.drawRect(m.x - m.width / 2 - 22, m.y - 48, 26, 96, {
      color: "#991b1b",
      radius: 3,
      stroke: { width: 1.5, color: "#f87171" }
    });

    // Docking Berth Beacon
    const dockPulse = (Math.sin(this.elapsedTime * 6) + 1) / 2;
    renderer.drawRect(m.x - 11, m.y + 20, 22, 22, {
      color: `rgba(52, 211, 153, ${(0.45 + dockPulse * 0.4).toFixed(2)})`,
      radius: 11,
      stroke: { width: 1, color: "#a7f3d0" }
    });
    renderer.drawWorldText("⚓ 远望号母舰 (Yuanwang)", m.x, m.y - 62, {
      color: "#38bdf8",
      size: 13,
      align: "center"
    });
  }

  private renderParticles(renderer: Renderer): void {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      const size = 3.2 * alpha;
      renderer.drawRadialLight?.(
        p.x,
        p.y,
        size * 3.2,
        `rgba(56, 189, 248, ${(alpha * 0.45).toFixed(2)})`,
        "rgba(0,0,0,0)",
        true
      );
      renderer.drawRect(p.x - size / 2, p.y - size / 2, size, size, {
        color: `rgba(186, 230, 253, ${alpha.toFixed(2)})`,
        radius: size / 2
      });
    }
  }

  private renderShuttle(renderer: Renderer): void {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const noseX = this.x + cos * 16;
    const noseY = this.y + sin * 16;
    const tailX = this.x - cos * 13;
    const tailY = this.y - sin * 13;

    const leftWingX = this.x - cos * 6 - sin * 13;
    const leftWingY = this.y - sin * 6 + cos * 13;
    const rightWingX = this.x - cos * 6 + sin * 13;
    const rightWingY = this.y - sin * 6 - cos * 13;

    // Ion nozzle bloom
    renderer.drawRadialLight?.(tailX, tailY, 22, "rgba(251, 191, 36, 0.38)", "rgba(0,0,0,0)", true);

    // Wing strut outline
    renderer.drawLine?.(leftWingX, leftWingY, rightWingX, rightWingY, "#94a3b8", 4);
    renderer.drawLine?.(tailX, tailY, noseX, noseY, "#cbd5e1", 5);

    // Fuselage
    renderer.drawRect(this.x - 8, this.y - 8, 16, 16, {
      color: "#cbd5e1",
      radius: 6,
      stroke: { width: 2, color: "#1e293b" }
    });

    // Cockpit canopy
    renderer.drawRect(noseX - 4, noseY - 4, 8, 8, {
      color: "#38bdf8",
      radius: 3,
      stroke: { width: 1, color: "#e0f2fe" }
    });

    // Twin Ion nozzle core
    renderer.drawRect(tailX - 3.5, tailY - 3.5, 7, 7, {
      color: "#f59e0b",
      radius: 3
    });
  }

  private renderSpaceHud(renderer: Renderer): void {
    const distP = Math.round(this.distanceToPlanet());
    const distM = Math.round(this.distanceToMothership());
    const spd = Math.round(this.speed);

    let prompt = "";
    if (distP <= 140) {
      prompt = "【已进入行星引力井】按 E 启动大气耐磨绝热瓦着陆程序";
    } else if (distM <= 110) {
      if (spd > 80) {
        prompt = `⚠️【进港航速过高: ${spd} km/s】接近母舰泊位时请按 S 减速至 80 km/s 以下方可安全停泊！`;
      } else {
        prompt = "【已对准泊位导引灯】按 E 执行磁吸对接并返回母舰";
      }
    } else if (this.distanceToBuoy() <= 80) {
      prompt = "【已接近科研浮标】按 E 接收深空远古星图遥测数据";
    }

    if (prompt) {
      const isWarn = prompt.includes("⚠️");
      renderer.drawText(prompt, renderer.width / 2, renderer.height - 64, {
        color: isWarn ? "#f87171" : "#fef08a",
        size: 14,
        align: "center"
      });
    }

    renderer.drawText(`⚡ 航行航速: ${spd} km/s  |  燃料储备: ${Math.round(this.fuel)}%`, 24, renderer.height - 32, {
      color: "#7dd3fc",
      size: 13
    });
    renderer.drawText(`🎯 目标距离: ${distP} km  |  母舰距离: ${distM} km`, renderer.width - 24, renderer.height - 32, {
      color: "#a7f3d0",
      size: 13,
      align: "right"
    });
  }
}
