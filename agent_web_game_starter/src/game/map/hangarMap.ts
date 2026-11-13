import { TileMap, type TileType } from "./TileMap";

/**
 * EVA Airlock & Shuttle Hangar Bay (穿梭机机库备勤与舱外工程整备舱)
 *
 * Located along the central spine (1850-2250m), separated cleanly into:
 *   - West Launch & Magnetic Clamp Berth (cols 1..13): depressed industrial pad with exterior vacuum viewports on x=0
 *   - Central Boarding Ramp & Spine (cols 14..18): crane framing + clear vertical spine
 *   - East Enclosed EVA Airlock & Suit Prep Room (cols 19..30): walled airlock room with dressing pad & high-pressure lockers
 */

export const HANGAR_COLUMNS = 32;
export const HANGAR_ROWS = 18;

export const HANGAR_NORTH_DOOR = { x: 14, y: 0, w: 4, h: 1 };
export const HANGAR_SOUTH_DOOR = { x: 14, y: HANGAR_ROWS - 1, w: 4, h: 1 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // Outer bulkheads
  { x: 0, y: 0, w: HANGAR_COLUMNS, h: 1, type: "wall", note: "北向气密隔离壁" },
  { x: 0, y: HANGAR_ROWS - 1, w: HANGAR_COLUMNS, h: 1, type: "wall", note: "南向反应堆前置隔离壁" },
  { x: 0, y: 0, w: 1, h: HANGAR_ROWS, type: "wall_dark", note: "西向机库外舷重型气压闸" },
  { x: HANGAR_COLUMNS - 1, y: 0, w: 1, h: HANGAR_ROWS, type: "wall", note: "东向整备气闸外壁" },

  // Exterior vacuum bay windows properly set INTO West outer bulkhead (x=0), never floating in floor!
  { x: 0, y: 3, w: 1, h: 4, type: "window", note: "西向深空穿梭机外停靠观测窗" },
  { x: 0, y: 11, w: 1, h: 4, type: "window", note: "西向外舷机械抓臂观测窗" },

  // Doorway openings
  { x: HANGAR_NORTH_DOOR.x, y: HANGAR_NORTH_DOOR.y, w: HANGAR_NORTH_DOOR.w, h: HANGAR_NORTH_DOOR.h, type: "floor_light", note: "北侧通往医疗区重闸" },
  { x: HANGAR_SOUTH_DOOR.x, y: HANGAR_SOUTH_DOOR.y, w: HANGAR_SOUTH_DOOR.w, h: HANGAR_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往动力排险区闸门" },

  // West side: Pioneer-1 Shuttle Magnetic Clamp Berth (x 1..13)
  { x: 1, y: 1, w: 12, h: 16, type: "deck_dark", note: "穿梭机磁吸发射甲板" },
  { x: 13, y: 1, w: 1, h: 4, type: "wall_dark", note: "发射区北侧龙门架限位立柱" },
  { x: 13, y: 13, w: 1, h: 4, type: "wall_dark", note: "发射区南侧龙门架限位立柱" },
  { x: 12, y: 5, w: 1, h: 8, type: "floor_light", note: "登艇栈桥安全边界警示线" },
  { x: 2, y: 8, w: 10, h: 2, type: "floor_light", note: "穿梭机磁导滑轨中心线" },

  // East side: Enclosed Pressurized EVA Dressing Airlock Room (x 19..30)
  { x: 19, y: 1, w: 1, h: 16, type: "wall", note: "东向 EVA 更衣气闸室气密隔墙" },
  { x: 19, y: 7, w: 1, h: 4, type: "floor_light", note: "更衣气闸双开气密门" },
  { x: 20, y: 1, w: 11, h: 16, type: "deck_dark", note: "加压整备间洁净防静电地坪" },
  { x: 22, y: 4, w: 5, h: 9, type: "deck_rug", note: "防滑换装站立工作垫" },
  { x: 29, y: 2, w: 2, h: 5, type: "wall_dark", note: "重型陶瓷防热服锁定挂架柜" },
  { x: 29, y: 10, w: 2, h: 5, type: "wall_dark", note: "高压呼吸氧气与充气汇流排" },
  { x: 23, y: 0, w: 3, h: 1, type: "screen", note: "机库气压与大气压差监视屏" },

  // Central spinal catwalk guide lights
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 5, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 14, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" }
];

export function hangarGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < HANGAR_ROWS; y++) {
    grid.push(new Array<TileType>(HANGAR_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= HANGAR_COLUMNS || y >= HANGAR_ROWS) {
          throw new Error(`Hangar shape "${shape.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  return grid;
}

export function createHangarMap(tileSize: number): TileMap {
  return new TileMap(hangarGrid().flat(), HANGAR_COLUMNS, HANGAR_ROWS, tileSize);
}
