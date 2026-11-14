import type { TileType } from "./TileMap";

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  note: string;
}

function buildFromShapes(cols: number, rows: number, base: TileType, shapes: Shape[]): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array<TileType>(cols).fill(base));
  }
  for (const s of shapes) {
    for (let y = s.y; y < s.y + s.h; y++) {
      for (let x = s.x; x < s.x + s.w; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) {
          throw new Error(`Module shape "${s.note}" runs outside at (${x}, ${y})`);
        }
        grid[y][x] = s.type;
      }
    }
  }
  return grid;
}

// =============================================================================
// 1. Fore Deep-Space Sensor Array & Ablation Shield Gallery (前向探测与护盾廊, 0-300m)
// =============================================================================
export const FORE_COLUMNS = 30;
export const FORE_ROWS = 14;
export const FORE_EAST_DOOR = { x: FORE_COLUMNS - 1, y: 9, w: 1, h: 3 };

export function foreSensorGrid(): TileType[][] {
  const shapes: Shape[] = [
    // Heavy windowless multi-layer forward armor (strictly per docs/设定集.md!)
    { x: 0, y: 0, w: FORE_COLUMNS, h: 2, type: "wall_dark", note: "舰首多层复合消融防护盾结构" },
    { x: 0, y: FORE_ROWS - 1, w: FORE_COLUMNS, h: 1, type: "wall", note: "南向指挥隔断舱壁" },
    { x: 0, y: 0, w: 1, h: FORE_ROWS, type: "wall_dark", note: "左舷防护外廓" },
    { x: FORE_COLUMNS - 1, y: 0, w: 1, h: FORE_ROWS, type: "wall", note: "右舷检修气闸壁" },

    { x: FORE_EAST_DOOR.x, y: FORE_EAST_DOOR.y, w: FORE_EAST_DOOR.w, h: FORE_EAST_DOOR.h, type: "floor_light", note: "东向维修走廊门" },
    { x: 8, y: 1, w: 14, h: 1, type: "screen", note: "深空光学与尘埃遥测大屏" },

    // Enclosed telescope bay vs radar bay partitions
    { x: 14, y: 2, w: 2, h: 6, type: "wall_dark", note: "中央防撞光学导轨基座" },
    { x: 3, y: 3, w: 9, h: 4, type: "deck_dark", note: "左舷伸缩光学望远镜井道平台" },
    { x: 18, y: 3, w: 9, h: 4, type: "deck_dark", note: "右舷毫米波前哨雷达平台" },

    // Aft maintenance corridor floor & guides (clean deck_dark, no home rug!)
    { x: 16, y: 10, w: 12, h: 1, type: "floor_light", note: "东入走廊指引灯带" },
    { x: 14, y: 10, w: 2, h: 1, type: "floor_light", note: "中心通道指引灯" }
  ];
  return buildFromShapes(FORE_COLUMNS, FORE_ROWS, "deck", shapes);
}

// =============================================================================
// 2. L-1 Agricultural & Ecological Module (L-1 生态与农业模块, Closed & Insulated)
// =============================================================================
export const L1_COLUMNS = 20;
export const L1_ROWS = 22;
export const L1_EAST_DOOR = { x: L1_COLUMNS - 1, y: 10, w: 1, h: 3 };

