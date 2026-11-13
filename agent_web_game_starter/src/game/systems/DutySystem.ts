export type DutyPhase = "lower" | "mid" | "bridge" | "complete";

export interface DutyTask {
  id: string;
  phase: Exclude<DutyPhase, "complete">;
  title: string;
  targetLabel: string;
  desc: string;
  completed: boolean;
}

/**
 * Phased routine duty progression for a low-ranking Shift-2 crew member aboard Yuanwang.
 *
 * Progression respects the realistic ship hierarchy from docs/设定集.md:
 *   Phase 1 (lower) : Restricted to Crew Habitat + L-2 Industrial Bay until Lao Zhou issues a Midship Pass.
 *   Phase 2 (mid)   : Checks L-1 Agri cooling manifold, R-2 Science dust readings, and Cryo Bay telemetry;
 *                     reporting back triggers Chapter 1 Thermal Runaway + Aft Reactor/Hangar override.
 *   Phase 3 (bridge): Only unlocked AFTER resolving the reactor crisis and earning Bridge commendation.
 */
export class DutySystem {
  readonly tasks: DutyTask[] = [
    // --- Phase 1: Lower Restricted Sectors (Crew Habitat + L-2 Workshop) ---
    {
      id: "water",
      phase: "lower",
      title: "核对生活区水循环净化指标",
      targetLabel: "水循环监测阀台",
      desc: "前往生活区东侧检修点核查二级水净化流量",
      completed: false
    },
    {
      id: "workshop",
      phase: "lower",
      title: "检查 L-2 机械臂液压装配台",
      targetLabel: "机械臂液压装配台",
      desc: "从西侧穿行进入 L-2 重工业车间，测试液压装配臂压力表",
      completed: false
    },
    {
      id: "report_lower",
      phase: "lower",
      title: "向老周申领【中层穿梭通行卡】",
      targetLabel: "轮机检修员",
      desc: "底层两项初检完毕后，找二班班长老周签批中层气闸权限",
      completed: false
    },

    // --- Phase 2: Mid-Ship & Colonial Modules ---
    {
      id: "agri",
      phase: "mid",
      title: "巡查 L-1 农业生态散热分流阀",
      targetLabel: "L-1 生态散热分流总阀",
      desc: "穿过中央站台西侧气闸进入 L-1 农业区，排查冷却分流异常",
      completed: false
    },
    {
      id: "radar",
      phase: "mid",
      title: "记录 R-2 微陨石光学预警读数",
      targetLabel: "深空光谱折射测绘台",
      desc: "前往生活区东侧 R-2 科研实验舱，读取高灵敏尘埃碰撞预警",
      completed: false
    },
    {
      id: "cryo",
      phase: "mid",
      title: "核查 12,408 名休眠者稳态",
      targetLabel: "休眠生理监测终端",
      desc: "前往医疗区确认南向休眠母线温度和低温压差",
      completed: false
    },
    {
      id: "report_mid",
      phase: "mid",
      title: "向老周汇总异常报告（危机前夕）",
      targetLabel: "轮机检修员",
      desc: "带着三份异常巡检记录找老周复核，查明微碎片撞击隐患",
      completed: false
    },

    // --- Phase 3: Command Bridge Commendation Duty (Unlocked post-Crisis) ---
    {
      id: "power",
      phase: "bridge",
      title: "复核舰桥动力席散热翼角度",
      targetLabel: "动力席",
      desc: "凭指挥区通行令前往舰桥动力席确认主副散热翼平衡参数",
      completed: false
    },
    {
      id: "switch",
      phase: "bridge",
      title: "检查舰桥右舷应急开关锁定销",
      targetLabel: "机械应急开关",
      desc: "前往右舷检查机械应急开关的手动安全防护锁闭销",
      completed: false
    },
    {
      id: "plant",
      phase: "bridge",
      title: "为舰桥人员席角落绿植浇水",
      targetLabel: "绿植",
      desc: "为舰桥人员席旁干渴缺水的盆栽补充水分",
      completed: false
    },
    {
      id: "report_bridge",
      phase: "bridge",
      title: "向舰长呈递外勤与科研出港简报",
      targetLabel: "舰长",
      desc: "巡检无误后向舰长室门外或指挥席的舰长汇报情况",
      completed: false
    }
  ];

  private unlockedBridgePhase = false;

  unlockBridgePhase(): void {
    this.unlockedBridgePhase = true;
  }

  complete(id: string): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (task && !task.completed) {
      task.completed = true;
      return true;
    }
    return false;
  }

  get phase(): DutyPhase {
    const lowerDone = this.tasks.filter((t) => t.phase === "lower").every((t) => t.completed);
    if (!lowerDone) return "lower";
    const midDone = this.tasks.filter((t) => t.phase === "mid").every((t) => t.completed);
    if (!midDone) return "mid";
    const bridgeDone = this.tasks.filter((t) => t.phase === "bridge").every((t) => t.completed);
    if (!bridgeDone) return "bridge";
    return "complete";
  }

  get phaseTitle(): string {
    switch (this.phase) {
      case "lower":
        return "阶段一 · 底层当班巡检（权限受限）";
      case "mid":
        return "阶段二 · 中层模块化例行巡查";
      case "bridge":
        return this.unlockedBridgePhase ? "阶段三 · 指挥区外勤复核" : "底层应急战备 · 排除散热危机";
      case "complete":
        return "全舰值班档案已全部结签";
    }
  }

  get visibleTasks(): DutyTask[] {
    const p = this.phase;
    if (p === "complete") return this.tasks.filter((t) => t.phase === "bridge");
    return this.tasks.filter((t) => t.phase === p);
  }

  isLowerTasksDone(): boolean {
    return this.tasks
      .filter((t) => t.phase === "lower" && t.id !== "report_lower")
      .every((t) => t.completed);
  }

  isMidTasksDone(): boolean {
    return this.tasks
      .filter((t) => t.phase === "mid" && t.id !== "report_mid")
      .every((t) => t.completed);
  }

  isBridgeTasksDone(): boolean {
    return this.tasks
      .filter((t) => t.phase === "bridge" && t.id !== "report_bridge")
      .every((t) => t.completed);
  }

  isInspectionDone(): boolean {
    return this.isLowerTasksDone() && this.isMidTasksDone();
  }

  isAllCompleted(): boolean {
    return this.tasks.every((t) => t.completed);
  }

  get completedCount(): number {
    return this.visibleTasks.filter((t) => t.completed).length;
  }

  get totalCount(): number {
    return this.visibleTasks.length;
  }
}
