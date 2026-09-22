import { MAP_COLUMNS, MAP_ROWS, TILE } from "../config";
import { TileMap, type TileType } from "./TileMap";

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
  { x: 4, y: 18, w: 4, h: 8, type: "farmland", note: "v1 的农田，种小麦" }
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
