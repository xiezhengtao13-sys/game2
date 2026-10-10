import type { DialogueLine } from "../systems/Dialogue";
import { TILE } from "../config";
import {
  BRIDGE_ORIGIN,
  CABIN_ORIGIN,
  TRANSIT_ORIGIN,
  HANGAR_ORIGIN,
  HABITAT_ORIGIN,
  MEDICAL_ORIGIN,
  REACTOR_ORIGIN,
  type Place
} from "../map/shipMap";

/**
 * Everything standing on the ship, and who is aboard.
 *
 * One list, because the ship is one map: the cabin's furniture and the bridge's
 * stations sit in the same coordinate space, and walking between them is walking.
 *
 * Positions are authored in TILES, inside their own compartment, and converted
 * here using the compartment origins from `shipMap.ts`. That indirection is the
 * point: an earlier version wrote bridge positions with its own pixel offset,
 * which silently disagreed with where the map actually put the bridge. Rooms get
 * moved; a coordinate that is relative to the room moves with it.
 *
 * Every prop and person must be inside a compartment, on walkable deck, clear of
 * the furniture, and reachable by walking from where the player starts. Those are
 * checked by tests rather than by eye.
 */

/** Something standing on the deck that the player can look at. */
export interface SceneProp {
  assetId: string;
  /** Centre of the prop's box, in world pixels. */
  x: number;
  y: number;
  /** Size in tiles, which is also how the art is scaled. */
  w: number;
  h: number;
  label: string;
  /** What examining it says, or null for pure scenery. */
  lines: DialogueLine[] | null;
}

