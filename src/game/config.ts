import { TILE_SIZE } from "./assets/manifest";

/**
 * Tunable numbers for the ship, in one place.
 *
 * Deliberately small. Compartment sizes live with the compartment: the cabin's
 * grid knows how big the cabin is, the bridge's grid knows how big the bridge is,
 * and `shipMap.ts` is the only place that decides where they sit. Restating those
 * numbers here as well is how two sources of truth start, so they are not here.
 */

/**
 * On-screen size of one tile, in pixels, everywhere on the ship.
 *
 * One scale for the whole ship, so walking from the cabin to the bridge does not
 * change how big a metre is. The bridge reads as the larger room because it has
 * more tiles, not because its tiles are bigger.
 */
export const TILE = 40;

/** Pixel size a tile's art is authored at, before scaling. */
export const ART_TILE = TILE_SIZE;

/** Player movement, in pixels per second. */
export const PLAYER_SPEED = 150;

/**
 * How far in front of their feet the player can reach to interact, in pixels.
 *
 * Roughly one tile, so you act on the thing you are standing in front of rather
 * than on whatever happens to be across the room.
 */
export const PLAYER_INTERACT_REACH = 40;
