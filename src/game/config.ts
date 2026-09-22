import type { TileMap } from "./map/TileMap";
import { TILE_SIZE } from "./assets/manifest";

/**
 * All tunable gameplay numbers in one place, so balance changes do not require
 * hunting through systems.
 */

/** Pixels per tile. Mirrors the size declared in the asset manifest. */
export const TILE = TILE_SIZE;

/** World is measured in tiles here; pixel size is derived. */
export const MAP_COLUMNS = 40;
export const MAP_ROWS = 30;

export const MAP_WIDTH = MAP_COLUMNS * TILE;
export const MAP_HEIGHT = MAP_ROWS * TILE;

/** Player movement, in pixels per second. */
export const PLAYER_SPEED = 170;

/**
 * Spawn point of a new resident, in pixels: the crossroads in the middle of
 * town, on the main street. Kept clear of buildings so the player never starts
 * inside a wall.
 */
export const PLAYER_SPAWN = { x: 18 * TILE + TILE / 2, y: 12 * TILE + TILE / 2 };

/** Sanity check used at startup and by tests: the map must fill the world. */
export function assertMapMatchesConfig(map: TileMap): void {
  if (map.width !== MAP_COLUMNS || map.height !== MAP_ROWS) {
    throw new Error(
      `Town map is ${map.width}x${map.height} tiles but config says ` +
        `${MAP_COLUMNS}x${MAP_ROWS}. Update townMap.ts or config.ts so they agree.`
    );
  }
}