/** Someone aboard, standing somewhere on the ship. */
export interface ScenePerson {
  id: string;
  name: string;
  assetId: string;
  /** Their feet, in world pixels. */
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

/** A prop in the captain's quarters, positioned in that room's own tiles. */
const cabin = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(CABIN_ORIGIN, assetId, tx, ty, w, h, label, lines);

/** A prop on the bridge, positioned in that hall's own tiles. */
const bridge = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(BRIDGE_ORIGIN, assetId, tx, ty, w, h, label, lines);

// --- the captain's quarters --------------------------------------------------

export const CABIN_PROPS: readonly SceneProp[] = [
  // --- forward: the working end ---------------------------------------------
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

  // --- the social middle ------------------------------------------------------
  cabin("fx_meeting_table", 10, 8.5, 3, 3, "会客圆桌", [
    { speaker: null, text: "一张低矮的圆形会议桌，桌面是深色木料，边缘一圈细金属。" },
    { speaker: null, text: "桌上摆着四个杯子。其中一个还冒着热气。" },
    { speaker: null, text: "舰长刚刚还在这里。" }
  ]),
  cabin("fx_chair", 9.5, 6.5, 1, 1, "座椅", null),
  cabin("fx_chair", 10.5, 6.5, 1, 1, "座椅", null),
  cabin("fx_chair", 8.5, 8.5, 1, 1, "座椅", null),
  cabin("fx_chair", 11.5, 8.5, 1, 1, "座椅", null),
  cabin("fx_chair", 9.5, 10.5, 1, 1, "座椅", null),
  cabin("fx_chair", 10.5, 10.5, 1, 1, "座椅", null),

  // --- private quarters, south-west -------------------------------------------
  cabin("fx_bed", 3, 12, 2, 3, "床铺", [
    { speaker: null, text: "被子叠得很整齐，上面横着两条约束带。" },
    { speaker: null, text: "床头面板上有一盏小小的夜灯还亮着。" }
  ]),
  cabin("fx_plant", 5.5, 11.5, 1, 1, "绿植", [
    { speaker: null, text: "一盆真正的地球植物。叶子擦得很干净。" },
    { speaker: null, text: "在这艘船上，活着的绿色比任何设备都金贵。" }
  ]),

  // --- reading corner, south-east ---------------------------------------------
  cabin("fx_bookshelf", 20, 12.5, 3, 1, "实体书架", [
    { speaker: null, text: "一整排纸书。书脊颜色深浅不一，看得出来是很多年攒下来的。" },
    { speaker: null, text: "有几本被翻得脱了形，用胶带重新粘过。" }
  ]),
  cabin("fx_reading_chair", 17.5, 12.5, 1, 1, "阅读椅", [
    { speaker: null, text: "一张扶手磨得发亮的椅子。房间里最不像飞船设备的东西。" }
  ]),
  cabin("fx_reading_lamp", 18.5, 14, 1, 1, "阅读灯", null),
  cabin("fx_terminal", 22, 12.5, 1, 1, "离线资料终端", [
    { speaker: null, text: "一台离线的资料终端。屏幕上停着一页没读完的东西。" },
    { speaker: null, text: "没有联网，也没有任何人在等它回话。" }
  ]),

  // --- wall furniture ---------------------------------------------------------
  cabin("fx_photo", 9, 1.2, 2, 1, "地球摄影作品", [
    { speaker: null, text: "墙上挂着一幅照片：地球，蓝色的大洋和白色的云。" },
    { speaker: null, text: "照片拍得很普通，像是随手按的。可它被装裱得很仔细。" },
    { speaker: null, text: "这是这个房间里唯一一件没有用处的设备。" }
  ]),
  cabin("fx_screen_lit", 14, 1.2, 1, 1, "信息面板", [
    { speaker: null, text: "一块亮着的信息面板，滚动着几条例行状态。" },
    { speaker: null, text: "「L-1 生态模块：正常」「散热翼：部分展开」「当班：第二班」" }
  ])
];

// --- the bridge --------------------------------------------------------------
// The document calls this room "克制、理性和高度专业化", and states that
// long-duration stations keep physical buttons and mechanical switches rather
// than floating holograms. Almost everything here is hardware you could put a
// hand on, and the descriptions say so.

export const BRIDGE_PROPS: readonly SceneProp[] = [
  bridge("fx_command_chair", 20, 7, 2, 3, "舰长指挥席", [
    { speaker: null, text: "舰长的席位。位置比周围的工作席高一点，但不是高出一大截。" },
    { speaker: null, text: "座椅扶手上各有一块小操作面板，边角磨得发亮。" },
    { speaker: null, text: "设定上写着：这不是王座，是一套拥有完整信息访问权限的工作站。" }
  ]),

  // Navigation and communications nearest the display; power and defence at the
  // sides; science and personnel aft. The order the document lists them in.
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
    { speaker: null, text: "动力席。面板上有一整列反应堆状态的指示灯，全是绿的。" },
    { speaker: null, text: "最下面一行是散热翼角度。现在是部分展开。" }
  ]),
  bridge("fx_console_side", 32, 8, 1, 2, "防务席", [
    { speaker: null, text: "防务席。屏幕大部分是暗的。" },
    { speaker: null, text: "远望号不是战舰。这个席位平时更像个值班室，而不是火控中心。" }
  ]),
  bridge("fx_console", 14, 14, 2, 1, "科学席", [
    { speaker: null, text: "科学席。桌上堆着几份纸质打印件，还没归档。" }
  ]),
  bridge("fx_console", 25, 14, 2, 1, "人员席", [
    { speaker: null, text: "人员席。屏幕上是一份 12,408 人的休眠状态总表。" },
    { speaker: null, text: "大部分条目后面都是同一个状态：正常。" },
    { speaker: null, text: "这个数字太大了，大到看不出它是人。" }
  ]),
  bridge("fx_holo_table", 21, 11, 3, 2, "星图工作台", [
    { speaker: null, text: "一张平放的星图台。玻璃下面是画好的航线，边上有两个实体旋钮。" },
    { speaker: null, text: "不是悬浮全息投影。整艘船上，能用手碰到的东西比能看见的更多。" },
    { speaker: null, text: "航线的尽头标着一个很小的记号，旁边写着目的地编号。" }
  ]),
  bridge("fx_switch_panel", 5, 10, 2, 1, "机械应急开关", [
    { speaker: null, text: "一整排机械开关，每个旁边都有一块小铭牌。" },
    { speaker: null, text: "设定集里特意写过这一点：远望号追求先进，但不完全依赖华丽的交互界面。" },
    { speaker: null, text: "所以这些开关一直都在，而且一直有人定期擦拭。" }
  ]),
  bridge("fx_switch_panel", 34, 10, 2, 1, "机械应急开关", [
    { speaker: null, text: "另一组开关。有一两个的防护罩是打开的，像是刚被人用过。" }
  ]),
  bridge("fx_paper_log", 20, 6, 1, 1, "纸质值班记录", [
    { speaker: null, text: "一块夹着值班表的板子，就搁在指挥席旁边。" },
    { speaker: null, text: "上面是手写的班次和交接签名。舰长桌上那张表，就是从这里抄的。" }
  ]),
  bridge("fx_plant", 11, 12, 1, 1, "绿植", [
    { speaker: null, text: "舰桥上居然也有一盆植物，摆在人员席的角落里。" },
    { speaker: null, text: "叶子有点蔫。这里大概没人记得给它浇水。" }
  ])
];

