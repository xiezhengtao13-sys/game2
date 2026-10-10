import { TileMap, type TileType } from "./TileMap";

/**
 * EVA Airlock & Shuttle Hangar Bay (穿梭机机库备勤与舱外工程整备舱)
 *
 * Located along the central spine (rows 70..87).
 * In docs/设定集.md:
 *   - "外部停靠平台与装卸区由密封机库、外部停靠平台、机械臂和人员转运通道组成"
 *   - "小型飞船通过标准化接口与远望号连接"
 *   - "设有小型维修气闸，供维修机器人和舱外工程人员使用"
 *
 * Dual narrative role:
 *   1. Chapter 1 Crisis: Crew dons heavy thermal engineering EVA suits here to survive the reactor heat-sink bay.
 *   2. Chapter 2+ Exploration: Docking berth for the planetary surface landing shuttle.
 *
 * Dimensions: 32 columns x 18 rows.
 * Scale: 1 tile = 1.8 m (57.6 m x 32.4 m = ~1,866 m2).
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
  { x: 0, y: HANGAR_ROWS - 1, w: HANGAR_COLUMNS, h: 1, type: "wall", note: "南向通往生活区舱壁" },
  { x: 0, y: 0, w: 1, h: HANGAR_ROWS, type: "wall_dark", note: "西向机库重型外闸壁" },
  { x: HANGAR_COLUMNS - 1, y: 0, w: 1, h: HANGAR_ROWS, type: "wall", note: "东向备勤储物壁" },

  // Doorway openings
  { x: HANGAR_NORTH_DOOR.x, y: HANGAR_NORTH_DOOR.y, w: HANGAR_NORTH_DOOR.w, h: HANGAR_NORTH_DOOR.h, type: "floor_light", note: "北侧主入口导引地灯" },
  { x: HANGAR_SOUTH_DOOR.x, y: HANGAR_SOUTH_DOOR.y, w: HANGAR_SOUTH_DOOR.w, h: HANGAR_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往生活区导引地灯" },

  // Central runway guide lights
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 5, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },
  { x: 15, y: 14, w: 2, h: 1, type: "floor_light", note: "机库中轴导引灯" },

  // West side: Planetary Surface Shuttle Docking Berth (穿梭机泊位)
  { x: 2, y: 2, w: 11, h: 14, type: "deck_dark", note: "穿梭机磁吸停泊甲板" },
  { x: 2, y: 2, w: 1, h: 14, type: "window", note: "机库外层真空观测视窗" },
  { x: 12, y: 3, w: 1, h: 12, type: "floor_light", note: "停机坪黄黑登机警示线" },

  // East side: EVA Suit Rack & Pre-Flight Dressing Quarter (舱外工程整备区)
  { x: 19, y: 2, w: 11, h: 14, type: "deck_rug", note: "防静电更衣换装防滑地毯" },
  { x: 28, y: 3, w: 3, h: 5, type: "wall_dark", note: "重型防热工程服固定气锁柜" },
  { x: 28, y: 10, w: 3, h: 5, type: "wall_dark", note: "高压氧气与便携气瓶充能站" }
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
