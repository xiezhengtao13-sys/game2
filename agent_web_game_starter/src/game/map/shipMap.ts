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
  REACTOR_NORTH_DOOR,
  REACTOR_SOUTH_DOOR
} from "./reactorBayMap";
import {
  foreSensorGrid,
  FORE_COLUMNS,
  FORE_ROWS,
  agriGrid,
  L1_COLUMNS,
  L1_ROWS,
  ringGrid,
  R1_COLUMNS,
  R1_ROWS,
  industrialGrid,
  L2_COLUMNS,
  L2_ROWS,
  scienceLabGrid,
  R2_COLUMNS,
  R2_ROWS,
  propulsionGrid,
  PROPULSION_COLUMNS,
  PROPULSION_ROWS,
  PROPULSION_NORTH_DOOR
} from "./wingModulesMap";

/**
 * The complete 2,800m Yuanwang colony ship as ONE CONTINUOUS PLAYABLE MAP.
 *
 * Axial longitudinal layout (Bow North -> Stern South) + Lateral Colonial Modules:
 *   0-300m   Bow   : Fore Sensor & Ablation Shield Gallery (rows 2..15)
 *   300-550m Fore  : Bridge Command Hall (rows 18..37) + Passage + Captain's Stateroom (rows 43..58)
 *   550-1050m Hub  : Central Transit Hub (rows 63..86)
 *                     ├─ Port Wing  L-1 Agricultural & Ecological Module (cols 2..21)
 *                     └─ Stbd Wing  R-1 Social & 440m Rotating Ring Hall (cols 62..81)
 *   1050-1450m Mid : Crew Habitat & Shift Concourse (rows 91..113) [PLAYER SPAWN]
 *                     ├─ Port Wing  L-2 Heavy Industrial Foundry Workshop (cols 2..22) [STARTING ACCESS]
 *                     └─ Stbd Wing  R-2 Deep-Space Science & Telescope Lab (cols 61..81)
 *   1450-1850m U-1 : Central Medical & 12,408-Sleeper Cryo-Stasis Bay (rows 118..139)
 *   1850-2250m D-1 : EVA Airlock & Pioneer-1 Shuttle Hangar Bay (rows 144..161)
 *   2250-2550m Eng : Fusion Reactor Auxiliary Heat-Sink Pump Room (rows 166..183)
 *   2550-2800m Aft : Aft Propulsion Nozzle Array & 1200m Radiator Gallery (rows 187..201)
 *
 * Scale: 1 tile = 1 person height = 1.8 m (config.ts).
 */

export const SHIP_COLUMNS = 84;
export const SHIP_ROWS = 204;

export const FORE_ORIGIN = { tx: 27, ty: 2 };
export const BRIDGE_ORIGIN = { tx: 22, ty: 18 };
export const CABIN_ORIGIN = { tx: 30, ty: 43 };
export const TRANSIT_ORIGIN = { tx: 25, ty: 63 };
export const L1_ORIGIN = { tx: 2, ty: 64 };
export const R1_ORIGIN = { tx: 62, ty: 64 };
export const HABITAT_ORIGIN = { tx: 26, ty: 91 };
export const L2_ORIGIN = { tx: 2, ty: 91 };
export const R2_ORIGIN = { tx: 61, ty: 91 };
export const MEDICAL_ORIGIN = { tx: 27, ty: 118 };
export const HANGAR_ORIGIN = { tx: 26, ty: 144 };
export const REACTOR_ORIGIN = { tx: 26, ty: 166 };
export const PROPULSION_ORIGIN = { tx: 14, ty: 187 };

export const PASSAGE_WIDTH = 4;

/** Where a compartment's doorway lands on the deck. */
function doorOnDeck(origin: { tx: number; ty: number }, door: { x: number; y: number; w: number }) {
  return { x0: origin.tx + door.x, x1: origin.tx + door.x + door.w - 1, y: origin.ty + door.y };
}

