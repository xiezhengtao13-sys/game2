import type { TileMap } from "./TileMap";
import { isSolidTile } from "./TileMap";

/** An axis-aligned box in world pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tile collision with per-axis resolution.
 *
 * The two axes are resolved independently, which is what makes a diagonal move
 * into a wall slide along it instead of stopping dead. Resolving both axes at
 * once (moving to the combined target, then backing out) is the classic way to
 * get a player who sticks to walls, so it is deliberately avoided here.
 *
 * The search for how far the player may travel is a binary search rather than a
 * fixed-step sweep. That keeps the result independent of frame rate: a single
 * huge `dt` cannot tunnel through a wall, and a small `dt` does not creep.
 */

/** How close to a boundary counts as touching it. */
const EPSILON = 1e-9;
const SEARCH_ITERATIONS = 30;

/** True when any tile overlapping this box blocks movement. */
export function isBoxBlocked(map: TileMap, box: Box): boolean {
  const size = map.tileSize;

  const minTx = Math.floor(box.x / size);
  const minTy = Math.floor(box.y / size);
  // Subtract a hair so a box whose edge lands exactly on a tile boundary does
  // not count the tile on the far side as overlapping.
  const maxTx = Math.floor((box.x + box.width - EPSILON) / size);
  const maxTy = Math.floor((box.y + box.height - EPSILON) / size);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const type = map.tileAt(tx, ty);
      // Outside the map is solid, so the player cannot walk off the edge.
      if (type === null || isSolidTile(type)) return true;
    }
  }

  return false;
}

/**
 * Move `box` by (`dx`, `dy`), stopping at the first blocking tile on each axis
 * independently. Returns the new position.
 *
 * `dx` and `dy` are applied in sequence (x first), so a move that is blocked on
 * one axis still completes on the other.
 */
export function resolveMovement(
  map: TileMap,
  box: Box,
  dx: number,
  dy: number
): { x: number; y: number } {
  const moved = moveAxis(map, box, dx, "x");
  const afterX = { ...box, x: moved };
  const afterY = moveAxis(map, afterX, dy, "y");

  return { x: moved, y: afterY };
}

/**
 * Travel as far as possible along one axis.
 *
 * Binary searches the furthest fraction of the requested move that leaves the
 * box unblocked. Assumes the starting position is not already blocked.
 */
function moveAxis(map: TileMap, box: Box, delta: number, axis: "x" | "y"): number {
  const start = axis === "x" ? box.x : box.y;
  if (delta === 0) return start;

  const at = (value: number): Box =>
    axis === "x" ? { ...box, x: value } : { ...box, y: value };

  const target = start + delta;

  // Moving outside the map is never allowed.
  const limit = axis === "x" ? map.pixelWidth - box.width : map.pixelHeight - box.height;
  const clamped = Math.min(Math.max(target, 0), limit);

  if (!isBoxBlocked(map, at(clamped))) return clamped;

  // Invariant: `low` is known-good, `high` is known-blocked.
  let low = start;
  let high = clamped;

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    if (isBoxBlocked(map, at(mid))) high = mid;
    else low = mid;
  }

  return low;
}
