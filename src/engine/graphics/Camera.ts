/**
 * The observable camera: the world point drawn at the viewport's top-left
 * corner, plus the viewport it is clamped against.
 *
 * Game code may read and drive this. It must not convert world to screen
 * itself -- the renderer does that, so no game code contains viewport maths.
 */
export interface Camera {
  /** World X drawn at the viewport's left edge. */
  worldX: number;
  /** World Y drawn at the viewport's top edge. */
  worldY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;

  /** Frame `(x, y)` in the middle of the viewport. */
  centerOn(x: number, y: number): void;
  /** Keep the view inside a `mapWidth x mapHeight` world. */
  clampTo(mapWidth: number, mapHeight: number): void;
}

/** Keep `worldMin` such that the view stays inside `[0, map]`. */
function clampAxis(worldMin: number, viewport: number, map: number): number {
  const max = map - viewport;
  if (max < 0) {
    // The map is narrower than the viewport: centre it, so the map's midpoint
    // lands on the viewport's midpoint instead of being pinned to a corner.
    return -(viewport - map) / 2;
  }
  return Math.min(Math.max(worldMin, 0), max);
}

/**
 * Default camera. Pure arithmetic with no canvas or DOM access, so its
 * behaviour is unit-testable in plain Node.
 */
export class SimpleCamera implements Camera {
  constructor(
    readonly viewportWidth: number,
    readonly viewportHeight: number,
    public worldX = 0,
    public worldY = 0
  ) {}

  centerOn(x: number, y: number): void {
    this.worldX = x - this.viewportWidth / 2;
    this.worldY = y - this.viewportHeight / 2;
  }

  clampTo(mapWidth: number, mapHeight: number): void {
    this.worldX = clampAxis(this.worldX, this.viewportWidth, mapWidth);
    this.worldY = clampAxis(this.worldY, this.viewportHeight, mapHeight);
  }

  /** Screen X for a world X. */
  toScreenX(worldX: number): number {
    return worldX - this.worldX;
  }

  /** Screen Y for a world Y. */
  toScreenY(worldY: number): number {
    return worldY - this.worldY;
  }
}
