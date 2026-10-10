import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SimpleCamera } from "../src/engine/graphics/Camera";

// TASK-103: camera maths is pure, so it is testable in plain Node. This is the
// part of the renderer that would otherwise only be verifiable by eye.

describe("SimpleCamera framing (TASK-103)", () => {
  test("centerOn puts the target at the middle of the viewport", () => {
    const camera = new SimpleCamera(1280, 720);

    camera.centerOn(1000, 800);

    assert.equal(camera.worldX, 1000 - 640);
    assert.equal(camera.worldY, 800 - 360);
  });

  test("toScreen maps the framed point to the viewport centre", () => {
    const camera = new SimpleCamera(1280, 720);
    camera.centerOn(1000, 800);

    assert.equal(camera.toScreenX(1000), 640);
    assert.equal(camera.toScreenY(800), 360);
  });

  test("toScreen is a pure translation", () => {
    const camera = new SimpleCamera(800, 600, 150, 250);

    assert.equal(camera.toScreenX(150), 0);
    assert.equal(camera.toScreenY(250), 0);
    assert.equal(camera.toScreenX(200), 50);
    assert.equal(camera.toScreenY(300), 50);
  });
});

describe("SimpleCamera clamping (TASK-103)", () => {
  const MAP_W = 1920;
  const MAP_H = 1440;

  test("does not scroll past the top-left edge", () => {
    const camera = new SimpleCamera(1280, 720);

    camera.centerOn(0, 0);
    camera.clampTo(MAP_W, MAP_H);

    assert.equal(camera.worldX, 0);
    assert.equal(camera.worldY, 0);
  });

  test("does not scroll past the bottom-right edge", () => {
    const camera = new SimpleCamera(1280, 720);

    camera.centerOn(MAP_W, MAP_H);
    camera.clampTo(MAP_W, MAP_H);

    // The last visible pixel column is map - viewport, never map itself.
    assert.equal(camera.worldX, MAP_W - 1280);
    assert.equal(camera.worldY, MAP_H - 720);
  });

  test("the view never leaves the map for any player position", () => {
    const camera = new SimpleCamera(1280, 720);

    // Walk the whole map, including well outside it.
    for (let x = -2000; x <= MAP_W + 2000; x += 37) {
      for (let y = -2000; y <= MAP_H + 2000; y += 41) {
        camera.centerOn(x, y);
        camera.clampTo(MAP_W, MAP_H);

        assert.ok(camera.worldX >= 0, `worldX ${camera.worldX} < 0 at (${x}, ${y})`);
        assert.ok(camera.worldY >= 0, `worldY ${camera.worldY} < 0 at (${x}, ${y})`);
        assert.ok(
          camera.worldX + 1280 <= MAP_W,
          `right edge ${camera.worldX + 1280} past map at (${x}, ${y})`
        );
        assert.ok(
          camera.worldY + 720 <= MAP_H,
          `bottom edge ${camera.worldY + 720} past map at (${x}, ${y})`
        );
      }
    }
  });

  test("centres a map that is smaller than the viewport", () => {
    const camera = new SimpleCamera(1280, 720, 999, 999);

    // A 640x480 map inside a 1280x720 viewport: centred, so the map's top-left
    // sits at half the leftover space in the negative direction.
    camera.clampTo(640, 480);

    assert.equal(camera.worldX, -(1280 - 640) / 2);
    assert.equal(camera.worldY, -(720 - 480) / 2);
  });

  test("centres a small map even from a corner, and stays stable", () => {
    const camera = new SimpleCamera(1280, 720);

    // Framing a corner first moves the origin to -640/-360, and clamping then
    // places the tiny map at the centre of the viewport.
    camera.centerOn(0, 0);
    camera.clampTo(100, 100);
    const first = { x: camera.worldX, y: camera.worldY };

    // Clamping again must not drift.
    camera.clampTo(100, 100);
    assert.deepEqual({ x: camera.worldX, y: camera.worldY }, first);

    // The small map ends up centred in the viewport: its midpoint and the
    // viewport's midpoint coincide.
    assert.equal(camera.toScreenX(50), 640);
    assert.equal(camera.toScreenY(50), 360);
    assert.equal(camera.worldX, -(1280 - 100) / 2);
    assert.equal(camera.worldY, -(720 - 100) / 2);
  });

  test("a map exactly the size of the viewport cannot scroll at all", () => {
    const camera = new SimpleCamera(1280, 720);

    for (const [x, y] of [
      [0, 0],
      [640, 360],
      [1280, 720]
    ]) {
      camera.centerOn(x, y);
      camera.clampTo(1280, 720);
      assert.equal(camera.worldX, 0);
      assert.equal(camera.worldY, 0);
    }
  });

  test("clamping is idempotent once settled", () => {
    const camera = new SimpleCamera(1280, 720);
    camera.centerOn(5000, 5000);
    camera.clampTo(MAP_W, MAP_H);
    const first = { x: camera.worldX, y: camera.worldY };

    camera.clampTo(MAP_W, MAP_H);
    camera.clampTo(MAP_W, MAP_H);

    assert.deepEqual({ x: camera.worldX, y: camera.worldY }, first);
  });
});
