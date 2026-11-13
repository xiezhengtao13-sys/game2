/**
 * Classic Fallout 1/2-inspired S.P.E.C.I.A.L., Skills, Survival Vitals,
 * Inventory, CRT Console Log, and Floating World Feedback.
 *
 * Strictly pure TypeScript (zero DOM calls) so every RPG calculation, skill
 * check, XP curve, and inventory state transition runs deterministically in
 * Node automated tests.
 */

export type SpecialKey = "str" | "per" | "end" | "cha" | "int" | "agi" | "lck";
export type SkillKey = "repair" | "science" | "speech" | "perception";
export type ArchetypeId = "veteran" | "archivist" | "fixer";
export type ActionMode = "interact" | "inspect" | "repair" | "science" | "speech";

export type SpecialStats = Record<SpecialKey, number>;

export interface ArchetypeDef {
  readonly id: ArchetypeId;
  readonly name: string;
  readonly traitName: string;
  readonly traitDesc: string;
  readonly stats: SpecialStats;
  readonly skillBonuses: Partial<Record<SkillKey, number>>;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  veteran: {
    id: "veteran",
    name: "二班老手 · 铁钳技工",
    traitName: "【特质：老茧机修】",
    traitDesc: "三十年老船上的硬派工勤。机械工程 +14%，耐热抗压体质（最大HP +12），随身多备一套急救包。",
    stats: { str: 7, per: 6, end: 7, cha: 4, int: 6, agi: 5, lck: 5 },
    skillBonuses: { repair: 14 }
  },
  archivist: {
    id: "archivist",
    name: "离线译码员 · 档案学徒",
    traitName: "【特质：终端洁癖】",
    traitDesc: "痴迷实体星图与冷门离线数据库。科学终端 +15%，警觉洞察 +8%，起步极易发觉隐藏档案。",
    stats: { str: 4, per: 7, end: 5, cha: 5, int: 8, agi: 6, lck: 5 },
    skillBonuses: { science: 15, perception: 8 }
  },
  fixer: {
    id: "fixer",
    name: "甲板说客 · 轨道协调员",
    traitName: "【特质：全舰人脉】",
    traitDesc: "熟稔各模块脾气与调度暗语。话术交涉 +16%，最大 AP +2，更容易说服舰桥军官与乘员。",
    stats: { str: 5, per: 6, end: 5, cha: 8, int: 6, agi: 6, lck: 4 },
    skillBonuses: { speech: 16 }
  }
};

export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly category: "gear" | "consumable" | "quest" | "intel";
  readonly desc: string;
  readonly bonusDesc?: string;
  quantity: number;
  equipped?: boolean;
}

export interface LogEntry {
  readonly id: number;
  readonly tick: string;
  readonly kind: "system" | "check_ok" | "check_fail" | "loot" | "warn" | "xp";
  readonly text: string;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface SkillCheckResult {
  readonly ok: boolean;
  readonly chance: number;
  readonly roll: number;
  readonly skillValue: number;
  readonly firstCompletion: boolean;
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  repair: "机械工程 Repair",
  science: "科学终端 Science",
  speech: "话术交涉 Speech",
  perception: "警觉洞察 Perception"
};

export const SPECIAL_LABELS: Record<SpecialKey, { code: string; name: string; desc: string }> = {
  str: { code: "ST", name: "力量", desc: "影响机械扳动蛮力与机械技能" },
  per: { code: "PE", name: "感知", desc: "决定警觉洞察与细微异响侦测" },
  end: { code: "EN", name: "耐力", desc: "决定最大生命值与高温脱水/热应激耐受" },
  cha: { code: "CH", name: "魅力", desc: "决定话术说服舰桥与人员效率" },
  int: { code: "IN", name: "智力", desc: "大幅影响科学解码与升级技能点" },
  agi: { code: "AG", name: "敏捷", desc: "决定最大行动点数 AP 与应急身手" },
  lck: { code: "LK", name: "运气", desc: "全面微幅提升所有技能检定与暴击率" }
};

export class RpgSystem {
  archetypeId: ArchetypeId = "veteran";
  stats: SpecialStats = { ...ARCHETYPES.veteran.stats };
  allocatedSkills: Record<SkillKey, number> = {
    repair: 0,
    science: 0,
    speech: 0,
    perception: 0
  };