export function agriGrid(): TileType[][] {
  const shapes: Shape[] = [
    // Completely enclosed insulated shell (zero exterior windows per docs/设定集.md!)
    { x: 0, y: 0, w: L1_COLUMNS, h: 1, type: "wall_dark", note: "L-1 北向绝热外墙" },
    { x: 0, y: L1_ROWS - 1, w: L1_COLUMNS, h: 1, type: "wall_dark", note: "L-1 南向冷却管壁" },
    { x: 0, y: 0, w: 1, h: L1_ROWS, type: "wall_dark", note: "L-1 外舷辐射排热墙" },
    { x: L1_COLUMNS - 1, y: 0, w: 1, h: L1_ROWS, type: "wall", note: "L-1 东向接驳舱壁" },

    { x: L1_EAST_DOOR.x, y: L1_EAST_DOOR.y, w: L1_EAST_DOOR.w, h: L1_EAST_DOOR.h, type: "floor_light", note: "东向连廊气闸" },

    // Enclosed East Pressurization Vestibule + Partitioned Crop Zones
    { x: 16, y: 1, w: 1, h: 20, type: "wall", note: "L-1 气闸缓冲间温控隔墙" },
    { x: 16, y: 10, w: 1, h: 3, type: "floor_light", note: "生态洁净区气密双开门" },
    { x: 1, y: 9, w: 15, h: 1, type: "wall", note: "北区谷物培育室绝热隔墙" },
    { x: 9, y: 9, w: 3, h: 1, type: "floor_light", note: "北区温室滑动门" },
    { x: 1, y: 13, w: 15, h: 1, type: "wall", note: "南区藻类苗圃室绝热隔墙" },
    { x: 9, y: 13, w: 3, h: 1, type: "floor_light", note: "南区温室滑动门" },

    // Compact hydroponic planting beds with real grow-light aisles between them
    { x: 3, y: 3, w: 5, h: 4, type: "deck_dark", note: "一号水培谷物培养槽床体" },
    { x: 10, y: 3, w: 5, h: 4, type: "deck_dark", note: "二号氧循环微藻培植槽床体" },
    { x: 3, y: 15, w: 5, h: 4, type: "deck_dark", note: "三号根茎作物苗圃培养槽" },
    { x: 10, y: 15, w: 5, h: 4, type: "deck_dark", note: "四号常绿生态循环监测槽" },

    { x: 5, y: 4, w: 1, h: 2, type: "floor_light", note: "全光谱植物补光灯带" },
    { x: 12, y: 4, w: 1, h: 2, type: "floor_light", note: "全光谱植物补光灯带" },
    { x: 5, y: 16, w: 1, h: 2, type: "floor_light", note: "全光谱植物补光灯带" },
    { x: 12, y: 16, w: 1, h: 2, type: "floor_light", note: "全光谱植物补光灯带" },

    // Independent cooling & nutrient manifolds flush against outer West bulkhead
    { x: 1, y: 4, w: 1, h: 4, type: "wall_dark", note: "北冷却热负荷分流机组" },
    { x: 1, y: 15, w: 1, h: 4, type: "wall_dark", note: "南循环供水过滤压泵" },
    { x: 3, y: 11, w: 15, h: 1, type: "floor_light", note: "中央营养管廊通道灯" }
  ];
  return buildFromShapes(L1_COLUMNS, L1_ROWS, "deck", shapes);
}

// =============================================================================
// 3. R-1 Social Module & Rotating Habitat Ring Spoke Atrium (R-1 生活环接口)
// =============================================================================
export const R1_COLUMNS = 20;
export const R1_ROWS = 22;
export const R1_WEST_DOOR = { x: 0, y: 10, w: 1, h: 3 };

export function ringGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: R1_COLUMNS, h: 1, type: "wall", note: "R-1 北向气密壁" },
    { x: 0, y: R1_ROWS - 1, w: R1_COLUMNS, h: 1, type: "wall", note: "R-1 南向气密壁" },
    { x: 0, y: 0, w: 1, h: R1_ROWS, type: "wall", note: "R-1 西向枢纽接口墙" },
    { x: R1_COLUMNS - 1, y: 0, w: 1, h: R1_ROWS, type: "wall", note: "R-1 旋转生活环观景外墙" },

    { x: R1_WEST_DOOR.x, y: R1_WEST_DOOR.y, w: R1_WEST_DOOR.w, h: R1_WEST_DOOR.h, type: "floor_light", note: "西侧气闸入口" },

    // Panoramic East viewports looking out directly at the spinning 440m Habitat Rings in space!
    { x: R1_COLUMNS - 1, y: 3, w: 1, h: 5, type: "window", note: "旋转一号环辐条观景视窗" },
    { x: R1_COLUMNS - 1, y: 14, w: 1, h: 5, type: "window", note: "反向二号环离心轴承视窗" },

    // Real 0g-to-0.45g Transfer Airlock Partition + North Social Cafe & South Heritage Library
    { x: 4, y: 1, w: 1, h: 20, type: "wall", note: "离心重力缓冲前厅隔墙" },
    { x: 4, y: 10, w: 1, h: 3, type: "floor_light", note: "旋转环辐条对接大厅门" },
    { x: 5, y: 9, w: 14, h: 1, type: "wall", note: "北交谊咖啡厅隔断墙" },
    { x: 9, y: 9, w: 3, h: 1, type: "floor_light", note: "交谊厅入口" },
    { x: 5, y: 13, w: 14, h: 1, type: "wall", note: "南地球人文阅读室隔断墙" },
    { x: 9, y: 13, w: 3, h: 1, type: "floor_light", note: "阅读室入口" },

    // Sized seating rugs beneath lounge table and library nook (leaving walk aisles around)
    { x: 8, y: 3, w: 6, h: 5, type: "deck_rug", note: "0.45g 交谊茶座地毯" },
    { x: 7, y: 15, w: 7, h: 5, type: "deck_rug", note: "人文怀旧图书角地毯" },

    { x: 2, y: 11, w: 15, h: 1, type: "floor_light", note: "辐条离心过渡通道导引光带" },
    { x: 17, y: 4, w: 1, h: 14, type: "floor_light", note: "东弦观景环廊导引地灯" }
  ];
  return buildFromShapes(R1_COLUMNS, R1_ROWS, "deck", shapes);
}

