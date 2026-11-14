import type { DialogueLine } from "../systems/Dialogue";
import { TILE } from "../config";
import {
  FORE_ORIGIN,
  BRIDGE_ORIGIN,
  CABIN_ORIGIN,
  TRANSIT_ORIGIN,
  L1_ORIGIN,
  R1_ORIGIN,
  HABITAT_ORIGIN,
  L2_ORIGIN,
  R2_ORIGIN,
  MEDICAL_ORIGIN,
  HANGAR_ORIGIN,
  REACTOR_ORIGIN,
  PROPULSION_ORIGIN,
  type Place
} from "../map/shipMap";

/**
 * Everything standing on the ship, and who is aboard across all 13 compartments.
 * Positions are authored in TILES relative to each compartment's origin in `shipMap.ts`.
 */

export interface SceneProp {
  assetId: string;
  /** Centre of the prop's box, in world pixels. */
  x: number;
  y: number;
  /** Size in tiles. */
  w: number;
  h: number;
  label: string;
  lines: DialogueLine[] | null;
}

export interface ScenePerson {
  id: string;
  name: string;
  assetId: string;
  /** Feet position in world pixels. */
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
  promptLabel: string;
  lines: DialogueLine[];
}

function propIn(
  origin: { tx: number; ty: number },
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
): SceneProp {
  return {
    assetId,
    x: (origin.tx + tx) * TILE,
    y: (origin.ty + ty) * TILE,
    w,
    h,
    label,
    lines
  };
}

const fore = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(FORE_ORIGIN, a, tx, ty, w, h, label, lines);
const cabin = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(CABIN_ORIGIN, a, tx, ty, w, h, label, lines);
const bridge = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(BRIDGE_ORIGIN, a, tx, ty, w, h, label, lines);
const transit = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(TRANSIT_ORIGIN, a, tx, ty, w, h, label, lines);
const agri = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(L1_ORIGIN, a, tx, ty, w, h, label, lines);
const ring = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(R1_ORIGIN, a, tx, ty, w, h, label, lines);
const habitat = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(HABITAT_ORIGIN, a, tx, ty, w, h, label, lines);
const industrial = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(L2_ORIGIN, a, tx, ty, w, h, label, lines);
const science = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(R2_ORIGIN, a, tx, ty, w, h, label, lines);
const medical = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(MEDICAL_ORIGIN, a, tx, ty, w, h, label, lines);
const hangar = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(HANGAR_ORIGIN, a, tx, ty, w, h, label, lines);
const reactor = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(REACTOR_ORIGIN, a, tx, ty, w, h, label, lines);
const propulsion = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(PROPULSION_ORIGIN, a, tx, ty, w, h, label, lines);

// --- 0. Fore Deep-Space Sensor Array & Ablation Shield Gallery (0-300m Bow) ---

export const FORE_PROPS: readonly SceneProp[] = [
  fore("fx_screen_lit", 15, 2.5, 1, 1, "前向消融护盾传感器阵列", [
    { speaker: null, text: "嵌入多层碳化硅消融护盾后方的综合测损终端。按《远望号结构规范》，舰首最前沿不设任何实体采光窗。" },
    { speaker: null, text: "遥测示波器显示：三十年巡航累计消融厚度 18.4 厘米，结构完整度仍保持在 96.2%。" }
  ]),
  fore("fx_console", 7, 5, 2, 1, "深空广角光学望远镜台", [
    { speaker: null, text: "大型可伸缩广角光学望远镜的机械校准台。此刻光学镜筒锁死于星际尘埃偏转方位。" },
    { speaker: null, text: "辅助屏上标注着初辉恒星系的微弱引力透镜偏移参考线。" }
  ]),
  fore("fx_console", 23, 5, 2, 1, "毫米波前哨雷达工作台", [
    { speaker: null, text: "连续波毫米雷达阵列监控台，持续扫测船首正前方 0.8 天文单位内的碎冰块与陨石带。" }
  ]),
  fore("fx_switch_panel", 7, 10.5, 2, 1, "护盾层间温压配电箱", [
    { speaker: null, text: "布满实心铜闸刀的配电保护箱，保护罩表面积了一层细微的金属氧化霜。" }
  ]),
  fore("fx_terminal", 22, 10.5, 1, 1, "舰首观测维护终端", [
    { speaker: null, text: "记录着历次微型彗星擦碰警报的手工复核台账。" }
  ])
];

// --- 1. Captain's Stateroom (Tier-3 Biometric Locked at Start) ---------------

