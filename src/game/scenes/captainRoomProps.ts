import type { DialogueLine } from "../systems/Dialogue";
import { TILE } from "../config";

/**
 * Everything standing in the captain's quarters.
 *
 * Layout follows docs/设定集.md. Positions are the prop's CENTRE in pixels, and
 * sizes are in tiles.
 *
 * Two deliberate choices, both of which the old town map taught the hard way:
 *   - props are data, not tiles, because one square of deck can hold one floor
 *     tile and any number of objects on top of it
 *   - the list is written in reading order (north to south, west to east) so it
 *     is easy to check against the room description by eye
 */
export interface Prop {
  assetId: string;
  /** Centre of the prop, in world pixels. */
  x: number;
  y: number;
  /** Size in tiles. */
  w: number;
  h: number;
  /** What the player is told they are looking at. */
  label: string;
  /** Shown when the player presses E. Null means it is scenery only. */
  lines: DialogueLine[] | null;
}

/**
 * Shorthand for a prop. Position is in WORLD PIXELS, matching the coordinate
 * space the renderer draws in.
 *
 * (An earlier version of this helper multiplied its arguments by TILE while the
 * call sites had already done so, which placed every object off the map. Pixel
 * in, pixel out: no unit conversion inside the helper.)
 */
function prop(
  assetId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  lines: DialogueLine[] | null
): Prop {
  return { assetId, x, y, w, h, label, lines };
}

export const ROOM_PROPS: readonly Prop[] = [
  // --- north wall: the working end -------------------------------------------
  // Sits ON the north wall line but drawn just inside it, so the panel is
  // visible without hiding the hull behind it.
  prop("fx_obswall", 6 * TILE, 1.2 * TILE, 6, 1, "星空观测墙", [
    { speaker: null, text: "一面宽约六米的曲面显示墙。此刻它显示着船外的真实星空。" },
    { speaker: null, text: "几乎全是黑的。星星很小、很锐利，没有电影里那种拉长的亮线。" },
    { speaker: null, text: "远望号在动，但太空看久了，会以为动的是别的东西。" }
  ]),
  prop("fx_desk", 6 * TILE, 3.5 * TILE, 3, 2, "舰长的办公桌", [
    { speaker: null, text: "一张低矮而宽大的办公桌。深色桌面，边缘包着一圈木料。" },
    { speaker: null, text: "嵌在桌面里的显示设备是关着的——平整得像什么都没装过。" },
    {
      speaker: null,
      text: "桌上压着几张真正的纸。边角被翻得起了毛，上面是手写的班次调整。"
    }
  ]),
  prop("fx_desk_chair", 6 * TILE, 5.5 * TILE, 1, 1, "办公椅", [
    { speaker: null, text: "椅脚固定在地板上。在这艘船上，家具不固定就会飘走。" }
  ]),
  prop("fx_starchart", 2 * TILE, 2 * TILE, 1, 3, "实体星图", [
    { speaker: null, text: "一整面星图：深色底板，星系坐标和航线用细小的发光点标出来。" },
    { speaker: null, text: "不是全息投影。是一块真正挂在那里的东西，能用手指点。" },
    { speaker: null, text: "航线只画了一条。很长，中间没有几个转弯。" }
  ]),

  // --- the social middle ------------------------------------------------------
  prop("fx_meeting_table", 10 * TILE, 8.5 * TILE, 3, 3, "会客圆桌", [
    { speaker: null, text: "一张低矮的圆形会议桌，桌面是深色木料，边缘一圈细金属。" },
    { speaker: null, text: "桌上摆着四个杯子。其中一个还冒着热气。" },
    { speaker: null, text: "舰长刚刚还在这里。" }
  ]),
  prop("fx_chair", 9.5 * TILE, 6.5 * TILE, 1, 1, "座椅", null),
  prop("fx_chair", 10.5 * TILE, 6.5 * TILE, 1, 1, "座椅", null),
  prop("fx_chair", 8.5 * TILE, 8.5 * TILE, 1, 1, "座椅", null),
  prop("fx_chair", 11.5 * TILE, 8.5 * TILE, 1, 1, "座椅", null),
  prop("fx_chair", 9.5 * TILE, 10.5 * TILE, 1, 1, "座椅", null),
  prop("fx_chair", 10.5 * TILE, 10.5 * TILE, 1, 1, "座椅", null),

  // --- private quarters, south-west -------------------------------------------
  prop("fx_bed", 3 * TILE, 12 * TILE, 2, 3, "床铺", [
    { speaker: null, text: "被子叠得很整齐，上面横着两条约束带。" },
    { speaker: null, text: "床头面板上有一盏小小的夜灯还亮着。" }
  ]),
  prop("fx_plant", 5.5 * TILE, 11.5 * TILE, 1, 1, "绿植", [
    { speaker: null, text: "一盆真正的地球植物。叶子擦得很干净。" },
    { speaker: null, text: "在这艘船上，活着的绿色比任何设备都金贵。" }
  ]),

  // --- reading corner, south-east ---------------------------------------------
  prop("fx_bookshelf", 20 * TILE, 12.5 * TILE, 3, 1, "实体书架", [
    { speaker: null, text: "一整排纸书。书脊颜色深浅不一，看得出来是很多年攒下来的。" },
    { speaker: null, text: "有几本被翻得脱了形，用胶带重新粘过。" }
  ]),
  prop("fx_reading_chair", 17.5 * TILE, 12.5 * TILE, 1, 1, "阅读椅", [
    { speaker: null, text: "一张扶手磨得发亮的椅子。房间里最不像飞船设备的东西。" }
  ]),
  prop("fx_reading_lamp", 18.5 * TILE, 14 * TILE, 1, 1, "阅读灯", null),
  prop("fx_terminal", 22 * TILE, 12.5 * TILE, 1, 1, "离线资料终端", [
    { speaker: null, text: "一台离线的资料终端。屏幕上停着一页没读完的东西。" },
    { speaker: null, text: "没有联网，也没有任何人在等它回话。" }
  ]),

  // --- wall furniture ---------------------------------------------------------
  prop("fx_photo", 9 * TILE, 1.2 * TILE, 2, 1, "地球摄影作品", [
    { speaker: null, text: "墙上挂着一幅照片：地球，蓝色的大洋和白色的云。" },
    { speaker: null, text: "照片拍得很普通，像是随手按的。可它被装裱得很仔细。" },
    { speaker: null, text: "这是这个房间里唯一一件没有用处的设备。" }
  ]),
  prop("fx_screen_lit", 13.5 * TILE, 1.2 * TILE, 1, 1, "信息面板", [
    { speaker: null, text: "一块亮着的信息面板，滚动着几条例行状态。" },
    { speaker: null, text: "「L-1 生态模块：正常」「散热翼：部分展开」「当班：第二班」" }
  ])
];

/** Every tile asset id, so they can be preloaded in one go. */
export function tileAssetIds(): string[] {
  return ["tile_deck", "tile_deck_rug", "tile_wall", "tile_wall_dark", "tile_window", "tile_floor_light"];
}
