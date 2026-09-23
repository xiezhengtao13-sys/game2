/**
 * The in-game clock.
 *
 * A plain counter advanced by `dt`, so crop growth is frame-rate independent and
 * can be fast-forwarded in tests without waiting. It never reads `Date.now()`:
 * `src/game` must not touch the outside world (docs/AGENT_RULES.md rule 4).
 */
export class GameTime {
  /** Real seconds per in-game minute. */
  constructor(private readonly secondsPerMinute = 1) {}

  /** Minutes elapsed since the game started. */
  private elapsedMinutes = 0;

  /** Advance the clock. */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.elapsedMinutes += dt / this.secondsPerMinute;
  }

  /** Total in-game minutes since the start. */
  get minutes(): number {
    return this.elapsedMinutes;
  }

  /** Which in-game day it is, starting at 1. */
  get day(): number {
    return Math.floor(this.elapsedMinutes / MINUTES_PER_DAY) + 1;
  }

  /** Minutes past midnight, for a clock readout. */
  get minuteOfDay(): number {
    return Math.floor(this.elapsedMinutes % MINUTES_PER_DAY);
  }

  /** The clock as `HH:MM`. */
  get clock(): string {
    const total = this.minuteOfDay;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
}

/** A day is 24 in-game hours. */
export const MINUTES_PER_DAY = 24 * 60;
