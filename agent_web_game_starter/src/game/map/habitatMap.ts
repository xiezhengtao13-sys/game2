import { TileMap, type TileType } from "./TileMap";

/**
 * Crew Habitat & Mess Hall (船员生活区与公共综合舱)
 *
 * In docs/设定集.md:
 *   - "主要材料与色彩：浅木色、米白色、绿色植物，温暖、舒适"
 *   - "船员宿舍、公共餐饮区、公共植物区、小型生活服务中心"
 *   - "生活模块采用更接近普通建筑的楼层高度... 让人仅仅通过画面就判断自己位于远望号的哪个部分"
 *
 * Real-world architectural zoning (32 x 23 tiles, 1.8m/tile):
 *   - NW Block (x 1..12, y 1..9)   : Enclosed Dormitory Suite A (2 partitioned bunk cubicles + lockers)
 *   - SW Block (x 1..12, y 13..21) : Enclosed Dormitory Suite B (2 partitioned bunk cubicles + lockers)
 *   - Center Spine (x 13..18)      : Shift Concourse, Duty Notice Desk & North/South Airlocks
 *   - NE Block (x 19..30, y 1..9)  : Enclosed Crew Mess Hall & Automated Galley Serving Counter
 *   - SE West (x 19..25, y 13..21) : Enclosed Crew Lounge, Pinboard & Hydroponic Greenery Alcove
 *   - SE East (x 26..30, y 13..21) : Partitioned Wet-Zone Water Recycling & Filtration Utility Room
 */

export const HABITAT_COLUMNS = 32;
export const HABITAT_ROWS = 23;

