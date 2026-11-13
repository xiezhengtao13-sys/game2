import { TileMap, type TileType } from "./TileMap";

/**
 * Central Transit Hub (中央交通站 / 前部交通枢纽)
 *
 * Sits directly aft of the command section (300-950m mark of the Yuanwang).
 * In docs/设定集.md:
 *   - "每隔一定距离设置一个大型交通节点，与各殖民模块通过密封连接廊桥相连。"
 *   - "人员交通干线布置在中央区域"
 *   - "拥有换乘轨道、重力换区指示标、工程检修通道、气闸门、生活区导引牌"
 *
 * Dimensions: 34 columns x 24 rows.
 * Scale: 1 tile = 1 person height = 1.8m (61.2m x 43.2m = ~2,640 m2).
 */

export const TRANSIT_COLUMNS = 34;
export const TRANSIT_ROWS = 24;

export const TRANSIT_NORTH_DOOR = { x: 15, y: 0, w: 4, h: 1 };
export const TRANSIT_SOUTH_DOOR = { x: 15, y: TRANSIT_ROWS - 1, w: 4, h: 1 };
export const TRANSIT_WEST_GATE = { x: 0, y: 11, w: 1, h: 3 }; // Gate to L-1
export const TRANSIT_EAST_GATE = { x: TRANSIT_COLUMNS - 1, y: 11, w: 1, h: 3 }; // Gate to R-1

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // Outer perimeter bulkheads
  { x: 0, y: 0, w: TRANSIT_COLUMNS, h: 1, type: "wall", note: "北向舱壁" },
  { x: 0, y: TRANSIT_ROWS - 1, w: TRANSIT_COLUMNS, h: 1, type: "wall", note: "南向舱壁" },
  { x: 0, y: 0, w: 1, h: TRANSIT_ROWS, type: "wall", note: "西向舱壁" },
  { x: TRANSIT_COLUMNS - 1, y: 0, w: 1, h: TRANSIT_ROWS, type: "wall", note: "东向舱壁" },

  // Doorway openings
  { x: TRANSIT_NORTH_DOOR.x, y: TRANSIT_NORTH_DOOR.y, w: TRANSIT_NORTH_DOOR.w, h: TRANSIT_NORTH_DOOR.h, type: "floor_light", note: "北侧主入口" },
  { x: TRANSIT_SOUTH_DOOR.x, y: TRANSIT_SOUTH_DOOR.y, w: TRANSIT_SOUTH_DOOR.w, h: TRANSIT_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往生活区入口" },
  { x: TRANSIT_WEST_GATE.x, y: TRANSIT_WEST_GATE.y, w: TRANSIT_WEST_GATE.w, h: TRANSIT_WEST_GATE.h, type: "floor_light", note: "西侧气闸连廊（通往 L-1 农业生态模块）" },
  { x: TRANSIT_EAST_GATE.x, y: TRANSIT_EAST_GATE.y, w: TRANSIT_EAST_GATE.w, h: TRANSIT_EAST_GATE.h, type: "floor_light", note: "东侧气闸连廊（通往 R-1 旋转生活环大厅）" },

  // Observation slits / windows along north wall
  { x: 4, y: 0, w: 3, h: 1, type: "window", note: "站台外部采光观测视窗" },
  { x: 27, y: 0, w: 3, h: 1, type: "window", note: "站台外部采光观测视窗" },

  // Maglev rail track zone in rows 11..13 (across the hall)
  { x: 1, y: 11, w: TRANSIT_COLUMNS - 2, h: 3, type: "deck_dark", note: "中央穿梭轨道运行区" },
  // Safe passenger level-crossing in columns 15..18
  { x: 15, y: 11, w: 4, h: 3, type: "floor_light", note: "站台中央安全人行平交道" },

  // Platform guide lighting lines
  { x: 16, y: 1, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 3, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 5, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 7, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 9, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },

  { x: 16, y: 15, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 16, y: 17, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 16, y: 19, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 16, y: 21, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },

  // Lateral wings guide lights to gates
  { x: 2, y: 12, w: 12, h: 1, type: "floor_light", note: "西向登乘通道导引灯" },
  { x: 20, y: 12, w: 12, h: 1, type: "floor_light", note: "东向登乘通道导引灯" },

  // North waiting area rug
  { x: 5, y: 3, w: 7, h: 5, type: "deck_rug", note: "北站台候车休息地毯" },
  { x: 22, y: 3, w: 7, h: 5, type: "deck_rug", note: "调度与值班综合地毯" },

  // South checkpoint safety perimeter
  { x: 6, y: 16, w: 6, h: 5, type: "deck_rug", note: "勤务换装与检修区地毯" },
  { x: 22, y: 16, w: 6, h: 5, type: "deck_rug", note: "应急物资保障区地毯" }
];

export function transitHubGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < TRANSIT_ROWS; y++) {
    grid.push(new Array<TileType>(TRANSIT_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= TRANSIT_COLUMNS || y >= TRANSIT_ROWS) {
          throw new Error(`Transit shape "${shape.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  return grid;
}

export function createTransitHubMap(tileSize: number): TileMap {
  return new TileMap(transitHubGrid().flat(), TRANSIT_COLUMNS, TRANSIT_ROWS, tileSize);
}
