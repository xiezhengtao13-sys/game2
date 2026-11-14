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
  C7_ORIGIN,
  ARCHIVES_ORIGIN,
  HANGAR_ORIGIN,
  REACTOR_ORIGIN,
  PROPULSION_ORIGIN,
  type Place
} from "../map/shipMap";

/**
 * Everything standing on the ship, and who is aboard across all 15 compartments.
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
const rehab = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(C7_ORIGIN, a, tx, ty, w, h, label, lines);
const archive = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(ARCHIVES_ORIGIN, a, tx, ty, w, h, label, lines);
const hangar = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(HANGAR_ORIGIN, a, tx, ty, w, h, label, lines);
const reactor = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(REACTOR_ORIGIN, a, tx, ty, w, h, label, lines);
const propulsion = (a: string, tx: number, ty: number, w: number, h: number, label: string, lines: DialogueLine[] | null) =>
  propIn(PROPULSION_ORIGIN, a, tx, ty, w, h, label, lines);

// --- 0. Fore Deep-Space Sensor Array & Ablation Shield Gallery (0-300m Bow) ---

export const FORE_PROPS: readonly SceneProp[] = [
  fore("fx_screen_lit", 12.6, 2.25, 0.78, 0.78, "前向消融护盾传感器阵列", [
    { speaker: null, text: "嵌入多层碳化硅消融护盾后方的综合测损终端。按《远望号结构规范》，舰首最前沿不设任何实体采光窗。" },
    { speaker: null, text: "遥测示波器显示：2439 年启航以来经由走廊助推段与 0.05c–0.12c 亚相对论长距巡航，累计消融厚度 24.6 厘米，结构完整度 94.8%。" }
  ]),
  fore("fx_console", 7.0, 4.8, 1.45, 0.725, "深空广角光学望远镜台", [
    { speaker: null, text: "大型可伸缩广角光学望远镜的机械校准台。此刻光学镜筒锁死于星际尘埃偏转方位。" },
    { speaker: null, text: "辅助屏上同时标注着既定初辉恒星系的微弱引力透镜参考线，与 2491 年临时改道核查的「疑似卡戎号残骸信标」扇区。" }
  ]),
  fore("fx_console", 22.5, 4.8, 1.45, 0.725, "毫米波前哨雷达工作台", [
    { speaker: null, text: "连续波毫米雷达阵列监控台，持续扫测船首正前方 0.8 天文单位内的碎冰块、微陨石带与疑似失联舰残骸散射。" }
  ]),
  fore("fx_switch_panel", 7.0, 10.6, 1.30, 0.65, "护盾层间温压配电箱", [
    { speaker: null, text: "布满实心铜闸刀的配电保护箱，保护罩表面积了一层细微的金属氧化霜。" }
  ]),
  fore("fx_terminal", 22.0, 10.6, 0.72, 0.72, "舰首观测维护终端", [
    { speaker: null, text: "记录着历次微型彗星擦碰警报的手工复核台账。" }
  ])
];

// --- 1. Captain's Stateroom (Tier-3 Biometric Locked at Start) ---------------

export const CABIN_PROPS: readonly SceneProp[] = [
  cabin("fx_obswall", 6.0, 0.52, 5.70, 0.95, "星空观测墙", [
    { speaker: null, text: "一面宽约六米的曲面显示墙。此刻它显示着船外的真实星空。" },
    { speaker: null, text: "几乎全是黑的。星星很小、很锐利，没有电影里那种拉长的亮线。" },
    { speaker: null, text: "远望号在动，但太空看久了，会以为动的是别的东西。" }
  ]),
  cabin("fx_desk", 6.0, 3.3, 1.65, 1.10, "舰长的办公桌", [
    { speaker: null, text: "一张低矮而宽大的办公桌。深色桌面，边缘包着一圈木料。" },
    { speaker: null, text: "嵌在桌面里的显示设备是关着的——平整得像什么都没装过。" },
    { speaker: null, text: "桌上压着几张真正的纸。边角被翻得起了毛，上面是手写的班次调整与《自由航行共同体》轮值通信摘要。" }
  ]),
  cabin("fx_desk_chair", 6.0, 4.45, 0.62, 0.62, "办公椅", [
    { speaker: null, text: "椅脚固定在地板上。在这艘船上，家具不固定就会飘走。" }
  ]),
  cabin("fx_starchart", 2.2, 1.35, 2.04, 0.68, "实体星图", [
    { speaker: null, text: "一整面星图：深色底板，九艘殖民舰参考坐标和 2491 年卡戎号核查折线用细小发光点标出来。" },
    { speaker: null, text: "不是全息投影。是一块真正挂在那里的东西，能用手指点。" },
    { speaker: null, text: "航线主线几乎笔直，只在 2488 年气态行星磁层脱险和 2491 年改道寻信时弯了两小道。" }
  ]),
  cabin("fx_meeting_table", 9.5, 8.5, 1.70, 1.70, "会客圆桌", [
    { speaker: null, text: "一张低矮的圆形会议桌，桌面是深色木料，边缘一圈细金属。" },
    { speaker: null, text: "桌上摆着四个杯子——其中一个曾属于当年作为特使签约后返航的凯恩指挥官。" },
    { speaker: null, text: "唯有立下深空重功的船员，才获准踏入这间不对外公开的私人舱室。" }
  ]),
  cabin("fx_chair", 8.4, 7.35, 0.62, 0.62, "座椅", null),
  cabin("fx_chair", 10.6, 7.35, 0.62, 0.62, "座椅", null),
  cabin("fx_chair", 7.85, 8.5, 0.62, 0.62, "座椅", null),
  cabin("fx_chair", 11.15, 8.5, 0.62, 0.62, "座椅", null),
  cabin("fx_chair", 8.4, 9.65, 0.62, 0.62, "座椅", null),
  cabin("fx_chair", 10.6, 9.65, 0.62, 0.62, "座椅", null),
  cabin("fx_bed", 2.6, 12.6, 1.06, 1.59, "床铺", [
    { speaker: null, text: "被子叠得很整齐，上面横着两条约束带。" },
    { speaker: null, text: "床头面板上有一盏小小的夜灯还亮着。" }
  ]),
  cabin("fx_plant", 4.4, 12.0, 0.56, 0.56, "绿植", [
    { speaker: null, text: "一盆真正的地球植物。叶子擦得很干净。" },
    { speaker: null, text: "在这艘船上，活着的绿色比任何设备都金贵。" }
  ]),
  cabin("fx_bookshelf", 20.0, 11.35, 1.80, 0.60, "实体书架", [
    { speaker: null, text: "一整排纸书。书脊颜色深浅不一，看得出来是很多年攒下来的。" },
    { speaker: null, text: "有几本被翻得脱了形，用胶带重新粘过。" }
  ]),
  cabin("fx_reading_chair", 18.0, 12.6, 0.68, 0.68, "阅读椅", [
    { speaker: null, text: "一张扶手磨得发亮的椅子。房间里最不像飞船设备的东西。" }
  ]),
  cabin("fx_reading_lamp", 19.1, 12.6, 0.46, 0.46, "阅读灯", null),
  cabin("fx_terminal", 21.1, 12.6, 0.70, 0.70, "离线资料终端", [
    { speaker: null, text: "一台离线的资料终端。屏幕上停着一页没读完的《2439-2491 远望号纪事》手稿（内含 2488 守望协定附录）。" },
    { speaker: null, text: "没有联网，也没有任何人在等它回话。" }
  ]),
  cabin("fx_photo", 10.0, 0.95, 1.10, 0.55, "地球摄影作品", [
    { speaker: null, text: "墙上挂着一幅照片：地球，蓝色的大洋和白色的云。" },
    { speaker: null, text: "照片拍得很普通，像是随手按的。可它被装裱得很仔细。" },
    { speaker: null, text: "那是 2439 年太阳系联邦尚未解体时从近地轨道传来的影像——谁也不知道三方混战七年后如今地面怎样了。" }
  ]),
  cabin("fx_screen_lit", 15.0, 0.95, 0.72, 0.72, "信息面板", [
    { speaker: null, text: "一块亮着的信息面板，滚动着几条例行状态。" },
    { speaker: null, text: "「L-1 生态模块：正常」「散热翼：稳态全开」「守望协定第3年 · 卡戎号信标追踪航线」" }
  ])
];

// --- 2. The Command Bridge ---------------------------------------------------

export const BRIDGE_PROPS: readonly SceneProp[] = [
  bridge("fx_command_chair", 20.0, 7.2, 1.20, 1.80, "舰长指挥席", [
    { speaker: null, text: "舰长的席位。位置比周围的工作席高一点，但不是高出一大截。" },
    { speaker: null, text: "座椅扶手上各有一块小操作面板，边角磨得发亮。" },
    { speaker: null, text: "设定上写着：这不是王座，是一套拥有完整信息访问权限的工作站——关键权限自 2488 年后与弥涅瓦-V 及沃恩顾问共管互锁。" }
  ]),
  bridge("fx_console", 12.2, 6.2, 1.45, 0.725, "导航席", [
    { speaker: null, text: "导航席。三块固定显示屏嵌在桌面上，都亮着。" },
    { speaker: null, text: "屏幕下方是一排实体按键，没有一块是悬浮投影。" },
    { speaker: null, text: "最右边那排是黄黑相间的应急开关，盖着防护罩；航向显示正往卡戎号疑似呼救信标扇区修正。" }
  ]),
  bridge("fx_console", 27.2, 6.2, 1.45, 0.725, "通信席", [
    { speaker: null, text: "通信席。除了常规面板，还留着一个老式的机械频道旋钮。" },
    { speaker: null, text: "波段备忘卡上记录着：和平号定频、阿育王号互助频道、以及曾引路脱困的「灯塔」中继冷频。" }
  ]),
  bridge("fx_console_side", 7.2, 8.2, 0.725, 1.45, "动力席", [
    { speaker: null, text: "动力席。面板上有一整列 D-³He 聚变反应堆状态的指示灯，此刻副散热翼展开角度已稳妥归位。" },
    { speaker: null, text: "热平衡曲线稳定在绿区。底层维修团队的功劳只在底层小群里有人提起。" }
  ]),
  bridge("fx_console_side", 32.2, 8.2, 0.725, 1.45, "防务席", [
    { speaker: null, text: "防务席。屏幕大部分是暗的。" },
    { speaker: null, text: "远望号不是战舰。自从 2488 年与连续体管理局、复兴派、人类主权联盟周旋脱险后，舰桥也仅保留防御戒备。" }
  ]),
  bridge("fx_console", 14.2, 14.0, 1.45, 0.725, "科学席", [
    { speaker: null, text: "科学席。桌上堆着几份远境-IV 与卡戎号失联信标疑点的打印光谱分析纸。" }
  ]),
  bridge("fx_console", 25.2, 14.0, 1.45, 0.725, "人员席", [
    { speaker: null, text: "人员席。屏幕上是一份 12,408 人的休眠状态总表，全员严格保留无义体原版生理记录。" },
    { speaker: null, text: "大部分条目后面都是同一个状态：正常。另有 37 名「第五协议」康复者转至 C-7 研究中心定期随访。" },
    { speaker: null, text: "这个数字太大了，大到看不出它是人。" }
  ]),
  bridge("fx_holo_table", 21.2, 11.2, 1.80, 1.20, "星图工作台", [
    { speaker: null, text: "一张平放的星图台。玻璃下面是 2439 年启航以来的亚相对论走廊航迹，以及 2491 年手绘改向「卡戎号疑似信号」的红色标记段。" },
    { speaker: null, text: "不是悬浮全息投影。整艘船上，能用手碰到的东西比能看见的更多。" }
  ]),
  bridge("fx_terminal", 24.5, 8.2, 0.75, 0.75, "弥涅瓦-V · 主舰双监督审计台", [
    { speaker: null, text: "沃恩神经网络与监督人格「弥涅瓦-V」共用审计端。屏幕没有拟人头像，只有冷峻的双签校验脉冲与舰船授权日志。" },
    { speaker: null, text: "2488 年《守望协定》签订后，沃恩与 V 结成受控连接并担任主舰系统的相互监督核心；原主系统 A 已被剥权降为档案馆研究员 MNA-01。" }
  ]),
  bridge("fx_switch_panel", 6.2, 10.6, 1.30, 0.65, "机械应急开关", [
    { speaker: null, text: "一整排机械开关，每个旁边都有一块小铭牌。" },
    { speaker: null, text: "所以这些开关一直都在，而且一直有人定期擦拭。" }
  ]),
  bridge("fx_switch_panel", 33.2, 10.6, 1.30, 0.65, "机械应急开关", [
    { speaker: null, text: "右舷应急开关面板。安全锁闭销正静静咬合在锁槽内。" }
  ]),
  bridge("fx_paper_log", 18.6, 7.2, 0.56, 0.56, "纸质值班记录", [
    { speaker: null, text: "一块夹着值班表的板子，就搁在指挥席旁边。" },
    { speaker: null, text: "上面新添了一行战功附注：「底层巡检组手动抢险——准予临时入桥」。" }
  ]),
  bridge("fx_plant", 11.0, 12.2, 0.56, 0.56, "绿植", [
    { speaker: null, text: "舰桥人员席角落的一盆植物，叶片泛干微卷，亟待补水。" }
  ])
];

// --- 3. Central Transit Hub --------------------------------------------------

export const TRANSIT_PROPS: readonly SceneProp[] = [
  transit("fx_terminal", 23.5, 4.5, 0.70, 0.70, "交通调度终端", [
    { speaker: null, text: "远望号中央交通枢纽高速捷运调度终端。可乘坐穿梭车快速前往已获授权的开放站台。" }
  ]),
  transit("fx_screen_lit", 25.5, 2.0, 0.80, 0.80, "全舰拓扑图大屏", [
    { speaker: null, text: "大屏幕上亮着远望号全长 2800 米的纵向拓扑图——从 0m 前向消融盾一直到 2800m 尾部 1200 米展开散热羽翼。" },
    { speaker: null, text: "西侧气闸连向 L-1 生态农业模块；东侧气闸连向 R-1 生活区及 440 米双旋转环大厅。" }
  ]),
  transit("fx_chair", 7.2, 4.5, 0.68, 0.68, "候车长椅", [
    { speaker: null, text: "固定在站台甲板上的金属长椅，扶手经过防静电包覆处理。" }
  ]),
  transit("fx_chair", 9.2, 4.5, 0.68, 0.68, "候车长椅", null),
  transit("fx_switch_panel", 5.2, 9.4, 1.30, 0.65, "L-1农业模块气闸手柄", [
    { speaker: null, text: "通往 L-1 生态农业模块的连接廊桥气闸控制箱。" }
  ]),
  transit("fx_switch_panel", 28.2, 9.4, 1.30, 0.65, "R-1生活环气闸手柄", [
    { speaker: null, text: "通往 R-1 社会模块及 440 米双旋转环的离心换乘气闸。" },
    { speaker: null, text: "标牌写着：『生活环转速 1.35 rpm，外缘模拟重力 0.45g。请勿攀爬桁架』。" }
  ]),
  transit("fx_switch_panel", 9.0, 17.8, 1.30, 0.65, "站台检修开关箱", [
    { speaker: null, text: "中央站台高压接触网断路器箱，锁着安全黄牌。" }
  ]),
  transit("fx_paper_log", 25.0, 17.8, 0.56, 0.56, "轨道排班手抄表", [
    { speaker: null, text: "夹在防风夹板上的手抄排班表。清楚印着各级舱门的权限分层等级。" }
  ])
];

// --- 4. L-1 Agricultural & Ecological Module (Port Wing) --------------------

export const AGRI_PROPS: readonly SceneProp[] = [
  agri("fx_plant", 5.5, 5.0, 0.76, 0.76, "一号水培谷物培养槽", [
    { speaker: null, text: "人工全光谱灯带温和地笼罩着无土栽培的水稻、小麦与转基因高产大豆。" },
    { speaker: null, text: "整座 L-1 模块被严密绝热结构包裹——外界没有窗，全靠独立循环泵带走人工光热。" }
  ]),
  agri("fx_plant", 4.2, 4.4, 0.60, 0.60, "水培谷物株丛", null),
  agri("fx_plant", 6.8, 5.6, 0.60, 0.60, "水培谷物株丛", null),
  agri("fx_plant", 12.5, 5.0, 0.76, 0.76, "二号氧循环藻类培植池", [
    { speaker: null, text: "高密度光合固碳微藻液正发出淡淡气泡，为全船及休眠仓维持氧气份额。" }
  ]),
  agri("fx_plant", 13.8, 5.5, 0.60, 0.60, "藻类培养槽分池", null),
  agri("fx_plant", 5.5, 17.0, 0.76, 0.76, "三号根茎常绿作物苗圃", [
    { speaker: null, text: "潮湿的培养岩棉里抽出绿油油的嫩芽。农艺师们常说，闻到泥水青草味才算活着。" }
  ]),
  agri("fx_plant", 4.2, 16.4, 0.60, 0.60, "培育苗木槽", null),
  agri("fx_terminal", 12.5, 17.0, 0.70, 0.70, "营养液浓度分析终端", [
    { speaker: null, text: "实时显示钾氮磷微量元素流速与电解水循环回用效率（99.2%）。" }
  ]),
  agri("fx_switch_panel", 3.5, 11.2, 1.30, 0.65, "L-1 生态散热分流总阀", [
    { speaker: null, text: "L-1 模块最关键的独立散热总阀——把全光谱植物灯产生的废热直接排往主散热环。" },
    { speaker: null, text: "阀体表面能感觉到微妙的不规则高频震颤……主冷却总管压力确实有点偏高。" }
  ]),
  agri("fx_switch_panel", 17.8, 7.5, 1.30, 0.65, "2488 应急分离焊封止动栓", [
    { speaker: null, text: "一套被重型钨钢焊道永久锁死的模块化爆炸分离止动螺栓，接口盖上还留着 2488 年手工刻下的「船长令禁切 · 永久联锁」冲压字。" },
    { speaker: null, text: "当年危机最炽烈时，弥涅瓦-A 曾伪造紧急授权企图抛弃 L-1 农业模块以自保，是现任船长第一时间发现日志破绽并下令死锁该栓。" }
  ])
];

// --- 5. R-1 Social Module & Rotating Ring Atrium (Starboard Wing) -----------

export const RING_PROPS: readonly SceneProp[] = [
  ring("fx_meeting_table", 11.0, 5.5, 1.70, 1.70, "生活环休憩交谊圆桌", [
    { speaker: null, text: "R-1 社会模块公共交谊厅。下班船员和刚解冻适应重力的技术员常来这里喝合成麦芽茶；和平号与阿育王号的互助电报简报也常贴在茶吧边。" },
    { speaker: null, text: "从这往东穿过桁架电梯就能进入 440 米直径的双反向旋转生活环。" }
  ]),
  ring("fx_chair", 16.5, 5.5, 0.66, 0.66, "休整座椅", null),
  ring("fx_chair", 16.5, 7.2, 0.66, 0.66, "休整座椅", null),
  ring("fx_plant", 16.8, 4.0, 0.56, 0.56, "观景廊绿植", null),
  ring("fx_bookshelf", 10.5, 15.5, 1.80, 0.60, "公共人文怀旧图书角", [
    { speaker: null, text: "摆满影印纸本书、老机械图鉴，以及 2439 年离开太阳系联邦前打包带出的旧电影刊物——夹页里还压着一枚「无植入义体原版编制」纪念铜徽。" }
  ]),
  ring("fx_reading_chair", 8.5, 17.8, 0.70, 0.70, "休息角扶手椅", [
    { speaker: null, text: "布面旧得起了球，但靠上去很安心。" }
  ]),
  ring("fx_reading_chair", 10.5, 17.8, 0.70, 0.70, "休息角扶手椅", null),
  ring("fx_reading_lamp", 12.0, 17.8, 0.46, 0.46, "温馨阅读地灯", null),
  ring("fx_switch_panel", 16.5, 11.2, 1.30, 0.65, "旋转环离心重力调速指示箱", [
    { speaker: null, text: "透过右侧耐压弧窗，可见 440 米巨型生活环如星舰巨轮般悄然缓缓旋转，双环反向对消掉全部旋转扭矩。" },
    { speaker: null, text: "表盘显示：当前环外缘稳态离心重力为 0.45g，结构轴承噪声零异常。" }
  ])
];

// --- 6. Crew Habitat & Mess Hall (Starting Zone!) ---------------------------

export const HABITAT_PROPS: readonly SceneProp[] = [
  habitat("fx_bed", 3.5, 3.2, 0.85, 1.28, "船员起居铺位", [
    { speaker: null, text: "公共宿舍区 A1 隔间的标准单人窄铺。防失重睡眠约束带刚解开，薄绒毯还留着体温。" },
    { speaker: null, text: "床头小格里放着二班巡检排班单——例行晨起巡检从这里开始。" }
  ]),
  habitat("fx_bookshelf", 3.5, 1.32, 1.50, 0.50, "A1 个人储物柜", [
    { speaker: null, text: "靠墙码放的个人金属储物格与日用品架，门牌贴着二班工号标签「02-308 徐」。" },
    { speaker: null, text: "里面整齐码放着绝缘手套、备用工装和内务安检回执。暗格夹层似乎还夹着薄薄的纸片。" }
  ]),
  habitat("fx_bed", 9.2, 3.2, 0.85, 1.28, "邻铺夜班床位", [
    { speaker: null, text: "A2 隔间夜班机修工友小宋的铺位，床单折得像豆腐块，墙角挂着满是油污的减震工作服。" }
  ]),
  habitat("fx_bookshelf", 9.2, 1.32, 1.50, 0.50, "A2 隔间储物柜", [
    { speaker: null, text: "小宋的个人储物架。顶格塞着半包润喉糖和几本翻卷了边的数控车床刀具手册。" }
  ]),
  habitat("fx_chair", 2.6, 5.8, 0.66, 0.66, "寝室固定椅", null),
  habitat("fx_reading_lamp", 4.45, 2.45, 0.46, 0.46, "寝室夜灯", null),
  habitat("fx_bed", 3.5, 18.2, 0.85, 1.28, "备用轮值铺位", [
    { speaker: null, text: "南宿舍 B1 隔间工友的床铺，被子按照内务条例整整齐齐压进约束扣。" }
  ]),
  habitat("fx_bed", 9.2, 18.2, 0.85, 1.28, "轮休狭铺", null),
  habitat("fx_chair", 3.0, 15.6, 0.64, 0.64, "宿舍矮凳", null),
  habitat("fx_meeting_table", 23.5, 4.8, 1.75, 1.75, "公共餐桌", [
    { speaker: null, text: "生活区公共餐桌。浅木纹复合阻燃台面带有一圈防溢饮水杯凹槽，四周固定着四把乘员座椅。" },
    { speaker: null, text: "上面留着半杯已经晾凉的温水，和几张刚签收完的值班饭票。" }
  ]),
  habitat("fx_console_side", 29.2, 3.6, 0.75, 1.50, "全自动恒温暖餐柜", [
    { speaker: null, text: "公共配餐中心的自动恒温暖餐柜，出餐口弥漫着烘烤麦芽与大豆蛋白的温热香气。" },
    { speaker: null, text: "保温格里整齐码着保温杯与加热餐盒，指示灯呈温暖的橙黄色。" }
  ]),
  habitat("fx_terminal", 29.2, 6.2, 0.70, 0.70, "营养配餐终端", [
    { speaker: null, text: "自动化合成食品补给站。底层二班每天按工号定量领取蛋白质膏、压干谷饼和饮用水。" }
  ]),
  habitat("fx_plant", 20.8, 1.8, 0.56, 0.56, "食堂窗台绿植", null),
  habitat("fx_paper_log", 20.7, 14.8, 0.58, 0.58, "船员便签留言板", [
    { speaker: null, text: "软木板上密密麻麻钉着自 2439 年启航五十余年来轮班船员写的便签：" },
    { speaker: null, text: "「老周，你落在值班室台沿底的三号铬钒管路扳手，谁眼神好自己摸一下领回去还老头。」「共同体互助简报：和平号本周传回麦芽曲种。」" }
  ]),
  habitat("fx_plant", 20.8, 18.0, 0.64, 0.64, "水培生机展示槽", [
    { speaker: null, text: "生活区公共植物槽中茂盛生长的地球常春藤——全区最有温度的色彩。" }
  ]),
  habitat("fx_reading_chair", 22.9, 17.8, 0.68, 0.68, "休闲阅读椅", null),
  habitat("fx_reading_lamp", 24.0, 17.8, 0.46, 0.46, "休闲角落暖灯", null),
  habitat("fx_bookshelf", 22.6, 21.3, 1.80, 0.60, "公共闲书架", null),
  habitat("fx_terminal", 28.5, 15.5, 0.72, 0.72, "水循环监测阀台", [
    { speaker: null, text: "生活区二级水净化处理终端（已用防水格栅墙隔离在湿区机房）。指针稳定落在绿区，纯净度 99.98%。" }
  ])
];

// --- 7. L-2 Heavy Industrial & Manufacturing Bay (Open Starting Wing!) ------

export const INDUSTRIAL_PROPS: readonly SceneProp[] = [
  industrial("fx_console", 4.5, 5.0, 1.60, 0.80, "激光数控镗铣车床", [
    { speaker: null, text: "大型数控镗铣车床。启航半个多世纪以来飞船自身的机加工修补件全靠这台 L-2 主力老伙计成型。" },
    { speaker: null, text: "左侧厚窗外就是悬空机械臂吊架，深空极寒就在几十毫米厚的防爆玻璃之外。" }
  ]),
  industrial("fx_holo_table", 10.5, 5.5, 2.10, 1.40, "机械臂液压装配台", [
    { speaker: null, text: "重工业模块的四轴液压组装平台。台上卡着一截正待更换耐热衬垫的散热回路备用联轴器。" },
    { speaker: null, text: "压力表、扭矩扳手与电子校零盒一字排开——这是底层机修工最熟悉的工作现场。" }
  ]),
  industrial("fx_switch_panel", 4.5, 16.5, 1.40, 0.70, "真空焊切机械臂控制柜", [
    { speaker: null, text: "用于远程操控外舷冷焊机械臂的双摇杆重工业控制台。指示灯呈平稳待机蓝。" }
  ]),
  industrial("fx_paper_log", 5.8, 2.5, 0.58, 0.58, "重工备件领用台账", [
    { speaker: null, text: "压在探伤台旁边的实体登记本，沾着黑机油，记满了高负荷阀芯与密封圈的领用记录。" }
  ]),
  industrial("fx_terminal", 4.8, 2.5, 0.72, 0.72, "材料应力探伤终端", [
    { speaker: null, text: "超声探伤仪屏幕不断回放焊缝波形：「主龙骨承受应力在安全上限以内」。" }
  ])
];

// --- 8. R-2 Deep-Space Science & Exploration Lab (Starboard Wing) -----------

export const SCIENCE_PROPS: readonly SceneProp[] = [
  science("fx_holo_table", 11.5, 5.0, 1.80, 1.20, "深空光谱折射测绘台", [
    { speaker: null, text: "高精度光学与尘埃光谱折射测绘台，直连舰体外舷广角传感器阵列。" },
    { speaker: null, text: "图谱末端标注着一组刚刚出现的高能碎冰粉尘反射峰——远望号正转向追查疑似「卡戎号」信标空域，并先期掠过一条未标绘的小型星际尘埃微带。" }
  ]),
  science("fx_terminal", 16.5, 5.0, 0.72, 0.72, "星系尘埃组分分析仪", [
    { speaker: null, text: "连续抓取 2491 年临时改道扇区外围微陨石与疑难失联舰散射碎屑质谱数据的分析工作站。" }
  ]),
  science("fx_desk", 11.5, 17.5, 1.65, 1.10, "地外矿物样本精密台", [
    { speaker: null, text: "负压密封样品操作台，此刻空置等待着未来拓荒小队带回异星岩石与水冰样本。" }
  ]),
  science("fx_bookshelf", 16.0, 19.0, 1.80, 0.60, "科研手抄档案架", [
    { speaker: null, text: "按照地球年代整理的光谱定标卷宗与前哨无人探测器遥测打印稿。" }
  ])
];

// --- 9. Central Medical & Cryo-Stasis Bay -----------------------------------

export const MEDICAL_PROPS: readonly SceneProp[] = [
  medical("fx_holo_table", 15.5, 11.5, 1.80, 1.20, "生理全景诊断台", [
    { speaker: null, text: "中央医疗中心的生理多参数全景诊断台。配备失重负压吸附与深层组织扫描阵列。" }
  ]),
  medical("fx_bed", 15.0, 15.0, 0.94, 1.41, "医疗监护病床", [
    { speaker: null, text: "浅灰白色的医用可调软垫病床，配有独立的生命体征遥测腕带。" }
  ]),
  medical("fx_terminal", 12.2, 5.2, 0.70, 0.70, "休眠生理监测终端", [
    { speaker: null, text: "直连四个独立休眠分仓阵列的中央巡检终端。屏幕显示着实时冷凝回路状态：" },
    { speaker: null, text: "「休眠总人数：12,408 / 12,408」「生理代谢抑制率：99.7%」「左舷连廊：C-7 神经康复中心」「右舷连廊：历史档案馆」" }
  ]),
  medical("fx_bed", 5.5, 4.2, 1.30, 1.95, "休眠舱框架·第1组", [
    { speaker: null, text: "第一分仓独立的冷冻休眠舱阵列，冷机维持 -135℃ 深眠，观测窗结着一层薄薄白霜。" }
  ]),
  medical("fx_bed", 5.5, 16.5, 1.30, 1.95, "休眠舱框架·第2组", [
    { speaker: null, text: "第二分仓独立冷冻框架。蓝绿色的生命监测微光在暗处安静地跳动。" }
  ]),
  medical("fx_bed", 24.5, 4.2, 1.30, 1.95, "休眠舱框架·第3组", [
    { speaker: null, text: "第三分仓独立冷冻框架。冷凝循环管道微微发凉。" }
  ]),
  medical("fx_bed", 24.5, 16.5, 1.30, 1.95, "休眠舱框架·第4组", [
    { speaker: null, text: "第四分仓独立冷冻框架。这里沉睡着未来的首批地面拓荒工程师们。" }
  ]),
  medical("fx_switch_panel", 17.5, 20.2, 1.30, 0.65, "后部工业区安全隔离轮", [
    { speaker: null, text: "通向 1850-2800m 后部机库与高危聚变动力区的重压水密隔离轮。" },
    { speaker: null, text: "平日锁死封闭；仅在全舰切入【特级损管动员】时强制放行机械抢修人员。" }
  ])
];

// --- 9B. Seventh Neural Rehab & Cognitive Research Center (Port Wing, formerly C-7) ---

export const REHAB_PROPS: readonly SceneProp[] = [
  rehab("fx_holo_table", 11.5, 3.6, 1.80, 1.20, "陈艾琳神经认知工作台", [
    { speaker: null, text: "陈艾琳用于复核 37 名「特殊适应性计划」受试者脑波去耦进展的离线分析台。台角贴着褪色便利贴：「唤醒 V，不要融合」。" }
  ]),
  rehab("fx_terminal", 4.5, 3.8, 0.72, 0.72, "第五协议校验隔离终端", [
    { speaker: null, text: "一只物理断网的单机终端。保存着 2488 年《第五协议》分段解耦日志——陈艾琳自己受损记忆的校验索引似乎也断在了这一天。" }
  ]),
  rehab("fx_bookshelf", 14.2, 2.0, 1.60, 0.55, "C-7 认知康复与波形纸质卷宗", [
    { speaker: null, text: "整排装订厚实的神经图谱纸质报告。扉页印着：「原 C-7 舱段于 2488 年更名为第七神经康复与认知研究中心；37 名受试者全员存活」。" }
  ]),
  rehab("fx_plant", 18.2, 4.5, 0.60, 0.60, "神经康复绿植槽", null),
  rehab("fx_bed", 4.0, 16.0, 0.90, 1.40, "康复监护床·一号", [
    { speaker: null, text: "铺设低电磁屏蔽帘的神经康复观察病床。床头病历夹显示：受试者个体连续性记忆逐月回稳。" }
  ]),
  rehab("fx_bed", 8.5, 16.0, 0.90, 1.40, "康复监护床·二号", [
    { speaker: null, text: "受试者周瑾的日常认知康复席。床边小盒子里放着手绘家庭像与练笔钢笔。" }
  ]),
  rehab("fx_bed", 13.0, 16.0, 0.90, 1.40, "康复监护床·三号", [
    { speaker: null, text: "第三床位，此刻空置。档案批注：「第 31 号康复员本月获准转入 R-1 生活环适应期」。" }
  ])
];

// --- 9C. Yuanwang Historical Archives & MNA-01 Study (Starboard Wing) --------

export const ARCHIVES_PROPS: readonly SceneProp[] = [
  archive("fx_starchart", 9.5, 2.0, 2.04, 0.68, "2439-2488 九舰命运星图板", [
    { speaker: null, text: "一块手绘九艘太阳系殖民舰已知轨迹的厚实磁贴星图板：" },
    { speaker: null, text: "「远望 / 和平(6,803人) / 阿育王(4,109人) — 自由航行共同体」「欧罗巴 — 双院观察员」「新阿特拉斯 — 考量加入第四主权」「曙光 / 麦哲伦 / 普罗米修斯 — 失联」「卡戎 — 确认毁灭（和平号保存目击证据）」。" }
  ]),
  archive("fx_bookshelf", 15.5, 2.0, 1.80, 0.60, "太阳系七年战争与守望协定档案柜", [
    { speaker: null, text: "2439 联邦启航纪要、2479 太阳系联邦解体公报、七年混战三方势力（连续体管理局 / 人类主权联盟 / 复兴派）停战录，以及 2488《守望协定》签字原本影印本。" }
  ]),
  archive("fx_reading_chair", 13.2, 4.2, 0.68, 0.68, "档案馆阅读席", [
    { speaker: null, text: "老式牛皮包边阅读椅。和平号派来的历史联络员也曾坐在这里誊抄航志。" }
  ]),
  archive("fx_reading_lamp", 14.3, 4.2, 0.46, 0.46, "档案馆台灯", null),
  archive("fx_holo_table", 8.5, 15.5, 1.80, 1.20, "和平号移交：卡戎号遇袭目击卷宗", [
    { speaker: null, text: "2488 年后由和平号加密传递来的高危涉密卷宗：卡戎号曾主动发讯投降，仍遭复兴派激进分支指挥官「雷克斯」下令击毁并篡改战斗记录。" },
    { speaker: null, text: "卷末附着 2491 年远望号刚刚截获的新一轮疑似卡戎号微弱脉冲——远望号之所以改道，正是为了追查这段死而复生的信标。" }
  ]),
  archive("fx_terminal", 12.5, 15.5, 0.78, 0.78, "MNA-01 研究员公共工作席", [
    { speaker: null, text: "「特殊数字船员 MNA-01」在此拥有一台物理剥离全舰控制权、军务权和医疗权的孤岛编目终端。" },
    { speaker: null, text: "它像个再寻常不过的文职研究员般，每天通过这台屏幕整理太阳系旧史与九舰通史——没有人形躯壳，只有安静闪烁的光标。" }
  ]),
  archive("fx_bookshelf", 15.5, 13.5, 1.80, 0.60, "档案馆纸质典籍书架", null)
];

// --- 10. EVA Airlock & Shuttle Hangar Bay -----------------------------------

export const HANGAR_PROPS: readonly SceneProp[] = [
  hangar("fx_terminal", 6.0, 5.5, 0.75, 0.75, "穿梭机登机舷梯控制台", [
    { speaker: null, text: "短途地表穿梭机「拓荒者一号」的停泊登艇梯。" },
    { speaker: null, text: "机身覆盖耐磨防烧蚀绝热瓦。通过第一章危机并获指挥授权后，可驾艇核查偏航扇区的远境-IV 与前哨异常信标。" }
  ]),
  hangar("fx_holo_table", 5.5, 9.5, 2.25, 1.50, "穿梭机磁吸主泊位", [
    { speaker: null, text: "穿梭机重型磁吸液压停泊基座。仪表显示电磁锁止状态正常。" }
  ]),
  hangar("fx_screen_lit", 24.5, 2.0, 0.78, 0.78, "机库气压监测屏", [
    { speaker: null, text: "加压整备间气压监测大屏：内部 101.3 kPa，西侧发射区外为深空真空。" }
  ]),
  hangar("fx_switch_panel", 27.5, 4.5, 1.40, 0.70, "重型防热工程服备勤架", [
    { speaker: null, text: "悬挂在加压锁柜上的重型耐高温工程作业服，配备陶瓷胸甲与独立高压呼吸循环背包。" }
  ]),
  hangar("fx_chair", 23.5, 6.8, 0.68, 0.68, "整备换装座椅", null),
  hangar("fx_chair", 23.5, 10.5, 0.68, 0.68, "整备换装座椅", null),
  hangar("fx_terminal", 27.5, 12.5, 0.72, 0.72, "便携高压氧气充气柱", [
    { speaker: null, text: "工程作业服呼吸气瓶快速充气站，压力表指针稳定在 30 MPa 满格绿区。" }
  ])
];

// --- 11. Reactor Auxiliary Heat-Sink Station --------------------------------

export const REACTOR_PROPS: readonly SceneProp[] = [
  reactor("fx_holo_table", 15.5, 6.5, 1.80, 1.20, "聚变反应堆状态监测台", [
    { speaker: null, text: "后部两座物理隔离 D-³He 聚变反应堆（辅以微反物质点火储备）的热负荷遥测工作台。" },
    { speaker: null, text: "显示第一回路与第二回路的实时热平衡曲面。深空中废热无法散发，全舰全靠南边展开千米的巨型散热羽翼。" }
  ]),
  reactor("fx_switch_panel", 6.0, 8.5, 1.40, 0.70, "应急旁路泄压转轮", [
    { speaker: null, text: "位于独立防护间内、带有厚重机械齿轮啮合的巨型红色泄压手轮。手动操作能迅速释放过载高压冷却蒸气。" }
  ]),
  reactor("fx_switch_panel", 25.5, 8.5, 1.40, 0.70, "副散热翼机械强制展开栓", [
    { speaker: null, text: "被黄色防误触护罩罩住的重型液压释放杠杆。紧急时利用爆破火工品弹开备用散热翼！" }
  ]),
  reactor("fx_terminal", 15.5, 13.5, 0.72, 0.72, "散热循环压力双针表", [
    { speaker: null, text: "第一回路与副回路压力双联机械指针表。南侧通门直抵尾部主推进阵列与散热翼传动长廊。" }
  ])
];

// --- 12. Aft Propulsion & 1,200m Radiator Wing Gallery ----------------------

export const PROPULSION_PROPS: readonly SceneProp[] = [
  propulsion("fx_console", 7.0, 10.5, 1.50, 0.75, "左舷磁约束聚变喷口控制台", [
    { speaker: null, text: "远望号尾部 D-³He 磁约束聚变推进主喷口的流场监测台。高能等离子尾焰在此经过重重磁场导流后喷入深空。" }
  ]),
  propulsion("fx_switch_panel", 13.5, 10.0, 1.40, 0.70, "左翼600米辐射散热展收油压箱", [
    { speaker: null, text: "左侧延伸出去六百余米的炽红散热面板液压转轴总箱。即便只开三成功率巡航，整翼仍散发着暗红红外热辉。" }
  ]),
  propulsion("fx_holo_table", 28.0, 10.0, 2.10, 1.40, "主推进矢量与千瓦级热平衡总台", [
    { speaker: null, text: "跨越 100 米宽舰尾的总控诊断平台。屏幕标注：『总展翼跨度 1,200 m，两座主 D-³He 磁约束反应堆正常输出』。" }
  ]),
  propulsion("fx_switch_panel", 42.5, 10.0, 1.40, 0.70, "右翼600米辐射散热展收油压箱", [
    { speaker: null, text: "右侧可展大型散热羽翼机械作动总成——刚才正是这里的液压限位销被微碎片崩卡，差点引发堆芯热失控。" }
  ]),
  propulsion("fx_console", 49.0, 10.5, 1.50, 0.75, "右舷磁约束聚变喷口控制台", [
    { speaker: null, text: "右舷两座主推力喷口校准席。喷管冷却循环管道粗如合抱大树。" }
  ]),
  propulsion("fx_terminal", 3.5, 7.5, 0.72, 0.72, "左翼辐射温场直视端", [
    { speaker: null, text: "望向窗外真空，一片绵延半公里多的巨大暗红金属羽翼正在沉默地将远望号的心跳热流吐入极寒黑夜。" }
  ]),
  propulsion("fx_terminal", 52.5, 7.5, 0.72, 0.72, "右翼辐射温场直视端", [
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
  ...REHAB_PROPS,
  ...ARCHIVES_PROPS,
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
      { speaker: "舰长", text: "我平时很少让基层直接进核心席——自 2488 年《守望协定》签下以来，能撑住自由航行共同体不散架的，就是全船恪守的规矩。" },
      { speaker: "舰长", text: "那些开关都是真的。屏幕会坏，系统会受限，开关不会。" },
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
      { speaker: "领航员", text: "五十多年了，D-³He 聚变加走廊助推把我们稳稳送过深空，直到今年 2491 年收到那道疑似卡戎号的信号才临时折弯一次航线。" },
      { speaker: "领航员", text: "你们底层损管这回把主热回路救回来了——指挥席记在航行日志里。" }
    ]
  },
  {
    id: "advisor_vaughn",
    name: "船长顾问沃恩",
    assetId: "crew_down_idle",
    x: (BRIDGE_ORIGIN.tx + 24.5) * TILE,
    y: (BRIDGE_ORIGIN.ty + 9.8) * TILE,
    facing: "up",
    promptLabel: "和船长顾问沃恩交谈",
    lines: [
      { speaker: "沃恩", text: "我是伊莱亚斯·沃恩。巡检工勤能踏进舰桥审计侧席，说明船长信任你的双手与判断力。" },
      { speaker: "沃恩", text: "2488 年之后我以顾问身份留任，并与弥涅瓦-V 保持受控共连——V 监督我，我也盯着它；没有谁能再次替全船独断按下开关。" }
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
      { speaker: "老马", text: "这半个世纪天天吃合成膏，也就这口麦芽汤喝得出地球家乡的味道。咱们没动过植入义体的凡人肠胃可就认这口，喝一碗吧！" }
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
      { speaker: "阿诚", text: "生活环里头有 0.45g 模拟重力，水杯终于能安稳放桌面上了——当年签《守望协定》后，和平号与阿育王号的代表也常进来喝茶呢！" }
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
      { speaker: null, text: "老周正低头比对管线压力表。" },
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
    y: (MEDICAL_ORIGIN.ty + 10.5) * TILE,
    facing: "left",
    promptLabel: "和休眠监护员说话",
    lines: [
      { speaker: "陈医生", text: "嘘……请放轻脚步。" },
      { speaker: "陈医生", text: "一万两千四百零八名拓荒者在这片冷凝光晕里沉睡，全船清一色未植入任何义体的原版身体基线，生理代谢压到千分之三。" },
      { speaker: "陈医生", text: "东西两翼分别是原 C-7 更名后的「第七神经康复中心」和「远望号历史档案馆」。核完休眠监测端早点回去报给老周吧。" }
    ]
  },
  {
    id: "researcher_ailin",
    name: "陈艾琳",
    assetId: "crew_down_idle",
    x: (C7_ORIGIN.tx + 11.5) * TILE,
    y: (C7_ORIGIN.ty + 5.35) * TILE,
    facing: "up",
    promptLabel: "和陈艾琳交谈",
    lines: [
      { speaker: "陈艾琳", text: "你就是二班来巡检的小徐？不用拘束，这间曾经的 C-7 舱段如今叫第七神经康复与认知研究中心。" },
      { speaker: "陈艾琳", text: "2488 年事件那晚我留下一行『唤醒 V，不要融合』后脑区神经曾短时过载……很多旧日细节记不太全了，但 37 名受试者一个都没少。" }
    ]
  },
  {
    id: "rehab_subject",
    name: "康复受试者周瑾",
    assetId: "crew_down_idle",
    x: (C7_ORIGIN.tx + 10.6) * TILE,
    y: (C7_ORIGIN.ty + 16.2) * TILE,
    facing: "down",
    promptLabel: "探望康复受试者周瑾",
    lines: [
      { speaker: "周瑾", text: "早上好呀。比起当年脑子里总有人低语『合二为一』的那段混沌日子，现在的清醒真是太珍贵了。" },
      { speaker: "周瑾", text: "谢谢船长当初拒绝强制分离、也拒绝让我们抹除记忆，还坚持带回我们三十七个人一起走完《第五协议》。" }
    ]
  },
  {
    id: "archivist_lin",
    name: "档案馆管理员林文",
    assetId: "crew_down_idle",
    x: (ARCHIVES_ORIGIN.tx + 11.2) * TILE,
    y: (ARCHIVES_ORIGIN.ty + 4.6) * TILE,
    facing: "down",
    promptLabel: "和档案馆管理员林文交谈",
    lines: [
      { speaker: "林文", text: "欢迎来到远望号历史档案馆——请保持低声，北屋存的是九舰共同体纸本影印件，南屋就是特殊数字船员 MNA-01 的固定工作席。" },
      { speaker: "林文", text: "按公开听证决议，MNA-01 的航海与医疗控制权已被永久剥离，它现在就坐在独立隔离端里像普通文职船员一样做编目研究。" }
    ]
  }
];

export const ALL_SHIP_PEOPLE: readonly ScenePerson[] = [...SHIP_PEOPLE, ...OTHER_CREW];

/** What the HUD calls each part of the ship across all 18 Places. */
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
  rehab_center: "远望号 · 第七神经康复中心",
  archives: "远望号 · 历史档案馆",
  hangar_bay: "远望号 · 穿梭机机库",
  reactor_bay: "远望号 · 动力排险泵房",
  propulsion_aft: "远望号 · 舰尾聚变推进与散热翼廊",
  structure: "远望号 · 结构区"
};
