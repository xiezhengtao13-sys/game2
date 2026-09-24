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

  baker: [
    { speaker: "面包师", text: "哎，新面孔！我是烤面包的，炉子就在那边。" },
    { speaker: "面包师", text: "有小麦就能磨面，有面粉我就能给你烤一炉。" },
    { speaker: "面包师", text: "地里的活你要是接下了，面包就不愁了。" }
  ],

  farmer: [
    { speaker: "农夫", text: "你也是来看这块地的？土是好土。" },
    { speaker: "农夫", text: "我刚翻完这边。想接手的话，去告示板说一声就行。" },
    { speaker: "农夫", text: "种下去要等一阵子才熟，别急着拔。" }
  ],

  carpenter: [
    { speaker: "木匠", text: "我在量尺寸。镇长说，等镇上攒够了东西，这儿要盖个集市。" },
    { speaker: "木匠", text: "木料都备好了，就差个由头动工。" },
    { speaker: "木匠", text: "你要是往镇上交点东西，我这边就能开工了。" }
  ],

  kid: [
    { speaker: "小孩", text: "你是新来的对不对！我一眼就看出来了。" },
    { speaker: "小孩", text: "镇上以前可热闹了，后来大家都走了。" },
    { speaker: "小孩", text: "你要是留下来，我就有玩伴啦！" }
  ],

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
