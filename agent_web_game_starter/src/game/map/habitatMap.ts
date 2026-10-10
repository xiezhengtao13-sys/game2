import { TileMap, type TileType } from "./TileMap";

/**
 * Crew Habitat & Mess Hall (船员生活区与公共综合舱)
 *
 * In docs/设定集.md:
 *   - "主要材料与色彩：浅木色、米白色、绿色植物，温暖、舒适"
 *   - "船员宿舍、公共餐饮区、公共植物区、小型生活服务中心"
 *   - "让人仅仅通过画面就判断自己位于远望号的哪个部分"
 *
 * Dimensions: 32 columns x 23 rows.
 * Scale: 1 tile = 1 person height = 1.8m (57.6m x 41.4m = ~2,380 m2).
 */

export const HABITAT_COLUMNS = 32;
export const HABITAT_ROWS = 23;

export const HABITAT_NORTH_DOOR = { x: 14, y: 0, w: 4, h: 1 };
export const HABITAT_SOUTH_DOOR = { x: 14, y: HABITAT_ROWS - 1, w: 4, h: 1 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // Bulkhead perimeter
  { x: 0, y: 0, w: HABITAT_COLUMNS, h: 1, type: "wall", note: "北向生活区主舱壁" },
  { x: 0, y: HABITAT_ROWS - 1, w: HABITAT_COLUMNS, h: 1, type: "wall", note: "南向通往医疗区舱壁" },
  { x: 0, y: 0, w: 1, h: HABITAT_ROWS, type: "wall", note: "西向居住区舱壁" },
  { x: HABITAT_COLUMNS - 1, y: 0, w: 1, h: HABITAT_ROWS, type: "wall", note: "东向配餐区舱壁" },

  // Doorway openings
  { x: HABITAT_NORTH_DOOR.x, y: HABITAT_NORTH_DOOR.y, w: HABITAT_NORTH_DOOR.w, h: HABITAT_NORTH_DOOR.h, type: "floor_light", note: "北侧主入口导引地灯" },
  { x: HABITAT_SOUTH_DOOR.x, y: HABITAT_SOUTH_DOOR.y, w: HABITAT_SOUTH_DOOR.w, h: HABITAT_SOUTH_DOOR.h, type: "floor_light", note: "南侧主入口导引地灯" },

  // Central corridor spine
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 5, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 14, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 17, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },
  { x: 15, y: 20, w: 2, h: 1, type: "floor_light", note: "中轴步道导引灯" },

  // West side: Crew Living Bunks area (warm quiet carpets)
  { x: 2, y: 2, w: 11, h: 8, type: "deck_rug", note: "一班/二班船员起居区地毯" },
  { x: 2, y: 12, w: 11, h: 8, type: "deck_rug", note: "三班/四班船员起居区地毯" },

  // Partition bulkheads separating bunk cubicles
  { x: 7, y: 2, w: 1, h: 4, type: "wall_dark", note: "起居隔音隔断" },
  { x: 7, y: 14, w: 1, h: 4, type: "wall_dark", note: "起居隔音隔断" },

  // East side: Mess Hall, Dining & Hydroponic Lounge
  { x: 19, y: 2, w: 11, h: 8, type: "deck_rug", note: "公共配餐与就餐区地毯" },
  { x: 19, y: 12, w: 11, h: 8, type: "deck_rug", note: "生态绿植与船员休闲区地毯" },

  // Mess hall service counters
  { x: 29, y: 3, w: 2, h: 6, type: "wall_dark", note: "自动化营养配餐柜与餐具台" },
  { x: 29, y: 13, w: 2, h: 6, type: "wall_dark", note: "水循环净化阀组" }
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
