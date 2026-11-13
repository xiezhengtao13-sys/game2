import type { Place } from "../map/shipMap";

export type ClearanceLevel =
  | "midship_pass"
  | "crisis_override"
  | "bridge_pass"
  | "captain_auth";

export interface SecurityGate {
  id: string;
  name: string;
  requiredClearance: ClearanceLevel;
  badgeText: string;
  denyReason: string;
  hint: string;
  /** World tile coordinates covered by the physical motorized blast door. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  orientation: "horizontal" | "vertical";
}

/**
 * Physical bulkhead security clearances across the 2,800m Yuanwang colony ship.
 *
 * At the start of Shift 2, a low-ranking crewman only has physical access to the
 * lower Crew Habitat and the L-2 Industrial Bay. All upper sectors, Bridge,
 * Hangar/Reactor, and especially the Captain's Stateroom are sealed behind
 * physical card-locked blast doors that reject movement, pathfinding, and
 * maglev transit until unlocked through story progression.
 */
export const SECURITY_GATES: readonly SecurityGate[] = [
  {
    id: "gate_midship",
    name: "北向中层穿梭气闸",
    requiredClearance: "midship_pass",
    badgeText: "权限锁定 · 需中层通行条",
    denyReason: "【门禁权限拒绝】气闸刷卡器闪烁红光：『基层工勤二班仅授权生活区与 L-2 车间区域。前往中层干线及各殖民模块需班长签发【中层通行条】』。",
    hint: "请先完成生活区水循环核查与 L-2 机械臂巡检，再向老周领取中层通行权限。",
    x0: 40,
    y0: 91,
    x1: 43,
    y1: 91,
    orientation: "horizontal"
  },
  {
    id: "gate_science",
    name: "R-2 深空科研气闸",
    requiredClearance: "midship_pass",
    badgeText: "权限锁定 · 需中层/科研通行",
    denyReason: "【气密隔断锁定】电子锁提示：『R-2 光谱与精密科研实验舱实行白区洁净管理，当前仅限持有中层以上通行授权的巡检人员进入』。",
    hint: "请先完成下层巡检并向老周领取【中层通行条】。",
    x0: 57,
    y0: 101,
    x1: 57,
    y1: 103,
    orientation: "vertical"
  },
  {
    id: "gate_medical",
    name: "南向休眠医疗隔离闸门",
    requiredClearance: "midship_pass",
    badgeText: "权限锁定 · 需中层通行条",
    denyReason: "【低温区隔离】气闸警灯长亮：『前方为 12,408 名拓荒者休眠监视区，非值班授权巡检工禁止擅入』。",
    hint: "完成生活区与 L-2 车间初级巡检后向老周领取【中层通行条】即可解锁。",
    x0: 40,
    y0: 113,
    x1: 43,
    y1: 113,
    orientation: "horizontal"
  },
  {
    id: "gate_hangar_aft",
    name: "后部高危动力区隔离重闸",
    requiredClearance: "crisis_override",
    badgeText: "高压密封 · 需损管应急权限",
    denyReason: "【重型水密闸锁死】警示牌写着：『1850-2800m 机库与聚变推进区属高能热辐射工段，平时对常规班次封闭，仅在特级损管动员时开放』。",
    hint: "请先协助老周完成下/中层例行巡检汇总，待应急状态触发后自动放行。",
    x0: 40,
    y0: 139,
    x1: 43,
    y1: 139,
    orientation: "horizontal"
  },
  {
    id: "gate_bridge",
    name: "舰首指挥中枢防暴门",
    requiredClearance: "bridge_pass",
    badgeText: "二级军官权限 · 严禁工勤擅入",
    denyReason: "【指挥中枢警卫限制】门禁语音冷峻响起：『前方为前向探测廊及舰桥核心指挥席，普通工勤人员严禁入内！未经特批靠近者按违纪论处』。",
    hint: "需先解决第一章底层聚变散热危机，获得指挥层特别外勤授命后方可踏入舰桥。",
    x0: 40,
    y0: 63,
    x1: 43,
    y1: 63,
    orientation: "horizontal"
  },
  {
    id: "gate_cabin",
    name: "舰长私人舱室生物认证锁",
    requiredClearance: "captain_auth",
    badgeText: "舰长三级生物私钥 · 绝对禁区",
    denyReason: "【最高等级生物识别锁】厚重钛合金舱门纹丝不动：『舰长私人办公暨起居舱室——没有舰长亲授的三级生物密钥与深空功勋授权，全船无人可入』。",
    hint: "仅在立下特等功勋（驾驶开拓者一号完成远境-IV勘测并平安返航归舰后）方有机会获准进入。",
    x0: 42,
    y0: 43,
    x1: 43,
    y1: 43,
    orientation: "horizontal"
  }
];

export const CLEARANCE_LABELS: Record<ClearanceLevel, string> = {
  midship_pass: "中层穿梭与殖民模块通行卡",
  crisis_override: "特级损管机舱应急放行码",
  bridge_pass: "舰桥核心指挥区特别准入令",
  captain_auth: "舰长三级私人生物密钥"
};

export class SecuritySystem {
  private readonly clearances = new Set<ClearanceLevel>();
  private readonly gateByTileKey = new Map<string, SecurityGate>();

  constructor() {
    for (const gate of SECURITY_GATES) {
      for (let ty = gate.y0; ty <= gate.y1; ty++) {
        for (let tx = gate.x0; tx <= gate.x1; tx++) {
          this.gateByTileKey.set(`${tx},${ty}`, gate);
        }
      }
    }
  }

  hasClearance(level: ClearanceLevel): boolean {
    return this.clearances.has(level);
  }

  grant(level: ClearanceLevel): boolean {
    if (this.clearances.has(level)) return false;
    this.clearances.add(level);
    return true;
  }

  grantedList(): ClearanceLevel[] {
    return Array.from(this.clearances);
  }

  isGateOpen(gate: SecurityGate): boolean {
    return this.clearances.has(gate.requiredClearance);
  }

  gateAtTile(tx: number, ty: number): SecurityGate | null {
    return this.gateByTileKey.get(`${tx},${ty}`) ?? null;
  }

  isTileBlocked(tx: number, ty: number): boolean {
    const gate = this.gateAtTile(tx, ty);
    if (!gate) return false;
    return !this.isGateOpen(gate);
  }

  gates(): readonly SecurityGate[] {
    return SECURITY_GATES;
  }

  /** Whether fast-travel maglev stations in a target sector are legally accessible right now. */
  canAccessPlace(place: Place): boolean {
    switch (place) {
      case "crew_habitat":
      case "industrial_bay":
        return true;
      case "transit_hub":
      case "agri_module":
      case "ring_module":
      case "science_lab":
      case "medical_bay":
        return this.hasClearance("midship_pass");
      case "hangar_bay":
      case "reactor_bay":
      case "propulsion_aft":
        return this.hasClearance("crisis_override");
      case "bridge":
      case "fore_sensors":
      case "transit_corridor":
        return this.hasClearance("bridge_pass");
      case "cabin":
      case "passage":
        return this.hasClearance("captain_auth");
      default:
        return false;
    }
  }
}
