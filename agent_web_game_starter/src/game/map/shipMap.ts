import { TileMap, type TileType } from "./TileMap";
import { cabinGrid, CABIN_DOOR, ROOM_COLUMNS, ROOM_ROWS } from "./captainRoomMap";
import { bridgeGrid, BRIDGE_DOOR, BRIDGE_COLUMNS, BRIDGE_ROWS } from "./bridgeMap";
import {
  transitHubGrid,
  TRANSIT_COLUMNS,
  TRANSIT_ROWS,
  TRANSIT_NORTH_DOOR,
  TRANSIT_SOUTH_DOOR
} from "./transitHubMap";
import {
  hangarGrid,
  HANGAR_COLUMNS,
  HANGAR_ROWS,
  HANGAR_NORTH_DOOR,
  HANGAR_SOUTH_DOOR
} from "./hangarMap";
import {
  habitatGrid,
  HABITAT_COLUMNS,
  HABITAT_ROWS,
  HABITAT_NORTH_DOOR,
  HABITAT_SOUTH_DOOR
} from "./habitatMap";
import {
  medicalGrid,
  MEDICAL_COLUMNS,
  MEDICAL_ROWS,
  MEDICAL_NORTH_DOOR,
  MEDICAL_SOUTH_DOOR
} from "./medicalMap";
import {
  reactorBayGrid,
  REACTOR_COLUMNS,
  REACTOR_ROWS,
  REACTOR_NORTH_DOOR
} from "./reactorBayMap";

/**
 * The complete playable Yuanwang colony ship, as ONE CONTINUOUS MAP.
 *
 * Longitudinal compartments:
 *   1. Bridge (舰桥, rows 0..19)
 *   2. Command Passage (指挥通道, rows 20..23)
 *   3. Captain's Stateroom (舰长室, rows 24..39)
 *   4. Main Arterial Corridor (中央主交通干线联络道, rows 21..41)
 *   5. Central Transit Hub (中央交通站 / 枢纽大厅, rows 42..65)
 *   6. EVA Airlock & Shuttle Hangar Bay (穿梭机机库备勤与舱外整备舱, rows 70..87)
 *   7. Crew Habitat & Mess Hall (船员生活区与公共综合舱, rows 92..114)
 *   8. Central Medical & Cryo-Stasis Bay (中央医疗与休眠监视舱, rows 119..140)
 *   9. Reactor Auxiliary Heat-Sink Station (聚变动力与应急散热排险泵房, rows 145..162)
 *
 * Scale: 1 tile = 1 person height = 1.8 m (config.ts).
 * Total playable area: 40 cols x 166 rows = 72 m wide x 298.8 m long.
 */

/** Where each compartment sits on the deck. */
export const BRIDGE_ORIGIN = { tx: 0, ty: 0 };
export const CABIN_ORIGIN = { tx: 8, ty: 24 };
export const TRANSIT_ORIGIN = { tx: 3, ty: 42 };
export const HANGAR_ORIGIN = { tx: 4, ty: 70 };
export const HABITAT_ORIGIN = { tx: 4, ty: 92 };
export const MEDICAL_ORIGIN = { tx: 5, ty: 119 };
export const REACTOR_ORIGIN = { tx: 4, ty: 145 };

export const PASSAGE_WIDTH = 4;
export const SHIP_COLUMNS = 40;
export const SHIP_ROWS = 166;

/** Where a compartment's doorway lands on the deck. */
function doorOnDeck(origin: { tx: number; ty: number }, door: { x: number; y: number; w: number }) {
  return { x0: origin.tx + door.x, x1: origin.tx + door.x + door.w - 1, y: origin.ty + door.y };
}

/** Check that doorways line up and derive passage bounds. */
function measurePassage(): { x0: number; x1: number; top: number; bottom: number } {
  const cabin = doorOnDeck(CABIN_ORIGIN, CABIN_DOOR);
  const bridge = doorOnDeck(BRIDGE_ORIGIN, BRIDGE_DOOR);

  const shoulder = (PASSAGE_WIDTH - CABIN_DOOR.w) / 2;

  return {
    x0: cabin.x0 - shoulder,
    x1: cabin.x1 + shoulder,
    top: bridge.y,
    bottom: cabin.y
  };
}

export const PASSAGE = measurePassage();

