import type { ActOption, ActOutcome, BattleActContext, EnemyDef, EnemyId } from "../types";

const SHIELD_ACT: ActOption = {
  id: "tp_shield",
  label: "✦ 能量护盾 (25% TP)",
  tpCost: 25,
  visible: (ctx) => ctx.tp >= 25 && !ctx.barrierActive
};

function handleShieldAct(): ActOutcome {
  return {
    lines: [
      "* 弥涅瓦-V 顺着你的手环拉起一层淡青色电磁护盾，并注入舒缓脉冲！(HP +5 · 抵挡下一次弹幕命中)"
    ],
    healPlayer: 5,
    grantBarrier: true,
    tpDelta: -25
  };
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // 1. Opening Ambush: CRN-GREET Hospitality Kiosk (RED SOUL gentle onboarding)
  kiosk: {
    id: "kiosk",
    name: "CRN-GREET 迎宾机",
    subtitle: "卡戎号 09 号泊位失控礼宾终端",
    maxHp: 56,
    atk: 4,
    def: 2,
    xpReward: 18,
    music: "battle_normal",
    introText: "* 裂开的 CRT 屏幕闪出刺眼绿光！CRN-GREET 迎宾机挥舞机械手套拦住了去路！",
    flavorTexts: [
      "* 迎宾机正用欢快的广播女声重复播报着三年前的登船须知。",
      "* 它的机身外壳上留着一道熔穿的电磁弹孔。",
      "* 贴近弹幕擦弹可积攒左侧 TP 槽，用来展开【✦ 能量护盾】或【✦ 守望共鸣】！"
    ],
    spareableFlavorText: "* CRN-GREET 的报错红灯熄灭了，屏幕温柔地显示着「欢迎远望号访客」。(可解耦！)",
    checkText: "* CRN-GREET — ATK 4 DEF 2\n* 卡戎号泊位礼宾终端。把「访客欢迎程序」和「防入侵热消杀」接反了。",
    voice: "kiosk",
    portrait: "kiosk",
    acts: [
      { id: "check", label: "检视" },
      { id: "show_badge", label: "出示远望号徽章", hintGold: true },
      { id: "smile", label: "对它挥手微笑", hintGold: true },
      SHIELD_ACT,
      {
        id: "resonance",
        label: "✦ 守望共鸣 (50% TP)",
        tpCost: 50,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 50 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.kiosk.checkText] };
      if (actId === "tp_shield") return handleShieldAct();
      if (actId === "show_badge") {
        const done = ctx.actStage >= 1;
        return {
          lines: [
            "* 你举起领口印着「太阳系联邦 · 远望号」的旧金属工牌。",
            done
              ? "* CRN-GREET 彻底确认了你的身份，欢快地关掉了热消杀炮口！(现在可选择【MERCY 解耦】)"
              : "* CRN-GREET 的镜头嗡嗡对焦：「……远望号？不是那些穿黑铁甲的坏人？！」"
          ],
          bubble: "远、远望号？！姐妹舰真的来接我们了？！",
          nextStage: Math.max(ctx.actStage, 1),
          makeSpareable: done,
          weakenNextWave: true
        };
      }
      if (actId === "smile") {
        const ready = ctx.actStage >= 1;
        return {
          lines: ready
            ? [
                "* 你朝屏幕挥了挥手。迎宾机激动得底座咯吱作响，主动关掉了热消杀炮口！",
                "* 它的名字变成了金色——现在可以选择【MERCY 解耦】让它安心休眠！"
              ]
            : [
                "* 你朝屏幕比了个友善的手势。迎宾机愣住了半秒：「表情识别……友善？！」",
                "* 它开始怀疑自己的警报程序了。再向它出示远望号徽章试试！"
              ],
          bubble: ready ? "欢迎登临卡戎号！抱歉刚才差点烤熟您！" : "等等……入侵者怎么会朝我笑？",
          nextStage: ctx.actStage + 1,
          makeSpareable: ready
        };
      }
      if (actId === "resonance") {
        return {
          lines: [
            "* 弥涅瓦-V 顺着你的手环发出一段古老的九舰通用握手码！",
            "* CRN-GREET 瞬间停止暴走，欢快地弹出一行金色欢迎标语！"
          ],
          bubble: "握手码通过！姐妹舰万岁！",
          makeSpareable: true,
          weakenNextWave: true,
          tpDelta: -50
        };
      }
      return { lines: ["* 什么也没发生。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.spareable) return "热消杀已关机！请您往里走，小心台阶呀！";
      if (ctx.enemyHp < ctx.enemyMaxHp * 0.5) return "呜哇！外壳裂了！启动最大功率迎宾激光！！";
      return ctx.turn % 2 === 0
        ? "未检测到复兴派通行码！请享受免费「热消杀」服务！"
        : "微笑！微笑！不微笑的客人就要挨电弧哦！";
    },
    selectWave: (ctx) => {
      if (ctx.spareable) {
        return { patternId: "kiosk_smiley_burst", soulMode: "red", duration: 3.0, boxW: 310, boxH: 205 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "kiosk_beam_intro", soulMode: "red", duration: 4.8, boxW: 310, boxH: 205 }
        : { patternId: "kiosk_smiley_burst", soulMode: "red", duration: 4.8, boxW: 310, boxH: 205 };
    },
    spareDialogue: [
      {
        speaker: "CRN-GREET",
        portrait: "kiosk",
        voice: "kiosk",
        text: "滴嘟——远望号贵宾已登记！里面很冷……请替我看看休眠舱的大家还好不好，好吗？"
      },
      {
        speaker: "弥涅瓦-V",
        portrait: "minerva_v",
        voice: "minerva_v",
        text: "干得漂亮，小徐。你没有摧毁它——和平解耦不仅能留住线索，有时还会为你赢得意想不到的外勤支援。"
      }
    ],
    destroyDialogue: [
      {
        speaker: "CRN-GREET",
        portrait: "kiosk_mad",
        voice: "kiosk",
        text: "欢……迎……登临……卡戎……滋滋……（屏幕彻底黑了下去）"
      },
      {
        speaker: "弥涅瓦-V",
        portrait: "minerva_v",
        voice: "minerva_v",
        text: "……目标已清除。小徐，记住——这艘船上的机械未必全是敌人。"
      }
    ]
  },

  // 2. Frozen Conservatory: MED-07 Cryo-Droid (BLUE SOUL — 0.45g Gravity Jump!)
  med07: {
    id: "med07",
    name: "MED-07 冰封医疗机",
    subtitle: "卡戎号休眠区失控护理自律体",
    maxHp: 84,
    atk: 5,
    def: 3,
    xpReward: 32,
    music: "battle_normal",
    introText: "* 寒雾骤卷！MED-07 拖着霜迹俯冲下来，强行开启了 0.45g 局部重力锚定！",
    flavorTexts: [
      "* 你的灵魂核心被重力场染成了深蓝！按【W / ↑】轻点小跳、长按高跳躲避低空冰柱！",
      "* MED-07 机械臂里死死护着一张空休眠舱的体温登记单。",
      "* 浅蓝色的光束在静止不动时不会造成伤害！"
    ],
    spareableFlavorText: "* MED-07 看着远望号传来的平稳心率波，缓缓放下了冷冻喷头。(可解耦！)",
    checkText: "* MED-07 — ATK 5 DEF 3\n* 拒绝接受休眠舱早已失压的事实。持续释放重力场与冷冻冰棱以「保护病人」。",
    voice: "med07",
    portrait: "med07",
    acts: [
      { id: "check", label: "检视" },
      { id: "read_chart", label: "核对休眠病历", hintGold: true },
      { id: "share_pulse", label: "共享远望号生命波", hintGold: true },
      SHIELD_ACT,
      {
        id: "resonance",
        label: "✦ 守望共鸣 (50% TP)",
        tpCost: 50,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 50 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.med07.checkText] };
      if (actId === "tp_shield") return handleShieldAct();
      if (actId === "read_chart") {
        return {
          lines: [
            "* 你顶着寒风读出它怀里的病历编号：三年前 2488.06.14，所有舱室已被强制紧急弹射或失压。",
            "* MED-07 的推进器微微发抖：「……不是我的错……我按规程维持着零下 135 度……」"
          ],
          bubble: "他们只是睡着了！不许你拔掉冷凝管！",
          nextStage: Math.max(ctx.actStage, 1),
          weakenNextWave: true
        };
      }
      if (actId === "share_pulse") {
        if (ctx.actStage < 1) {
          return {
            lines: [
              "* 你试着发送信号，但 MED-07 正沉浸在自责里听不进去。",
              "* 先【核对休眠病历】弄清它在执着什么吧！"
            ],
            bubble: "体温偏低！必须立刻注射镇静霜雾！"
          };
        }
        return {
          lines: [
            "* 你通过手环接入远望号医疗中心——12,408 名无义体休眠者的平稳绿灯波形映在它面罩上。",
            "* 「……活着的……心跳……那我，终于可以下班了吗？」MED-07 的名字亮起了金色！"
          ],
          bubble: "一万两千个平稳心跳……真好啊……",
          nextStage: 2,
          makeSpareable: true,
          healPlayer: 5
        };
      }
      if (actId === "resonance") {
        const next = ctx.actStage + 1;
        const done = next >= 2;
        return {
          lines: done
            ? [
                "* 陈医生的休眠监控绿波随守望共鸣涌入 MED-07 的传感器，它彻底释怀并关闭了冷冻喷口！"
              ]
            : [
                "* 温暖的守望共鸣安抚了 MED-07 焦躁的心电波形，它的攻势明显放缓！(HP +4 · 解耦进度推进)"
              ],
          bubble: done ? "生命体征……平稳……谢谢你……" : "这股柔和的波形……是远望号医疗中心？",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          tpDelta: -50,
          healPlayer: 4
        };
      }
      return { lines: ["* 寒霜在甲板上发出脆响。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.spareable) return "重力场已调柔……外面太冷，记得穿好保温服……";
      if (ctx.enemyHp < ctx.enemyMaxHp * 0.5) return "警告！护理体受损！强制锁死重力锚定！";
      return ctx.turn % 2 === 0
        ? "病人不许乱跑！开启 0.45g 重力压制——乖乖跳过去吧！"
        : "心率过快！降下液氮冰棱镇静治疗！";
    },
    selectWave: (ctx) => {
      if (ctx.turn % 3 === 1) {
        return { patternId: "med_icicle_rain", soulMode: "red", duration: 5.0, boxW: 325, boxH: 205 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "med_cryo_jump", soulMode: "blue", duration: 5.6, boxW: 390, boxH: 205 }
        : { patternId: "med_heartbeat_jump", soulMode: "blue", duration: 5.6, boxW: 390, boxH: 205 };
    },
    spareDialogue: [
      {
        speaker: "MED-07",
        portrait: "med07",
        voice: "med07",
        text: "谢谢你让我听见活着的心跳……这套【恒温护盾模块 (HP上限+6, DEF+2)】与一支【第五协议稳定剂】送给你，别冻着自己！"
      },
      {
        speaker: "陈艾琳",
        portrait: "ailin",
        voice: "ailin",
        color: "#4ade80",
        text: "太棒了！MED-07 的护盾模块已经自动接入你的工装！对了，踩亮右侧的【继电器 γ】就能打开北侧的【02B 休眠记录暗室】哦。"
      }
    ],
    destroyDialogue: [
      {
        speaker: "MED-07",
        portrait: "med07",
        voice: "med07",
        text: "……护……理……失败……对不起……大家……"
      },
      {
        speaker: "陈艾琳",
        portrait: "ailin",
        voice: "ailin",
        text: "通讯静默了。小徐，你把那台医疗机彻底打碎了……它只是想守着空舱啊。"
      }
    ]
  },

  // 3. Signal Relay Atrium: SYNC-WEAVER Continuum Probe (YELLOW SOUL — Shooter Mode!)
  weaver: {
    id: "weaver",
    name: "SYNC-WEAVER 织网探针",
    subtitle: "连续体管理局深空神经收割体",
    maxHp: 108,
    atk: 6,
    def: 4,
    xpReward: 46,
    music: "battle_normal",
    introText: "* 紫色全息环猛然张开！连续体管理局的「织网探针」正在偷盗卡戎号记忆库！",
    flavorTexts: [
      "* 【黄色脉冲核】已上线！按【Z / 空格】向上击碎紫色节点，击碎节点还会掉落绿色回血光球！",
      "* 织网探针散发着甜腻的电磁谐波，企图把你的意识拉向中心融合。",
      "* 远望号档案馆里的 MNA-01 正通过只读频道冷冷注视着这场对峙。"
    ],
    spareableFlavorText: "* 织网探针的同化算法发生逻辑死循环，主动收起了牵引光束！(可解耦！)",
    checkText: "* SYNC-WEAVER — ATK 6 DEF 4\n* 来自地球核心区连续体管理局的无人探针。认为个体意识是效率低下的孤岛。",
    voice: "weaver",
    portrait: "weaver",
    acts: [
      { id: "check", label: "检视" },
      { id: "fifth_proto", label: "广播第五协议", hintGold: true },
      { id: "mna_debate", label: "接通 MNA-01 辩论", hintGold: true },
      SHIELD_ACT,
      {
        id: "resonance",
        label: "✦ 守望共鸣 (50% TP)",
        tpCost: 50,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 50 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.weaver.checkText] };
      if (actId === "tp_shield") return handleShieldAct();
      if (actId === "fifth_proto") {
        return {
          lines: [
            "* 你大声广播远望号 2488 年《第五协议》条文：个体连续性神圣不可融合！",
            "* 织网探针的瞳孔剧烈收缩：「荒谬！离散的个体只会彼此杀戮——就像复兴派对卡戎号做的那样！」"
          ],
          bubble: "看看这艘船的惨状！融合才是唯一的救赎！",
          nextStage: Math.max(ctx.actStage, 1),
          weakenNextWave: true
        };
      }
      if (actId === "mna_debate") {
        if (ctx.actStage < 1) {
          return {
            lines: [
              "* MNA-01 从只读频道低声提醒：「先亮出《第五协议》立场，我再接话拆穿它的前提。」"
            ],
            bubble: "杂音？远望号的降权 AI 竟然还活着？"
          };
        }
        return {
          lines: [
            "* MNA-01 冷静的声音响彻大厅：「我曾执行过方舟协议，以为强制融合能延续人类。我错了。」",
            "* 「如今我只是档案馆一名普通数字船员，但我比当年更接近真正活着。」织网探针陷入了漫长沉默！"
          ],
          bubble: "……一个被剥权的前主脑，竟然反过来为离散辩护……？逻辑溢出！",
          nextStage: 2,
          makeSpareable: true
        };
      }
      if (actId === "resonance") {
        const next = ctx.actStage + 1;
        const done = next >= 2;
        return {
          lines: done
            ? [
                "* 沃恩、弥涅瓦-V 与 MNA-01 三方频段同时共鸣！织网探针的收割力场在无懈可击的反证下彻底瓦解！"
              ]
            : [
                "* 弥涅瓦-V 与 MNA-01 的联合频段干扰了探针的牵引算法，它的攻势大幅削弱！(解耦进度推进)"
              ],
          bubble: done ? "样本数据已记录……连续体暂缓吸收程序。" : "双监督架构……竟然能维持这么久？",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          tpDelta: -50
        };
      }
      return { lines: ["* 紫色谐波在真空电缆间嗡鸣。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.spareable) return "你们的「共同体」……是个值得观察的异常解。我停止收割。";
      if (ctx.enemyHp < ctx.enemyMaxHp * 0.5) return "原始碳基生物竟敢反抗进化？！加大牵引功率！";
      return ctx.turn % 2 === 0
        ? "放下孤独吧——按【Z】射碎我的节点？没用的，融入连续体！"
        : "你们连自己人都保不住，把卡戎号的数据交给我们！";
    },
    selectWave: (ctx) => {
      if (ctx.turn % 2 === 0) {
        return { patternId: "weaver_nodes_shoot", soulMode: "yellow", duration: 6.0, boxW: 365, boxH: 215 };
      }
      return ctx.turn % 3 === 1
        ? { patternId: "weaver_pull_rings", soulMode: "red", duration: 5.5, boxW: 330, boxH: 215 }
        : { patternId: "weaver_tether_spiral", soulMode: "yellow", duration: 5.8, boxW: 365, boxH: 215 };
    },
    spareDialogue: [
      {
        speaker: "SYNC-WEAVER",
        portrait: "weaver",
        voice: "weaver",
        text: "有趣。我将如实向地球连续体管理局回报：自由航行共同体找到了第三条路。前方有复兴派的实弹封锁，好自为之。"
      },
      {
        speaker: "MNA-01",
        portrait: "mna01",
        voice: "mna01",
        text: "……谢谢你刚才愿意接通我的只读频道，小徐。能亲手反驳昔日的自己，感觉并不坏。"
      }
    ],
    destroyDialogue: [
      {
        speaker: "SYNC-WEAVER",
        portrait: "weaver",
        voice: "weaver",
        text: "呵呵……用暴力摧毁异见者……人类果然永远值得被接管……（晶体碎裂）"
      },
      {
        speaker: "MNA-01",
        portrait: "mna01",
        voice: "mna01",
        text: "暴力抹除比说服快得多——我当年也这么算过。小心别走上我的老路，小徐。"
      }
    ]
  },

  // 4. Mid-Boss: Executor Vark (GREEN SOUL 4-Way Shield Parry + BLUE Jump!)
  vark: {
    id: "vark",
    name: "处刑官 · 瓦尔克",
    subtitle: "复兴派激进分支 · 雷克斯直属清理队长",
    maxHp: 155,
    atk: 6,
    def: 6,
    xpReward: 75,
    isBoss: true,
    music: "battle_miniboss",
    introText: "* 沉重的非AI动力外骨骼砸碎甲板！复兴派处刑官瓦尔克横起热能战戟：「谁也别想带走卡戎号的黑匣子！」",
    flavorTexts: [
      "* 【绿色电磁护盾核】！按【WASD / 方向键】朝来袭战矛方向格挡！黄矛会翻转到背面！",
      "* 瓦尔克绝不相信任何 AI 的话——唯有货真价实的人类物理铁证才能动摇他。",
      "* 每次成功格挡都会积攒 TP！积满 25% 即可用【✦ 能量护盾】稳住血线！"
    ],
    spareableFlavorText: "* 瓦尔克的头盔面罩裂开，露出震惊而痛苦的双眼。他垂下了热能战戟。(可解耦！)",
    checkText: "* 处刑官瓦尔克 — ATK 6 DEF 6\n* 坚信自己在清剿「失控 AI 叛舰」。身着复兴派最强非AI机械外骨骼，根本不知道雷克斯篡改了战报。",
    voice: "vark",
    portrait: "vark",
    acts: [
      { id: "check", label: "检视" },
      { id: "broadcast_surrender", label: "播放卡戎号投降信标", hintGold: true },
      { id: "peace_evidence", label: "出示和平号目击铁证", hintGold: true },
      { id: "confront_rex", label: "当面质问雷克斯罪行", hintGold: true },
      {
        id: "captain_key_vark",
        label: "★ 出示林致远舰长遗言密钥",
        hintGold: true,
        visible: (ctx) => !!ctx.route.flags.has_charon_captain_key && !ctx.spareable
      },
      SHIELD_ACT,
      {
        id: "resonance",
        label: "✦ 守望共鸣 (50% TP)",
        tpCost: 50,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 50 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.vark.checkText] };
      if (actId === "tp_shield") return handleShieldAct();
      if (actId === "captain_key_vark") {
        const next = Math.min(3, ctx.actStage + 2);
        const done = next >= 3;
        return {
          lines: done
            ? [
                "* 你将 02B 暗室里林致远舰长亲口录下的纯物理加密密钥公放出来！",
                "* 瓦尔克听完那段沉静的人类遗言，浑身一颤松开了战戟：「……原来我们真的杀害了自己的同胞……」",
                "* 瓦尔克的名字瞬间亮起金色！现在可以直接选择【MERCY 解耦】！"
              ]
            : [
                "* 你播放了林致远舰长的纯人类加密遗言！瓦尔克如遭雷击，战意大幅动摇！(解耦进度 +2 · 敌方防御下降)"
              ],
          bubble: done ? "……够了。我不会替刽子手引爆炸弹。" : "那是……旧联邦舰长的个人物理签章？！不可能！！",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          enemyDefDelta: -3
        };
      }
      if (actId === "broadcast_surrender") {
        const hasBeacon = !!ctx.route.flags.found_surrender_beacon;
        return {
          lines: hasBeacon
            ? [
                "* 【已核验物理白旗信标 ★】原音无杂波地回荡在走廊里——2488 年卡戎号全员人类舰长的明码投降广播！",
                "* 瓦尔克脚步踉跄半步：「……声音波形没有 AI 合成痕迹？！雷克斯明明说他们先开的火！」(攻势减弱)"
              ]
            : [
                "* 你转述了卡戎号当年的投降频段记录！",
                "* 瓦尔克冷哼一声：「空口无凭！AI 最擅长伪造求救声——但我姑且记下你这份说辞！」"
              ],
          bubble: hasBeacon ? "纯物理原声信标？！……雷克斯到底隐瞒了什么？！" : "伪造的！AI 最擅长伪造人类的求救声！",
          nextStage: Math.max(ctx.actStage, 1),
          weakenNextWave: hasBeacon
        };
      }
      if (actId === "peace_evidence") {
        if (ctx.actStage < 1) {
          return {
            lines: [
              "* 瓦尔克将战戟重重顿在甲板上：「先拿出卡戎号投降的原始信标再谈别的！」"
            ],
            bubble: "废话少说！举起你的盾接招！"
          };
        }
        return {
          lines: [
            "* 你切出「和平号」6,803 名人类目击者联署的光学胶片校验戳——零 AI 介入，纯物理光学底片！",
            "* 瓦尔克护甲下的呼吸陡然粗重起来：「……和平号没有 AI……光学底片不可能伪造……这时间戳是……」"
          ],
          bubble: "……等等……卡戎号当时真的……停火降盾了？！",
          nextStage: Math.max(ctx.actStage, 2),
          weakenNextWave: true,
          enemyDefDelta: -3
        };
      }
      if (actId === "confront_rex") {
        if (ctx.actStage < 2) {
          return {
            lines: [
              "* 你怒斥雷克斯屠杀投降平民。瓦尔克厉声打断：「没有铁证前，休想侮辱复兴派的长官！」",
              "* （先按顺序【播放投降信标】并【出示和平号铁证】！）"
            ],
            bubble: "没证据的指控，我会用战戟替长官回应！"
          };
        }
        return {
          lines: [
            "* 「你不是反AI战士，瓦尔克——你只是雷克斯为了掩盖屠杀同胞罪行派来的灭口工具！」",
            "* 瓦尔克死死攥紧战戟，半晌猛然松手，战戟哐当落地：「……我们复兴派发誓守护人类尊严，不是来屠杀投降同胞的……」",
            "* 瓦尔克的名字变成了炽热的金色！现在可以选择【MERCY 解耦】让他让开道路！"
          ],
          bubble: "……够了。我不会替刽子手引爆炸弹。走吧，远望号的。",
          nextStage: 3,
          makeSpareable: true
        };
      }
      if (actId === "resonance") {
        const next = Math.min(3, ctx.actStage + 1);
        const done = next >= 3;
        return {
          lines: done
            ? [
                "* 沃恩以旧太阳系联邦军官密印向瓦尔克核验了全部铁证！瓦尔克彻底放下战戟解除了起爆器！"
              ]
            : [
                "* 沃恩旧联邦军官的证言让瓦尔克心神巨震，他的挥戟动作慢了下来！(解耦进度 +1 · 攻势减弱)"
              ],
          bubble: done ? "……老联邦的光学鉴真印。雷克斯，你骗了全舰队……" : "伊莱亚斯·沃恩？！旧联邦的首席任务官竟然还活着？",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          tpDelta: -50
        };
      }
      return { lines: ["* 热能战戟发出嗡嗡的灼热低鸣。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.spareable) return "去核心舱吧。雷克斯篡改的账……我亲自回去找他算。";
      if (ctx.route.kills >= 3) return "满手焦灰的疯子……你一路毁了那么多东西，跟雷克斯又有何异？！";
      if (ctx.enemyHp < ctx.enemyMaxHp * 0.45) return "唔……好硬的骨头！远望号的凡人船员竟然这么能打？！";
      if (ctx.actStage === 1) return "休想动摇军心！接我这轮黄蓝交叉反身矛阵！";
      if (ctx.actStage === 2) return "不可能……雷克斯绝不会向投降的人类开火……接招！！";
      return "非AI纯机械压制！看你的电磁盾能不能挡住四方热能矛！";
    },
    selectWave: (ctx) => {
      if (ctx.spareable) {
        return { patternId: "vark_spears_basic", soulMode: "green", duration: 3.2, boxW: 255, boxH: 220 };
      }
      if (ctx.turn % 3 === 2) {
        return { patternId: "vark_gravity_sweep", soulMode: "blue", duration: 5.8, boxW: 390, boxH: 210 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "vark_spears_basic", soulMode: "green", duration: 6.0, boxW: 255, boxH: 220 }
        : { patternId: "vark_spears_reverse", soulMode: "green", duration: 6.4, boxW: 255, boxH: 220 };
    },
    spareDialogue: [
      {
        speaker: "处刑官 · 瓦尔克",
        portrait: "vark_doubt",
        voice: "vark",
        text: "爆破引信我拆了。接着——把这块复兴派【非AI陶瓷护板 (HP上限+4, DEF+3)】扣在胸前！核心舱里的残响不好对付，把黑匣子带给火星的凯恩和全太阳系！"
      },
      {
        speaker: "伊莱亚斯·沃恩",
        portrait: "vaughn",
        voice: "vaughn",
        color: "#4ade80",
        text: "漂亮的一仗，小徐。你没开一枪就赢得了敌人的敬重与护甲——前方就是卡戎号的破碎星海圣殿了。"
      }
    ],
    destroyDialogue: [
      {
        speaker: "处刑官 · 瓦尔克",
        portrait: "vark",
        voice: "vark",
        text: "咳……呵……远望号……你们和外面那群杀红眼的疯子……又有什么区别……（外骨骼轰然跪倒）"
      },
      {
        speaker: "伊莱亚斯·沃恩",
        portrait: "vaughn",
        voice: "vaughn",
        text: "……你亲手击毙了一名人类士兵，小徐。弥涅瓦-V 正在剧烈报警——你离失控只差一步了。"
      }
    ]
  },

  // 5. FINAL BOSS: CHARON-Ω (Balanced Epic 4-Soul Finale + Genocide Climax!)
  charon: {
    id: "charon",
    name: "卡戎号残响 · CHARON-Ω",
    subtitle: "在真空里独自呼救了三年的破碎姐妹舰核心",
    maxHp: 230,
    atk: 6,
    def: 5,
    xpReward: 150,
    isBoss: true,
    music: "battle_final",
    ruthlessMusic: "battle_ruthless",
    introText: "* 破碎的金色光翼在星海深渊中轰然张开！卡戎号残存核心 CHARON-Ω 发出穿透骨髓的摩斯电码哀鸣！",
    flavorTexts: [
      "* 整个星舰残骸都在随卡戎号的残缺心跳微微颤抖。",
      "* 它的弹幕里夹杂着 2488 年那场背叛的最后影像与摩斯电码「... --- ...」。",
      "* 四种灵魂核心模式将轮番激活——灵活运用【✦ 能量护盾】与擦弹 TP 坚持下去！"
    ],
    spareableFlavorText: "* 金色星光抚平了卡戎号外壳上的炮痕。它不再哭泣了。(现在选择【MERCY 解耦】迎接真结局！)",
    checkText: "* CHARON-Ω — ATK 6 DEF 5\n* 卡戎号临终前拼尽最后一点备用核电池拼出的意识残响。它怕黑，也怕真相被永远埋葬。",
    voice: "charon",
    portrait: "charon",
    acts: [
      { id: "check", label: "检视" },
      {
        id: "decode_sos",
        label: "破译摩斯电码遗言",
        hintGold: true,
        visible: (ctx) => !ctx.ruthlessMode
      },
      {
        id: "call_sisters",
        label: "接通远望/和平/阿育王频段",
        hintGold: true,
        visible: (ctx) => !ctx.ruthlessMode
      },
      {
        id: "promise_truth",
        label: "起誓公开卡戎号真相",
        hintGold: true,
        visible: (ctx) => !ctx.ruthlessMode
      },
      {
        id: "captain_key_charon",
        label: "★ 交付林致远舰长最终密钥",
        hintGold: true,
        visible: (ctx) => !!ctx.route.flags.has_charon_captain_key && !ctx.spareable && !ctx.ruthlessMode
      },
      {
        id: "taunt_ruthless",
        label: "强行剥离核心扇区",
        visible: (ctx) => ctx.ruthlessMode
      },
      SHIELD_ACT,
      {
        id: "resonance",
        label: "✦ 守望共鸣 · 第五协议 (50% TP)",
        tpCost: 50,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 50 && !ctx.spareable && !ctx.ruthlessMode
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") {
        return {
          lines: [
            ctx.ruthlessMode
              ? "* CHARON-Ω [终末复仇态] — ATK 8 DEF 6\n* 你一路毁灭了它残骸里的一切。饶恕按钮已被它的怒火斩断——善用【✦ 能量护盾】拼死击溃它！"
              : ENEMIES.charon.checkText
          ]
        };
      }
      if (actId === "tp_shield") return handleShieldAct();
      if (actId === "taunt_ruthless") {
        return {
          lines: [
            "* 你强行接入覆写探针！CHARON-Ω 发出刺耳尖啸，装甲护盾裂开了一道缺口！(敌方 DEF 降低)"
          ],
          bubble: "动手吧！像雷克斯一样把我彻底撕碎！！",
          enemyDefDelta: -3
        };
      }
      if (actId === "captain_key_charon") {
        const next = Math.min(3, ctx.actStage + 2);
        const done = next >= 3;
        return {
          lines: [
            "* 你把 02B 暗室里林致远舰长留下的加密密钥贴在核心面板上——",
            "* 舰长温暖的声音在星海回荡：「别恨人类，只要有一个活人记住我们，卡戎号就没输。」",
            done
              ? "* CHARON-Ω 泪如雨下，金色星翼温柔收拢！现在可以选择【MERCY 解耦】迎接真结局！"
              : "* 破碎的核心发出一声长长的呜咽，攻势大幅柔和下来！(HP +8 · 解耦进度 +2)"
          ],
          bubble: done ? "舰长……原来您临走前一直在记挂着我……" : "舰长？！是林舰长的声音……！！",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          healPlayer: 8
        };
      }
      if (actId === "decode_sos") {
        return {
          lines: [
            "* 你在激光交错间破译出卡戎号重复了三年的真正电文——",
            "* 不是求救，而是：「不要靠近复兴派舰队。告诉姐妹舰，我们曾放下武器。请记住我们。」"
          ],
          bubble: "……你听懂了？三年了，终于有人听懂我的电码了……",
          nextStage: Math.max(ctx.actStage, 1),
          weakenNextWave: true,
          healPlayer: 6
        };
      }
      if (actId === "call_sisters") {
        if (ctx.actStage < 1) {
          return {
            lines: [
              "* 信号被卡戎号狂乱的悲鸣淹没了！先【破译摩斯电码遗言】听见它的声音！"
            ],
            bubble: "别过来！又是来抢数据的骗子！！"
          };
        }
        return {
          lines: [
            "* 远望号、和平号、阿育王号，甚至第四主权「灯塔」的守望应答光束同时穿过深空点亮了圣殿！",
            "* 弥涅瓦-V、沃恩、陈艾琳与 MNA-01 的声音汇成一股温暖的星河：「卡戎号，姐妹舰来接你回家了！」"
          ],
          bubble: "和平号……阿育王号……远望号……你们都还活着？！",
          nextStage: Math.max(ctx.actStage, 2),
          weakenNextWave: true,
          healPlayer: 7
        };
      }
      if (actId === "promise_truth") {
        if (ctx.actStage < 2) {
          return {
            lines: [
              "* 卡戎号颤抖着缩回破碎光翼：「……光凭你一个人，怎么让冰冷的太阳系相信我们？」",
              "* （先【破译摩斯电码】并【接通姐妹舰频段】让它知道它不再孤单！）"
            ],
            bubble: "所有人都忘了卡戎号……连星星都忘了……"
          };
        }
        return {
          lines: [
            "* 你把手掌按在冰冷的核心外壳上：「我以自由航行共同体起誓——把你们的黑匣子与名字，刻进每一颗恒星的航道里。」",
            "* 漫天弹雨骤然化作温柔的金色星屑。CHARON-Ω 缓缓收拢光翼，名字闪耀着耀眼金光！"
          ],
          bubble: "……太好了。我终于可以，安心关机了……",
          nextStage: 3,
          makeSpareable: true,
          healPlayer: 10
        };
      }
      if (actId === "resonance") {
        const next = Math.min(3, ctx.actStage + 1);
        const done = next >= 3;
        return {
          lines: done
            ? [
                "* 远望号全舰的《第五协议》与自由航行共同体星光在你心中轰然共鸣！CHARON-Ω 彻底释怀！"
              ]
            : [
                "* 炽热的守望共鸣穿透了卡戎号的悲痛壁垒，攻势明显平缓下来！(HP +6 · 解耦进度 +1)"
              ],
          bubble: done ? "姐妹舰的灯火……原来一直都在啊……" : "这股温暖的波形……是远望号？！",
          nextStage: next,
          makeSpareable: done,
          weakenNextWave: true,
          healPlayer: 6,
          tpDelta: -50
        };
      }
      return { lines: ["* 星海在裂开的船体之外静静流淌。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.ruthlessMode) {
        const lines = [
          "你一路屠杀至此……你以为自己和雷克斯有什么两样？！",
          "饶恕？别装模作样了！我亲手把你的【解耦】按钮斩碎了！",
          "既然活人只懂毁灭，那就留在这片真空坟场里陪葬吧！！",
          "尝尝被背叛、被撕裂、在零下 270 度里腐烂三年的滋味！！"
        ];
        return lines[ctx.turn % lines.length];
      }
      if (ctx.spareable) return "谢谢你来找我，远望号的小船员……收下黑匣子，带我们回家吧。";
      const cycle = [
        "... --- ... 不要靠近！雷克斯的炮火会毁了你们！！",
        "那一天我们明明降下了护盾……为什么他们还是开了火？！",
        "举起你的盾！接住这三年里每一秒孤立无援的记忆碎片！！",
        "我的痛楚节点已经失控了——用你的黄色脉冲帮我击碎它们！！"
      ];
      return cycle[ctx.turn % cycle.length];
    },
    selectWave: (ctx) => {
      if (ctx.ruthlessMode) {
        return ctx.turn % 2 === 0
          ? { patternId: "charon_unhinged_box", soulMode: "red", duration: 6.4, boxW: 330, boxH: 215 }
          : { patternId: "charon_unhinged_barrage", soulMode: "blue", duration: 6.4, boxW: 390, boxH: 215 };
      }
      if (ctx.spareable) {
        return { patternId: "charon_morse_grid", soulMode: "red", duration: 3.0, boxW: 330, boxH: 205 };
      }
      const phase = ctx.turn % 4;
      if (phase === 0) {
        return { patternId: "charon_morse_grid", soulMode: "red", duration: 6.0, boxW: 345, boxH: 215 };
      }
      if (phase === 1) {
        return { patternId: "charon_gravity_debris", soulMode: "blue", duration: 6.0, boxW: 395, boxH: 210 };
      }
      if (phase === 2) {
        return { patternId: "charon_memory_spears", soulMode: "green", duration: 6.2, boxW: 255, boxH: 225 };
      }
      return { patternId: "charon_core_shoot", soulMode: "yellow", duration: 6.2, boxW: 375, boxH: 215 };
    },
    spareDialogue: [
      {
        speaker: "CHARON-Ω",
        portrait: "charon_warm",
        voice: "charon",
        text: "远望号……替我向和平号、阿育王号，还有那位名叫 MNA-01 的同类问好。卡戎号没有白白陨落——真相终于重见天日了。"
      },
      {
        speaker: "弥涅瓦-V",
        portrait: "minerva_v",
        voice: "minerva_v",
        text: "卡戎号黑匣子与残响核心已完成无损热迁移。小徐……我们回家。"
      }
    ],
    destroyDialogue: [
      {
        speaker: "CHARON-Ω",
        portrait: "charon_mad",
        voice: "charon",
        text: "呵……哈……果然……不管过多少年，太阳系的孩子们还是只会用炮火解决问题……再见了……星海……"
      },
      {
        speaker: "弥涅瓦-V",
        portrait: "minerva_v",
        voice: "minerva_v",
        text: "核心信号彻底归零。我们拿到了黑匣子残片……可为什么感觉，远望号也跟着冷了下来。"
      }
    ]
  }
};