export const CABIN_PROPS: readonly SceneProp[] = [
  cabin("fx_obswall", 6, 1.2, 6, 1, "星空观测墙", [
    { speaker: null, text: "一面宽约六米的曲面显示墙。此刻它显示着船外的真实星空。" },
    { speaker: null, text: "几乎全是黑的。星星很小、很锐利，没有电影里那种拉长的亮线。" },
    { speaker: null, text: "远望号在动，但太空看久了，会以为动的是别的东西。" }
  ]),
  cabin("fx_desk", 6, 3.5, 3, 2, "舰长的办公桌", [
    { speaker: null, text: "一张低矮而宽大的办公桌。深色桌面，边缘包着一圈木料。" },
    { speaker: null, text: "嵌在桌面里的显示设备是关着的——平整得像什么都没装过。" },
    { speaker: null, text: "桌上压着几张真正的纸。边角被翻得起了毛，上面是手写的班次调整。" }
  ]),
  cabin("fx_desk_chair", 6, 5.5, 1, 1, "办公椅", [
    { speaker: null, text: "椅脚固定在地板上。在这艘船上，家具不固定就会飘走。" }
  ]),
  cabin("fx_starchart", 2, 2, 1, 3, "实体星图", [
    { speaker: null, text: "一整面星图：深色底板，星系坐标和航线用细小的发光点标出来。" },
    { speaker: null, text: "不是全息投影。是一块真正挂在那里的东西，能用手指点。" },
    { speaker: null, text: "航线只画了一条。很长，中间没有几个转弯。" }
  ]),
  cabin("fx_meeting_table", 10, 8.5, 3, 3, "会客圆桌", [
    { speaker: null, text: "一张低矮的圆形会议桌，桌面是深色木料，边缘一圈细金属。" },
    { speaker: null, text: "桌上摆着四个杯子。其中一个还冒着热气。" },
    { speaker: null, text: "唯有立下深空重功的船员，才获准踏入这间不对外公开的私人舱室。" }
  ]),
  cabin("fx_chair", 9.5, 6.5, 1, 1, "座椅", null),
  cabin("fx_chair", 10.5, 6.5, 1, 1, "座椅", null),
  cabin("fx_chair", 8.5, 8.5, 1, 1, "座椅", null),
  cabin("fx_chair", 11.5, 8.5, 1, 1, "座椅", null),
  cabin("fx_chair", 9.5, 10.5, 1, 1, "座椅", null),
  cabin("fx_chair", 10.5, 10.5, 1, 1, "座椅", null),
  cabin("fx_bed", 3, 12, 2, 3, "床铺", [
    { speaker: null, text: "被子叠得很整齐，上面横着两条约束带。" },
    { speaker: null, text: "床头面板上有一盏小小的夜灯还亮着。" }
  ]),
  cabin("fx_plant", 5.5, 11.5, 1, 1, "绿植", [
    { speaker: null, text: "一盆真正的地球植物。叶子擦得很干净。" },
    { speaker: null, text: "在这艘船上，活着的绿色比任何设备都金贵。" }
  ]),
  cabin("fx_bookshelf", 20, 12.5, 3, 1, "实体书架", [
    { speaker: null, text: "一整排纸书。书脊颜色深浅不一，看得出来是很多年攒下来的。" },
    { speaker: null, text: "有几本被翻得脱了形，用胶带重新粘过。" }
  ]),
  cabin("fx_reading_chair", 17.5, 12.5, 1, 1, "阅读椅", [
    { speaker: null, text: "一张扶手磨得发亮的椅子。房间里最不像飞船设备的东西。" }
  ]),
  cabin("fx_reading_lamp", 18.5, 14, 1, 1, "阅读灯", null),
  cabin("fx_terminal", 22, 12.5, 1, 1, "离线资料终端", [
    { speaker: null, text: "一台离线的资料终端。屏幕上停着一页没读完的《二十九年航志》手稿。" },
    { speaker: null, text: "没有联网，也没有任何人在等它回话。" }
  ]),
  cabin("fx_photo", 9, 1.2, 2, 1, "地球摄影作品", [
    { speaker: null, text: "墙上挂着一幅照片：地球，蓝色的大洋和白色的云。" },
    { speaker: null, text: "照片拍得很普通，像是随手按的。可它被装裱得很仔细。" },
    { speaker: null, text: "这是这个房间里唯一一件没有用处的设备。" }
  ]),
  cabin("fx_screen_lit", 14, 1.2, 1, 1, "信息面板", [
    { speaker: null, text: "一块亮着的信息面板，滚动着几条例行状态。" },
    { speaker: null, text: "「L-1 生态模块：正常」「散热翼：稳态全开」「初辉勘测档案：已归档」" }
  ])
];

// --- 2. The Command Bridge ---------------------------------------------------

export const BRIDGE_PROPS: readonly SceneProp[] = [
  bridge("fx_command_chair", 20, 7, 2, 3, "舰长指挥席", [
    { speaker: null, text: "舰长的席位。位置比周围的工作席高一点，但不是高出一大截。" },
    { speaker: null, text: "座椅扶手上各有一块小操作面板，边角磨得发亮。" },
    { speaker: null, text: "设定上写着：这不是王座，是一套拥有完整信息访问权限的工作站。" }
  ]),
  bridge("fx_console", 12, 6, 2, 1, "导航席", [
    { speaker: null, text: "导航席。三块固定显示屏嵌在桌面上，都亮着。" },
    { speaker: null, text: "屏幕下方是一排实体按键，没有一块是悬浮投影。" },
    { speaker: null, text: "最右边那排是黄黑相间的应急开关，盖着防护罩。" }
  ]),
  bridge("fx_console", 27, 6, 2, 1, "通信席", [
    { speaker: null, text: "通信席。除了常规面板，还留着一个老式的机械频道旋钮。" },
    { speaker: null, text: "旋钮旁边贴着手写的标签，字迹和舰长桌上那些纸是同一个人的。" }
  ]),
  bridge("fx_console_side", 7, 8, 1, 2, "动力席", [
    { speaker: null, text: "动力席。面板上有一整列反应堆状态的指示灯，此刻副散热翼展开角度已稳妥归位。" },
    { speaker: null, text: "热平衡曲线稳定在绿区。底层维修团队的功劳只在底层小群里有人提起。" }
  ]),
  bridge("fx_console_side", 32, 8, 1, 2, "防务席", [
    { speaker: null, text: "防务席。屏幕大部分是暗的。" },
    { speaker: null, text: "远望号不是战舰。这个席位平时更像个值班室，而不是火控中心。" }
  ]),
  bridge("fx_console", 14, 14, 2, 1, "科学席", [
    { speaker: null, text: "科学席。桌上堆着几份远境-IV 与初辉恒星系的打印光谱分析纸。" }
  ]),
  bridge("fx_console", 25, 14, 2, 1, "人员席", [
    { speaker: null, text: "人员席。屏幕上是一份 12,408 人的休眠状态总表。" },
    { speaker: null, text: "大部分条目后面都是同一个状态：正常。" },
    { speaker: null, text: "这个数字太大了，大到看不出它是人。" }
  ]),
  bridge("fx_holo_table", 21, 11, 3, 2, "星图工作台", [
    { speaker: null, text: "一张平放的星图台。玻璃下面是画好的航线，边上有两个实体旋钮。" },
    { speaker: null, text: "不是悬浮全息投影。整艘船上，能用手碰到的东西比能看见的更多。" }
  ]),
  bridge("fx_switch_panel", 5, 10, 2, 1, "机械应急开关", [
    { speaker: null, text: "一整排机械开关，每个旁边都有一块小铭牌。" },
    { speaker: null, text: "所以这些开关一直都在，而且一直有人定期擦拭。" }
  ]),
  bridge("fx_switch_panel", 34, 10, 2, 1, "机械应急开关", [
    { speaker: null, text: "右舷应急开关面板。安全锁闭销正静静咬合在锁槽内。" }
  ]),
  bridge("fx_paper_log", 20, 6, 1, 1, "纸质值班记录", [
    { speaker: null, text: "一块夹着值班表的板子，就搁在指挥席旁边。" },
    { speaker: null, text: "上面新添了一行战功附注：「底层巡检组手动抢险——准予临时入桥」。" }
  ]),
  bridge("fx_plant", 11, 12, 1, 1, "绿植", [
    { speaker: null, text: "舰桥人员席角落的一盆植物，叶片泛干微卷，亟待补水。" }
  ])
];

