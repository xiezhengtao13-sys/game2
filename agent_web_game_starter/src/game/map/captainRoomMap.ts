import { TileMap, type TileType } from "./TileMap";

/**
 * The captain's quarters -- the game's first scene.
 *
 * Laid out to the room description in docs/设定集.md:
 *
 *   - the room is 24 x 16 tiles
 *   - **1 格 = 一个人高 = 1.8 米** (see `config.ts`), so the room is 43 x 29 m
 *   - 办公区 along the forward wall, with the observation wall to one side
 *   - 会客区 in the middle, a round table with six fixed chairs
 *   - 私人卧室 in the south-west, with a small simulated porthole
 *   - 阅读区 in the south-east: bookshelf, offline terminal, reading chair
 *   - 舱门 in the forward wall, opening onto the passage to the bridge
 *
 * Scale note: the document says ~120 m², which is a believable captain's cabin
 * but far too small to walk around in at a legible sprite size -- 120 m² is a
 * 6 x 6 tile room, smaller than the table drawn in it. Rather than shrink the
 * furniture until it reads as a doll's house, the room is drawn at a walkable
 * scale and the stated area is treated as approximate. Docs/尺度.md has the
 * numbers; this note is here so the difference is not mistaken for an error.
 *
 * Authoring note: like the town before it, this is built from rectangles rather
 * than a hand-drawn ASCII picture, so a miscounted row cannot silently shift the
 * whole room.
 */

export const ROOM_COLUMNS = 24;
export const ROOM_ROWS = 16;

/**
 * The doorway, and where it is.
 *
 * Forward, not aft. The cabin sits aft of the bridge and is entered from it, so
 * the way in is the wall the two compartments share -- which is also what lets
 * `shipMap.ts` join them with a single straight passage instead of a corridor
 * that has to turn a corner.
 *
 * Two tiles (3.6 m): room for two people abreast, and narrower than the passage
 * it opens onto, so the bulkhead either side of it reads as a door frame rather
 * than the corridor simply stopping. Exported so the ship map can assert the two
 * doorways line up instead of finding out by walking into a wall.
 */
export const CABIN_DOOR = { x: 12, y: 0, w: 2, h: 1 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // --- shell -----------------------------------------------------------------
  // Everything starts as deck plating; the walls are then laid over the edges.
  { x: 0, y: 0, w: ROOM_COLUMNS, h: 1, type: "wall", note: "北舷舱壁，办公区一侧" },
  { x: 0, y: ROOM_ROWS - 1, w: ROOM_COLUMNS, h: 1, type: "wall", note: "南舷舱壁（艉侧）" },
  { x: 0, y: 0, w: 1, h: ROOM_ROWS, type: "wall", note: "西舷舱壁" },
  { x: ROOM_COLUMNS - 1, y: 0, w: 1, h: ROOM_ROWS, type: "wall", note: "东舷舱壁" },

  // The doorway: an opening in the forward wall the player walks in through from
  // the passage to the bridge.
  { x: CABIN_DOOR.x, y: CABIN_DOOR.y, w: CABIN_DOOR.w, h: CABIN_DOOR.h, type: "floor_light", note: "舱门开口，兼作入口导引灯" },

  // --- forward wall: the working wall ---------------------------------------
  // The observation wall, 6 tiles of it, sitting where the desk looks at it.
  // It is a display wall rather than a real window: this room is deep inside the
  // hull, and what it shows is the ship's own view of the sky.
  { x: 3, y: 0, w: 6, h: 1, type: "window", note: "星空观测墙（曲面显示墙）" },

  // Equipment panels either side of the doorway.
  { x: 9, y: 0, w: 2, h: 1, type: "wall_dark", note: "舱壁设备面板" },
  { x: 14, y: 0, w: 2, h: 1, type: "wall_dark", note: "舱壁设备面板" },

  // --- west wall: bedroom end ------------------------------------------------
  { x: 0, y: 9, w: 1, h: 1, type: "window", note: "卧室的小型模拟舷窗" },
  { x: 0, y: 12, w: 1, h: 1, type: "wall_dark", note: "环境控制单元" },

  // --- east wall -------------------------------------------------------------
  { x: ROOM_COLUMNS - 1, y: 3, w: 1, h: 1, type: "wall_dark", note: "阅读区旁的检修面板" },

  // --- floor detail ----------------------------------------------------------
  // Rugs tightly framing functional zones: office, reception, bedroom, and reading.
  // Applied BEFORE the guide lights, so the lights stay visible across rugs.
  { x: 4, y: 2, w: 4, h: 3, type: "deck_rug", note: "办公区行政地毯" },
  { x: 7, y: 6, w: 5, h: 5, type: "deck_rug", note: "会客区地毯" },
  { x: 1, y: 11, w: 4, h: 4, type: "deck_rug", note: "起居区静音地毯" },
  { x: 17, y: 11, w: 5, h: 3, type: "deck_rug", note: "阅读区地毯" },

  // Guide lighting running up the middle of the room with side wings.
  { x: 12, y: 2, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 4, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 8, y: 4, w: 1, h: 1, type: "floor_light", note: "办公区分支导引灯" },
  { x: 16, y: 4, w: 1, h: 1, type: "floor_light", note: "阅读区分支导引灯" },
  { x: 12, y: 6, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 8, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 10, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 12, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 14, w: 1, h: 1, type: "floor_light", note: "地面导引灯" }
];

/**
 * The room, as a grid.
 *
 * Layered in the order the room was built -- shell, then what is fitted to the
 * walls, then the floor detail -- so a later shape can deliberately sit on top of
 * an earlier one. Exported because the ship is built by joining its compartments
 * rather than by redrawing them.
 */
export function cabinGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < ROOM_ROWS; y++) {
    grid.push(new Array<TileType>(ROOM_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= ROOM_COLUMNS || y >= ROOM_ROWS) {
          throw new Error(`Shape "${shape.note}" runs outside the room at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  assertDoorway(grid);
  return grid;
}

/**
 * The doorway must still be an opening.
 *
 * It is the one tile of this room another module depends on: `shipMap.ts` joins
 * the ship's compartments at exactly this spot. A door quietly covered by a wall
 * panel would otherwise show up as a passage that leads into a bulkhead, so it is
 * checked here, where the mistake is.
 */
function assertDoorway(grid: TileType[][]): void {
  for (let y = CABIN_DOOR.y; y < CABIN_DOOR.y + CABIN_DOOR.h; y++) {
    for (let x = CABIN_DOOR.x; x < CABIN_DOOR.x + CABIN_DOOR.w; x++) {
      if (grid[y][x] !== "floor_light") {
        throw new Error(`The cabin doorway at ${x},${y} is ${grid[y][x]}, not an opening`);
      }
    }
  }
}

/**
 * The room on its own, as a map.
 *
 * The game never uses this -- the ship is one map -- but the room's own shell is
 * worth testing on its own terms, without a corridor cut into its forward wall.
 */
export function createCaptainRoomMap(tileSize: number): TileMap {
  return new TileMap(cabinGrid().flat(), ROOM_COLUMNS, ROOM_ROWS, tileSize);
}

/** Exposed so tests and tooling can reason about the authored layout. */
export const ROOM_SHAPES: readonly Shape[] = SHAPES;
