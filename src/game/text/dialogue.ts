import type { DialogueLine } from "../systems/Dialogue";

/**
 * What each interactable says when the player presses E.
 *
 * Kept as plain data so the writing can be revised without touching any logic.
 * Interactables with no entry simply do nothing yet, which is why this is a
 * partial map rather than something every target must appear in.
 *
 * v1 is Chinese only; no localisation framework is being built ahead of need.
 */
const DIALOGUE: Record<string, DialogueLine[]> = {
  mayor: [
    { speaker: "镇长", text: "哎呀，你就是新搬来的那位吧？" },
    { speaker: "镇长", text: "欢迎来到镇上。这里人不多，但大家都肯帮忙。" },
    { speaker: "镇长", text: "你要是愿意出份力，告示板上贴着现在缺的人手。" },
    { speaker: "镇长", text: "去看看吧，挑个你喜欢的活干。" }
  ],

  noticeboard: [
    { speaker: null, text: "告示板上贴着几张招工的告示。" },
    { speaker: null, text: "「本镇诚招农夫一名，负责照料南边那块地。」" },
    { speaker: "镇长", text: "想好了就按 E 告诉我。" }
  ],

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