export const HABITAT_NORTH_DOOR = { x: 14, y: 0, w: 4, h: 1 };
export const HABITAT_SOUTH_DOOR = { x: 14, y: HABITAT_ROWS - 1, w: 4, h: 1 };
export const HABITAT_WEST_DOOR = { x: 0, y: 10, w: 1, h: 3 };
export const HABITAT_EAST_DOOR = { x: HABITAT_COLUMNS - 1, y: 10, w: 1, h: 3 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // Outer structural bulkheads
  { x: 0, y: 0, w: HABITAT_COLUMNS, h: 1, type: "wall", note: "北向生活区主舱壁" },
  { x: 0, y: HABITAT_ROWS - 1, w: HABITAT_COLUMNS, h: 1, type: "wall", note: "南向通往医疗区舱壁" },
  { x: 0, y: 0, w: 1, h: HABITAT_ROWS, type: "wall", note: "西向 L-2 接口舱壁" },
  { x: HABITAT_COLUMNS - 1, y: 0, w: 1, h: HABITAT_ROWS, type: "wall", note: "东向 R-2 接口舱壁" },

  // Mess hall exterior windows on North outer wall (overlooking midship truss & space)
  { x: 22, y: 0, w: 4, h: 1, type: "window", note: "餐厅北向深空采光观测窗" },

  // Main exterior doorways
  { x: HABITAT_NORTH_DOOR.x, y: HABITAT_NORTH_DOOR.y, w: HABITAT_NORTH_DOOR.w, h: HABITAT_NORTH_DOOR.h, type: "floor_light", note: "北侧中层通道气闸" },
  { x: HABITAT_SOUTH_DOOR.x, y: HABITAT_SOUTH_DOOR.y, w: HABITAT_SOUTH_DOOR.w, h: HABITAT_SOUTH_DOOR.h, type: "floor_light", note: "南侧医疗通道气闸" },
  { x: HABITAT_WEST_DOOR.x, y: HABITAT_WEST_DOOR.y, w: HABITAT_WEST_DOOR.w, h: HABITAT_WEST_DOOR.h, type: "floor_light", note: "西侧通往 L-2 车间气闸" },
  { x: HABITAT_EAST_DOOR.x, y: HABITAT_EAST_DOOR.y, w: HABITAT_EAST_DOOR.w, h: HABITAT_EAST_DOOR.h, type: "floor_light", note: "东侧通往 R-2 实验舱气闸" },

  // --- Enclosed NW Dormitory Wing (x 1..12, y 1..9) ---------------------------
  { x: 12, y: 1, w: 1, h: 9, type: "wall", note: "北宿舍区东侧隔墙" },
  { x: 1, y: 9, w: 12, h: 1, type: "wall", note: "北宿舍区走廊隔墙" },
  { x: 9, y: 9, w: 2, h: 1, type: "floor_light", note: "北宿舍房门（衔接生活区起点走廊）" },
  { x: 6, y: 1, w: 1, h: 5, type: "wall", note: "A1/A2 船员寝室隔音隔断" },
  // Tidy fitted carpets directly under bunk berths (proportioned to 1.8m/tile furniture)
  { x: 2, y: 2, w: 3, h: 3, type: "deck_rug", note: "A1 铺位保暖地垫" },
  { x: 8, y: 2, w: 3, h: 3, type: "deck_rug", note: "A2 铺位保暖地垫" },
  // Flush wall wardrobes (recessed against perimeter walls, never floating!)
  { x: 1, y: 2, w: 1, h: 3, type: "wall_dark", note: "A1 嵌入式个人储物柜" },
  { x: 11, y: 2, w: 1, h: 3, type: "wall_dark", note: "A2 嵌入式个人储物柜" },

  // --- Enclosed SW Dormitory Wing (x 1..12, y 13..21) -------------------------
  { x: 12, y: 13, w: 1, h: 9, type: "wall", note: "南宿舍区东侧隔墙" },
  { x: 1, y: 13, w: 12, h: 1, type: "wall", note: "南宿舍区走廊隔墙" },
  { x: 9, y: 13, w: 2, h: 1, type: "floor_light", note: "南宿舍房门" },
  { x: 6, y: 17, w: 1, h: 5, type: "wall", note: "B1/B2 船员寝室隔音隔断" },
  { x: 2, y: 17, w: 3, h: 3, type: "deck_rug", note: "B1 铺位保暖地垫" },
  { x: 8, y: 17, w: 3, h: 3, type: "deck_rug", note: "B2 铺位保暖地垫" },
  { x: 1, y: 18, w: 1, h: 3, type: "wall_dark", note: "B1 嵌入式个人储物柜" },
  { x: 11, y: 18, w: 1, h: 3, type: "wall_dark", note: "B2 嵌入式个人储物柜" },

  // --- Enclosed NE Mess Hall & Automated Galley (x 19..30, y 1..9) ------------
  { x: 19, y: 1, w: 1, h: 9, type: "wall", note: "食堂西侧隔墙" },
  { x: 19, y: 9, w: 12, h: 1, type: "wall", note: "食堂南侧走廊隔墙" },
  { x: 19, y: 4, w: 1, h: 2, type: "floor_light", note: "食堂大厅西门" },
  { x: 22, y: 9, w: 3, h: 1, type: "floor_light", note: "食堂南向双开门" },
  { x: 21, y: 3, w: 5, h: 4, type: "deck_rug", note: "公共餐饮区防滑暖色餐垫" },
  { x: 28, y: 1, w: 3, h: 8, type: "deck_dark", note: "自动化营养配餐厨房工作区防滑地砖" },
  { x: 30, y: 2, w: 1, h: 5, type: "wall_dark", note: "自动热食配餐机与餐盘回收柜" },

  // --- Enclosed SE Lounge & Wet Water-Recycling Utility (x 19..30, y 13..21) --
  { x: 19, y: 13, w: 1, h: 9, type: "wall", note: "休闲室西侧隔墙" },
  { x: 19, y: 13, w: 12, h: 1, type: "wall", note: "休闲与水循环区走廊隔墙" },
  { x: 21, y: 13, w: 3, h: 1, type: "floor_light", note: "公共休闲阅读室门" },
  // Living Lounge warm alcove
  { x: 20, y: 16, w: 5, h: 4, type: "deck_rug", note: "绿化休息角暖色地毯" },
  // Partition wall isolating Wet Water-Recycling Utility Room (x 26..30)
  { x: 26, y: 14, w: 1, h: 8, type: "wall", note: "水净化工程机房防水隔墙" },
  { x: 26, y: 16, w: 1, h: 2, type: "floor_light", note: "水净化间检修门" },
  { x: 27, y: 14, w: 4, h: 8, type: "deck_dark", note: "湿区防滑漏水格栅地坪（非地毯）" },
  { x: 29, y: 17, w: 2, h: 4, type: "wall_dark", note: "二级水净化高压过滤机组" },

  // --- Main Arterial Concourse Guide Lights (unobstructed y 10..12 & x 14..17)
  { x: 2, y: 11, w: 11, h: 1, type: "floor_light", note: "西向 L-2 车间通道导引灯" },
  { x: 19, y: 11, w: 11, h: 1, type: "floor_light", note: "东向 R-2 实验舱通道导引灯" },
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" },
  { x: 15, y: 5, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "十字大厅中心地灯" },
  { x: 15, y: 14, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" },
  { x: 15, y: 17, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" },
  { x: 15, y: 20, w: 2, h: 1, type: "floor_light", note: "中轴大厅地灯" }
];

export function habitatGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < HABITAT_ROWS; y++) {
    grid.push(new Array<TileType>(HABITAT_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= HABITAT_COLUMNS || y >= HABITAT_ROWS) {
          throw new Error(`Habitat shape "${shape.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  return grid;
}

export function createHabitatMap(tileSize: number): TileMap {
  return new TileMap(habitatGrid().flat(), HABITAT_COLUMNS, HABITAT_ROWS, tileSize);
}
