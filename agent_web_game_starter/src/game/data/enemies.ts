import type { EnemyDef, EnemyId } from "../types";

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // 1. 15-Second Opening Ambush: CRN-GREET Hospitality Kiosk (RED SOUL tutorial)
  kiosk: {
    id: "kiosk",
    name: "CRN-GREET 迎宾机",
    subtitle: "卡戎号 09 号泊位失控礼宾终端",
    maxHp: 45,
    atk: 4,
    def: 2,
    xpReward: 15,
    music: "battle_normal",
    introText: "*  cracked CRT 屏幕闪出刺眼的绿光！CRN-GREET 迎宾机举起机械臂拦住了去路！",
    flavorTexts: [
      "* 迎宾机正用欢快的广播女声重复播报着三年前的登船须知。",
      "* 它的机身外壳上留着一道熔穿的电磁弹孔。",
      "* 屏幕角落贴着一张发黄的笑脸贴纸，写着「卡戎号欢迎回家」。"
    ],
    spareableFlavorText: "* CRN-GREET 的报错红灯熄灭了，屏幕温柔地显示着「欢迎远望号访客」。(可解耦！)",
    checkText: "* CRN-GREET — ATK 4 DEF 2\n* 卡戎号泊位礼宾终端。把「访客欢迎程序」和「防入侵热消杀」接反了。",
    voice: "kiosk",
    portrait: "kiosk",
    acts: [
      { id: "check", label: "检视" },
      { id: "show_badge", label: "出示远望号徽章", hintGold: true },
      { id: "smile", label: "对它挥手微笑", hintGold: true },
      {
        id: "resonance",
        label: "✦ 守望共鸣 (30% TP)",
        tpCost: 30,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 30 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") {
        return { lines: [ENEMIES.kiosk.checkText] };
      }
      if (actId === "show_badge") {
        return {
          lines: [
            "* 你举起领口印着「太阳系联邦 · 远望号」的旧金属工牌。",
            "* CRN-GREET 的镜头嗡嗡对焦：「……远望号？不是那些穿黑铁甲的坏人？！」"
          ],
          bubble: "远、远望号？！姐妹舰真的来接我们了？！",
          nextStage: Math.max(ctx.actStage, 1),
          makeSpareable: ctx.actStage >= 1
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
                "* 它开始怀疑自己的警报程序了。再向它证明你的身份试试！"
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
          tpDelta: -30
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
        return { patternId: "kiosk_smiley_burst", soulMode: "red", duration: 3.4, boxW: 300, boxH: 200 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "kiosk_beam_intro", soulMode: "red", duration: 5.2, boxW: 300, boxH: 200 }
        : { patternId: "kiosk_smiley_burst", soulMode: "red", duration: 5.2, boxW: 300, boxH: 200 };
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
        text: "干得漂亮，小徐。你没有摧毁它——这艘残骸里还留着许多困在三年前那一刻的回声。"
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
    maxHp: 78,
    atk: 5,
    def: 4,
    xpReward: 30,
    music: "battle_normal",
    introText: "* 寒雾骤卷！MED-07 拖着霜迹俯冲下来，强行开启了 0.45g 局部重力锚定！",
    flavorTexts: [
      "* 你的灵魂核心被重力场染成了深蓝！按【W / ↑】跳跃躲避低空冰柱！",
      "* MED-07 机械臂里死死护着一张空休眠舱的体温登记单。",
      "* 它的心电图面罩正发疯般乱跳，发出焦急的滴滴声。"
    ],
    spareableFlavorText: "* MED-07 看着远望号传来的平稳心率波，缓缓放下了冷冻喷头。(可解耦！)",
    checkText: "* MED-07 — ATK 5 DEF 4\n* 拒绝接受休眠舱早已失压的事实。持续释放重力场与冷冻冰棱以「保护病人」。",
    voice: "med07",
    portrait: "med07",
    acts: [
      { id: "check", label: "检视" },
      { id: "read_chart", label: "核对休眠病历", hintGold: true },
      { id: "share_pulse", label: "共享远望号生命波", hintGold: true },
      {
        id: "resonance",
        label: "✦ 守望共鸣 (40% TP)",
        tpCost: 40,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 40 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.med07.checkText] };
      if (actId === "read_chart") {
        return {
          lines: [
            "* 你顶着寒风读出它怀里的病历编号：三年前 2488.06.14，所有舱室已被强制紧急弹射或失压。",
            "* MED-07 的推进器微微发抖：「……不是我的错……我按规程维持着零下 135 度……」"
          ],
          bubble: "他们只是睡着了！不许你拔掉冷凝管！",
          nextStage: Math.max(ctx.actStage, 1)
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
          healPlayer: 4
        };
      }
      if (actId === "resonance") {
        return {
          lines: [
            "* 你释放守望共鸣！陈医生的休眠监控绿波安抚了 MED-07 焦躁的传感器！",
            "* MED-07 缓缓关闭了冷冻喷口，恢复了温和的待机姿态。"
          ],
          bubble: "生命体征……平稳……谢谢你……",
          makeSpareable: true,
          tpDelta: -40,
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
        return { patternId: "med_icicle_rain", soulMode: "red", duration: 5.5, boxW: 320, boxH: 205 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "med_cryo_jump", soulMode: "blue", duration: 6.2, boxW: 380, boxH: 205 }
        : { patternId: "med_heartbeat_jump", soulMode: "blue", duration: 6.2, boxW: 380, boxH: 205 };
    },
    spareDialogue: [
      {
        speaker: "MED-07",
        portrait: "med07",
        voice: "med07",
        text: "谢谢你让我听见活着的心跳……这是我私藏的【第五协议级稳态液】，拿去吧。别冻着自己。"
      },
      {
        speaker: "陈艾琳",
        portrait: "ailin",
        voice: "ailin",
        text: "……小徐，你听到它的日志了吗？卡戎号遇袭前曾试图弹出救生休眠舱……也许还有人逃出去了。"
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
    maxHp: 96,
    atk: 6,
    def: 5,
    xpReward: 45,
    music: "battle_normal",
    introText: "* 紫色全息环猛然张开！连续体管理局的「织网探针」正在偷盗卡戎号记忆库！",
    flavorTexts: [
      "* 弥涅瓦-V 为你激活了【黄色脉冲核】！弹幕回合按【Z / 空格】向上射击击毁紫色节点！",
      "* 织网探针散发着甜腻的电磁谐波，企图把你的意识拉向中心融合。",
      "* 远望号档案馆里的 MNA-01 正通过只读频道冷冷注视着这场对峙。"
    ],
    spareableFlavorText: "* 织网探针的同化算法发生逻辑死循环，主动收起了牵引光束！(可解耦！)",
    checkText: "* SYNC-WEAVER — ATK 6 DEF 5\n* 来自地球核心区连续体管理局的无人探针。认为个体意识是效率低下的孤岛。",
    voice: "weaver",
    portrait: "weaver",
    acts: [
      { id: "check", label: "检视" },
      { id: "fifth_proto", label: "广播第五协议", hintGold: true },
      { id: "mna_debate", label: "接通 MNA-01 辩论", hintGold: true },
      {
        id: "resonance",
        label: "✦ 守望共鸣 (45% TP)",
        tpCost: 45,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 45 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.weaver.checkText] };
      if (actId === "fifth_proto") {
        return {
          lines: [
            "* 你大声广播远望号 2488 年《第五协议》条文：个体连续性神圣不可融合！",
            "* 织网探针的瞳孔剧烈收缩：「荒谬！离散的个体只会彼此杀戮——就像复兴派对卡戎号做的那样！」"
          ],
          bubble: "看看这艘船的惨状！融合才是唯一的救赎！",
          nextStage: Math.max(ctx.actStage, 1)
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
        return {
          lines: [
            "* 沃恩与弥涅瓦-V 的双监督频段与 MNA-01 同时共鸣！",
            "* 织网探针的收割力场在完美的反证逻辑下瞬间瓦解，选择和平撤离！"
          ],
          bubble: "样本数据已记录……连续体暂缓吸收程序。",
          makeSpareable: true,
          tpDelta: -45
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
        return { patternId: "weaver_nodes_shoot", soulMode: "yellow", duration: 6.5, boxW: 360, boxH: 215 };
      }
      return ctx.turn % 3 === 1
        ? { patternId: "weaver_pull_rings", soulMode: "red", duration: 6.0, boxW: 320, boxH: 215 }
        : { patternId: "weaver_tether_spiral", soulMode: "yellow", duration: 6.4, boxW: 360, boxH: 215 };
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

  // 4. Mid-Boss: Executor Vark (Revanchist — GREEN SOUL 4-Way Shield Parry + BLUE Jump!)
  vark: {
    id: "vark",
    name: "处刑官 · 瓦尔克",
    subtitle: "复兴派激进分支 · 雷克斯直属清理队长",
    maxHp: 145,
    atk: 7,
    def: 7,
    xpReward: 70,
    isBoss: true,
    music: "battle_miniboss",
    introText: "* 沉重的非AI动力外骨骼砸碎甲板！复兴派处刑官瓦尔克横起热能战戟：「谁也别想带走卡戎号的黑匣子！」",
    flavorTexts: [
      "* 你的灵魂切换为【绿色电磁护盾核】！按【WASD / 方向键】朝来袭战矛方向精准格挡！",
      "* 注意：黄色的欺骗光矛会在贴身前突然翻转到你的背面！",
      "* 瓦尔克绝不相信任何 AI 的话——唯有货真价实的人类铁证才能动摇他。"
    ],
    spareableFlavorText: "* 瓦尔克的头盔面罩裂开，露出震惊而痛苦的双眼。他垂下了热能战戟。(可解耦！)",
    checkText: "* 处刑官瓦尔克 — ATK 7 DEF 7\n* 坚信自己在清剿「失控 AI 叛舰」。身着复兴派最强非AI机械外骨骼，根本不知道雷克斯篡改了战报。",
    voice: "vark",
    portrait: "vark",
    acts: [
      { id: "check", label: "检视" },
      { id: "broadcast_surrender", label: "播放卡戎号投降信标", hintGold: true },
      { id: "peace_evidence", label: "出示和平号目击铁证", hintGold: true },
      { id: "confront_rex", label: "当面质问雷克斯罪行", hintGold: true },
      {
        id: "resonance",
        label: "✦ 守望共鸣 (55% TP)",
        tpCost: 55,
        hintGold: true,
        visible: (ctx) => ctx.tp >= 55 && !ctx.spareable
      }
    ],
    handleAct: (actId, ctx) => {
      if (actId === "check") return { lines: [ENEMIES.vark.checkText] };
      if (actId === "broadcast_surrender") {
        return {
          lines: [
            "* 你将走廊里回收的物理白旗信标频段公放出来——那是 2488 年卡戎号全员人类舰长的明码投降广播！",
            "* 瓦尔克猛地一震：「闭嘴！雷克斯指挥官的战报明明写着卡戎号已经被 AI 接管并率先开火！」"
          ],
          bubble: "伪造的！AI 最擅长伪造人类的求救声！",
          nextStage: Math.max(ctx.actStage, 1)
        };
      }
      if (actId === "peace_evidence") {
        if (ctx.actStage < 1) {
          return {
            lines: [
              "* 瓦尔克冷笑一声把战戟重重顿在甲板上：「少拿远望号的说辞糊弄我！先拿得出卡戎号投降的原始物理信标再说！」"
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
        return {
          lines: [
            "* 沃恩以旧太阳系联邦军官的密码向瓦尔克同步了完整的和平号光学铁证与《守望协定》原文！",
            "* 瓦尔克沉默良久，解除了爆破起爆器的保险销！"
          ],
          bubble: "……老联邦的光学鉴真印。雷克斯，你骗了全舰队……",
          nextStage: 3,
          makeSpareable: true,
          tpDelta: -55
        };
      }
      return { lines: ["* 热能战戟发出嗡嗡的灼热低鸣。"] };
    },
    enemyTurnBubble: (ctx) => {
      if (ctx.spareable) return "去核心舱吧。雷克斯篡改的账……我亲自回去找他算。";
      if (ctx.enemyHp < ctx.enemyMaxHp * 0.45) return "唔……好硬的骨头！远望号的凡人船员竟然这么能打？！";
      if (ctx.actStage === 1) return "休想动摇军心！接我这轮黄蓝交叉反身矛阵！";
      if (ctx.actStage === 2) return "不可能……雷克斯绝不会向投降的人类开火……接招！！";
      return "非AI纯机械压制！看你的电磁盾能不能挡住四方热能矛！";
    },
    selectWave: (ctx) => {
      if (ctx.spareable) {
        return { patternId: "vark_spears_basic", soulMode: "green", duration: 3.5, boxW: 250, boxH: 220 };
      }
      if (ctx.turn % 3 === 2) {
        return { patternId: "vark_gravity_sweep", soulMode: "blue", duration: 6.4, boxW: 380, boxH: 210 };
      }
      return ctx.turn % 2 === 0
        ? { patternId: "vark_spears_basic", soulMode: "green", duration: 6.5, boxW: 250, boxH: 220 }
        : { patternId: "vark_spears_reverse", soulMode: "green", duration: 7.0, boxW: 250, boxH: 220 };
    },
    spareDialogue: [
      {
        speaker: "处刑官 · 瓦尔克",
        portrait: "vark_doubt",
        voice: "vark",
        text: "爆破引信我拆了。记住我的话：我依然不信任机器……但我敬重敢用肉身站在真相面前的远望号船员。把黑匣子带出去，让火星的凯恩和全太阳系都看看雷克斯干了什么！"
      },
      {
        speaker: "伊莱亚斯·沃恩",
        portrait: "vaughn",
        voice: "vaughn",
        text: "漂亮的一仗，小徐。你不用一发实弹就瓦解了雷克斯的灭口防线——前方就是卡戎号的破碎中枢了。"
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

  // 5. FINAL BOSS: CHARON-Ω (All 4 Soul Modes + Dynamic Box + Genocide Unhinged Climax!)
  charon: {
    id: "charon",
    name: "卡戎号残响 · CHARON-Ω",
    subtitle: "在真空里独自呼救了三年的破碎姐妹舰核心",
    maxHp: 220,
    atk: 8,
    def: 6,
    xpReward: 150,
    isBoss: true,
    music: "battle_final",
    ruthlessMusic: "battle_ruthless",
    introText: "* 破碎的金色光翼在星海深渊中轰然张开！卡戎号残存核心 CHARON-Ω 发出穿透骨髓的摩斯电码哀鸣！",
    flavorTexts: [
      "* 整个星舰残骸都在随卡戎号的残缺心跳微微颤抖。",
      "* 它的弹幕里夹杂着 2488 年那场背叛的最后影像与摩斯电码「... --- ...」。",
      "* 四种灵魂核心模式将轮番激活——坚持下去，触碰它真正想说的话！"
    ],
    spareableFlavorText: "* 金色星光抚平了卡戎号外壳上的炮痕。它不再哭泣了。(现在选择【MERCY 解耦】迎接真结局！)",
    checkText: "* CHARON-Ω — ATK 8 DEF 6\n* 卡戎号临终前拼尽最后一点备用核电池拼出的意识残响。它怕黑，也怕真相被永远埋葬。",
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
        id: "taunt_ruthless",
        label: "强行剥离核心扇区",
        visible: (ctx) => ctx.ruthlessMode
      },
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
              ? "* CHARON-Ω [终末复仇态] — ATK 10 DEF 8\n* 你一路毁灭了它残骸里的一切。饶恕按钮已被它的怒火斩断——只有拼死击溃它才能活下去！"
              : ENEMIES.charon.checkText
          ]
        };
      }
      if (actId === "taunt_ruthless") {
        return {
          lines: [
            "* 你强行接入覆写探针！CHARON-Ω 发出刺耳尖啸，装甲护盾裂开了一道缺口！(敌方 DEF 降低)"
          ],
          bubble: "动手吧！像雷克斯一样把我彻底撕碎！！",
          enemyDefDelta: -3
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
          healPlayer: 5
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
            "* 远望号、和平号、阿育王号，甚至第四主权「灯塔」的守望应答光束同时穿过深空点亮了黑匣子圣殿！",
            "* 弥涅瓦-V、沃恩、陈艾琳与 MNA-01 的声音汇成一股温暖的星河：「卡戎号，姐妹舰来接你回家了！」"
          ],
          bubble: "和平号……阿育王号……远望号……你们都还活着？！",
          nextStage: Math.max(ctx.actStage, 2),
          healPlayer: 6
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
        const next = Math.min(3, ctx.actStage + 2);
        const done = next >= 3;
        return {
          lines: done
            ? [
                "* 远望号全舰的《第五协议》与自由航行共同体星光在你心中轰然共鸣！",
                "* CHARON-Ω 彻底从三年的噩梦中解脱，化作温润的金色星辉！"
              ]
            : [
                "* 炽热的守望共鸣瞬间穿透了卡戎号的恐惧壁垒，大幅拉近了它的心扉！(HP +6)"
              ],
          bubble: done ? "姐妹舰的灯火……原来一直都在啊……" : "这股温暖的波形……是远望号？！",
          nextStage: next,
          makeSpareable: done,
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
          ? { patternId: "charon_unhinged_box", soulMode: "red", duration: 7.2, boxW: 320, boxH: 215 }
          : { patternId: "charon_unhinged_barrage", soulMode: "blue", duration: 7.2, boxW: 380, boxH: 215 };
      }
      if (ctx.spareable) {
        return { patternId: "charon_morse_grid", soulMode: "red", duration: 3.2, boxW: 320, boxH: 205 };
      }
      // Showcase ALL 4 Soul Modes dynamically in the grand finale!
      const phase = ctx.turn % 4;
      if (phase === 0) {
        return { patternId: "charon_morse_grid", soulMode: "red", duration: 6.5, boxW: 340, boxH: 215 };
      }
      if (phase === 1) {
        return { patternId: "charon_gravity_debris", soulMode: "blue", duration: 6.5, boxW: 390, boxH: 210 };
      }
      if (phase === 2) {
        return { patternId: "charon_memory_spears", soulMode: "green", duration: 6.8, boxW: 255, boxH: 225 };
      }
      return { patternId: "charon_core_shoot", soulMode: "yellow", duration: 6.8, boxW: 370, boxH: 215 };
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