export function buildShipGrid(): TileType[][] {
  const grid: TileType[][] = [];

  for (let y = 0; y < SHIP_ROWS; y++) {
    grid.push(new Array<TileType>(SHIP_COLUMNS).fill("hull"));
  }

  // Blit the individual compartments onto the continuous ship deck
  blit(grid, bridgeGrid(), BRIDGE_ORIGIN);
  blit(grid, cabinGrid(), CABIN_ORIGIN);
  blit(grid, transitHubGrid(), TRANSIT_ORIGIN);
  blit(grid, hangarGrid(), HANGAR_ORIGIN);
  blit(grid, habitatGrid(), HABITAT_ORIGIN);
  blit(grid, medicalGrid(), MEDICAL_ORIGIN);
  blit(grid, reactorBayGrid(), REACTOR_ORIGIN);

  // Carve passages and arterial corridors
  carveCommandPassage(grid);
  carveArterialCorridor(grid);
  carveStraightPassage(grid, TRANSIT_ORIGIN.ty + TRANSIT_SOUTH_DOOR.y, HANGAR_ORIGIN.ty + HANGAR_NORTH_DOOR.y);
  carveStraightPassage(grid, HANGAR_ORIGIN.ty + HANGAR_SOUTH_DOOR.y, HABITAT_ORIGIN.ty + HABITAT_NORTH_DOOR.y);
  carveStraightPassage(grid, HABITAT_ORIGIN.ty + HABITAT_SOUTH_DOOR.y, MEDICAL_ORIGIN.ty + MEDICAL_NORTH_DOOR.y);
  carveStraightPassage(grid, MEDICAL_ORIGIN.ty + MEDICAL_SOUTH_DOOR.y, REACTOR_ORIGIN.ty + REACTOR_NORTH_DOOR.y);

  return grid;
}

function blit(grid: TileType[][], rows: TileType[][], origin: { tx: number; ty: number }): void {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const value = rows[y][x];
      if (value === "hull") continue;

      const wx = origin.tx + x;
      const wy = origin.ty + y;
      if (wx < 0 || wy < 0 || wx >= SHIP_COLUMNS || wy >= SHIP_ROWS) {
        throw new Error(`Compartment runs off the ship at ${wx},${wy}`);
      }
      grid[wy][wx] = value;
    }
  }
}

/** Passage between bridge and cabin. */
function carveCommandPassage(grid: TileType[][]): void {
  const { x0, x1, top, bottom } = PASSAGE;

  for (let y = top; y <= bottom; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x < 0 || y < 0 || x >= SHIP_COLUMNS || y >= SHIP_ROWS) continue;

      if (x >= x0 && x <= x1) {
        if (y < bottom && !isFloor(grid[y][x])) grid[y][x] = "deck";
        continue;
      }

      if (grid[y][x] === "hull") grid[y][x] = "wall";
    }
  }

  // Guide light down the center
  const mid = (x0 + x1) / 2;
  const spine = [Math.floor(mid), Math.ceil(mid)];
  for (let y = top + 2; y < bottom - 1; y += 2) {
    for (const x of spine) grid[y][x] = "floor_light";
  }

  // Wall panels on gap rows
  const gapTop = BRIDGE_ORIGIN.ty + BRIDGE_ROWS;
  const gapBottom = CABIN_ORIGIN.ty - 1;
  const bayTop = Math.floor((gapTop + gapBottom) / 2);
  for (const y of [bayTop, bayTop + 1]) {
    grid[y][x0 - 1] = "wall_dark";
  }
}

/**
 * Starboard arterial corridor: connects the command passage to the Central Transit Hub.
 */
