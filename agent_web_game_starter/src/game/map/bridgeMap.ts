import { TileMap, type TileType } from "./TileMap";

/**
 * The bridge: an elliptical command hall.
 *
 * The setting document gives the real geometry -- about 35 m by 25 m, roughly
 * 700 m2, with a curved display across the front. This is generated rather than
 * hand-drawn, because a hand-counted curve of this size cannot be verified by
 * eye.
 *
 * The command floor comes out at 30 x 11 tiles, which at the ship's person-derived
 * 1.8 m per tile (`config.ts`) is 54 x 20 m -- larger than the document's stated
 * footprint, and longer relative to its depth. Same trade as the cabin: at a
 * sprite size where one tile is one person, a 35 x 25 m room is a room you cross
 * in a few seconds and cannot fit stations into. Docs/尺度.md records it.
 *
 * The hall is bigger than the captain's quarters the honest way: more tiles, at
 * the same tile size as everything else on the ship. An earlier version rendered
 * the bridge at a larger scale than the cabin, which read as the ship changing
 * size when you walked through the door -- and which stopped being possible at
 * all once both compartments shared one map.
 *
 * Forward (toward the bow) is NORTH, matching how the player reads the screen:
 * the wrap-around display and the captain's chair face up.
 *
 * Construction is deliberately dumb, in three explicit layers:
 *
 *   1. `isHall`    -- the walkable floor: a rectangle with its corners cut.
 *   2. bulkheads   -- every tile adjacent to the floor, so the hall is sealed by
 *                     construction and no sealing pass can eat the room.
 *   3. `isAftDeck` -- one more ring outside that, so the camera shows deck rather
 *                     than bare structure along the screen edges.
 *
 * An earlier version grew the floor and then eroded anything touching hull. That
 * is circular -- the floor's own edge touches hull -- so it walled off the whole
 * hall. Naming the three regions separately makes that mistake impossible.
 */

export const BRIDGE_COLUMNS = 40;

/**
 * Rows in the grid.
 *
 * The hall occupies rows 5..15, so there is an aft bulkhead at 16, the doorway
 * aisle at 17, and only a couple of rows of structure beyond. A taller grid put
 * more hull below the doorway, and since the player arrives there the camera
 * showed a wide band of bare structure across the bottom of the screen.
 */
export const BRIDGE_ROWS = 20;

/** The floor's extent, before the corners are cut. */
const HALL = { x0: 5, y0: 5, x1: 34, y1: 15 };

/** How far the corners are cut back, which is what makes it read as elliptical. */
const CORNER = 4;

/**
 * The walkable command floor: a rectangle with its four corners trimmed.
 *
 * Trimming squares off the corners rather than curving them, which at this pixel
 * size looks the same and is far easier to reason about. The hall is much wider
 * than it is deep, so a single corner size keeps the forward and aft rows intact
 * -- a large curved radius previously ate most of them.
 */
function isHall(x: number, y: number): boolean {
  const { x0, y0, x1, y1 } = HALL;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;

  const dLeft = x - x0;
  const dRight = x1 - x;
  const dTop = y - y0;
  const dBottom = y1 - y;

  // Outside a cut corner when the tile is past the corner block on both axes.
  const beyond = (a: number, b: number) => a < CORNER && b < CORNER && a + b < CORNER;
  return !(
    beyond(dLeft, dTop) ||
    beyond(dRight, dTop) ||
    beyond(dLeft, dBottom) ||
    beyond(dRight, dBottom)
  );
}

/** True when any of the 8 neighbours satisfies `test`. */
function anyNeighbour(x: number, y: number, test: (x: number, y: number) => boolean): boolean {
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue;
      if (test(x + ox, y + oy)) return true;
    }
  }
  return false;
}

/** One ring outside the hall: the bulkhead band. */
const isWall = (x: number, y: number) => !isHall(x, y) && anyNeighbour(x, y, isHall);

/**
 * One ring outside that: deck plating, purely so the edges look right.
 *
 * Aft of the hall's forward line, and not forward of it. Forward of the bridge is
 * the ship's bow -- 深空防护结构, in the setting document -- and plating laid there
 * was floor the player could see and never reach, because the only way onto the
 * ring is behind the hall. Anything the player can see and not walk to reads as a
 * bug, so the bow side is left as solid structure.
 */
const isAftDeck = (x: number, y: number) =>
  !isHall(x, y) && !isWall(x, y) && anyNeighbour(x, y, isWall) && y > HALL.y0;

/**
 * Build the sealed shell.
 *
 * The wall ring is computed from the bare floor, BEFORE any detail is laid over
 * it. Details must not create their own bulkhead: the forward display is wider
 * than the hall's narrow forward row, so treating its overhang as interior left
 * columns of display jutting into hull gaps -- the seal has to exist first, and
 * then the display is simply clipped by the hall.
 */
function buildGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < BRIDGE_ROWS; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < BRIDGE_COLUMNS; x++) {
      if (isHall(x, y)) row.push("deck_dark");
      else if (isWall(x, y)) row.push("wall");
      else if (isAftDeck(x, y)) row.push("deck");
      // Outside all three is solid ship, not empty space: you are inside a hull.
      else row.push("hull");
    }
    grid.push(row);
  }

  return grid;
}

