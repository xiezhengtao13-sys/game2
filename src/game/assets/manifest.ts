import type { AssetSpec } from "./types";

// The single source of truth for every visual in the game.
//
// Game code references assets by `id` only -- never by a file path, and never by
// a hard-coded size. Replacing placeholder art with real art is then a matter of
// dropping `assets/sprites/<id>.png` into place. See docs/ART_PIPELINE.md.
//
// `descEn` is used directly as an image-generation prompt, so it states the
// subject, viewing angle, palette and line style rather than just naming the
// object. Materials and colours follow the room-by-room language in
// docs/设定集.md. For the captain's quarters that means: dark grey, pale wood,
// warm white, quiet and restrained.

/** Pixel size of one tile, before a scene's own scale is applied. */
export const TILE_SIZE = 48;

// Shared palette, taken from the setting document's interior language.
const HULL = "#b9bec6";
const HULL_DARK = "#8d949e";
const PANEL = "#2f3540";
const FLOOR = "#3a4049";
const FLOOR_ALT = "#424955";
const WOOD = "#a9835a";
const WOOD_DARK = "#7d5f3f";
const WARM_WHITE = "#f0ece4";
const SCREEN = "#2b3a4a";
const SCREEN_LIT = "#4d7fa8";

const tile = (
  id: string,
  nameZh: string,
  descZh: string,
  descEn: string,
  color: string,
  extra: Partial<AssetSpec["placeholder"]> = {}
): AssetSpec => ({
  id,
  nameZh,
  descZh,
  descEn,
  size: { w: TILE_SIZE, h: TILE_SIZE },
  anchor: "center",
  category: "terrain",
  placeholder: {
    shapes: [{ kind: "rect", x: -TILE_SIZE / 2, y: -TILE_SIZE / 2, w: TILE_SIZE, h: TILE_SIZE, color }],
    ...extra
  }
});

// --- terrain: the room shell -------------------------------------------------

export const TERRAIN: AssetSpec[] = [
  tile(
    "tile_deck",
    "舱室地板",
    "低反光深色复合材料地板。设定集：地面为低反光深色材料。",
    "Seamless top-down game tile of a starship interior floor, matte dark blue-grey composite deck plating with faint seam lines between panels, worn but immaculately maintained, subdued lighting, no strong reflections, flat 2D vector style, thick clean outlines, no perspective, no text",
    FLOOR,
    { speckles: { count: 5, color: FLOOR_ALT, sizeMin: 6, sizeMax: 14 } }
  ),
  tile(
    "tile_deck_rug",
    "会客区地毯",
    "一块低矮地毯，压住金属地板的冷硬感。",
    "Seamless top-down game tile of a low-pile area rug on a spacecraft deck, muted dark red-brown weave with a simple border stripe, flat 2D vector style, thick clean outlines, no perspective, no text",
    "#6b4a44"
  ),
  tile(
    "tile_wall",
    "舱壁",
    "浅灰白色舱壁面板，指挥区的标准材料。",
    "Seamless top-down game tile representing a spacecraft interior bulkhead seen from above, pale grey-white metal panelling with recessed panel divisions and small fastener details, flat 2D vector style, thick clean outlines, no perspective, no text",
    HULL
  ),
  tile(
    "tile_wall_dark",
    "舱壁设备面板",
    "装在舱壁上的深灰色控制与检修单元。",
    "Seamless top-down game tile representing a spacecraft bulkhead equipment panel, dark grey face with a few small status lights and a recessed handle, flat 2D vector style, thick clean outlines, no perspective, no text",
    HULL_DARK
  ),
  tile(
    "tile_window",
    "舷窗",
    "望向船外的观察窗。大部分时间是纯粹的黑色。",
    "Top-down game tile of a spacecraft viewing window set into a bulkhead, thick rounded frame with a deep black pane containing two or three faint distant stars, flat 2D vector style, thick clean outlines, no perspective, no text",
    PANEL,
    { speckles: { count: 3, color: "#ffffff", sizeMin: 2, sizeMax: 3 } }
  ),
  tile(
    "tile_floor_light",
    "地面导引灯",
    "嵌在地板里的线性指示光带。",
    "Seamless top-down game tile of a recessed linear floor light strip set into a dark spacecraft deck, soft warm white glow along the centre with a thin metal surround, flat 2D vector style, thick clean outlines, no perspective, no text",
    WARM_WHITE
  )
];

