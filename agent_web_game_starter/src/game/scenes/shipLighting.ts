import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap, TileType } from "../map/TileMap";
import type { Place } from "../map/shipMap";
import type { SceneProp } from "./shipProps";

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  kind: "dust" | "ember" | "cryo";
}

function isWallType(t: TileType | null): boolean {
  return t === "wall" || t === "wall_dark" || t === "window" || t === "screen" || t === "hull";
}

function isWalkableDeck(t: TileType | null): boolean {
  return t === "deck" || t === "deck_dark" || t === "deck_rug" || t === "floor_light";
}

/**
 * Baldur's Gate 3 / Diablo-grade 2.5D architectural extrusion, ambient occlusion,
 * dynamic darkness mask, directional tactical flashlight, volumetric bloom,
 * and zone-specific atmospheric particles. Pure game-layer code with zero DOM.
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
    const targetCount = crisisActive || place === "reactor_bay" ? 42 : 26;

    while (this.particles.length < targetCount && this.spawnAccum >= 0.06) {
      this.spawnAccum -= 0.06;
      let kind: AmbientParticle["kind"] = "dust";
      if (crisisActive || place === "reactor_bay") {
        kind = Math.random() < 0.72 ? "ember" : "dust";
      } else if (place === "medical_bay") {
        kind = Math.random() < 0.7 ? "cryo" : "dust";
      }

      const px = camX + Math.random() * viewW;
      const py = camY + Math.random() * viewH;
      this.particles.push({
        x: px,
        y: py,
        vx: kind === "ember" ? (Math.random() - 0.5) * 32 : (Math.random() - 0.5) * 10,
        vy: kind === "ember" ? -18 - Math.random() * 26 : kind === "cryo" ? -8 - Math.random() * 10 : -3 - Math.random() * 6,
        size: kind === "ember" ? 1.8 + Math.random() * 2.2 : kind === "cryo" ? 2.8 + Math.random() * 3.5 : 1.4 + Math.random() * 1.4,
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
   * Extrude 2.5D south-facing wall skirts and floor Contact Ambient Occlusion
   * along bulkhead boundaries so flat top-down tiles read like sculpted CRPG architecture.
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

      // Cast south-facing wall elevation skirt + deck AO shadow when wall borders walkable deck below
      if (isWallType(type) && ty + 1 < map.height) {
        const south = map.tileAt(tx, ty + 1);
        if (isWalkableDeck(south)) {
          const isDark = type === "wall_dark" || type === "hull";
          const isScreen = type === "screen" || type === "window";
          // Vertical 2.5D extruded bulkhead face (11px tall)
          renderer.drawGradientRect(
            wx,
            wy + s,
            s,
            11,
            isScreen
              ? [
                  { offset: 0, color: "#15263d" },
                  { offset: 0.7, color: "#0c1422" },
                  { offset: 1, color: "rgba(5, 9, 16, 0.9)" }
                ]
              : isDark
              ? [
                  { offset: 0, color: "#2d3544" },
                  { offset: 0.5, color: "#191e28" },
                  { offset: 1, color: "#0b0e14" }
                ]
              : [
                  { offset: 0, color: "#505a6b" },
                  { offset: 0.45, color: "#2b323e" },
                  { offset: 1, color: "#12161e" }
                ],
            true
          );

          // Crisp rim bevel at bulkhead cornice edge
          renderer.drawLine?.(
            wx,
            wy + s - 1,
            wx + s,
            wy + s - 1,
            type === "screen" ? "rgba(56, 189, 248, 0.55)" : "rgba(180, 196, 220, 0.24)",
            1
          );

          // Soft ambient occlusion cast onto floor below wall
          renderer.drawGradientRect(
            wx,
            wy + s + 11,
            s,
            14,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0.52)" },
              { offset: 1, color: "rgba(2, 4, 9, 0)" }
            ],
            true
          );

          if (type === "screen") {
            renderer.drawGradientRect(
              wx,
              wy + s,
              s,
              32,
              [
                { offset: 0, color: "rgba(56, 189, 248, 0.22)" },
                { offset: 1, color: "rgba(56, 189, 248, 0)" }
              ],
              true
            );
          }
        }
      }

      // Subtle side wall AO on walkable deck bordered west or east by a wall
      if (isWalkableDeck(type)) {
        if (tx > 0 && isWallType(map.tileAt(tx - 1, ty))) {
          renderer.drawGradientRect(
            wx,
            wy,
            10,
            s,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0.42)" },
              { offset: 1, color: "rgba(2, 4, 9, 0)" }
            ],
            false
          );
        }
        if (tx + 1 < map.width && isWallType(map.tileAt(tx + 1, ty))) {
          renderer.drawGradientRect(
            wx + s - 10,
            wy,
            10,
            s,
            [
              { offset: 0, color: "rgba(2, 4, 9, 0)" },
              { offset: 1, color: "rgba(2, 4, 9, 0.42)" }
            ],
            false
          );
        }
      }
    }
  }

  /**
   * Render darkness veil, real-time flashlight & fixture cutouts, additive glow
   * blooms, and floating embers/cryo mist/dust particles.
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

    // 1. Offscreen darkness buffer
    if (renderer.beginLightMask && renderer.punchLightHole && renderer.endLightMask) {
      renderer.beginLightMask(ambient);

      // Player tactical shoulder lamp aura + forward beam cone
      renderer.punchLightHole(playerX, playerY - 14, 18, 128);
      renderer.punchLightHole(playerX, playerY - 14, 24, 245, beamAngleRad, Math.PI * 0.42);

      // Visible floor light strips & screens carve pools of light
      for (const tile of map.visibleTiles(view)) {
        const cx = tile.tx * size + size / 2;
        const cy = tile.ty * size + size / 2;
        if (tile.type === "floor_light") {
          renderer.punchLightHole(cx, cy, 12, 118);
        } else if (tile.type === "screen") {
          renderer.punchLightHole(cx, cy + 16, 16, 145);
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

    // 2. Additive color bloom halos (`lighter`) on top of scene
    if (renderer.drawRadialLight) {
      for (const tile of map.visibleTiles(view)) {
        const cx = tile.tx * size + size / 2;
        const cy = tile.ty * size + size / 2;
        if (tile.type === "floor_light") {
          renderer.drawRadialLight(
            cx,
            cy,
            66,
            crisisActive ? "rgba(239, 68, 68, 0.22)" : "rgba(245, 158, 11, 0.16)",
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

      // Subtle warm tactical rim from player headlamp cone tip
      const fx = playerX + Math.cos(beamAngleRad) * 62;
      const fy = playerY - 12 + Math.sin(beamAngleRad) * 62;
      renderer.drawRadialLight(
        fx,
        fy,
        105,
        crisisActive ? "rgba(255, 185, 120, 0.13)" : "rgba(255, 224, 165, 0.11)",
        "rgba(0,0,0,0)",
        true
      );
    }

    // 3. Atmospheric world particles (embers, cryo mist, drifting gold dust)
    for (const p of this.particles) {
      const fade = Math.sin((p.life / p.maxLife) * Math.PI);
      if (fade <= 0.05) continue;
      if (p.kind === "ember") {
        renderer.drawRadialLight?.(
          p.x,
          p.y,
          p.size * 3.5,
          `rgba(251, 146, 60, ${(fade * 0.65).toFixed(2)})`,
          "rgba(0,0,0,0)",
          true
        );
        renderer.drawRect(p.x - 1, p.y - 1, 2.2, 2.2, {
          color: `rgba(254, 240, 138, ${(fade * 0.95).toFixed(2)})`,
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
      } else {
        renderer.drawRect(p.x, p.y, p.size, p.size, {
          color: `rgba(245, 215, 165, ${(fade * 0.35).toFixed(2)})`,
          radius: p.size / 2
        });
      }
    }
  }

  private ambientForZone(place: Place, crisisActive: boolean, t: number): string {
    if (crisisActive) {
      const pulse = (Math.sin(t * 4.2) + 1) / 2;
      const r = Math.round(28 + pulse * 36);
      const a = (0.58 - pulse * 0.08).toFixed(2);
      return `rgba(${r}, 6, 8, ${a})`;
    }
    switch (place) {
      case "cabin":
        return "rgba(8, 10, 17, 0.48)";
      case "bridge":
        return "rgba(6, 11, 20, 0.42)";
      case "medical_bay":
        return "rgba(5, 15, 22, 0.44)";
      case "reactor_bay":
        return "rgba(18, 7, 5, 0.58)";
      case "hangar_bay":
        return "rgba(8, 12, 20, 0.50)";
      case "crew_habitat":
        return "rgba(12, 10, 12, 0.45)";
      default:
        return "rgba(7, 10, 16, 0.52)";
    }
  }

  private lightSpecForProp(prop: SceneProp, t: number) {
    const id = prop.assetId;
    const flicker = 0.92 + Math.sin(t * 5.3 + prop.x * 0.1) * 0.08;

    if (id === "fx_reading_lamp" || prop.label.includes("灯") || prop.label.includes("铺位")) {
      return {
        holeRadius: 150 * flicker,
        bloomRadius: 115 * flicker,
        colorInner: "rgba(251, 191, 36, 0.28)"
      };
    }
    if (prop.label.includes("泄压") || prop.label.includes("反应堆") || prop.label.includes("展开栓")) {
      return {
        holeRadius: 165 * flicker,
        bloomRadius: 135 * flicker,
        colorInner: "rgba(249, 115, 22, 0.28)"
      };
    }
    if (prop.label.includes("休眠舱")) {
      return {
        holeRadius: 135,
        bloomRadius: 95,
        colorInner: "rgba(45, 212, 191, 0.22)"
      };
    }
    if (id === "fx_command_chair" || id === "fx_meeting_table") {
      return {
        holeRadius: 185,
        bloomRadius: 140,
        colorInner: "rgba(245, 158, 11, 0.15)"
      };
    }
    if (id === "fx_holo_table" || id === "fx_console" || id === "fx_console_side" || id === "fx_terminal" || id === "fx_screen_lit") {
      return {
        holeRadius: 125,
        bloomRadius: 85,
        colorInner: "rgba(56, 189, 248, 0.18)"
      };
    }
    if (id === "fx_obswall") {
      return {
        holeRadius: 170,
        bloomRadius: 110,
        colorInner: "rgba(125, 211, 252, 0.14)"
      };
    }
    if (id === "fx_switch_panel") {
      return {
        holeRadius: 95,
        bloomRadius: 65,
        colorInner: "rgba(245, 158, 11, 0.12)"
      };
    }
    return null;
  }
}