/**
 * The entrance, and where it is.
 *
 * In the aft bulkhead, at the hall's centre line, two tiles wide (3.6 m). Narrower
 * than the passage it opens onto, so the aft bulkhead reads as a bulkhead with a
 * door in it rather than the corridor simply running out. Exported because the
 * ship map has to meet this doorway with a passage from the captain's quarters,
 * and it checks the alignment rather than assuming it.
 */
export const BRIDGE_DOOR = { x: 20, y: 16, w: 2, h: 2 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

/**
 * Details laid over the generated shell.
 *
 * Kept as explicit rectangles so the authored intent -- where the display runs,
 * where the doorway is, where the guide lighting goes -- stays readable, while
 * the hall's shape itself is mathematical.
 */
const SHAPES: Shape[] = [
  // The wrap-around display fills the whole forward row of the hall, in one
  // unbroken band. Nothing else may be placed on row 5: a gap in the display
  // reads as a broken screen.
  { x: 3, y: 5, w: 34, h: 1, type: "screen", note: "前方大型弧形显示系统" },

  // The entrance, cut through the aft bulkhead into the aisle beyond. Aft
  // because that is the way onto a bridge: you come up behind it, from inside the
  // ship, and the ship's own command floor extends forward of you.
  { x: BRIDGE_DOOR.x, y: BRIDGE_DOOR.y, w: BRIDGE_DOOR.w, h: BRIDGE_DOOR.h, type: "floor_light", note: "舰桥舱门" },

  // Soft linear lighting: the document's "柔和的线性照明". Along the working
  // ring rather than up the middle, so it lights the stations on either side.
  { x: 7, y: 8, w: 1, h: 1, type: "floor_light", note: "柔和线性照明" },
  { x: 7, y: 13, w: 1, h: 1, type: "floor_light", note: "柔和线性照明" },
  { x: 32, y: 8, w: 1, h: 1, type: "floor_light", note: "柔和线性照明" },
  { x: 32, y: 13, w: 1, h: 1, type: "floor_light", note: "柔和线性照明" },

  // Central runway guide lights leading from aft doorway toward command station.
  { x: 20, y: 14, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 20, y: 12, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" }
];

function applyShapes(grid: TileType[][]): TileType[][] {
  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= BRIDGE_COLUMNS || y >= BRIDGE_ROWS) {
          throw new Error(`Shape "${shape.note}" runs outside the bridge at (${x}, ${y})`);
        }
        // Never punch a hole through to the outside: only overwrite built tiles.
        if (grid[y][x] === "hull") continue;
        grid[y][x] = shape.type;
      }
    }
  }
  return grid;
}

/**
 * Wall off the outside of the aisle.
 *
 * Without this, the aisle ring's outer edge is bare hull, and since the aisle is
 * walkable the player can stand where the ship's structure is showing -- which
 * reads as a hole rather than as a wall. Converting the first ring of hull into
 * bulkhead gives the aisle a proper outer face.
 */
function sealOutside(grid: TileType[][]): void {
  const hullNextToFloor: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < BRIDGE_ROWS; y++) {
    for (let x = 0; x < BRIDGE_COLUMNS; x++) {
      if (grid[y][x] !== "hull") continue;
      if (anyNeighbour(x, y, (nx, ny) => grid[ny]?.[nx] === "deck")) {
        hullNextToFloor.push({ x, y });
      }
    }
  }

  for (const { x, y } of hullNextToFloor) grid[y][x] = "wall";
}

/**
 * The hall, as a grid: shell, then detail, then sealed.
 *
 * Exported because the ship is built by joining its compartments rather than by
 * redrawing them -- this is the same grid the standalone bridge used.
 */
export function bridgeGrid(): TileType[][] {
  const grid = applyShapes(buildGrid());
  sealOutside(grid);
  assertDoorway(grid);
  return grid;
}

/**
 * The doorway must still be an opening.
 *
 * `applyShapes` refuses to punch through hull, and the seal pass runs afterwards,
 * so a doorway authored in the wrong place would be silently walled off. The ship
 * map joins the corridor here; failing at build time says why.
 */
function assertDoorway(grid: TileType[][]): void {
  for (let y = BRIDGE_DOOR.y; y < BRIDGE_DOOR.y + BRIDGE_DOOR.h; y++) {
    for (let x = BRIDGE_DOOR.x; x < BRIDGE_DOOR.x + BRIDGE_DOOR.w; x++) {
      if (grid[y][x] !== "floor_light") {
        throw new Error(`The bridge doorway at ${x},${y} is ${grid[y][x]}, not an opening`);
      }
    }
  }
}

/** The bridge on its own, as a map. The game uses the whole ship instead. */
export function createBridgeMap(tileSize: number): TileMap {
  return new TileMap(bridgeGrid().flat(), BRIDGE_COLUMNS, BRIDGE_ROWS, tileSize);
}

/** Exposed so tests and tooling can reason about the authored layout. */
export const BRIDGE_SHAPES: readonly Shape[] = SHAPES;

/** The command floor's extent, which the prop layout assumes. */
export const BRIDGE_HALL = HALL;
