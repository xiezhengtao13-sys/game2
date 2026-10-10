import { TileMap, type TileType } from "./TileMap";

/**
 * Central Medical & Cryo-Stasis Bay (中央医疗与休眠监视舱)
 *
 * In docs/设定集.md:
 *   - "12,408 人的休眠系统……休眠舱多层排列，安装在大型结构框架中"
 *   - "每个休眠区域都有独立的环境维持设备、生命体征监测系统和应急维护通道"
 *   - "中央医疗中心负责舰船级紧急救治，外观相对朴素：大量容易清洁的浅色材料"
 *
 * Dimensions: 30 columns x 22 rows.
 * Scale: 1 tile = 1 person height = 1.8m (54.0m x 39.6m = ~2,138 m2).
 */

export const MEDICAL_COLUMNS = 30;
export const MEDICAL_ROWS = 22;

export const MEDICAL_NORTH_DOOR = { x: 13, y: 0, w: 4, h: 1 };
export const MEDICAL_SOUTH_DOOR = { x: 13, y: MEDICAL_ROWS - 1, w: 4, h: 1 };

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
  { x: 0, y: 0, w: MEDICAL_COLUMNS, h: 1, type: "wall", note: "北向气密隔离壁" },
  { x: 0, y: MEDICAL_ROWS - 1, w: MEDICAL_COLUMNS, h: 1, type: "wall", note: "南向重工业隔离壁" },
  { x: 0, y: 0, w: 1, h: MEDICAL_ROWS, type: "wall", note: "西向耐压舱壁" },
  { x: MEDICAL_COLUMNS - 1, y: 0, w: 1, h: MEDICAL_ROWS, type: "wall", note: "东向耐压舱壁" },

  // Doorways
  { x: MEDICAL_NORTH_DOOR.x, y: MEDICAL_NORTH_DOOR.y, w: MEDICAL_NORTH_DOOR.w, h: MEDICAL_NORTH_DOOR.h, type: "floor_light", note: "北侧医疗入口导引地灯" },
  { x: MEDICAL_SOUTH_DOOR.x, y: MEDICAL_SOUTH_DOOR.y, w: MEDICAL_SOUTH_DOOR.w, h: MEDICAL_SOUTH_DOOR.h, type: "floor_light", note: "南侧工业重压闸门入口" },

  // Central corridor lighting runner
  { x: 14, y: 2, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 5, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 8, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 11, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 14, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 17, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },
  { x: 14, y: 19, w: 2, h: 1, type: "floor_light", note: "医疗区中轴导引灯" },

  // West Flank: Cryo-Stasis Array Alpha (多层冷冻休眠监视阵列甲组)
  { x: 2, y: 2, w: 8, h: 8, type: "deck_dark", note: "第一休眠监视基座" },
  { x: 2, y: 12, w: 8, h: 8, type: "deck_dark", note: "第二休眠监视基座" },
  { x: 2, y: 2, w: 8, h: 1, type: "wall_dark", note: "休眠冷凝管线机架" },
  { x: 2, y: 12, w: 8, h: 1, type: "wall_dark", note: "休眠冷凝管线机架" },

  // East Flank: Cryo-Stasis Array Beta (多层冷冻休眠监视阵列乙组)
  { x: 20, y: 2, w: 8, h: 8, type: "deck_dark", note: "第三休眠监视基座" },
  { x: 20, y: 12, w: 8, h: 8, type: "deck_dark", note: "第四休眠监视基座" },
  { x: 20, y: 2, w: 8, h: 1, type: "wall_dark", note: "休眠冷凝管线机架" },
  { x: 20, y: 12, w: 8, h: 1, type: "wall_dark", note: "休眠冷凝管线机架" },

  // Center: Emergency Medical & Resuscitation Bay (中央急救与生理唤醒平台)
  { x: 11, y: 7, w: 8, h: 7, type: "deck_rug", note: "急救诊疗与监护区防滑地毯" },

  // Wall equipment monitors
  { x: 0, y: 6, w: 1, h: 3, type: "screen", note: "西舷休眠生命维持状态屏" },
  { x: MEDICAL_COLUMNS - 1, y: 6, w: 1, h: 3, type: "screen", note: "东舷休眠生命维持状态屏" }
];

export function medicalGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < MEDICAL_ROWS; y++) {
    grid.push(new Array<TileType>(MEDICAL_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= MEDICAL_COLUMNS || y >= MEDICAL_ROWS) {
          throw new Error(`Medical shape "${shape.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  return grid;
}

export function createMedicalMap(tileSize: number): TileMap {
  return new TileMap(medicalGrid().flat(), MEDICAL_COLUMNS, MEDICAL_ROWS, tileSize);
}
