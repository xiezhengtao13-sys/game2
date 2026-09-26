import { TileMap, type TileType } from "./TileMap";
import { cabinGrid, CABIN_DOOR, ROOM_COLUMNS, ROOM_ROWS } from "./captainRoomMap";
import { bridgeGrid, BRIDGE_DOOR, BRIDGE_COLUMNS, BRIDGE_ROWS } from "./bridgeMap";

/**
 * The whole playable ship, as ONE map: the captain's quarters, a passage, and the
 * bridge.
 *
 * They are not separate scenes joined by a transition. They are compartments of
 * the same deck joined by a passage you walk down, so moving between them is
 * walking: no load, no fade, no seam -- and, since one camera frames one map, no
 * moment where the game stops being a place. Any two-scene arrangement has a
 * boundary where something has to happen; one map is the only way to genuinely
 * avoid it.
 *
 * The compartments are the SAME builders the standalone scenes used, composed
 * here rather than reimplemented. Rewriting them for the merge produced three
 * layouts with walls down the middle of the bridge; composing the verified
 * originals and then cutting one passage between them is both smaller and correct.
 *
 * Everything outside the two compartments and the passage is solid structure.
 *
 * The deck reads forward-to-aft downwards:
 *
 *     rows  0 .. 19   the bridge -- forward is UP, its doorway aft at row 16
 *     rows 20 .. 23   the passage, cut through the structure between them
 *     rows 24 .. 39   the captain's quarters, its doorway forward at row 24
 *
 * The cabin is aft of the bridge because that is where a captain's cabin is, and
 * because the bridge has to keep its display forward. It is centred under the
 * bridge so that the passage between them is one straight run down the middle
 * rather than a corridor that turns a corner.
 *
 * The passage is four tiles wide -- 7.2 m, four person-heights, and twice the
 * width of the doorways at either end of it. That is a deliberate playtest
 * correction: the first version was three tiles of floor in a 40 px grid, which
 * read as a tube rather than a passage (the whole scale derivation is in
 * `config.ts` and docs/尺度.md).
 */

/** Where each compartment sits on the deck. */
export const BRIDGE_ORIGIN = { tx: 0, ty: 0 };
export const CABIN_ORIGIN = { tx: 8, ty: 24 };

/**
 * How wide the passage is, in tiles.
 *
 * Wider than the doorways it joins, by at least a tile on each side, so the
 * doorways read as openings in a bulkhead instead of the end of a tube.
 */
export const PASSAGE_WIDTH = 4;

export const SHIP_COLUMNS = BRIDGE_COLUMNS;
export const SHIP_ROWS = CABIN_ORIGIN.ty + ROOM_ROWS;

/** Where a compartment's doorway lands on the deck. */
function doorOnDeck(origin: { tx: number; ty: number }, door: { x: number; y: number; w: number }) {
  return { x0: origin.tx + door.x, x1: origin.tx + door.x + door.w - 1, y: origin.ty + door.y };
}

/**
 * Check that the two doorways line up, and lay the passage out around them.
 *
 * The one thing this file cannot get wrong: a misalignment is a wall across the
 * route, or a passage cutting through the middle of a room, and neither shows up
 * until somebody walks it. So the passage is not written down as columns -- it is
 * derived from the doorways, with an equal shoulder of bulkhead on either side,
 * and any drift in an origin or a door becomes a startup error. It runs on
 * import, before anything can be played.
 */
function measurePassage(): { x0: number; x1: number; top: number; bottom: number } {
  const cabin = doorOnDeck(CABIN_ORIGIN, CABIN_DOOR);
  const bridge = doorOnDeck(BRIDGE_ORIGIN, BRIDGE_DOOR);

  if (cabin.x0 !== bridge.x0 || cabin.x1 !== bridge.x1) {
    throw new Error(
      `The doorways do not line up: the cabin's spans columns ${cabin.x0}..${cabin.x1} ` +
        `and the bridge's ${bridge.x0}..${bridge.x1}. Move an origin in shipMap.ts.`
    );
  }

  if (CABIN_DOOR.w !== BRIDGE_DOOR.w) {
    throw new Error(
      `The doorways are different widths (${CABIN_DOOR.w} and ${BRIDGE_DOOR.w}), so no ` +
        `passage can be centred on both.`
    );
  }

  const shoulder = (PASSAGE_WIDTH - CABIN_DOOR.w) / 2;
  if (!Number.isInteger(shoulder) || shoulder < 1) {
    throw new Error(
      `A ${PASSAGE_WIDTH}-tile passage cannot be centred on a ${CABIN_DOOR.w}-tile ` +
        `doorway with bulkhead on both sides.`
    );
  }

  return {
    x0: cabin.x0 - shoulder,
    x1: cabin.x1 + shoulder,
    top: bridge.y,
    bottom: cabin.y
  };
}

const PASSAGE = measurePassage();

export function buildShipGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < SHIP_ROWS; y++) {
    grid.push(new Array<TileType>(SHIP_COLUMNS).fill("hull"));
  }

  // Compose the compartments, keeping each one's own hull out of the merged grid
  // so the ship's structure shows through around the outside.
  blit(grid, cabinGrid(), CABIN_ORIGIN);
  blit(grid, bridgeGrid(), BRIDGE_ORIGIN);

  carvePassage(grid);

  return grid;
}