// --- fixtures: what stands in the room ---------------------------------------

interface FixtureSpec {
  id: string;
  nameZh: string;
  descZh: string;
  descEn: string;
  /** Size in tiles. */
  w: number;
  h: number;
  /** Placeholder fill colour. */
  color: string;
}

const fixture = (spec: FixtureSpec): AssetSpec => ({
  id: spec.id,
  nameZh: spec.nameZh,
  descZh: spec.descZh,
  descEn: spec.descEn,
  size: { w: spec.w * TILE_SIZE, h: spec.h * TILE_SIZE },
  anchor: "center",
  category: "fixture",
  placeholder: {
    shapes: [
      {
        kind: "rect",
        x: (-spec.w * TILE_SIZE) / 2,
        y: (-spec.h * TILE_SIZE) / 2,
        w: spec.w * TILE_SIZE,
        h: spec.h * TILE_SIZE,
        color: spec.color,
        radius: 6,
        stroke: { width: 2, color: "#20242b" }
      }
    ]
  }
});

export const FIXTURES: AssetSpec[] = [
  fixture({
    id: "fx_desk",
    nameZh: "舰长办公桌",
    descZh: "低矮而宽大的办公桌，深色桌面配木质包边，桌面嵌入可完全关闭的显示设备。",
    descEn:
      "Top-down view of a wide low starship captain's desk, dark composite top with natural wood edging, a closed flat display panel inset into the surface and a few paper documents lying on it, quiet restrained sci-fi furniture, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 3,
    h: 2,
    color: "#3b3f48"
  }),
  fixture({
    id: "fx_desk_chair",
    nameZh: "办公椅",
    descZh: "办公桌后的座椅，带地面固定装置。",
    descEn:
      "Top-down view of a single starship office chair, dark grey padded seat with a restrained high-tech frame and a floor fixing plate, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: "#4a505a"
  }),
  fixture({
    id: "fx_starchart",
    nameZh: "实体星图",
    descZh: "办公桌后的星图：深色底板，星系坐标与航线用细小发光标记显示。不是全息影像。",
    descEn:
      "Top-down view of a large wall-mounted physical star chart aboard a starship, dark backing panel with tiny glowing points marking star coordinates and a thin plotted course line, deliberately plain and instrument-like rather than a hologram, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 3,
    h: 1,
    color: "#252a33"
  }),
  fixture({
    id: "fx_obswall",
    nameZh: "星空观测墙",
    descZh: "宽约 6 米的曲面显示墙。关闭时像一整面暗色玻璃墙，开启后呈现克制的真实星空。",
    descEn:
      "Top-down view of a wide curved observation display wall along one side of a starship room, dark glass surface showing a restrained view of deep space, overwhelmingly black with a few faint sharp stars and no lens flares or streaking, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 6,
    h: 1,
    color: "#12151b"
  }),
  fixture({
    id: "fx_meeting_table",
    nameZh: "会客圆桌",
    descZh: "会客区的低矮圆形会议桌。",
    descEn:
      "Top-down view of a low round meeting table in a starship reception area, dark wood top with a thin metal rim and a few small objects resting on it, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 3,
    h: 3,
    color: WOOD_DARK
  }),
  fixture({
    id: "fx_chair",
    nameZh: "固定座椅",
    descZh: "固定在地板上的座椅，防止失重时飘走。",
    descEn:
      "Top-down view of a single fixed starship guest chair, warm grey upholstery with a slim dark frame and a visible floor mounting plate, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: "#5b5f68"
  }),
  fixture({
    id: "fx_plant",
    nameZh: "绿植",
    descZh: "真正的地球植物。在整艘船的工业环境里，这是少数活着的绿色。",
    descEn:
      "Top-down view of a potted Earth houseplant in a plain ceramic pot, a few broad healthy green leaves seen from above, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: "#4e7a44"
  }),
  fixture({
    id: "fx_bed",
    nameZh: "床铺",
    descZh: "卧室的床，具备失重固定装置。",
    descEn:
      "Top-down view of a starship bunk, neatly made with muted grey-white bedding and slim restraint straps across it, dark frame with a small bedside panel, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 2,
    h: 3,
    color: "#c9c4ba"
  }),
  fixture({
    id: "fx_bookshelf",
    nameZh: "实体书架",
    descZh: "阅读区的书架，放的是真正的纸书。",
    descEn:
      "Top-down view of a low bookshelf seen from above, rows of book spines in muted varied colours along a pale wood carcass, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 3,
    h: 1,
    color: WOOD
  }),
  fixture({
    id: "fx_reading_chair",
    nameZh: "阅读椅",
    descZh: "一张舒适的阅读椅，是这个房间里最不像飞船设备的东西。",
    descEn:
      "Top-down view of a single comfortable upholstered reading armchair, warm dark brown fabric with visible armrests and a floor fixing plate, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: "#6f5340"
  }),
  fixture({
    id: "fx_reading_lamp",
    nameZh: "阅读灯",
    descZh: "具有传统造型的阅读灯，暖光。",
    descEn:
      "Top-down view of a traditional-style reading lamp on a small base, a round shade with warm light spilling from beneath it, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: "#e8c37a"
  }),
  fixture({
    id: "fx_terminal",
    nameZh: "离线资料终端",
    descZh: "阅读区的离线终端。不联网，也没人催你。",
    descEn:
      "Top-down view of a small offline data terminal on a slim stand, a single modest dark screen with a few lines of pale text and a physical keypad below it, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: SCREEN
  }),
  fixture({
    id: "fx_screen_lit",
    nameZh: "点亮的显示面板",
    descZh: "舱壁上亮起的信息面板。",
    descEn:
      "Top-down game sprite of a lit wall-mounted information panel, dark bezel around a soft blue-grey screen showing simple block diagrams, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 1,
    h: 1,
    color: SCREEN_LIT
  }),
  fixture({
    id: "fx_photo",
    nameZh: "地球摄影作品",
    descZh: "墙上唯一重要的装饰：一幅真正的地球摄影作品。",
    descEn:
      "Top-down game sprite of a framed photograph hanging on a starship bulkhead, a plain dark frame around an image of Earth's blue oceans and white clouds seen from orbit, flat 2D vector style, thick clean outlines, no perspective, no text",
    w: 2,
    h: 1,
    color: "#2f5f8a"
  })
];

