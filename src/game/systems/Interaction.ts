import type { Facing } from "../assets/animationSpec";

/**
 * Something the player can walk up to and press E on.
 *
 * Position is the point the player should stand near, in world pixels. It is
 * normally the walkable tile in front of the thing being interacted with, not
 * the object's own tile -- you stand at the door, not inside the wall.
 */
export interface Interactable {
  /** Stable id, used to tell objects apart and to look up their behaviour. */
  id: string;
  /** Short label shown in the prompt, e.g. "家门". */
  label: string;
  x: number;
  y: number;
  /** How close the interaction point must be to be usable, in pixels. */
  radius: number;
}

/** Unit vector for a facing, in screen space (y grows downwards). */
export function facingVector(facing: Facing): { x: number; y: number } {
  switch (facing) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

/** Where the player is looking: a point in front of them, past their feet. */
export interface ReachPoint {
  x: number;
  y: number;
}

/**
 * The point the player is reaching towards.
 *
 * `feetY` is the player's feet rather than their centre, because interaction is
 * about where you are standing, not how tall the sprite is.
 */
export function reachPoint(
  centerX: number,
  feetY: number,
  facing: Facing,
  distance: number
): ReachPoint {
  const dir = facingVector(facing);
  return { x: centerX + dir.x * distance, y: feetY + dir.y * distance };
}

/**
 * Pick the interactable the player should be prompted about, or null.
 *
 * Deliberately "nearest to the reach point wins" and nothing more:
 *   - facing decides *which* objects are in reach, so turning away withdraws the
 *     prompt (you cannot use the mill while walking away from it)
 *   - among those in reach the closest wins, so standing between a door and the
 *     notice board always prompts for the same one rather than flickering
 *
 * Ties are broken by id so the choice is stable frame to frame.
 */
export function findInteractable(
  interactables: readonly Interactable[],
  reach: ReachPoint
): Interactable | null {
  let best: Interactable | null = null;
  let bestDistance = Infinity;

  for (const candidate of interactables) {
    const dx = candidate.x - reach.x;
    const dy = candidate.y - reach.y;
    const distance = Math.hypot(dx, dy);

    if (distance > candidate.radius) continue;

    // Strictly closer, or equal distance with a smaller id: both keep the result
    // independent of iteration order.
    const better =
      distance < bestDistance ||
      (distance === bestDistance && best !== null && candidate.id < best.id);

    if (better) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}