// --- 3. Central Transit Hub --------------------------------------------------

export const TRANSIT_PROPS: readonly SceneProp[] = [
  transit("fx_terminal", 23.5, 4.5, 1, 1, "交通调度终端", [
    { speaker: null, text: "远望号中央交通枢纽高速捷运调度终端。可乘坐穿梭车快速前往已获授权的开放站台。" }
  ]),
  transit("fx_screen_lit", 26.5, 2.0, 1, 1, "全舰拓扑图大屏", [
    { speaker: null, text: "大屏幕上亮着远望号全长 2800 米的纵向拓扑图——从 0m 前向消融盾一直到 2800m 尾部 1200 米展开散热羽翼。" },
    { speaker: null, text: "西侧气闸连向 L-1 生态农业模块；东侧气闸连向 R-1 生活区及 440 米双旋转环大厅。" }
  ]),
  transit("fx_chair", 7.2, 4.5, 1, 1, "候车长椅", [
    { speaker: null, text: "固定在站台甲板上的金属长椅，扶手经过防静电包覆处理。" }
  ]),
  transit("fx_chair", 9.2, 4.5, 1, 1, "候车长椅", null),
  transit("fx_switch_panel", 5.5, 9.5, 2, 1, "L-1农业模块气闸手柄", [
    { speaker: null, text: "通往 L-1 生态农业模块的连接廊桥气闸控制箱。" }
  ]),
  transit("fx_switch_panel", 28.5, 9.5, 2, 1, "R-1生活环气闸手柄", [
    { speaker: null, text: "通往 R-1 社会模块及 440 米双旋转环的离心换乘气闸。" },
    { speaker: null, text: "标牌写着：『生活环转速 1.35 rpm，外缘模拟重力 0.45g。请勿攀爬桁架』。" }
  ]),
  transit("fx_switch_panel", 9.0, 18.0, 2, 1, "站台检修开关箱", [
    { speaker: null, text: "中央站台高压接触网断路器箱，锁着安全黄牌。" }
  ]),
  transit("fx_paper_log", 25.0, 18.0, 1, 1, "轨道排班手抄表", [
    { speaker: null, text: "夹在防风夹板上的手抄排班表。清楚印着各级舱门的权限分层等级。" }
  ])
];

// --- 4. L-1 Agricultural & Ecological Module (Port Wing) --------------------

export const AGRI_PROPS: readonly SceneProp[] = [
  agri("fx_plant", 5.5, 5.0, 1, 1, "一号水培谷物培养槽", [
    { speaker: null, text: "人工全光谱灯带温和地笼罩着无土栽培的水稻、小麦与转基因高产大豆。" },
    { speaker: null, text: "整座 L-1 模块被严密绝热结构包裹——外界没有窗，全靠独立循环泵带走人工光热。" }
  ]),
  agri("fx_plant", 4.2, 4.5, 1, 1, "水培谷物株丛", null),
  agri("fx_plant", 6.8, 5.5, 1, 1, "水培谷物株丛", null),
  agri("fx_plant", 12.5, 5.0, 1, 1, "二号氧循环藻类培植池", [
    { speaker: null, text: "高密度光合固碳微藻液正发出淡淡气泡，为全船及休眠仓维持氧气份额。" }
  ]),
  agri("fx_plant", 13.8, 5.5, 1, 1, "藻类培养槽分池", null),
  agri("fx_plant", 5.5, 17.0, 1, 1, "三号根茎常绿作物苗圃", [
    { speaker: null, text: "潮湿的培养岩棉里抽出绿油油的嫩芽。农艺师们常说，闻到泥水青草味才算活着。" }
  ]),
  agri("fx_plant", 4.2, 16.5, 1, 1, "培育苗木槽", null),
  agri("fx_terminal", 12.5, 17.0, 1, 1, "营养液浓度分析终端", [
    { speaker: null, text: "实时显示钾氮磷微量元素流速与电解水循环回用效率（99.2%）。" }
  ]),
  agri("fx_switch_panel", 3.5, 11.2, 2, 1, "L-1 生态散热分流总阀", [
    { speaker: null, text: "L-1 模块最关键的独立散热总阀——把全光谱植物灯产生的废热直接排往主散热环。" },
    { speaker: null, text: "阀体表面能感觉到微妙的不规则高频震颤……主冷却总管压力确实有点偏高。" }
  ])
];

