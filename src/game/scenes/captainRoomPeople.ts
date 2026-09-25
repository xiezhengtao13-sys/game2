import type { ScenePerson } from "./Scene";
import { TILE } from "../config";

/**
 * Who is in the captain's quarters.
 *
 * The captain, at his own desk.
 *
 * The setting document never names him, so nothing here invents a name -- he is
 * referred to as 舰长 throughout. If he is ever named, it goes here.
 *
 * His dialogue is deliberately about the objects in this room rather than about
 * the plot. The room description says the paper documents, the physical star
 * chart and the photograph of Earth are what give this space its life, so he
 * talks about those -- which also teaches the player that the room is worth
 * looking at, without a tutorial.
 *
 * He also appears on the bridge, with different lines. This is the version you
 * meet when you come to his quarters.
 */
export const ROOM_PEOPLE: readonly ScenePerson[] = [
  {
    id: "captain",
    name: "舰长",
    assetId: "npc_captain",
    x: 10 * TILE,
    y: 4.5 * TILE,
    facing: "left",
    promptLabel: "和舰长说话",
    lines: [
      { speaker: "舰长", text: "进来吧，门没锁。" },
      { speaker: "舰长", text: "……你是新调上来的？第二班的？" },
      { speaker: "舰长", text: "不用站着。这间屋子不是舰桥，没那么多规矩。" },
      { speaker: "舰长", text: "桌上那几张纸别动，那是我自己排的班次。系统的表我看不惯。" },
      { speaker: "舰长", text: "星图倒是可以看。画一条线画了三十年，中间没几个弯。" },
      { speaker: "舰长", text: "好了，去忙你的吧。有什么事，到舰桥找我。" }
    ]
  }
];
