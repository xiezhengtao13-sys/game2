import type { TileMap } from "./TileMap";
import { isSolidTile } from "./TileMap";
import { isBoxBlocked, type Box } from "./collision";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface TileCoord {
  tx: number;
  ty: number;
}

export interface PathOptions {
  /** Extra tiles that act as hard walls right now (e.g. sealed security bulkheads). */
  extraBlocked?: (tx: number, ty: number) => boolean;
  /** Optional traversal cost penalty (> 0 prefers clear aisles around props/furniture). */
  tilePenalty?: (tx: number, ty: number) => number;
  /** Collider dimensions (defaults to Player 22x16 feet box). */
  colliderWidth?: number;
  colliderHeight?: number;
}

export interface PathResult {
  /** Smoothed world-space feet-center waypoints from start to reachable target. */
  waypoints: WorldPoint[];
  /** True if the requested destination lay behind a closed security gate and we routed up to the gate instead. */
  partialBlocked: boolean;
  /** The tile coordinate of the first locked security gate blocking direct passage, if any. */
  blockedByGateTile: TileCoord | null;
  /** True when clicking a solid wall/prop snapped cleanly to a nearby standable tile. */
  snapped?: boolean;
}

const DEFAULT_W = 22;
const DEFAULT_H = 16;

function tileCenter(map: TileMap, tx: number, ty: number): WorldPoint {
  return {
    x: tx * map.tileSize + map.tileSize / 2,
    y: ty * map.tileSize + map.tileSize / 2
  };
}

function feetColliderAt(x: number, y: number, w = DEFAULT_W, h = DEFAULT_H): Box {
  return {
    x: x - w / 2,
    y: y - h / 2,
    width: w,
    height: h
  };
}

export function isTileStandable(
  map: TileMap,
  tx: number,
  ty: number,
  extraBlocked?: (tx: number, ty: number) => boolean,
  colliderWidth = DEFAULT_W,
  colliderHeight = DEFAULT_H
): boolean {
  if (!map.inBounds(tx, ty)) return false;
  const t = map.tileAt(tx, ty);
  if (t === null || isSolidTile(t) || extraBlocked?.(tx, ty)) return false;
  const c = tileCenter(map, tx, ty);
  return !isBoxBlocked(map, feetColliderAt(c.x, c.y, colliderWidth, colliderHeight), extraBlocked);
}

/**
 * Check if a straight line between two world points stays completely clear of
 * walls, locked security gates, and (optionally) high-penalty prop tiles.
 */
export function isLineWalkable(
  map: TileMap,
  a: WorldPoint,
  b: WorldPoint,
  options: PathOptions = {},
  allowPenaltyOnEndpoints = true
): boolean {
  const { extraBlocked, tilePenalty, colliderWidth = DEFAULT_W, colliderHeight = DEFAULT_H } = options;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.ceil(dist / 8));
  const size = map.tileSize;

  const startTx = Math.floor(a.x / size);
  const startTy = Math.floor(a.y / size);
  const endTx = Math.floor(b.x / size);
  const endTy = Math.floor(b.y / size);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const box = feetColliderAt(px, py, colliderWidth, colliderHeight);
    if (isBoxBlocked(map, box, extraBlocked)) return false;

    if (tilePenalty) {
      const tx = Math.floor(px / size);
      const ty = Math.floor(py / size);
      const isEndpoint =
        allowPenaltyOnEndpoints &&
        ((tx === startTx && ty === startTy) || (tx === endTx && ty === endTy));
      if (!isEndpoint && tilePenalty(tx, ty) > 0) return false;
    }
  }
  return true;
}

/**
 * Min-heap priority queue over integer tile indices for fast A* execution
 * with zero per-node object heap churn.
 */
class TileMinHeap {
  private readonly heap: number[] = [];
  private readonly fScore: Float32Array;

  constructor(fScore: Float32Array) {
    this.fScore = fScore;
  }

  get size(): number {
    return this.heap.length;
  }

  push(idx: number): void {
    this.heap.push(idx);
    this.siftUp(this.heap.length - 1);
  }

  pop(): number {
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.fScore[this.heap[i]] >= this.fScore[this.heap[p]]) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[p];
      this.heap[p] = tmp;
      i = p;
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && this.fScore[this.heap[l]] < this.fScore[this.heap[smallest]]) smallest = l;
      if (r < n && this.fScore[this.heap[r]] < this.fScore[this.heap[smallest]]) smallest = r;
      if (smallest === i) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[smallest];
      this.heap[smallest] = tmp;
      i = smallest;
    }
  }
}

