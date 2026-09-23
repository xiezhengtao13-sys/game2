import { MAP_COLUMNS, MAP_ROWS, TILE } from "../config";
import { TileMap, type TileType } from "./TileMap";
import type { Interactable } from "../systems/Interaction";
import type { Npc } from "../entities/Npc";

/**
 * The v1 town: a 40 x 30 tile hamlet on the west bank of a river.
 *
 * Authored as shapes rather than an ASCII picture so a miscounted row cannot
 * silently shift the whole town. Anything not covered by a shape is grass.
 *
 * Coordinate convention: (x, y) is a tile, x rightwards, y downwards, and
 * rectangles are written INCLUSIVE of both edges -- so { x: 4, y: 18, w: 4, h: 4 }
 * covers columns 4..7 and rows 18..21, i.e. a 4x4 patch.
 *
 * Layout:
 *   - A river fills the two eastern columns, with the main street bridging it.
 *   - The main street runs west-east along row 12, from the farmland to the river.
 *   - A side street runs north-south along column 18, meeting it at the crossroads.
 *   - Farmland sits south-west (columns 4..7, rows 18..25), reached by the path
 *     that branches south off the main street along column 6.
 *   - The north-east block is left clear for the mill and bakery, which arrive as
 *     buildings in a later task.
 *
 * Buildings, trees and fences are NOT here: they are world objects drawn on top
 * of the ground, and arrive with collision in TASK-105.
 */

interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TileType;
  /** Why this shape exists. Kept so later edits do not break the town's logic. */
  note: string;
}

const SHAPES: Shape[] = [
  // River, down the whole east edge.
  { x: 38, y: 0, w: 2, h: 30, type: "water", note: "镇东的小河，兼作地图边界" },

  // Main street: west-east, joining the farmland to the river bridge.
  { x: 4, y: 12, w: 31, h: 1, type: "path", note: "主街，连接农田与桥" },

  // Bridge across the river, continuing the main street eastwards.
  { x: 35, y: 12, w: 5, h: 1, type: "path", note: "过河的桥" },

  // Side street: north-south, crossing the main street.
  { x: 18, y: 6, w: 1, h: 21, type: "path", note: "南北向的支路" },

  // Spur south off the main street down to the farmland gate.
  { x: 6, y: 13, w: 1, h: 5, type: "path", note: "通往农田的小路" },

  // The farmland itself.
  { x: 4, y: 18, w: 4, h: 8, type: "farmland", note: "v1 的农田，种小麦" },

  // --- buildings -------------------------------------------------------------
  // Each building is a wall ring with a roof filling the interior, one shape per
  // building, wall first then roof. The roof must be exactly (w-2) x (h-2) and
  // offset by (1, 1): any other size leaves a hole in a wall or spills over it.
  // Buildings must also stay clear of the street rows and the farmland.

  // The player's cottage, north-west of the crossroads.
  { x: 8, y: 6, w: 5, h: 5, type: "wall", note: "玩家的住处（外墙）" },
  { x: 9, y: 7, w: 3, h: 3, type: "roof", note: "玩家的住处（屋顶）" },

  // The town hall, north-east. Where the mayor will stand in TASK-108.
  { x: 24, y: 6, w: 6, h: 5, type: "wall", note: "镇公所（外墙）" },
  { x: 25, y: 7, w: 4, h: 3, type: "roof", note: "镇公所（屋顶）" },

  // A cottage south of the street, west of the crossroads. South of row 13 so it
  // never blocks the main street.
  { x: 11, y: 15, w: 4, h: 4, type: "wall", note: "民居（外墙）" },
  { x: 12, y: 16, w: 2, h: 2, type: "roof", note: "民居（屋顶）" },

  // The mill, east of the crossroads. TASK-110 turns it into a workbench.
  { x: 24, y: 15, w: 4, h: 4, type: "wall", note: "磨坊（外墙）" },
  { x: 25, y: 16, w: 2, h: 2, type: "roof", note: "磨坊（屋顶）" }
];

function buildGrid(): TileType[] {
  const grid: TileType[] = new Array(MAP_COLUMNS * MAP_ROWS).fill("grass");

  for (const shape of SHAPES) {
    for (let y = shape.y; y < shape.y + shape.h; y++) {
      for (let x = shape.x; x < shape.x + shape.w; x++) {
        if (x < 0 || y < 0 || x >= MAP_COLUMNS || y >= MAP_ROWS) {
          throw new Error(`Shape "${shape.note}" runs outside the map at (${x}, ${y})`);
        }
        grid[y * MAP_COLUMNS + x] = shape.type;
      }
    }
  }

  return grid;
}

export function createTownMap(): TileMap {
  return new TileMap(buildGrid(), MAP_COLUMNS, MAP_ROWS, TILE);
}

/** Exposed so tests and tooling can reason about the authored layout. */
export const TOWN_SHAPES: readonly Shape[] = SHAPES;

/**
 * Things the player can walk up to and press E on.
 *
 * Each one sits on a WALKABLE tile in front of whatever it belongs to, roughly
 * two tiles out, so the player stands at the doorstep rather than inside the
 * wall. The prompt then appears once the player is looking at it.
 */
export const TOWN_INTERACTABLES: readonly Interactable[] = [
  { id: "home", label: "家门", x: 10.5 * TILE, y: 13.5 * TILE, radius: TILE * 0.9 },
  { id: "townhall", label: "镇公所", x: 26.5 * TILE, y: 13.5 * TILE, radius: TILE * 0.9 },
  { id: "mayor", label: "和镇长说话", x: 13.5 * TILE, y: 13.5 * TILE, radius: TILE * 0.9 },
  { id: "noticeboard", label: "告示板", x: 18.5 * TILE, y: 7.5 * TILE, radius: TILE * 0.9 },
  { id: "mill", label: "磨坊", x: 25.5 * TILE, y: 19.5 * TILE, radius: TILE * 0.9 },
  { id: "bakery", label: "烤炉", x: 12.5 * TILE, y: 14.5 * TILE, radius: TILE * 0.9 },
  { id: "farm", label: "农田", x: 6.5 * TILE, y: 17.5 * TILE, radius: TILE * 0.9 }
];

/**
 * Townspeople.
 *
 * Positioned in front of the building they belong to, on walkable ground, so
 * the player meets them on the way past rather than having to hunt for them.
 */
export const TOWN_NPCS: readonly Npc[] = [
  {
    id: "mayor",
    name: "镇长",
    // Standing on the pavement south of the main street, in front of the
    // cottage. Deliberately NOT sharing a spot with the townhall interactable:
    // two targets at one point would make it ambiguous who the player is
    // addressing, and the sprite would stand inside the prompt.
    x: 13.5 * TILE,
    y: 12.5 * TILE,
    facing: "down",
    spriteId: "npc_mayor"
  }
];