function carveArterialCorridor(grid: TileType[][]): void {
  // 1. East branch from command passage (rows 21..23, cols 22..34)
  for (let y = 20; y <= 24; y++) {
    for (let x = 21; x <= 36; x++) {
      if (y >= 21 && y <= 23 && x >= 22 && x <= 35) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // 2. South run along starboard side (rows 23..41, cols 32..35)
  for (let y = 24; y <= 41; y++) {
    for (let x = 31; x <= 36; x++) {
      if (x >= 32 && x <= 35) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // 3. Turn into Transit Hub north entrance (row 40..42, cols 17..33)
  for (let y = 39; y <= 42; y++) {
    for (let x = 17; x <= 33; x++) {
      if (y >= 40 && y <= 41 && x >= 18 && x <= 33) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // Add guide lights along arterial route
  for (let x = 24; x <= 34; x += 2) grid[22][x] = "floor_light";
  for (let y = 26; y <= 38; y += 3) {
    grid[y][33] = "floor_light";
    grid[y][34] = "floor_light";
  }
  for (let x = 20; x <= 30; x += 2) grid[41][x] = "floor_light";
}

/** Carves a 4-tile wide straight corridor between two vertical door thresholds. */
function carveStraightPassage(grid: TileType[][], fromY: number, toY: number): void {
  const x0 = 18;
  const x1 = 21;

  for (let y = fromY; y <= toY; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x >= x0 && x <= x1) {
        if (!isFloor(grid[y][x])) grid[y][x] = "deck";
      } else {
        if (grid[y][x] === "hull") grid[y][x] = "wall";
      }
    }
  }

  // Guide light along the corridor
  for (let y = fromY + 1; y < toY; y += 2) {
    grid[y][19] = "floor_light";
    grid[y][20] = "floor_light";
  }
}

/** The kinds of tile the player can stand on. */
export function isFloor(type: TileType | undefined): boolean {
  return type === "deck" || type === "deck_dark" || type === "deck_rug" || type === "floor_light";
}

export function createShipMap(tileSize: number): TileMap {
  return new TileMap(buildShipGrid().flat(), SHIP_COLUMNS, SHIP_ROWS, tileSize);
}

/** Where the player arrives: inside the cabin's doorway, walking in. */
export function shipSpawn(tileSize: number): { x: number; y: number } {
  const door = doorOnDeck(CABIN_ORIGIN, CABIN_DOOR);

  return {
    x: ((door.x0 + door.x1 + 1) / 2) * tileSize - 16,
    y: (door.y + 3) * tileSize
  };
}

/** Which part of the ship a tile is in. */
export type Place =
  | "bridge"
  | "passage"
  | "cabin"
  | "transit_corridor"
  | "transit_hub"
  | "hangar_bay"
  | "crew_habitat"
  | "medical_bay"
  | "reactor_bay"
  | "structure";

export function placeAt(tx: number, ty: number): Place {
  if (inCompartment(BRIDGE_ORIGIN, BRIDGE_COLUMNS, BRIDGE_ROWS, tx, ty)) return "bridge";
  if (inCompartment(CABIN_ORIGIN, ROOM_COLUMNS, ROOM_ROWS, tx, ty)) return "cabin";
  if (inCompartment(TRANSIT_ORIGIN, TRANSIT_COLUMNS, TRANSIT_ROWS, tx, ty)) return "transit_hub";
  if (inCompartment(HANGAR_ORIGIN, HANGAR_COLUMNS, HANGAR_ROWS, tx, ty)) return "hangar_bay";
  if (inCompartment(HABITAT_ORIGIN, HABITAT_COLUMNS, HABITAT_ROWS, tx, ty)) return "crew_habitat";
  if (inCompartment(MEDICAL_ORIGIN, MEDICAL_COLUMNS, MEDICAL_ROWS, tx, ty)) return "medical_bay";
  if (inCompartment(REACTOR_ORIGIN, REACTOR_COLUMNS, REACTOR_ROWS, tx, ty)) return "reactor_bay";

  if (tx >= PASSAGE.x0 && tx <= PASSAGE.x1 && ty > BRIDGE_ROWS - 1 && ty < CABIN_ORIGIN.ty) {
    return "passage";
  }

  // Arterial connector routes and straight passages
  if (
    (ty >= 21 && ty <= 23 && tx >= 22 && tx <= 35) ||
    (ty >= 24 && ty <= 41 && tx >= 32 && tx <= 35) ||
    (ty >= 40 && ty <= 41 && tx >= 18 && tx <= 33) ||
    (ty > TRANSIT_ORIGIN.ty + TRANSIT_ROWS - 1 && ty < HANGAR_ORIGIN.ty && tx >= 18 && tx <= 21) ||
    (ty > HANGAR_ORIGIN.ty + HANGAR_ROWS - 1 && ty < HABITAT_ORIGIN.ty && tx >= 18 && tx <= 21) ||
    (ty > HABITAT_ORIGIN.ty + HABITAT_ROWS - 1 && ty < MEDICAL_ORIGIN.ty && tx >= 18 && tx <= 21) ||
    (ty > MEDICAL_ORIGIN.ty + MEDICAL_ROWS - 1 && ty < REACTOR_ORIGIN.ty && tx >= 18 && tx <= 21)
  ) {
    return "transit_corridor";
  }

  return "structure";
}

function inCompartment(
  origin: { tx: number; ty: number },
  columns: number,
  rows: number,
  tx: number,
  ty: number
): boolean {
  return tx >= origin.tx && tx < origin.tx + columns && ty >= origin.ty && ty < origin.ty + rows;
}

/** Compartment extents and joins for tests and tooling. */
export const CABIN_BOUNDS = { ...CABIN_ORIGIN, columns: ROOM_COLUMNS, rows: ROOM_ROWS };
export const BRIDGE_BOUNDS = { ...BRIDGE_ORIGIN, columns: BRIDGE_COLUMNS, rows: BRIDGE_ROWS };
export const TRANSIT_BOUNDS = { ...TRANSIT_ORIGIN, columns: TRANSIT_COLUMNS, rows: TRANSIT_ROWS };
export const HANGAR_BOUNDS = { ...HANGAR_ORIGIN, columns: HANGAR_COLUMNS, rows: HANGAR_ROWS };
export const HABITAT_BOUNDS = { ...HABITAT_ORIGIN, columns: HABITAT_COLUMNS, rows: HABITAT_ROWS };
export const MEDICAL_BOUNDS = { ...MEDICAL_ORIGIN, columns: MEDICAL_COLUMNS, rows: MEDICAL_ROWS };
export const REACTOR_BOUNDS = { ...REACTOR_ORIGIN, columns: REACTOR_COLUMNS, rows: REACTOR_ROWS };
export const PASSAGE_BOUNDS = { ...PASSAGE, width: PASSAGE_WIDTH };
