import type { GameTime } from "./Time";

/**
 * What is growing in a plot.
 *
 *   untilled -> tilled -> seeded -> mature -> (harvest) -> tilled
 *
 * `seeded` and `mature` are the same planting at different growth; the crop
 * sprite is chosen from `stage` rather than from a separate state, so the
 * number of visual stages and the number of states cannot drift apart.
 */
export type PlotState = "untilled" | "tilled" | "seeded" | "mature";

export type CropKind = "wheat";

export interface Plot {
  /** Tile coordinates, which is what identifies a plot. */
  tx: number;
  ty: number;
  state: PlotState;
  crop: CropKind | null;
  /** In-game minutes of growth accumulated since planting. */
  growthMinutes: number;
}

/** How long wheat takes to ripen, in in-game minutes. */
export const WHEAT_GROW_MINUTES = 8;

/**
 * Visual stage for the crop sprite, 1..4. Stage 4 is ripe.
 *
 * Exported so the renderer and the art manifest agree on how many stages exist.
 */
export function cropStageFor(plot: Plot): number {
  if (plot.state === "untilled" || plot.state === "tilled") return 0;
  if (plot.state === "mature") return 4;

  const progress = Math.min(1, plot.growthMinutes / WHEAT_GROW_MINUTES);
  // Stages 1..3 while growing, then 4 once ripe. Never returns 4 early.
  return Math.max(1, Math.min(3, 1 + Math.floor(progress * 3)));
}

/**
 * The farm: a set of plots, each progressing on its own.
 *
 * Pure logic with no drawing and no DOM. Everything takes in-game minutes, so
 * tests can advance time directly instead of simulating frames.
 */
export class Farm {
  private readonly plots = new Map<string, Plot>();

  /** Create a plot. Existing plots at the same tile are left alone. */
  addPlot(tx: number, ty: number): Plot {
    const key = plotKey(tx, ty);
    const existing = this.plots.get(key);
    if (existing) return existing;

    const plot: Plot = { tx, ty, state: "untilled", crop: null, growthMinutes: 0 };
    this.plots.set(key, plot);
    return plot;
  }

  get all(): Plot[] {
    return [...this.plots.values()];
  }

  get size(): number {
    return this.plots.size;
  }

  plotAt(tx: number, ty: number): Plot | null {
    return this.plots.get(plotKey(tx, ty)) ?? null;
  }

  /** Advance every growing plot. */
  update(dt: number, time: GameTime): void {
    // Time owns the conversion, so growth stays consistent with the clock.
    const before = time.minutes;
    time.update(dt);
    const elapsed = time.minutes - before;

    for (const plot of this.plots.values()) {
      if (plot.state !== "seeded") continue;

      plot.growthMinutes += elapsed;
      if (plot.growthMinutes >= WHEAT_GROW_MINUTES) {
        plot.state = "mature";
      }
    }
  }

  /** Break the ground. Returns false when the plot cannot be tilled. */
  till(plot: Plot): boolean {
    if (plot.state !== "untilled") return false;
    plot.state = "tilled";
    return true;
  }

  /** Sow seed on tilled ground. Returns false when that is not possible. */
  plant(plot: Plot, crop: CropKind = "wheat"): boolean {
    if (plot.state !== "tilled") return false;
    plot.state = "seeded";
    plot.crop = crop;
    plot.growthMinutes = 0;
    return true;
  }

  /** True when there is something worth harvesting here. */
  canHarvest(plot: Plot): boolean {
    return plot.state === "mature";
  }

  /**
   * Harvest a ripe plot, returning what was gathered.
   *
   * Harvesting anything unripe yields nothing AND leaves the plot untouched, so
   * a mis-timed press cannot destroy a crop that is still growing.
   */
  harvest(plot: Plot): { crop: CropKind; amount: number } | null {
    if (!this.canHarvest(plot) || !plot.crop) return null;

    const gathered = { crop: plot.crop, amount: 1 };

    // Back to tilled: the ground is already broken, so replanting is one step.
    plot.state = "tilled";
    plot.crop = null;
    plot.growthMinutes = 0;

    return gathered;
  }

  /** The plot nearest a world point, or null when the farm has none. */
  nearest(worldX: number, worldY: number, tileSize: number, maxDistance = Infinity): Plot | null {
    let best: Plot | null = null;
    let bestDistance = maxDistance;

    for (const plot of this.plots.values()) {
      // Measure to the plot's centre, which is where its art sits.
      const cx = (plot.tx + 0.5) * tileSize;
      const cy = (plot.ty + 0.5) * tileSize;
      const distance = Math.hypot(cx - worldX, cy - worldY);

      if (distance < bestDistance) {
        best = plot;
        bestDistance = distance;
      }
    }

    return best;
  }
}

function plotKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}
