import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HABITAT_BOUNDS,
  L2_BOUNDS,
  R2_BOUNDS,
  BRIDGE_BOUNDS,
  CABIN_BOUNDS,
  placeAt
} from "../src/game/map/shipMap";
import { findSmartPath, findBestInteractStandPoint } from "../src/game/map/pathfinding";
import { TILE, PLAYER_INTERACT_REACH } from "../src/game/config";
import { HABITAT_PROPS, INDUSTRIAL_PROPS } from "../src/game/scenes/shipProps";
import { ship, fakeInput, feetTile } from "./shipWorld";

describe("Intelligent A* Pathfinding & Multi-Segment Navigation", () => {
  test("navigates around corners and bulkheads from Crew Habitat cleanly into L-2 Industrial Bay", () => {
    const world = ship();
    // Target is inside L-2 Industrial Workshop near the Hydraulic Assembly Bench
    const bench = INDUSTRIAL_PROPS.find((p) => p.label === "机械臂液压装配台")!;
    const result = world.walkToWorldPoint(bench.x, bench.y + TILE * 1.4);

    assert.equal(result.partialBlocked, false, "open lower corridor to L-2 should not be security blocked");
    assert.ok(result.waypoints.length >= 2, `expected multi-segment A* path around corners, got ${result.waypoints.length}`);

    // Simulate frame ticks following the A* waypoints from Dorm A1 out into L-2
    for (let i = 0; i < 720 && world.player.waypoints.length > 0; i++) {
      world.update(1 / 60, fakeInput([]));
    }

    assert.equal(world.player.waypoints.length, 0, "player finished walking the multi-segment path");
    const arrivedTile = feetTile(world.tileMap, world.player.x, world.player.y);
    assert.equal(placeAt(arrivedTile.tx, arrivedTile.ty), "industrial_bay", "arrived cleanly inside L-2 Workshop");
  });

  test("snaps clicks on solid walls or furniture desks to the nearest standable floor tile", () => {
    const world = ship();
    // Click directly inside the north wall of Crew Habitat (non-walkable hull/wall tile near east bunk)
    const wallTileX = HABITAT_BOUNDS.tx + 24;
    const wallTileY = HABITAT_BOUNDS.ty; // row 0 of habitat = solid wall
    const res = findSmartPath(
      world.tileMap,
      { x: world.player.centerX, y: world.player.y + world.player.height - 8 },
      { x: wallTileX * TILE + TILE / 2, y: wallTileY * TILE + TILE / 2 },
      { extraBlocked: (tx, ty) => world.security.isTileBlocked(tx, ty) }
    );

    assert.equal(res.snapped, true, "wall click snapped cleanly to nearest walkable tile");
    assert.ok(res.waypoints.length >= 1, "produced valid path to snapped tile");
  });

  test("findBestInteractStandPoint routes player right up to far interactables within reach", () => {
    const world = ship();
    const waterValve = HABITAT_PROPS.find((p) => p.label === "水循环监测阀台")!;
    const res = findBestInteractStandPoint(
      world.tileMap,
      { x: world.player.centerX, y: world.player.y + world.player.height - 8 },
      { x: waterValve.x, y: waterValve.y },
      32,
      PLAYER_INTERACT_REACH,
      { extraBlocked: (tx, ty) => world.security.isTileBlocked(tx, ty) }
    );

    assert.equal(res.partialBlocked, false);
    assert.ok(res.waypoints.length >= 1, "found valid standing point near valve terminal");
    const dest = res.waypoints[res.waypoints.length - 1];
    const dist = Math.hypot(dest.x - waterValve.x, dest.y - waterValve.y);
    assert.ok(dist <= TILE * 2.1, `standing point is ${dist.toFixed(0)}px from target, outside reach`);
  });

  test("manual WASD key press immediately cancels multi-segment A* waypoints", () => {
    const world = ship();
    const targetX = (L2_BOUNDS.tx + 12) * TILE;
    const targetY = (L2_BOUNDS.ty + 11) * TILE;
    world.walkToWorldPoint(targetX, targetY);
    assert.ok(world.player.waypoints.length > 0, "multi-segment path queued");

    world.update(1 / 60, fakeInput(["KeyD"]));
    assert.equal(world.player.waypoints.length, 0, "WASD immediately cleared mouse waypoints");
    assert.equal(world.player.moveTarget, null);
  });
});

