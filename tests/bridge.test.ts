import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BRIDGE_PROPS, CABIN_PROPS, SHIP_PEOPLE, type SceneProp } from "../src/game/scenes/shipProps";
import { BRIDGE_BOUNDS, CABIN_BOUNDS, placeAt } from "../src/game/map/shipMap";
import {
  createBridgeMap,
  BRIDGE_DOOR,
  BRIDGE_COLUMNS,
  BRIDGE_ROWS,
  BRIDGE_SHAPES,
  BRIDGE_HALL
} from "../src/game/map/bridgeMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH, METRES_PER_TILE, TILE } from "../src/game/config";
import { fakeInput, isFloor, ship, standableTiles } from "./shipWorld";

// The bridge: an elliptical command hall, laid out to the setting document's
// demand that it read as 克制、理性、高度专业化 -- physical switches and paper over
// holograms, and a floor you can see the scale of.

const bridgeMap = () => createBridgeMap(TILE);
const bridge = () => ship();

/** The bridge's rectangle on the deck, in world pixels. */
const hall = {
  left: BRIDGE_BOUNDS.tx * TILE,
  top: BRIDGE_BOUNDS.ty * TILE,
  right: (BRIDGE_BOUNDS.tx + BRIDGE_BOUNDS.columns) * TILE,
  bottom: (BRIDGE_BOUNDS.ty + BRIDGE_BOUNDS.rows) * TILE
};

/**
 * Examine something the way a player would: stand in front of it, face it, press E.
 *
 * Fails loudly if the thing could not be reached, so a test that means to look at
 * four props cannot quietly look at three and still pass.
 */
function examineProp(world: ReturnType<typeof ship>, prop: SceneProp): void {
  world.player.x = prop.x - world.player.width / 2;
  world.player.y = prop.y + TILE + 8 - world.player.height;

  for (const facing of ["up", "down", "left", "right"] as const) {
    world.player.animation.face(facing);
    world.update(0.016, fakeInput([], []));
    if (world.interactionLabel === prop.label) break;
  }

  world.update(0.016, fakeInput([], ["KeyE"]));
  assert.equal(world.dialogue.isOpen, true, `${prop.label} could not be examined`);

  while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
}

/** Talk to the captain and return everything he said. */
function talkToCaptain(world: ReturnType<typeof ship>): string[] {
  const captain = SHIP_PEOPLE.find((p) => p.id === "captain")!;
  world.player.x = captain.x - world.player.width / 2;
  world.player.y = captain.y + 48 - world.player.height;
  world.player.animation.face("up");

  world.update(0.016, fakeInput([], ["KeyE"]));

  const said: string[] = [];
  while (world.dialogue.isOpen) {
    said.push(world.dialogue.current!.text);
    world.update(0.016, fakeInput([], ["Space"]));
  }
  return said;
}

