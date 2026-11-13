import { TileMap, type TileType } from "./TileMap";

/**
 * Reactor Auxiliary Heat-Sink Station (聚变动力与应急散热排险泵房)
 *
 * Strictly follows docs/设定集.md:
 *   - "两座主反应堆采用物理隔离设计，每座安装在独立防护结构中，周围设置复杂的冷却管线和维护通道。"
 *
 * Partitioned Radiation-Shielded Architecture (32 x 18):
 *   - West Isolated Primary Loop Bay (x 1..10): walled inside heavy blast divider x=11 w/ chicane door y 7..9
 *   - Central Shielded Control Gallery (x 12..19): core telemetry & dual gauge post
 *   - East Isolated Radiator Servo Bay (x 21..30): walled inside heavy blast divider x=20 w/ chicane door y 7..9
 */

export const REACTOR_COLUMNS = 32;
export const REACTOR_ROWS = 18;

export const REACTOR_NORTH_DOOR = { x: 14, y: 0, w: 4, h: 1 };
export const REACTOR_SOUTH_DOOR = { x: 14, y: REACTOR_ROWS - 1, w: 4, h: 1 };

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
  { x: 0, y: REACTOR_ROWS - 1, w: REACTOR_COLUMNS, h: 1, type: "wall_dark", note: "南向反应堆主屏蔽屏障" },
  { x: 0, y: 0, w: 1, h: REACTOR_ROWS, type: "wall_dark", note: "西向耐热承力壁" },
  { x: REACTOR_COLUMNS - 1, y: 0, w: 1, h: REACTOR_ROWS, type: "wall_dark", note: "东向耐热承力壁" },

  // North & South entrance doorways
  { x: REACTOR_NORTH_DOOR.x, y: REACTOR_NORTH_DOOR.y, w: REACTOR_NORTH_DOOR.w, h: REACTOR_NORTH_DOOR.h, type: "floor_light", note: "北侧通往机库引道" },
  { x: REACTOR_SOUTH_DOOR.x, y: REACTOR_SOUTH_DOOR.y, w: REACTOR_SOUTH_DOOR.w, h: REACTOR_SOUTH_DOOR.h, type: "floor_light", note: "南侧通往尾部主推进阵列" },

  // Dual Physically Isolated Loop Containment Partitions (wall_dark blast bulkheads)
  { x: 11, y: 1, w: 1, h: 16, type: "wall_dark", note: "一回路物理隔离重防护壁" },
  { x: 20, y: 1, w: 1, h: 16, type: "wall_dark", note: "副散热回路物理隔离重防护壁" },
  { x: 11, y: 7, w: 1, h: 3, type: "floor_light", note: "西侧泄压间防护闸门" },
  { x: 20, y: 7, w: 1, h: 3, type: "floor_light", note: "东侧散热作动间防护闸门" },

  // High-heat industrial deck zones inside each isolated chamber
  { x: 2, y: 3, w: 8, h: 12, type: "deck_dark", note: "第一回路冷却主管网防烫地坪" },
  { x: 22, y: 3, w: 8, h: 12, type: "deck_dark", note: "第二回路应急散热作动防烫地坪" },

  // Heavy coolant pipe & actuator banks mounted flush against north/south bulkheads
  { x: 1, y: 1, w: 10, h: 2, type: "wall_dark", note: "主反应堆高温导热母管群" },
  { x: 1, y: 15, w: 10, h: 2, type: "wall_dark", note: "液氮循环主泵机组" },
  { x: 21, y: 1, w: 10, h: 2, type: "wall_dark", note: "副散热翼液压伺服动力群" },
  { x: 21, y: 15, w: 10, h: 2, type: "wall_dark", note: "紧急爆破释放高压储气罐" },

  // Central control corridor runner & safety warning lines
  { x: 15, y: 2, w: 2, h: 1, type: "floor_light", note: "控制廊北端地灯" },
  { x: 15, y: 8, w: 2, h: 1, type: "floor_light", note: "中控主通道地灯" },
  { x: 15, y: 11, w: 2, h: 1, type: "floor_light", note: "中控主通道地灯" },
  { x: 15, y: 15, w: 2, h: 1, type: "floor_light", note: "南向通道地灯" },

  // Thermal imaging monitor banks flanking south door inside Central Control Gallery
  { x: 12, y: REACTOR_ROWS - 1, w: 2, h: 1, type: "screen", note: "一回路热芯实时热成像幕" },
  { x: 18, y: REACTOR_ROWS - 1, w: 2, h: 1, type: "screen", note: "散热翼作动伺服反馈幕" }
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
