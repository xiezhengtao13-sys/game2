import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createShipMap,
  FORE_BOUNDS,
  BRIDGE_BOUNDS,
  CABIN_BOUNDS,
  TRANSIT_BOUNDS,
  L1_BOUNDS,
  R1_BOUNDS,
  HABITAT_BOUNDS,
  L2_BOUNDS,
  R2_BOUNDS,
  MEDICAL_BOUNDS,
  HANGAR_BOUNDS,
  REACTOR_BOUNDS,
  PROPULSION_BOUNDS,
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
import { ship, standableTiles, unlockedTiles } from "./shipWorld";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";

/**
 * Full 2,800m Yuanwang colony ship verification across all 13 compartments & lateral wings.
 */

const map = createShipMap(TILE);
const world = ship();
const reached = standableTiles(world);

describe("the complete 13-compartment 2,800m Yuanwang ship architecture", () => {
  test("map has the full 84 x 204 scale to fit all 13 central and lateral compartments", () => {
    assert.equal(map.width, SHIP_COLUMNS);
    assert.equal(map.height, SHIP_ROWS);
    assert.equal(SHIP_COLUMNS, 84);
    assert.equal(SHIP_ROWS, 204);

    for (const bounds of [
      FORE_BOUNDS,
      BRIDGE_BOUNDS,
      CABIN_BOUNDS,
      TRANSIT_BOUNDS,
      L1_BOUNDS,
      R1_BOUNDS,
      HABITAT_BOUNDS,
      L2_BOUNDS,
      R2_BOUNDS,
      MEDICAL_BOUNDS,
      HANGAR_BOUNDS,
      REACTOR_BOUNDS,
      PROPULSION_BOUNDS
    ]) {
      assert.ok(bounds.tx >= 0 && bounds.tx + bounds.columns <= SHIP_COLUMNS);
      assert.ok(bounds.ty >= 0 && bounds.ty + bounds.rows <= SHIP_ROWS);
    }
  });

  test("static hull flood fill reaches 100% of floor tiles across all 13 compartments", () => {
    assert.ok(reached.size > 4500, `only ${reached.size} static floor tiles reached`);

    const compartments = [
      { name: "Fore Sensors (0-300m)", bounds: FORE_BOUNDS },
      { name: "Bridge Hall", bounds: BRIDGE_BOUNDS },
      { name: "Captain Cabin", bounds: CABIN_BOUNDS },
      { name: "Central Transit Hub", bounds: TRANSIT_BOUNDS },
      { name: "L-1 Agri Wing", bounds: L1_BOUNDS },
      { name: "R-1 Rotating Ring Atrium", bounds: R1_BOUNDS },
      { name: "Crew Habitat", bounds: HABITAT_BOUNDS },
      { name: "L-2 Industrial Foundry", bounds: L2_BOUNDS },
      { name: "R-2 Science Lab", bounds: R2_BOUNDS },
      { name: "Medical & Cryo Bay", bounds: MEDICAL_BOUNDS },
      { name: "Shuttle Hangar", bounds: HANGAR_BOUNDS },
      { name: "Reactor Heat-Sink Bay", bounds: REACTOR_BOUNDS },
      { name: "Aft Propulsion & Radiator Gallery", bounds: PROPULSION_BOUNDS }
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

  test("starting security lockdown restricts crewman solely to Crew Habitat + L-2 Industrial Bay", () => {
    const startAccessible = unlockedTiles(world);
    const activePlaces = new Set<string>();
    for (const key of startAccessible) {
      const [tx, ty] = key.split(",").map(Number);
      activePlaces.add(placeAt(tx, ty));
    }

    assert.equal(activePlaces.has("crew_habitat"), true);
    assert.equal(activePlaces.has("industrial_bay"), true);
    for (const sealed of [
      "cabin",
      "bridge",
      "fore_sensors",
      "transit_hub",
      "agri_module",
      "ring_module",
      "science_lab",
      "medical_bay",
      "hangar_bay",
      "reactor_bay",
      "propulsion_aft"
    ]) {
      assert.equal(activePlaces.has(sealed), false, `starting player unexpectedly accessed sealed ${sealed}`);
    }
  });

  test("no walkable tile on the entire 13-compartment ship leaks into bare hull structure", () => {
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

  test("all 16 place labels are defined and correctly mapped", () => {
    assert.equal(PLACE_LABELS.fore_sensors, "远望号 · 舰首探测与消融护盾廊");
    assert.equal(PLACE_LABELS.bridge, "远望号 · 舰桥");
    assert.equal(PLACE_LABELS.passage, "远望号 · 指挥舱通道");
    assert.equal(PLACE_LABELS.cabin, "远望号 · 舰长室");
    assert.equal(PLACE_LABELS.transit_corridor, "远望号 · 主干联络道");
    assert.equal(PLACE_LABELS.transit_hub, "远望号 · 中央交通枢纽");
    assert.equal(PLACE_LABELS.agri_module, "远望号 · L-1 生态农业模块");
    assert.equal(PLACE_LABELS.ring_module, "远望号 · R-1 生活环大厅");
    assert.equal(PLACE_LABELS.crew_habitat, "远望号 · 船员生活区");
    assert.equal(PLACE_LABELS.industrial_bay, "远望号 · L-2 重工业车间");
    assert.equal(PLACE_LABELS.science_lab, "远望号 · R-2 科研实验舱");
    assert.equal(PLACE_LABELS.medical_bay, "远望号 · 医疗与休眠舱");
    assert.equal(PLACE_LABELS.hangar_bay, "远望号 · 穿梭机机库");
    assert.equal(PLACE_LABELS.reactor_bay, "远望号 · 动力排险泵房");
    assert.equal(PLACE_LABELS.propulsion_aft, "远望号 · 舰尾聚变推进与散热翼廊");
    assert.equal(PLACE_LABELS.structure, "远望号 · 结构区");

    assert.equal(placeAt(FORE_BOUNDS.tx + 10, FORE_BOUNDS.ty + 5), "fore_sensors");
    assert.equal(placeAt(BRIDGE_BOUNDS.tx + 10, BRIDGE_BOUNDS.ty + 10), "bridge");
    assert.equal(placeAt(CABIN_BOUNDS.tx + 5, CABIN_BOUNDS.ty + 5), "cabin");
    assert.equal(placeAt(TRANSIT_BOUNDS.tx + 10, TRANSIT_BOUNDS.ty + 5), "transit_hub");
    assert.equal(placeAt(L1_BOUNDS.tx + 8, L1_BOUNDS.ty + 8), "agri_module");
    assert.equal(placeAt(R1_BOUNDS.tx + 8, R1_BOUNDS.ty + 8), "ring_module");
    assert.equal(placeAt(HABITAT_BOUNDS.tx + 10, HABITAT_BOUNDS.ty + 5), "crew_habitat");
    assert.equal(placeAt(L2_BOUNDS.tx + 8, L2_BOUNDS.ty + 8), "industrial_bay");
    assert.equal(placeAt(R2_BOUNDS.tx + 8, R2_BOUNDS.ty + 8), "science_lab");
    assert.equal(placeAt(MEDICAL_BOUNDS.tx + 10, MEDICAL_BOUNDS.ty + 5), "medical_bay");
    assert.equal(placeAt(HANGAR_BOUNDS.tx + 10, HANGAR_BOUNDS.ty + 5), "hangar_bay");
    assert.equal(placeAt(REACTOR_BOUNDS.tx + 10, REACTOR_BOUNDS.ty + 5), "reactor_bay");
    assert.equal(placeAt(PROPULSION_BOUNDS.tx + 20, PROPULSION_BOUNDS.ty + 5), "propulsion_aft");
    assert.equal(placeAt(63, 30), "transit_corridor");
    assert.equal(placeAt(0, 0), "structure");
    assert.equal(placeAt(83, 203), "structure");
  });
});

describe("crew and fixtures across the 13-compartment ship", () => {
  test("all 11 crew members are aboard and standing on walkable floor", () => {
    assert.equal(ALL_SHIP_PEOPLE.length, 11);

    for (const person of ALL_SHIP_PEOPLE) {
      const tx = Math.floor(person.x / TILE);
      const ty = Math.floor((person.y - 8) / TILE);
      assert.ok(isFloor(map.tileAt(tx, ty)), `${person.name} stands on non-floor: ${map.tileAt(tx, ty)}`);
      assert.ok(reached.has(`${tx},${ty}`), `${person.name} stands at unreachable tile ${tx},${ty}`);
      assert.ok(person.lines.length > 0, `${person.name} has no dialogue lines`);
    }
  });

  test("every examinable prop across all 13 compartments can be reached", () => {
    const examinableProps = SHIP_PROPS.filter((p) => p.lines && p.lines.length > 0);
    assert.ok(examinableProps.length >= 60, `expected >= 60 examinable props, got ${examinableProps.length}`);

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
