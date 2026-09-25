import { TILE_SIZE } from "./assets/manifest";

/**
 * Tunable numbers for the ship, in one place.
 *
 * This file is expected to grow a scene at a time as more of 远望号 becomes
 * playable; it is not a general config system.
 */

/**
 * On-screen size of one tile, in pixels.
 *
 * The room grid is authored at a comfortable scale and then rendered at 40px per
 * tile, which makes the 24 x 16 captain's quarters 960 x 640 -- smaller than the
 * viewport, so the whole room is visible at once and the camera simply sits
 * still. See `captainRoomMap.ts` for the scale reasoning.
 */
export const TILE = 40;

/** Pixel size a tile's art is authored at, before scaling. */
export const ART_TILE = TILE_SIZE;

/** Captain's quarters, in tiles. */
export const ROOM_COLUMNS = 24;
export const ROOM_ROWS = 16;

export const ROOM_WIDTH = ROOM_COLUMNS * TILE;
export const ROOM_HEIGHT = ROOM_ROWS * TILE;

/** Player movement, in pixels per second. */
export const PLAYER_SPEED = 150;

/**
 * How far in front of their feet the player can reach to interact, in pixels.
 *
 * Roughly one tile, so you act on the thing you are standing in front of rather
 * than on whatever happens to be across the room.
 */
export const PLAYER_INTERACT_REACH = 40;

/**
 * Where the player starts: just inside the doorway in the south wall, walking in.
 * Bottom-centre anchored, so this is the sprite's top-left.
 */
export const PLAYER_SPAWN = {
  x: 11.5 * TILE,
  y: ROOM_HEIGHT - TILE - 48
};