  level = 1;
  xp = 0;
  skillPoints = 20; // Fallout starting spendable points so build customization works immediately

  hp = 120;
  maxHp = 120;
  ap = 10;
  maxAp = 10;
  rad = 0; // Internal thermal strain index (0..100%)

  activeMode: ActionMode = "interact";

  readonly items = new Map<string, InventoryItem>();
  readonly completedChecks = new Set<string>();
  readonly logs: LogEntry[] = [];
  readonly floatingTexts: FloatingText[] = [];

  private logSeq = 1;
  private hazardCooldown = 0;

  constructor(initialArchetype: ArchetypeId = "veteran") {
    this.seedInitialInventory();
    this.applyArchetype(initialArchetype, true);
    this.pushLog("system", "系统自检完毕。远望号第二班工程终端离线挂载中——鼠标左键移动/交互，右键或底栏切换技能动作。");
    this.pushLog("system", "当前可按 [Tab] 随时打开《工勤个人终端》分配 20 点初始技能点数或切换履历专精。");
  }

  private seedInitialInventory(): void {
    this.items.clear();
    this.addItem({
      id: "shift_roster",
      name: "二班手抄巡检单",
      icon: "📋",
      category: "quest",
      desc: "老周手写的当班巡检夹板，记录了动力席、应急开关与绿植位置。",
      quantity: 1
    });
    this.addItem({
      id: "diagnostic_slate",
      name: "离线信号解码板",
      icon: "📟",
      category: "gear",
      desc: "加装老式铜芯探头的便携逻辑分析仪。",
      bonusDesc: "科学终端 +6%",
      quantity: 1,
      equipped: true
    });
    this.addItem({
      id: "med_stim",
      name: "舰载创伤急救包",
      icon: "🩹",
      category: "consumable",
      desc: "远望号工勤标准应急医疗包，内含低温水凝胶烫伤敷料与口服补液盐，用于处理高温灼伤与热应激。",
      bonusDesc: "使用恢复 +40 HP / 缓解 -50 热应激",
      quantity: 2
    });
  }

  /** Switch starting background while still early in duty (level 1 & no checks completed yet, or force reset). */
  canSwitchArchetype(): boolean {
    return this.level === 1 && this.xp === 0;
  }

  applyArchetype(id: ArchetypeId, silent = false): boolean {
    const def = ARCHETYPES[id];
    this.archetypeId = id;
    this.stats = { ...def.stats };
    this.allocatedSkills = { repair: 0, science: 0, speech: 0, perception: 0 };
    this.skillPoints = 20;
    this.maxHp = 80 + this.stats.end * 4 + (id === "veteran" ? 12 : 0);
    this.hp = this.maxHp;
    this.maxAp = 6 + Math.floor(this.stats.agi * 0.8) + (id === "fixer" ? 2 : 0);
    this.ap = this.maxAp;

    const stim = this.items.get("med_stim");
    if (stim) stim.quantity = id === "veteran" ? 3 : 2;

    if (!silent) {
      this.pushLog("system", `已切换个人履历：【${def.name}】 ${def.traitName}`);
    }
    return true;
  }

  investSkillPoint(skill: SkillKey, amount = 5): boolean {
    const spend = Math.min(amount, this.skillPoints);
    if (spend <= 0) return false;
    if (this.getSkill(skill) >= 99) return false;
    this.allocatedSkills[skill] += spend;
    this.skillPoints -= spend;
    this.pushLog("system", `强化专长：${SKILL_LABELS[skill]} +${spend}% (剩余技能点: ${this.skillPoints})`);
    return true;
  }