const NEIGHBORS: ReadonlyArray<[number, number, number]> = [
  [1, 0, 10],
  [-1, 0, 10],
  [0, 1, 10],
  [0, -1, 10],
  [1, 1, 14],
  [-1, 1, 14],
  [1, -1, 14],
  [-1, -1, 14]
];

/**
 * Low-level 8-directional grid A* returning raw tile coordinates `[start ... goal]`.
 * Prevents diagonal corner-cutting across solid or security-blocked tiles.
 */
export function runAStarTiles(
  map: TileMap,
  startTx: number,
  startTy: number,
  goalTx: number,
  goalTy: number,
  options: PathOptions = {}
): TileCoord[] | null {
  const { extraBlocked, tilePenalty, colliderWidth = DEFAULT_W, colliderHeight = DEFAULT_H } = options;
  const w = map.width;
  const h = map.height;
  const total = w * h;

  if (!map.inBounds(startTx, startTy) || !map.inBounds(goalTx, goalTy)) return null;
  if (!isTileStandable(map, goalTx, goalTy, extraBlocked, colliderWidth, colliderHeight)) return null;

  const startIdx = startTy * w + startTx;
  const goalIdx = goalTy * w + goalTx;
  if (startIdx === goalIdx) return [{ tx: goalTx, ty: goalTy }];

  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const standCache = new Int8Array(total); // 0 = unknown, 1 = standable, -1 = blocked

  const canStand = (tx: number, ty: number): boolean => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
    const idx = ty * w + tx;
    const cached = standCache[idx];
    if (cached !== 0) return cached === 1;
    const ok = isTileStandable(map, tx, ty, extraBlocked, colliderWidth, colliderHeight);
    standCache[idx] = ok ? 1 : -1;
    return ok;
  };

  const heuristic = (tx: number, ty: number): number => {
    const dx = Math.abs(goalTx - tx);
    const dy = Math.abs(goalTy - ty);
    return 10 * (dx + dy) + (14 - 20) * Math.min(dx, dy);
  };

  gScore[startIdx] = 0;
  fScore[startIdx] = heuristic(startTx, startTy);

  const open = new TileMinHeap(fScore);
  open.push(startIdx);

  while (open.size > 0) {
    const curr = open.pop();
    if (curr === goalIdx) {
      const path: TileCoord[] = [];
      let p = curr;
      while (p !== -1) {
        path.push({ tx: p % w, ty: Math.floor(p / w) });
        if (p === startIdx) break;
        p = cameFrom[p];
      }
      path.reverse();
      return path;
    }

    if (closed[curr]) continue;
    closed[curr] = 1;

    const cx = curr % w;
    const cy = Math.floor(curr / w);
    const currG = gScore[curr];

    for (const [ox, oy, baseCost] of NEIGHBORS) {
      const nx = cx + ox;
      const ny = cy + oy;
      if (!canStand(nx, ny)) continue;

      // Never corner-cut around solid walls or locked bulkheads
      if (ox !== 0 && oy !== 0) {
        if (!canStand(cx + ox, cy) || !canStand(cx, cy + oy)) continue;
      }

      const nIdx = ny * w + nx;
      if (closed[nIdx]) continue;

      const penalty = tilePenalty ? tilePenalty(nx, ny) : 0;
      const tentativeG = currG + baseCost + penalty;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = curr;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + heuristic(nx, ny);
        open.push(nIdx);
      }
    }
  }

  return null;
}

/** Find nearest walkable standable tile around a clicked tile (smart snap off walls/furniture). */
export function findNearestStandableTile(
  map: TileMap,
  targetTx: number,
  targetTy: number,
  options: PathOptions = {},
  maxRadius = 6
): TileCoord | null {
  const { extraBlocked, tilePenalty, colliderWidth = DEFAULT_W, colliderHeight = DEFAULT_H } = options;

  let best: TileCoord | undefined;
  let bestScore = Infinity;

  for (let r = 0; r <= maxRadius; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
        const tx = targetTx + ox;
        const ty = targetTy + oy;
        if (!isTileStandable(map, tx, ty, extraBlocked, colliderWidth, colliderHeight)) continue;
        const pen = tilePenalty ? tilePenalty(tx, ty) : 0;
        // Prefer closest Euclidean distance, lightly penalizing furniture tiles so clicking on a table stops neatly beside it
        const score = Math.hypot(ox, oy) + (pen > 0 ? 1.4 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = { tx, ty };
        }
      }
    }
    if (best !== undefined && r >= 1 && (tilePenalty?.(best.tx, best.ty) ?? 0) === 0) break;
  }

  return best ?? null;
}

