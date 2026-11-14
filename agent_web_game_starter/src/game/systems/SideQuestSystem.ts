/**
 * Side Quest System for *Discrete Star Sea* (`离散星海`).
 *
 * Strictly pure TypeScript (zero DOM calls) so every quest trigger, multi-step
 * flag transition, and completion reward runs deterministically in Node tests.
 *
 * Anchored in the post-2488 Watch-Accord canon (`docs/设定集.md`, 2491 AD — Year 3):
 *   1. `ailin_memory`    : 「陈艾琳缺失的记忆碎片」 (C-7 Neural Rehab Center)
 *   2. `mna01_archives`  : 「MNA-01 的日常与卡戎号疑云」 (Yuanwang Historical Archives)
 *   3. `l1_scars`        : 「L-1 的旧焊痕与无义体船员」 (L-1 Agri + Medical Bay)
 *   4. `vaughn_oversight`: 「沃恩、弥涅瓦-V 与凯恩的旧约」 (Bridge + Archives)
 */

export type SideQuestId = "ailin_memory" | "mna01_archives" | "l1_scars" | "vaughn_oversight";

export type SideQuestStatus = "unstarted" | "active" | "completed";

export interface SideQuestStep {
  readonly id: string;
  readonly label: string;
  done: boolean;
}

export interface SideQuestRecord {
  readonly id: SideQuestId;
  readonly title: string;
  readonly sectorHint: string;
  readonly summary: string;
  readonly rewardLabel: string;
  readonly rewardXp: number;
  status: SideQuestStatus;
  readonly steps: SideQuestStep[];
}

export type SideQuestFlag =
  | "talked_ailin"
  | "checked_ward_bed"
  | "decoded_fifth_protocol"
  | "reported_ailin"
  | "talked_archivist_lin"
  | "checked_mna01_desk"
  | "examined_charon_file"
  | "inspected_l1_weld"
  | "asked_linyun_weld"
  | "asked_chen_prosthetic"
  | "inspected_bridge_minerva_v"
  | "talked_vaughn"
  | "checked_accord_cabinet";

export interface SideQuestSnapshotItem {
  readonly id: SideQuestId;
  readonly title: string;
  readonly sectorHint: string;
  readonly summary: string;
  readonly rewardLabel: string;
  readonly status: SideQuestStatus;
  readonly currentStepText: string;
  readonly doneCount: number;
  readonly totalSteps: number;
}

export class SideQuestSystem {
  private readonly flags = new Set<SideQuestFlag>();
  private readonly quests = new Map<SideQuestId, SideQuestRecord>();

  constructor() {
    this.seedQuests();
  }

