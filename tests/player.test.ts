import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Player, readDirection } from "../src/game/entities/Player";
import { PLAYER_SPEED } from "../src/game/config";
import type { Input } from "../src/engine/input/Input";

// Movement tests carried over from TASK-002. The bounds clamp that used to live
// in DemoWorld is gone -- TASK-105 replaces it with real tile collision -- but
// the diagonal-normalization behaviour must survive, because "diagonal movement
// is not faster than straight movement" is a standing requirement.

/** A stand-in Input that reports a fixed set of held keys. */
function fakeInput(codes: string[]): Input {
  return { isDown: (code: string) => codes.includes(code) } as unknown as Input;
}

const DT = 0.016;

/** Fresh player plus its start position. */
function freshPlayer() {
  const player = new Player(500, 500);
  return { player, start: { x: player.x, y: player.y } };
}

function measure(keys: string[]) {
  const { player, start } = freshPlayer();
  player.update(DT, fakeInput(keys));
  const vx = player.x - start.x;
  const vy = player.y - start.y;
  return { vx, vy, distance: Math.hypot(vx, vy), speed: Math.hypot(vx, vy) / DT };
}

describe("Player direction (TASK-104)", () => {
  test("no keys held produces no movement and no NaN", () => {
    const { player, start } = freshPlayer();

    player.update(DT, fakeInput([]));

    assert.equal(player.x, start.x);
    assert.equal(player.y, start.y);
    assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
  });

  test("readDirection returns a unit vector", () => {
    for (const keys of [["KeyD"], ["KeyW"], ["KeyW", "KeyD"], ["KeyA", "KeyS"]]) {
      const { dx, dy } = readDirection(fakeInput(keys));
      assert.ok(Math.abs(Math.hypot(dx, dy) - 1) < 1e-12, `not unit for ${keys}`);
    }
  });

  test("readDirection returns zero for opposing keys", () => {
    const { dx, dy } = readDirection(fakeInput(["KeyA", "KeyD"]));
    assert.equal(dx, 0);
    assert.equal(dy, 0);
  });
});

describe("Player movement speed (TASK-104)", () => {
  test("measures a non-zero displacement (guards against vacuous assertions)", () => {
    assert.ok(measure(["KeyD"]).distance > 1, "straight displacement was ~0");
    assert.ok(measure(["KeyD", "KeyS"]).distance > 1, "diagonal displacement was ~0");
  });

  test("moves at the configured speed in a straight line", () => {
    assert.ok(Math.abs(measure(["KeyD"]).speed - PLAYER_SPEED) < 1e-9);
  });

  test("does not move faster diagonally than straight", () => {
    const straight = measure(["KeyD"]).speed;
    const diagonal = measure(["KeyD", "KeyS"]).speed;

    assert.ok(
      Math.abs(diagonal - straight) < 1e-9,
      `straight=${straight} diagonal=${diagonal}`
    );
  });

  for (const [name, keys] of [
    ["up-right", ["KeyW", "KeyD"]],
    ["up-left", ["KeyW", "KeyA"]],
    ["down-left", ["KeyS", "KeyA"]]
  ] as const) {
    test(`moves at a consistent 45 degrees toward ${name}`, () => {
      const straight = measure(["KeyD"]).speed;
      const { speed, vx, vy } = measure([...keys]);

      assert.ok(Math.abs(speed - straight) < 1e-9, `speed ${speed} != ${straight}`);
      assert.ok(Math.abs(Math.abs(vx) - Math.abs(vy)) < 1e-9, `not 45 degrees: ${vx}, ${vy}`);
    });
  }

  test("cancels out when opposing keys are held together", () => {
    const { player, start } = freshPlayer();

    player.update(DT, fakeInput(["KeyA", "KeyD"]));

    assert.equal(player.x, start.x);
    assert.equal(player.y, start.y);
  });
});

describe("Player geometry (TASK-104)", () => {
  test("center is the middle of the sprite", () => {
    const player = new Player(100, 200);

    assert.equal(player.centerX, 100 + player.width / 2);
    assert.equal(player.centerY, 200 + player.height / 2);
  });
});