// --- character ---------------------------------------------------------------

/** Shared look for every crew frame, so the poses line up pixel for pixel. */
const CREW_LOOK =
  "worn dark blue-grey work coveralls with rolled sleeves and a tool pocket, round face with two tiny dark eyes, short dark hair under a simple flat cap";

/**
 * One direction-and-pose frame of the player character.
 *
 * Only the right-facing frames are authored; the generator mirrors them for
 * "left", which halves the art needed for four directions.
 *
 * `body` is raised or lowered slightly between walk frames so motion reads even
 * as a flat placeholder.
 */
function crewFrame(dir: "right" | "down" | "up", pose: "idle" | "walkA" | "walkB", descEn: string): AssetSpec {
  const bob = pose === "idle" ? 0 : pose === "walkA" ? -1 : 0;
  const leftLeg = pose === "walkA" ? 2 : pose === "walkB" ? -2 : 0;
  const rightLeg = -leftLeg;
  const facingAway = dir === "up";

  return {
    id: `crew_${dir}_${pose}`,
    nameZh: `船员·${dir}·${pose}`,
    descZh: `${dir} 朝向的船员，${pose} 姿势。`,
    descEn,
    size: { w: 32, h: 48 },
    anchor: "bottom-center",
    category: "character",
    placeholder: {
      shapes: [
        // Head first, so the body overlaps it and reads as "in front".
        {
          kind: "rect",
          x: -12,
          y: -48 + bob,
          w: 24,
          h: 22,
          color: facingAway ? "#3f4a5a" : "#e8c9a0",
          radius: 9,
          stroke: { width: 2, color: "#252a33" }
        },
        // Eyes are omitted when facing away from the camera.
        ...(facingAway
          ? []
          : [
              { kind: "rect" as const, x: -8 + leftLeg / 4, y: -42 + bob, w: 4, h: 4, color: "#22262c", radius: 2 },
              { kind: "rect" as const, x: 4 + leftLeg / 4, y: -42 + bob, w: 4, h: 4, color: "#22262c", radius: 2 }
            ]),
        // Cap.
        {
          kind: "rect",
          x: -14,
          y: -51 + bob,
          w: 28,
          h: 7,
          color: "#3f4a5a",
          radius: 3,
          stroke: { width: 2, color: "#252a33" }
        },
        // Coveralls.
        {
          kind: "rect",
          x: -13,
          y: -30 + bob,
          w: 26,
          h: 26,
          color: "#46536b",
          radius: 8,
          stroke: { width: 2, color: "#252a33" }
        },
        // Tool pocket, which is what makes these work clothes rather than a uniform.
        { kind: "rect", x: 5, y: -26 + bob, w: 6, h: 8, color: "#333d4d", radius: 2 },
        // Legs.
        {
          kind: "rect",
          x: -10 + leftLeg,
          y: -8,
          w: 8,
          h: 8,
          color: "#333d4d",
          radius: 3,
          stroke: { width: 2, color: "#252a33" }
        },
        {
          kind: "rect",
          x: 2 + rightLeg,
          y: -8,
          w: 8,
          h: 8,
          color: "#333d4d",
          radius: 3,
          stroke: { width: 2, color: "#252a33" }
        }
      ]
    }
  };
}

