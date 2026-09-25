import { TILE_SIZE } from "./assets/manifest";

/**
 * Tunable numbers for the ship, in one place.
 *
 * This file is expected to grow a scene at a time as more of 远望号 becomes
 * playable; it is not a general config system.
 */

/**
 * On-screen size of one tile, in pixels, for the captain's quarters.
 *
 * The room grid is authored at a comfortable scale and then rendered at 40px per
 * tile, which makes the 24 x 16 cabin 960 x 640 -- smaller than the viewport, so
 * the whole room is visible at once and the camera simply sits still. See
 * `captainRoomMap.ts` for the scale reasoning.
 */
export const TILE = 40;

/**
 * On-screen size of one tile on the bridge.
 *
 * Larger than the cabin's, on purpose. The bridge is about 35 x 25 m against the
 * cabin's 120 m2, and the setting document asks for the difference to be
 * obvious. A bigger tile means the same walk covers more ground, so the hall
 * reads as genuinely bigger rather than merely having more stuff in it.
 */
export const BRIDGE_TILE = 48;

/** Bridge hall, in tiles. Wider than it is deep, per the document's footprint. */
export const BRIDGE_COLUMNS = 40;
export const BRIDGE_ROWS = 20;

export const BRIDGE_WIDTH = BRIDGE_COLUMNS * BRIDGE_TILE;
export const BRIDGE_HEIGHT = BRIDGE_ROWS * BRIDGE_TILE;

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
