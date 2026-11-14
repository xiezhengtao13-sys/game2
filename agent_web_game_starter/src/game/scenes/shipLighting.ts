import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap, TileType } from "../map/TileMap";
import { exteriorKindAt, placeAt, type Place } from "../map/shipMap";
import type { SceneProp } from "./shipProps";

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  kind: "dust" | "ember" | "cryo" | "spore";
}

function isWallType(t: TileType | null): boolean {
  return t === "wall" || t === "wall_dark" || t === "window" || t === "screen" || t === "hull";
}

function isWalkableDeck(t: TileType | null): boolean {
  return t === "deck" || t === "deck_dark" || t === "deck_rug" || t === "floor_light";
}

function wallExtrusionColors(
  place: Place,
  isDark: boolean,
  isScreen: boolean
): { stops: Array<{ offset: number; color: string }>; rim: string; seam: string } {
  if (isScreen) {
    return {
      stops: [
        { offset: 0, color: "#1d3557" },
        { offset: 0.7, color: "#11223b" },
        { offset: 1, color: "#081221" }
      ],
      rim: "rgba(103, 232, 249, 0.75)",
      seam: "rgba(15, 23, 42, 0.9)"
    };
  }
  switch (place) {
    case "crew_habitat":
    case "ring_module":
    case "cabin":
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#6b6154" },
              { offset: 0.55, color: "#4a4238" },
              { offset: 1, color: "#2d2720" }
            ]
          : [
              { offset: 0, color: "#b8aa96" },
              { offset: 0.5, color: "#8c7e6c" },
              { offset: 1, color: "#54493c" }
            ],
        rim: "rgba(247, 238, 222, 0.58)",
        seam: "rgba(38, 30, 22, 0.88)"
      };
    case "medical_bay":
    case "science_lab":
    case "rehab_center":
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#64748b" },
              { offset: 0.55, color: "#475569" },
              { offset: 1, color: "#273447" }
            ]
          : [
              { offset: 0, color: "#cbd5e1" },
              { offset: 0.5, color: "#94a3b8" },
              { offset: 1, color: "#52637a" }
            ],
        rim: "rgba(241, 245, 249, 0.65)",
        seam: "rgba(15, 23, 42, 0.85)"
      };
    case "archives":
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#5e5347" },
              { offset: 0.55, color: "#433b32" },
              { offset: 1, color: "#28231d" }
            ]
          : [
              { offset: 0, color: "#bfb09a" },
              { offset: 0.5, color: "#90816e" },
              { offset: 1, color: "#574c40" }
            ],
        rim: "rgba(248, 232, 200, 0.58)",
        seam: "rgba(28, 22, 16, 0.88)"
      };
    case "agri_module":
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#4a6657" },
              { offset: 0.55, color: "#32493d" },
              { offset: 1, color: "#1c2b23" }
            ]
          : [
              { offset: 0, color: "#a7c4b5" },
              { offset: 0.5, color: "#769987" },
              { offset: 1, color: "#42594d" }
            ],
        rim: "rgba(220, 252, 231, 0.52)",
        seam: "rgba(20, 38, 28, 0.88)"
      };
    case "industrial_bay":
    case "hangar_bay":
    case "reactor_bay":
    case "propulsion_aft":
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#475263" },
              { offset: 0.55, color: "#2b3340" },
              { offset: 1, color: "#151a22" }
            ]
          : [
              { offset: 0, color: "#78869b" },
              { offset: 0.5, color: "#525e70" },
              { offset: 1, color: "#2c3442" }
            ],
        rim: "rgba(251, 191, 36, 0.42)",
        seam: "rgba(10, 14, 20, 0.92)"
      };
    default:
      return {
        stops: isDark
          ? [
              { offset: 0, color: "#4b5568" },
              { offset: 0.55, color: "#2e3645" },
              { offset: 1, color: "#171c26" }
            ]
          : [
              { offset: 0, color: "#94a3b8" },
              { offset: 0.5, color: "#64748b" },
              { offset: 1, color: "#384354" }
            ],
        rim: "rgba(226, 232, 240, 0.52)",
        seam: "rgba(15, 23, 42, 0.88)"
      };
  }
}