/** Check that doorways line up and derive command passage bounds. */
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

  // Blit all 13 starship compartments onto the continuous deck
  blit(grid, foreSensorGrid(), FORE_ORIGIN);
  blit(grid, bridgeGrid(), BRIDGE_ORIGIN);
  blit(grid, cabinGrid(), CABIN_ORIGIN);
  blit(grid, transitHubGrid(), TRANSIT_ORIGIN);
  blit(grid, agriGrid(), L1_ORIGIN);
  blit(grid, ringGrid(), R1_ORIGIN);
  blit(grid, habitatGrid(), HABITAT_ORIGIN);
  blit(grid, industrialGrid(), L2_ORIGIN);
  blit(grid, scienceLabGrid(), R2_ORIGIN);
  blit(grid, medicalGrid(), MEDICAL_ORIGIN);
  blit(grid, hangarGrid(), HANGAR_ORIGIN);
  blit(grid, reactorBayGrid(), REACTOR_ORIGIN);
  blit(grid, propulsionGrid(), PROPULSION_ORIGIN);

  // 1. Command Passage (Bridge <-> Captain's Cabin)
  carveCommandPassage(grid);

  // 2. Starboard Arterial Corridor (Fore Sensors <-> Command Passage <-> Transit Hub)
  carveArterialCorridor(grid);

  // 3. Central Longitudinal Spine Passages (Transit -> Habitat -> Medical -> Hangar -> Reactor -> Propulsion)
  carveStraightPassage(grid, TRANSIT_ORIGIN.ty + TRANSIT_SOUTH_DOOR.y, HABITAT_ORIGIN.ty + HABITAT_NORTH_DOOR.y);
  carveStraightPassage(grid, HABITAT_ORIGIN.ty + HABITAT_SOUTH_DOOR.y, MEDICAL_ORIGIN.ty + MEDICAL_NORTH_DOOR.y);
  carveStraightPassage(grid, MEDICAL_ORIGIN.ty + MEDICAL_SOUTH_DOOR.y, HANGAR_ORIGIN.ty + HANGAR_NORTH_DOOR.y);
  carveStraightPassage(grid, HANGAR_ORIGIN.ty + HANGAR_SOUTH_DOOR.y, REACTOR_ORIGIN.ty + REACTOR_NORTH_DOOR.y);
  carveStraightPassage(grid, REACTOR_ORIGIN.ty + REACTOR_SOUTH_DOOR.y, PROPULSION_ORIGIN.ty + PROPULSION_NORTH_DOOR.y);

  // 4. Lateral Pressurized Gangways for Port & Starboard Modules
  carveHorizontalPassage(grid, 74, 76, L1_ORIGIN.tx + L1_COLUMNS - 1, TRANSIT_ORIGIN.tx);
  carveHorizontalPassage(grid, 74, 76, TRANSIT_ORIGIN.tx + TRANSIT_COLUMNS - 1, R1_ORIGIN.tx);
  carveHorizontalPassage(grid, 101, 103, L2_ORIGIN.tx + L2_COLUMNS - 1, HABITAT_ORIGIN.tx);
  carveHorizontalPassage(grid, 101, 103, HABITAT_ORIGIN.tx + HABITAT_COLUMNS - 1, R2_ORIGIN.tx);

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

  const mid = (x0 + x1) / 2;
  const spine = [Math.floor(mid), Math.ceil(mid)];
  for (let y = top + 2; y < bottom - 1; y += 2) {
    for (const x of spine) grid[y][x] = "floor_light";
  }

  const gapTop = BRIDGE_ORIGIN.ty + BRIDGE_ROWS;
  const gapBottom = CABIN_ORIGIN.ty - 1;
  const bayTop = Math.floor((gapTop + gapBottom) / 2);
  for (const y of [bayTop, bayTop + 1]) {
    if (grid[y][x0 - 1] === "wall") grid[y][x0 - 1] = "wall_dark";
  }
}

/**
 * Starboard arterial corridor: joins Fore Sensors, Command Passage, and Central Transit Hub
 * without piercing Bridge outer bulkheads or leaving bare hull exposure.
 */