  getSkill(skill: SkillKey): number {
    const s = this.stats;
    const arch = ARCHETYPES[this.archetypeId].skillBonuses[skill] ?? 0;
    const lckBonus = Math.floor(s.lck / 2);

    let base = 20;
    if (skill === "repair") {
      base = 20 + s.str * 3 + s.int * 2 + lckBonus;
    } else if (skill === "science") {
      base = 20 + s.int * 4 + s.per * 1 + lckBonus;
    } else if (skill === "speech") {
      base = 18 + s.cha * 4 + s.int * 1 + lckBonus;
    } else if (skill === "perception") {
      base = 22 + s.per * 4 + s.lck * 1;
    }

    // Item passive bonuses
    let itemBonus = 0;
    if (skill === "science" && this.hasItem("diagnostic_slate")) itemBonus += 6;
    if (skill === "repair" && this.hasItem("wrench_heavy")) itemBonus += 15;
    if (skill === "speech" && this.hasItem("captain_cipher")) itemBonus += 10;
    if (skill === "science" && this.hasItem("kaiyang_cipher")) itemBonus += 8;

    return Math.max(5, Math.min(99, base + arch + this.allocatedSkills[skill] + itemBonus));
  }

  checkChance(skill: SkillKey, difficulty: number): number {
    const val = this.getSkill(skill);
    // Classic Fallout style probability: base skill vs difficulty threshold
    return Math.max(5, Math.min(95, 50 + val - difficulty));
  }

  attemptSkillCheck(
    checkId: string,
    skill: SkillKey,
    difficulty: number,
    xpReward: number,
    anchorX?: number,
    anchorY?: number,
    fixedRoll?: number
  ): SkillCheckResult {
    const skillValue = this.getSkill(skill);
    const chance = this.checkChance(skill, difficulty);
    const roll = fixedRoll ?? Math.floor(Math.random() * 100) + 1;
    const ok = roll <= chance;
    const firstCompletion = ok && !this.completedChecks.has(checkId);

    if (ok) {
      this.completedChecks.add(checkId);
      this.pushLog(
        "check_ok",
        `[${SKILL_LABELS[skill].split(" ")[0]} 检定 ${chance}%] 判定成功 (骰点 ${roll})！`
      );
      if (anchorX !== undefined && anchorY !== undefined) {
        this.spawnFloatingText(anchorX, anchorY - 46, `✓ ${SKILL_LABELS[skill].split(" ")[0]}成功`, "#4ade80");
      }
      if (firstCompletion && xpReward > 0) {
        this.grantXp(xpReward, undefined, anchorX, anchorY);
      }
    } else {
      this.pushLog(
        "check_fail",
        `[${SKILL_LABELS[skill].split(" ")[0]} 检定 ${chance}%] 操作失手 (骰点 ${roll} > ${chance})。可提升技能或更换思路！`
      );
      if (anchorX !== undefined && anchorY !== undefined) {
        this.spawnFloatingText(anchorX, anchorY - 46, `✗ ${SKILL_LABELS[skill].split(" ")[0]}失败`, "#f87171");
      }
    }

    return { ok, chance, roll, skillValue, firstCompletion };
  }

  get xpForNextLevel(): number {
    return this.level * 250;
  }

  grantXp(amount: number, reason?: string, anchorX?: number, anchorY?: number): void {
    if (amount <= 0) return;
    this.xp += amount;
    this.pushLog("xp", `+${amount} 经验值${reason ? ` (${reason})` : ""}`);
    if (anchorX !== undefined && anchorY !== undefined) {
      this.spawnFloatingText(anchorX, anchorY - 64, `+${amount} XP`, "#facc15");
    }

    while (this.xp >= this.xpForNextLevel) {
      this.xp -= this.xpForNextLevel;
      this.level++;
      const pts = 12 + Math.floor(this.stats.int / 2);
      this.skillPoints += pts;
      this.maxHp += 15;
      this.hp = this.maxHp;
      this.rad = Math.max(0, this.rad - 20);
      this.pushLog("xp", `>>> 等级提升 Lv.${this.level}！最大生命值提升至 ${this.maxHp}，获得 ${pts} 点技能点 (按 [Tab] 分配)！`);
    }
  }

