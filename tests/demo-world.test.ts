import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DemoWorld } from "../src/game/DemoWorld";
import type { Input } from "../src/engine/input/Input";
import type { Renderer } from "../src/engine/graphics/Renderer";

// TASK-002 acceptance tests: the player must not leave the 1280x720 play area,
// and diagonal movement must not be faster than straight movement.
//
// The player's position is observed through the PUBLIC render() API rather than
// a test-only accessor, so production code stays free of test hooks.

interface Pos {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A stand-in Input that reports a fixed set of held keys. */
function fakeInput(codes: string[]): Input {
  return { isDown: (code: string) => codes.includes(code) } as unknown as Input;
}

/** A Renderer that records the last rect drawn and ignores everything else. */
function spyRenderer(onRect: (x: number, y: number, w: number, h: number) => void) {
  const camera = { worldX: 0, worldY: 0, viewportWidth: 1280, viewportHeight: 720, centerOn() {}, clampTo() {} };
  return {
    width: 1280,
    height: 720,
    camera,
    clear() {},
    drawRect: onRect,
    drawSprite() {},
    drawText() {},
    drawWorldText() {}
  } as unknown as Renderer;
}

/** Render the world through a spy and return the rect it drew. */
function observe(world: DemoWorld): Pos {
  const pos: Pos = { x: NaN, y: NaN, width: NaN, height: NaN };
  let calls = 0;
  const spy = spyRenderer((x, y, width, height) => {
    calls++;
    pos.x = x;
    pos.y = y;
    pos.width = width;
    pos.height = height;
  });
  world.render(spy);
  // Guard against a silent no-draw masking a broken assertion.
  assert.equal(calls, 1, "expected exactly one drawRect call");
  return pos;
}

/** Approximate equality, standing in for vitest's toBeCloseTo(value, decimals). */
function assertCloseTo(actual: number, expected: number, decimals: number, message?: string) {
  const tolerance = 0.5 * 10 ** -decimals;
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    message ?? `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

const PLAYER_SIZE = 40;
const MIN_X = 0;
const MIN_Y = 0;
const MAX_X = 1280 - PLAYER_SIZE;
const MAX_Y = 720 - PLAYER_SIZE;

/** Fresh world, plus its start position, so assertions are never relative to a wall. */
function freshWorld() {
  const world = new DemoWorld();
  return { world, start: observe(world) };
}

describe("DemoWorld bounds (TASK-002)", () => {
  test("starts inside the play area with the declared 40x40 size", () => {
    const { start } = freshWorld();

    assert.equal(start.width, PLAYER_SIZE);
    assert.equal(start.height, PLAYER_SIZE);
    assert.ok(start.x >= MIN_X && start.x <= MAX_X, `x out of range: ${start.x}`);
    assert.ok(start.y >= MIN_Y && start.y <= MAX_Y, `y out of range: ${start.y}`);
  });

  const directions = [
    { name: "right", keys: ["KeyD"], axis: "x" as const, limit: MAX_X },
    { name: "left", keys: ["KeyA"], axis: "x" as const, limit: MIN_X },
    { name: "down", keys: ["KeyS"], axis: "y" as const, limit: MAX_Y },
    { name: "up", keys: ["KeyW"], axis: "y" as const, limit: MIN_Y }
  ];

  for (const dir of directions) {
    test(`cannot leave the play area moving ${dir.name}`, () => {
      const { world, start } = freshWorld();
      const input = fakeInput(dir.keys);

      // 600 frames at 0.016s = 9.6s of travel, far more than needed to cross
      // the map at 250 px/s. The clamp must land on the exact boundary value.
      for (let i = 0; i < 600; i++) world.update(0.016, input);
      const pos = observe(world);

      assert.equal(pos[dir.axis], dir.limit);
      // The perpendicular axis must be untouched by a straight-line move.
      const other = dir.axis === "x" ? pos.y : pos.x;
      assert.equal(other, dir.axis === "x" ? start.y : start.x);
    });
  }

  test("clamps both axes when moving diagonally into a corner", () => {
    const { world } = freshWorld();
    const input = fakeInput(["KeyD", "KeyS"]);

    for (let i = 0; i < 600; i++) world.update(0.016, input);
    const pos = observe(world);

    assert.equal(pos.x, MAX_X);
    assert.equal(pos.y, MAX_Y);
  });

  test("does not tunnel through the wall in a single oversized frame", () => {
    const { world } = freshWorld();

    world.update(10, fakeInput(["KeyD"]));
    const pos = observe(world);

    assert.equal(pos.x, MAX_X);
  });

  test("keeps the whole rect inside 1280x720 once clamped", () => {
    const { world } = freshWorld();

    world.update(10, fakeInput(["KeyD", "KeyS"]));
    const pos = observe(world);

    assert.ok(pos.x + pos.width <= 1280, `right edge at ${pos.x + pos.width}`);
    assert.ok(pos.y + pos.height <= 720, `bottom edge at ${pos.y + pos.height}`);
  });
});

describe("DemoWorld diagonal movement (TASK-002)", () => {
  // Every case starts from a FRESH world and advances exactly ONE frame.
  // Measuring from an already-clamped world would compare 0 against 0 and
  // pass for any implementation at all.
  const DT = 0.016;

  function measureSpeed(keys: string[]) {
    const { world, start } = freshWorld();
    world.update(DT, fakeInput(keys));
    const end = observe(world);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    return { speed: distance / DT, distance, vx: end.x - start.x, vy: end.y - start.y };
  }

  test("measures a non-zero displacement (guards against vacuous assertions)", () => {
    // Without this, the speed comparisons below could silently compare 0 to 0.
    assert.ok(measureSpeed(["KeyD"]).distance > 1, "straight displacement was ~0");
    assert.ok(measureSpeed(["KeyD", "KeyS"]).distance > 1, "diagonal displacement was ~0");
  });

  test("moves at the configured 250 px/s in a straight line", () => {
    assertCloseTo(measureSpeed(["KeyD"]).speed, 250, 9);
  });

  test("does not move faster diagonally than straight", () => {
    const straight = measureSpeed(["KeyD"]).speed;
    const diagonal = measureSpeed(["KeyD", "KeyS"]).speed;

    assertCloseTo(diagonal, straight, 9);
  });

  for (const [name, keys] of [
    ["up-right", ["KeyW", "KeyD"]],
    ["up-left", ["KeyW", "KeyA"]],
    ["down-left", ["KeyS", "KeyA"]]
  ] as const) {
    test(`moves at a consistent 45 degrees toward ${name}`, () => {
      const straight = measureSpeed(["KeyD"]).speed;
      const { speed, vx, vy } = measureSpeed([...keys]);

      assertCloseTo(speed, straight, 9);
      assertCloseTo(Math.abs(vx), Math.abs(vy), 9);
    });
  }

  test("cancels out when opposing keys are held together", () => {
    const { world, start } = freshWorld();

    world.update(DT, fakeInput(["KeyA", "KeyD"]));
    const pos = observe(world);

    assert.equal(pos.x, start.x);
    assert.equal(pos.y, start.y);
  });
});

describe("DemoWorld robustness", () => {
  test("stays in bounds with finite coordinates through 30s of random input", () => {
    const { world } = freshWorld();
    const codes = ["KeyW", "KeyA", "KeyS", "KeyD"];

    // Deterministic PRNG so any failure is reproducible.
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

    for (let i = 0; i < 1875; i++) {
      world.update(0.016, fakeInput(codes.filter(() => rnd() < 0.4)));
      const pos = observe(world);

      assert.ok(Number.isFinite(pos.x), `non-finite x at frame ${i}`);
      assert.ok(Number.isFinite(pos.y), `non-finite y at frame ${i}`);
      assert.ok(pos.x >= MIN_X && pos.x <= MAX_X, `x out of range at frame ${i}: ${pos.x}`);
      assert.ok(pos.y >= MIN_Y && pos.y <= MAX_Y, `y out of range at frame ${i}: ${pos.y}`);
    }
  });

  test("does not move or produce NaN when no key is held", () => {
    const { world, start } = freshWorld();

    world.update(0.016, fakeInput([]));
    const pos = observe(world);

    assert.equal(pos.x, start.x);
    assert.equal(pos.y, start.y);
  });
});