function blit(grid: TileType[][], rows: TileType[][], origin: { tx: number; ty: number }): void {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const value = rows[y][x];
      if (value === "hull") continue;

      const wx = origin.tx + x;
      const wy = origin.ty + y;
      if (wx < 0 || wy < 0 || wx >= SHIP_COLUMNS || wy >= SHIP_ROWS) {
        throw new Error(`Compartment runs off the ship at ${wx},${wy}`);
      }
      grid[wy][wx] = value;
    }
  }
}

/**
 * Cut the passage between the two doorways.
 *
 * Runs straight from the bridge's aft doorway to the cabin's forward one, through
 * the structure between them. What it must NOT do is open the compartments up:
 * the passage is wider than the doorways, and the tiles along its sides become
 * bulkhead rather than floor.
 *
 * Tiles that are already floor are left alone, so each doorway keeps its own
 * guide lighting instead of being repainted by the join. And the cabin's forward
 * bulkhead -- the passage's last row -- is left alone entirely: only the doorway
 * in it is an opening, and the rest of that wall is what makes the doorway read
 * as a door rather than as the corridor just ending.
 */
function carvePassage(grid: TileType[][]): void {
  const { x0, x1, top, bottom } = PASSAGE;

  for (let y = top; y <= bottom; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x < 0 || y < 0 || x >= SHIP_COLUMNS || y >= SHIP_ROWS) {
        throw new Error(`The passage runs off the ship at ${x},${y}`);
      }

      if (x >= x0 && x <= x1) {
        if (y < bottom && !isFloor(grid[y][x])) grid[y][x] = "deck";
        continue;
      }

      // Along the sides: solid mass becomes a bulkhead, but a compartment's own
      // floor is not walled off -- the bridge's aft aisle opens onto this passage.
      if (grid[y][x] === "hull") grid[y][x] = "wall";
    }
  }

  carvePassageDetail(grid, x0, x1, top, bottom);
}

/**
 * Give the passage something to walk past.
 *
 * A lit strip down the middle, and a pair of equipment bays in the structure
 * between the two compartments. Purely cosmetic -- both are floor and wall
 * tiles respectively -- but a bare tube is what made the first version of this
 * corridor feel narrow, and a 16 m walk with nothing in it reads as longer than
 * it is.
 */
function carvePassageDetail(
  grid: TileType[][],
  x0: number,
  x1: number,
  top: number,
  bottom: number
): void {
  const mid = (x0 + x1) / 2;
  const spine: number[] = [];
  for (let x = Math.floor(mid); x <= Math.ceil(mid); x++) spine.push(x);

  for (let y = top + 2; y < bottom - 1; y += 2) {
    for (const x of spine) grid[y][x] = "floor_light";
  }

  // The rows between the compartments, where the passage is cut through solid
  // ship rather than running through one of them.
  const gapTop = BRIDGE_ORIGIN.ty + BRIDGE_ROWS;
  const gapBottom = CABIN_ORIGIN.ty - 1;
  const bayTop = Math.floor((gapTop + gapBottom) / 2);

  for (const y of [bayTop, bayTop + 1]) {
    for (const x of [x0 - 1, x1 + 1]) grid[y][x] = "wall_dark";
  }
}

/** The kinds of tile the player can stand on. */
function isFloor(type: TileType | undefined): boolean {
  return type === "deck" || type === "deck_dark" || type === "deck_rug" || type === "floor_light";
}

export function createShipMap(tileSize: number): TileMap {
  return new TileMap(buildShipGrid().flat(), SHIP_COLUMNS, SHIP_ROWS, tileSize);
}

/**
 * Where the player arrives: inside the cabin's doorway, walking in.
 *
 * Derived from the doorway rather than written down, so moving the door moves the
 * arrival with it. Anchored bottom-centre like every sprite, so this is the
 * sprite's top-left.
 */
export function shipSpawn(tileSize: number): { x: number; y: number } {
  const door = doorOnDeck(CABIN_ORIGIN, CABIN_DOOR);

  return {
    x: ((door.x0 + door.x1 + 1) / 2) * tileSize - 16,
    y: (door.y + 3) * tileSize
  };
}

/** Which part of the ship a tile is in. */
export type Place = "bridge" | "passage" | "cabin" | "structure";

export function placeAt(tx: number, ty: number): Place {
  if (inCompartment(BRIDGE_ORIGIN, BRIDGE_COLUMNS, BRIDGE_ROWS, tx, ty)) return "bridge";
  if (inCompartment(CABIN_ORIGIN, ROOM_COLUMNS, ROOM_ROWS, tx, ty)) return "cabin";
  if (tx >= PASSAGE.x0 && tx <= PASSAGE.x1 && ty > BRIDGE_ROWS - 1 && ty < CABIN_ORIGIN.ty) {
    return "passage";
  }
  return "structure";
}

function inCompartment(
  origin: { tx: number; ty: number },
  columns: number,
  rows: number,
  tx: number,
  ty: number
): boolean {
  return tx >= origin.tx && tx < origin.tx + columns && ty >= origin.ty && ty < origin.ty + rows;
}

/** Compartment extents and the join between them, for tests and tooling. */
export const CABIN_BOUNDS = { ...CABIN_ORIGIN, columns: ROOM_COLUMNS, rows: ROOM_ROWS };
export const BRIDGE_BOUNDS = { ...BRIDGE_ORIGIN, columns: BRIDGE_COLUMNS, rows: BRIDGE_ROWS };
export const PASSAGE_BOUNDS = { ...PASSAGE, width: PASSAGE_WIDTH };
