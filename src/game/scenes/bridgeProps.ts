import type { DialogueLine } from "../systems/Dialogue";
import type { ScenePerson, SceneProp } from "./Scene";
import { BRIDGE_TILE } from "../config";

/**
 * What stands on the bridge, and who is on watch.
 *
 * Layout follows the setting document's bridge section: an elliptical hall with
 * the wrap-around display forward, the captain's chair at the centre of the
 * command floor, and department stations around the working ring.
 *
 * Positions are hand-placed inside the hall's floor, which spans rows 5..15 and
 * columns 5..34. Tests assert that every prop and person is inside the hall, on
 * walkable deck, and reachable by walking -- so a layout mistake fails loudly
 * instead of leaving something embedded in a bulkhead.
 *
 * Note the deliberate coldness of the place. The document calls the bridge
 * "克制、理性和高度专业化", and states that long-duration stations keep physical
 * buttons and mechanical switches rather than floating holograms. Almost
 * everything here is therefore hardware you could put a hand on.
 */

const T = BRIDGE_TILE;

function prop(
  assetId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
): SceneProp {
  return { assetId, x, y, w, h, label, lines };
}

export const BRIDGE_PROPS: readonly SceneProp[] = [
  // --- forward: the command position -----------------------------------------
  prop("fx_command_chair", 20 * T, 7 * T, 2, 3, "舰长指挥席", [
    { speaker: null, text: "舰长的席位。位置比周围的工作席高一点，但不是高出一大截。" },
    { speaker: null, text: "座椅扶手上各有一块小操作面板，边角磨得发亮。" },
    { speaker: null, text: "设定上写着：这不是王座，是一套拥有完整信息访问权限的工作站。" }
  ]),

  // --- forward stations --------------------------------------------------------
  // Navigation and communications, nearest the display, as the document lists
  // them first.
  prop("fx_console", 12 * T, 6 * T, 2, 1, "导航席", [
    { speaker: null, text: "导航席。三块固定显示屏嵌在桌面上，都亮着。" },
    { speaker: null, text: "屏幕下方是一排实体按键，没有一块是悬浮投影。" },
    { speaker: null, text: "最右边那排是黄黑相间的应急开关，盖着防护罩。" }
  ]),
  prop("fx_console", 27 * T, 6 * T, 2, 1, "通信席", [
    { speaker: null, text: "通信席。除了常规面板，还留着一个老式的机械频道旋钮。" },
    { speaker: null, text: "旋钮旁边贴着手写的标签，字迹和舰长桌上那些纸是同一个人的。" }
  ]),

  // --- the plotting table, centre -------------------------------------------------
  prop("fx_holo_table", 21 * T, 11 * T, 3, 2, "星图工作台", [
    { speaker: null, text: "一张平放的星图台。玻璃下面是画好的航线，边上有两个实体旋钮。" },
    { speaker: null, text: "不是悬浮全息投影。整艘船上，能用手碰到的东西比能看见的更多。" },
    { speaker: null, text: "航线的尽头标着一个很小的记号，旁边写着目的地编号。" }
  ]),

  // --- side stations ---------------------------------------------------------------
  prop("fx_console_side", 7 * T, 8 * T, 1, 2, "动力席", [
    { speaker: null, text: "动力席。面板上有一整列反应堆状态的指示灯，全是绿的。" },
    { speaker: null, text: "最下面一行是散热翼角度。现在是部分展开。" }
  ]),
  prop("fx_console_side", 32 * T, 8 * T, 1, 2, "防务席", [
    { speaker: null, text: "防务席。屏幕大部分是暗的。" },
    { speaker: null, text: "远望号不是战舰。这个席位平时更像个值班室，而不是火控中心。" }
  ]),

  // --- aft stations -----------------------------------------------------------------
  prop("fx_console", 14 * T, 14 * T, 2, 1, "科学席", [
    { speaker: null, text: "科学席。桌上堆着几份纸质打印件，还没归档。" }
  ]),
  prop("fx_console", 25 * T, 14 * T, 2, 1, "人员席", [
    { speaker: null, text: "人员席。屏幕上是一份 12,408 人的休眠状态总表。" },
    { speaker: null, text: "大部分条目后面都是同一个状态：正常。" },
    { speaker: null, text: "这个数字太大了，大到看不出它是人。" }
  ]),

  // --- hardware, paper, and the things that make it a workplace ----------------------
  // The switch banks are mounted on the side bulkheads, where the document puts
  // that kind of hardware. As 2x1 props on the wall tiles they remain reachable:
  // the player stands on the floor beside them and the reach crosses the wall.
  prop("fx_switch_panel", 5 * T, 10 * T, 2, 1, "机械应急开关", [
    { speaker: null, text: "一整排机械开关，每个旁边都有一块小铭牌。" },
    { speaker: null, text: "设定集里特意写过这一点：远望号追求先进，但不完全依赖华丽的交互界面。" },
    { speaker: null, text: "所以这些开关一直都在，而且一直有人定期擦拭。" }
  ]),
  prop("fx_switch_panel", 34 * T, 10 * T, 2, 1, "机械应急开关", [
    { speaker: null, text: "另一组开关。有一两个的防护罩是打开的，像是刚被人用过。" }
  ]),
  prop("fx_paper_log", 20 * T, 6 * T, 1, 1, "纸质值班记录", [
    { speaker: null, text: "一块夹着值班表的板子，就搁在指挥席旁边。" },
    { speaker: null, text: "上面是手写的班次和交接签名。舰长桌上那张表，就是从这里抄的。" }
  ]),
  prop("fx_plant", 11 * T, 12 * T, 1, 1, "绿植", [
    { speaker: null, text: "舰桥上居然也有一盆植物，摆在人员席的角落里。" },
    { speaker: null, text: "叶子有点蔫。这里大概没人记得给它浇水。" }
  ])
];

/**
 * Who is on the bridge.
 *
 * The captain is here rather than in his quarters: this is where a captain is
 * during a watch. His lines differ from the ones he has in his own room, which
 * is what makes moving between the two rooms mean something.
 */
export const BRIDGE_PEOPLE: readonly ScenePerson[] = [
  {
    id: "captain",
    name: "舰长",
    assetId: "npc_captain",
    x: 20 * T,
    y: 9.5 * T,
    facing: "up",
    promptLabel: "和舰长说话",
    lines: [
      { speaker: "舰长", text: "你来了。这里就是舰桥。" },
      { speaker: "舰长", text: "看一圈吧。导航、通信、动力、防务、科学、人员——六个席位，一个都不能少。" },
      {
        speaker: "舰长",
        text: "那些开关都是真的。屏幕会坏，投影会断，开关不会。"
      },
      { speaker: "舰长", text: "我在这条船上待了很久了。久了就会明白，能用手碰到的东西最可靠。" },
      { speaker: "舰长", text: "去吧。等你熟悉了，再来找我。" }
    ]
  },
  {
    id: "navigator",
    name: "领航员",
    assetId: "crew_down_idle",
    x: 11 * T,
    y: 6.5 * T,
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