// --- 5. R-1 Social Module & Rotating Ring Atrium (Starboard Wing) -----------

export const RING_PROPS: readonly SceneProp[] = [
  ring("fx_meeting_table", 11.0, 5.5, 3, 3, "生活环休憩交谊圆桌", [
    { speaker: null, text: "R-1 社会模块公共交谊厅。下班船员和刚解冻适应重力的技术员常来这里喝合成麦芽茶。" },
    { speaker: null, text: "从这往东穿过桁架电梯就能进入 440 米直径的双反向旋转生活环。" }
  ]),
  ring("fx_chair", 9.0, 5.5, 1, 1, "休整座椅", null),
  ring("fx_chair", 13.0, 5.5, 1, 1, "休整座椅", null),
  ring("fx_chair", 11.0, 3.5, 1, 1, "休整座椅", null),
  ring("fx_plant", 17.0, 4.5, 1, 1, "观景廊绿植", null),
  ring("fx_bookshelf", 10.5, 15.5, 3, 1, "公共人文怀旧图书角", [
    { speaker: null, text: "摆满影印纸本书、老机械图鉴和二十年前带出地球的旧电影刊物。" }
  ]),
  ring("fx_reading_chair", 8.5, 17.8, 1, 1, "休息角扶手椅", [
    { speaker: null, text: "布面旧得起了球，但靠上去很安心。" }
  ]),
  ring("fx_reading_chair", 10.5, 17.8, 1, 1, "休息角扶手椅", null),
  ring("fx_reading_lamp", 12.5, 17.8, 1, 1, "温馨阅读地灯", null),
  ring("fx_switch_panel", 17.5, 11.2, 2, 1, "旋转环离心重力调速指示箱", [
    { speaker: null, text: "透过右侧耐压弧窗，可见 440 米巨型生活环如星舰巨轮般悄然缓缓旋转，双环反向对消掉全部旋转扭矩。" },
    { speaker: null, text: "表盘显示：当前环外缘稳态离心重力为 0.45g，结构轴承噪声零异常。" }
  ])
];

// --- 6. Crew Habitat & Mess Hall (Starting Zone!) ---------------------------

export const HABITAT_PROPS: readonly SceneProp[] = [
  habitat("fx_bed", 3.6, 3.5, 1.2, 1.85, "船员起居铺位", [
    { speaker: null, text: "公共宿舍区 A1 隔间的标准单人窄铺。防失重睡眠约束带刚解开，薄绒毯还留着体温。" },
    { speaker: null, text: "床头小格里放着二班巡检排班单——例行晨起巡检从这里开始。" }
  ]),
  habitat("fx_bookshelf", 2.0, 3.5, 1.0, 1.5, "A1 个人储物柜", [
    { speaker: null, text: "嵌入隔墙的单人铁皮储物柜，门锁贴着二班工号标签「02-308 徐」。" },
    { speaker: null, text: "里面整齐码放着绝缘手套、备用工装和内务安检回执。暗格夹层似乎还夹着薄薄的纸片。" }
  ]),
  habitat("fx_bed", 8.6, 3.5, 1.2, 1.85, "邻铺夜班床位", [
    { speaker: null, text: "A2 隔间夜班机修工友小宋的铺位，床单折得像豆腐块，墙角挂着满是油污的减震工作服。" }
  ]),
  habitat("fx_bookshelf", 10.0, 3.5, 1.0, 1.5, "A2 隔间储物柜", [
    { speaker: null, text: "小宋的个人储物柜。顶格塞着半包润喉糖和几本翻卷了边的数控车床刀具手册。" }
  ]),
  habitat("fx_chair", 3.2, 6.8, 1, 1, "寝室固定椅", null),
  habitat("fx_reading_lamp", 7.5, 6.8, 1, 1, "寝室夜灯", null),
  habitat("fx_bed", 3.6, 17.8, 1.2, 1.85, "备用轮值铺位", [
    { speaker: null, text: "南宿舍 B1 隔间工友的床铺，被子按照内务条例整整齐齐压进约束扣。" }
  ]),
  habitat("fx_bed", 8.6, 17.8, 1.2, 1.85, "轮休狭铺", null),
  habitat("fx_chair", 3.5, 15.0, 1, 1, "宿舍矮凳", null),
  habitat("fx_meeting_table", 23.5, 4.5, 3, 3, "公共餐桌", [
    { speaker: null, text: "生活区公共餐桌。浅木纹复合阻燃台面带有一圈防溢饮水杯凹槽。" },
    { speaker: null, text: "上面留着半杯已经晾凉的温水，和几张刚签收完的值班饭票。" }
  ]),
  habitat("fx_chair", 21.5, 4.5, 1, 1, "固定餐椅", null),
  habitat("fx_chair", 25.5, 4.5, 1, 1, "固定餐椅", null),
  habitat("fx_chair", 23.5, 2.3, 1, 1, "固定餐椅", null),
  habitat("fx_chair", 23.5, 6.7, 1, 1, "固定餐椅", null),
  habitat("fx_console", 28.5, 3.2, 1.0, 1.8, "全自动恒温暖餐柜", [
    { speaker: null, text: "公共配餐中心的自动恒温暖餐柜，出餐口弥漫着烘烤麦芽与大豆蛋白的温热香气。" },
    { speaker: null, text: "保温格里整齐码着保温杯与加热餐盒，指示灯呈温暖的橙黄色。" }
  ]),
  habitat("fx_terminal", 28.2, 5.8, 1, 1, "营养配餐终端", [
    { speaker: null, text: "自动化合成食品补给站。底层二班每天按工号定量领取蛋白质膏、压干谷饼和饮用水。" }
  ]),
  habitat("fx_plant", 20.8, 2.0, 1, 1, "食堂窗台绿植", null),
  habitat("fx_paper_log", 20.8, 15.0, 1, 1, "船员便签留言板", [
    { speaker: null, text: "软木板上密密麻麻钉着三十年来船员写的便签：" },
    { speaker: null, text: "「老周，你落在值班室台沿底的三号铬钒管路扳手，谁眼神好自己摸一下领回去还老头。」「周日配餐加菜：脱水素丸。」" }
  ]),
  habitat("fx_plant", 21.2, 18.0, 1, 1, "水培生机展示槽", [
    { speaker: null, text: "生活区公共植物槽中茂盛生长的地球常春藤——全区最有温度的色彩。" }
  ]),
  habitat("fx_reading_chair", 23.2, 18.0, 1, 1, "休闲阅读椅", null),
  habitat("fx_reading_lamp", 24.2, 19.2, 1, 1, "休闲角落暖灯", null),
  habitat("fx_bookshelf", 22.5, 20.8, 3, 1, "公共闲书架", null),
  habitat("fx_terminal", 28.5, 15.5, 1, 1, "水循环监测阀台", [
    { speaker: null, text: "生活区二级水净化处理终端（已用防水格栅墙隔离在湿区机房）。指针稳定落在绿区，纯净度 99.98%。" }
  ])
];

