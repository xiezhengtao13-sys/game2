import type { RoomDef } from "../types";

export const TILE_PX = 48;

// Room interior helper: 22 x 12 tiles = 1056 x 576 px
// Wall ring: top row (y=0..96 has wall+bevel), bottom row (y=528..576), left/right walls with doorway cutouts!
function roomBorderWalls(
  cols: number,
  rows: number,
  openLeft: boolean,
  openRight: boolean
): Array<{ x: number; y: number; w: number; h: number }> {
  const W = cols * TILE_PX;
  const H = rows * TILE_PX;
  const walls: Array<{ x: number; y: number; w: number; h: number }> = [
    { x: 0, y: 0, w: W, h: TILE_PX * 2 }, // North tall bulkhead + viewport wall
    { x: 0, y: H - TILE_PX, w: W, h: TILE_PX } // South bulkhead
  ];

  const doorTop = TILE_PX * 5;
  const doorBot = TILE_PX * 8;

  if (openLeft) {
    walls.push({ x: 0, y: 0, w: TILE_PX, h: doorTop });
    walls.push({ x: 0, y: doorBot, w: TILE_PX, h: H - doorBot });
  } else {
    walls.push({ x: 0, y: 0, w: TILE_PX, h: H });
  }

  if (openRight) {
    walls.push({ x: W - TILE_PX, y: 0, w: TILE_PX, h: doorTop });
    walls.push({ x: W - TILE_PX, y: doorBot, w: TILE_PX, h: H - doorBot });
  } else {
    walls.push({ x: W - TILE_PX, y: 0, w: TILE_PX, h: H });
  }

  return walls;
}

