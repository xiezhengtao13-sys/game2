import type { ItemDef } from "../types";

export const ITEMS: Record<string, ItemDef> = {
  malt_tea: {
    id: "malt_tea",
    name: "烘烤麦芽热饮",
    shortName: "麦芽热饮",
    heal: 10,
    tpGain: 10,
    description: "老马配餐台装进保温瓶的麦芽热饮，带着一点点旧地球麦田的香气。",
    useText: "* 你拧开保温瓶喝了一口烘烤麦芽热饮。暖意直透掌心！(HP +10, TP +10%)"
  },
  protein_bar: {
    id: "protein_bar",
    name: "无菌蛋白谷饼",
    shortName: "蛋白谷饼",
    heal: 8,
    description: "远望号 L-1 农业舱压制的标准配给口粮，啃起来略硬但很扛饿。",
    useText: "* 你咔嚓咬下一块无菌蛋白谷饼。虽然像在嚼隔热棉，但体力恢复了。(HP +8)"
  },
  ma_soup: {
    id: "ma_soup",
    name: "老马浓麦芽汤",
    shortName: "浓麦芽汤",
    heal: 18,
    tpGain: 15,
    description: "配餐员老马特意给外勤班加了双份麦芽曲种的温热浓汤。",
    useText: "* 滚烫香浓的麦芽汤顺着喉咙滑下去——你仿佛听见远望号食堂的喧闹！(HP +18, TP +15%)"
  },
  fifth_ampoule: {
    id: "fifth_ampoule",
    name: "第五协议稳定剂",
    shortName: "协议稳定剂",
    heal: 14,
    tpGain: 35,
    description: "陈艾琳亲手调制的神经节律稳态口服液，能瞬间拉满个体意识共鸣。",
    useText: "* 神经节律瞬间归位，弥涅瓦-V 的护航脉搏与你完美同步！(HP +14, TP +35%)"
  },
  nano_gel: {
    id: "nano_gel",
    name: "陈医生急救凝胶",
    shortName: "急救凝胶",
    heal: 99,
    description: "针对无义体原版人类生理基线特配的高效创伤修复凝胶。",
    useText: "* 冰凉的急救凝胶迅速封住了所有灼伤与裂口。你的状态彻底恢复！(HP 全满)"
  }
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}
