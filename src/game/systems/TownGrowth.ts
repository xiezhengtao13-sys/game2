/**
 * The town growing because of what the player gave it.
 *
 * This is what makes the play loop mean something rather than just moving
 * numbers: reputation accumulates, and when it crosses a threshold a real
 * building appears on the map.
 *
 * Reputation only ever goes up, and a building only ever moves forward, so the
 * player cannot lose progress by giving too much or by checking twice.
 */

export type StructureState = "none" | "underConstruction" | "built";

export interface Structure {
  id: string;
  name: string;
  /** Tile coordinates of the top-left corner. */
  tx: number;
  ty: number;
  /** Size in tiles, for drawing and for the site marker. */
  tilesWide: number;
  tilesTall: number;
  /** Reputation needed before this appears. */
  threshold: number;
  /** Shown by the mayor when it is still missing. */
  promiseText: string;
  /** Shown when it is finished. */
  doneText: string;
}

export const STRUCTURES: readonly Structure[] = [
  {
    id: "market",
    name: "集市",
    tx: 15,
    ty: 13,
    tilesWide: 3,
    tilesTall: 3,
    threshold: 3,
    promiseText: "攒够三份贡献，镇上就能把空地清出来搭个集市。",
    doneText: "集市搭起来了，就在主街往南那块空地上。"
  }
];

export class TownGrowth {
  /** Contribution earned. Never decreases. */
  private reputation = 0;
  /** Bread handed over, for reporting. */
  private delivered = 0;

  get reputationCount(): number {
    return this.reputation;
  }

  get deliveredCount(): number {
    return this.delivered;
  }

  /**
   * Record a handover of `amount` contribution.
   *
   * Returns whether this delivery was what pushed a structure over its
   * threshold, so the caller can announce the news at the right moment rather
   * than repeating it on every later delivery.
   */
  contribute(amount: number): { unlocked: Structure | null } {
    if (!Number.isFinite(amount) || amount <= 0) return { unlocked: null };

    const before = this.reputation;
    this.reputation += Math.floor(amount);
    this.delivered += Math.floor(amount);

    const unlocked = STRUCTURES.find(
      (s) => before < s.threshold && this.reputation >= s.threshold
    );
    return { unlocked: unlocked ?? null };
  }

  /**
   * How far along a structure is.
   *
   * `underConstruction` is a distinct state rather than a gradual value: the
   * site shows scaffolding until the threshold is reached, then it is a
   * building. Two clear stages are enough to read at a glance.
   */
  stateOf(structure: Structure): StructureState {
    if (this.reputation >= structure.threshold) return "built";
    if (this.reputation > 0) return "underConstruction";
    return "none";
  }

  /** Every structure that is finished. */
  built(): Structure[] {
    return STRUCTURES.filter((s) => this.stateOf(s) === "built");
  }

  /** The next structure still waiting on reputation, or null when all are done. */
  nextGoal(): Structure | null {
    return STRUCTURES.find((s) => this.stateOf(s) !== "built") ?? null;
  }
}