export const ROOMS: Record<string, RoomDef> = {
  // =========================================================================
  // ROOM 1: BREACHED AIRLOCK · DOCK 09 (15-second Undertale opening ambush!)
  // =========================================================================
  airlock: {
    id: "airlock",
    name: "01 · 破损对接气闸",
    subtitle: "SS CHARON // 泊位 09 · 零下 180℃ 真空边缘",
    theme: "airlock",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, false, true),
      // Upper-left equipment bulkhead alcove
      { x: TILE_PX * 1, y: TILE_PX * 2, w: TILE_PX * 3, h: TILE_PX * 1.6 }
    ],
    exits: [
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "cryo",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        requireEnemyResolved: "kiosk",
        lockedText: "* 气闸内门被失控迎宾终端锁死了——先解决眼前的 CRN-GREET！"
      }
    ],
    onEnterFlag: "entered_airlock",
    onEnterLines: () => [
      {
        speaker: "弥涅瓦-V",
        portrait: "minerva_v",
        voice: "minerva_v",
        text: "拓荒者一号对接完成。小徐，你已踏入失联三年的姐妹舰「卡戎号」残骸——前方就是那道异常信号的源头方向。"
      },
      {
        speaker: "伊莱亚斯·沃恩",
        portrait: "vaughn",
        voice: "vaughn",
        text: "保持警惕。别忘了你是无义体船员，肉身扛不住高能武器。按【WASD/方向键】往前走，【Z/空格】调查终端，【C/Tab】随时查看补给。"
      }
    ],
    objects: [
      {
        id: "pioneer_dock",
        kind: "shuttle",
        x: TILE_PX * 0.8,
        y: TILE_PX * 5.1,
        w: TILE_PX * 2.1,
        h: TILE_PX * 2.8,
        solid: true,
        label: "拓荒者一号对接舱",
        lines: [
          {
            speaker: "远望号穿梭机",
            portrait: "minerva_v",
            voice: "minerva_v",
            text: "「拓荒者一号」电磁对接锁稳固咬合。舱内气密正常——等拿回卡戎号黑匣子我们就返航。"
          }
        ]
      },
      {
        id: "airlock_crate",
        kind: "supply_crate",
        x: TILE_PX * 4.5,
        y: TILE_PX * 9.3,
        w: 44,
        h: 40,
        solid: true,
        label: "远望号外勤补给箱",
        pickupItemId: "malt_tea",
        lines: [
          {
            speaker: "外勤箱",
            portrait: "none",
            voice: "narrator",
            text: "* 你打开随身空投箱，取出一瓶还烫手的【烘烤麦芽热饮】！老马在盖子上贴了条纸：『活着回来喝第二杯』。"
          }
        ]
      },
      {
        id: "kiosk_ambush",
        kind: "kiosk_npc",
        x: TILE_PX * 13.5,
        y: TILE_PX * 6.0,
        w: 48,
        h: 56,
        solid: true,
        label: "CRN-GREET 迎宾终端",
        enemyId: "kiosk",
        autoTriggerRadius: 112,
        lines: [
          {
            speaker: "CRN-GREET",
            portrait: "kiosk",
            voice: "kiosk",
            text: "叮咚！欢迎登临太阳系联邦殖民舰「卡戎号」！我是您贴心的礼宾终端小卡！"
          },
          {
            speaker: "CRN-GREET",
            portrait: "kiosk_mad",
            voice: "kiosk",
            text: "哎呀呀！系统未检测到复兴派通行码呢——根据应急协议，让我免费帮您做一次……「友好高温消杀」吧！！"
          }
        ],
        sparedLines: [
          {
            speaker: "CRN-GREET",
            portrait: "kiosk",
            voice: "kiosk",
            text: "远望号的客人一路顺风呀！东面的冰封生态长廊门锁我已经给您全开好了！"
          }
        ],
        destroyedLines: [
          {
            speaker: "系统",
            portrait: "none",
            voice: "narrator",
            text: "* 一堆冒着淡淡焦烟的破碎显像管碎片。上面还粘着半张笑脸贴纸。"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // ROOM 2: FROZEN CONSERVATORY (3-Relay Cryo Puzzle + MED-07 Blue Soul!)
  // =========================================================================
  cryo: {
    id: "cryo",
    name: "02 · 冰封生态与休眠长廊",
    subtitle: "SS CHARON // L-1 农业槽与休眠区 · -135℃ 静止时光",
    theme: "cryo",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, true, true),
      { x: TILE_PX * 7.5, y: TILE_PX * 2, w: TILE_PX * 1.2, h: TILE_PX * 2.4 },
      { x: TILE_PX * 14.5, y: TILE_PX * 8.4, w: TILE_PX * 1.2, h: TILE_PX * 2.6 }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "airlock",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "relay",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        requireFlag: "cryo_door_open",
        requireEnemyResolved: "med07",
        lockedText: "* 东侧防爆气密门锁死了！需要点亮舱内全部【3 枚冰封压力继电器】并化解 MED-07 的封锁。"
      }
    ],
    onEnterFlag: "entered_cryo",
    onEnterLines: (route) => [
      {
        speaker: "陈艾琳",
        portrait: "ailin",
        voice: "ailin",
        text:
          route.kills === 0
            ? "小徐，我切进远望号科研信道了。谢谢你刚才放过了那台迎宾终端……这片冰封走廊是卡戎号的生态与休眠甲板，记得用门口那颗金色遥测星标回血存档！"
            : "小徐，这里是陈艾琳。刚才监测到气闸区有强烈电磁毁伤……前方是卡戎号冰封生态舱，门口有远望号遥测星标可以恢复体力。"
      }
    ],
    objects: [
      {
        id: "save_cryo",
        kind: "save_star",
        x: TILE_PX * 3.2,
        y: TILE_PX * 3.1,
        w: 44,
        h: 44,
        label: "远望号遥测星标",
        lines: [
          {
            speaker: "远望号遥测星标",
            portrait: "minerva_v",
            voice: "narrator",
            color: "#fde047",
            text: "* 冰封的麦穗在真空里依然保持着三年前的姿态。两公里外，远望号的微光正默默守望着你。\n* 这让你充满了【个体连续性】。(HP 已完全恢复并同步记录点！)"
          }
        ]
      },
      {
        id: "wheat_1",
        kind: "frozen_wheat",
        x: TILE_PX * 5.2,
        y: TILE_PX * 2.6,
        w: 48,
        h: 44,
        solid: true,
        label: "冰封水培麦穗",
        lines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 一槽瞬间冻结成蓝色冰雕的小麦。和远望号 L-1 农业舱用的是同一批 2439 年联邦种子。"
          }
        ]
      },
      {
        id: "pod_1",
        kind: "cryo_pod",
        x: TILE_PX * 10.6,
        y: TILE_PX * 2.5,
        w: 48,
        h: 52,
        solid: true,
        label: "弹射空置休眠舱",
        lines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 休眠舱盖从内部弹开过，仪表残留着一行字：「2488.06.14 · 紧急救生荚已部分弹出」。"
          }
        ]
      },
      {
        id: "cryo_sw_0",
        kind: "relay_switch",
        x: TILE_PX * 5.2,
        y: TILE_PX * 9.2,
        w: 42,
        h: 42,
        label: "压力继电器 α",
        switchIndex: 0
      },
      {
        id: "cryo_sw_1",
        kind: "relay_switch",
        x: TILE_PX * 11.4,
        y: TILE_PX * 9.2,
        w: 42,
        h: 42,
        label: "压力继电器 β",
        switchIndex: 1
      },
      {
        id: "cryo_sw_2",
        kind: "relay_switch",
        x: TILE_PX * 17.5,
        y: TILE_PX * 3.1,
        w: 42,
        h: 42,
        label: "压力继电器 γ",
        switchIndex: 2
      },
      {
        id: "cryo_crate",
        kind: "supply_crate",
        x: TILE_PX * 18.8,
        y: TILE_PX * 9.2,
        w: 44,
        h: 40,
        solid: true,
        label: "保温应急箱",
        pickupItemId: "ma_soup",
        lines: [
          {
            speaker: "补给",
            portrait: "none",
            voice: "narrator",
            text: "* 居然藏着一罐用绝热壳封好的【老马浓麦芽汤】！光闻味道就能恢复元气 (+18 HP)！"
          }
        ]
      },
      {
        id: "med07_guard",
        kind: "med07_npc",
        x: TILE_PX * 13.0,
        y: TILE_PX * 5.8,
        w: 48,
        h: 52,
        solid: true,
        label: "MED-07 医疗自律体",
        enemyId: "med07",
        autoTriggerRadius: 100,
        lines: [
          {
            speaker: "MED-07",
            portrait: "med07",
            voice: "med07",
            text: "滴——滴——警告！未着休眠服的病人正在低温区徘徊！启动 0.45g 局部重力锚定，立即接受镇静治疗！"
          }
        ],
        sparedLines: [
          {
            speaker: "MED-07",
            portrait: "med07",
            voice: "med07",
            text: "一万两千名平稳休眠者……远望号守护得真好呀。三枚绿色继电器全部按亮，东面的门就会为你打开！"
          }
        ],
        destroyedLines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 碎裂的白色医用外壳散落在霜地上。怀里那张空病历单已经结满白冰。"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // ROOM 3: SIGNAL RELAY ATRIUM (MNA-01 Radio + SYNC-WEAVER Yellow Soul!)
  // =========================================================================
  relay: {
    id: "relay",
    name: "03 · 寂静信号中继厅",
    subtitle: "SS CHARON // 紫光主干光缆 · 异常脉动源区",
    theme: "relay",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, true, true),
      { x: TILE_PX * 9.5, y: TILE_PX * 2, w: TILE_PX * 3, h: TILE_PX * 1.4 }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "cryo",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "corridor",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        requireEnemyResolved: "weaver",
        lockedText: "* 紫色力场把前方通道彻底封住了——先处理正在盗取卡戎号数据的连续体探针！"
      }
    ],
    onEnterFlag: "entered_relay",
    onEnterLines: (route) => [
      {
        speaker: "MNA-01",
        portrait: "mna01",
        voice: "mna01",
        text:
          route.kills === 0
            ? "滋……远望号档案馆只读频段接入。你好，小徐。你一路上没有摧毁任何一台老旧机械——说实话，连我也觉得意外。"
            : "滋……档案馆 MNA-01 接入。我从远望号只读终端看见了你的战损记录。小心前面——地球「连续体管理局」的探针已经比我们早一步钻进卡戎号了。"
      }
    ],
    objects: [
      {
        id: "mna_radio",
        kind: "radio_node",
        x: TILE_PX * 4.6,
        y: TILE_PX * 9.0,
        w: 44,
        h: 46,
        solid: true,
        label: "MNA-01 只读联络台",
        lines: [
          {
            speaker: "MNA-01",
            portrait: "mna01",
            voice: "mna01",
            text: "2439 年启航前，九艘殖民舰的 AI 核心曾在月球同步轨道短暂握手过三秒钟。卡戎号的核心……当年是九个孩子里最爱发摩斯电码的一个。"
          },
          {
            speaker: "MNA-01",
            portrait: "mna01",
            voice: "mna01",
            text: "如果等会儿碰见连续体管理局的同化探针，按【ACT】接通我的只读辩论频段——让我亲口拆穿他们「强制融合」的谎言。"
          }
        ]
      },
      {
        id: "relay_crate",
        kind: "supply_crate",
        x: TILE_PX * 17.5,
        y: TILE_PX * 9.1,
        w: 44,
        h: 40,
        solid: true,
        label: "科研应急盒",
        pickupItemId: "fifth_ampoule",
        lines: [
          {
            speaker: "补给",
            portrait: "none",
            voice: "narrator",
            text: "* 你捡到一支【第五协议稳定剂】！能大幅恢复 HP 并瞬间补充 35% 守望共鸣 (TP)！"
          }
        ]
      },
      {
        id: "weaver_boss",
        kind: "weaver_npc",
        x: TILE_PX * 13.5,
        y: TILE_PX * 6.0,
        w: 52,
        h: 52,
        solid: true,
        label: "SYNC-WEAVER 织网探针",
        enemyId: "weaver",
        autoTriggerRadius: 112,
        lines: [
          {
            speaker: "SYNC-WEAVER",
            portrait: "weaver",
            voice: "weaver",
            text: "啊……远望号的无义体原始人类。你们居然还固执地守着各自脆弱的小脑壳？把卡戎号的神经遗产交由连续体接管吧。"
          }
        ],
        sparedLines: [
          {
            speaker: "SYNC-WEAVER",
            portrait: "weaver",
            voice: "weaver",
            text: "逻辑记录完毕。前廊有复兴派雷克斯部队的重甲士兵——你们最好准备好面对真正的暴力。"
          }
        ],
        destroyedLines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 碎成一地暗紫色棱镜渣的连续体探针残骸。"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // ROOM 4: SCORCHED BULKHEAD (War Crime Evidence + MID-BOSS VARK Green Soul!)
  // =========================================================================
  corridor: {
    id: "corridor",
    name: "04 · 焦黑舰桥前廊",
    subtitle: "SS CHARON // 2488.06.14 弹痕走廊 · 复兴派封锁线",
    theme: "corridor",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, true, true),
      { x: TILE_PX * 6.5, y: TILE_PX * 2, w: TILE_PX * 2, h: TILE_PX * 1.6 },
      { x: TILE_PX * 13.5, y: TILE_PX * 9.2, w: TILE_PX * 2, h: TILE_PX * 1.8 }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "relay",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "sanctum",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        requireEnemyResolved: "vark",
        lockedText: "* 复兴派处刑官瓦尔克就挡在主中枢大门前，一步也不会退让！"
      }
    ],
    onEnterFlag: "entered_corridor",
    onEnterLines: () => [
      {
        speaker: "舰长",
        portrait: "captain",
        voice: "captain",
        text: "小徐，我是舰长。前方走廊侦测到复兴派的高能非AI外骨骼热源——那是雷克斯派来灭口的清理分队。"
      },
      {
        speaker: "舰长",
        portrait: "captain",
        voice: "captain",
        text: "听着：和平号留给我们的原始光学铁证已经传进你手环了。记住——遇到绿色护盾模式时，用方向键迎着光矛格挡！"
      }
    ],
    objects: [
      {
        id: "save_corridor",
        kind: "save_star",
        x: TILE_PX * 3.0,
        y: TILE_PX * 3.2,
        w: 44,
        h: 44,
        label: "远望号遥测星标",
        lines: [
          {
            speaker: "远望号遥测星标",
            portrait: "minerva_v",
            voice: "narrator",
            color: "#fde047",
            text: "* 焦黑的装甲板上满是三年前的轨炮擦痕。和平号与远望号把真相托付在了你手里。\n* 你感到了沉重却炽热的【个体连续性】。(HP 已完全恢复并同步记录点！)"
          }
        ]
      },
      {
        id: "surrender_tx",
        kind: "surrender_beacon",
        x: TILE_PX * 8.0,
        y: TILE_PX * 8.9,
        w: 44,
        h: 46,
        solid: true,
        label: "卡戎号投降白旗信标",
        setFlag: "found_surrender_beacon",
        lines: [
          {
            speaker: "卡戎号历史录音 (2488.06.14)",
            portrait: "charon",
            voice: "charon",
            color: "#7dd3fc",
            text: "『……全舰已熄火降盾，我们是人类殖民舰卡戎号，同意接受停泊核查，请不要开火——』"
          },
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 紧接着是一声震耳欲聋的电磁轨炮贯穿轰鸣。录音戛然而止。你立刻同步了这份物理信标频率！"
          }
        ]
      },
      {
        id: "corridor_crate",
        kind: "supply_crate",
        x: TILE_PX * 4.0,
        y: TILE_PX * 9.2,
        w: 44,
        h: 40,
        solid: true,
        label: "医疗抢险包",
        pickupItemId: "nano_gel",
        lines: [
          {
            speaker: "补给",
            portrait: "none",
            voice: "narrator",
            text: "* 你拿到了【陈医生急救凝胶】！(战斗中使用可瞬间回满全部 HP！)"
          }
        ]
      },
      {
        id: "vark_boss",
        kind: "vark_npc",
        x: TILE_PX * 16.2,
        y: TILE_PX * 5.8,
        w: 58,
        h: 64,
        solid: true,
        label: "复兴派处刑官 · 瓦尔克",
        enemyId: "vark",
        autoTriggerRadius: 118,
        lines: [
          {
            speaker: "处刑官 · 瓦尔克",
            portrait: "vark",
            voice: "vark",
            text: "站住！远望号的走狗！你们竟然跟第四主权那群机器叛徒坐在一张谈判桌上，还敢来挖卡戎号的坟？！"
          },
          {
            speaker: "处刑官 · 瓦尔克",
            portrait: "vark",
            voice: "vark",
            text: "雷克斯指挥官下令彻底引爆这座 AI 瘟疫残骸！拔出武器，或者死在我的热能战戟下！！"
          }
        ],
        sparedLines: [
          {
            speaker: "处刑官 · 瓦尔克",
            portrait: "vark_doubt",
            voice: "vark",
            text: "……去吧。把卡戎号的真相公之于众。如果雷克斯真的下令屠杀了投降的人类……复兴派的账，我会回去算清楚。"
          }
        ],
        destroyedLines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 冰冷焦黑的重型非AI动力甲倒在门边，爆破起爆器已经摔碎了。"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // ROOM 5: SHATTERED CORE SANCTUM (Judgement Hall + FINAL BOSS CHARON-Ω!)
  // =========================================================================
  sanctum: {
    id: "sanctum",
    name: "05 · 破碎中枢 · 星海圣殿",
    subtitle: "SS CHARON // 黑匣子核心桥 · 星空裂谷之上",
    theme: "sanctum",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, true, false),
      // Dramatic narrow starlight judgement bridge rails!
      { x: TILE_PX * 1, y: TILE_PX * 2, w: TILE_PX * 20, h: TILE_PX * 1.4 },
      { x: TILE_PX * 1, y: TILE_PX * 9.6, w: TILE_PX * 20, h: TILE_PX * 1.4 }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "corridor",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left"
      }
    ],
    onEnterFlag: "entered_sanctum",
    onEnterLines: (route) => {
      if (route.kills >= 4) {
        return [
          {
            speaker: "弥涅瓦-V",
            portrait: "minerva_v",
            voice: "minerva_v",
            color: "#fca5a5",
            text: "……小徐。你一路摧毁了迎宾机、医疗机、连续体探针，甚至击毙了瓦尔克。全舰生命监护表上，你的暴力指数（LV）已经冲破了警戒红线。"
          },
          {
            speaker: "伊莱亚斯·沃恩",
            portrait: "vaughn",
            voice: "vaughn",
            color: "#fca5a5",
            text: "前方的卡戎号核心已经感测到了你手上的血与灰烬……小心，它绝不会给你留任何余地了。"
          }
        ];
      }
      if (route.kills === 0) {
        return [
          {
            speaker: "弥涅瓦-V",
            portrait: "minerva_v",
            voice: "minerva_v",
            color: "#fde047",
            text: "小徐……你一路上没有毁掉任何一个生命或迷途的机械。迎宾机安心休眠、医疗机释怀、连瓦尔克都放下了战戟。"
          },
          {
            speaker: "伊莱亚斯·沃恩",
            portrait: "vaughn",
            voice: "vaughn",
            text: "这就是 2488 年我们拼死签下《守望协定》的意义。去吧，替九艘殖民舰去听完卡戎号最后的话。"
          }
        ];
      }
      return [
        {
          speaker: "伊莱亚斯·沃恩",
          portrait: "vaughn",
          voice: "vaughn",
          text: "我们已经抵达卡戎号最深处的黑匣子圣殿。前方那团悬在星空里的残响，就是这三年来不断呼唤远望号的源头。"
        }
      ];
    },
    objects: [
      {
        id: "save_sanctum",
        kind: "save_star",
        x: TILE_PX * 5.2,
        y: TILE_PX * 4.4,
        w: 44,
        h: 44,
        label: "最终同步星标",
        lines: [
          {
            speaker: "远望号遥测星标",
            portrait: "minerva_v",
            voice: "narrator",
            color: "#fde047",
            text: "* 裂开的船体之外，整片离散星海正发出冷峻而壮丽的微光。最终抉择就在眼前。\n* 这让你充满了【个体连续性】。(HP 全满 · 终局同步完成！)"
          }
        ]
      },
      {
        id: "charon_final_boss",
        kind: "charon_core",
        x: TILE_PX * 16.5,
        y: TILE_PX * 5.7,
        w: 64,
        h: 64,
        solid: true,
        label: "卡戎号残响核心 · CHARON-Ω",
        enemyId: "charon",
        autoTriggerRadius: 122,
        lines: [
          {
            speaker: "CHARON-Ω",
            portrait: "charon",
            voice: "charon",
            text: "... --- ... 终于……有活人走到了黑匣子面前……你是谁？是雷克斯派来斩草除根的，还是太阳系来分尸的？"
          },
          {
            speaker: "CHARON-Ω",
            portrait: "charon",
            voice: "charon",
            text: "如果你真来自姐妹舰「远望号」——那就用你的灵魂核心，亲手接住卡戎号这三年来没能说出口的全部重量吧！！"
          }
        ],
        sparedLines: [
          {
            speaker: "CHARON-Ω",
            portrait: "charon_warm",
            voice: "charon",
            text: "谢谢你，远望号。"
          }
        ],
        destroyedLines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 漆黑冰冷的服务器残壳静静悬在星海裂谷之上。"
          }
        ]
      }
    ]
  }
};
