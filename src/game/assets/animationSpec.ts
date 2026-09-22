import { getAssetSpec, ALL_ASSETS } from "./manifest";

/**
 * Which art plays for a given direction and pose.
 *
 * This is the bridge between "the player is walking left" and "draw this
 * sprite". It lives in the asset layer because its whole job is naming art, and
 * it is validated against the manifest at startup, so a typo fails loudly
 * instead of rendering nothing.
 */

export type Facing = "up" | "down" | "left" | "right";
export type Pose = "idle" | "walkA" | "walkB";

/** One animation frame: which asset to draw, and whether to mirror it. */
export interface Frame {
  assetId: string;
  flipX: boolean;
}

/**
 * Directions that are drawn by mirroring another direction's art. Keeps the art
 * requirement at three directions instead of four.
 */
const MIRRORED: Partial<Record<Facing, Facing>> = {
  left: "right"
};

/** The direction whose art is used for `facing`, and whether it is mirrored. */
export function resolveFacing(facing: Facing): { source: Facing; flipX: boolean } {
  const source = MIRRORED[facing];
  return source ? { source, flipX: true } : { source: facing, flipX: false };
}

/** The asset id for a direction and pose. */
export function frameFor(facing: Facing, pose: Pose): Frame {
  const { source, flipX } = resolveFacing(facing);
  return { assetId: `player_${source}_${pose}`, flipX };
}

/** How long each walk frame lasts, in seconds. */
export const WALK_FRAME_SECONDS = 0.16;

/** Every asset id the player's animation needs. */
export function playerAnimationAssetIds(): string[] {
  const ids: string[] = [];
  for (const facing of ["up", "down", "left", "right"] as const) {
    for (const pose of ["idle", "walkA", "walkB"] as const) {
      ids.push(frameFor(facing, pose).assetId);
    }
  }
  return ids;
}

/**
 * Check that every frame the animation asks for actually exists in the manifest.
 * Called at startup so a renamed or missing frame is an immediate, obvious error.
 */
export function assertAnimationAssetsExist(): void {
  const known = new Set(ALL_ASSETS.map((a) => a.id));
  const missing = playerAnimationAssetIds().filter((id) => !known.has(id));

  if (missing.length > 0) {
    throw new Error(`Player animation references unknown assets: ${missing.join(", ")}`);
  }

  // Also confirm each is resolvable through the public lookup.
  for (const id of playerAnimationAssetIds()) getAssetSpec(id);
}
