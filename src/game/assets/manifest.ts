import type { AssetSpec } from "./types";

// The single source of truth for every visual in the game.
//
// Game code references assets by `id` only -- never by file path, and never by
// hard-coded size. Replacing placeholder art with real art is then a matter of
// dropping `assets/sprites/<id>.png` into place. See docs/ART_PIPELINE.md.
//
// `descEn` is written to be used directly as an image-generation prompt, so it
// states the subject, the top-down viewing angle, the palette, and the line
// style rather than just naming the object.

export const TILE_SIZE = 48;

// Palette shared by the placeholders so the world reads as one coherent town.
const GRASS = "#7ec850";
const GRASS_DARK = "#6ab544";
const DIRT = "#b98b5e";
const DIRT_DARK = "#9c6f45";
const SOIL = "#8a5f3c";
const WATER = "#4aa3d8";
const WATER_LIGHT = "#7cc3ea";
const WOOD = "#c9a06a";
const ROOF = "#c8593f";
const STONE = "#b9b3a8";

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

// --- terrain -----------------------------------------------------------------

export const TERRAIN: AssetSpec[] = [
  tile(
    "tile_grass",
    "草地",
    "小镇的底色地面，浅绿色带少量斑点。",
    "Seamless top-down game tile of lush cartoon grass, flat light green base with subtle darker green tufts, soft rounded shapes, thick clean outlines, flat 2D vector style, no perspective, no text",
    GRASS,
    { speckles: { count: 14, color: GRASS_DARK, sizeMin: 3, sizeMax: 5 } }
  ),
  tile(
    "tile_path",
    "土路",
    "连接建筑之间的踩实土路。",
    "Seamless top-down game tile of a packed dirt path, warm light brown with small pebbles, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    DIRT,
    { speckles: { count: 18, color: DIRT_DARK, sizeMin: 2, sizeMax: 4 } }
  ),
  tile(
    "tile_water",
    "水面",
    "镇边的小河 / 池塘。",
    "Seamless top-down game tile of calm cartoon water, flat blue with lighter wave lines, soft rounded shapes, thick clean outlines, flat 2D vector style, no perspective, no text",
    WATER,
    { speckles: { count: 10, color: WATER_LIGHT, sizeMin: 3, sizeMax: 7 } }
  ),
  tile(
    "tile_farmland",
    "农田（未播种）",
    "翻好的土地，等待播种。",
    "Seamless top-down game tile of freshly tilled farmland, flat brown soil with horizontal furrow lines, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    SOIL
  ),
  tile(
    "tile_wall",
    "房屋墙体",
    "从上方看到的房子墙壁，用来围出建筑占地。",
    "Top-down game tile of a cartoon cottage wall seen from above, warm cream plaster with a wooden edge, flat 2D vector style, thick clean outlines, no perspective, no text",
    "#efe0c8"
  ),
  tile(
    "tile_roof",
    "屋顶",
    "红色斜屋顶，从上方看到的瓦片。",
    "Top-down game tile of a cartoon cottage roof, terracotta red shingles with a darker ridge line, flat 2D vector style, thick clean outlines, no perspective, no text",
    ROOF
  ),
  tile(
    "tile_tree",
    "树",
    "一棵圆滚滚的卡通树，从上方看到树冠。",
    "Top-down game tile of a single round cartoon tree, see from directly above, fluffy green canopy with a darker outline and a hint of brown trunk, flat 2D vector style, thick clean outlines, no text",
    "#4e9e3e"
  ),
  tile(
    "tile_fence",
    "栅栏",
    "木栅栏，用来围住农田。",
    "Top-down game tile of a short wooden fence, warm light brown planks, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    WOOD
  )
];

// --- characters --------------------------------------------------------------