/** String-pull simplify a tile path into collision-free smooth world-space waypoints. */
function smoothWorldPath(
  map: TileMap,
  startWorld: WorldPoint,
  goalWorld: WorldPoint,
  tilePath: TileCoord[],
  options: PathOptions
): WorldPoint[] {
  if (tilePath.length === 0) return [];

  const points: WorldPoint[] = [startWorld];
  for (let i = 1; i < tilePath.length - 1; i++) {
    points.push(tileCenter(map, tilePath[i].tx, tilePath[i].ty));
  }
  points.push(goalWorld);

  if (points.length <= 2) {
    return isLineWalkable(map, points[0], points[1], options, true)
      ? [goalWorld]
      : points.slice(1);
  }

  const smoothed: WorldPoint[] = [];
  let anchor = 0;

  while (anchor < points.length - 1) {
    let farthest = anchor + 1;
    for (let probe = points.length - 1; probe > anchor + 1; probe--) {
      if (isLineWalkable(map, points[anchor], points[probe], options, true)) {
        farthest = probe;
        break;
      }
    }
    smoothed.push(points[farthest]);
    anchor = farthest;
  }

  return smoothed;
}

/**
 * Full intelligent pathfinding entry point:
 * - Snaps start and destination cleanly off walls/furniture
 * - Runs corner-safe A* avoiding props and sealed bulkheads
 * - If destination is behind a sealed security gate, computes the real route up to the
 *   locked bulkhead and returns `partialBlocked: true` + `blockedByGateTile`
 * - Smooths output waypoints via collision-safe string pulling
 */
export function findSmartPath(
  map: TileMap,
  startWorld: WorldPoint,
  targetWorld: WorldPoint,
  options: PathOptions = {}
): PathResult {
  const s = map.tileSize;
  const rawStartTx = Math.max(0, Math.min(map.width - 1, Math.floor(startWorld.x / s)));
  const rawStartTy = Math.max(0, Math.min(map.height - 1, Math.floor(startWorld.y / s)));
  const rawGoalTx = Math.max(0, Math.min(map.width - 1, Math.floor(targetWorld.x / s)));
  const rawGoalTy = Math.max(0, Math.min(map.height - 1, Math.floor(targetWorld.y / s)));

  const startTile = isTileStandable(map, rawStartTx, rawStartTy, options.extraBlocked, options.colliderWidth, options.colliderHeight)
    ? { tx: rawStartTx, ty: rawStartTy }
    : findNearestStandableTile(map, rawStartTx, rawStartTy, { extraBlocked: options.extraBlocked }, 3);

  if (!startTile) {
    return { waypoints: [], partialBlocked: false, blockedByGateTile: null };
  }

  // Exact goal check (can user click exact pixel inside standable tile?)
  const goalExactBlocked =
    !map.inBounds(rawGoalTx, rawGoalTy) ||
    isBoxBlocked(map, feetColliderAt(targetWorld.x, targetWorld.y, options.colliderWidth, options.colliderHeight), options.extraBlocked) ||
    ((options.tilePenalty?.(rawGoalTx, rawGoalTy) ?? 0) > 0 && !isTileStandable(map, rawGoalTx, rawGoalTy, options.extraBlocked));

  let goalTile: TileCoord | null = null;
  let finalWorld = targetWorld;

  if (!goalExactBlocked && (options.tilePenalty?.(rawGoalTx, rawGoalTy) ?? 0) === 0) {
    goalTile = { tx: rawGoalTx, ty: rawGoalTy };
  } else {
    goalTile = findNearestStandableTile(map, rawGoalTx, rawGoalTy, options, 6);
    if (goalTile) {
      // Only keep exact pixel if it's on the exact clicked tile & clear
      if (
        goalTile.tx === rawGoalTx &&
        goalTile.ty === rawGoalTy &&
        !isBoxBlocked(map, feetColliderAt(targetWorld.x, targetWorld.y, options.colliderWidth, options.colliderHeight), options.extraBlocked)
      ) {
        finalWorld = targetWorld;
      } else {
        finalWorld = tileCenter(map, goalTile.tx, goalTile.ty);
      }
    }
  }

  // 1. Primary pathfinding attempt respecting security gates
  if (goalTile) {
    const tiles = runAStarTiles(map, startTile.tx, startTile.ty, goalTile.tx, goalTile.ty, options);
    if (tiles) {
      return {
        waypoints: smoothWorldPath(map, startWorld, finalWorld, tiles, options),
        partialBlocked: false,
        blockedByGateTile: null,
        snapped: goalExactBlocked || goalTile.tx !== rawGoalTx || goalTile.ty !== rawGoalTy
      };
    }
  }

  // 2. If a security gate system is present, probe unconstrained hull route to detect
  //    whether the destination is beyond a sealed bulkhead gate!
  if (options.extraBlocked) {
    const ignoreGateGoal = findNearestStandableTile(
      map,
      rawGoalTx,
      rawGoalTy,
      { tilePenalty: options.tilePenalty },
      6
    );
    if (ignoreGateGoal) {
      const unconstrained = runAStarTiles(map, startTile.tx, startTile.ty, ignoreGateGoal.tx, ignoreGateGoal.ty, {
        tilePenalty: options.tilePenalty,
        colliderWidth: options.colliderWidth,
        colliderHeight: options.colliderHeight
      });

      if (unconstrained && unconstrained.length > 0) {
        let gateIdx = -1;
        for (let i = 0; i < unconstrained.length; i++) {
          const step = unconstrained[i];
          if (options.extraBlocked(step.tx, step.ty)) {
            gateIdx = i;
            break;
          }
        }

        if (gateIdx >= 0) {
          const gateTile = unconstrained[gateIdx];
          // Stand on the last unblocked walkable tile right before the sealed gate
          let standIdx = Math.max(0, gateIdx - 1);
          while (
            standIdx > 0 &&
            !isTileStandable(map, unconstrained[standIdx].tx, unconstrained[standIdx].ty, options.extraBlocked)
          ) {
            standIdx--;
          }
          const approachTile = unconstrained[standIdx];
          const approachWorld = tileCenter(map, approachTile.tx, approachTile.ty);
          const approachPath = runAStarTiles(map, startTile.tx, startTile.ty, approachTile.tx, approachTile.ty, options);
          return {
            waypoints: approachPath
              ? smoothWorldPath(map, startWorld, approachWorld, approachPath, options)
              : [],
            partialBlocked: true,
            blockedByGateTile: gateTile
          };
        }
      }
    }
  }

  return { waypoints: [], partialBlocked: false, blockedByGateTile: null };
}