// --- 7. L-2 Heavy Industrial & Manufacturing Bay (Open Starting Wing!) ------

export const INDUSTRIAL_PROPS: readonly SceneProp[] = [
  industrial("fx_console", 4.5, 5.0, 2, 1, "激光数控镗铣车床", [
    { speaker: null, text: "大型数控镗铣车床。飞船自身三十年的小修小补零件全靠这台 L-2 主力老伙计加工成型。" },
    { speaker: null, text: "左侧厚窗外就是悬空机械臂吊架，深空极寒就在几十毫米厚的防爆玻璃之外。" }
  ]),
  industrial("fx_holo_table", 11.0, 5.5, 3, 2, "机械臂液压装配台", [
    { speaker: null, text: "重工业模块的四轴液压组装平台。台上卡着一截正待更换耐热衬垫的散热回路备用联轴器。" },
    { speaker: null, text: "压力表、扭矩扳手与电子校零盒一字排开——这是底层机修工最熟悉的工作现场。" }
  ]),
  industrial("fx_switch_panel", 4.5, 16.5, 2, 1, "真空焊切机械臂控制柜", [
    { speaker: null, text: "用于远程操控外舷冷焊机械臂的双摇杆重工业控制台。指示灯呈平稳待机蓝。" }
  ]),
  industrial("fx_paper_log", 18.5, 14.5, 1, 1, "重工备件领用台账", [
    { speaker: null, text: "放在钳工领料隔音前厅里的实体登记本，沾着黑机油，记满了高负荷阀芯与密封圈的领用记录。" }
  ]),
  industrial("fx_terminal", 5.0, 2.5, 1, 1, "材料应力探伤终端", [
    { speaker: null, text: "超声探伤仪屏幕不断回放焊缝波形：「主龙骨承受应力在安全上限以内」。" }
  ])
];

// --- 8. R-2 Deep-Space Science & Exploration Lab (Starboard Wing) -----------

export const SCIENCE_PROPS: readonly SceneProp[] = [
  science("fx_holo_table", 11.5, 5.0, 3, 2, "深空光谱折射测绘台", [
    { speaker: null, text: "高精度光学与尘埃光谱折射测绘台，直连舰体外舷广角传感器阵列。" },
    { speaker: null, text: "图谱末端标注着一组刚刚出现的高能碎冰粉尘反射峰——远望号正在掠过一条未标绘的小型星际尘埃微带。" }
  ]),
  science("fx_terminal", 16.5, 5.0, 1, 1, "星系尘埃组分分析仪", [
    { speaker: null, text: "连续抓取初辉恒星系外围微陨石碎屑质谱数据的分析工作站。" }
  ]),
  science("fx_desk", 11.5, 17.5, 3, 2, "地外矿物样本精密台", [
    { speaker: null, text: "负压密封样品操作台，此刻空置等待着未来拓荒小队带回异星岩石与水冰样本。" }
  ]),
  science("fx_bookshelf", 16.0, 19.0, 3, 1, "科研手抄档案架", [
    { speaker: null, text: "按照地球年代整理的光谱定标卷宗与前哨无人探测器遥测打印稿。" }
  ])
];

// --- 9. Central Medical & Cryo-Stasis Bay -----------------------------------

