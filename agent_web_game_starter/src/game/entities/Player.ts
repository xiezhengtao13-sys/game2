import type { Input } from "../../engine/input/Input";
import type { TileMap } from "../map/TileMap";
import { resolveMovement } from "../map/collision";
import { PLAYER_SPEED } from "../config";
import { Animation } from "./Animation";
import type { Facing } from "../assets/animationSpec";

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
 * Which way the character should face for a movement direction.
 *
 * Vertical wins ties, which is what keeps a diagonal walk from flickering
 * between a side view and a front view as the player drifts across the screen.
 */
export function facingFor(dx: number, dy: number): Facing {
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  return "down";
}

/**
 * The new resident: position, facing, and a walk cycle.
 */
export class Player {
  /**
   * Full sprite size, used for drawing. `bottom-center` anchored, so (x, y) is
   * the top-left of this box.
   */
  readonly width = 32;
  readonly height = 48;

  /**
   * Collision box, covering the feet rather than the whole sprite. A top-down
   * character's head may overlap a wall visually without that looking wrong, and
   * using the full 32x48 box would make doorways and gaps feel too tight.
   */
  readonly colliderWidth = 22;
  readonly colliderHeight = 16;

  readonly animation = new Animation();

  /** Optional world destination (feet center) set by mouse left-click. */
  moveTarget: { x: number; y: number } | null = null;

  constructor(public x: number, public y: number) {}

  /** Centre of the player, which is what the camera frames. */
  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  /** Which way the character is facing. */
  get facing(): Facing {
    return this.animation.facing;
  }

  /** The collision box, aligned to the bottom-centre of the sprite. */
  colliderAt(x = this.x, y = this.y) {
    return {
      x: x + (this.width - this.colliderWidth) / 2,
      y: y + this.height - this.colliderHeight,
      width: this.colliderWidth,
      height: this.colliderHeight
    };
  }

  setMoveTarget(worldX: number, worldY: number): void {
    this.moveTarget = { x: worldX, y: worldY };
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
  }

  update(dt: number, input: Input, map: TileMap): void {
    let { dx, dy } = readDirection(input);
    const keyMoving = dx !== 0 || dy !== 0;
    let moving = keyMoving;

    if (keyMoving) {
      // Manual keyboard input cancels automated click-to-walk immediately.
      this.moveTarget = null;
    } else if (this.moveTarget) {
      const feetX = this.centerX;
      const feetY = this.y + this.height - this.colliderHeight / 2;
      const vx = this.moveTarget.x - feetX;
      const vy = this.moveTarget.y - feetY;
      const dist = Math.hypot(vx, vy);
      if (dist <= 6) {
        this.moveTarget = null;
        moving = false;
      } else {
        dx = vx / dist;
        dy = vy / dist;
        moving = true;
      }
    }

    const prevX = this.x;
    const prevY = this.y;

    const moved = resolveMovement(
      map,
      this.colliderAt(),
      dx * PLAYER_SPEED * dt,
      dy * PLAYER_SPEED * dt
    );

    // `resolveMovement` works on the collider; shift the result back to the
    // sprite's top-left so drawing stays aligned.
    this.x = moved.x - (this.width - this.colliderWidth) / 2;
    this.y = moved.y - (this.height - this.colliderHeight);

    // Cancel mouse target if completely blocked by a wall
    if (!keyMoving && this.moveTarget && Math.hypot(this.x - prevX, this.y - prevY) < 0.05 && dt > 0.001) {
      this.moveTarget = null;
    }

    if (moving) this.animation.face(facingFor(dx, dy));
    this.animation.update(dt, moving);
  }
}
