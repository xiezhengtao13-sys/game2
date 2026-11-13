import { TileMap, type TileType } from "./TileMap";

/**
 * Central Medical & Cryo-Stasis Bay (中央医疗与休眠监视舱)
 *
 * Strictly follows docs/设定集.md:
 *   - "12,408 人的休眠系统不是一个巨大的房间——所有休眠舱按模块分散布置，
 *     每个休眠区域都有独立的环境维持设备、生命体征监测系统和应急维护通道"
 *   - "中央医疗中心外观相对朴素：大量容易清洁的浅色材料，高度标准化的医疗接口"
 *
 * Modular clinical partitions (30 x 22):
 *   - West Vaults Alpha (y 1..10) & Beta (y 12..20) behind wall x=10 (separate doors & divider y=11)
 *   - Center Sterile Medical Triage & Nursing Core (x 11..18)
 *   - East Vaults Gamma (y 1..10) & Delta (y 12..20) behind wall x=19 (separate doors & divider y=11)
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
  { x: 0, y: 0, w: MEDICAL_COLUMNS, h: 1, type: "wall", note: "北向医疗区气密壁" },
  { x: 0, y: MEDICAL_ROWS - 1, w: MEDICAL_COLUMNS, h: 1, type: "wall", note: "南向后部机库重型隔离壁" },
  { x: 0, y: 0, w: 1, h: MEDICAL_ROWS, type: "wall", note: "西向低温隔热壁" },
  { x: MEDICAL_COLUMNS - 1, y: 0, w: 1, h: MEDICAL_ROWS, type: "wall", note: "东向低温隔热壁" },

  // Doorways
  { x: MEDICAL_NORTH_DOOR.x, y: MEDICAL_NORTH_DOOR.y, w: MEDICAL_NORTH_DOOR.w, h: MEDICAL_NORTH_DOOR.h, type: "floor_light", note: "北侧通往生活区入口" },
  { x: MEDICAL_SOUTH_DOOR.x, y: MEDICAL_SOUTH_DOOR.y, w: MEDICAL_SOUTH_DOOR.w, h: MEDICAL_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往机库重水密闸" },

  // Distributed Cryo-Stasis Isolation Partition Walls (4 independent Cryo Vaults!)
  { x: 10, y: 1, w: 1, h: 20, type: "wall", note: "西侧休眠分仓气密隔墙" },
  { x: 19, y: 1, w: 1, h: 20, type: "wall", note: "东侧休眠分仓气密隔墙" },
  { x: 1, y: 11, w: 10, h: 1, type: "wall", note: "西甲/乙休眠仓独立环境隔离壁" },
  { x: 19, y: 11, w: 10, h: 1, type: "wall", note: "东丙/丁休眠仓独立环境隔离壁" },

  // Pressurized maintenance doors into each of the 4 modular Cryo Vaults
  { x: 10, y: 5, w: 1, h: 2, type: "floor_light", note: "休眠第 1 分仓检修门" },
  { x: 10, y: 15, w: 1, h: 2, type: "floor_light", note: "休眠第 2 分仓检修门" },
  { x: 19, y: 5, w: 1, h: 2, type: "floor_light", note: "休眠第 3 分仓检修门" },
  { x: 19, y: 15, w: 1, h: 2, type: "floor_light", note: "休眠第 4 分仓检修门" },

  // Cold Cryo-Vault floor decks & dedicated cooling equipment manifolds flush on vault walls
  { x: 2, y: 2, w: 7, h: 8, type: "deck_dark", note: "第一休眠分仓冷机巡检甲板" },
  { x: 2, y: 13, w: 7, h: 7, type: "deck_dark", note: "第二休眠分仓冷机巡检甲板" },
  { x: 21, y: 2, w: 7, h: 8, type: "deck_dark", note: "第三休眠分仓冷机巡检甲板" },
  { x: 21, y: 13, w: 7, h: 7, type: "deck_dark", note: "第四休眠分仓冷机巡检甲板" },

  { x: 1, y: 1, w: 9, h: 1, type: "wall_dark", note: "休眠分仓 1 独立维生冷机机组" },
  { x: 1, y: 12, w: 9, h: 1, type: "wall_dark", note: "休眠分仓 2 独立维生冷机机组" },
  { x: 20, y: 1, w: 9, h: 1, type: "wall_dark", note: "休眠分仓 3 独立维生冷机机组" },
  { x: 20, y: 12, w: 9, h: 1, type: "wall_dark", note: "休眠分仓 4 独立维生冷机机组" },

  // Central Sterile Clinical Diagnostic Floor (clean dark grey/slate medical bay pad, NO bedroom rug!)
  { x: 12, y: 8, w: 6, h: 9, type: "deck_dark", note: "中央紧急救治与生理监测无菌工作台区" },

  // Wall telemetry screens along center concourse
  { x: 10, y: 8, w: 1, h: 2, type: "screen", note: "西侧休眠舱生理遥测总览屏" },
  { x: 19, y: 8, w: 1, h: 2, type: "screen", note: "东侧休眠舱生理遥测总览屏" },

  // Central clinical lighting runner
  { x: 14, y: 2, w: 2, h: 1, type: "floor_light", note: "医疗中心主通道灯" },
  { x: 14, y: 5, w: 2, h: 1, type: "floor_light", note: "医疗中心主通道灯" },
  { x: 14, y: 18, w: 2, h: 1, type: "floor_light", note: "南闸前引导地灯" }
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
