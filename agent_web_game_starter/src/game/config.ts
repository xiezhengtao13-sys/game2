import { TILE_SIZE } from "./assets/manifest";

/**
 * How big everything is, derived from one number: a person.
 *
 * The crew sprite is 48 px tall and a crew member is 1.8 m, so 1 px is 37.5 mm.
 * A tile is authored -- and rendered, unscaled -- at 48 px, which makes one tile
 * exactly one person-height:
 *
 *     **1 格 = 一个人高 = 1.8 米**
 *
 * That is the yardstick every space is checked against, and it is where the
 * dimensions come from rather than the other way round:
 *
 *     舰长室舱门 / 舰桥舱门   2 格 = 3.6 m   两个人并排进出
 *     通道                    4 格 = 7.2 m   四个人并排；迎面来人不用侧身
 *     舰长室                  24 x 16 格     43 x 29 m
 *     舰桥指挥区              30 x 11 格     54 x 20 m
 *
 * The first version of the map was authored at 40 px per tile while the person
 * stayed 48 px, so a crew member stood taller than a tile, and every corridor
 * read narrower than it measured. The playtest verdict on that was
 * 「地方有点窄了，尤其是走廊」, and this file is the fix: the person is the unit and
 * the tile follows the person, not the other way round. Rendering at the art's
 * own 48 px also means nothing is resampled -- what an artist draws is what the
 * screen shows.
 *
 * Compartment sizes still live with the compartment: the cabin's grid knows how
 * big the cabin is, the bridge's grid knows how big the bridge is, and
 * `shipMap.ts` is the only place that decides where they sit.
 *
 * The absolute areas in docs/设定集.md are design intent rather than a floor
 * plan. The document asks for a bridge that dwarfs the cabin and corridors wider
 * than an ordinary building's; those relationships are what the map keeps. Its
 * stated square metres are smaller than a room anyone could walk around at this
 * sprite size -- see docs/尺度.md for the derivation and the deviation.
 */

/** A crew member's height, which is what the whole map is measured in. */
export const PERSON_HEIGHT_M = 1.8;

/** The same person, in the sprite's own pixels. */
export const PERSON_HEIGHT_PX = 48;

/**
 * Pixels per tile on screen, everywhere on the ship.
 *
 * The same number the art is authored at, so tiles, props and characters are all
 * drawn at 1:1. One tile being one person-height is what makes the map legible:
 * a corridor four tiles wide is a corridor four people wide.
 */
export const TILE = TILE_SIZE;

/** Metres per tile. By definition this is one person, and everything follows. */
export const METRES_PER_TILE = PERSON_HEIGHT_M;

/** Derived from the tile, so the sprite is what pins the whole scale down. */
export const PIXELS_PER_METRE = TILE / METRES_PER_TILE;

/** A length in tiles, in metres -- for design notes, docs and tests. */
export function tilesToMetres(tiles: number): number {
  return tiles * METRES_PER_TILE;
}

/** Player movement, in pixels per second. */
export const PLAYER_SPEED = 150;

/**
 * How far in front of their feet the player can reach to interact, in pixels.
 *
 * Four fifths of a tile (1.5 m), so you act on the thing in the next tile along
 * rather than on whatever happens to be across the room.
 */
export const PLAYER_INTERACT_REACH = 40;