describe("the bridge hall (TASK-S2)", () => {
  test("the map is the size bridgeMap declares", () => {
    const map = bridgeMap();

    assert.equal(map.width, BRIDGE_COLUMNS);
    assert.equal(map.height, BRIDGE_ROWS);
    assert.equal(map.pixelWidth, BRIDGE_COLUMNS * TILE);
    assert.equal(map.pixelHeight, BRIDGE_ROWS * TILE);
  });

  test("the command floor is at least the area the setting document promises", () => {
    // The document says about 35 x 25 m, roughly 700 m2. At one tile per person
    // that stated footprint is a 19 x 14 tile room -- smaller than the captain's
    // cabin, and far too small for six stations and a command chair the player
    // can walk between. So the hall is drawn at a walkable scale, the same trade
    // the cabin makes, and this test states both numbers rather than pretending
    // they agree. docs/尺度.md has the full accounting.
    const map = bridgeMap();
    let floor = 0;

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.tileAt(tx, ty) === "deck_dark") floor++;
      }
    }

    const squareMetres = (tiles: number) => tiles * METRES_PER_TILE * METRES_PER_TILE;
    const nominalTiles =
      (BRIDGE_HALL.x1 - BRIDGE_HALL.x0 + 1) * (BRIDGE_HALL.y1 - BRIDGE_HALL.y0 + 1);
    const promisedTiles = 700 / (METRES_PER_TILE * METRES_PER_TILE);

    assert.ok(
      nominalTiles > promisedTiles,
      `the hall's footprint is ${Math.round(squareMetres(nominalTiles))} m2 against the ` +
        `document's 700; drawing it that small would make the bridge a cupboard`
    );
    assert.ok(
      squareMetres(floor) >= 700,
      `the walkable command floor is only ${Math.round(squareMetres(floor))} m2`
    );
    assert.ok(floor < nominalTiles, "the trimmed floor should be smaller than the footprint");
  });

  test("the command floor out-spans the whole cabin, as one open room", () => {
    // The cabin is deliberately drawn at play scale and is therefore large for a
    // captain's quarters; the bridge is not "more tiles" so much as one unbroken
    // span, which is what makes the scale difference legible when you walk in.
    const map = bridgeMap();
    let longest = 0;

    for (let ty = 0; ty < map.height; ty++) {
      let run = 0;
      for (let tx = 0; tx < map.width; tx++) {
        run = map.tileAt(tx, ty) === "deck_dark" ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
    }

    assert.ok(longest >= 26, `the longest clear run across the hall is ${longest} tiles`);
    assert.ok(longest > CABIN_BOUNDS.columns, "the command floor should out-span the cabin");
  });

  test("every declared shape fits inside the hall", () => {
    for (const shape of BRIDGE_SHAPES) {
      assert.ok(shape.x >= 0 && shape.y >= 0, `shape starts outside: ${shape.note}`);
      assert.ok(shape.x + shape.w <= BRIDGE_COLUMNS, `shape too wide: ${shape.note}`);
      assert.ok(shape.y + shape.h <= BRIDGE_ROWS, `shape too tall: ${shape.note}`);
    }
  });

  test("the player cannot walk from the hall to the hull", () => {
    // Checked against the real collision and the real route rather than tile by
    // tile: flood-fill from where the player arrives.
    const world = bridge();
    const map = world.tileMap;
    const reached = standableTiles(world);

    assert.ok(reached.size > 200, `only ${reached.size} tiles reachable`);

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
          `the player can stand at ${tx},${ty}, which touches hull`
        );
      }
    }
  });

  test("the hall is the size the prop layout assumes", () => {
    // Props are hand-placed inside rows 5..15, columns 5..34. If the hall is ever
    // retuned, this fails before the props silently end up in a bulkhead.
    const map = bridgeMap();
    let minTx = Infinity;
    let maxTx = -Infinity;
    let minTy = Infinity;
    let maxTy = -Infinity;

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const type = map.tileAt(tx, ty);
        if (type !== "deck_dark" && type !== "screen") continue;
        minTx = Math.min(minTx, tx);
        maxTx = Math.max(maxTx, tx);
        minTy = Math.min(minTy, ty);
        maxTy = Math.max(maxTy, ty);
      }
    }

    assert.equal(minTx, BRIDGE_HALL.x0, "the port edge of the hall moved");
    assert.equal(maxTx, BRIDGE_HALL.x1, "the starboard edge of the hall moved");
    assert.equal(minTy, BRIDGE_HALL.y0, "the forward edge of the hall moved");
    assert.equal(maxTy, BRIDGE_HALL.y1, "the aft edge of the hall moved");
  });

  test("the hall is ringed by bulkheads and the outside is solid", () => {
    const map = bridgeMap();

    // Corners of the grid are outside the ellipse, so they must be solid.
    for (const [tx, ty] of [
      [0, 0],
      [BRIDGE_COLUMNS - 1, 0],
      [0, BRIDGE_ROWS - 1],
      [BRIDGE_COLUMNS - 1, BRIDGE_ROWS - 1]
    ]) {
      assert.equal(map.tileAt(tx, ty), "hull", `corner ${tx},${ty} is not solid hull`);
    }

    // And the centre is deck you can walk on.
    const cx = Math.floor(BRIDGE_COLUMNS / 2);
    const cy = Math.floor(BRIDGE_ROWS / 2);
    assert.notEqual(map.tileAt(cx, cy), "hull");
  });

  test("the wrap-around display runs continuously across the front", () => {
    // Not an exact tile count: the display follows the forward bulkhead, so its
    // width is whatever the hull's curve allows at that row. What matters is that
    // it is one unbroken run, and that it is wide.
    const map = bridgeMap();
    const runs: number[] = [];

    for (let ty = 0; ty < map.height; ty++) {
      let run = 0;
      for (let tx = 0; tx < map.width; tx++) {
        if (map.tileAt(tx, ty) === "screen") {
          run++;
        } else if (run > 0) {
          runs.push(run);
          run = 0;
        }
      }
      if (run > 0) runs.push(run);
    }

    assert.equal(runs.length, 1, `the display is broken into ${runs.length} pieces`);
    assert.ok(runs[0] >= 12, `the display is only ${runs[0]} tiles wide`);
  });

  test("the display is forward of the captain's chair", () => {
    // Forward is north, matching how the player reads the screen.
    const map = bridgeMap();
    let screenY = -1;
    for (let ty = 0; ty < map.height && screenY < 0; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.tileAt(tx, ty) === "screen") {
          screenY = ty;
          break;
        }
      }
    }

    const chair = BRIDGE_PROPS.find((p) => p.assetId === "fx_command_chair")!;
    assert.ok(screenY >= 0, "no display found");
    assert.ok(chair.y / TILE - BRIDGE_BOUNDS.ty > screenY, "the chair is not aft of the display");
  });

  test("the doorway is in the aft bulkhead, where the ship comes in", () => {
    const map = bridgeMap();

    assert.ok(BRIDGE_DOOR.y > BRIDGE_HALL.y1, "the entrance is not aft of the command floor");
    for (let x = BRIDGE_DOOR.x; x < BRIDGE_DOOR.x + BRIDGE_DOOR.w; x++) {
      assert.equal(map.tileAt(x, BRIDGE_DOOR.y), "floor_light", `the doorway is shut at ${x}`);
    }
  });
});

