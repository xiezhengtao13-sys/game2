import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import {
  ARCHIVES_ORIGIN,
  BRIDGE_ORIGIN,
  C7_ORIGIN,
  CABIN_ORIGIN,
  FORE_ORIGIN,
  HABITAT_ORIGIN,
  HANGAR_ORIGIN,
  L1_ORIGIN,
  L2_ORIGIN,
  MEDICAL_ORIGIN,
  PROPULSION_ORIGIN,
  R1_ORIGIN,
  R2_ORIGIN,
  REACTOR_ORIGIN,
  TRANSIT_ORIGIN
} from "../map/shipMap";
import type { SceneProp } from "./shipProps";

interface ViewRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function getViewRect(renderer: Renderer, pad = 160): ViewRect {
  const { camera } = renderer;
  return {
    x0: camera.worldX - pad,
    y0: camera.worldY - pad,
    x1: camera.worldX + camera.viewportWidth + pad,
    y1: camera.worldY + camera.viewportHeight + pad
  };
}

function inViewBox(view: ViewRect, x: number, y: number, w = 0, h = 0): boolean {
  return x + w >= view.x0 && x <= view.x1 && y + h >= view.y0 && y <= view.y1;
}

function drawStencil(
  renderer: Renderer,
  view: ViewRect,
  s: number,
  origin: { tx: number; ty: number },
  tx: number,
  ty: number,
  text: string,
  color = "rgba(226, 232, 240, 0.36)"
): void {
  const wx = (origin.tx + tx) * s;
  const wy = (origin.ty + ty) * s;
  if (!inViewBox(view, wx - 110, wy - 12, 220, 24)) return;
  renderer.drawWorldText(text, wx, wy, {
    color,
    size: 10,
    align: "center",
    baseline: "middle"
  });
}

/**
 * Renders compartment-specific architectural craft underneath furniture and characters:
 * zone stencils, utility piping, cryo rails, maglev shuttle car, hydroponic beds,
 * wet-room RO tanks, cleanroom optical grids, EEG telemetry walls, and heat-sink conduits.
 */
