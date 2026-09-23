import type { TileMap } from "./map/TileMap";
import { TILE_SIZE } from "./assets/manifest";
import { Farm } from "./systems/Farm";
import { GameTime } from "./systems/Time";

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
 * How far in front of the player's feet they can reach to interact, in pixels.
 *
 * Roughly one tile, so standing outside a building reaches its door while the
 * far side of the street does not.
 */
export const PLAYER_INTERACT_REACH = 44;

/**
 * How far the player can reach to work the field, in pixels. Larger than the
 * normal reach: you work the plot you are standing next to, not a single tile.
 */
export const FARM_WORK_REACH = TILE * 1.5;

/** Real seconds per in-game minute. 1 means ten real minutes is one game day. */
export const SECONDS_PER_GAME_MINUTE = 1;

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

/**
 * Build the farmable field from the map: every farmland tile becomes a plot.
 *
 * Derived from the map rather than listed separately, so moving or resizing the
 * field in `townMap.ts` cannot leave the plots behind in the old place.
 */
export function createFarm(map: TileMap): Farm {
  const farm = new Farm();
  for (const { tx, ty } of map.tilesOfType("farmland")) {
    farm.addPlot(tx, ty);
  }
  return farm;
}

/** Build the game clock. */
export function createGameTime(): GameTime {
  return new GameTime(SECONDS_PER_GAME_MINUTE);
}