  addItem(item: Omit<InventoryItem, "quantity"> & { quantity?: number }, anchorX?: number, anchorY?: number): void {
    const qty = item.quantity ?? 1;
    const existing = this.items.get(item.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.set(item.id, { ...item, quantity: qty });
    }
    if (qty > 0 && this.logs.length > 0) {
      this.pushLog("loot", `获得物品：【${item.name}】 x${qty}`);
      if (anchorX !== undefined && anchorY !== undefined) {
        this.spawnFloatingText(anchorX, anchorY - 58, `+ ${item.name}`, "#38bdf8");
      }
    }
  }

  hasItem(id: string): boolean {
    const item = this.items.get(id);
    return !!item && item.quantity > 0;
  }

  useItem(id: string, anchorX?: number, anchorY?: number): boolean {
    const item = this.items.get(id);
    if (!item || item.quantity <= 0) return false;

    if (id === "med_stim") {
      item.quantity -= 1;
      const prevHp = this.hp;
      const prevRad = this.rad;
      this.hp = Math.min(this.maxHp, this.hp + 40);
      this.rad = Math.max(0, this.rad - 50);
      const healed = this.hp - prevHp;
      const purged = prevRad - this.rad;
      this.pushLog("loot", `使用【舰载创伤急救包】：生命 +${healed} (${this.hp}/${this.maxHp})，热应激降温 -${purged} (余 ${item.quantity} 份)`);
      if (anchorX !== undefined && anchorY !== undefined) {
        this.spawnFloatingText(anchorX, anchorY - 40, `+${healed} HP / -${purged} 热应激`, "#34d399");
      }
      return true;
    }
    return false;
  }

  damage(hpLoss: number, radGain = 0, reason?: string, anchorX?: number, anchorY?: number): void {
    const actualHp = Math.max(1, hpLoss);
    this.hp = Math.max(5, this.hp - actualHp);
    this.rad = Math.min(1000, this.rad + radGain);
    this.pushLog("warn", `${reason ?? "受到环境伤害"}：HP -${actualHp}${radGain > 0 ? `, 热应激 +${radGain}` : ""}`);
    if (anchorX !== undefined && anchorY !== undefined) {
      this.spawnFloatingText(anchorX, anchorY - 40, `-${actualHp} HP`, "#ef4444");
    }
  }

  spendAp(cost: number): boolean {
    if (this.ap < cost) return false;
    this.ap -= cost;
    return true;
  }

  update(dt: number, inHotZone: boolean, isSuitEquipped: boolean, playerX?: number, playerY?: number): void {
    // Smooth AP regeneration
    this.ap = Math.min(this.maxAp, this.ap + dt * 1.45);

    // Floating world texts drift upward and fade
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life += dt;
      f.y += f.vy * dt;
      if (f.life >= f.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Environmental high-heat hazard in unshielded reactor pump room
    if (inHotZone) {
      this.hazardCooldown -= dt;
      if (this.hazardCooldown <= 0) {
        this.hazardCooldown = 3.0;
        const resist = isSuitEquipped ? 0.85 : Math.min(0.45, this.stats.end * 0.04);
        const radDelta = Math.max(1, Math.round(14 * (1 - resist)));
        const heatDmg = isSuitEquipped ? 0 : Math.max(2, Math.round(7 * (1 - resist)));
        if (!isSuitEquipped) {
          this.damage(heatDmg, radDelta, "【高温蒸汽/聚变余热灼伤】未穿戴防热工程服", playerX, playerY);
        } else {
          this.rad = Math.min(1000, this.rad + radDelta);
        }
      }
    } else {
      this.hazardCooldown = 0.5;
    }
  }

  pushLog(kind: LogEntry["kind"], text: string): void {
    const idx = this.logSeq++;
    const mins = String(Math.floor((idx * 3) / 60) % 24).padStart(2, "0");
    const secs = String((idx * 17) % 60).padStart(2, "0");
    this.logs.push({ id: idx, tick: `${mins}:${secs}`, kind, text });
    if (this.logs.length > 50) {
      this.logs.shift();
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -26,
      text,
      color,
      life: 0,
      maxLife: 1.85
    });
  }
}