export const CHARACTERS: AssetSpec[] = [
  {
    id: "player",
    nameZh: "玩家角色",
    descZh: "新搬来的居民。靛蓝上衣、圆脸、小小的黑眼睛。",
    descEn:
      "Cute chibi cartoon villager sprite seen from a top-down three-quarter view, indigo blue hoodie, round cream-colored face with two tiny black dot eyes, short dark brown hair, simple rounded shapes, thick dark outlines, flat 2D vector style, plain background, single character centered, no text",
    size: { w: 32, h: 48 },
    anchor: "bottom-center",
    category: "character",
    placeholder: {
      shapes: [
        { kind: "rect", x: -13, y: -30, w: 26, h: 30, color: "#4a5fb0", radius: 8, stroke: { width: 2, color: "#2b3566" } },
        { kind: "rect", x: -12, y: -48, w: 24, h: 22, color: "#f6d7b0", radius: 9, stroke: { width: 2, color: "#2b3566" } },
        { kind: "rect", x: -8, y: -42, w: 4, h: 4, color: "#2b2b2b", radius: 2 },
        { kind: "rect", x: 4, y: -42, w: 4, h: 4, color: "#2b2b2b", radius: 2 }
      ]
    }
  },
  {
    id: "npc_mayor",
    nameZh: "镇长",
    descZh: "发布工作与收下贡献的人。年纪偏大，戴帽子。",
    descEn:
      "Cute chibi cartoon village mayor sprite seen from a top-down three-quarter view, elderly friendly man, brown coat over a cream shirt, round tan face with tiny black dot eyes, grey hair and a wide-brimmed brown hat, simple rounded shapes, thick dark outlines, flat 2D vector style, plain background, single character centered, no text",
    size: { w: 32, h: 48 },
    anchor: "bottom-center",
    category: "character",
    placeholder: {
      shapes: [
        { kind: "rect", x: -14, y: -28, w: 28, h: 28, color: "#8a6642", radius: 8, stroke: { width: 2, color: "#4a3524" } },
        { kind: "rect", x: -13, y: -48, w: 26, h: 22, color: "#e8c69c", radius: 9, stroke: { width: 2, color: "#4a3524" } }
      ]
    }
  }
];

// --- crops -------------------------------------------------------------------

const cropStage = (stage: number, nameZh: string, descZh: string, descEn: string, color: string): AssetSpec => ({
  id: `crop_wheat_stage${stage}`,
  nameZh,
  descZh,
  descEn,
  size: { w: TILE_SIZE, h: TILE_SIZE },
  anchor: "center",
  category: "crop",
  placeholder: {
    shapes: [{ kind: "rect", x: -TILE_SIZE / 2 + 6, y: -TILE_SIZE / 2 + 6, w: TILE_SIZE - 12, h: TILE_SIZE - 12, color, radius: 6 }]
  }
});

export const CROPS: AssetSpec[] = [
  cropStage(
    1,
    "小麦·刚播种",
    "刚播下种子，土面几乎看不到东西，只有一点点嫩芽。",
    "Top-down game sprite of wheat just planted, a single tiny pale green sprout barely poking out of brown soil, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    "#a8845c"
  ),
  cropStage(
    2,
    "小麦·幼苗",
    "冒出一小丛绿色嫩苗。",
    "Top-down game sprite of young wheat seedlings, a small cluster of short light green shoots on brown soil, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    "#8fc45a"
  ),
  cropStage(
    3,
    "小麦·成长中",
    "长高但仍未成熟，绿色带一点黄。",
    "Top-down game sprite of half-grown wheat, medium-height green-yellow stalks on brown soil, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    "#b5bd4a"
  ),
  cropStage(
    4,
    "小麦·成熟",
    "金黄饱满，可以收割了。",
    "Top-down game sprite of fully grown ripe wheat, tall golden yellow stalks heavy with grain on brown soil, cartoon style, flat 2D vector art, thick clean outlines, no perspective, no text",
    "#e8c34a"
  )
];

// --- buildings ---------------------------------------------------------------

const building = (
  id: string,
  nameZh: string,
  descZh: string,
  descEn: string,
  color: string
): AssetSpec => ({
  id,
  nameZh,
  descZh,
  descEn,
  size: { w: TILE_SIZE, h: TILE_SIZE },
  anchor: "center",
  category: "building",
  placeholder: {
    shapes: [
      { kind: "rect", x: -TILE_SIZE / 2, y: -TILE_SIZE / 2, w: TILE_SIZE, h: TILE_SIZE, color, radius: 4 },
      { kind: "rect", x: -TILE_SIZE / 2, y: TILE_SIZE / 2 - 10, w: TILE_SIZE, h: 10, color: STONE, radius: 3 }
    ]
  }
});