// =============================================================================
// 4. L-2 Heavy Industrial & Manufacturing Bay (L-2 重工业制造与机修车间)
// =============================================================================
export const L2_COLUMNS = 21;
export const L2_ROWS = 23;
export const L2_EAST_DOOR = { x: L2_COLUMNS - 1, y: 10, w: 1, h: 3 };

export function industrialGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: L2_COLUMNS, h: 1, type: "wall_dark", note: "L-2 北向重钢加固墙" },
    { x: 0, y: L2_ROWS - 1, w: L2_COLUMNS, h: 1, type: "wall_dark", note: "L-2 南向重钢加固墙" },
    { x: 0, y: 0, w: 1, h: L2_ROWS, type: "wall_dark", note: "L-2 外舷真空焊切观测墙" },
    { x: L2_COLUMNS - 1, y: 0, w: 1, h: L2_ROWS, type: "wall", note: "L-2 通往船员生活区舱壁" },

    { x: L2_EAST_DOOR.x, y: L2_EAST_DOOR.y, w: L2_EAST_DOOR.w, h: L2_EAST_DOOR.h, type: "floor_light", note: "东向生活区联通开口" },

    // Exterior viewports onto external vacuum foundry rails & cranes
    { x: 0, y: 3, w: 1, h: 5, type: "window", note: "外部真空吊装臂观景视窗" },
    { x: 0, y: 15, w: 1, h: 5, type: "window", note: "外部机械构件制造平台窗" },

    // East Workshop Tool Crib & Inspection Vestibule Partition (separates noisy gantry floor!)
    { x: 16, y: 1, w: 1, h: 21, type: "wall", note: "L-2 钳工领料隔音前厅墙" },
    { x: 16, y: 10, w: 1, h: 3, type: "floor_light", note: "重工车间气动防尘门" },

    // Heavy industrial dark plating across main crane floor + south machining bay
    { x: 1, y: 1, w: 15, h: 9, type: "deck_dark", note: "重型龙门吊装与液压装配地坪" },
    { x: 1, y: 13, w: 15, h: 9, type: "deck_dark", note: "冷焊机械臂与重钢冲压地坪" },

    // Symmetric heavy crane frame stanchions
    { x: 8, y: 1, w: 2, h: 2, type: "wall_dark", note: "北龙门行车承重桥墩" },
    { x: 8, y: 20, w: 2, h: 2, type: "wall_dark", note: "南液压冲压基座桥墩" },

    // Yellow OSHA guide & crane rail stripes
    { x: 2, y: 11, w: 17, h: 1, type: "floor_light", note: "黄色安全警示通道线" },
    { x: 13, y: 3, w: 1, h: 7, type: "floor_light", note: "装配台工位警戒黄线" },
    { x: 13, y: 14, w: 1, h: 6, type: "floor_light", note: "吊装通道边界光带" }
  ];
  return buildFromShapes(L2_COLUMNS, L2_ROWS, "deck", shapes);
}

// =============================================================================
// 5. R-2 Deep Space Science & Exploration Lab (R-2 科研与深空探索实验舱)
// =============================================================================
export const R2_COLUMNS = 21;
export const R2_ROWS = 23;
export const R2_WEST_DOOR = { x: 0, y: 10, w: 1, h: 3 };

