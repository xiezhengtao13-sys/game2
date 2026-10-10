import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createShipMap,
  BRIDGE_BOUNDS,
  CABIN_BOUNDS,
  TRANSIT_BOUNDS,
  HANGAR_BOUNDS,
  HABITAT_BOUNDS,
  MEDICAL_BOUNDS,
  REACTOR_BOUNDS,
  SHIP_COLUMNS,
  SHIP_ROWS,
  placeAt,
  isFloor
} from "../src/game/map/shipMap";
import {
  SHIP_PROPS,
  ALL_SHIP_PEOPLE,
  PLACE_LABELS
} from "../src/game/scenes/shipProps";
import { TILE, PLAYER_INTERACT_REACH } from "../src/game/config";
import { ship, standableTiles } from "./shipWorld";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";

/**
 * Full Yuanwang colony ship verification (TASK-G2 & TASK-G3).
 *
 * Verifies that all 7 compartments (Bridge, Captain's Stateroom, Central Transit Hub,
 * Shuttle Hangar Bay, Crew Habitat & Mess Hall, Central Medical & Cryo-Stasis Bay,
 * Reactor Auxiliary Heat-Sink Station) are seamlessly joined into ONE continuous playable world.
 */

const map = createShipMap(TILE);
const world = ship();
const reached = standableTiles(world);