describe("Physical Bulkhead Security & Progressive Narrative Access Control", () => {
  test("clicking beyond a locked security bulkhead performs partial pathing up to the gate and triggers denial feedback", () => {
    const world = ship();
    // Click into Central Transit Hub (north of locked gate_midship at row 91)
    const hubCenterX = (HABITAT_BOUNDS.tx + 15) * TILE;
    const hubCenterY = (HABITAT_BOUNDS.ty - 6) * TILE;
    const result = world.walkToWorldPoint(hubCenterX, hubCenterY);

    assert.equal(result.partialBlocked, true, "path beyond midship bulkhead should be flagged partialBlocked");
    assert.ok(result.blockedByGateTile, "identifies exact blocking bulkhead gate tile");
    assert.equal(result.blockedByGateTile?.ty, 91);

    // Walk until arriving in front of the locked bulkhead
    for (let i = 0; i < 400 && !world.dialogue.isOpen; i++) {
      world.update(1 / 60, fakeInput([]));
    }

    assert.equal(world.dialogue.isOpen, true, "reaching locked bulkhead automatically shows security clearance denial");
    assert.match(world.dialogue.current?.text ?? "", /门禁权限拒绝|中层通行条/);
  });

  test("enforces all 4 clearance tiers strictly in order, locking Captain's Cabin until Chapter 2 return", () => {
    const world = ship();

    // Tier 0 (Start): only Crew Habitat & L-2 Workshop open; R-2 Science, Transit, Hangar, Bridge, Cabin all locked
    assert.equal(world.security.canAccessPlace("crew_habitat"), true);
    assert.equal(world.security.canAccessPlace("industrial_bay"), true);
    assert.equal(world.security.canAccessPlace("science_lab"), false);
    assert.equal(world.security.canAccessPlace("transit_hub"), false);
    assert.equal(world.security.canAccessPlace("hangar_bay"), false);
    assert.equal(world.security.canAccessPlace("bridge"), false);
    assert.equal(world.security.canAccessPlace("cabin"), false);

    // Pathing into R-2 fails while midship_pass is missing
    const r2Center = { x: (R2_BOUNDS.tx + 10) * TILE, y: (R2_BOUNDS.ty + 11) * TILE };
    const r2Blocked = world.walkToWorldPoint(r2Center.x, r2Center.y);
    assert.equal(r2Blocked.partialBlocked, true);
    assert.equal(r2Blocked.blockedByGateTile?.tx, 57);

    // Tier 1 (Midship Pass): opens Transit, L-1, R-1, R-2, Medical — Bridge/Cabin/Hangar still closed!
    world.security.grant("midship_pass");
    const r2Open = world.walkToWorldPoint(r2Center.x, r2Center.y);
    assert.equal(r2Open.partialBlocked, false, "granting midship_pass opens R-2 route");
    assert.equal(world.security.canAccessPlace("transit_hub"), true);
    assert.equal(world.security.canAccessPlace("agri_module"), true);
    assert.equal(world.security.canAccessPlace("ring_module"), true);
    assert.equal(world.security.canAccessPlace("medical_bay"), true);
    assert.equal(world.security.canAccessPlace("hangar_bay"), false);
    assert.equal(world.security.canAccessPlace("bridge"), false);
    assert.equal(world.security.canAccessPlace("cabin"), false);

    // Tier 2 (Crisis Override): opens Hangar, Reactor, Aft Propulsion — Bridge & Cabin stay locked!
    world.security.grant("crisis_override");
    assert.equal(world.security.canAccessPlace("hangar_bay"), true);
    assert.equal(world.security.canAccessPlace("reactor_bay"), true);
    assert.equal(world.security.canAccessPlace("propulsion_aft"), true);
    assert.equal(world.security.canAccessPlace("bridge"), false);
    assert.equal(world.security.canAccessPlace("cabin"), false);

    // Tier 3 (Bridge Pass): opens Bridge & Fore Sensors, STILL leaves Captain's Cabin sealed!
    world.security.grant("bridge_pass");
    assert.equal(world.security.canAccessPlace("bridge"), true);
    assert.equal(world.security.canAccessPlace("fore_sensors"), true);
    assert.equal(world.security.canAccessPlace("cabin"), false, "Bridge commendation does NOT unlock Captain's private quarters");

    // Verify player standing on Bridge still gets blocked by gate_cabin at row 43
    world.player.x = (BRIDGE_BOUNDS.tx + 20) * TILE;
    world.player.y = (BRIDGE_BOUNDS.ty + 14) * TILE;
    const tryCabin = world.walkToWorldPoint((CABIN_BOUNDS.tx + 12) * TILE, (CABIN_BOUNDS.ty + 6) * TILE);
    assert.equal(tryCabin.partialBlocked, true);
    assert.equal(tryCabin.blockedByGateTile?.ty, 43);

    // Tier 4 (Captain Bio Auth): final endgame unlock
    world.security.grant("captain_auth");
    assert.equal(world.security.canAccessPlace("cabin"), true);
    const enterCabin = world.walkToWorldPoint((CABIN_BOUNDS.tx + 12) * TILE, (CABIN_BOUNDS.ty + 6) * TILE);
    assert.equal(enterCabin.partialBlocked, false);
    assert.ok(enterCabin.waypoints.length >= 1);
  });
});