describe("the bridge is furnished to the setting document (TASK-S2)", () => {
  test("every prop sits inside the bridge", () => {
    for (const prop of BRIDGE_PROPS) {
      const halfW = (prop.w * TILE) / 2;
      const halfH = (prop.h * TILE) / 2;
      assert.ok(prop.x - halfW >= hall.left, `${prop.label} hangs off the west side`);
      assert.ok(prop.x + halfW <= hall.right, `${prop.label} hangs off the east side`);
      assert.ok(prop.y - halfH >= hall.top, `${prop.label} hangs off the forward side`);
      assert.ok(prop.y + halfH <= hall.bottom, `${prop.label} hangs off the aft`);
    }
  });

  test("the six departments the document lists all have a station", () => {
    const labels = BRIDGE_PROPS.map((p) => p.label);
    for (const station of ["导航席", "通信席", "动力席", "防务席", "科学席", "人员席"]) {
      assert.ok(labels.includes(station), `the bridge has no ${station}`);
    }
  });

  test("the hardware is physical, as the document insists", () => {
    // "远望号追求先进，但不完全依赖华丽的交互界面" -- so the bridge must actually
    // have switches and paper on it, not only screens.
    const ids = BRIDGE_PROPS.map((p) => p.assetId);
    assert.ok(ids.filter((id) => id === "fx_switch_panel").length >= 2, "not enough real switches");
    assert.ok(ids.includes("fx_paper_log"), "no paper on a bridge that runs on paper");
  });

  test("everyone standing on the bridge is on walkable deck and clear of furniture", () => {
    const map = ship().tileMap;

    for (const person of SHIP_PEOPLE) {
      const collider = { x: person.x - 11, y: person.y - 16, width: 22, height: 16 };
      assert.equal(isBoxBlocked(map, collider), false, `${person.name} stands in a bulkhead`);

      for (const prop of BRIDGE_PROPS) {
        const halfW = (prop.w * TILE) / 2;
        const halfH = (prop.h * TILE) / 2;
        const inside =
          person.x > prop.x - halfW &&
          person.x < prop.x + halfW &&
          person.y > prop.y - halfH &&
          person.y < prop.y + halfH;
        assert.equal(inside, false, `${person.name} is standing inside the ${prop.label}`);
      }
    }
  });

  test("the crew are on the bridge, and nobody is in two places at once", () => {
    const ids = SHIP_PEOPLE.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, "somebody is in two places at once");

    for (const person of SHIP_PEOPLE) {
      const tx = Math.floor(person.x / TILE);
      const ty = Math.floor((person.y - 8) / TILE);

      assert.equal(placeAt(tx, ty), "bridge", `${person.name} is not standing on the bridge`);
      assert.ok(person.lines.length > 0, `${person.name} says nothing`);
      assert.ok(person.promptLabel.includes(person.name), `${person.id} has an odd prompt`);
    }
  });

  test("every prop and person on the bridge can be reached by walking", () => {
    const world = bridge();
    const tiles = standableTiles(world);

    const wanted = [
      ...BRIDGE_PROPS.filter((p) => p.lines && p.lines.length > 0).map((p) => p.label),
      ...SHIP_PEOPLE.map((p) => p.promptLabel)
    ];

    for (const label of wanted) {
      let found = false;

      for (const key of tiles) {
        const [tx, ty] = key.split(",").map(Number);
        const centerX = tx * TILE + TILE / 2;
        const feetY = ty * TILE + TILE / 2;

        for (const facing of ["up", "down", "left", "right"] as const) {
          const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
          if (findInteractable(world.examinable, reach)?.label === label) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      assert.ok(found, `nothing reachable prompts for ${label}`);
    }
  });

  test("every prompt on the bridge names something that has something to say", () => {
    // Swept over every tile the player can stand on and all four facings, rather
    // than by wandering: a random walk over a hall this size misses most of it.
    const world = bridge();
    const speakable = new Set([
      ...BRIDGE_PROPS.filter((p) => p.lines && p.lines.length > 0).map((p) => p.label),
      ...SHIP_PEOPLE.map((p) => p.promptLabel)
    ]);

    const prompted = new Set<string>();
    for (const key of standableTiles(world)) {
      const [tx, ty] = key.split(",").map(Number);
      if (placeAt(tx, ty) !== "bridge") continue;

      for (const facing of ["up", "down", "left", "right"] as const) {
        const reach = reachPoint(tx * TILE + TILE / 2, ty * TILE + TILE / 2, facing, PLAYER_INTERACT_REACH);
        const found = findInteractable(world.examinable, reach);
        if (found) prompted.add(found.label);
      }
    }

    assert.ok(prompted.size >= 12, `only ${prompted.size} things on the bridge can be prompted`);

    for (const label of prompted) {
      assert.ok(speakable.has(label), `${label} prompts but has nothing to say`);
    }
  });
});

describe("the captain (TASK-S1b, TASK-S2)", () => {
  const captain = SHIP_PEOPLE.find((p) => p.id === "captain")!;

  test("he is aboard, with a name, a sprite and something to say", () => {
    assert.ok(captain.name.length > 0);
    assert.ok(captain.assetId.length > 0);
    assert.ok(captain.lines.length > 0, "the captain has nothing to say");
  });

  test("every line is spoken under his own name and is not blank", () => {
    for (const line of captain.lines) {
      assert.equal(line.speaker, captain.name, "the captain should speak under his own name");
      assert.ok(line.text.trim().length > 0, "a line is blank");
    }
  });

  test("he stands on the bridge, clear of the furniture", () => {
    const map = ship().tileMap;
    const collider = { x: captain.x - 11, y: captain.y - 16, width: 22, height: 16 };
    assert.equal(isBoxBlocked(map, collider), false, "the captain is standing inside a wall");

    for (const prop of BRIDGE_PROPS) {
      const halfW = (prop.w * TILE) / 2;
      const halfH = (prop.h * TILE) / 2;
      const inside =
        captain.x > prop.x - halfW &&
        captain.x < prop.x + halfW &&
        captain.y > prop.y - halfH &&
        captain.y < prop.y + halfH;
      assert.equal(inside, false, `the captain is standing inside the ${prop.label}`);
    }
  });

  test("his conversation points at the cabin he keeps, which is now walkable", () => {
    // The line is the reason walking there means something: he says where he
    // sleeps, and the room is two compartments away rather than a scene change.
    assert.ok(
      captain.lines.some((line) => line.text.includes("舱室")),
      "the captain no longer mentions his quarters"
    );
  });

  test("he can be walked up to and spoken to", () => {
    const world = bridge();
    let found = false;

    for (const key of standableTiles(world)) {
      const [tx, ty] = key.split(",").map(Number);
      const centerX = tx * TILE + TILE / 2;
      const feetY = ty * TILE + TILE / 2;

      for (const facing of ["up", "down", "left", "right"] as const) {
        const reach = reachPoint(centerX, feetY, facing, PLAYER_INTERACT_REACH);
        if (findInteractable(world.examinable, reach)?.label === captain.promptLabel) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    assert.ok(found, "the captain cannot be reached from anywhere the player can stand");
  });

  test("talking to him plays his whole part, in order", () => {
    const said = talkToCaptain(bridge());

    assert.ok(said.length > 0, "the captain should have said something");
    assert.deepEqual(said, captain.lines.map((line) => line.text));
  });

  test("the player is frozen while he speaks, and free again afterwards", () => {
    const world = bridge();
    world.player.x = captain.x - world.player.width / 2;
    world.player.y = captain.y + 48 - world.player.height;
    world.player.animation.face("up");
    world.update(0.016, fakeInput([], ["KeyE"]));
    assert.equal(world.dialogue.isOpen, true, "the captain should have started talking");

    const before = { x: world.player.x, y: world.player.y };
    for (let i = 0; i < 30; i++) world.update(0.016, fakeInput(["KeyD"]));
    assert.deepEqual({ x: world.player.x, y: world.player.y }, before, "the player walked off mid-sentence");

    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    for (let i = 0; i < 30; i++) world.update(0.016, fakeInput(["KeyD"]));
    assert.ok(world.player.x > before.x, "the player cannot walk away afterwards");
  });

  test("he notices whether the player looked around first, but only says so once", () => {
    // Nothing examined: no remark.
    const brief = talkToCaptain(bridge());
    assert.ok(
      !brief.some((text) => text.includes("转了一圈")),
      "he should not comment when the player has looked at nothing"
    );

    // Four things examined in his own quarters, then the walk to the bridge.
    const world = bridge();
    for (const assetId of ["fx_desk", "fx_starchart", "fx_photo", "fx_screen_lit"]) {
      const prop = CABIN_PROPS.find((p) => p.assetId === assetId);
      assert.ok(prop, `the cabin has no ${assetId}`);
      examineProp(world, prop);
    }

    const first = talkToCaptain(world);
    assert.ok(
      first.some((text) => text.includes("转了一圈")),
      "he should notice that the player has been through the ship"
    );

    const second = talkToCaptain(world);
    assert.ok(
      !second.some((text) => text.includes("转了一圈")),
      "the remark should not repeat every time you speak to him"
    );
  });
});
