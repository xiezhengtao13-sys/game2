/**
 * Chapter 1 Deep-Space Thermal Runaway Crisis System (第一章深空热失控排险系统)
 *
 * Grounded in docs/设定集.md:
 *   - "微碎片穿透擦伤，尾部主散热翼在 42° 展开角上液压锁死"
 *   - "两座聚变反应堆废热无法排入真空，12,408 名休眠者面临维生断电解冻"
 *   - "不依赖华丽交互界面，底层船员在现场用双手旋转实体泄压阀、扳动应急杠杆"
 */

export type CrisisStage =
  | "routine"       // 阶段0：日常例行巡检（和平时期）
  | "anomaly"       // 阶段1：管损特级警报拉响，散热翼锁死
  | "eva_gear"      // 阶段2：前往穿梭机机库换装重型防热工程服
  | "valve_vent"    // 阶段3：深入最南端动力排险泵房手动逆时针旋转泄压转轮
  | "eject_lever"   // 阶段4：拔出安全插销，扳动副散热翼机械强制展开杠杆
  | "resolved";     // 阶段5：危机排除，全舰恢复稳定，第一章圆满结案

export interface CrisisObjective {
  id: string;
  title: string;
  hint: string;
  done: boolean;
}

export class CrisisSystem {
  private _stage: CrisisStage = "routine";

  get stage(): CrisisStage {
    return this._stage;
  }

  get isAlarmActive(): boolean {
    return this._stage !== "routine" && this._stage !== "resolved";
  }

  get isResolved(): boolean {
    return this._stage === "resolved";
  }

  /** Current urgent objective for the HUD. */
  get currentObjective(): CrisisObjective | null {
    switch (this._stage) {
      case "anomaly":
        return {
          id: "report_captain",
          title: "返回舰桥听取应急调度指令",
          hint: "舰桥领航员正在广播特级管损警报，前往舰桥了解险情",
          done: false
        };
      case "eva_gear":
        return {
          id: "equip_eva",
          title: "前往机库更衣架穿戴重型防热服",
          hint: "中央交通站南侧的穿梭机机库备勤架上有隔热工装",
          done: false
        };
      case "valve_vent":
        return {
          id: "vent_valve",
          title: "前往动力泵房手动旋转泄压转轮",
          hint: "穿过医疗区到达最南端动力排险泵房，逆时针泄放旁路气压",
          done: false
        };
      case "eject_lever":
        return {
          id: "eject_lever",
          title: "拔出安全栓，扳动副散热翼展开杠杆",
          hint: "动力泵房东侧的机械击发箱，强制弹开卡死的副散热翼",
          done: false
        };
      case "resolved":
        return {
          id: "all_clear",
          title: "危机已排除 · 第一章完成",
          hint: "副散热翼已强制展开，前往舰桥弧形大屏查看新星系星图",
          done: true
        };
      default:
        return null;
    }
  }

  triggerAlarm(): boolean {
    if (this._stage === "routine") {
      this._stage = "anomaly";
      return true;
    }
    return false;
  }

  advanceToEva(): boolean {
    if (this._stage === "anomaly") {
      this._stage = "eva_gear";
      return true;
    }
    return false;
  }

  equipEvaSuit(): boolean {
    if (this._stage === "eva_gear") {
      this._stage = "valve_vent";
      return true;
    }
    return false;
  }

  ventCoolantValve(): boolean {
    if (this._stage === "valve_vent") {
      this._stage = "eject_lever";
      return true;
    }
    return false;
  }

  pullEjectionLever(): boolean {
    if (this._stage === "eject_lever") {
      this._stage = "resolved";
      return true;
    }
    return false;
  }
}
