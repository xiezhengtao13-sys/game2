import { TileMap, type TileType } from "./TileMap";

/**
 * Reactor Auxiliary Heat-Sink Station (聚变动力与应急散热排险泵房)
 *
 * Located at the aft boundary (rows 122..139), adjacent to the main fusion reactors.
 * In docs/设定集.md:
 *   - "后部主要容纳聚变反应堆、燃料处理设备、能源转换系统和大型推进设备"
 *   - "散热翼由大量高温辐射板、循环管线和支撑结构组成，表面采用特殊耐热材料"
 *   - "低功率巡航时散热翼可调整角度，但散热设备不能完全关闭——即使在深空中也会持续产生废热"
 *
 * This is the climax location of Chapter 1: where the crew manually resolves
 * the thermal runaway crisis by clearing the hydraulic lock and forcing open
 * the secondary heat-sink wings.
 *
 * Dimensions: 32 columns x 18 rows.
 * Scale: 1 tile = 1.8 m (57.6 m x 32.4 m = ~1,866 m2).
 */

export const REACTOR_COLUMNS = 32;
export const REACTOR_ROWS = 18;

export const REACTOR_NORTH_DOOR = { x: 14, y: 0, w: 4, h: 1 };

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

const SHAPES: Shape[] = [
  // Outer heavy bulkheads
  { x: 0, y: 0, w: REACTOR_COLUMNS, h: 1, type: "wall", note: "北向防护舱壁" },
  { x: 0, y: REACTOR_ROWS - 1, w: REACTOR_COLUMNS, h: 1, type: "wall_dark", note: "南向反应堆主辐射屏蔽屏障" },
  { x: 0, y: 0, w: 1, h: REACTOR_ROWS, type: "wall_dark", note: "西向耐热承力壁" },
  { x: REACTOR_COLUMNS - 1, y: 0, w: 1, h: REACTOR_ROWS, type: "wall_dark", note: "东向耐热承力壁" },

  // North entrance doorway
  { x: REACTOR_NORTH_DOOR.x, y: REACTOR_NORTH_DOOR.y, w: REACTOR_NORTH_DOOR.w, h: REACTOR_NORTH_DOOR.h, type: "floor_light", note: "入口安全引道" },

  // Central runway guide lights
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "中心作业导引灯" },
  { x: 15, y: 5, w: 2, h: 1, type: "floor_light", note: "中心作业导引灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "中心作业导引灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "中心作业导引灯" },
  { x: 15, y: 14, w: 2, h: 1, type: "floor_light", note: "中心作业导引灯" },

  // High-heat industrial deck zones (deck_dark)
  { x: 2, y: 2, w: 11, h: 14, type: "deck_dark", note: "第一回路冷却主管网作业区" },
  { x: 19, y: 2, w: 11, h: 14, type: "deck_dark", note: "第二回路应急散热旁路区" },

  // Massive heat pipe trunk channels
  { x: 2, y: 4, w: 11, h: 2, type: "wall_dark", note: "主反应堆高温导热主梁" },
  { x: 2, y: 11, w: 11, h: 2, type: "wall_dark", note: "液氮循环降温母管" },
  { x: 19, y: 4, w: 11, h: 2, type: "wall_dark", note: "副散热翼机械伺服传动梁" },
  { x: 19, y: 11, w: 11, h: 2, type: "wall_dark", note: "气动应急释放高压储气罐群" },

  // Warning thresholds / safety markings
  { x: 13, y: 3, w: 1, h: 12, type: "floor_light", note: "西侧耐热作业警示线" },
  { x: 18, y: 3, w: 1, h: 12, type: "floor_light", note: "东侧高压旁路警示线" },

  // Status monitor banks along south radiation shield
  { x: 10, y: REACTOR_ROWS - 1, w: 4, h: 1, type: "screen", note: "反应堆热芯实时热成像大屏" },
  { x: 18, y: REACTOR_ROWS - 1, w: 4, h: 1, type: "screen", note: "副散热翼角度伺服反馈屏" }
];

export function reactorBayGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < REACTOR_ROWS; y++) {
    grid.push(new Array<TileType>(REACTOR_COLUMNS).fill("deck"));
  }

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= REACTOR_COLUMNS || y >= REACTOR_ROWS) {
          throw new Error(`Reactor shape "${shape.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = shape.type;
      }
    }
  }

  return grid;
}

export function createReactorBayMap(tileSize: number): TileMap {
  return new TileMap(reactorBayGrid().flat(), REACTOR_COLUMNS, REACTOR_ROWS, tileSize);
}