export function renderShipInteriorFloorDetails(
  renderer: Renderer,
  map: TileMap,
  _props: readonly SceneProp[],
  t: number,
  crisisActive: boolean
): void {
  const s = map.tileSize;
  const view = getViewRect(renderer, 220);

  // --- 0. Subtle Architectural Floor Stencils across all 15 Compartments ---
  drawStencil(renderer, view, s, FORE_ORIGIN, 15.0, 9.2, "0–300m  FORE SENSOR GALLERY");
  drawStencil(renderer, view, s, BRIDGE_ORIGIN, 20.5, 14.8, "COMMAND BRIDGE · TIER-2", "rgba(186, 230, 253, 0.44)");
  drawStencil(renderer, view, s, CABIN_ORIGIN, 12.0, 14.3, "CAPTAIN QUARTERS · TIER-3", "rgba(253, 230, 138, 0.36)");
  drawStencil(renderer, view, s, TRANSIT_ORIGIN, 17.0, 19.6, "CENTRAL TRANSIT HUB · 550–1050m");
  drawStencil(renderer, view, s, L1_ORIGIN, 10.5, 10.1, "L-1 CLOSED ECOLOGICAL BAY", "rgba(187, 247, 208, 0.48)");
  drawStencil(renderer, view, s, R1_ORIGIN, 7.8, 10.1, "R-1 SOCIAL · 440m RING ATRIUM", "rgba(253, 230, 138, 0.44)");
  drawStencil(renderer, view, s, HABITAT_ORIGIN, 16.0, 7.2, "SHIFT CONCOURSE · 02 SQUAD", "rgba(254, 243, 199, 0.38)");
  drawStencil(renderer, view, s, HABITAT_ORIGIN, 6.5, 8.2, "DORM A1–A2", "rgba(245, 224, 184, 0.42)");
  drawStencil(renderer, view, s, HABITAT_ORIGIN, 6.5, 14.8, "DORM B1–B2", "rgba(245, 224, 184, 0.42)");
  drawStencil(renderer, view, s, HABITAT_ORIGIN, 25.0, 8.2, "MESS HALL & GALLEY", "rgba(253, 224, 155, 0.42)");
  drawStencil(renderer, view, s, HABITAT_ORIGIN, 28.5, 21.0, "RO WATER UTILITY", "rgba(186, 230, 253, 0.44)");
  drawStencil(renderer, view, s, L2_ORIGIN, 13.8, 10.1, "L-2 FOUNDRY & CNC", "rgba(251, 191, 36, 0.46)");
  drawStencil(renderer, view, s, R2_ORIGIN, 12.0, 10.5, "R-2 SPECTROSCOPY & GEO LAB", "rgba(186, 230, 253, 0.44)");
  drawStencil(renderer, view, s, MEDICAL_ORIGIN, 15.0, 6.8, "MEDICAL & CRYO CORE · 12,408 SLEEPERS", "rgba(165, 243, 252, 0.46)");
  drawStencil(renderer, view, s, C7_ORIGIN, 13.2, 7.5, "C-7 NEURO REHAB CENTER", "rgba(153, 246, 228, 0.48)");
  drawStencil(renderer, view, s, ARCHIVES_ORIGIN, 15.2, 7.5, "HISTORICAL ARCHIVES · MNA-01", "rgba(253, 230, 138, 0.46)");
  drawStencil(renderer, view, s, HANGAR_ORIGIN, 7.0, 16.0, "BERTH 01 · PIONEER-1", "rgba(251, 191, 36, 0.46)");
  drawStencil(renderer, view, s, HANGAR_ORIGIN, 25.0, 15.8, "EVA AIRLOCK · 101.3 kPa", "rgba(186, 230, 253, 0.44)");
  drawStencil(renderer, view, s, REACTOR_ORIGIN, 16.0, 4.2, "SHIELDED D-³He CONTROL", "rgba(253, 186, 116, 0.45)");
  drawStencil(renderer, view, s, PROPULSION_ORIGIN, 22.8, 5.4, "AFT PROPULSION BAY", "rgba(252, 165, 165, 0.46)");
  drawStencil(renderer, view, s, PROPULSION_ORIGIN, 33.2, 5.4, "1,200m RADIATOR GALLERY", "rgba(252, 165, 165, 0.46)");

  // --- 1. Fore Deep-Space Sensor Array (0–300m Bow) ---
  {
    const bx = FORE_ORIGIN.tx * s;
    const by = FORE_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 30 * s, 14 * s)) {
      // Optical telescope barrel & brass azimuth mount on port pad (tiles 3..11, 3..6)
      renderer.drawRect(bx + 3.6 * s, by + 3.4 * s, 7.8 * s, 3.2 * s, {
        color: "rgba(15, 23, 42, 0.45)",
        stroke: { width: 1.5, color: "rgba(148, 163, 184, 0.55)" },
        radius: 6
      });
      renderer.drawEllipse?.(bx + 7.5 * s, by + 4.9 * s, 1.8 * s, 1.3 * s, "rgba(51, 65, 85, 0.72)");
      renderer.drawRect(bx + 6.4 * s, by + 2.6 * s, 2.2 * s, 3.6 * s, {
        color: "#64748b",
        stroke: { width: 1.5, color: "#cbd5e1" },
        radius: 4
      });
      renderer.drawEllipse?.(bx + 7.5 * s, by + 2.8 * s, 0.8 * s, 0.45 * s, "rgba(125, 211, 252, 0.55)");

      // Starboard phased radar emitter ring (tiles 18..26, 3..6)
      const rx = bx + 22.5 * s;
      const ry = by + 4.9 * s;
      renderer.drawRect(bx + 18.6 * s, by + 3.4 * s, 7.8 * s, 3.2 * s, {
        color: "rgba(15, 23, 42, 0.45)",
        stroke: { width: 1.5, color: "rgba(148, 163, 184, 0.55)" },
        radius: 6
      });
      renderer.drawEllipse?.(rx, ry, 2.2 * s, 1.45 * s, "rgba(30, 58, 95, 0.55)");
      const ang = t * 0.9;
      renderer.drawLine?.(rx, ry, rx + Math.cos(ang) * 78, ry + Math.sin(ang) * 48, "rgba(56, 189, 248, 0.65)", 2);

      // Animated horizon waveform on North Telemetry Screen row (y=1, x 8..21)
      const scrX = bx + 8 * s;
      const scrY = by + 1 * s;
      const scrW = 14 * s;
      for (let i = 0; i < 24; i++) {
        const px = scrX + 12 + i * ((scrW - 24) / 24);
        const amp = 4 + Math.sin(t * 2.4 + i * 0.65) * 6 + Math.cos(t * 1.1 + i * 1.3) * 4;
        renderer.drawRect(px, scrY + s * 0.52 - Math.abs(amp) * 0.5, 3, Math.abs(amp) + 3, {
          color: crisisActive ? "rgba(248, 113, 113, 0.72)" : "rgba(56, 189, 248, 0.72)",
          radius: 1
        });
      }
    }
  }

  // --- 2. Command Bridge Architecture & Subtle Floor Data Conduits ---
  {
    const bx = BRIDGE_ORIGIN.tx * s;
    const by = BRIDGE_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 40 * s, 20 * s)) {
      const cx = bx + 20 * s;
      const cy = by + 7.2 * s;
      // Restrained recessed command dais oval
      renderer.drawEllipse?.(cx, cy + 4, 2.7 * s, 1.5 * s, "rgba(30, 41, 59, 0.52)");
      renderer.drawEllipse?.(cx, cy + 4, 2.55 * s, 1.38 * s, "rgba(148, 163, 184, 0.16)");

      // Hardwired copper/cyan under-deck bus lines from Plotting Table (21.2, 11.2) to stations
      const px = bx + 21.2 * s;
      const py = by + 11.2 * s;
      const busCol = crisisActive ? "rgba(248, 113, 113, 0.28)" : "rgba(125, 211, 252, 0.26)";
      const stations = [
        [12.2, 6.2],
        [27.2, 6.2],
        [7.2, 8.2],
        [32.2, 8.2],
        [14.2, 14.0],
        [25.2, 14.0],
        [24.5, 8.2]
      ];
      for (const [stx, sty] of stations) {
        const tx = bx + stx * s;
        const ty = by + sty * s;
        renderer.drawLine?.(px, py, tx, py, busCol, 2.2);
        renderer.drawLine?.(tx, py, tx, ty, busCol, 2.2);
      }

      // Panoramic curved screen telemetry ticks & pinpoint starfield along forward wall y=5
      const fy = by + 5 * s + 14;
      for (let i = 0; i < 18; i++) {
        const starX = bx + 9 * s + ((i * 53 + 17) % (21 * s));
        const starY = fy + ((i * 19 + 5) % 18);
        renderer.drawRect(starX, starY, i % 4 === 0 ? 2.5 : 1.5, i % 4 === 0 ? 2.5 : 1.5, {
          color: i % 5 === 0 ? "rgba(253, 230, 138, 0.85)" : "rgba(224, 242, 254, 0.82)"
        });
      }
      // Subtle 2491 detour vector line on main bridge telemetry screen
      renderer.drawLine?.(bx + 15 * s, fy + 10, bx + 22 * s, fy + 7, "rgba(56, 189, 248, 0.65)", 1.5);
      renderer.drawLine?.(bx + 22 * s, fy + 7, bx + 25 * s, fy + 14, "rgba(251, 191, 36, 0.78)", 1.5, [4, 3]);
    }
  }

  // --- 3. Captain's Cabin Wood Inlay & Real-Space Star Viewport ---
  {
    const bx = CABIN_ORIGIN.tx * s;
    const by = CABIN_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 24 * s, 16 * s)) {
      // Quiet pinpoint stars inside the 6-tile curved observation screen
      const obsX = bx + 3.2 * s;
      const obsY = by + 6;
      const obsW = 5.6 * s;
      renderer.drawRect(obsX, obsY, obsW, 24, {
        color: "rgba(4, 10, 22, 0.78)",
        stroke: { width: 1.5, color: "rgba(186, 230, 253, 0.45)" },
        radius: 4
      });
      for (let i = 0; i < 14; i++) {
        const sx = obsX + 10 + ((i * 37 + Math.floor(t * 2)) % (obsW - 20));
        const sy = obsY + 4 + ((i * 11) % 16);
        renderer.drawRect(sx, sy, 1.5, 1.5, {
          color: i % 3 === 0 ? "#fde68a" : "#e0f2fe"
        });
      }
    }
  }

  // --- 4. Central Transit Hub: Docked Autonomous Maglev Rail Car ---
  {
    const bx = TRANSIT_ORIGIN.tx * s;
    const by = TRANSIT_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 34 * s, 24 * s)) {
      // Parked sleek shuttle carriage on West spur (cols 4.2..11.2, rows 11.2..13.8), zero overlap with crossing (15..18)
      const cx = bx + 4.3 * s;
      const cy = by + 11.25 * s;
      const cw = 6.9 * s;
      const ch = 2.5 * s;
      renderer.drawRect(cx + 3, cy + 5, cw, ch, { color: "rgba(2, 6, 23, 0.50)", radius: 14 });
      // Magnetic levitation bogie skirts under flanks
      renderer.drawRect(cx + 18, cy - 3, cw - 36, ch + 6, {
        color: "#334155",
        stroke: { width: 1, color: "#64748b" },
        radius: 6
      });
      // Brushed titanium pressure hull with chamfered ends
      renderer.drawRect(cx, cy, cw, ch, {
        color: "#cbd5e1",
        stroke: { width: 2, color: "#475569" },
        radius: 16
      });
      // Aerodynamic obsidian nose fairings (West & East)
      renderer.drawRect(cx + 6, cy + 12, 26, ch - 24, {
        color: "#0f172a",
        stroke: { width: 1.5, color: "#38bdf8" },
        radius: 8
      });
      renderer.drawRect(cx + cw - 34, cy + 10, 26, ch - 20, {
        color: "#0f172a",
        stroke: { width: 1.5, color: "#38bdf8" },
        radius: 8
      });
      // Center brushed alloy passenger cabin roof fairing
      renderer.drawRect(cx + 42, cy + 8, cw - 84, ch - 16, {
        color: "#1e293b",
        stroke: { width: 1.5, color: "#94a3b8" },
        radius: 6
      });
      // Twin rows of compact illuminated passenger viewport windows along north & south flanks
      for (let wIdx = 0; wIdx < 6; wIdx++) {
        const wx = cx + 52 + wIdx * 39;
        renderer.drawRect(wx, cy + 13, 24, 12, {
          color: "rgba(253, 224, 155, 0.85)",
          stroke: { width: 1, color: "#64748b" },
          radius: 3
        });
        renderer.drawRect(wx, cy + ch - 25, 24, 12, {
          color: "rgba(253, 224, 155, 0.85)",
          stroke: { width: 1, color: "#64748b" },
          radius: 3
        });
      }
      // Roof HVAC ridge & crisp high-contrast nameplate plaque
      renderer.drawRect(cx + cw / 2 - 76, cy + ch / 2 - 11, 152, 22, {
        color: "#e2e8f0",
        stroke: { width: 1.2, color: "#475569" },
        radius: 5
      });
      renderer.drawWorldText("YUANWANG SHUTTLE · 02", cx + cw / 2, cy + ch / 2, {
        color: "#0f172a",
        size: 10,
        align: "center",
        baseline: "middle"
      });
      // Amber docking headway indicator on East nose facing crosswalk
      const lit = Math.sin(t * 3.2) > 0;
      renderer.drawRect(cx + cw - 9, cy + ch / 2 - 5, 7, 10, {
        color: lit ? "#fbbf24" : "#92400e",
        radius: 3
      });
    }
  }

  // --- 5. Crew Habitat: Entry Mats, Galley Vents & Wet RO Water Tanks ---
  {
    const bx = HABITAT_ORIGIN.tx * s;
    const by = HABITAT_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 32 * s, 23 * s)) {
      // Dorm A & Dorm B cozy woven threshold mats
      renderer.drawRect(bx + 9.05 * s, by + 8.1 * s, 1.9 * s, 0.72 * s, {
        color: "rgba(180, 130, 82, 0.55)",
        stroke: { width: 1, color: "rgba(245, 220, 180, 0.65)" },
        radius: 4
      });
      renderer.drawRect(bx + 9.05 * s, by + 14.15 * s, 1.9 * s, 0.72 * s, {
        color: "rgba(180, 130, 82, 0.55)",
        stroke: { width: 1, color: "rgba(245, 220, 180, 0.65)" },
        radius: 4
      });
      // Kitchen stainless apron floor grille (x 28..29.6, y 2..7)
      for (let ky = 2.4; ky <= 7.0; ky += 1.5) {
        renderer.drawRect(bx + 28.15 * s, by + ky * s, 1.45 * s, 0.9 * s, {
          color: "rgba(15, 23, 42, 0.25)",
          stroke: { width: 1, color: "rgba(148, 163, 184, 0.5)" },
          radius: 3
        });
      }

      // Wet-zone RO Water Filtration Tanks & Floor Plumbing (x 27..30, y 14..21)
      const pipeRaw = "rgba(56, 189, 248, 0.62)";
      const pipePure = "rgba(52, 211, 153, 0.65)";
      renderer.drawLine?.(bx + 28.5 * s, by + 15.5 * s, bx + 28.5 * s, by + 19.8 * s, pipeRaw, 4);
      renderer.drawLine?.(bx + 27.6 * s, by + 14.5 * s, bx + 27.6 * s, by + 19.8 * s, pipePure, 3);
      renderer.drawLine?.(bx + 27.6 * s, by + 17.8 * s, bx + 29.8 * s, by + 17.8 * s, pipeRaw, 3);
      renderer.drawLine?.(bx + 28.5 * s, by + 19.8 * s, bx + 29.8 * s, by + 19.8 * s, pipePure, 3);
      for (const tyTank of [17.9, 19.9]) {
        const txCenter = bx + 30.0 * s;
        const tyCenter = by + tyTank * s;
        renderer.drawEllipse?.(txCenter, tyCenter, 24, 17, "#1e293b");
        renderer.drawEllipse?.(txCenter, tyCenter, 20, 14, "rgba(14, 116, 144, 0.88)");
        renderer.drawEllipse?.(txCenter, tyCenter - 2, 13, 8, "rgba(103, 232, 249, 0.56)");
      }
    }
  }

  // --- 6. L-1 Ecological Module: Nutrient Pipe Mains & Hydroponic Trough Trays ---
  {
    const bx = L1_ORIGIN.tx * s;
    const by = L1_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 20 * s, 22 * s)) {
      // Nutrient/cooling pipe trunks running East from West pumps (x=2) to beds
      const pipeCol = "rgba(56, 189, 248, 0.48)";
      const greenPipe = "rgba(74, 222, 128, 0.48)";
      renderer.drawLine?.(bx + 1.9 * s, by + 5.0 * s, bx + 14.5 * s, by + 5.0 * s, pipeCol, 3.5);
      renderer.drawLine?.(bx + 1.9 * s, by + 17.0 * s, bx + 14.5 * s, by + 17.0 * s, greenPipe, 3.5);
      renderer.drawLine?.(bx + 2.4 * s, by + 5.0 * s, bx + 2.4 * s, by + 17.0 * s, pipeCol, 3.5);

      // Hydroponic bed framing & crop rows inside all 4 beds
      const beds = [
        { x: 3, y: 3, w: 5, h: 4, kind: "grain" as const },
        { x: 10, y: 3, w: 5, h: 4, kind: "algae" as const },
        { x: 3, y: 15, w: 5, h: 4, kind: "root" as const },
        { x: 10, y: 15, w: 5, h: 4, kind: "shrub" as const }
      ];
      for (const bed of beds) {
        const px = bx + bed.x * s + 6;
        const py = by + bed.y * s + 6;
        const pw = bed.w * s - 12;
        const ph = bed.h * s - 12;
        renderer.drawRect(px, py, pw, ph, {
          color: bed.kind === "algae" ? "rgba(6, 78, 59, 0.55)" : "rgba(20, 48, 30, 0.48)",
          stroke: { width: 2, color: "rgba(148, 163, 184, 0.68)" },
          radius: 5
        });
        // Parallel raised nutrient gutters & soil rows
        for (let r = 0; r < 3; r++) {
          const ry = py + 18 + r * 54;
          if (bed.kind === "algae") {
            renderer.drawRect(px + 12, ry, pw - 24, 34, {
              color: "rgba(16, 185, 129, 0.36)",
              stroke: { width: 1.2, color: "rgba(110, 231, 183, 0.55)" },
              radius: 8
            });
            // Shimmering oxygen micro-bubbles
            for (let b = 0; b < 5; b++) {
              const bubX = px + 24 + ((b * 41 + Math.floor(t * 24 + r * 17)) % (pw - 48));
              const bubY = ry + 10 + ((b * 9 + Math.floor(t * 14)) % 14);
              renderer.drawRect(bubX, bubY, 4, 4, { color: "rgba(209, 250, 229, 0.78)", radius: 2 });
            }
          } else {
            renderer.drawRect(px + 12, ry, pw - 24, 28, {
              color: bed.kind === "grain" ? "rgba(63, 98, 18, 0.48)" : "rgba(22, 101, 52, 0.46)",
              stroke: { width: 1, color: "rgba(134, 239, 172, 0.35)" },
              radius: 4
            });
          }
        }
      }
    }
  }

  // --- 7. R-1 Social Atrium: Curved Ring Deck Arcs & 0.45g Fitness Strip ---
  {
    const bx = R1_ORIGIN.tx * s;
    const by = R1_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 20 * s, 22 * s)) {
      // Sweeping arc lines on the East Observation Promenade (cols 15..18) hinting at the 440m spin ring geometry
      for (let i = 0; i < 6; i++) {
        const yTop = by + (3.5 + i * 2.7) * s;
        renderer.drawLine?.(bx + 15.3 * s, yTop, bx + 18.6 * s, yTop + 14, "rgba(253, 230, 138, 0.20)", 1.5);
      }
      // 0.45g Resistance Exercise Lane markings on SE pad (cols 15..16, rows 15..18)
      renderer.drawRect(bx + 15.1 * s, by + 15.1 * s, 1.8 * s, 3.8 * s, {
        stroke: { width: 1.5, color: "rgba(56, 189, 248, 0.50)" },
        radius: 4
      });
      renderer.drawWorldText("0.45g GYM", bx + 16.0 * s, by + 18.4 * s, {
        color: "rgba(186, 230, 253, 0.58)",
        size: 9,
        align: "center"
      });
    }
  }

  // --- 8. L-2 Industrial Bay: Overhead Crane Track, Chevrons & Raw Stock ---
  {
    const bx = L2_ORIGIN.tx * s;
    const by = L2_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 21 * s, 23 * s)) {
      // Overhead Gantry Crane I-Beam Rails (col 8.8 from y=2.5 to y=19.5)
      renderer.drawRect(bx + 8.35 * s, by + 2.8 * s, s * 0.9, 16.5 * s, {
        color: "rgba(15, 23, 42, 0.22)",
        stroke: { width: 1.5, color: "rgba(245, 158, 11, 0.42)" }
      });
      renderer.drawLine?.(bx + 8.8 * s, by + 2.8 * s, bx + 8.8 * s, by + 19.3 * s, "rgba(245, 158, 11, 0.55)", 2, [10, 6]);

      // Stacked Ti-6Al-4V Metal Stock Bars on SW corner (cols 2..6, row 20.6)
      for (let b = 0; b < 4; b++) {
        renderer.drawRect(bx + 2.0 * s, by + 20.3 * s + b * 9, 3.8 * s, 6, {
          color: b % 2 === 0 ? "#64748b" : "#94a3b8",
          stroke: { width: 1, color: "#1e293b" },
          radius: 2
        });
      }
    }
  }

  // --- 9. R-2 Science Cleanroom: Optical Interferometer Grid & Air Shower ---
  {
    const bx = R2_ORIGIN.tx * s;
    const by = R2_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 21 * s, 23 * s)) {
      // Air-shower floor grates inside West Decontamination Airlock (cols 1.5..3.5, rows 10..12)
      for (let ay = 10.3; ay <= 12.2; ay += 0.9) {
        renderer.drawRect(bx + 1.4 * s, by + ay * s, 2.2 * s, 0.5 * s, {
          color: "rgba(15, 23, 42, 0.25)",
          stroke: { width: 1, color: "rgba(125, 211, 252, 0.45)" },
          radius: 2
        });
      }
      // Subtle cyan laser interferometer calibration hairlines on Spectroscopy deck (x 6..17, y 2..7)
      renderer.drawLine?.(bx + 6.5 * s, by + 5.0 * s, bx + 17.5 * s, by + 5.0 * s, "rgba(56, 189, 248, 0.28)", 1.5, [6, 4]);
      renderer.drawLine?.(bx + 11.5 * s, by + 2.4 * s, bx + 11.5 * s, by + 7.6 * s, "rgba(56, 189, 248, 0.28)", 1.5, [6, 4]);
      renderer.drawEllipse?.(bx + 11.5 * s, by + 5.0 * s, 1.4 * s, 0.95 * s, "rgba(56, 189, 248, 0.08)");
    }
  }

  // --- 10. Medical & Cryo Bay: Helium Feeders, Overhead Monorail & Curtain Rail ---
  {
    const bx = MEDICAL_ORIGIN.tx * s;
    const by = MEDICAL_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 30 * s, 22 * s)) {
      // Liquid-helium insulated cryogenic manifold pipes from North condenser banks into Vault I..IV
      const cryoCol = "rgba(103, 232, 249, 0.52)";
      renderer.drawLine?.(bx + 3.5 * s, by + 2.0 * s, bx + 3.5 * s, by + 5.2 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 7.5 * s, by + 2.0 * s, bx + 7.5 * s, by + 5.2 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 3.5 * s, by + 13.0 * s, bx + 3.5 * s, by + 17.5 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 7.5 * s, by + 13.0 * s, bx + 7.5 * s, by + 17.5 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 22.5 * s, by + 2.0 * s, bx + 22.5 * s, by + 5.2 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 26.5 * s, by + 2.0 * s, bx + 26.5 * s, by + 5.2 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 22.5 * s, by + 13.0 * s, bx + 22.5 * s, by + 17.5 * s, cryoCol, 3);
      renderer.drawLine?.(bx + 26.5 * s, by + 13.0 * s, bx + 26.5 * s, by + 17.5 * s, cryoCol, 3);

      // Overhead automated inspection drone rail track running along cross-spine y=8.4
      renderer.drawLine?.(bx + 2.5 * s, by + 8.35 * s, bx + 27.5 * s, by + 8.35 * s, "rgba(148, 163, 184, 0.50)", 2.5);
      renderer.drawLine?.(bx + 5.5 * s, by + 6.4 * s, bx + 5.5 * s, by + 8.35 * s, "rgba(148, 163, 184, 0.45)", 2);
      renderer.drawLine?.(bx + 24.5 * s, by + 6.4 * s, bx + 24.5 * s, by + 8.35 * s, "rgba(148, 163, 184, 0.45)", 2);

      // Clinical Cross Emblem inlaid cleanly in Center Triage (15.0, 9.6) + privacy divider rail around bed (15.0, 15.0)
      const cx = bx + 15.0 * s;
      const cy = by + 9.2 * s;
      renderer.drawRect(cx - 14, cy - 4, 28, 8, { color: "rgba(239, 68, 68, 0.36)", radius: 2 });
      renderer.drawRect(cx - 4, cy - 14, 8, 28, { color: "rgba(239, 68, 68, 0.36)", radius: 2 });
      renderer.drawRect(bx + 13.8 * s, by + 13.6 * s, 2.5 * s, 2.8 * s, {
        stroke: { width: 1.5, color: "rgba(148, 163, 184, 0.45)" },
        radius: 6
      });
    }
  }

  // --- 11. C-7 Seventh Neural Rehab: Acoustic Privacy Rails & Live EEG Wall ---
  {
    const bx = C7_ORIGIN.tx * s;
    const by = C7_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 21 * s, 22 * s)) {
      // Soft acoustic privacy divider tracks between Rehab Beds 1, 2, 3
      for (const lx of [6.25, 10.75]) {
        renderer.drawLine?.(
          bx + lx * s,
          by + 14.0 * s,
          bx + lx * s,
          by + 18.0 * s,
          "rgba(94, 234, 212, 0.42)",
          2,
          [4, 4]
        );
      }
      // Animated stabilized alpha-wave EEG trace scrolling across West screen wall (x=0, y 3..5)
      for (let i = 0; i < 16; i++) {
        const wy = by + 3.2 * s + i * 8;
        const wxOff = 18 + Math.sin(t * 2.8 + i * 0.7) * 8;
        renderer.drawRect(bx + wxOff, wy, 10, 3, {
          color: "rgba(45, 212, 191, 0.78)",
          radius: 1
        });
      }
    }
  }

  // --- 12. Historical Archives: Unidirectional Optical Isolator Bus (`-->`) ---
  {
    const bx = ARCHIVES_ORIGIN.tx * s;
    const by = ARCHIVES_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 21 * s, 22 * s)) {
      // Amber unidirectional optical fiber routing from North wall through door down to MNA-01 Study (12.5, 15.5)
      const fiberCol = "rgba(245, 158, 11, 0.56)";
      renderer.drawLine?.(bx + 11.5 * s, by + 1.2 * s, bx + 11.5 * s, by + 14.8 * s, fiberCol, 2.5, [6, 3]);
      renderer.drawLine?.(bx + 11.5 * s, by + 14.8 * s, bx + 12.5 * s, by + 14.8 * s, fiberCol, 2.5);
      // Unidirectional optical diode arrow badge on the floor in MNA-01 corridor
      const pulseY = by + 11.5 * s + ((t * 28) % 90);
      renderer.drawRect(bx + 11.5 * s - 3, pulseY, 6, 8, {
        color: "#fbbf24",
        radius: 2
      });
      renderer.drawWorldText("OPTICAL DIODE · READ ONLY", bx + 15.6 * s, by + 12.6 * s, {
        color: "rgba(253, 230, 138, 0.48)",
        size: 9,
        align: "center"
      });
    }
  }

  // --- 13. Hangar Bay: Launch Pit Blast Deflector, Pioneer-1 Boarding Umbilical & EVA Grate ---
  {
    const bx = HANGAR_ORIGIN.tx * s;
    const by = HANGAR_ORIGIN.ty * s;
    if (inViewBox(view, bx, by, 32 * s, 18 * s)) {
      // Recessed orbital magnetic launch rails + blast deflector grate under Pioneer-1 Berth (5.5, 9.5)
      renderer.drawRect(bx + 1.6 * s, by + 7.2 * s, 9.2 * s, 4.6 * s, {
        color: "rgba(15, 23, 42, 0.52)",
        stroke: { width: 2, color: "rgba(245, 158, 11, 0.58)" },
        radius: 6
      });
      for (let gx = 2.0; gx <= 9.8; gx += 0.9) {
        renderer.drawLine?.(bx + gx * s, by + 7.4 * s, bx + gx * s, by + 11.6 * s, "rgba(71, 85, 105, 0.65)", 2);
      }
      // Articulated boarding umbilical walkway connecting (6.0, 5.5) Console to Pioneer-1 Dorsal Hatch
      renderer.drawRect(bx + 5.3 * s, by + 5.9 * s, 1.4 * s, 2.0 * s, {
        color: "rgba(100, 116, 139, 0.85)",
        stroke: { width: 1.5, color: "#f59e0b" },
        radius: 3
      });
      for (let ry = 6.2; ry <= 7.6; ry += 0.45) {
        renderer.drawLine?.(bx + 5.45 * s, by + ry * s, bx + 6.55 * s, by + ry * s, "#e2e8f0", 1.5);
      }
      // East EVA Decon Airlock Floor Grate inside pressurized chamber (x 21.1..22.5, y 7.6..10.4)
      renderer.drawRect(bx + 21.1 * s, by + 7.6 * s, 1.4 * s, 2.8 * s, {
        color: "rgba(15, 23, 42, 0.42)",
        stroke: { width: 1.2, color: "rgba(56, 189, 248, 0.55)" },
        radius: 3
      });
      for (let ay = 8.0; ay <= 10.0; ay += 0.5) {
        renderer.drawLine?.(bx + 21.25 * s, by + ay * s, bx + 22.35 * s, by + ay * s, "rgba(125, 211, 252, 0.45)", 1.2);
      }
    }
  }

  // --- 14. Reactor Bay & Aft Propulsion: Dual D-³He Coolant Loops & Spinning Fans ---
  {
    const rbx = REACTOR_ORIGIN.tx * s;
    const rby = REACTOR_ORIGIN.ty * s;
    if (inViewBox(view, rbx, rby, 32 * s, 18 * s)) {
      const hotFlow = crisisActive ? "rgba(239, 68, 68, 0.78)" : "rgba(249, 115, 22, 0.64)";
      const coldFlow = "rgba(56, 189, 248, 0.62)";
      // West Isolated Loop Piping (cols 2..10)
      renderer.drawLine?.(rbx + 4.5 * s, rby + 2.8 * s, rbx + 4.5 * s, rby + 15.2 * s, hotFlow, 4.5);
      renderer.drawLine?.(rbx + 8.5 * s, rby + 2.8 * s, rbx + 8.5 * s, rby + 15.2 * s, coldFlow, 4);
      // East Radiator Servo Hydraulic Lines (cols 22..30)
      renderer.drawLine?.(rbx + 23.5 * s, rby + 2.8 * s, rbx + 23.5 * s, rby + 15.2 * s, coldFlow, 4);
      renderer.drawLine?.(rbx + 27.5 * s, rby + 2.8 * s, rbx + 27.5 * s, rby + 15.2 * s, hotFlow, 4.5);
      // Moving coolant flow pulse beads
      const flowOff = (t * 44) % (11 * s);
      renderer.drawRect(rbx + 4.5 * s - 3, rby + 3.0 * s + flowOff, 6, 8, { color: "#fdba74", radius: 2 });
      renderer.drawRect(rbx + 27.5 * s - 3, rby + 14.2 * s - flowOff, 6, 8, { color: "#bae6fd", radius: 2 });
    }

    const pbx = PROPULSION_ORIGIN.tx * s;
    const pby = PROPULSION_ORIGIN.ty * s;
    if (inViewBox(view, pbx, pby, 56 * s, 15 * s)) {
      // Heavy circular turbine inspection blower grates in Port & Starboard Radiator Bays
      for (const [fx, fy] of [
        [5.5, 4.2],
        [5.5, 11.2],
        [50.5, 4.2],
        [50.5, 11.2],
        [23.5, 4.2],
        [32.5, 4.2]
      ]) {
        const cx = pbx + fx * s;
        const cy = pby + fy * s;
        if (!inViewBox(view, cx - 32, cy - 32, 64, 64)) continue;
        // Heavy steel mounting collar + recessed intake well
        renderer.drawEllipse?.(cx, cy, 27, 27, "#475569");
        renderer.drawEllipse?.(cx, cy, 22, 22, "#0f172a");
        const rot = t * (crisisActive ? 9 : 4);
        renderer.drawLine?.(cx - Math.cos(rot) * 19, cy - Math.sin(rot) * 19, cx + Math.cos(rot) * 19, cy + Math.sin(rot) * 19, "#94a3b8", 4);
        renderer.drawLine?.(cx - Math.sin(rot) * 19, cy + Math.cos(rot) * 19, cx + Math.sin(rot) * 19, cy - Math.cos(rot) * 19, "#94a3b8", 4);
        renderer.drawEllipse?.(cx, cy, 7, 7, "#cbd5e1");
        renderer.drawEllipse?.(cx, cy, 22, 22, crisisActive ? "rgba(239, 68, 68, 0.22)" : "rgba(249, 115, 22, 0.14)", true);
      }
      // Twin Reactor Confinement Ring Base Indicators along wall_dark Reactor Blocks (x 9..14 & 41..46, y 1..3)
      for (const rx of [12.0, 44.0]) {
        const cx = pbx + rx * s;
        const cy = pby + 2.5 * s;
        renderer.drawEllipse?.(cx, cy, 52, 26, crisisActive ? "rgba(239, 68, 68, 0.35)" : "rgba(56, 189, 248, 0.28)", true);
        renderer.drawEllipse?.(cx, cy, 26, 14, crisisActive ? "rgba(251, 146, 60, 0.55)" : "rgba(125, 211, 252, 0.45)", true);
      }
    }
  }
}