describe("the full Yuanwang ship architecture (TASK-G2 & TASK-G3)", () => {
  test("map has the grand 166-row scale to fit all 7 compartments", () => {
    assert.equal(map.width, SHIP_COLUMNS);
    assert.equal(map.height, SHIP_ROWS);
    assert.equal(SHIP_COLUMNS, 40);
    assert.equal(SHIP_ROWS, 166);

    assert.ok(BRIDGE_BOUNDS.ty + BRIDGE_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(CABIN_BOUNDS.ty + CABIN_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(TRANSIT_BOUNDS.ty + TRANSIT_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(HANGAR_BOUNDS.ty + HANGAR_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(HABITAT_BOUNDS.ty + HABITAT_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(MEDICAL_BOUNDS.ty + MEDICAL_BOUNDS.rows <= SHIP_ROWS);
    assert.ok(REACTOR_BOUNDS.ty + REACTOR_BOUNDS.rows <= SHIP_ROWS);
  });

  test("all 7 compartments fit within the 40-column beam", () => {
    assert.ok(BRIDGE_BOUNDS.tx + BRIDGE_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(CABIN_BOUNDS.tx + CABIN_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(TRANSIT_BOUNDS.tx + TRANSIT_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(HANGAR_BOUNDS.tx + HANGAR_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(HABITAT_BOUNDS.tx + HABITAT_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(MEDICAL_BOUNDS.tx + MEDICAL_BOUNDS.columns <= SHIP_COLUMNS);
    assert.ok(REACTOR_BOUNDS.tx + REACTOR_BOUNDS.columns <= SHIP_COLUMNS);
  });

  test("the flood fill reaches all 7 compartments from spawn", () => {
    assert.ok(reached.size > 2000, `only ${reached.size} floor tiles reached`);

    const compartments = [
      { name: "Bridge", bounds: BRIDGE_BOUNDS, place: "bridge" },
      { name: "Cabin", bounds: CABIN_BOUNDS, place: "cabin" },
      { name: "Transit Hub", bounds: TRANSIT_BOUNDS, place: "transit_hub" },
      { name: "Shuttle Hangar", bounds: HANGAR_BOUNDS, place: "hangar_bay" },
      { name: "Crew Habitat", bounds: HABITAT_BOUNDS, place: "crew_habitat" },
      { name: "Medical Bay", bounds: MEDICAL_BOUNDS, place: "medical_bay" },
      { name: "Reactor Bay", bounds: REACTOR_BOUNDS, place: "reactor_bay" }
    ];

    for (const comp of compartments) {
      let floorCount = 0;
      let reachedCount = 0;

      for (let y = comp.bounds.ty; y < comp.bounds.ty + comp.bounds.rows; y++) {
        for (let x = comp.bounds.tx; x < comp.bounds.tx + comp.bounds.columns; x++) {
          if (!isFloor(map.tileAt(x, y))) continue;
          floorCount++;
          if (reached.has(`${x},${y}`)) reachedCount++;
        }
      }

      assert.ok(floorCount > 150, `${comp.name} has only ${floorCount} floor tiles`);
      assert.equal(
        reachedCount,
        floorCount,
        `${comp.name} has ${floorCount - reachedCount} unreachable floor tiles out of ${floorCount}`
      );
    }
  });

  test("no walkable tile on the entire ship leaks into outer bare structure", () => {
    for (const key of reached) {
      const [tx, ty] = key.split(",").map(Number);
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        assert.notEqual(
          map.tileAt(tx + ox, ty + oy),
          "hull",
          `walkable deck at ${tx},${ty} touches bare hull structure at ${tx + ox},${ty + oy}`
        );
      }
    }
  });

  test("all place labels are defined and recognized by HUD", () => {
    assert.equal(PLACE_LABELS.bridge, "远望号 · 舰桥");
    assert.equal(PLACE_LABELS.passage, "远望号 · 通道");
    assert.equal(PLACE_LABELS.cabin, "远望号 · 舰长室");
    assert.equal(PLACE_LABELS.transit_corridor, "远望号 · 主交通干线");
    assert.equal(PLACE_LABELS.transit_hub, "远望号 · 中央交通站");
    assert.equal(PLACE_LABELS.hangar_bay, "远望号 · 穿梭机机库");
    assert.equal(PLACE_LABELS.crew_habitat, "远望号 · 船员生活区");
    assert.equal(PLACE_LABELS.medical_bay, "远望号 · 医疗与休眠舱");
    assert.equal(PLACE_LABELS.reactor_bay, "远望号 · 动力排险泵房");
    assert.equal(PLACE_LABELS.structure, "远望号 · 结构区");

    // Spot-check coordinates inside each compartment
    assert.equal(placeAt(BRIDGE_BOUNDS.tx + 10, BRIDGE_BOUNDS.ty + 10), "bridge");
    assert.equal(placeAt(CABIN_BOUNDS.tx + 5, CABIN_BOUNDS.ty + 5), "cabin");
    assert.equal(placeAt(TRANSIT_BOUNDS.tx + 10, TRANSIT_BOUNDS.ty + 5), "transit_hub");
    assert.equal(placeAt(HANGAR_BOUNDS.tx + 10, HANGAR_BOUNDS.ty + 5), "hangar_bay");
    assert.equal(placeAt(HABITAT_BOUNDS.tx + 10, HABITAT_BOUNDS.ty + 5), "crew_habitat");
    assert.equal(placeAt(MEDICAL_BOUNDS.tx + 10, MEDICAL_BOUNDS.ty + 5), "medical_bay");
    assert.equal(placeAt(REACTOR_BOUNDS.tx + 10, REACTOR_BOUNDS.ty + 5), "reactor_bay");
    assert.equal(placeAt(33, 30), "transit_corridor");
    assert.equal(placeAt(0, 30), "structure");
    assert.equal(placeAt(0, 165), "structure");
    assert.equal(placeAt(39, 165), "structure");
  });
});

describe("crew and fixtures across the expanded ship (TASK-G2)", () => {
  test("all 5 crew members are aboard and standing on walkable floor", () => {
    assert.equal(ALL_SHIP_PEOPLE.length, 5);

    for (const person of ALL_SHIP_PEOPLE) {
      const tx = Math.floor(person.x / TILE);
      const ty = Math.floor((person.y - 8) / TILE);
      assert.ok(isFloor(map.tileAt(tx, ty)), `${person.name} is standing on non-floor: ${map.tileAt(tx, ty)}`);
      assert.ok(reached.has(`${tx},${ty}`), `${person.name} is standing at unreachable tile ${tx},${ty}`);
      assert.ok(person.lines.length > 0, `${person.name} has no dialogue lines`);
    }
  });

  test("every examinable prop across all 5 compartments can be reached", () => {
    const examinableProps = SHIP_PROPS.filter((p) => p.lines && p.lines.length > 0);
    assert.ok(examinableProps.length >= 25, `only ${examinableProps.length} examinable props found`);

    for (const prop of examinableProps) {
      let found = false;
      for (const key of reached) {
        const [tx, ty] = key.split(",").map(Number);
        const centerX = tx * TILE + TILE / 2;
        const feetY = ty * TILE + TILE / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          if (findInteractable(world.examinable, reach)?.label === prop.label) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      assert.ok(found, `prop "${prop.label}" at (${prop.x}, ${prop.y}) is unreachable`);
    }
  });
});
