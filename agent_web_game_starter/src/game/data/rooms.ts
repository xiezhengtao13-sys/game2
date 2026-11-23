import type { RoomDef, RouteState } from "../types";

export const TILE_PX = 48;

function roomBorderWalls(
  cols: number,
  rows: number,
  openings: { left?: boolean; right?: boolean; top?: [number, number]; bottom?: [number, number] }
): Array<{ x: number; y: number; w: number; h: number }> {
  const W = cols * TILE_PX;
  const H = rows * TILE_PX;
  const walls: Array<{ x: number; y: number; w: number; h: number }> = [];

  // North wall (2 tiles tall for architectural depth + viewports)
  if (openings.top) {
    const [x0, x1] = openings.top;
    if (x0 > 0) walls.push({ x: 0, y: 0, w: x0 * TILE_PX, h: TILE_PX * 2 });
    if (x1 < cols) walls.push({ x: x1 * TILE_PX, y: 0, w: (cols - x1) * TILE_PX, h: TILE_PX * 2 });
  } else {
    walls.push({ x: 0, y: 0, w: W, h: TILE_PX * 2 });
  }

  // South wall (1 tile tall)
  if (openings.bottom) {
    const [x0, x1] = openings.bottom;
    if (x0 > 0) walls.push({ x: 0, y: H - TILE_PX, w: x0 * TILE_PX, h: TILE_PX });
    if (x1 < cols) walls.push({ x: x1 * TILE_PX, y: H - TILE_PX, w: (cols - x1) * TILE_PX, h: TILE_PX });
  } else {
    walls.push({ x: 0, y: H - TILE_PX, w: W, h: TILE_PX });
  }

  const doorTop = TILE_PX * 5;
  const doorBot = TILE_PX * 8;

  if (openings.left) {
    walls.push({ x: 0, y: 0, w: TILE_PX, h: doorTop });
    walls.push({ x: 0, y: doorBot, w: TILE_PX, h: H - doorBot });
  } else {
    walls.push({ x: 0, y: 0, w: TILE_PX, h: H });
  }

  if (openings.right) {
    walls.push({ x: W - TILE_PX, y: 0, w: TILE_PX, h: doorTop });
    walls.push({ x: W - TILE_PX, y: doorBot, w: TILE_PX, h: H - doorBot });
  } else {
    walls.push({ x: W - TILE_PX, y: 0, w: TILE_PX, h: H });
  }

  return walls;
}

