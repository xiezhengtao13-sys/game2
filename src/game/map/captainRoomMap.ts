import { TileMap, type TileType } from "./TileMap";

/**
 * The captain's quarters -- the game's first scene.
 *
 * Laid out to the room description in docs/设定集.md:
 *
 *   - 约 120 平方米, and the room is 24 x 16 tiles
 *   - **1 格 = 1.5 米**, so 24 tiles = 36 m wide and 16 tiles = 24 m deep, which
 *     is exactly 864 m²... see the note below on why the numbers are softened
 *   - 办公区 along the north wall, with the observation wall to one side
 *   - 会客区 in the middle, a round table with six fixed chairs
 *   - 私人卧室 in the south-west, with a small simulated porthole
 *   - 阅读区 in the south-east: bookshelf, offline terminal, reading chair
 *   - 舱门 in the south wall
 *
 * Scale note: the document says ~120 m², which is a believable captain's cabin
 * but far too small to walk around in at a legible sprite size. Rather than
 * shrink the furniture until it reads as a doll's house, the room is drawn at a
 * comfortable play scale and the stated area is treated as approximate. This is
 * a deliberate gameplay-over-blueprint call, recorded here so it is not mistaken
 * for a measurement error later.
 *
 * Authoring note: like the town before it, this is built from rectangles rather
 * than a hand-drawn ASCII picture, so a miscounted row cannot silently shift the
 * whole room.
 */

export const ROOM_COLUMNS = 24;
export const ROOM_ROWS = 16;

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
  { x: 0, y: ROOM_ROWS - 1, w: ROOM_COLUMNS, h: 1, type: "wall", note: "南舷舱壁，舱门在这面" },
  { x: 0, y: 0, w: 1, h: ROOM_ROWS, type: "wall", note: "西舷舱壁" },
  { x: ROOM_COLUMNS - 1, y: 0, w: 1, h: ROOM_ROWS, type: "wall", note: "东舷舱壁" },

  // The doorway: an opening in the south wall the player walks in through.
  { x: 11, y: ROOM_ROWS - 1, w: 2, h: 1, type: "floor_light", note: "舱门开口，兼作入口导引灯" },

  // --- north wall: the working wall -----------------------------------------
  // The observation wall, 6 tiles of it, sitting where the desk looks at it.
  { x: 3, y: 0, w: 6, h: 1, type: "window", note: "星空观测墙（曲面显示墙）" },

  // Equipment panels and a lit status screen on the rest of the north wall.
  { x: 10, y: 0, w: 2, h: 1, type: "wall_dark", note: "舱壁设备面板" },
  { x: 13, y: 0, w: 2, h: 1, type: "wall_dark", note: "舱壁设备面板" },

  // --- west wall: bedroom end ------------------------------------------------
  { x: 0, y: 9, w: 1, h: 1, type: "window", note: "卧室的小型模拟舷窗" },
  { x: 0, y: 12, w: 1, h: 1, type: "wall_dark", note: "环境控制单元" },

  // --- east wall -------------------------------------------------------------
  { x: ROOM_COLUMNS - 1, y: 3, w: 1, h: 1, type: "wall_dark", note: "阅读区旁的检修面板" },

  // --- floor detail ----------------------------------------------------------
  // Rugs under the two social areas. Applied BEFORE the guide lights, so the
  // light strip stays visible running across the reception rug.
  { x: 7, y: 6, w: 6, h: 5, type: "deck_rug", note: "会客区地毯" },
  { x: 17, y: 11, w: 4, h: 3, type: "deck_rug", note: "阅读区地毯" },

  // Guide lighting running up the middle of the room, the way a ship's deck
  // would actually be marked. Laid last on purpose: see above.
  { x: 12, y: 4, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 6, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 8, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 10, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 12, w: 1, h: 1, type: "floor_light", note: "地面导引灯" },
  { x: 12, y: 14, w: 1, h: 1, type: "floor_light", note: "地面导引灯" }
];

function buildGrid(): TileType[] {
  const grid: TileType[] = new Array(ROOM_COLUMNS * ROOM_ROWS).fill("deck");

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= ROOM_COLUMNS || y >= ROOM_ROWS) {
          throw new Error(`Shape "${shape.note}" runs outside the room at (${x}, ${y})`);
        }
        grid[y * ROOM_COLUMNS + x] = shape.type;
      }
    }
  }

  return grid;
}

export function createCaptainRoomMap(tileSize: number): TileMap {
  return new TileMap(buildGrid(), ROOM_COLUMNS, ROOM_ROWS, tileSize);
}

/** Exposed so tests and tooling can reason about the authored layout. */
export const ROOM_SHAPES: readonly Shape[] = SHAPES;
