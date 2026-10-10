import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { TILE_SIZE } from "../src/game/assets/manifest";
import {
  METRES_PER_TILE,
  PERSON_HEIGHT_M,
  PERSON_HEIGHT_PX,
  PIXELS_PER_METRE,
  PLAYER_INTERACT_REACH,
  TILE,
  tilesToMetres
} from "../src/game/config";
import { Player } from "../src/game/entities/Player";
import { BRIDGE_BOUNDS, CABIN_BOUNDS, PASSAGE_BOUNDS } from "../src/game/map/shipMap";
import { CABIN_DOOR } from "../src/game/map/captainRoomMap";
import { BRIDGE_DOOR } from "../src/game/map/bridgeMap";

// The scale contract: the ship is measured in people.
//
// The first version of this map was authored at 40 px per tile while the crew
// sprite stayed 48 px, so a character stood taller than the tile grid and every
// corridor read narrower than it measured. The playtest verdict was
// 「地方有点窄了，尤其是走廊」. So the person is now the unit -- 1.8 m, one tile --
// and the sizes of the spaces are stated in person-heights, which is what these
// tests pin down. A map that drifts back to arbitrary round numbers fails here.

const player = new Player(0, 0);

/** Fractional metres, so float noise does not fail an exact comparison. */
function close(actual: number, expected: number, what: string, tolerance = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${what}: expected about ${expected}, got ${actual}`
  );
}

describe("the ship is measured in people (TASK-S5)", () => {
  test("one tile is one person-height: 1.8 m", () => {
    assert.equal(PERSON_HEIGHT_M, 1.8, "the reference person is 1.8 m");
    close(METRES_PER_TILE, PERSON_HEIGHT_M, "metres per tile");
    close(tilesToMetres(4), 7.2, "four tiles in metres");
  });

  test("the sprite really is that person at that scale", () => {
    // The one number that could silently invalidate everything above: if the art
    // is ever authored at a different tile size, a 48 px crew member stops being
    // 1.8 m tall and every dimension in the game quietly rescales.
    close(PERSON_HEIGHT_M * PIXELS_PER_METRE, PERSON_HEIGHT_PX, "the crew sprite in pixels", 1e-6);
    assert.equal(TILE, TILE_SIZE, "tiles are drawn at the size the art is authored");
  });

  test("a character fits inside one tile", () => {
    assert.ok(player.height <= TILE, `a ${player.height}px character does not fit a ${TILE}px tile`);
    assert.ok(player.width < TILE, `a ${player.width}px wide character does not fit a ${TILE}px tile`);
    close(player.height / PIXELS_PER_METRE, PERSON_HEIGHT_M, "the drawn character's height");
  });
});

describe("the spaces are sized in person-heights (TASK-S5)", () => {
  test("the passage to the bridge is four people wide", () => {
    assert.equal(PASSAGE_BOUNDS.width, 4);
    close(tilesToMetres(PASSAGE_BOUNDS.width), 7.2, "the passage's width");

    // Wider than its doorways, with bulkhead on both sides of each: that is what
    // makes a doorway read as a door instead of the corridor simply stopping.
    const shoulder = (PASSAGE_BOUNDS.width - CABIN_DOOR.w) / 2;
    assert.ok(shoulder >= 1, "the passage is no wider than the doorways it joins");
    assert.equal(PASSAGE_BOUNDS.width, CABIN_DOOR.w + shoulder * 2);
  });

  test("two crew members can pass in the passage without stepping aside", () => {
    const clear = PASSAGE_BOUNDS.width * TILE - player.colliderWidth;

    assert.ok(
      clear >= player.colliderWidth * 4,
      `only ${(clear / PIXELS_PER_METRE).toFixed(1)} m of clearance in a 7.2 m passage`
    );
  });

  test("a doorway is wide enough to walk through without lining up", () => {
    for (const door of [CABIN_DOOR, BRIDGE_DOOR]) {
      const opening = door.w * TILE;
      assert.ok(
        opening >= player.colliderWidth * 3,
        `a ${(opening / PIXELS_PER_METRE).toFixed(1)} m doorway is tight for a ` +
          `${(player.colliderWidth / PIXELS_PER_METRE).toFixed(1)} m wide character`
      );
    }

    assert.equal(CABIN_DOOR.w, BRIDGE_DOOR.w, "the two doorways should match");
  });

  test("the passage is a walk, not a doorway", () => {
    const length = tilesToMetres(PASSAGE_BOUNDS.bottom - PASSAGE_BOUNDS.top + 1);

    assert.ok(length > 10, `the passage is only ${length.toFixed(1)} m end to end`);
    assert.ok(length < 30, `the passage is ${length.toFixed(1)} m end to end, which is a trek`);
  });

  test("both compartments are rooms you cross, not closets", () => {
    const cabin = { w: tilesToMetres(CABIN_BOUNDS.columns), h: tilesToMetres(CABIN_BOUNDS.rows) };
    const bridge = { w: tilesToMetres(BRIDGE_BOUNDS.columns), h: tilesToMetres(BRIDGE_BOUNDS.rows) };

    assert.ok(cabin.w > 30 && cabin.h > 20, `the cabin is ${cabin.w} x ${cabin.h} m`);
    assert.ok(bridge.w > cabin.w, "the bridge should be the wider of the two");
  });

  test("you can reach the thing you are standing in front of", () => {
    // Reach is a shade under a tile, so E acts on the next tile along rather than
    // on something on the far side of the room.
    const reach = PLAYER_INTERACT_REACH / PIXELS_PER_METRE;

    assert.ok(reach > 1 && reach < METRES_PER_TILE, `reach is ${reach.toFixed(2)} m`);
  });
});