/**
 * Find the shortest walkable stand position adjacent to an interactable fixture or NPC
 * (handling props pushed against walls cleanly from whichever open side leads to it).
 */
export function findBestInteractStandPoint(
  map: TileMap,
  startWorld: WorldPoint,
  interactCenter: WorldPoint,
  interactRadius: number,
  reach: number,
  options: PathOptions = {}
): PathResult {
  const s = map.tileSize;
  const targetTx = Math.max(0, Math.min(map.width - 1, Math.floor(interactCenter.x / s)));
  const targetTy = Math.max(0, Math.min(map.height - 1, Math.floor(interactCenter.y / s)));
  const maxDist = interactRadius + reach + 10;

  const candidates: Array<{ tile: TileCoord; point: WorldPoint; score: number }> = [];

  for (let oy = -3; oy <= 3; oy++) {
    for (let ox = -3; ox <= 3; ox++) {
      const tx = targetTx + ox;
      const ty = targetTy + oy;
      if (!isTileStandable(map, tx, ty, options.extraBlocked, options.colliderWidth, options.colliderHeight)) {
        continue;
      }
      const pt = tileCenter(map, tx, ty);
      const distToObj = Math.hypot(pt.x - interactCenter.x, pt.y - interactCenter.y);
      if (distToObj > maxDist) continue;
      const pen = options.tilePenalty ? options.tilePenalty(tx, ty) : 0;
      const distFromPlayer = Math.hypot(pt.x - startWorld.x, pt.y - startWorld.y);
      candidates.push({
        tile: { tx, ty },
        point: pt,
        score: distFromPlayer + (pen > 0 ? 180 : 0) + distToObj * 0.25
      });
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  const rawStartTx = Math.max(0, Math.min(map.width - 1, Math.floor(startWorld.x / s)));
  const rawStartTy = Math.max(0, Math.min(map.height - 1, Math.floor(startWorld.y / s)));
  const startTile = isTileStandable(map, rawStartTx, rawStartTy, options.extraBlocked)
    ? { tx: rawStartTx, ty: rawStartTy }
    : findNearestStandableTile(map, rawStartTx, rawStartTy, { extraBlocked: options.extraBlocked }, 3);

  if (startTile) {
    for (const c of candidates.slice(0, 8)) {
      const path = runAStarTiles(map, startTile.tx, startTile.ty, c.tile.tx, c.tile.ty, options);
      if (path) {
        return {
          waypoints: smoothWorldPath(map, startWorld, c.point, path, options),
          partialBlocked: false,
          blockedByGateTile: null
        };
      }
    }
  }

  // Fallback to findSmartPath so sealed-gate partial routing kicks in seamlessly!
  return findSmartPath(map, startWorld, interactCenter, options);
}
