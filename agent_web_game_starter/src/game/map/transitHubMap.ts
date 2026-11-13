import { TileMap, type TileType } from "./TileMap";

/**
 * Central Transit Hub (中央交通站 / 前部交通枢纽, 550-1050m)
 *
 * Designed as an authentic massive orbital rail station:
 *   - Depressed maglev rail pit (rows 11..13) with safe central pedestrian level crossing (cols 15..18)
 *   - Enclosed East & West Airlock Boarding Vestibules for L-1 & R-1 bridge gangways
 *   - Enclosed NE Dispatch Kiosk Office + NW Bench Waiting Area + South Checkpoint
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

  // Main exterior doorways
  { x: TRANSIT_NORTH_DOOR.x, y: TRANSIT_NORTH_DOOR.y, w: TRANSIT_NORTH_DOOR.w, h: TRANSIT_NORTH_DOOR.h, type: "floor_light", note: "北侧通往舰桥指挥防暴门" },
  { x: TRANSIT_SOUTH_DOOR.x, y: TRANSIT_SOUTH_DOOR.y, w: TRANSIT_SOUTH_DOOR.w, h: TRANSIT_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往船员生活区入口" },
  { x: TRANSIT_WEST_GATE.x, y: TRANSIT_WEST_GATE.y, w: TRANSIT_WEST_GATE.w, h: TRANSIT_WEST_GATE.h, type: "floor_light", note: "西侧气闸连廊（通往 L-1 农业生态模块）" },
  { x: TRANSIT_EAST_GATE.x, y: TRANSIT_EAST_GATE.y, w: TRANSIT_EAST_GATE.w, h: TRANSIT_EAST_GATE.h, type: "floor_light", note: "东侧气闸连廊（通往 R-1 旋转生活环大厅）" },

  // Observation slits looking north onto exterior structural trusses & deep space
  { x: 5, y: 0, w: 4, h: 1, type: "window", note: "站台北侧桁架深空视窗" },
  { x: 27, y: 0, w: 2, h: 1, type: "window", note: "站台北侧生活环深空视窗" },

  // Depressed maglev cross-track channel + pedestrian crossing bridge
  { x: 1, y: 11, w: TRANSIT_COLUMNS - 2, h: 3, type: "deck_dark", note: "中央磁悬浮穿梭轨道槽" },
  { x: 15, y: 11, w: 4, h: 3, type: "floor_light", note: "站台中央平交人行通道" },

  // West & East Pressurized Bridge Airlock Frame Walls
  { x: 3, y: 1, w: 1, h: 9, type: "wall", note: "西站台候车与气压过渡隔墙" },
  { x: 3, y: 15, w: 1, h: 8, type: "wall", note: "西站台检修间气密隔墙" },
  { x: 30, y: 1, w: 1, h: 9, type: "wall", note: "东站台气压过渡隔墙" },
  { x: 30, y: 15, w: 1, h: 8, type: "wall", note: "东站台检修间气密隔墙" },

  // Enclosed NE Dispatch Control Booth (x 20..29, y 1..8) with entrance gap
  { x: 20, y: 1, w: 1, h: 7, type: "wall", note: "调度值班台西隔墙" },
  { x: 20, y: 8, w: 10, h: 1, type: "wall", note: "调度值班台前窗台墙" },
  { x: 22, y: 8, w: 2, h: 1, type: "floor_light", note: "调度台入口" },
  { x: 21, y: 2, w: 8, h: 5, type: "deck_dark", note: "调度室内防静电地坪" },
  { x: 24, y: 0, w: 3, h: 1, type: "screen", note: "全舰拓扑图大屏" },

  // Compact Northwest bench platform pad & South locker check-in pads
  { x: 6, y: 3, w: 5, h: 3, type: "deck_rug", note: "北站台旅客候车地垫" },
  { x: 6, y: 16, w: 6, h: 4, type: "deck_dark", note: "勤务检修与接触网配电区" },
  { x: 22, y: 16, w: 6, h: 4, type: "deck_dark", note: "应急备品登记区" },

  // Concourse guide lights
  { x: 16, y: 2, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 5, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 8, w: 2, h: 1, type: "floor_light", note: "北站台主导引灯" },
  { x: 16, y: 15, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 16, y: 18, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 16, y: 21, w: 2, h: 1, type: "floor_light", note: "南站台主导引灯" },
  { x: 2, y: 12, w: 12, h: 1, type: "floor_light", note: "西向廊桥登乘导引线" },
  { x: 20, y: 12, w: 12, h: 1, type: "floor_light", note: "东向廊桥登乘导引线" }
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