// --- central transit hub ----------------------------------------------------

const transit = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(TRANSIT_ORIGIN, assetId, tx, ty, w, h, label, lines);

export const TRANSIT_PROPS: readonly SceneProp[] = [
  transit("fx_terminal", 23, 4.5, 1, 1, "交通调度终端", [
    { speaker: null, text: "远望号前部中央交通枢纽调度终端。屏幕滚动着穿梭轨道班次。" },
    { speaker: null, text: "「下一班空载巡检车：04分后进站」「L-1农业模块气压：正常」「R-1生活环联络道：正常」" }
  ]),
  transit("fx_screen_lit", 25, 2.5, 1, 1, "全舰拓扑图大屏", [
    { speaker: null, text: "大屏幕上常亮着远望号全长 2800 米的纵向结构拓扑图。" },
    { speaker: null, text: "从前向消融防护盾、指挥区，到两个旋转生活环、六大殖民模块，一直延伸到尾部庞大的聚变推进阵列与机械羽翼般的散热翼。" },
    { speaker: null, text: "你现在位于 300-950 米标段的中央交通换乘节点。" }
  ]),
  transit("fx_chair", 7, 4.5, 1, 1, "候车长椅", [
    { speaker: null, text: "固定在站台甲板上的金属长椅，扶手经过防静电包覆处理。" }
  ]),
  transit("fx_chair", 9, 4.5, 1, 1, "候车长椅", null),
  transit("fx_switch_panel", 2, 9.5, 2, 1, "L-1农业模块气闸手柄", [
    { speaker: null, text: "通往 L-1 生态农业模块的连接廊桥气闸控制箱。指示灯处于绿色巡航密封状态。" },
    { speaker: null, text: "隔着厚重的多层密封门，能隐约感受到循环泵低沉的振动。" }
  ]),
  transit("fx_switch_panel", 31, 9.5, 2, 1, "R-1生活环气闸手柄", [
    { speaker: null, text: "通往 R-1 生活与社会模块以及 440 米双旋转生活环的交通气闸。" },
    { speaker: null, text: "标牌上写着：『生活环旋转速度 1.35 rpm，外缘模拟重力 0.45g。请抓好安全扶手』。" }
  ]),
  transit("fx_switch_panel", 8, 17.5, 2, 1, "站台检修开关箱", [
    { speaker: null, text: "中央站台的接触网高压与动力断路器箱，挂着黄色安全锁定牌。" }
  ]),
  transit("fx_paper_log", 24, 17.5, 1, 1, "轨道排班手抄表", [
    { speaker: null, text: "夹在防风夹板上的手抄班次表。上面用红笔圈出了今日例行巡检的轨道区间。" }
  ])
];

// --- crew habitat & mess hall -----------------------------------------------

const habitat = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(HABITAT_ORIGIN, assetId, tx, ty, w, h, label, lines);

