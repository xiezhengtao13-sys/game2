import type { Input } from "../../engine/input/Input";
import { PLAYER_SPEED } from "../config";

/**
 * Movement direction from the keyboard, as a unit vector.
 *
 * Extracted as a pure function because the normalization is the part that must
 * match the TASK-002 behaviour exactly: moving diagonally must not be faster
 * than moving straight. `|| 1` also covers "no keys held", where the raw length
 * is 0 and dividing by it would produce NaN.
 */
export function readDirection(input: Input): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (input.isDown("KeyW")) dy -= 1;
  if (input.isDown("KeyS")) dy += 1;
  if (input.isDown("KeyA")) dx -= 1;
  if (input.isDown("KeyD")) dx += 1;

  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length };
}

/**
 * The new resident. For now just a position, moved by WASD.
 *
 * Collision arrives in TASK-105 and the walk animation in TASK-106; this task
 * only needs the player to exist and to be followable by the camera.
 */
export class Player {
  readonly width = 32;
  readonly height = 48;

  constructor(public x: number, public y: number) {}

  /** Centre of the player, which is what the camera frames. */
  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  update(dt: number, input: Input): void {
    const { dx, dy } = readDirection(input);
    this.x += dx * PLAYER_SPEED * dt;
    this.y += dy * PLAYER_SPEED * dt;
  }
}