export function scienceLabGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: R2_COLUMNS, h: 1, type: "wall", note: "R-2 北向实验隔离壁" },
    { x: 0, y: R2_ROWS - 1, w: R2_COLUMNS, h: 1, type: "wall", note: "R-2 南向实验隔离壁" },
    { x: 0, y: 0, w: 1, h: R2_ROWS, type: "wall", note: "R-2 西向气闸主墙" },
    { x: R2_COLUMNS - 1, y: 0, w: 1, h: R2_ROWS, type: "wall_dark", note: "R-2 东向天文阵列接口墙" },

    { x: R2_WEST_DOOR.x, y: R2_WEST_DOOR.y, w: R2_WEST_DOOR.w, h: R2_WEST_DOOR.h, type: "floor_light", note: "西侧气闸入口" },

    // East wall screens & deep-space astro observation window
    { x: R2_COLUMNS - 1, y: 3, w: 1, h: 5, type: "screen", note: "深空光谱折射测绘屏" },
    { x: R2_COLUMNS - 1, y: 15, w: 1, h: 5, type: "window", note: "东向恒星系观测半球窗" },

    // West Decontamination Airlock + Partitioned North Spectroscopy & South Geology Cleanrooms
    { x: 4, y: 1, w: 1, h: 21, type: "wall", note: "白区无尘风淋缓冲隔墙" },
    { x: 4, y: 10, w: 1, h: 3, type: "floor_light", note: "实验室无尘入口气密门" },
    { x: 5, y: 9, w: 15, h: 1, type: "wall", note: "北光学实验室洁净隔墙" },
    { x: 10, y: 9, w: 3, h: 1, type: "floor_light", note: "光谱室自动门" },
    { x: 5, y: 13, w: 15, h: 1, type: "wall", note: "南地外样品室洁净隔墙" },
    { x: 10, y: 13, w: 3, h: 1, type: "floor_light", note: "地质样品室自动门" },

    // Precision pale-slate clean lab zones (NO bedroom carpet inside science cleanroom!)
    { x: 6, y: 2, w: 12, h: 6, type: "deck_dark", note: "无尘光谱与微陨石分析甲板" },
    { x: 6, y: 15, w: 12, h: 5, type: "deck_dark", note: "负压异星岩石样本精密操作甲板" },

    { x: 2, y: 11, w: 16, h: 1, type: "floor_light", note: "实验室中央导引光" },
    { x: 11, y: 3, w: 1, h: 5, type: "floor_light", note: "光学平台纵轴灯带" }
  ];
  return buildFromShapes(R2_COLUMNS, R2_ROWS, "deck", shapes);
}

// =============================================================================
// 6. Aft Propulsion Array & Deployable Radiator Gallery (尾部主推进阵与散热翼长廊)
// =============================================================================
export const PROPULSION_COLUMNS = 56;
export const PROPULSION_ROWS = 15;
export const PROPULSION_NORTH_DOOR = { x: 26, y: 0, w: 4, h: 1 };