  private seedQuests(): void {
    const list: SideQuestRecord[] = [
      {
        id: "ailin_memory",
        title: "陈艾琳缺失的记忆碎片",
        sectorHint: "第七神经康复中心（原 C-7）",
        summary: "陈艾琳在 2488 年事件中因抗衡弥涅瓦-A 而损伤部分长期记忆，协助她拼回「唤醒 V、不要融合」的残片。",
        rewardLabel: "手抄认知脉冲笔记（科学终端 +8%）",
        rewardXp: 150,
        status: "unstarted",
        steps: [
          { id: "talked_ailin", label: "在 C-7 与陈艾琳对话了解失忆现状", done: false },
          { id: "checked_ward_bed", label: "探访康复病房受试者或病床恢复记录", done: false },
          { id: "decoded_fifth_protocol", label: "查验或解码「第五协议校验隔离终端」", done: false },
          { id: "reported_ailin", label: "将康复进度回报给陈艾琳", done: false }
        ]
      },
      {
        id: "mna01_archives",
        title: "MNA-01 的日常与卡戎号疑云",
        sectorHint: "远望号历史档案馆",
        summary: "弥涅瓦-A 已被登记为特殊数字船员 MNA-01。查看它在档案馆的工作与《和平号》留存的卡戎号遇袭证言。",
        rewardLabel: "九舰史料整理芯片（话术交涉 +8%）",
        rewardXp: 160,
        status: "unstarted",
        steps: [
          { id: "talked_archivist_lin", label: "与档案馆管理员林文确认 MNA-01 权限", done: false },
          { id: "checked_mna01_desk", label: "查验「MNA-01 研究员公共工作席」日志", done: false },
          { id: "examined_charon_file", label: "阅览「和平号移交：卡戎号遇袭目击卷宗」", done: false }
        ]
      },
      {
        id: "l1_scars",
        title: "L-1 的旧焊痕与无义体船员",
        sectorHint: "L-1 农业模块 ↔ 医疗中心",
        summary: "追查 2488 年船长叫停分离时留下的 L-1 焊封止动栓，核实远望号「无植入式义体」编制的来历。",
        rewardLabel: "L-1 植物凝胶修护包（+50 HP / -60 热应激）",
        rewardXp: 150,
        status: "unstarted",
        steps: [
          { id: "inspected_l1_weld", label: "检视 L-1 气闸走廊的「2488 应急分离焊封止动栓」", done: false },
          { id: "asked_linyun_weld", label: "向生态农艺师林芸询问当年封焊细节", done: false },
          { id: "asked_chen_prosthetic", label: "向医疗中心陈医生确认全船无义体生理档案", done: false }
        ]
      },
      {
        id: "vaughn_oversight",
        title: "沃恩、弥涅瓦-V 与凯恩的旧约",
        sectorHint: "舰桥 ↔ 远望号历史档案馆",
        summary: "了解前首席任务官伊莱亚斯·沃恩与弥涅瓦-V 的双监督运作，以及当年人类主权联盟指挥官凯恩促成《守望协定》的秘辛。",
        rewardLabel: "凯恩的黄铜怀表纪念扣（警觉洞察 +8%）",
        rewardXp: 180,
        status: "unstarted",
        steps: [
          { id: "inspected_bridge_minerva_v", label: "查阅舰桥「弥涅瓦-V · 主舰双监督审计台」", done: false },
          { id: "talked_vaughn", label: "与船长顾问伊莱亚斯·沃恩交谈", done: false },
          { id: "checked_accord_cabinet", label: "调阅档案馆《太阳系七年战争与守望协定档案柜》", done: false }
        ]
      }
    ];

    for (const q of list) {
      this.quests.set(q.id, q);
    }
  }

  hasFlag(flag: SideQuestFlag): boolean {
    return this.flags.has(flag);
  }

  /**
   * Records a flag and automatically syncs quest step completion.
   * Returns newly transitioned `{ activated, completed }` quest records so callers
   * can grant XP/items cleanly and avoid duplicate rewards.
   */
  recordFlag(flag: SideQuestFlag): {
    activated: SideQuestRecord[];
    completed: SideQuestRecord[];
  } {
    const activated: SideQuestRecord[] = [];
    const completed: SideQuestRecord[] = [];
    if (this.flags.has(flag)) {
      return { activated, completed };
    }

    this.flags.add(flag);

    for (const q of this.quests.values()) {
      const step = q.steps.find((s) => s.id === flag);
      if (!step) continue;

      step.done = true;

      if (q.status === "unstarted") {
        q.status = "active";
        activated.push(q);
      }

      if (q.status === "active" && q.steps.every((s) => s.done)) {
        q.status = "completed";
        completed.push(q);
      }
    }

    return { activated, completed };
  }

  canReportAilin(): boolean {
    return (
      this.flags.has("talked_ailin") &&
      this.flags.has("checked_ward_bed") &&
      this.flags.has("decoded_fifth_protocol") &&
      !this.flags.has("reported_ailin")
    );
  }

  get(id: SideQuestId): SideQuestRecord {
    const q = this.quests.get(id);
    if (!q) throw new Error(`Unknown side quest: ${id}`);
    return q;
  }

  all(): readonly SideQuestRecord[] {
    return Array.from(this.quests.values());
  }

  completedCount(): number {
    let n = 0;
    for (const q of this.quests.values()) {
      if (q.status === "completed") n++;
    }
    return n;
  }

  snapshot(): SideQuestSnapshotItem[] {
    return this.all().map((q) => {
      const doneCount = q.steps.filter((s) => s.done).length;
      const nextStep = q.steps.find((s) => !s.done);
      return {
        id: q.id,
        title: q.title,
        sectorHint: q.sectorHint,
        summary: q.summary,
        rewardLabel: q.rewardLabel,
        status: q.status,
        currentStepText:
          q.status === "completed"
            ? `已完成（奖励：${q.rewardLabel}）`
            : q.status === "unstarted"
            ? `未触发 · ${q.sectorHint}`
            : nextStep?.label ?? q.summary,
        doneCount,
        totalSteps: q.steps.length
      };
    });
  }
}
