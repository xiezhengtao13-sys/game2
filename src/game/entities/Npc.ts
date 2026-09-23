import type { Facing } from "../assets/animationSpec";

/**
 * A townsperson the player can talk to.
 *
 * Position is the NPC's feet, in world pixels, matching how the player is
 * positioned, so the same drawing code works for both.
 */
export interface Npc {
  id: string;
  /** Shown in the dialogue box. */
  name: string;
  x: number;
  y: number;
  /** Which way they stand; they do not walk around yet. */
  facing: Facing;
  /** Asset id for their idle sprite. */
  spriteId: string;
}