export const HABITAT_PROPS: readonly SceneProp[] = [
  habitat("fx_bed", 4, 4.5, 2, 3, "船员起居铺位", [
    { speaker: null, text: "标准双层船员铺位。配有防失重约束带和独立可调阅读射灯。" },
    { speaker: null, text: "床头挡板上刻着微小的划痕，记着这名船员当班执勤的天数。" }
  ]),
  habitat("fx_bed", 4, 14.5, 2, 3, "备用轮值铺位", [
    { speaker: null, text: "整洁的轮值床铺，被子按照工控内务条例卷起固定。" }
  ]),
  habitat("fx_meeting_table", 24, 5.5, 3, 3, "公共餐桌", [
    { speaker: null, text: "生活区公共餐桌。台面是浅木纹复合阻燃材料，带有防溢凹槽。" },
    { speaker: null, text: "中间的金属保温杯里还装着半杯温热的水。" }
  ]),
  habitat("fx_chair", 22.5, 5.5, 1, 1, "固定餐椅", null),
  habitat("fx_chair", 25.5, 5.5, 1, 1, "固定餐椅", null),
  habitat("fx_plant", 21, 14.5, 1, 1, "水培生机展示槽", [
    { speaker: null, text: "生活区公共植物柜中旺盛生长的小型地球常春藤。" },
    { speaker: null, text: "在无垠的冷寂星空里，一抹生机勃勃的翠绿是全船船员最好的心理锚点。" }
  ]),
  habitat("fx_paper_log", 26, 14.5, 1, 1, "船员便签留言板", [
    { speaker: null, text: "软木板上钉满了手写便签条：" },
    { speaker: null, text: "「老周，你的三号管路扳手落在站台了，给你放值班台了。」「周末休闲舱放《地球最后的夏日》，记得带自制爆米花。」" }
  ]),
  habitat("fx_terminal", 29, 5.5, 1, 1, "营养配餐终端", [
    { speaker: null, text: "自动化合成食品补给站。提供压缩合成蛋白质、高纤维饼干和恒温饮用水。" }
  ]),
  habitat("fx_terminal", 29, 15.5, 1, 1, "水循环监测阀台", [
    { speaker: null, text: "生活区二级水净化处理终端，仪表显示水质纯净度达到 99.98%。" }
  ])
];

// --- central medical & cryo-stasis bay --------------------------------------

const medical = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(MEDICAL_ORIGIN, assetId, tx, ty, w, h, label, lines);

export const MEDICAL_PROPS: readonly SceneProp[] = [
  medical("fx_holo_table", 15, 10.5, 3, 2, "生理全景诊断台", [
    { speaker: null, text: "中央医疗中心的生理多参数全景诊断台。配备失重负压吸附与深层组织扫描阵列。" },
    { speaker: null, text: "台面洁净平整，旁边的离线脑波监视仪处于待机状态。" }
  ]),
  medical("fx_bed", 15, 14.5, 2, 3, "医疗监护病床", [
    { speaker: null, text: "浅灰白色的医用可调软垫病床，配有独立的输液挂钩与生命体征遥测腕带。" }
  ]),
  medical("fx_terminal", 13, 7.5, 1, 1, "休眠生理监测终端", [
    { speaker: null, text: "直连休眠舱阵列的中央巡检终端。屏幕显示着实时冷凝回路状态：" },
    { speaker: null, text: "「休眠总人数：12,408 / 12,408」「生理代谢抑制率：99.7%」「低温维生母线：双路正常」" }
  ]),
  medical("fx_bed", 5, 4.5, 2, 3, "休眠舱框架·第1组", [
    { speaker: null, text: "多层复合材料框架中紧凑排列的冷冻休眠舱单元。" },
    { speaker: null, text: "观察窗内结着一层薄薄的白霜，蓝绿色的生命监测微光在暗处安静地跳动。" }
  ]),
  medical("fx_bed", 5, 14.5, 2, 3, "休眠舱框架·第2组", [
    { speaker: null, text: "第二组休眠舱框架。维护机器人的专用轨道沿着框架顶部笔直向前延伸。" }
  ]),
  medical("fx_bed", 23, 4.5, 2, 3, "休眠舱框架·第3组", [
    { speaker: null, text: "第三组休眠舱框架。冷凝循环管道表面微微发凉，维生流体以极其缓慢的流速循环。" }
  ]),
  medical("fx_bed", 23, 14.5, 2, 3, "休眠舱框架·第4组", [
    { speaker: null, text: "第四组休眠舱框架。这里沉睡着远望号未来的首批地面拓荒工程师们。" }
  ]),
  medical("fx_switch_panel", 15, 20.5, 2, 1, "后部工业区安全隔离轮", [
    { speaker: null, text: "厚重的重工业隔离水密闸门。门上刷着鲜艳的黄色安全斜纹。" },
    { speaker: null, text: "标牌注明：『前方为 1800-2800 米后部工业模块与主聚变动力区。需工程主管机械密钥开启』。" }
  ])
];