/**
 * Baldur's Gate 3 / Diablo-grade 2.5D architectural extrusion, crisp boundary seams,
 * soft ambient occlusion, bright readable zone lighting, volumetric bloom,
 * and zone-specific atmospheric particles across all 15 compartments.
 */
export class ShipAtmosphere {
  private readonly particles: AmbientParticle[] = [];
  private spawnAccum = 0;

  update(
    dt: number,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    place: Place,
    crisisActive: boolean
  ): void {
    this.spawnAccum += dt;
    const isHot = crisisActive || place === "reactor_bay" || place === "propulsion_aft" || place === "industrial_bay";
    const targetCount = isHot ? 36 : place === "agri_module" ? 28 : 22;

    while (this.particles.length < targetCount && this.spawnAccum >= 0.06) {
      this.spawnAccum -= 0.06;
      let kind: AmbientParticle["kind"] = "dust";
      if (crisisActive || place === "reactor_bay" || place === "propulsion_aft") {
        kind = Math.random() < 0.72 ? "ember" : "dust";
      } else if (place === "industrial_bay") {
        kind = Math.random() < 0.45 ? "ember" : "dust";
      } else if (
        place === "medical_bay" ||
        place === "rehab_center" ||
        place === "science_lab" ||
        place === "fore_sensors"
      ) {
        kind = Math.random() < 0.65 ? "cryo" : "dust";
      } else if (place === "agri_module") {
        kind = Math.random() < 0.68 ? "spore" : "dust";
      }

      const px = camX + Math.random() * viewW;
      const py = camY + Math.random() * viewH;
      this.particles.push({
        x: px,
        y: py,
        vx: kind === "ember" ? (Math.random() - 0.5) * 32 : (Math.random() - 0.5) * 10,
        vy:
          kind === "ember"
            ? -18 - Math.random() * 26
            : kind === "cryo"
            ? -8 - Math.random() * 10
            : -3 - Math.random() * 6,
        size:
          kind === "ember"
            ? 1.8 + Math.random() * 2.2
            : kind === "cryo"
            ? 2.8 + Math.random() * 3.5
            : kind === "spore"
            ? 2.0 + Math.random() * 1.6
            : 1.4 + Math.random() * 1.4,
        life: 0,
        maxLife: 1.8 + Math.random() * 2.4,
        kind
      });
    }

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

  /**
   * Extrude 2.5D south-facing wall skirts with crisp top bevels, baseboard seams,
   * and clean floor Contact Ambient Occlusion so room & corridor boundaries pop sharply.
   */
  renderWallDepthAndAO(renderer: Renderer, map: TileMap): void {
    if (!renderer.drawGradientRect) return;
    const { camera } = renderer;
    const s = map.tileSize;
    const view = {
      x: camera.worldX,
      y: camera.worldY,
      width: camera.viewportWidth,
      height: camera.viewportHeight
    };

    for (const tile of map.visibleTiles(view)) {
      const { tx, ty, type } = tile;
      const wx = tx * s;
      const wy = ty * s;

      if (isWallType(type) && ty + 1 < map.height) {
        const south = map.tileAt(tx, ty + 1);
        if (isWalkableDeck(south)) {
          const isDark = type === "wall_dark" || type === "hull";
          const isScreen = type === "screen" || type === "window";
          const zone = placeAt(tx, ty + 1) === "structure" ? placeAt(tx, ty) : placeAt(tx, ty + 1);
          const palette = wallExtrusionColors(zone, isDark, isScreen);

          renderer.drawGradientRect(wx, wy + s, s, 10, palette.stops, true);

          // Crisp illuminated top lip of south wall skirt & dark floor-meet baseboard seam
          renderer.drawLine?.(wx, wy + s, wx + s, wy + s, palette.rim, 1.8);
          renderer.drawLine?.(wx, wy + s + 10, wx + s, wy + s + 10, palette.seam, 2);

          renderer.drawGradientRect(
            wx,
            wy + s + 10,
            s,
            8,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0.14)" },
              { offset: 1, color: "rgba(2, 4, 9, 0)" }
            ],
            true
          );

          if (type === "screen") {
            renderer.drawGradientRect(
              wx,
              wy + s,
              s,
              28,
              [
                { offset: 0, color: "rgba(56, 189, 248, 0.24)" },
                { offset: 1, color: "rgba(56, 189, 248, 0)" }
              ],
              true
            );
          }
        }
      }

      if (isWalkableDeck(type)) {
        if (tx > 0 && isWallType(map.tileAt(tx - 1, ty))) {
          renderer.drawGradientRect(
            wx,
            wy,
            6,
            s,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0.14)" },
              { offset: 1, color: "rgba(2, 4, 9, 0)" }
            ],
            false
          );
        }
        if (tx + 1 < map.width && isWallType(map.tileAt(tx + 1, ty))) {
          renderer.drawGradientRect(
            wx + s - 6,
            wy,
            6,
            s,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0)" },
              { offset: 1, color: "rgba(2, 4, 9, 0.14)" }
            ],
            false
          );
        }
      }
    }
  }

  /**
   * Render restrained atmospheric tint veil, fixture & suit light cutouts, subtle bloom
   * halos, and zone-specific atmospheric particles without crushing overall visibility.
   */
  renderLightingPass(
    renderer: Renderer,
    map: TileMap,
    props: readonly SceneProp[],
    playerX: number,
    playerY: number,
    beamAngleRad: number,
    place: Place,
    crisisActive: boolean,
    elapsedTime: number
  ): void {
    const ambient = this.ambientForZone(place, crisisActive, elapsedTime);
    const { camera } = renderer;
    const view = {
      x: camera.worldX,
      y: camera.worldY,
      width: camera.viewportWidth,
      height: camera.viewportHeight
    };
    const size = map.tileSize;

    // 1. Offscreen ambient shading buffer
    if (renderer.beginLightMask && renderer.punchLightHole && renderer.endLightMask) {
      renderer.beginLightMask(ambient);

      // Player soft work-lamp aura + directional beam
      renderer.punchLightHole(playerX, playerY - 14, 24, 150);
      renderer.punchLightHole(playerX, playerY - 14, 28, 250, beamAngleRad, Math.PI * 0.45);

      // Visible floor light strips, telemetry screens, viewports, and hull skin
      for (const tile of map.visibleTiles(view)) {
        const cx = tile.tx * size + size / 2;
        const cy = tile.ty * size + size / 2;
        if (tile.type === "floor_light") {
          renderer.punchLightHole(cx, cy, 14, 128);
        } else if (tile.type === "screen") {
          renderer.punchLightHole(cx, cy + 16, 18, 150);
        } else if (tile.type === "window") {
          renderer.punchLightHole(cx, cy, 24, 118);
        } else if (
          tile.type === "hull" &&
          tile.tx % 2 === 0 &&
          tile.ty % 2 === 0 &&
          exteriorKindAt(map, tile.tx, tile.ty) !== "space"
        ) {
          renderer.punchLightHole(cx, cy, 42, 118);
        }
      }

      // Fixture emissive light sources inside viewport bounds
      for (const prop of props) {
        if (
          prop.x < view.x - 240 ||
          prop.x > view.x + view.width + 240 ||
          prop.y < view.y - 240 ||
          prop.y > view.y + view.height + 240
        ) {
          continue;
        }
        const lightSpec = this.lightSpecForProp(prop, elapsedTime);
        if (lightSpec) {
          renderer.punchLightHole(prop.x, prop.y, 14, lightSpec.holeRadius);
        }
      }

      renderer.endLightMask();
    }

    // 2. Restrained additive color bloom halos (`lighter`) on top of scene
    if (renderer.drawRadialLight) {
      for (const tile of map.visibleTiles(view)) {
        const cx = tile.tx * size + size / 2;
        const cy = tile.ty * size + size / 2;
        if (tile.type === "floor_light") {
          renderer.drawRadialLight(
            cx,
            cy,
            54,
            crisisActive
              ? "rgba(239, 68, 68, 0.20)"
              : place === "agri_module"
              ? "rgba(74, 222, 128, 0.13)"
              : "rgba(245, 158, 11, 0.11)",
            "rgba(0,0,0,0)",
            true
          );
        }
      }

      for (const prop of props) {
        if (
          prop.x < view.x - 220 ||
          prop.x > view.x + view.width + 220 ||
          prop.y < view.y - 220 ||
          prop.y > view.y + view.height + 220
        ) {
          continue;
        }
        const lightSpec = this.lightSpecForProp(prop, elapsedTime);
        if (lightSpec) {
          renderer.drawRadialLight(
            prop.x,
            prop.y,
            lightSpec.bloomRadius,
            lightSpec.colorInner,
            "rgba(0,0,0,0)",
            true
          );
        }
      }

      // Subtle warm cone rim ahead of player
      const fx = playerX + Math.cos(beamAngleRad) * 56;
      const fy = playerY - 12 + Math.sin(beamAngleRad) * 56;
      renderer.drawRadialLight(
        fx,
        fy,
        88,
        crisisActive ? "rgba(255, 185, 120, 0.11)" : "rgba(255, 232, 186, 0.08)",
        "rgba(0,0,0,0)",
        true
      );
    }

    // 3. Atmospheric world particles
    for (const p of this.particles) {
      const fade = Math.sin((p.life / p.maxLife) * Math.PI);
      if (fade <= 0.05) continue;
      if (p.kind === "ember") {
        renderer.drawRadialLight?.(
          p.x,
          p.y,
          p.size * 3.5,
          `rgba(251, 146, 60, ${(fade * 0.60).toFixed(2)})`,
          "rgba(0,0,0,0)",
          true
        );
        renderer.drawRect(p.x - 1, p.y - 1, 2.2, 2.2, {
          color: `rgba(254, 240, 138, ${(fade * 0.90).toFixed(2)})`,
          radius: 1
        });
      } else if (p.kind === "cryo") {
        renderer.drawEllipse?.(
          p.x,
          p.y,
          p.size * 1.6,
          p.size * 0.9,
          `rgba(103, 232, 249, ${(fade * 0.12).toFixed(2)})`,
          true
        );
      } else if (p.kind === "spore") {
        renderer.drawRadialLight?.(
          p.x,
          p.y,
          p.size * 3.2,
          `rgba(74, 222, 128, ${(fade * 0.42).toFixed(2)})`,
          "rgba(0,0,0,0)",
          true
        );
        renderer.drawRect(p.x, p.y, p.size, p.size, {
          color: `rgba(187, 247, 208, ${(fade * 0.65).toFixed(2)})`,
          radius: p.size / 2
        });
      } else {
        renderer.drawRect(p.x, p.y, p.size, p.size, {
          color: `rgba(245, 224, 184, ${(fade * 0.28).toFixed(2)})`,
          radius: p.size / 2
        });
      }
    }
  }

  private ambientForZone(place: Place, crisisActive: boolean, t: number): string {
    if (crisisActive) {
      const pulse = (Math.sin(t * 4.2) + 1) / 2;
      const r = Math.round(32 + pulse * 30);
      const a = (0.34 - pulse * 0.06).toFixed(2);
      return `rgba(${r}, 6, 8, ${a})`;
    }
    switch (place) {
      case "crew_habitat":
        return "rgba(28, 20, 12, 0.02)";
      case "medical_bay":
      case "rehab_center":
        return "rgba(10, 20, 28, 0.02)";
      case "archives":
        return "rgba(22, 17, 11, 0.03)";
      case "ring_module":
        return "rgba(20, 16, 10, 0.03)";
      case "science_lab":
        return "rgba(8, 16, 28, 0.03)";
      case "agri_module":
        return "rgba(6, 20, 12, 0.04)";
      case "cabin":
        return "rgba(18, 14, 10, 0.05)";
      case "bridge":
        return "rgba(8, 14, 24, 0.06)";
      case "fore_sensors":
        return "rgba(8, 14, 26, 0.07)";
      case "hangar_bay":
        return "rgba(12, 18, 28, 0.07)";
      case "industrial_bay":
        return "rgba(16, 12, 8, 0.08)";
      case "reactor_bay":
        return "rgba(20, 10, 7, 0.10)";
      case "propulsion_aft":
        return "rgba(22, 10, 8, 0.10)";
      default:
        return "rgba(12, 16, 24, 0.04)";
    }
  }

  private lightSpecForProp(prop: SceneProp, t: number) {
    const id = prop.assetId;
    const flicker = 0.94 + Math.sin(t * 5.3 + prop.x * 0.1) * 0.06;

    if (prop.label.includes("弥涅瓦-V") || prop.label.includes("第五协议")) {
      return {
        holeRadius: 130,
        bloomRadius: 84,
        colorInner: "rgba(167, 139, 250, 0.20)"
      };
    }
    if (prop.label.includes("MNA-01") || prop.label.includes("卡戎号")) {
      return {
        holeRadius: 124,
        bloomRadius: 78,
        colorInner: "rgba(251, 191, 36, 0.18)"
      };
    }
    if (id === "fx_plant" && (prop.label.includes("水培") || prop.label.includes("氧循环") || prop.label.includes("苗圃"))) {
      return {
        holeRadius: 135,
        bloomRadius: 92,
        colorInner: "rgba(74, 222, 128, 0.18)"
      };
    }
    if (prop.label.includes("全自动恒温暖餐柜") || prop.label.includes("暖餐柜")) {
      return {
        holeRadius: 145 * flicker,
        bloomRadius: 96 * flicker,
        colorInner: "rgba(251, 191, 36, 0.22)"
      };
    }
    if (prop.label.includes("储物柜")) {
      return {
        holeRadius: 92,
        bloomRadius: 56,
        colorInner: "rgba(253, 230, 138, 0.12)"
      };
    }
    if (id === "fx_reading_lamp" || prop.label.includes("灯") || prop.label.includes("铺位") || prop.label.includes("床位") || prop.label.includes("狭铺") || prop.label.includes("康复监护床")) {
      return {
        holeRadius: 118 * flicker,
        bloomRadius: 72 * flicker,
        colorInner: "rgba(253, 230, 138, 0.18)"
      };
    }
    if (prop.label.includes("泄压") || prop.label.includes("反应堆") || prop.label.includes("展开栓") || prop.label.includes("散热") || prop.label.includes("喷口")) {
      return {
        holeRadius: 145 * flicker,
        bloomRadius: 105 * flicker,
        colorInner: "rgba(249, 115, 22, 0.22)"
      };
    }
    if (prop.label.includes("休眠舱") || prop.label.includes("神经")) {
      return {
        holeRadius: 120,
        bloomRadius: 78,
        colorInner: "rgba(45, 212, 191, 0.18)"
      };
    }
    if (id === "fx_command_chair" || id === "fx_meeting_table") {
      return {
        holeRadius: 165,
        bloomRadius: 105,
        colorInner: "rgba(245, 158, 11, 0.12)"
      };
    }
    if (id === "fx_holo_table" || id === "fx_console" || id === "fx_console_side" || id === "fx_terminal" || id === "fx_screen_lit") {
      return {
        holeRadius: 112,
        bloomRadius: 72,
        colorInner: "rgba(56, 189, 248, 0.15)"
      };
    }
    if (id === "fx_obswall") {
      return {
        holeRadius: 155,
        bloomRadius: 92,
        colorInner: "rgba(125, 211, 252, 0.12)"
      };
    }
    if (id === "fx_switch_panel") {
      return {
        holeRadius: 88,
        bloomRadius: 56,
        colorInner: "rgba(245, 158, 11, 0.11)"
      };
    }
    return null;
  }
}