function carveArterialCorridor(grid: TileType[][]): void {
  // 1. North-West turn from Fore Sensors east door (tx=56, rows 11..13) into trunk (cols 62..65)
  for (let y = 10; y <= 14; y++) {
    for (let x = 57; x <= 66; x++) {
      if (y >= 11 && y <= 13 && x >= 57 && x <= 65) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // 2. Vertical Starboard Trunk along cols 62..65 from row 14 down to row 59
  for (let y = 14; y <= 59; y++) {
    for (let x = 61; x <= 66; x++) {
      if (x >= 62 && x <= 65) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // 3. East branch from Command Passage (rows 39..41, cols 45..62)
  for (let y = 38; y <= 42; y++) {
    for (let x = 45; x <= 62; x++) {
      if (y >= 39 && y <= 41 && x >= 45 && x <= 61) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // 4. Turn west from trunk (rows 60..61, cols 40..65) and descend at cols 40..43 into Transit North Door (row 63)
  for (let y = 59; y <= 62; y++) {
    for (let x = 39; x <= 66; x++) {
      const inTurnFloor = y >= 60 && y <= 61 && x >= 40 && x <= 65;
      const inTransitStub = y === 62 && x >= 40 && x <= 43;
      if (inTurnFloor || inTransitStub) {
        grid[y][x] = "deck";
      } else if (grid[y][x] === "hull") {
        grid[y][x] = "wall";
      }
    }
  }

  // Ensure trunk walls at y=59 cols 62..65 stay open floor (since y=59 connects trunk -> turn!)
  for (let x = 62; x <= 65; x++) {
    grid[59][x] = "deck";
  }

  // Guide lights down arterial segments
  for (let x = 58; x <= 64; x += 2) grid[12][x] = "floor_light";
  for (let x = 47; x <= 60; x += 3) grid[40][x] = "floor_light";
  for (let y = 16; y <= 57; y += 3) {
    grid[y][63] = "floor_light";
    grid[y][64] = "floor_light";
  }
  for (let x = 42; x <= 62; x += 3) grid[60][x] = "floor_light";
}

/** Carves a 4-tile wide vertical spine corridor aligned on columns 40..43. */
function carveStraightPassage(grid: TileType[][], fromY: number, toY: number): void {
  const x0 = 40;
  const x1 = 43;

  for (let y = fromY; y <= toY; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (x >= x0 && x <= x1) {
        if (!isFloor(grid[y][x])) grid[y][x] = "deck";
      } else {
        if (grid[y][x] === "hull") grid[y][x] = "wall";
      }
    }
  }

  for (let y = fromY + 1; y < toY; y += 2) {
    grid[y][41] = "floor_light";
    grid[y][42] = "floor_light";
  }
}

/** Carves a 3-tile high lateral gangway between port/starboard modules and the spine. */
function carveHorizontalPassage(
  grid: TileType[][],
  y0: number,
  y1: number,
  fromX: number,
  toX: number
): void {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  const midY = Math.floor((y0 + y1) / 2);

  for (let y = y0 - 1; y <= y1 + 1; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (y >= y0 && y <= y1) {
        if (!isFloor(grid[y][x])) grid[y][x] = "deck";
      } else {
        if (grid[y][x] === "hull") grid[y][x] = "wall";
      }
    }
  }

  for (let x = minX + 1; x < maxX; x += 2) {
    grid[midY][x] = "floor_light";
  }
}

/** The kinds of tile the player can stand on. */
export function isFloor(type: TileType | undefined): boolean {
  return type === "deck" || type === "deck_dark" || type === "deck_rug" || type === "floor_light";
}

export function createShipMap(tileSize: number): TileMap {
  return new TileMap(buildShipGrid().flat(), SHIP_COLUMNS, SHIP_ROWS, tileSize);
}

/**
 * Where the protagonist begins Shift 2: inside the cramped lower Crew Habitat bunks,
 * next to Shift Foreman Lao Zhou and the open L-2 Heavy Industrial Workshop.
 * All mid-ship, upper command, hangar, reactor, and captain quarters are sealed off.
 */
export function shipSpawn(tileSize: number): { x: number; y: number } {
  const spawnTx = HABITAT_ORIGIN.tx + 10;
  const spawnTy = HABITAT_ORIGIN.ty + 10;
  return {
    x: spawnTx * tileSize + (tileSize - 32) / 2,
    y: spawnTy * tileSize
  };
}

/** Every compartment and arterial wing of the 2,800m Yuanwang ship. */
export type Place =
  | "fore_sensors"
  | "bridge"
  | "passage"
  | "cabin"
  | "transit_corridor"
  | "transit_hub"
  | "agri_module"
  | "ring_module"
  | "crew_habitat"
  | "industrial_bay"
  | "science_lab"
  | "medical_bay"
  | "hangar_bay"
  | "reactor_bay"
  | "propulsion_aft"
  | "structure";

export function placeAt(tx: number, ty: number): Place {
  if (inCompartment(FORE_ORIGIN, FORE_COLUMNS, FORE_ROWS, tx, ty)) return "fore_sensors";
  if (inCompartment(BRIDGE_ORIGIN, BRIDGE_COLUMNS, BRIDGE_ROWS, tx, ty)) return "bridge";
  if (inCompartment(CABIN_ORIGIN, ROOM_COLUMNS, ROOM_ROWS, tx, ty)) return "cabin";
  if (inCompartment(TRANSIT_ORIGIN, TRANSIT_COLUMNS, TRANSIT_ROWS, tx, ty)) return "transit_hub";
  if (inCompartment(L1_ORIGIN, L1_COLUMNS, L1_ROWS, tx, ty)) return "agri_module";
  if (inCompartment(R1_ORIGIN, R1_COLUMNS, R1_ROWS, tx, ty)) return "ring_module";
  if (inCompartment(HABITAT_ORIGIN, HABITAT_COLUMNS, HABITAT_ROWS, tx, ty)) return "crew_habitat";
  if (inCompartment(L2_ORIGIN, L2_COLUMNS, L2_ROWS, tx, ty)) return "industrial_bay";
  if (inCompartment(R2_ORIGIN, R2_COLUMNS, R2_ROWS, tx, ty)) return "science_lab";
  if (inCompartment(MEDICAL_ORIGIN, MEDICAL_COLUMNS, MEDICAL_ROWS, tx, ty)) return "medical_bay";
  if (inCompartment(HANGAR_ORIGIN, HANGAR_COLUMNS, HANGAR_ROWS, tx, ty)) return "hangar_bay";
  if (inCompartment(REACTOR_ORIGIN, REACTOR_COLUMNS, REACTOR_ROWS, tx, ty)) return "reactor_bay";
  if (inCompartment(PROPULSION_ORIGIN, PROPULSION_COLUMNS, PROPULSION_ROWS, tx, ty)) return "propulsion_aft";

  if (tx >= PASSAGE.x0 && tx <= PASSAGE.x1 && ty >= BRIDGE_ORIGIN.ty + BRIDGE_ROWS && ty < CABIN_ORIGIN.ty) {
    return "passage";
  }

  // Arterial connectors, spine links, and pressurized lateral gangways
  if (
    (ty >= 11 && ty <= 13 && tx >= 57 && tx <= 65) ||
    (ty >= 14 && ty <= 61 && tx >= 62 && tx <= 65) ||
    (ty >= 39 && ty <= 41 && tx >= 45 && tx <= 61) ||
    (ty >= 60 && ty <= 61 && tx >= 40 && tx <= 61) ||
    (ty === 62 && tx >= 40 && tx <= 43) ||
    (ty > TRANSIT_ORIGIN.ty + TRANSIT_ROWS - 1 && ty < HABITAT_ORIGIN.ty && tx >= 40 && tx <= 43) ||
    (ty > HABITAT_ORIGIN.ty + HABITAT_ROWS - 1 && ty < MEDICAL_ORIGIN.ty && tx >= 40 && tx <= 43) ||
    (ty > MEDICAL_ORIGIN.ty + MEDICAL_ROWS - 1 && ty < HANGAR_ORIGIN.ty && tx >= 40 && tx <= 43) ||
    (ty > HANGAR_ORIGIN.ty + HANGAR_ROWS - 1 && ty < REACTOR_ORIGIN.ty && tx >= 40 && tx <= 43) ||
    (ty > REACTOR_ORIGIN.ty + REACTOR_ROWS - 1 && ty < PROPULSION_ORIGIN.ty && tx >= 40 && tx <= 43) ||
    (ty >= 74 && ty <= 76 && tx >= L1_ORIGIN.tx + L1_COLUMNS && tx < TRANSIT_ORIGIN.tx) ||
    (ty >= 74 && ty <= 76 && tx >= TRANSIT_ORIGIN.tx + TRANSIT_COLUMNS && tx < R1_ORIGIN.tx) ||
    (ty >= 101 && ty <= 103 && tx >= L2_ORIGIN.tx + L2_COLUMNS && tx < HABITAT_ORIGIN.tx) ||
    (ty >= 101 && ty <= 103 && tx >= HABITAT_ORIGIN.tx + HABITAT_COLUMNS && tx < R2_ORIGIN.tx)
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
export const FORE_BOUNDS = { ...FORE_ORIGIN, columns: FORE_COLUMNS, rows: FORE_ROWS };
export const BRIDGE_BOUNDS = { ...BRIDGE_ORIGIN, columns: BRIDGE_COLUMNS, rows: BRIDGE_ROWS };
export const CABIN_BOUNDS = { ...CABIN_ORIGIN, columns: ROOM_COLUMNS, rows: ROOM_ROWS };
export const TRANSIT_BOUNDS = { ...TRANSIT_ORIGIN, columns: TRANSIT_COLUMNS, rows: TRANSIT_ROWS };
export const L1_BOUNDS = { ...L1_ORIGIN, columns: L1_COLUMNS, rows: L1_ROWS };
export const R1_BOUNDS = { ...R1_ORIGIN, columns: R1_COLUMNS, rows: R1_ROWS };
export const HABITAT_BOUNDS = { ...HABITAT_ORIGIN, columns: HABITAT_COLUMNS, rows: HABITAT_ROWS };
export const L2_BOUNDS = { ...L2_ORIGIN, columns: L2_COLUMNS, rows: L2_ROWS };
export const R2_BOUNDS = { ...R2_ORIGIN, columns: R2_COLUMNS, rows: R2_ROWS };
export const MEDICAL_BOUNDS = { ...MEDICAL_ORIGIN, columns: MEDICAL_COLUMNS, rows: MEDICAL_ROWS };
export const HANGAR_BOUNDS = { ...HANGAR_ORIGIN, columns: HANGAR_COLUMNS, rows: HANGAR_ROWS };
export const REACTOR_BOUNDS = { ...REACTOR_ORIGIN, columns: REACTOR_COLUMNS, rows: REACTOR_ROWS };
export const PROPULSION_BOUNDS = { ...PROPULSION_ORIGIN, columns: PROPULSION_COLUMNS, rows: PROPULSION_ROWS };
export const PASSAGE_BOUNDS = { ...PASSAGE, width: PASSAGE_WIDTH };