// --- eva airlock & shuttle hangar bay --------------------------------------

const hangar = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(HANGAR_ORIGIN, assetId, tx, ty, w, h, label, lines);

export const HANGAR_PROPS: readonly SceneProp[] = [
  hangar("fx_terminal", 6, 5.5, 1, 1, "穿梭机登机舷梯控制台", [
    { speaker: null, text: "短途地表穿梭机「拓荒者一号」的停泊登艇梯。" },
    { speaker: null, text: "机身表面覆盖着耐磨防烧蚀绝热瓦。未来抵达目标恒星系后，你将驾驶它降落勘测未知的行星表面。" }
  ]),
  hangar("fx_bed", 5, 9.5, 2, 3, "穿梭机磁吸主泊位", [
    { speaker: null, text: "穿梭机重型磁吸液压停泊基座。仪表显示电磁锁止状态正常。" }
  ]),
  hangar("fx_screen_lit", 24, 2.5, 1, 1, "机库气压监测屏", [
    { speaker: null, text: "机库主气闸舱内外气压监测大屏：内部 101.3 kPa，外部为深空真空。" }
  ]),
  hangar("fx_switch_panel", 27, 4.5, 2, 1, "重型防热工程服备勤架", [
    { speaker: null, text: "悬挂在加压锁柜上的三套重型耐高温工程作业服。" },
    { speaker: null, text: "胸口配有加厚隔热陶瓷胸甲与独立高压闭路呼吸背包，专门用于高温机舱抢险。" }
  ]),
  hangar("fx_terminal", 27, 10.5, 1, 1, "便携高压氧气充气柱", [
    { speaker: null, text: "工程作业服呼吸气瓶快速充气站，压力表指针稳定在 30 MPa 满格绿区。" }
  ])
];

// --- reactor auxiliary heat-sink station -----------------------------------

const reactor = (
  assetId: string,
  tx: number,
  ty: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
) => propIn(REACTOR_ORIGIN, assetId, tx, ty, w, h, label, lines);

export const REACTOR_PROPS: readonly SceneProp[] = [
  reactor("fx_holo_table", 15, 6.5, 3, 2, "聚变反应堆状态监测台", [
    { speaker: null, text: "后部主聚变反应堆热负荷遥测工作台。" },
    { speaker: null, text: "显示第一回路与第二回路的实时热平衡曲面。此刻散热翼伺服处于异常受阻状态。" }
  ]),
  reactor("fx_switch_panel", 6, 8.5, 2, 1, "应急旁路泄压转轮", [
    { speaker: null, text: "带有厚重机械齿轮啮合的巨型红色泄压手轮。" },
    { speaker: null, text: "逆时针用力旋转可以手动切断过载的高压冷却回路，释放受困气压。" }
  ]),
  reactor("fx_switch_panel", 24, 8.5, 2, 1, "副散热翼机械强制展开栓", [
    { speaker: null, text: "被黄色防误触护罩罩住的重型液压释放杠杆。" },
    { speaker: null, text: "拔出机械击发插销并全力扳下手柄，可利用应急火工品强制弹开副散热翼！" }
  ]),
  reactor("fx_terminal", 15, 13.5, 1, 1, "散热循环压力双针表", [
    { speaker: null, text: "第一回路与副回路压力双联机械指针表。红区刻度触目惊心。" }
  ])
];

export const SHIP_PROPS: readonly SceneProp[] = [
  ...CABIN_PROPS,
  ...BRIDGE_PROPS,
  ...TRANSIT_PROPS,
  ...HANGAR_PROPS,
  ...HABITAT_PROPS,
  ...MEDICAL_PROPS,
  ...REACTOR_PROPS
];

