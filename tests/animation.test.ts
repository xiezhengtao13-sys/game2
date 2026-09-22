import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Animation } from "../src/game/entities/Animation";
import { facingFor, Player, readDirection } from "../src/game/entities/Player";
import { TileMap } from "../src/game/map/TileMap";
import {
  assertAnimationAssetsExist,
  frameFor,
  playerAnimationAssetIds,
  resolveFacing,
  WALK_FRAME_SECONDS
} from "../src/game/assets/animationSpec";
import { ALL_ASSETS, getAssetSpec } from "../src/game/assets/manifest";
import type { Input } from "../src/engine/input/Input";

// TASK-106: the player is a sprite with a four-direction walk cycle, and the
// animation data comes from the manifest rather than being hard-coded.

function fakeInput(codes: string[]): Input {
  return { isDown: (code: string) => codes.includes(code) } as unknown as Input;
}

function openMap() {
  return new TileMap(new Array(40 * 40).fill("grass"), 40, 40, 48);
}

describe("facing selection (TASK-106)", () => {
  test("maps a movement direction to a facing", () => {
    assert.equal(facingFor(0, 1), "down");
    assert.equal(facingFor(0, -1), "up");
    assert.equal(facingFor(1, 0), "right");
    assert.equal(facingFor(-1, 0), "left");
  });

  test("vertical wins a diagonal, so facing does not flicker", () => {
    // Without a fixed priority a diagonal walk could alternate between a front
    // and a side view as the player drifts.
    for (const [dx, dy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1]
    ]) {
      assert.equal(facingFor(dx, dy), dy > 0 ? "down" : "up");
    }
  });

  test("standing still reports a facing rather than nothing", () => {
    assert.equal(facingFor(0, 0), "down");
  });
});

describe("Animation walk cycle (TASK-106)", () => {
  test("is idle before anything happens", () => {
    assert.equal(new Animation().pose, "idle");
  });

  test("returns to idle when movement stops", () => {
    const animation = new Animation();

    animation.update(0.05, true);
    assert.notEqual(animation.pose, "idle");

    animation.update(0.016, false);
    assert.equal(animation.pose, "idle");
  });

  test("alternates between the two walk frames", () => {
    const animation = new Animation();
    const seen = new Set<string>();

    // Sample across a couple of full cycles.
    for (let i = 0; i < 40; i++) {
      animation.update(WALK_FRAME_SECONDS / 2, true);
      seen.add(animation.pose);
    }

    assert.deepEqual([...seen].sort(), ["walkA", "walkB"]);
  });

  test("advancing by exactly one frame duration flips the frame", () => {
    const animation = new Animation();

    // Elapsed 0 is step 0, so the first full frame lands on step 1.
    animation.update(WALK_FRAME_SECONDS, true);
    assert.equal(animation.pose, "walkB");

    animation.update(WALK_FRAME_SECONDS, true);
    assert.equal(animation.pose, "walkA");

    animation.update(WALK_FRAME_SECONDS, true);
    assert.equal(animation.pose, "walkB");
  });

  test("stopping resets the cycle so the next walk starts on the same foot", () => {
    const a = new Animation();
    a.update(WALK_FRAME_SECONDS * 2, true); // lands back on walkA
    a.update(0.016, false);
    a.update(WALK_FRAME_SECONDS, true);

    // Deterministic restart: same first frame every time movement begins.
    assert.equal(a.pose, "walkB");
  });

  test("facing is remembered while idle", () => {
    const animation = new Animation();

    animation.face("up");
    animation.update(0.016, false);

    assert.equal(animation.facing, "up");
    assert.equal(animation.frame.assetId, "player_up_idle");
  });
});