export const CHARACTERS: AssetSpec[] = [
  crewFrame(
    "down",
    "idle",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing the camera (south), seen from a top-down three-quarter view, standing still with both feet together, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "down",
    "walkA",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing the camera (south), seen from a top-down three-quarter view, mid-stride walk cycle frame 1, left leg forward and right leg back, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "down",
    "walkB",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing the camera (south), seen from a top-down three-quarter view, mid-stride walk cycle frame 2, right leg forward and left leg back, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "right",
    "idle",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing right (east), seen from a top-down three-quarter view, standing still, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "right",
    "walkA",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing right (east), seen from a top-down three-quarter view, mid-stride walk cycle frame 1, front leg forward, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "right",
    "walkB",
    `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing right (east), seen from a top-down three-quarter view, mid-stride walk cycle frame 2, back leg forward, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "up",
    "idle",
    `Cute chibi cartoon spaceship crew member seen from behind (facing away, north), top-down three-quarter view, dark blue-grey work coveralls and a flat cap, back of the head with no face visible, standing still, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "up",
    "walkA",
    `Cute chibi cartoon spaceship crew member seen from behind (facing away, north), top-down three-quarter view, walking away mid-stride frame 1, dark blue-grey work coveralls and a flat cap, no face visible, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),
  crewFrame(
    "up",
    "walkB",
    `Cute chibi cartoon spaceship crew member seen from behind (facing away, north), top-down three-quarter view, walking away mid-stride frame 2, dark blue-grey work coveralls and a flat cap, no face visible, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
  ),

  // --- the captain -----------------------------------------------------------
  // Older, greyer and tidier than the crew: command blacks rather than work
  // coveralls, no cap, and a ship's patch on the shoulder. The setting document
  // does not describe him directly, so everything here is inferred from the room
  // he keeps -- paper documents, a physical star chart, a photograph of Earth,
  // and a chair that is "not a throne".
  {
    id: "npc_captain",
    nameZh: "舰长",
    descZh: "远望号舰长。深色制服，年纪偏大，神态克制——那间摆着纸和书的房间是他的。",
    descEn:
      "Cute chibi cartoon starship captain seen from a top-down three-quarter view, older man in a plain dark navy command uniform with a small ship patch on one shoulder and no medals, neat short grey hair, round weathered face with two tiny dark eyes, calm and unshowy, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text",
    size: { w: 32, h: 48 },
    anchor: "bottom-center",
    category: "character",
    placeholder: {
      shapes: [
        { kind: "rect", x: -12, y: -48, w: 24, h: 22, color: "#e0c39c", radius: 9, stroke: { width: 2, color: "#1d2129" } },
        // Grey hair, drawn behind the eyes so the face stays readable.
        { kind: "rect", x: -12, y: -48, w: 24, h: 7, color: "#c8c6c2", radius: 4, stroke: { width: 2, color: "#1d2129" } },
        { kind: "rect", x: -8, y: -41, w: 4, h: 4, color: "#22262c", radius: 2 },
        { kind: "rect", x: 4, y: -41, w: 4, h: 4, color: "#22262c", radius: 2 },
        // Command uniform: darker and plainer than the crew's coveralls.
        { kind: "rect", x: -13, y: -30, w: 26, h: 26, color: "#2b3244", radius: 8, stroke: { width: 2, color: "#1d2129" } },
        // Ship patch.
        { kind: "rect", x: -11, y: -27, w: 6, h: 6, color: "#7d8aa3", radius: 2 },
        { kind: "rect", x: -10, y: -8, w: 8, h: 8, color: "#232838", radius: 3, stroke: { width: 2, color: "#1d2129" } },
        { kind: "rect", x: 2, y: -8, w: 8, h: 8, color: "#232838", radius: 3, stroke: { width: 2, color: "#1d2129" } }
      ]
    }
  },

  // Left-facing frames are NOT drawn by hand: `npm run art` mirrors the
  // right-facing frame of the same pose, so four directions need only three sets
  // of art. See MIRRORED in animationSpec.ts.
  ...(["idle", "walkA", "walkB"] as const).map((pose): AssetSpec => {
    const source = crewFrame(
      "right",
      pose,
      `Cute chibi cartoon spaceship crew member in ${CREW_LOOK}, facing left (west), seen from a top-down three-quarter view, simple rounded shapes, thick dark outlines, flat 2D vector style, plain transparent background, single character centred, no text`
    );
    return {
      ...source,
      id: `crew_left_${pose}`,
      nameZh: `船员·left·${pose}`,
      descZh: `由 crew_right_${pose} 水平镜像得到，不需要单独出图。`,
      descEn: source.descEn.replace("facing left (west)", "facing left (west)")
    };
  })
];

