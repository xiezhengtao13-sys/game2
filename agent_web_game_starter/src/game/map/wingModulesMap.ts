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
    // Heavy multi-layer ablation armor across bow edge (zero windows per docs/设定集.md!)
    { x: 0, y: 0, w: FORE_COLUMNS, h: 2, type: "wall_dark", note: "舰首多层复合消融防护盾结构" },
    { x: 0, y: FORE_ROWS - 1, w: FORE_COLUMNS, h: 1, type: "wall", note: "南向指挥隔断舱壁" },
    { x: 0, y: 0, w: 1, h: FORE_ROWS, type: "wall_dark", note: "左舷防护外廓" },
    { x: FORE_COLUMNS - 1, y: 0, w: 1, h: FORE_ROWS, type: "wall", note: "右舷检修气闸壁" },

    // Starboard entrance opening
    { x: FORE_EAST_DOOR.x, y: FORE_EAST_DOOR.y, w: FORE_EAST_DOOR.w, h: FORE_EAST_DOOR.h, type: "floor_light", note: "东向维修走廊门" },

    // Telemetry monitor strip embedded in thick forward bulkhead (NOT exterior windows)
    { x: 8, y: 1, w: 14, h: 1, type: "screen", note: "深空光学与尘埃遥测大屏" },

    // Twin optical telescope actuator floor bays
    { x: 3, y: 3, w: 10, h: 4, type: "deck_dark", note: "左舷伸缩望远镜井道平台" },
    { x: 17, y: 3, w: 10, h: 4, type: "deck_dark", note: "右舷毫米波前哨雷达平台" },
    { x: 3, y: 8, w: 10, h: 4, type: "deck_rug", note: "备用防尘盾材维护地垫" },

    // Structural mounting struts
    { x: 14, y: 3, w: 2, h: 4, type: "wall_dark", note: "中央光学导轨基座" },

    // Guide strip lighting
    { x: 16, y: 10, w: 12, h: 1, type: "floor_light", note: "东入走廊指引灯带" },
    { x: 14, y: 10, w: 2, h: 1, type: "floor_light", note: "中心通道指引灯" }
  ];
  return buildFromShapes(FORE_COLUMNS, FORE_ROWS, "deck", shapes);
}

// =============================================================================
// 2. L-1 Agricultural & Ecological Module (L-1 生态与农业模块, 950-1400m Port)
// =============================================================================
export const L1_COLUMNS = 20;
export const L1_ROWS = 22;
export const L1_EAST_DOOR = { x: L1_COLUMNS - 1, y: 10, w: 1, h: 3 };