describe("animation art wiring (TASK-106)", () => {
  test("every frame the animation asks for exists in the manifest", () => {
    assert.doesNotThrow(() => assertAnimationAssetsExist());
  });

  test("left-facing frames are served by mirroring the right-facing art", () => {
    const left = resolveFacing("left");
    assert.equal(left.source, "right");
    assert.equal(left.flipX, true);

    // The other three directions use their own art unmirrored.
    for (const facing of ["up", "down", "right"] as const) {
      const resolved = resolveFacing(facing);
      assert.equal(resolved.source, facing);
      assert.equal(resolved.flipX, false);
    }
  });

  test("frameFor reports the mirror flag the renderer needs", () => {
    assert.deepEqual(frameFor("left", "walkA"), { assetId: "player_right_walkA", flipX: true });
    assert.deepEqual(frameFor("down", "idle"), { assetId: "player_down_idle", flipX: false });
  });

  test("four facings are playable from three sets of art", () => {
    // frameFor canonicalises: a left-facing request resolves to the
    // right-facing asset id plus flipX, so only three sets of art are ever
    // named -- 3 directions x 3 poses = 9 distinct ids for 12 playable frames.
    const ids = playerAnimationAssetIds();

    assert.equal(ids.length, 12, "4 facings x 3 poses are playable");
    assert.equal(new Set(ids).size, 9, "left reuses the right-facing art");
    assert.ok(
      !ids.some((id) => id.startsWith("player_left_")),
      "left ids should be canonicalised away"
    );
  });

  test("all player frames declare the same size and anchor", () => {
    // Mismatched sizes would make the character jitter between frames.
    const frames = ALL_ASSETS.filter((a) => a.id.startsWith("player_"));
    assert.ok(frames.length >= 12, `expected at least 12 player frames, got ${frames.length}`);

    const [first] = frames;
    for (const frame of frames) {
      assert.equal(frame.size.w, first.size.w, `${frame.id} width differs`);
      assert.equal(frame.size.h, first.size.h, `${frame.id} height differs`);
      assert.equal(frame.anchor, first.anchor, `${frame.id} anchor differs`);
    }
  });

  test("the player size in code matches the size declared in the manifest", () => {
    // Otherwise the renderer would scale art that was authored for another size.
    const spec = getAssetSpec("player_down_idle");
    const player = new Player(0, 0);

    assert.equal(player.width, spec.size.w);
    assert.equal(player.height, spec.size.h);
  });
});

describe("Player facing through input (TASK-106)", () => {
  test("facing follows the keys held", () => {
    const cases: Array<[string[], string]> = [
      [["KeyW"], "up"],
      [["KeyS"], "down"],
      [["KeyA"], "left"],
      [["KeyD"], "right"]
    ];

    for (const [keys, expected] of cases) {
      const player = new Player(500, 500);
      player.update(0.016, fakeInput(keys), openMap());
      assert.equal(player.facing, expected, `holding ${keys} should face ${expected}`);
    }
  });

  test("starts facing the camera", () => {
    assert.equal(new Player(0, 0).facing, "down");
  });

  test("keeps facing the last direction when keys are released", () => {
    const player = new Player(500, 500);
    const map = openMap();

    player.update(0.016, fakeInput(["KeyA"]), map);
    assert.equal(player.facing, "left");

    player.update(0.016, fakeInput([]), map);
    assert.equal(player.facing, "left", "should not snap back to a default facing");
  });

  test("walking into a wall keeps the walk animation running", () => {
    // Pushing against an obstacle should animate on the spot rather than freeze,
    // which is the usual convention and also tells the player they are blocked.
    const wallMap = new TileMap(
      ["wall", "grass", "grass", "grass"],
      2,
      2,
      48
    );
    const player = new Player(60, 60);

    // Face and push left into the wall column.
    for (let i = 0; i < 30; i++) player.update(0.016, fakeInput(["KeyA"]), wallMap);

    assert.equal(player.facing, "left");
    assert.notEqual(player.animation.pose, "idle");
    // And it really did not move into the wall.
    assert.ok(player.colliderAt().x >= 48 - 1e-6, `ended at ${player.colliderAt().x}`);
  });

  test("readDirection is unchanged by the animation work", () => {
    const { dx, dy } = readDirection(fakeInput(["KeyD"]));
    assert.equal(dx, 1);
    assert.equal(dy, 0);
  });
});