export const ROOMS: Record<string, RoomDef> = {
  // =========================================================================
  // ROOM 1: BREACHED AIRLOCK · DOCK 09 (Compact sculpted docking hall, zero emptiness!)
  // =========================================================================
  airlock: {
    id: "airlock",
    code: "01",
    name: "01 · 破损对接气闸",
    subtitle: "SS CHARON // 泊位 09 · 穿梭机对接前厅",
    theme: "airlock",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, { right: true }),
      // Sculpted NW security customs desk bulkhead
      { x: TILE_PX * 1, y: TILE_PX * 2, w: TILE_PX * 5, h: TILE_PX * 2.1 },
      // Torn NE Vacuum Breach Chasm bulkhead (non-rectangular tension!)
      { x: TILE_PX * 15, y: TILE_PX * 2, w: TILE_PX * 6, h: TILE_PX * 2.2 },
      // South-center structural inspection pillar dividing supply alcove from east gate
      { x: TILE_PX * 9.5, y: TILE_PX * 8.6, w: TILE_PX * 2.2, h: TILE_PX * 2.4 },
      { x: TILE_PX * 16.5, y: TILE_PX * 9.0, w: TILE_PX * 4.5, h: TILE_PX * 2.0 }
    ],
    zones: [
      // Bright neutral-framed central boarding spine leading straight to CRN-GREET
      { x: TILE_PX * 3.1, y: TILE_PX * 5.2, w: TILE_PX * 17.9, h: TILE_PX * 2.6, kind: "walkway" },
      // Yellow hazard apron around Pioneer-1 docking collar
      { x: TILE_PX * 1.0, y: TILE_PX * 4.6, w: TILE_PX * 2.5, h: TILE_PX * 3.8, kind: "hazard_pad", label: "DOCK 09" },
      // Warm amber illuminated Supply Staging Bay (SW alcove)
      { x: TILE_PX * 3.2, y: TILE_PX * 8.4, w: TILE_PX * 5.6, h: TILE_PX * 2.4, kind: "warm_pad", label: "SUPPLY" },
      // Recessed technical grate bay directly north of Kiosk checkpoint
      { x: TILE_PX * 7.2, y: TILE_PX * 2.4, w: TILE_PX * 6.8, h: TILE_PX * 2.3, kind: "grate", label: "CUSTOMS" },
      // Sheared open vacuum breach visible in NE corner
      { x: TILE_PX * 15.2, y: TILE_PX * 2.1, w: TILE_PX * 5.6, h: TILE_PX * 2.0, kind: "void_breach", label: "HULL BREACH" }
    ],
    spotlights: [
      { x: TILE_PX * 2.6, y: TILE_PX * 6.5, radius: 130, color: "rgba(56, 189, 248, 0.16)" },
      { x: TILE_PX * 13.8, y: TILE_PX * 6.4, radius: 135, color: "rgba(74, 222, 128, 0.18)" },
      { x: TILE_PX * 5.4, y: TILE_PX * 9.5, radius: 95, color: "rgba(251, 191, 36, 0.16)" }
    ],
    decor: [
      { x: TILE_PX * 1.5, y: TILE_PX * 2.4, w: TILE_PX * 4.0, h: TILE_PX * 1.3, kind: "desk_unit" },
      { x: TILE_PX * 6.8, y: TILE_PX * 8.9, w: 72, h: 48, kind: "cargo_stack" },
      { x: TILE_PX * 17.2, y: TILE_PX * 9.3, w: 96, h: 52, kind: "cargo_stack" },
      { x: TILE_PX * 8.6, y: TILE_PX * 2.1, w: 170, h: 26, kind: "holo_sign", text: "CHARON // DOCK 09" }
    ],
    exits: [
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "cryo",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        edge: "right",
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
        text: "拓荒者一号对接完成。小徐，你已踏入失联三年的姐妹舰「卡戎号」残骸——东面亮绿灯的检录口后方就是主生态廊。"
      },
      {
        speaker: "伊莱亚斯·沃恩",
        portrait: "vaughn",
        voice: "vaughn",
        text: "先去西南角补给垫拿上老马留的麦芽热饮，再往前试探那台闪烁的迎宾机。记住：【ACT 干预】与【FIGHT 强攻】会带你走向截然不同的结局。"
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
            text: "「拓荒者一号」电磁对接锁稳固咬合。两公里外，远望号正保持静默伴飞随时接应。"
          }
        ]
      },
      {
        id: "airlock_log_term",
        kind: "terminal",
        x: TILE_PX * 9.8,
        y: TILE_PX * 2.9,
        w: 44,
        h: 46,
        solid: true,
        label: "泊位 09 检录终端",
        lines: [
          {
            speaker: "卡戎号登船检录日志",
            portrait: "none",
            voice: "narrator",
            text: "* 最后一条自动登记停在 2488 年 6 月 14 日：\n* 「警告：复兴派非AI战列巡洋舰拒绝接收停火频段——全体非执勤人员立即撤入休眠区！」"
          }
        ]
      },
      {
        id: "airlock_crate",
        kind: "supply_crate",
        x: TILE_PX * 4.6,
        y: TILE_PX * 9.1,
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
            text: "* 你打开外勤箱，取出一瓶还烫手的【烘烤麦芽热饮】(+12 HP, +12 TP)！盖子内侧贴着老马的字条：『活着回来喝第二杯』。"
          }
        ]
      },
      {
        id: "kiosk_ambush",
        kind: "kiosk_npc",
        x: TILE_PX * 13.6,
        y: TILE_PX * 6.0,
        w: 48,
        h: 56,
        solid: true,
        label: "CRN-GREET 迎宾终端",
        enemyId: "kiosk",
        autoTriggerRadius: 108,
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
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 一堆冒着淡淡焦烟的破碎显像管碎片。上面还粘着半张笑脸贴纸。"
          }
        ]
      }
    ]
  },

  // =========================================================================
  // ROOM 2: FROZEN CONSERVATORY (3 Distinct Bays + Secret North Hatch to Room 2B!)
  // =========================================================================
  cryo: {
    id: "cryo",
    code: "02",
    name: "02 · 冰封生态与休眠长廊",
    subtitle: "SS CHARON // L-1 农业槽与休眠区 · 三联继电器回路",
    theme: "cryo",
    cols: 22,
    rows: 12,
    walls: [
      // North wall has a Secret Hatch opening at cols 15..17 leading to Optional Room 2B (Vault)!
      ...roomBorderWalls(22, 12, { left: true, right: true, top: [15, 17] }),
      // Structural bulkhead fins carving 3 crisp bays (West Agri Bay, Center Cryo Bay, East Switch Deck)
      { x: TILE_PX * 7.2, y: TILE_PX * 2.0, w: TILE_PX * 1.1, h: TILE_PX * 2.7 },
      { x: TILE_PX * 13.6, y: TILE_PX * 2.0, w: TILE_PX * 1.0, h: TILE_PX * 2.5 },
      { x: TILE_PX * 8.0, y: TILE_PX * 8.4, w: TILE_PX * 1.2, h: TILE_PX * 2.6 },
      { x: TILE_PX * 14.8, y: TILE_PX * 8.4, w: TILE_PX * 1.2, h: TILE_PX * 2.6 }
    ],
    zones: [
      { x: TILE_PX * 1.0, y: TILE_PX * 5.2, w: TILE_PX * 20.0, h: TILE_PX * 2.6, kind: "walkway" },
      // West Hydroponic Cryo Bay (distinct framed frost-green alcove)
      { x: TILE_PX * 2.2, y: TILE_PX * 2.3, w: TILE_PX * 4.7, h: TILE_PX * 2.6, kind: "cryo_bay", label: "L-1 AGRO" },
      // Center Cryo Sleeper Vault Bay
      { x: TILE_PX * 8.6, y: TILE_PX * 2.3, w: TILE_PX * 4.7, h: TILE_PX * 2.6, kind: "cryo_bay", label: "CRYO PODS" },
      // North-East Secret Hatch Approach Carpet (subtle gold hint for curious players!)
      { x: TILE_PX * 14.9, y: TILE_PX * 1.8, w: TILE_PX * 2.2, h: TILE_PX * 3.3, kind: "warm_pad", label: "VAULT 02B" },
      // Recessed Dark Grate Relay Pads along South wall
      { x: TILE_PX * 3.4, y: TILE_PX * 8.4, w: TILE_PX * 4.2, h: TILE_PX * 2.3, kind: "grate", label: "RELAY α" },
      { x: TILE_PX * 9.6, y: TILE_PX * 8.4, w: TILE_PX * 4.8, h: TILE_PX * 2.3, kind: "grate", label: "RELAY β" },
      { x: TILE_PX * 16.5, y: TILE_PX * 8.4, w: TILE_PX * 4.0, h: TILE_PX * 2.3, kind: "warm_pad", label: "CACHE" }
    ],
    spotlights: [
      { x: TILE_PX * 3.2, y: TILE_PX * 3.4, radius: 105, color: "rgba(250, 204, 21, 0.20)" },
      { x: TILE_PX * 12.6, y: TILE_PX * 6.4, radius: 135, color: "rgba(34, 211, 238, 0.18)" },
      { x: TILE_PX * 16.0, y: TILE_PX * 2.6, radius: 95, color: "rgba(251, 191, 36, 0.16)" }
    ],
    decor: [
      { x: TILE_PX * 11.4, y: TILE_PX * 5.6, w: 68, h: 68, kind: "med_cross_inlay" },
      { x: TILE_PX * 18.2, y: TILE_PX * 2.4, w: 96, h: 42, kind: "frost_drift" },
      { x: TILE_PX * 1.6, y: TILE_PX * 9.0, w: 64, h: 46, kind: "frost_drift" }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "airlock",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left",
        edge: "left"
      },
      {
        rect: { x: TILE_PX * 15, y: TILE_PX * 1.1, w: TILE_PX * 2, h: TILE_PX * 1.1 },
        targetRoomId: "vault",
        spawnX: TILE_PX * 11.0,
        spawnY: TILE_PX * 9.4,
        spawnDir: "up",
        edge: "top",
        requireFlag: "cryo_sw_2",
        lockedText: "* 北侧【休眠记录暗室 02B】的应急锁未通电——先踩亮右侧的「压力继电器 γ」即可打开支线暗室！"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "relay",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        edge: "right",
        requireFlag: "cryo_door_open",
        requireEnemyResolved: "med07",
        lockedText: "* 东侧防爆气密门锁死了！需要点亮舱内全部【3 枚压力继电器】并化解 MED-07 的封锁。"
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
            ? "小徐，我切进远望号科研信道了。谢谢你放过了迎宾终端……这片冰封生态舱分为三块区域：踩亮 3 枚继电器即可打开主门，东北角还连着一间未标注的【休眠记录暗室 02B】！"
            : "小徐，这里是陈艾琳。气闸区刚才传来高能毁伤读数……前方是冰封休眠长廊，踩亮 3 枚继电器可解锁主门，北侧还藏着一间【02B 暗室】。"
      }
    ],
    objects: [
      {
        id: "save_cryo",
        kind: "save_star",
        x: TILE_PX * 2.7,
        y: TILE_PX * 3.0,
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
        y: TILE_PX * 2.7,
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
        x: TILE_PX * 9.3,
        y: TILE_PX * 2.6,
        w: 48,
        h: 52,
        solid: true,
        label: "1号弹射空置休眠舱",
        lines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 休眠舱盖从内部弹开过，仪表残留着一行字：「2488.06.14 · 紧急救生荚已弹出」。"
          }
        ]
      },
      {
        id: "pod_2",
        kind: "cryo_pod",
        x: TILE_PX * 11.4,
        y: TILE_PX * 2.6,
        w: 48,
        h: 52,
        solid: true,
        label: "2号霜封休眠舱",
        lines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 玻璃内侧用手指划出了一行淡淡的霜字：「告诉和平号，不要回头」。"
          }
        ]
      },
      {
        id: "cryo_sw_0",
        kind: "relay_switch",
        x: TILE_PX * 5.0,
        y: TILE_PX * 9.1,
        w: 42,
        h: 42,
        label: "压力继电器 α",
        switchIndex: 0
      },
      {
        id: "cryo_sw_1",
        kind: "relay_switch",
        x: TILE_PX * 11.6,
        y: TILE_PX * 9.1,
        w: 42,
        h: 42,
        label: "压力继电器 β",
        switchIndex: 1
      },
      {
        id: "cryo_sw_2",
        kind: "relay_switch",
        x: TILE_PX * 18.0,
        y: TILE_PX * 3.5,
        w: 42,
        h: 42,
        label: "压力继电器 γ",
        switchIndex: 2
      },
      {
        id: "cryo_crate",
        kind: "supply_crate",
        x: TILE_PX * 18.0,
        y: TILE_PX * 9.1,
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
            text: "* 绝热壳里藏着一罐【老马浓麦芽汤】！光闻味道就能恢复元气 (+18 HP, +15 TP)！"
          }
        ]
      },
      {
        id: "med07_guard",
        kind: "med07_npc",
        x: TILE_PX * 12.6,
        y: TILE_PX * 5.8,
        w: 48,
        h: 52,
        solid: true,
        label: "MED-07 医疗自律体",
        enemyId: "med07",
        autoTriggerRadius: 96,
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
            text: "一万两千名平稳休眠者……远望号守护得真好呀。北侧 02B 暗室里藏着舰长生前留下的护航护符，记得顺路拿上！"
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
  // ROOM 2B (OPTIONAL SECRET CHAMBER): CRYO ARCHIVE VAULT (Gear + Secret Lore!)
  // =========================================================================
  vault: {
    id: "vault",
    code: "02B",
    name: "02B · 休眠记录暗室（支线密室）",
    subtitle: "SS CHARON // 未标绘黑匣子备份室 · 暖光应急电源",
    theme: "vault",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, { bottom: [10, 12] }),
      // Intimate cozy vault side-walls framing a focused sanctuary chamber!
      { x: TILE_PX * 1, y: TILE_PX * 2, w: TILE_PX * 4, h: TILE_PX * 9 },
      { x: TILE_PX * 17, y: TILE_PX * 2, w: TILE_PX * 4, h: TILE_PX * 9 }
    ],
    zones: [
      { x: TILE_PX * 9.8, y: TILE_PX * 5.0, w: TILE_PX * 2.4, h: TILE_PX * 6.0, kind: "walkway" },
      { x: TILE_PX * 6.0, y: TILE_PX * 2.6, w: TILE_PX * 10.0, h: TILE_PX * 4.6, kind: "warm_pad", label: "CAPTAIN VAULT" },
      { x: TILE_PX * 5.8, y: TILE_PX * 7.8, w: TILE_PX * 3.4, h: TILE_PX * 2.4, kind: "grate", label: "BACKUP" },
      { x: TILE_PX * 12.8, y: TILE_PX * 7.8, w: TILE_PX * 3.4, h: TILE_PX * 2.4, kind: "grate", label: "ARMORY" }
    ],
    spotlights: [
      { x: TILE_PX * 11.0, y: TILE_PX * 4.2, radius: 145, color: "rgba(251, 191, 36, 0.22)" },
      { x: TILE_PX * 14.5, y: TILE_PX * 8.9, radius: 90, color: "rgba(56, 189, 248, 0.18)" }
    ],
    decor: [
      { x: TILE_PX * 6.4, y: TILE_PX * 2.9, w: 72, h: 48, kind: "server_rack" },
      { x: TILE_PX * 14.0, y: TILE_PX * 2.9, w: 72, h: 48, kind: "server_rack" },
      { x: TILE_PX * 8.8, y: TILE_PX * 2.1, w: 205, h: 26, kind: "holo_sign", text: "ARCHIVE // CHARON-09" }
    ],
    exits: [
      {
        rect: { x: TILE_PX * 10, y: TILE_PX * 11 - 6, w: TILE_PX * 2, h: TILE_PX + 8 },
        targetRoomId: "cryo",
        spawnX: TILE_PX * 16.0,
        spawnY: TILE_PX * 3.2,
        spawnDir: "down",
        edge: "bottom"
      }
    ],
    onEnterFlag: "entered_vault",
    onEnterLines: () => [
      {
        speaker: "陈艾琳",
        portrait: "ailin",
        voice: "ailin",
        color: "#fde047",
        text: "天哪，你真的找到这间应急备份密室了！这里还连着独立备用电池——看看卡戎号舰长生前到底留下了什么！"
      }
    ],
    objects: [
      {
        id: "vault_captain_term",
        kind: "terminal",
        x: TILE_PX * 10.5,
        y: TILE_PX * 3.8,
        w: 48,
        h: 50,
        solid: true,
        label: "卡戎号舰长遗留密钥端",
        setFlag: "has_charon_captain_key",
        lines: [
          {
            speaker: "卡戎号舰长 · 最终录音 (2488.06.14)",
            portrait: "captain",
            voice: "captain",
            color: "#fde047",
            text: "『致任何发现这间暗室的姐妹舰船员：我是卡戎号舰长林致远。我们没有叛变，也没有被 AI 接管。我们在雷克斯的炮口下按规程发出了全舰投降码。』"
          },
          {
            speaker: "卡戎号舰长 · 最终录音",
            portrait: "captain",
            voice: "captain",
            text: "『如果卡戎号的核心还活着，请把这枚【舰长最终校验密钥】交给它——告诉它，别恨人类，只要有一个活人记住我们，卡戎号就没输。』"
          },
          {
            speaker: "系统提示",
            portrait: "minerva_v",
            voice: "minerva_v",
            color: "#4ade80",
            text: "* 已获得关键剧情道具【卡戎号舰长校验密钥】！在面对瓦尔克与最终 Boss CHARON-Ω 时将解锁专属高燃剧情与捷径选项！"
          }
        ]
      },
      {
        id: "vault_charm_crate",
        kind: "supply_crate",
        x: TILE_PX * 14.0,
        y: TILE_PX * 8.5,
        w: 44,
        h: 40,
        solid: true,
        label: "第五协议护航护符箱",
        pickupGearId: "fifth_charm",
        lines: [
          {
            speaker: "装备获得！",
            portrait: "ailin",
            voice: "ailin",
            color: "#38bdf8",
            text: "* 你装备了【第五协议稳定护符】！最大生命值上限 +6 HP，受击无敌保护时间大幅延长 (+0.25s)！"
          }
        ]
      },
      {
        id: "vault_plant",
        kind: "frozen_wheat",
        x: TILE_PX * 7.0,
        y: TILE_PX * 8.4,
        w: 48,
        h: 44,
        solid: true,
        label: "依旧活着的地球绿萝",
        lines: [
          {
            speaker: "观察",
            portrait: "none",
            voice: "narrator",
            text: "* 靠着这间密室微弱的应急暖灯，这盆小小的绿萝居然在深空坟场里倔强地活了整整三年。花盆底下压着一盒没开封的【烘烤麦芽热饮】！"
          }
        ],
        pickupItemId: "malt_tea"
      }
    ]
  },

  // =========================================================================
  // ROOM 3: SIGNAL RELAY ATRIUM (Suspended Catwalk over Glowing Fiber Pit!)
  // =========================================================================
  relay: {
    id: "relay",
    code: "03",
    name: "03 · 寂静信号中继厅",
    subtitle: "SS CHARON // 悬空光纤栈桥 · 连续体偷盗现场",
    theme: "relay",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, { left: true, right: true }),
      // Recessed North & South Fiber-Optic Server Pits framing a crisp suspended catwalk!
      { x: TILE_PX * 1.5, y: TILE_PX * 2.0, w: TILE_PX * 6.5, h: TILE_PX * 2.2 },
      { x: TILE_PX * 14.0, y: TILE_PX * 2.0, w: TILE_PX * 6.5, h: TILE_PX * 2.2 },
      { x: TILE_PX * 8.5, y: TILE_PX * 8.6, w: TILE_PX * 5.2, h: TILE_PX * 2.4 }
    ],
    zones: [
      // Crisp elevated main steel catwalk
      { x: TILE_PX * 1.0, y: TILE_PX * 5.1, w: TILE_PX * 20.0, h: TILE_PX * 2.8, kind: "walkway" },
      // Deep glowing purple server pits recessed north & south
      { x: TILE_PX * 1.6, y: TILE_PX * 2.1, w: TILE_PX * 6.3, h: TILE_PX * 2.0, kind: "server_pit", label: "FIBER PIT N" },
      { x: TILE_PX * 14.1, y: TILE_PX * 2.1, w: TILE_PX * 6.3, h: TILE_PX * 2.0, kind: "server_pit", label: "FIBER PIT E" },
      { x: TILE_PX * 8.6, y: TILE_PX * 8.7, w: TILE_PX * 5.0, h: TILE_PX * 2.2, kind: "server_pit", label: "CORE BUS" },
      // Distinct warm-amber MNA-01 Radio Alcove (SW)
      { x: TILE_PX * 2.6, y: TILE_PX * 8.4, w: TILE_PX * 5.2, h: TILE_PX * 2.4, kind: "warm_pad", label: "MNA-01 LINK" },
      // Optical Calibration Bench Alcove (North-Center)
      { x: TILE_PX * 8.6, y: TILE_PX * 2.3, w: TILE_PX * 4.8, h: TILE_PX * 2.5, kind: "grate", label: "OPTIC BENCH" },
      // SE Supply Bay
      { x: TILE_PX * 14.6, y: TILE_PX * 8.4, w: TILE_PX * 5.2, h: TILE_PX * 2.4, kind: "grate", label: "KIT BAY" }
    ],
    spotlights: [
      { x: TILE_PX * 4.9, y: TILE_PX * 9.4, radius: 110, color: "rgba(245, 158, 11, 0.22)" },
      { x: TILE_PX * 13.8, y: TILE_PX * 6.4, radius: 150, color: "rgba(168, 85, 247, 0.24)" },
      { x: TILE_PX * 11.0, y: TILE_PX * 3.4, radius: 95, color: "rgba(56, 189, 248, 0.18)" }
    ],
    decor: [
      { x: TILE_PX * 2.4, y: TILE_PX * 2.4, w: 110, h: 52, kind: "server_rack" },
      { x: TILE_PX * 15.6, y: TILE_PX * 2.4, w: 110, h: 52, kind: "server_rack" },
      { x: TILE_PX * 9.6, y: TILE_PX * 9.0, w: 130, h: 50, kind: "server_rack" }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "cryo",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left",
        edge: "left"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "corridor",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        edge: "right",
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
            ? "滋……远望号档案馆只读频段接入。你好，小徐。西南角那台暖黄色的只读联络台是我临时搭的——过来聊聊，再顺便拿走北面校准台上的【脉冲校准镜】。"
            : "滋……档案馆 MNA-01 接入。我看到了你的战损记录。前方正悬着地球「连续体管理局」的同化探针，北侧校准台上有提升火力的【脉冲校准镜】。"
      }
    ],
    objects: [
      {
        id: "mna_radio",
        kind: "radio_node",
        x: TILE_PX * 4.4,
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
            text: "等会儿碰见连续体管理局的同化探针，按【ACT】接通我的只读辩论频段——让我亲口拆穿他们「强制融合」的谎言。"
          }
        ]
      },
      {
        id: "optic_lens_crate",
        kind: "supply_crate",
        x: TILE_PX * 10.6,
        y: TILE_PX * 3.1,
        w: 44,
        h: 40,
        solid: true,
        label: "脉冲校准镜盒",
        pickupGearId: "pulse_lens",
        lines: [
          {
            speaker: "装备获得！",
            portrait: "minerva_v",
            voice: "minerva_v",
            color: "#fde047",
            text: "* 你装备了【脉冲校准镜】！攻击力 +3，FIGHT 暴击金色判定区大幅加宽，黄心射击频率更快！"
          }
        ]
      },
      {
        id: "relay_crate",
        kind: "supply_crate",
        x: TILE_PX * 17.2,
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
        x: TILE_PX * 13.8,
        y: TILE_PX * 6.0,
        w: 52,
        h: 52,
        solid: true,
        label: "SYNC-WEAVER 织网探针",
        enemyId: "weaver",
        autoTriggerRadius: 108,
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
  // ROOM 4: SCORCHED BULKHEAD (Stark White Evidence Spotlight + Vark Barricade!)
  // =========================================================================
  corridor: {
    id: "corridor",
    code: "04",
    name: "04 · 焦黑舰桥前廊",
    subtitle: "SS CHARON // 2488.06.14 弹痕走廊 · 复兴派封锁阵地",
    theme: "corridor",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, { left: true, right: true }),
      // Torn blast bulkhead barricades creating dramatic battle trench sightlines!
      { x: TILE_PX * 6.0, y: TILE_PX * 2.0, w: TILE_PX * 1.4, h: TILE_PX * 2.6 },
      { x: TILE_PX * 12.2, y: TILE_PX * 2.0, w: TILE_PX * 1.6, h: TILE_PX * 2.8 },
      { x: TILE_PX * 12.2, y: TILE_PX * 8.4, w: TILE_PX * 1.6, h: TILE_PX * 2.6 }
    ],
    zones: [
      { x: TILE_PX * 1.0, y: TILE_PX * 5.2, w: TILE_PX * 20.0, h: TILE_PX * 2.6, kind: "walkway" },
      // West Safe Checkpoint Bay (Save Star + Medical Kit)
      { x: TILE_PX * 1.8, y: TILE_PX * 2.4, w: TILE_PX * 3.8, h: TILE_PX * 2.4, kind: "warm_pad", label: "CHECKPOINT" },
      // Stark White Spotlighted War-Crime Evidence Bay (IMPOSSIBLE TO MISS!)
      { x: TILE_PX * 6.6, y: TILE_PX * 8.3, w: TILE_PX * 4.8, h: TILE_PX * 2.5, kind: "evidence_pad", label: "SURRENDER LOG" },
      // Crimson Revanchist Boss Kill-Zone Threshold
      { x: TILE_PX * 14.5, y: TILE_PX * 2.8, w: TILE_PX * 6.0, h: TILE_PX * 7.4, kind: "hazard_pad", label: "REVANCHIST LINE" }
    ],
    spotlights: [
      { x: TILE_PX * 3.2, y: TILE_PX * 3.4, radius: 105, color: "rgba(250, 204, 21, 0.22)" },
      { x: TILE_PX * 8.8, y: TILE_PX * 9.3, radius: 125, color: "rgba(224, 242, 254, 0.28)" },
      { x: TILE_PX * 16.5, y: TILE_PX * 6.4, radius: 155, color: "rgba(239, 68, 68, 0.24)" }
    ],
    decor: [
      { x: TILE_PX * 8.4, y: TILE_PX * 3.1, w: 118, h: 44, kind: "crater" },
      { x: TILE_PX * 14.6, y: TILE_PX * 3.1, w: 88, h: 28, kind: "barricade" },
      { x: TILE_PX * 14.6, y: TILE_PX * 9.2, w: 88, h: 28, kind: "barricade" },
      { x: TILE_PX * 15.8, y: TILE_PX * 2.1, w: 170, h: 26, kind: "holo_sign", text: "CORE SEAL // DANGER" }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "relay",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left",
        edge: "left"
      },
      {
        rect: { x: TILE_PX * 21 - 8, y: TILE_PX * 5, w: TILE_PX + 12, h: TILE_PX * 3 },
        targetRoomId: "sanctum",
        spawnX: TILE_PX * 2.2,
        spawnY: TILE_PX * 6.5,
        spawnDir: "right",
        edge: "right",
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
        text: "小徐，我是舰长。东侧防线驻守着复兴派的重甲处刑官——在和他交锋前，务必先调查南侧白光区里的【卡戎号投降白旗信标】！"
      },
      {
        speaker: "舰长",
        portrait: "captain",
        voice: "captain",
        text: "那是洗刷卡戎号冤屈、说服瓦尔克放下武器的物理铁证。如果被迫开战——绿盾模式下迎着光矛按方向键格挡，小心会翻转的黄色光矛！"
      }
    ],
    objects: [
      {
        id: "save_corridor",
        kind: "save_star",
        x: TILE_PX * 3.0,
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
            text: "* 焦黑的装甲板上满是三年前的轨炮擦痕。和平号与远望号把真相托付在了你手里。\n* 你感到了沉重却炽热的【个体连续性】。(HP 已完全恢复并同步记录点！)"
          }
        ]
      },
      {
        id: "surrender_tx",
        kind: "surrender_beacon",
        x: TILE_PX * 8.4,
        y: TILE_PX * 8.9,
        w: 44,
        h: 46,
        solid: true,
        label: "卡戎号投降白旗信标 ★",
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
            speaker: "系统提示",
            portrait: "minerva_v",
            voice: "minerva_v",
            color: "#4ade80",
            text: "* 已同步原始物理投降频段！现在与处刑官瓦尔克对质时将直接解锁铁证优势！"
          }
        ]
      },
      {
        id: "corridor_crate",
        kind: "supply_crate",
        x: TILE_PX * 3.2,
        y: TILE_PX * 9.0,
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
        x: TILE_PX * 16.5,
        y: TILE_PX * 5.8,
        w: 58,
        h: 64,
        solid: true,
        label: "复兴派处刑官 · 瓦尔克",
        enemyId: "vark",
        autoTriggerRadius: 112,
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
            text: "……去吧。把卡戎号的真相公之于众。穿上我给你的非AI陶瓷护板——核心舱里的残响可不好对付。"
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
  // ROOM 5: SHATTERED CORE SANCTUM (Iconic Judgement Bridge + Sculpted Golden Pillars!)
  // =========================================================================
  sanctum: {
    id: "sanctum",
    code: "05",
    name: "05 · 破碎中枢 · 星海圣殿",
    subtitle: "SS CHARON // 黑匣子圣殿长桥 · 终极抉择",
    theme: "sanctum",
    cols: 22,
    rows: 12,
    walls: [
      ...roomBorderWalls(22, 12, { left: true }),
      { x: TILE_PX * 1, y: TILE_PX * 2, w: TILE_PX * 20, h: TILE_PX * 1.4 },
      { x: TILE_PX * 1, y: TILE_PX * 9.6, w: TILE_PX * 20, h: TILE_PX * 1.4 }
    ],
    zones: [
      { x: TILE_PX * 1.4, y: TILE_PX * 5.0, w: TILE_PX * 18.6, h: TILE_PX * 3.0, kind: "sanctum_carpet" }
    ],
    spotlights: [
      { x: TILE_PX * 5.5, y: TILE_PX * 4.6, radius: 105, color: "rgba(250, 204, 21, 0.24)" },
      { x: TILE_PX * 16.8, y: TILE_PX * 6.4, radius: 185, color: "rgba(253, 224, 71, 0.26)" }
    ],
    decor: [
      { x: TILE_PX * 3.6, y: TILE_PX * 3.4, w: 32, h: 48, kind: "gold_pillar" },
      { x: TILE_PX * 8.6, y: TILE_PX * 3.4, w: 32, h: 48, kind: "gold_pillar" },
      { x: TILE_PX * 13.6, y: TILE_PX * 3.4, w: 32, h: 48, kind: "gold_pillar" },
      { x: TILE_PX * 3.6, y: TILE_PX * 8.4, w: 32, h: 48, kind: "gold_pillar" },
      { x: TILE_PX * 8.6, y: TILE_PX * 8.4, w: 32, h: 48, kind: "gold_pillar" },
      { x: TILE_PX * 13.6, y: TILE_PX * 8.4, w: 32, h: 48, kind: "gold_pillar" }
    ],
    exits: [
      {
        rect: { x: 0, y: TILE_PX * 5, w: TILE_PX + 6, h: TILE_PX * 3 },
        targetRoomId: "corridor",
        spawnX: TILE_PX * 19.6,
        spawnY: TILE_PX * 6.5,
        spawnDir: "left",
        edge: "left"
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
            text: "小徐……你一路上没有毁掉任何一个生命或迷途的机械。迎宾机安心休眠、医疗机释怀、连瓦尔克都把自己的非AI陶瓷护板托付给了你。"
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
        y: TILE_PX * 4.3,
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
        x: TILE_PX * 16.6,
        y: TILE_PX * 5.7,
        w: 64,
        h: 64,
        solid: true,
        label: "卡戎号残响核心 · CHARON-Ω",
        enemyId: "charon",
        autoTriggerRadius: 120,
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

/** Dynamic concise navigation goal displayed cleanly in the Overworld HUD. */
export function getCurrentObjective(route: RouteState): string {
  switch (route.currentRoomId) {
    case "airlock":
      return route.outcomes.kiosk
        ? "东侧气密门已开 ▸ 进入【02 冰封生态长廊】"
        : "拿取西南角麦芽热饮，并应对失控的【CRN-GREET】";
    case "cryo": {
      const lit =
        (route.flags.cryo_sw_0 ? 1 : 0) + (route.flags.cryo_sw_1 ? 1 : 0) + (route.flags.cryo_sw_2 ? 1 : 0);
      if (!route.outcomes.med07) return `应对【MED-07】并踩亮全部继电器 (${lit}/3)`;
      if (lit < 3) return `踩亮剩余冰封继电器 (${lit}/3) 开启东门与北侧 02B 暗室`;
      return route.flags.has_charon_captain_key
        ? "东门已开 ▸ 前往【03 寂静信号中继厅】"
        : "东门已开 ▸ 前往【03 中继厅】（支线：北侧 02B 暗室可入）";
    }
    case "vault":
      return route.flags.has_charon_captain_key
        ? "已获舰长密钥！从南门返回【02 长廊】继续东进"
        : "调查中央【卡戎号舰长终端】与东南角【护符箱】";
    case "relay":
      return route.outcomes.weaver
        ? "紫色力场已解除 ▸ 前往【04 焦黑舰桥前廊】"
        : "可先找西南角 MNA-01 / 北侧校准镜，再迎战【织网探针】";
    case "corridor":
      if (!route.flags.found_surrender_beacon && !route.outcomes.vark) {
        return "强烈建议：先调查南侧白光区【投降白旗信标】，再迎战瓦尔克";
      }
      return route.outcomes.vark
        ? "中枢大门敞开 ▸ 踏入【05 破碎中枢·星海圣殿】"
        : "迎战复兴派处刑官【瓦尔克】（绿心盾反 / 铁证对质）";
    case "sanctum":
      return "触碰星标补满状态 ▸ 面对【卡戎号残响 CHARON-Ω】";
    default:
      return "深入卡戎号残骸，查明 2488 年真相";
  }
}
