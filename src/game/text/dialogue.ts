import type { DialogueLine } from "../systems/Dialogue";

/**
 * What each interactable says when the player presses E.
 *
 * Kept as plain data so the writing can be revised without touching any logic.
 * Interactables with no entry simply do nothing yet, which is why this is a
 * partial map rather than something every target must appear in.
 *
 * Targets the game routes away before reaching here must NOT appear: the notice
 * board opens the job menu, the workbenches craft, the field is worked, and the
 * mayor runs his own two-step conversation. A `tests/jobs.test.ts` case enforces
 * that, after this exact mistake was made three times.
 *
 * v1 is Chinese only; no localisation framework is being built ahead of need.
 */
const DIALOGUE: Record<string, DialogueLine[]> = {
  home: [{ speaker: null, text: "你的新家。屋里的箱子还没拆开。" }],

  townhall: [{ speaker: null, text: "镇公所。门锁着，镇长现在在外面。" }]
};

/** The lines for an interactable, or null when it says nothing yet. */
export function dialogueFor(id: string): DialogueLine[] | null {
  return DIALOGUE[id] ?? null;
}

/** Every interactable that currently has something to say. */
export function interactablesWithDialogue(): string[] {
  return Object.keys(DIALOGUE);
}
