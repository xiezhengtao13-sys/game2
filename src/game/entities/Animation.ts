import { frameFor, WALK_FRAME_SECONDS, type Facing, type Frame, type Pose } from "../assets/animationSpec";

/**
 * Turns "which way is the player facing, and are they moving" into the frame to
 * draw. Holds only a timer and a facing -- no DOM, no drawing.
 *
 * The walk cycle alternates between two frames while moving and returns to the
 * idle frame the moment movement stops, so releasing the keys settles the
 * character instead of freezing mid-stride.
 */
export class Animation {
  facing: Facing = "down";
  private moving = false;
  private elapsed = 0;

  /** Point the animation in a direction. */
  face(facing: Facing): void {
    this.facing = facing;
  }

  /** Advance the walk cycle. Call every frame with the frame's dt. */
  update(dt: number, moving: boolean): void {
    if (!moving) {
      // Reset so the next walk always starts on the same foot.
      this.moving = false;
      this.elapsed = 0;
      return;
    }

    this.moving = true;
    this.elapsed += dt;
  }

  /** The pose to draw right now. */
  get pose(): Pose {
    if (!this.moving) return "idle";
    const step = Math.floor(this.elapsed / WALK_FRAME_SECONDS) % 2;
    return step === 0 ? "walkA" : "walkB";
  }

  /** The sprite to draw right now. */
  get frame(): Frame {
    return frameFor(this.facing, this.pose);
  }
}
