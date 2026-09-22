/**
 * Tile kinds. The string values are the asset ids in the manifest, so a tile
 * type maps straight to its art with no lookup table in between.
 *
 * `grass` is the default fill. Buildings live here as tiles too: they are static
 * and do not need depth sorting against the player, so a second object layer
 * would add complexity for nothing.
 */
export type TileType = "grass" | "path" | "water" | "farmland" | "wall" | "roof";

/** Tile kinds the player cannot walk through. */
const SOLID_TILES: ReadonlySet<TileType> = new Set<TileType>(["water", "wall", "roof"]);

/** True when the player is blocked by this tile kind. */
export function isSolidTile(type: TileType): boolean {
  return SOLID_TILES.has(type);
}

/** A tile position within the map grid. */
export interface TileCoord {
  tx: number;
  ty: number;
  type: TileType;
}

/** A half-open pixel-space rectangle, as produced by the camera. */
export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Ground layer for the town: a grid of tile types plus the knowledge of which
 * tiles a given view can see.
 *
 * Deliberately knows nothing about drawing or the DOM, so its logic is testable
 * in Node. The renderer walks the tiles this yields.
 */
export class TileMap {
  constructor(
    private readonly grid: TileType[],
    readonly width: number,
    readonly height: number,
    readonly tileSize: number
  ) {
    if (grid.length !== width * height) {
      throw new Error(`Tile grid has ${grid.length} entries, expected ${width * height}`);
    }
  }

  get pixelWidth(): number {
    return this.width * this.tileSize;
  }

  get pixelHeight(): number {
    return this.height * this.tileSize;
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  /** Tile type at a tile coordinate, or null when outside the map. */
  tileAt(tx: number, ty: number): TileType | null {
    if (!this.inBounds(tx, ty)) return null;
    return this.grid[ty * this.width + tx];
  }

  atPixel(x: number, y: number): TileType | null {
    return this.tileAt(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /**
   * Walk every tile that overlaps `view`, row by row.
   *
   * The range is clamped to the map, so iterating a view that extends past the
   * edges yields only real tiles. Drawing exactly the visible tiles keeps the
   * per-frame cost proportional to the viewport rather than to the map.
   */
  *visibleTiles(view: WorldRect): Generator<TileCoord> {
    const size = this.tileSize;

    const minTx = Math.max(0, Math.floor(view.x / size));
    const minTy = Math.max(0, Math.floor(view.y / size));
    const maxTx = Math.min(this.width - 1, Math.ceil((view.x + view.width) / size) - 1);
    const maxTy = Math.min(this.height - 1, Math.ceil((view.y + view.height) / size) - 1);

    for (let ty = minTy; ty <= maxTy; ty++) {
      const rowStart = ty * this.width;
      for (let tx = minTx; tx <= maxTx; tx++) {
        yield { tx, ty, type: this.grid[rowStart + tx] };
      }
    }
  }
}