export function propulsionGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: PROPULSION_COLUMNS, h: 1, type: "wall_dark", note: "北向推进器抗震防火墙" },
    { x: 0, y: PROPULSION_ROWS - 1, w: PROPULSION_COLUMNS, h: 1, type: "wall_dark", note: "舰尾主推进磁约束尾罩墙" },
    { x: 0, y: 0, w: 1, h: PROPULSION_ROWS, type: "wall_dark", note: "左舷散热翼折叠作动舱墙" },
    { x: PROPULSION_COLUMNS - 1, y: 0, w: 1, h: PROPULSION_ROWS, type: "wall_dark", note: "右舷散热翼折叠作动舱墙" },

    { x: PROPULSION_NORTH_DOOR.x, y: PROPULSION_NORTH_DOOR.y, w: PROPULSION_NORTH_DOOR.w, h: PROPULSION_NORTH_DOOR.h, type: "floor_light", note: "反应堆泵房直通气闸" },

    // Bulkhead compartment dividers splitting Port Radiator Wing / Center Aft Control / Stbd Radiator Wing
    { x: 18, y: 1, w: 1, h: PROPULSION_ROWS - 2, type: "wall_dark", note: "左舷散热作动舱防护隔墙" },
    { x: 37, y: 1, w: 1, h: PROPULSION_ROWS - 2, type: "wall_dark", note: "右舷散热作动舱防护隔墙" },
    { x: 18, y: 6, w: 1, h: 3, type: "floor_light", note: "左舷贯通检修通道门" },
    { x: 37, y: 6, w: 1, h: 3, type: "floor_light", note: "右舷贯通检修通道门" },

    // Giant Port & Starboard Radiator Wing Drive Floors
    { x: 1, y: 1, w: 17, h: 13, type: "deck_dark", note: "左舷可展散热翼传动走廊" },
    { x: 38, y: 1, w: 17, h: 13, type: "deck_dark", note: "右舷可展散热翼传动走廊" },

    // Twin Main Reactor Shielding Structural Blocks tucked flush on north wall
    { x: 9, y: 1, w: 6, h: 3, type: "wall_dark", note: "左主磁约束堆屏蔽减震隔舱" },
    { x: 41, y: 1, w: 6, h: 3, type: "wall_dark", note: "右主磁约束堆屏蔽减震隔舱" },

    // Exterior viewports out onto the deployed 1,200m thermal radiator wings
    { x: 0, y: 5, w: 1, h: 5, type: "window", note: "左舷巨大辐射散热羽翼观测窗" },
    { x: PROPULSION_COLUMNS - 1, y: 5, w: 1, h: 5, type: "window", note: "右舷巨大辐射散热羽翼观测窗" },

    // 4 Propulsion Nozzle Magnetic Monitors along aft bulkhead
    { x: 6, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "一号左偏推进喷口磁约束幕" },
    { x: 20, y: PROPULSION_ROWS - 1, w: 5, h: 1, type: "screen", note: "二号主轴聚变喷口实时流场" },
    { x: 31, y: PROPULSION_ROWS - 1, w: 5, h: 1, type: "screen", note: "三号主轴聚变喷口实时流场" },
    { x: 44, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "四号右偏推进喷口磁约束幕" },

    // Transverse engineering catwalk illumination
    { x: 3, y: 7, w: 50, h: 1, type: "floor_light", note: "尾部 100米贯通检修走廊灯带" },
    { x: 27, y: 2, w: 2, h: 11, type: "floor_light", note: "舰尾中心脊梁灯带" }
  ];
  return buildFromShapes(PROPULSION_COLUMNS, PROPULSION_ROWS, "deck", shapes);
}

// =============================================================================
// 7. Seventh Neural Rehab & Cognitive Research Center / Formerly C-7 (第七神经康复与认知研究中心)
// =============================================================================
export const REHAB_COLUMNS = 21;
export const REHAB_ROWS = 22;
export const REHAB_EAST_DOOR = { x: REHAB_COLUMNS - 1, y: 7, w: 1, h: 3 };

export function rehabGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: REHAB_COLUMNS, h: 1, type: "wall", note: "C-7 北向神经屏蔽隔离壁" },
    { x: 0, y: REHAB_ROWS - 1, w: REHAB_COLUMNS, h: 1, type: "wall", note: "C-7 南向屏蔽隔离壁" },
    { x: 0, y: 0, w: 1, h: REHAB_ROWS, type: "wall", note: "C-7 外舷气密壁" },
    { x: REHAB_COLUMNS - 1, y: 0, w: 1, h: REHAB_ROWS, type: "wall", note: "C-7 东向医疗区连廊门墙" },

    { x: REHAB_EAST_DOOR.x, y: REHAB_EAST_DOOR.y, w: REHAB_EAST_DOOR.w, h: REHAB_EAST_DOOR.h, type: "floor_light", note: "东向连廊气密入口" },

    // Telemetry screen & deep space quiet window
    { x: 0, y: 3, w: 1, h: 3, type: "screen", note: "37名受试者脑波基线波形监护墙屏" },
    { x: 0, y: 14, w: 1, h: 4, type: "window", note: "西向康复休养静谧观景窗" },

    // East Pressurization Vestibule + North Cognitive Research Lab + South Rehab Ward
    { x: 16, y: 1, w: 1, h: 20, type: "wall", note: "神经屏蔽洁净缓冲区隔墙" },
    { x: 16, y: 7, w: 1, h: 3, type: "floor_light", note: "研究中心主双开门" },
    { x: 1, y: 6, w: 15, h: 1, type: "wall", note: "北侧陈艾琳认知研究区隔墙" },
    { x: 7, y: 6, w: 3, h: 1, type: "floor_light", note: "认知实验室推拉门" },
    { x: 1, y: 10, w: 15, h: 1, type: "wall", note: "南侧康复观察病房隔墙" },
    { x: 7, y: 10, w: 3, h: 1, type: "floor_light", note: "康复病房滑动门" },

    // Calm research deck & warm recovery ward floor pad
    { x: 2, y: 2, w: 13, h: 4, type: "deck_dark", note: "陈艾琳离线认知波形解码台区" },
    { x: 2, y: 12, w: 13, h: 7, type: "deck_rug", note: "温润减噪神经康复病房地垫" },

    { x: 3, y: 8, w: 16, h: 1, type: "floor_light", note: "研究中心东西贯通长廊灯带" }
  ];
  return buildFromShapes(REHAB_COLUMNS, REHAB_ROWS, "deck", shapes);
}