// --- ui ----------------------------------------------------------------------

export const UI: AssetSpec[] = [
  {
    id: "ui_prompt_e",
    nameZh: "交互提示气泡",
    descZh: "浮在可交互物体上方的小气泡，提示按 E。",
    descEn:
      "Small cartoon speech bubble game UI element containing a bold letter E, rounded pale bubble with a thick dark outline and a little tail at the bottom, flat 2D vector style, plain transparent background, no text other than the letter E",
    size: { w: 32, h: 32 },
    anchor: "bottom-center",
    category: "ui",
    placeholder: {
      shapes: [
        { kind: "rect", x: -14, y: -30, w: 28, h: 24, color: "#f2efe8", radius: 10, stroke: { width: 2, color: "#252a33" } },
        { kind: "rect", x: -4, y: -8, w: 8, h: 8, color: "#f2efe8", radius: 2 }
      ]
    }
  }
];

export const ALL_ASSETS: AssetSpec[] = [
  ...TERRAIN,
  ...FIXTURES,
  ...CHARACTERS,
  ...UI
];

/** Look up a spec by id. Throws on unknown ids so typos fail loudly. */
export function getAssetSpec(id: string): AssetSpec {
  const spec = ALL_ASSETS.find((a) => a.id === id);
  if (!spec) throw new Error(`Unknown asset id: ${id}`);
  return spec;
}