/**
 * Who is aboard.
 */
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
      { speaker: "舰长", text: "你来了。这里就是舰桥。" },
      { speaker: "舰长", text: "看一圈吧。导航、通信、动力、防务、科学、人员——六个席位，一个都不能少。" },
      { speaker: "舰长", text: "那些开关都是真的。屏幕会坏，投影会断，开关不会。" },
      { speaker: "舰长", text: "我在这条船上待了很久了。久了就会明白，能用手碰到的东西最可靠。" },
      { speaker: "舰长", text: "我的舱室就在走廊那头。桌上那几张纸别动，那是我自己排的班次。" },
      { speaker: "舰长", text: "好了，去忙你的吧。" }
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
      { speaker: "领航员", text: "哎，别站到航线上。" },
      { speaker: "领航员", text: "……开玩笑的，你踩不到航线，它在一块玻璃底下。" },
      { speaker: "领航员", text: "三十年了，这条线基本没怎么弯过。看久了会以为飞船根本没在动。" },
      { speaker: "领航员", text: "其实它在动，而且很快。只是太空太大，看不出参照。" }
    ]
  }
];

export const OTHER_CREW: readonly ScenePerson[] = [
  {
    id: "transit_guard",
    name: "交通调度员",
    assetId: "crew_down_idle",
    x: (TRANSIT_ORIGIN.tx + 21) * TILE,
    y: (TRANSIT_ORIGIN.ty + 4.5) * TILE,
    facing: "down",
    promptLabel: "和交通调度员说话",
    lines: [
      { speaker: "调度员小刘", text: "中央交通站第二班调度一切正常。" },
      { speaker: "调度员小刘", text: "穿梭轨道保持每 15 分钟一次空载自动巡线，路轨气压压差在允许范围内。" },
      { speaker: "调度员小刘", text: "南侧是穿梭机机库，停着咱们未来的行星登陆艇；更南边是生活区和医疗区。" }
    ]
  },
  {
    id: "engineer",
    name: "轮机检修员",
    assetId: "crew_down_idle",
    x: (HABITAT_ORIGIN.tx + 27) * TILE,
    y: (HABITAT_ORIGIN.ty + 15.5) * TILE,
    facing: "left",
    promptLabel: "和轮机检修员说话",
    lines: [
      { speaker: "老周", text: "哟，巡勤员小伙子，刚从舰桥巡检下来？" },
      { speaker: "老周", text: "咱们远望号飞了三十年，两千八百米长的舰体，全靠各个系统按部就班。" },
      { speaker: "老周", text: "水循环阀门我刚调校过，水质好得很。累了就去接杯温水喝。" },
      { speaker: "老周", text: "再往前是医疗休眠区和最底层的动力散热泵房，大家都在各司其职。" }
    ]
  },
  {
    id: "medic",
    name: "休眠监护员",
    assetId: "crew_down_idle",
    x: (MEDICAL_ORIGIN.tx + 17) * TILE,
    y: (MEDICAL_ORIGIN.ty + 10.5) * TILE,
    facing: "left",
    promptLabel: "和休眠监护员说话",
    lines: [
      { speaker: "陈医生", text: "嘘……请放轻脚步。" },
      { speaker: "陈医生", text: "一万两千四百零八名拓荒者在这片冷凝光晕里沉睡，生理代谢降到了千分之三。" },
      { speaker: "陈医生", text: "我们在深空里醒着，就是为了守住他们抵达新世界的希望。" },
      { speaker: "陈医生", text: "今天的各项巡检都合格了吧？认真负责，辛苦了。" }
    ]
  }
];

export const ALL_SHIP_PEOPLE: readonly ScenePerson[] = [...SHIP_PEOPLE, ...OTHER_CREW];

/** What the HUD calls each part of the ship. */
export const PLACE_LABELS: Record<Place, string> = {
  bridge: "远望号 · 舰桥",
  passage: "远望号 · 通道",
  cabin: "远望号 · 舰长室",
  transit_corridor: "远望号 · 主交通干线",
  transit_hub: "远望号 · 中央交通站",
  hangar_bay: "远望号 · 穿梭机机库",
  crew_habitat: "远望号 · 船员生活区",
  medical_bay: "远望号 · 医疗与休眠舱",
  reactor_bay: "远望号 · 动力排险泵房",
  structure: "远望号 · 结构区"
};