// =============================================================================
// 8. Yuanwang Historical Archives & MNA-01 Study (远望号历史档案馆)
// =============================================================================
export const ARCHIVES_COLUMNS = 21;
export const ARCHIVES_ROWS = 22;
export const ARCHIVES_WEST_DOOR = { x: 0, y: 7, w: 1, h: 3 };

export function archivesGrid(): TileType[][] {
  const shapes: Shape[] = [
    { x: 0, y: 0, w: ARCHIVES_COLUMNS, h: 1, type: "wall", note: "档案馆北向恒温防潮舱壁" },
    { x: 0, y: ARCHIVES_ROWS - 1, w: ARCHIVES_COLUMNS, h: 1, type: "wall", note: "档案馆南向防磁存储隔离壁" },
    { x: 0, y: 0, w: 1, h: ARCHIVES_ROWS, type: "wall", note: "档案馆西向医疗区门墙" },
    { x: ARCHIVES_COLUMNS - 1, y: 0, w: 1, h: ARCHIVES_ROWS, type: "wall", note: "档案馆东向外舷墙" },

    { x: ARCHIVES_WEST_DOOR.x, y: ARCHIVES_WEST_DOOR.y, w: ARCHIVES_WEST_DOOR.w, h: ARCHIVES_WEST_DOOR.h, type: "floor_light", note: "西向连廊气密入口" },

    // Chronology telemetry screen & reading room viewport
    { x: 7, y: 0, w: 6, h: 1, type: "screen", note: "2439-2491 远望号与九舰共同体纪事索引屏" },
    { x: ARCHIVES_COLUMNS - 1, y: 14, w: 1, h: 4, type: "window", note: "东向历史阅览区星空长窗" },

    // West Archive Security Vestibule + North Solar/Nine-Ships Chronology Room + South MNA-01 Study
    { x: 4, y: 1, w: 1, h: 20, type: "wall", note: "档案馆离线典籍物理隔离隔墙" },
    { x: 4, y: 7, w: 1, h: 3, type: "floor_light", note: "档案馆阅览室主门" },
    { x: 5, y: 6, w: 15, h: 1, type: "wall", note: "北侧太阳系与九舰史料陈列隔墙" },
    { x: 10, y: 6, w: 3, h: 1, type: "floor_light", note: "史料陈列室门" },
    { x: 5, y: 10, w: 15, h: 1, type: "wall", note: "南侧 MNA-01 研究员隔离工作间墙" },
    { x: 10, y: 10, w: 3, h: 1, type: "floor_light", note: "MNA-01 工作席透明隔离门" },

    // Warm archival reading rug & clean MNA-01 isolated workstation slab
    { x: 6, y: 2, w: 13, h: 3, type: "deck_rug", note: "实体纸质史料与守望协定阅览毯" },
    { x: 6, y: 12, w: 13, h: 7, type: "deck_dark", note: "MNA-01 离线孤岛终端研究区" },

    { x: 2, y: 8, w: 16, h: 1, type: "floor_light", note: "档案馆东西向引导地灯" }
  ];
  return buildFromShapes(ARCHIVES_COLUMNS, ARCHIVES_ROWS, "deck", shapes);
}