export const MEDICAL_PROPS: readonly SceneProp[] = [
  medical("fx_holo_table", 15.5, 11.5, 3, 2, "生理全景诊断台", [
    { speaker: null, text: "中央医疗中心的生理多参数全景诊断台。配备失重负压吸附与深层组织扫描阵列。" }
  ]),
  medical("fx_bed", 15.0, 15.0, 2, 3, "医疗监护病床", [
    { speaker: null, text: "浅灰白色的医用可调软垫病床，配有独立的生命体征遥测腕带。" }
  ]),
  medical("fx_terminal", 13.5, 8.5, 1, 1, "休眠生理监测终端", [
    { speaker: null, text: "直连四个独立休眠分仓阵列的中央巡检终端。屏幕显示着实时冷凝回路状态：" },
    { speaker: null, text: "「休眠总人数：12,408 / 12,408」「生理代谢抑制率：99.7%」「低温维生母线：四分仓独立运行」" }
  ]),
  medical("fx_bed", 5.5, 5.8, 2, 3, "休眠舱框架·第1组", [
    { speaker: null, text: "第一分仓独立的冷冻休眠舱阵列，冷机维持 -135℃ 深眠，观测窗结着一层薄薄白霜。" }
  ]),
  medical("fx_bed", 5.5, 16.5, 2, 3, "休眠舱框架·第2组", [
    { speaker: null, text: "第二分仓独立冷冻框架。蓝绿色的生命监测微光在暗处安静地跳动。" }
  ]),
  medical("fx_bed", 24.5, 5.8, 2, 3, "休眠舱框架·第3组", [
    { speaker: null, text: "第三分仓独立冷冻框架。冷凝循环管道微微发凉。" }
  ]),
  medical("fx_bed", 24.5, 16.5, 2, 3, "休眠舱框架·第4组", [
    { speaker: null, text: "第四分仓独立冷冻框架。这里沉睡着未来的首批地面拓荒工程师们。" }
  ]),
  medical("fx_switch_panel", 17.5, 20.2, 2, 1, "后部工业区安全隔离轮", [
    { speaker: null, text: "通向 1850-2800m 后部机库与高危聚变动力区的重压水密隔离轮。" },
    { speaker: null, text: "平日锁死封闭；仅在全舰切入【特级损管动员】时强制放行机械抢修人员。" }
  ])
];

// --- 10. EVA Airlock & Shuttle Hangar Bay -----------------------------------

export const HANGAR_PROPS: readonly SceneProp[] = [
  hangar("fx_terminal", 6.0, 5.5, 1, 1, "穿梭机登机舷梯控制台", [
    { speaker: null, text: "短途地表穿梭机「拓荒者一号」的停泊登艇梯。" },
    { speaker: null, text: "机身覆盖耐磨防烧蚀绝热瓦。通过第一章危机并获指挥授权后，可驾艇勘测初辉恒星系与远境-IV。" }
  ]),
  hangar("fx_bed", 5.5, 9.5, 2, 3, "穿梭机磁吸主泊位", [
    { speaker: null, text: "穿梭机重型磁吸液压停泊基座。仪表显示电磁锁止状态正常。" }
  ]),
  hangar("fx_screen_lit", 24.5, 2.0, 1, 1, "机库气压监测屏", [
    { speaker: null, text: "加压整备间气压监测大屏：内部 101.3 kPa，西侧发射区外为深空真空。" }
  ]),
  hangar("fx_switch_panel", 27.5, 4.5, 2, 1, "重型防热工程服备勤架", [
    { speaker: null, text: "悬挂在加压锁柜上的重型耐高温工程作业服，配备陶瓷胸甲与独立高压呼吸循环背包。" }
  ]),
  hangar("fx_chair", 23.5, 6.8, 1, 1, "整备换装座椅", null),
  hangar("fx_chair", 23.5, 10.5, 1, 1, "整备换装座椅", null),
  hangar("fx_terminal", 27.5, 12.5, 1, 1, "便携高压氧气充气柱", [
    { speaker: null, text: "工程作业服呼吸气瓶快速充气站，压力表指针稳定在 30 MPa 满格绿区。" }
  ])
];

// --- 11. Reactor Auxiliary Heat-Sink Station --------------------------------

export const REACTOR_PROPS: readonly SceneProp[] = [
  reactor("fx_holo_table", 15.5, 6.5, 3, 2, "聚变反应堆状态监测台", [
    { speaker: null, text: "后部两座物理隔离反应堆的热负荷遥测工作台。" },
    { speaker: null, text: "显示第一回路与第二回路的实时热平衡曲面。深空中废热无法散发，全舰全靠南边展开千米的巨型散热羽翼。" }
  ]),
  reactor("fx_switch_panel", 6.0, 8.5, 2, 1, "应急旁路泄压转轮", [
    { speaker: null, text: "位于独立防护间内、带有厚重机械齿轮啮合的巨型红色泄压手轮。手动操作能迅速释放过载高压冷却蒸气。" }
  ]),
  reactor("fx_switch_panel", 25.5, 8.5, 2, 1, "副散热翼机械强制展开栓", [
    { speaker: null, text: "被黄色防误触护罩罩住的重型液压释放杠杆。紧急时利用爆破火工品弹开备用散热翼！" }
  ]),
  reactor("fx_terminal", 15.5, 13.5, 1, 1, "散热循环压力双针表", [
    { speaker: null, text: "第一回路与副回路压力双联机械指针表。南侧通门直抵尾部主推进阵列与散热翼传动长廊。" }
  ])
];

// --- 12. Aft Propulsion & 1,200m Radiator Wing Gallery ----------------------

