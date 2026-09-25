import type { DialogueLine } from "../systems/Dialogue";
import { TILE } from "../config";

/**
 * A person in the room: stands somewhere, faces a direction, and has something
 * to say. Distinct from a `Prop`, which is furniture.
 *
 * `x`/`y` are the character's FEET in world pixels, matching how the player is
 * positioned, so the same drawing convention applies to both.
 */
export interface Person {
  id: string;
  name: string;
  assetId: string;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
  lines: readonly DialogueLine[];
}

/**
 * The captain, standing beside his own desk.
 *
 * He faces west, toward the desk: he is working, and the player walks in on him.
 *
 * The dialogue is deliberately about the objects in this room rather than about
 * the plot. The room description says the paper documents, the physical star
 * chart and the photograph of Earth are what give this space its life, so he
 * talks about those -- which also teaches the player that the room is worth
 * looking at, without a tutorial.
 *
 * Note: the setting document never names him, so nothing here invents a name.
 * That is the user's to decide (see TASKS.md).
 */
export const CAPTAIN: Person = {
  id: "captain",
  name: "舰长",
  assetId: "npc_captain",
  x: 10 * TILE,
  y: 4.5 * TILE,
  facing: "left",
  lines: [
    { speaker: "舰长", text: "进来吧，门没锁。" },
    { speaker: "舰长", text: "……你是新调上来的？第二班的？" },
    { speaker: "舰长", text: "不用站着。这间屋子不是舰桥，没那么多规矩。" },
    { speaker: "舰长", text: "桌上那几张纸别动，那是我自己排的班次。系统的表我看不惯。" },
    { speaker: "舰长", text: "星图倒是可以看。画一条线画了三十年，中间没几个弯。" },
    { speaker: "舰长", text: "好了，去忙你的吧。有什么事，到舰桥找我。" }
  ]
};

/** Everyone in the room. One for now. */
export const ROOM_PEOPLE: readonly Person[] = [CAPTAIN];