/**
 * Renders bespoke high-craft vector overlays over generic props (turning reused asset IDs into
 * authentic lockers, cryo-pod banks, Pioneer-1 shuttle, CNC lathe, dining bowls, medical cabinets,
 * MNA-01 isolated CRT, and microalgae bioreactors) plus 5 non-blocking autonomous shipboard bots.
 */
export function renderShipInteriorPropDetailsAndBots(
  renderer: Renderer,
  map: TileMap,
  props: readonly SceneProp[],
  t: number,
  crisisActive: boolean
): void {
  const s = map.tileSize;
  const view = getViewRect(renderer, 180);

  for (const prop of props) {
    const pw = prop.w * s;
    const ph = prop.h * s;
    const left = prop.x - pw / 2;
    const top = prop.y - ph / 2;
    if (!inViewBox(view, left, top, pw, ph)) continue;

    // 1. Pioneer-1 Orbital Shuttle (拓荒者一号) replacing hangar holo_table placeholder
    if (prop.label === "穿梭机磁吸主泊位") {
      // Outer delta wing fuselage extending gracefully over the launch pit (approx 5.0w x 2.8h tiles)
      const sw = s * 5.0;
      const sh = s * 2.8;
      const sx = prop.x - sw * 0.48;
      const sy = prop.y - sh * 0.5;
      // Wing delta shadow
      renderer.drawRect(sx + 6, sy + 6, sw, sh, { color: "rgba(2, 6, 23, 0.52)", radius: 14 });
      // Delta swept wing assembly
      renderer.drawRect(sx + sw * 0.35, sy, sw * 0.62, sh, {
        color: "#64748b",
        stroke: { width: 2, color: "#cbd5e1" },
        radius: 10
      });
      // Main insulated ceramic fuselage pointed West toward airlock
      renderer.drawRect(sx + 18, sy + sh * 0.16, sw - 26, sh * 0.68, {
        color: "#e2e8f0",
        stroke: { width: 2, color: "#334155" },
        radius: 18
      });
      // Thermal tile panel seam lines across ceramic fuselage
      renderer.drawLine?.(sx + sw * 0.42, sy + sh * 0.18, sx + sw * 0.42, sy + sh * 0.82, "#94a3b8", 1.2);
      renderer.drawLine?.(sx + sw * 0.78, sy + sh * 0.18, sx + sw * 0.78, sy + sh * 0.82, "#94a3b8", 1.2);
      // Carbon-silicon black heat-shield nosecone (West)
      renderer.drawRect(sx, sy + sh * 0.25, 42, sh * 0.5, {
        color: "#1e293b",
        stroke: { width: 1.5, color: "#94a3b8" },
        radius: 14
      });
      // Dark glazed flight deck canopy & dorsal airlock hatch ring
      renderer.drawRect(sx + 48, sy + sh * 0.28, 34, sh * 0.44, {
        color: "#0f172a",
        stroke: { width: 1.5, color: "#38bdf8" },
        radius: 6
      });
      renderer.drawEllipse?.(sx + sw * 0.58, prop.y, 16, 16, "#475569");
      renderer.drawEllipse?.(sx + sw * 0.58, prop.y, 10, 10, "#94a3b8");
      // Twin stern thrusters (East side)
      for (const oy of [-20, 20]) {
        renderer.drawRect(sx + sw - 12, prop.y + oy - 9, 16, 18, {
          color: "#334155",
          stroke: { width: 1.5, color: "#fbbf24" },
          radius: 3
        });
      }
      renderer.drawWorldText("PIONEER-01", sx + sw * 0.72, prop.y - 22, {
        color: "#1e293b",
        size: 9,
        align: "center"
      });
      continue;
    }

    // 2. Distributed Cryo-Pod 2x2 Sleeper Banks (Vaults I..IV)
    if (prop.label.startsWith("休眠舱框架")) {
      renderer.drawRect(left + 2, top + 2, pw - 4, ph - 4, {
        color: "#1e293b",
        stroke: { width: 2, color: "#94a3b8" },
        radius: 6
      });
      const podW = (pw - 14) / 2;
      const podH = (ph - 16) / 2;
      const blink = Math.sin(t * 2.5 + prop.x * 0.03) > -0.2;
      for (let py = 0; py < 2; py++) {
        for (let px = 0; px < 2; px++) {
          const cx = left + 5 + px * (podW + 4);
          const cy = top + 6 + py * (podH + 4);
          renderer.drawRect(cx, cy, podW, podH, {
            color: "#0f2942",
            stroke: { width: 1.2, color: "#67e8f9" },
            radius: 5
          });
          // Frosted visor glass inside sleeper pod
          renderer.drawRect(cx + 4, cy + 5, podW - 8, podH * 0.45, {
            color: "rgba(165, 243, 252, 0.36)",
            radius: 3
          });
          // Tiny emerald vital LED
          renderer.drawRect(cx + podW - 8, cy + podH - 8, 4, 4, {
            color: blink ? "#34d399" : "#065f46",
            radius: 2
          });
        }
      }
      continue;
    }

    // 3. Crew Metallic Multi-Door Lockers (replacing bookshelf sprite on lockers)
    if (prop.label.includes("储物柜") || prop.label.includes("胚料架") || prop.label.includes("备件箱架")) {
      const isHeavy = prop.label.includes("胚料") || prop.label.includes("备件");
      renderer.drawRect(left + 2, top + 2, pw - 4, ph - 4, {
        color: isHeavy ? "#475569" : "#64748b",
        stroke: { width: 1.5, color: isHeavy ? "#fbbf24" : "#cbd5e1" },
        radius: 4
      });
      const bays = 3;
      const bw = (pw - 12) / bays;
      for (let i = 0; i < bays; i++) {
        const bx = left + 4 + i * (bw + 2);
        renderer.drawRect(bx, top + 4, bw, ph - 8, {
          color: isHeavy ? "#334155" : "#94a3b8",
          stroke: { width: 1, color: "#1e293b" },
          radius: 2
        });
        // Locker louver slit & small name tag
        renderer.drawRect(bx + 4, top + 7, bw - 8, 3, { color: isHeavy ? "#f59e0b" : "#334155" });
      }
      continue;
    }

    // 4. L-1 Microalgae Bioreactors & Foliation Detail
    if (prop.label.includes("微藻光反应器")) {
      renderer.drawRect(left + 2, top + 2, pw - 4, ph - 4, {
        color: "#064e3b",
        stroke: { width: 1.5, color: "#6ee7b7" },
        radius: 5
      });
      const cylGlow = 0.65 + Math.sin(t * 3 + prop.x * 0.1) * 0.25;
      renderer.drawEllipse?.(prop.x - 6, prop.y, 6, 8, `rgba(52, 211, 153, ${cylGlow.toFixed(2)})`);
      renderer.drawEllipse?.(prop.x + 6, prop.y, 6, 8, `rgba(110, 231, 183, ${cylGlow.toFixed(2)})`);
      continue;
    }
    if (prop.assetId === "fx_plant" && (prop.label.includes("麦苗") || prop.label.includes("大豆") || prop.label.includes("生菜") || prop.label.includes("茄果") || prop.label.includes("固碳") || prop.label.includes("盆景"))) {
      renderer.drawRect(left + 3, top + 4, pw - 6, ph - 8, {
        color: prop.label.includes("盆景") ? "#57534e" : "#14532d",
        stroke: { width: 1.5, color: prop.label.includes("麦") ? "#fde047" : "#86efac" },
        radius: 6
      });
      renderer.drawEllipse?.(prop.x, prop.y, pw * 0.32, ph * 0.28, prop.label.includes("麦") ? "#a3e635" : "#22c55e");
      continue;
    }

    // 5. Mess Hall & R-1 Tableware (Trays, Malt Tea Bowls, Warm Glowing Warmer)
    if (prop.label === "公共餐桌" || prop.label === "生活环休憩交谊圆桌") {
      // Serving trays & warm ceramic bowls
      renderer.drawRect(prop.x - 24, prop.y - 12, 16, 11, {
        color: "#cbd5e1",
        stroke: { width: 1, color: "#64748b" },
        radius: 2
      });
      renderer.drawEllipse?.(prop.x - 16, prop.y - 6, 4, 4, "#f59e0b");
      renderer.drawRect(prop.x + 10, prop.y + 4, 16, 11, {
        color: "#cbd5e1",
        stroke: { width: 1, color: "#64748b" },
        radius: 2
      });
      renderer.drawEllipse?.(prop.x + 18, prop.y + 9, 4, 4, "#38bdf8");
      continue;
    }
    if (prop.label.includes("恒温暖餐柜") || prop.label.includes("麦芽茶饮")) {
      const isTea = prop.label.includes("茶");
      renderer.drawRect(left + 3, top + 3, pw - 6, ph - 6, {
        color: isTea ? "#78350f" : "#334155",
        stroke: { width: 1.5, color: "#fbbf24" },
        radius: 4
      });
      for (let b = 0; b < 3; b++) {
        renderer.drawRect(left + 7, top + 8 + b * 20, pw - 14, 14, {
          color: isTea ? "rgba(253, 224, 155, 0.72)" : "rgba(251, 146, 60, 0.78)",
          radius: 3
        });
      }
      continue;
    }

    // 6. Medical Sterile Pharmacy & Plasma Refrigerator Cabinet
    if (prop.label === "无菌药械与冷藏血浆柜") {
      renderer.drawRect(left + 2, top + 2, pw - 4, ph - 4, {
        color: "#f1f5f9",
        stroke: { width: 2, color: "#38bdf8" },
        radius: 5
      });
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        renderer.drawRect(left + 6, top + 7 + sIdx * 19, pw - 12, 13, {
          color: "#0284c7",
          radius: 2
        });
      }
      renderer.drawRect(prop.x - 3, prop.y - 6, 6, 12, { color: "#ef4444", radius: 1 });
      renderer.drawRect(prop.x - 6, prop.y - 3, 12, 6, { color: "#ef4444", radius: 1 });
      continue;
    }

    // 7. L-2 CNC Lathe Chuck & Hot Hydraulic Radiator Coupling
    if (prop.label === "激光数控镗铣车床" || prop.label === "机械臂液压装配台") {
      if (prop.label === "机械臂液压装配台") {
        // Radiator coupling manifold clamped on the hydraulic bench
        renderer.drawRect(prop.x - 30, prop.y - 10, 60, 20, {
          color: "#475569",
          stroke: { width: 1.5, color: "#f97316" },
          radius: 4
        });
        const heat = 0.5 + Math.sin(t * 4) * 0.25;
        renderer.drawEllipse?.(prop.x, prop.y, 18, 9, `rgba(251, 146, 60, ${heat.toFixed(2)})`, true);
      } else {
        // Rotating laser CNC chuck on Lathe bed
        renderer.drawRect(prop.x - 16, prop.y - 10, 32, 20, {
          color: "#94a3b8",
          stroke: { width: 1.5, color: "#0f172a" },
          radius: 4
        });
        const spark = Math.sin(t * 11) > 0.7;
        if (spark) {
          renderer.drawEllipse?.(prop.x + 8, prop.y, 6, 6, "rgba(254, 240, 138, 0.9)", true);
        }
      }
      continue;
    }

    // 8. C-7 Rehab Painting & Puzzle Table
    if (prop.label.includes("拼图桌")) {
      renderer.drawRect(prop.x - 22, prop.y - 9, 22, 16, {
        color: "#bae6fd",
        stroke: { width: 1, color: "#78350f" },
        radius: 2
      });
      renderer.drawRect(prop.x + 6, prop.y - 6, 12, 12, {
        color: "#fde047",
        stroke: { width: 1, color: "#a16207" },
        radius: 6
      });
      continue;
    }

    // 9. Archives MNA-01 CRT Readout Cursor Pulse
    if (prop.label.startsWith("MNA-01")) {
      const blink = Math.sin(t * 4.5) > 0;
      renderer.drawRect(prop.x - 11, prop.y - 8, 22, 12, {
        color: "#1c1917",
        stroke: { width: 1.2, color: "#f59e0b" },
        radius: 2
      });
      renderer.drawRect(prop.x - 8, prop.y - 5, blink ? 5 : 2, 5, { color: "#fbbf24" });
      continue;
    }
  }

  // --- Autonomous Living Shipboard Maintenance & Ecology Drones (5 non-blocking units) ---
  const drawBot = (
    wx: number,
    wy: number,
    bodyColor: string,
    trimColor: string,
    ledColor: string,
    haloColor: string
  ) => {
    if (!inViewBox(view, wx - 24, wy - 24, 48, 48)) return;
    renderer.drawEllipse?.(wx, wy + 7, 10, 4.5, "rgba(2, 4, 9, 0.36)");
    renderer.drawRect(wx - 9, wy - 7, 18, 14, {
      color: bodyColor,
      stroke: { width: 1.5, color: trimColor },
      radius: 5
    });
    renderer.drawRect(wx - 3, wy - 3, 6, 6, { color: ledColor, radius: 3 });
    renderer.drawRadialLight?.(wx, wy, 26, haloColor, "rgba(0,0,0,0)", true);
  };

  // Bot 1: Medical Cryo Overhead Monorail Inspector Drone (y=8.35, sweeping x 4..26)
  drawBot(
    (MEDICAL_ORIGIN.tx + 15 + Math.sin(t * 0.42) * 10.5) * s,
    (MEDICAL_ORIGIN.ty + 8.35) * s,
    "#334155",
    "#94a3b8",
    "#67e8f9",
    "rgba(103, 232, 249, 0.22)"
  );

  // Bot 2: L-1 Ecological Pollinator / Micro-Mist Drone (hovering over Bed aisle)
  drawBot(
    (L1_ORIGIN.tx + 8.5 + Math.sin(t * 0.6) * 4.2) * s,
    (L1_ORIGIN.ty + 11.2 + Math.cos(t * 1.2) * 0.45) * s,
    "#065f46",
    "#a7f3d0",
    "#4ade80",
    "rgba(74, 222, 128, 0.24)"
  );

  // Bot 3: L-2 Foundry Gantry Crane Welder Trolley (x 8.8, patrolling y 3.5..18.5)
  drawBot(
    (L2_ORIGIN.tx + 8.8) * s,
    (L2_ORIGIN.ty + 11.0 + Math.sin(t * 0.38) * 7.2) * s,
    "#92400e",
    "#fbbf24",
    Math.sin(t * 6) > 0.3 ? "#fef08a" : "#f59e0b",
    "rgba(245, 158, 11, 0.24)"
  );

  // Bot 4: Transit Hub Platform Sweeper Rover (y 6.8, x 5.5..14.0)
  drawBot(
    (TRANSIT_ORIGIN.tx + 9.8 + Math.sin(t * 0.48) * 3.8) * s,
    (TRANSIT_ORIGIN.ty + 6.8) * s,
    "#475569",
    "#e2e8f0",
    "#38bdf8",
    "rgba(56, 189, 248, 0.18)"
  );

  // Bot 5: Aft Propulsion Shielded Thermal Crawler (y 7.4, x 20..36)
  drawBot(
    (PROPULSION_ORIGIN.tx + 28.0 + Math.sin(t * 0.5) * 7.5) * s,
    (PROPULSION_ORIGIN.ty + 7.4) * s,
    "#3f3f46",
    "#fb923c",
    crisisActive ? "#ef4444" : "#f97316",
    "rgba(249, 115, 22, 0.25)"
  );
}