export const PROPULSION_PROPS: readonly SceneProp[] = [
  propulsion("fx_console", 7.0, 10.5, 2, 1, "左舷磁约束聚变喷口控制台", [
    { speaker: null, text: "远望号尾部磁约束聚变推进主喷口的流场监测台。高能等离子尾焰在此经过重重磁场导流后喷入深空。" }
  ]),
  propulsion("fx_switch_panel", 13.5, 10.0, 2, 1, "左翼600米辐射散热展收油压箱", [
    { speaker: null, text: "左侧延伸出去六百余米的炽红散热面板液压转轴总箱。即便只开三成功率巡航，整翼仍散发着暗红红外热辉。" }
  ]),
  propulsion("fx_holo_table", 28.0, 10.0, 3, 2, "主推进矢量与千瓦级热平衡总台", [
    { speaker: null, text: "跨越 100 米宽舰尾的总控诊断平台。屏幕标注：『总展翼跨度 1,200 m，两座主磁约束反应堆正常输出』。" }
  ]),
  propulsion("fx_switch_panel", 42.5, 10.0, 2, 1, "右翼600米辐射散热展收油压箱", [
    { speaker: null, text: "右侧可展大型散热羽翼机械作动总成——刚才正是这里的液压限位销被微碎片崩卡，差点引发堆芯热失控。" }
  ]),
  propulsion("fx_console", 49.0, 10.5, 2, 1, "右舷磁约束聚变喷口控制台", [
    { speaker: null, text: "右舷两座主推力喷口校准席。喷管冷却循环管道粗如合抱大树。" }
  ]),
  propulsion("fx_terminal", 3.5, 7.5, 1, 1, "左翼辐射温场直视端", [
    { speaker: null, text: "望向窗外真空，一片绵延半公里多的巨大暗红金属羽翼正在沉默地将远望号的心跳热流吐入极寒黑夜。" }
  ]),
  propulsion("fx_terminal", 52.5, 7.5, 1, 1, "右翼辐射温场直视端", [
    { speaker: null, text: "右侧巨大展开翼犹如钢铁翼龙的骨骼，几根应急副翅正在稳定放射出橘红色热辐射余晖。" }
  ])
];

export const SHIP_PROPS: readonly SceneProp[] = [
  ...FORE_PROPS,
  ...CABIN_PROPS,
  ...BRIDGE_PROPS,
  ...TRANSIT_PROPS,
  ...AGRI_PROPS,
  ...RING_PROPS,
  ...HABITAT_PROPS,
  ...INDUSTRIAL_PROPS,
  ...SCIENCE_PROPS,
  ...MEDICAL_PROPS,
  ...HANGAR_PROPS,
  ...REACTOR_PROPS,
  ...PROPULSION_PROPS
];

// --- Crew Aboard -------------------------------------------------------------

export const SHIP_PEOPLE: readonly ScenePerson[] = [
  {
    id: "captain",
    name: "舰长",
    assetId: "npc_captain",
    x: (BRIDGE_ORIGIN.tx + 20) * TILE,
    y: (BRIDGE_ORIGIN.ty + 9.5) * TILE,
    facing: "up",
    promptLabel: "和舰长说话",
    lines: [
      { speaker: "舰长", text: "你上来了。这是舰桥。" },
      { speaker: "舰长", text: "我平时很少让基层直接进核心席——规矩是这艘船飞三十年不散架的骨头。" },
      { speaker: "舰长", text: "那些开关都是真的。屏幕会坏，投影会断，开关不会。" },
      { speaker: "舰长", text: "我的私人舱室就在走廊北侧隔门里。非获特批莫入。" },
      { speaker: "舰长", text: "下去把本职办妥吧。" }
    ]
  },
  {
    id: "navigator",
    name: "领航员",
    assetId: "crew_down_idle",
    x: (BRIDGE_ORIGIN.tx + 11) * TILE,
    y: (BRIDGE_ORIGIN.ty + 6.5) * TILE,
    facing: "down",
    promptLabel: "和领航员说话",
    lines: [
      { speaker: "领航员", text: "哎，别踩进来，前方是主星图投影区。" },
      { speaker: "领航员", text: "三十年了，这条线基本没怎么弯过。看久了会以为飞船根本没在动。" },
      { speaker: "领航员", text: "你们底层损管这回把主热回路救回来了——指挥席记在航行日志里。" }
    ]
  }
];