export const BUILDINGS: AssetSpec[] = [
  building(
    "bld_mill",
    "磨坊",
    "把小麦磨成面粉的地方，带一个风车。",
    "Top-down cartoon watermill building with a large wooden windmill wheel, cream walls and terracotta roof, flat 2D vector style, thick clean outlines, no perspective, no text",
    "#d8c9a8"
  ),
  building(
    "bld_bakery",
    "烤炉 / 面包房",
    "烤面包的地方，屋顶有烟囱冒烟。",
    "Top-down cartoon bakery building with a stone oven and a chimney, warm cream walls and terracotta roof, flat 2D vector style, thick clean outlines, no perspective, no text",
    "#e6d3b3"
  )
];

// --- items -------------------------------------------------------------------
// Item icons are shown in the DOM inventory UI, which is why their art is
// specified here rather than left to CSS.

export const ITEMS: AssetSpec[] = [
  {
    id: "item_wheat",
    nameZh: "小麦",
    descZh: "收割下来的麦穗，可以拿去磨坊。",
    descEn:
      "Game inventory icon of a small bundle of golden wheat sheaves tied in the middle, cartoon style, thick clean outlines, flat 2D vector art, centered on a plain transparent background, no text",
    size: { w: 32, h: 32 },
    anchor: "center",
    category: "item",
    placeholder: {
      shapes: [
        { kind: "rect", x: -7, y: -7, w: 14, h: 14, color: "#e8c34a", radius: 6, stroke: { width: 2, color: "#8a7020" } },
        { kind: "rect", x: -2, y: -2, w: 4, h: 4, color: "#8a7020", radius: 2 }
      ]
    }
  },
  {
    id: "item_flour",
    nameZh: "面粉",
    descZh: "磨好的面粉，装在小布袋里，可以拿去烤炉。",
    descEn:
      "Game inventory icon of a small tied cloth sack of flour with a few grains spilled beside it, cartoon style, thick clean outlines, flat 2D vector art, centered on a plain transparent background, no text",
    size: { w: 32, h: 32 },
    anchor: "center",
    category: "item",
    placeholder: {
      shapes: [{ kind: "rect", x: -8, y: -8, w: 16, h: 16, color: "#f2ece0", radius: 5, stroke: { width: 2, color: "#a89c88" } }]
    }
  },
  {
    id: "item_bread",
    nameZh: "面包",
    descZh: "刚出炉的面包，是交给小镇的贡献品。",
    descEn:
      "Game inventory icon of a freshly baked round loaf of bread with a scored top, warm golden brown crust, cartoon style, thick clean outlines, flat 2D vector art, centered on a plain transparent background, no text",
    size: { w: 32, h: 32 },
    anchor: "center",
    category: "item",
    placeholder: {
      shapes: [{ kind: "rect", x: -9, y: -6, w: 18, h: 13, color: "#c98a45", radius: 6, stroke: { width: 2, color: "#7a4f22" } }]
    }
  }
];

// --- ui ----------------------------------------------------------------------
// World-space UI only. DOM UI (HUD, dialogue box) is styled with CSS.

export const UI: AssetSpec[] = [
  {
    id: "ui_prompt_e",
    nameZh: "交互提示气泡",
    descZh: "浮在可交互对象上方的小气泡，提示按 E。",
    descEn:
      "Small cartoon speech bubble game UI element containing a bold letter E, rounded white bubble with a thick dark outline and a little tail at the bottom, flat 2D vector style, plain transparent background",
    size: { w: 32, h: 32 },
    anchor: "bottom-center",
    category: "ui",
    placeholder: {
      shapes: [
        { kind: "rect", x: -14, y: -30, w: 28, h: 24, color: "#ffffff", radius: 10, stroke: { width: 2, color: "#2b2b2b" } },
        { kind: "rect", x: -4, y: -8, w: 8, h: 8, color: "#ffffff", radius: 2 }
      ]
    }
  }
];

export const ALL_ASSETS: AssetSpec[] = [
  ...TERRAIN,
  ...CHARACTERS,
  ...CROPS,
  ...BUILDINGS,
  ...ITEMS,
  ...UI
];

/** Look up a spec by id. Throws on unknown ids so typos fail loudly. */
export function getAssetSpec(id: string): AssetSpec {
  const spec = ALL_ASSETS.find((a) => a.id === id);
  if (!spec) throw new Error(`Unknown asset id: ${id}`);
  return spec;
}
