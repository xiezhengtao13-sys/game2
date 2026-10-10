export interface DutyTask {
  id: string;
  title: string;
  targetLabel: string;
  desc: string;
  completed: boolean;
}

/**
 * Routine maintenance duty system for low-ranking crew members aboard Yuanwang.
 *
 * Grounded in the setting document: the player is not the captain or a chosen one;
 * they are working crew tasked with physical inspection duties.
 */
export class DutySystem {
  readonly tasks: DutyTask[] = [
    {
      id: "power",
      title: "核对动力席散热翼读数",
      targetLabel: "动力席",
      desc: "前往动力席记录第一回路散热翼展开角度与反应堆指标",
      completed: false
    },
    {
      id: "switch",
      title: "检查右舷应急开关锁定销",
      targetLabel: "机械应急开关",
      desc: "前往右舷检查机械应急开关的手动安全防护锁闭销",
      completed: false
    },
    {
      id: "plant",
      title: "为人员席角落绿植浇水",
      targetLabel: "绿植",
      desc: "为舰桥人员席旁干渴缺水的盆栽补充水分",
      completed: false
    },
    {
      id: "report",
      title: "向舰长出示巡检单结签",
      targetLabel: "舰长",
      desc: "三项日常巡检完成后，向舰长汇报值班记录单",
      completed: false
    }
  ];

  complete(id: string): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (task && !task.completed) {
      task.completed = true;
      return true;
    }
    return false;
  }

  isInspectionDone(): boolean {
    return this.tasks.filter((t) => t.id !== "report").every((t) => t.completed);
  }

  isAllCompleted(): boolean {
    return this.tasks.every((t) => t.completed);
  }

  get completedCount(): number {
    return this.tasks.filter((t) => t.completed).length;
  }

  get totalCount(): number {
    return this.tasks.length;
  }
}