export const OTHER_CREW: readonly ScenePerson[] = [
  {
    id: "dorm_roommate",
    name: "夜班机工小宋",
    assetId: "crew_down_idle",
    x: (HABITAT_ORIGIN.tx + 9.5) * TILE,
    y: (HABITAT_ORIGIN.ty + 6.5) * TILE,
    facing: "left",
    promptLabel: "和夜班机工小宋说话",
    lines: [
      { speaker: "小宋", text: "哈欠……小徐你醒啦？昨晚后半夜 L-2 车间那台激光车床主轴有点咬死，我折腾到清晨四点才回舱躺下。" },
      { speaker: "小宋", text: "待会下 L-2 记得帮我瞄一眼镗铣机油温——老周那脾气你是知道的，要是车间读数没核准，他准得扣咱们中层卡。" }
    ]
  },
  {
    id: "cook_ma",
    name: "配餐员老马",
    assetId: "crew_down_idle",
    x: (HABITAT_ORIGIN.tx + 26.2) * TILE,
    y: (HABITAT_ORIGIN.ty + 5.2) * TILE,
    facing: "right",
    promptLabel: "和配餐员老马说话",
    lines: [
      { speaker: "老马", text: "早啊小徐！今天早班伙食是烘烤高蛋白麦芽饮配脱水谷饼，刚从恒温暖餐柜里盛出来。" },
      { speaker: "老马", text: "这几十年来天天吃合成膏，也就温热这口麦芽汤能喝出点地球家乡的味道。干活前先喝一口暖暖肠胃吧！" }
    ]
  },
  {
    id: "transit_guard",
    name: "交通调度员",
    assetId: "crew_down_idle",
    x: (TRANSIT_ORIGIN.tx + 22.0) * TILE,
    y: (TRANSIT_ORIGIN.ty + 4.8) * TILE,
    facing: "down",
    promptLabel: "和交通调度员说话",
    lines: [
      { speaker: "调度员小刘", text: "中央交通站第二班调度一切正常。" },
      { speaker: "调度员小刘", text: "西侧气闸去 L-1 农业区，东侧通向 R-1 生活与 440 米双旋转环。" },
      { speaker: "调度员小刘", text: "北面再往前就是指挥控制防暴门——没拿军官外勤通行令可刷不开，别硬闯啊。" }
    ]
  },
  {
    id: "agronomist",
    name: "生态农艺师林芸",
    assetId: "crew_down_idle",
    x: (L1_ORIGIN.tx + 13.5) * TILE,
    y: (L1_ORIGIN.ty + 11.5) * TILE,
    facing: "left",
    promptLabel: "和生态农艺师说话",
    lines: [
      { speaker: "林芸", text: "刚领到中层卡？欢迎来到全船氧气和新鲜食物的源头——L-1 模块。" },
      { speaker: "林芸", text: "这里四面全是隔热死壁，没窗户的，不然外界零下两百七十度直灌进来，菜苗一秒钟就得冻死。" },
      { speaker: "林芸", text: "不过西边的生态散热分流阀刚才有点异响，麻烦帮我刷卡核对下读数吧。" }
    ]
  },
  {
    id: "ring_steward",
    name: "生活环值守阿诚",
    assetId: "crew_down_idle",
    x: (R1_ORIGIN.tx + 14.5) * TILE,
    y: (R1_ORIGIN.ty + 11.5) * TILE,
    facing: "down",
    promptLabel: "和生活环值守说话",
    lines: [
      { speaker: "阿诚", text: "来歇口气啊？往东边窗外看，就是那对反向对消扭矩的 440 米大环。" },
      { speaker: "阿诚", text: "生活环里头有 0.45g 模拟重力，水杯终于能安稳放桌面上了——等当完这班，申请调休进环里睡个整觉！" }
    ]
  },
  {
    id: "engineer",
    name: "轮机检修员",
    assetId: "crew_down_idle",
    x: (HABITAT_ORIGIN.tx + 13.8) * TILE,
    y: (HABITAT_ORIGIN.ty + 11.8) * TILE,
    facing: "left",
    promptLabel: "和轮机检修员说话",
    lines: [
      { speaker: "老周", text: "睡醒了就麻利过来点卯！别指望上面那些军官舱门给你开着。" },
      { speaker: "老周", text: "咱们是底层工勤二班，现在只准在这片生活舱和西面 L-2 车间干活。" }
    ]
  },
  {
    id: "mechanic_liu",
    name: "重工技师大刘",
    assetId: "crew_down_idle",
    x: (L2_ORIGIN.tx + 13.5) * TILE,
    y: (L2_ORIGIN.ty + 8.5) * TILE,
    facing: "down",
    promptLabel: "和重工技师说话",
    lines: [
      { speaker: "大刘", text: "叮当——欢迎来 L-2！这儿整天机油味掺电焊火花，不像上面指挥区那么体面。" },
      { speaker: "大刘", text: "北面那台机械臂液压装配台我刚刚校到一半，你正好过来看看压力读数，顺手签了巡检单好找老周领中层通行条！" }
    ]
  },
  {
    id: "researcher_su",
    name: "光谱研究员苏博士",
    assetId: "crew_down_idle",
    x: (R2_ORIGIN.tx + 8.5) * TILE,
    y: (R2_ORIGIN.ty + 6.0) * TILE,
    facing: "right",
    promptLabel: "和光谱研究员说话",
    lines: [
      { speaker: "苏博士", text: "先别急着出 R-2——你看今天早晨的光谱折射测绘台了吗？" },
      { speaker: "苏博士", text: "前向尘埃带反射峰比昨天高了四个数量级，我已经报给指挥网但还没回音。你们底层管网待会得多留神右舷外板散热翼。" }
    ]
  },
  {
    id: "medic",
    name: "休眠监护员",
    assetId: "crew_down_idle",
    x: (MEDICAL_ORIGIN.tx + 17.2) * TILE,
    y: (MEDICAL_ORIGIN.ty + 9.8) * TILE,
    facing: "left",
    promptLabel: "和休眠监护员说话",
    lines: [
      { speaker: "陈医生", text: "嘘……请放轻脚步。" },
      { speaker: "陈医生", text: "一万两千四百零八名拓荒者在这片冷凝光晕里沉睡，生理代谢降到了千分之三。" },
      { speaker: "陈医生", text: "南面重闸外头就是高危工业和推进段，平素是不开的，核完休眠监测端早点回去报给老周吧。" }
    ]
  }
];

export const ALL_SHIP_PEOPLE: readonly ScenePerson[] = [...SHIP_PEOPLE, ...OTHER_CREW];

/** What the HUD calls each part of the ship across all 16 Places. */
export const PLACE_LABELS: Record<Place, string> = {
  fore_sensors: "远望号 · 舰首探测与消融护盾廊",
  bridge: "远望号 · 舰桥",
  passage: "远望号 · 指挥舱通道",
  cabin: "远望号 · 舰长室",
  transit_corridor: "远望号 · 主干联络道",
  transit_hub: "远望号 · 中央交通枢纽",
  agri_module: "远望号 · L-1 生态农业模块",
  ring_module: "远望号 · R-1 生活环大厅",
  crew_habitat: "远望号 · 船员生活区",
  industrial_bay: "远望号 · L-2 重工业车间",
  science_lab: "远望号 · R-2 科研实验舱",
  medical_bay: "远望号 · 医疗与休眠舱",
  hangar_bay: "远望号 · 穿梭机机库",
  reactor_bay: "远望号 · 动力排险泵房",
  propulsion_aft: "远望号 · 舰尾聚变推进与散热翼廊",
  structure: "远望号 · 结构区"
};