export function agriGrid(): TileType[][] {
  const shapes: Shape[] = [
    // Completely enclosed insulated shell (no windows per docs/设定集.md!)
    { x: 0, y: 0, w: L1_COLUMNS, h: 1, type: "wall_dark", note: "L-1 北向绝热外墙" },
    { x: 0, y: L1_ROWS - 1, w: L1_COLUMNS, h: 1, type: "wall_dark", note: "L-1 南向冷却管壁" },
    { x: 0, y: 0, w: 1, h: L1_ROWS, type: "wall_dark", note: "L-1 外舷辐射排热墙" },
    { x: L1_COLUMNS - 1, y: 0, w: 1, h: L1_ROWS, type: "wall", note: "L-1 东向接驳舱壁" },

    { x: L1_EAST_DOOR.x, y: L1_EAST_DOOR.y, w: L1_EAST_DOOR.w, h: L1_EAST_DOOR.h, type: "floor_light", note: "东向连廊气闸" },

    // Hydroponic multi-tier beds (earth tone mulch rugs + overhead synthetic light strips)
    { x: 3, y: 3, w: 6, h: 6, type: "deck_rug", note: "一号多层水培生态种植槽" },
    { x: 11, y: 3, w: 6, h: 6, type: "deck_rug", note: "二号作物氧循环培养床" },
    { x: 3, y: 13, w: 6, h: 6, type: "deck_rug", note: "三号谷物根茎无土育苗床" },
    { x: 11, y: 13, w: 6, h: 6, type: "deck_rug", note: "四号常绿地球植物隔离槽" },

    // Artificial plant growth light lamps
    { x: 5, y: 5, w: 2, h: 2, type: "floor_light", note: "全光谱植物照明" },
    { x: 13, y: 5, w: 2, h: 2, type: "floor_light", note: "全光谱植物照明" },
    { x: 5, y: 15, w: 2, h: 2, type: "floor_light", note: "全光谱植物照明" },
    { x: 13, y: 15, w: 2, h: 2, type: "floor_light", note: "全光谱植物照明" },

    // Independent thermal exchanger & nutrient manifold racks
    { x: 1, y: 4, w: 1, h: 5, type: "wall_dark", note: "北冷却热负荷分流机组" },
    { x: 1, y: 13, w: 1, h: 5, type: "wall_dark", note: "南循环供水过滤压泵" },
    { x: 3, y: 11, w: 15, h: 1, type: "floor_light", note: "东西主通道指引灯带" }
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

    // Viewports looking out at the 440m counter-rotating habitat rings!
    { x: R1_COLUMNS - 1, y: 4, w: 1, h: 5, type: "window", note: "旋转一号环辐条观景视窗" },
    { x: R1_COLUMNS - 1, y: 13, w: 1, h: 5, type: "window", note: "反向二号环离心轴承视窗" },

    // Warm public concourse & reading lounge carpets
    { x: 4, y: 2, w: 13, h: 7, type: "deck_rug", note: "0.45g离心休整雅座区地毯" },
    { x: 4, y: 13, w: 13, h: 7, type: "deck_rug", note: "地球人文阅读长廊地毯" },

    // Curved ring transit ramp indicator & guide lighting
    { x: 2, y: 11, w: 15, h: 1, type: "floor_light", note: "辐条离心过渡通道导引光带" },
    { x: 16, y: 5, w: 1, h: 12, type: "floor_light", note: "外弦弧形观景步道照明" }
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

    // Windows overlooking external vacuum foundry rails (open industrial bays per 设定集!)
    { x: 0, y: 4, w: 1, h: 4, type: "window", note: "外部真空吊装臂观景视窗" },
    { x: 0, y: 15, w: 1, h: 4, type: "window", note: "外部机械构件制造平台窗" },

    // Heavy industrial dark plating with yellow hazard floor strips
    { x: 2, y: 2, w: 17, h: 8, type: "deck_dark", note: "重型结构件机床作业地坪" },
    { x: 2, y: 13, w: 17, h: 8, type: "deck_dark", note: "重型焊接与机器人导轨区" },

    // Load-bearing structural stanchions separating heavy crane lanes
    { x: 8, y: 3, w: 2, h: 3, type: "wall_dark", note: "北向龙门行车立柱" },
    { x: 8, y: 17, w: 2, h: 3, type: "wall_dark", note: "南向液压冲压立柱" },

    // Safety yellow strips along work paths
    { x: 2, y: 11, w: 17, h: 1, type: "floor_light", note: "黄色安全警示通道线" },
    { x: 13, y: 3, w: 1, h: 6, type: "floor_light", note: "钳工工位导引光带" },
    { x: 13, y: 14, w: 1, h: 6, type: "floor_light", note: "物料吊装区警戒光带" }
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

    // Telemetry screens & astro-windows on eastern bulkhead
    { x: R2_COLUMNS - 1, y: 4, w: 1, h: 4, type: "screen", note: "深空光谱折射测绘屏" },
    { x: R2_COLUMNS - 1, y: 15, w: 1, h: 4, type: "window", note: "东向恒星系观测半球窗" },

    // Standardized pale clean research decks + recessed precision zones
    { x: 3, y: 3, w: 14, h: 6, type: "deck_dark", note: "无尘光谱与微陨石分析甲板" },
    { x: 3, y: 14, w: 14, h: 6, type: "deck_rug", note: "天体地质样品整理静音垫" },

    // Illumination strips
    { x: 2, y: 11, w: 16, h: 1, type: "floor_light", note: "实验室中央导引光" },
    { x: 10, y: 3, w: 1, h: 6, type: "floor_light", note: "光学测试台纵灯带" }
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

    // Giant port/starboard deployable radiator wing drive bays (1200m wingspan mechanisms!)
    { x: 2, y: 2, w: 18, h: 11, type: "deck_dark", note: "左舷可展散热翼传动走廊" },
    { x: 36, y: 2, w: 18, h: 11, type: "deck_dark", note: "右舷可展散热翼传动走廊" },

    // Physical Twin Reactor Isolation Shields inside the propulsion engineering bay
    { x: 10, y: 3, w: 6, h: 3, type: "wall_dark", note: "左主堆屏蔽减震隔舱" },
    { x: 40, y: 3, w: 6, h: 3, type: "wall_dark", note: "右主堆屏蔽减震隔舱" },

    // Exterior viewports out to the deployed 1200m thermal radiator wings
    { x: 0, y: 5, w: 1, h: 5, type: "window", note: "左舷巨大辐射散热羽翼观测窗" },
    { x: PROPULSION_COLUMNS - 1, y: 5, w: 1, h: 5, type: "window", note: "右舷巨大辐射散热羽翼观测窗" },

    // Massive magnetic propulsion nozzle monitor screens along aft bulkhead
    { x: 6, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "一号左偏推进喷口磁约束幕" },
    { x: 18, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "二号主轴聚变喷口实时流场" },
    { x: 32, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "三号主轴聚变喷口实时流场" },
    { x: 44, y: PROPULSION_ROWS - 1, w: 6, h: 1, type: "screen", note: "四号右偏推进喷口磁约束幕" },

    // Long transversal catwalk illumination across full stern span
    { x: 3, y: 7, w: 50, h: 1, type: "floor_light", note: "尾部 100米贯通检修走廊灯带" },
    { x: 27, y: 2, w: 2, h: 11, type: "floor_light", note: "舰尾中心脊梁灯带" }
  ];
  return buildFromShapes(PROPULSION_COLUMNS, PROPULSION_ROWS, "deck", shapes);
}
