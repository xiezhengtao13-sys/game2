import {
  ARCHETYPES,
  SKILL_LABELS,
  SPECIAL_LABELS,
  type ActionMode,
  type ArchetypeId,
  type RpgSystem,
  type SkillKey,
  type SpecialKey
} from "../game/systems/RpgSystem";
import type { GameAssets } from "../game/assets";

export interface FalloutHudCallbacks {
  onSelectMode: (mode: ActionMode) => void;
  onUseItem: (itemId: string) => void;
  onInvestSkill: (skill: SkillKey) => void;
  onSelectArchetype: (id: ArchetypeId) => void;
}

/**
 * Classic Fallout 1/2-inspired bottom docked tactical steel/CRT console +
 * S.P.E.C.I.A.L. & Inventory character sheet modal (`Tab` / `C`).
 */
export class FalloutHud {
  private readonly consoleEl: HTMLDivElement;
  private readonly modalEl: HTMLDivElement;

  private readonly logScreenEl: HTMLDivElement;
  private readonly hpBarEl: HTMLDivElement;
  private readonly hpTextEl: HTMLSpanElement;
  private readonly radTextEl: HTMLSpanElement;
  private readonly apPipsEl: HTMLDivElement;
  private readonly lvlTextEl: HTMLSpanElement;
  private readonly xpBarEl: HTMLDivElement;
  private readonly stimBtnEl: HTMLButtonElement;
  private readonly stimQtyEl: HTMLSpanElement;
  private readonly charBtnEl: HTMLButtonElement;
  private readonly spBadgeEl: HTMLSpanElement;
  private readonly modeButtons = new Map<ActionMode, HTMLButtonElement>();

  private lastLogId = -1;
  private isCharOpen = false;
  private latestRpg: RpgSystem | null = null;

  constructor(
    parent: HTMLElement,
    private readonly assets: GameAssets | null,
    private readonly callbacks: FalloutHudCallbacks
  ) {
    // 1. Bottom Docked Steel & Phosphor CRT Console
    this.consoleEl = document.createElement("div");
    this.consoleEl.id = "fallout-console";

    // Left: Recessed Phosphor CRT Log Feed
    const logFrame = document.createElement("div");
    logFrame.className = "fo-panel fo-log-frame";
    const logTitle = document.createElement("div");
    logTitle.className = "fo-mini-label";
    logTitle.textContent = "CRT TELEMETRY FEED // 离线终端日志";
    this.logScreenEl = document.createElement("div");
    this.logScreenEl.className = "fo-crt-screen";
    logFrame.append(logTitle, this.logScreenEl);

    // Center: Action Verb Pad + Quick Stim Slot
    const verbPanel = document.createElement("div");
    verbPanel.className = "fo-panel fo-verb-panel";

    const verbGrid = document.createElement("div");
    verbGrid.className = "fo-verb-grid";

    const verbs: ReadonlyArray<{ mode: ActionMode; icon: string; label: string; tip: string }> = [
      { mode: "interact", icon: "👆", label: "交互", tip: "左键点击直接移动并交互/对话" },
      { mode: "inspect", icon: "🔍", label: "观察", tip: "警觉(Perception)细节勘察 [或右键快捷]" },
      { mode: "repair", icon: "🔧", label: "机械", tip: "机械工程(Repair)检修设备或强拆暗格" },
      { mode: "science", icon: "💻", label: "科学", tip: "科学终端(Science)接驳解码板读取暗档" },
      { mode: "speech", icon: "💬", label: "交涉", tip: "话术交涉(Speech)对乘员说服与套取情报" }
    ];

    for (const v of verbs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fo-verb-btn";
      btn.title = v.tip;
      btn.innerHTML = `<span class="verb-ico">${v.icon}</span><span class="verb-txt">${v.label}</span>`;
      btn.addEventListener("click", () => this.callbacks.onSelectMode(v.mode));
      this.modeButtons.set(v.mode, btn);
      verbGrid.appendChild(btn);
    }

    this.stimBtnEl = document.createElement("button");
    this.stimBtnEl.type = "button";
    this.stimBtnEl.className = "fo-stim-btn";
    this.stimBtnEl.title = "快捷键 [H]：注射抗辐宁恢复 +40 HP 与 -50 RAD";
    this.stimQtyEl = document.createElement("span");
    this.stimQtyEl.className = "stim-qty";
    this.stimBtnEl.innerHTML = `<span class="stim-ico">💉</span><span class="stim-name">抗辐宁 <kbd>H</kbd></span>`;
    this.stimBtnEl.appendChild(this.stimQtyEl);
    this.stimBtnEl.addEventListener("click", () => this.callbacks.onUseItem("med_stim"));

    verbPanel.append(verbGrid, this.stimBtnEl);

    // Right: HP / AP / RAD / LV + Character Modal Trigger
    const vitalsPanel = document.createElement("div");
    vitalsPanel.className = "fo-panel fo-vitals-panel";

    const vitalsTop = document.createElement("div");
    vitalsTop.className = "fo-vitals-row";

    const hpWrap = document.createElement("div");
    hpWrap.className = "fo-meter-block";
    hpWrap.innerHTML = `<div class="fo-meter-head"><span>HP 生命</span></div>`;
    this.hpTextEl = document.createElement("span");
    this.hpTextEl.className = "fo-meter-val";
    hpWrap.querySelector(".fo-meter-head")!.appendChild(this.hpTextEl);
    const hpTrack = document.createElement("div");
    hpTrack.className = "fo-meter-track";
    this.hpBarEl = document.createElement("div");
    this.hpBarEl.className = "fo-meter-fill hp-fill";
    hpTrack.appendChild(this.hpBarEl);
    hpWrap.appendChild(hpTrack);

    const apWrap = document.createElement("div");
    apWrap.className = "fo-meter-block";
    const apHead = document.createElement("div");
    apHead.className = "fo-meter-head";
    apHead.innerHTML = `<span>AP 行动点</span>`;
    this.radTextEl = document.createElement("span");
    this.radTextEl.className = "fo-rad-pill";
    apHead.appendChild(this.radTextEl);
    this.apPipsEl = document.createElement("div");
    this.apPipsEl.className = "fo-ap-pips";
    apWrap.append(apHead, this.apPipsEl);

    vitalsTop.append(hpWrap, apWrap);

    const vitalsBottom = document.createElement("div");
    vitalsBottom.className = "fo-vitals-footer";

    const lvlBox = document.createElement("div");
    lvlBox.className = "fo-lvl-box";
    this.lvlTextEl = document.createElement("span");
    this.lvlTextEl.className = "fo-lvl-text";
    const xpTrack = document.createElement("div");
    xpTrack.className = "fo-xp-track";
    this.xpBarEl = document.createElement("div");
    this.xpBarEl.className = "fo-xp-fill";
    xpTrack.appendChild(this.xpBarEl);
    lvlBox.append(this.lvlTextEl, xpTrack);

    this.charBtnEl = document.createElement("button");
    this.charBtnEl.type = "button";
    this.charBtnEl.id = "btn-char-sheet";
    this.charBtnEl.className = "fo-char-btn";
    this.spBadgeEl = document.createElement("span");
    this.spBadgeEl.className = "fo-sp-badge";
    this.charBtnEl.innerHTML = `<span>📊 S.P.E.C.I.A.L. & 背包</span><kbd>Tab</kbd>`;
    this.charBtnEl.appendChild(this.spBadgeEl);
    this.charBtnEl.addEventListener("click", () => this.toggleCharacterSheet());

    vitalsBottom.append(lvlBox, this.charBtnEl);
    vitalsPanel.append(vitalsTop, vitalsBottom);

    this.consoleEl.append(logFrame, verbPanel, vitalsPanel);
    parent.appendChild(this.consoleEl);

    // 2. Character Sheet & Inventory Modal
    this.modalEl = document.createElement("div");
    this.modalEl.id = "character-modal";
    this.modalEl.hidden = true;
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.closeCharacterSheet();
    });
    parent.appendChild(this.modalEl);
  }

  get characterOpen(): boolean {
    return this.isCharOpen;
  }

  toggleCharacterSheet(): void {
    this.isCharOpen = !this.isCharOpen;
    this.modalEl.hidden = !this.isCharOpen;
    if (this.isCharOpen && this.latestRpg) {
      this.renderModal(this.latestRpg);
    }
  }

  closeCharacterSheet(): void {
    this.isCharOpen = false;
    this.modalEl.hidden = true;
  }

  /** Lightweight 60fps update for smooth AP regen pips and HP/RAD readouts without touching modal DOM. */
  syncVitalsOnly(rpg: RpgSystem): void {
    this.latestRpg = rpg;

    const hpPct = Math.max(0, Math.min(100, (rpg.hp / rpg.maxHp) * 100));
    this.hpBarEl.style.width = `${hpPct.toFixed(1)}%`;
    this.hpBarEl.classList.toggle("low", hpPct <= 35);
    this.hpTextEl.textContent = `${Math.round(rpg.hp)} / ${rpg.maxHp}`;

    this.radTextEl.textContent = `RAD ${Math.round(rpg.rad)} mSv`;
    this.radTextEl.classList.toggle("warn", rpg.rad >= 40);

    const filledAp = Math.floor(rpg.ap);
    if (this.apPipsEl.children.length !== rpg.maxAp) {
      this.apPipsEl.innerHTML = "";
      for (let i = 0; i < rpg.maxAp; i++) {
        const pip = document.createElement("span");
        pip.className = "fo-ap-pip";
        this.apPipsEl.appendChild(pip);
      }
    }
    Array.from(this.apPipsEl.children).forEach((el, idx) => {
      el.classList.toggle("lit", idx < filledAp);
    });

    this.lvlTextEl.textContent = `LV.${rpg.level}`;
    const xpPct = Math.max(0, Math.min(100, (rpg.xp / rpg.xpForNextLevel) * 100));
    this.xpBarEl.style.width = `${xpPct.toFixed(1)}%`;

    if (rpg.skillPoints > 0) {
      this.spBadgeEl.hidden = false;
      this.spBadgeEl.textContent = `+${rpg.skillPoints}`;
    } else {
      this.spBadgeEl.hidden = true;
    }
  }

  sync(rpg: RpgSystem): void {
    this.latestRpg = rpg;

    // 1. Update CRT Logs only when latest id changes (keeps scroll smooth)
    const lastId = rpg.logs.length > 0 ? rpg.logs[rpg.logs.length - 1].id : -1;
    if (lastId !== this.lastLogId) {
      this.lastLogId = lastId;
      const tail = rpg.logs.slice(-6);
      this.logScreenEl.innerHTML = tail
        .map((entry) => `<div class="crt-line crt-${entry.kind}"><span class="crt-tick">[${entry.tick}]</span> &gt; ${entry.text}</div>`)
        .join("");
      this.logScreenEl.scrollTop = this.logScreenEl.scrollHeight;
    }

    // 2. Action Verb active indicator
    for (const [mode, btn] of this.modeButtons.entries()) {
      btn.classList.toggle("active", rpg.activeMode === mode);
    }

    // 3. Stimpack quick slot
    const stimQty = rpg.items.get("med_stim")?.quantity ?? 0;
    this.stimQtyEl.textContent = `x${stimQty}`;
    this.stimBtnEl.disabled = stimQty <= 0;

    // 4. Vitals Meters
    this.syncVitalsOnly(rpg);

    if (this.isCharOpen) {
      this.renderModal(rpg);
    }
  }

  private renderModal(rpg: RpgSystem): void {
    const portraitUrl = this.assets?.portraitUrl?.("portrait_player");
    const canSwitch = rpg.canSwitchArchetype();
    const archDef = ARCHETYPES[rpg.archetypeId];

    const archButtons = (Object.keys(ARCHETYPES) as ArchetypeId[])
      .map((id) => {
        const a = ARCHETYPES[id];
        const active = rpg.archetypeId === id;
        return `
          <button
            type="button"
            class="char-arch-btn ${active ? "active" : ""}"
            data-arch="${id}"
            ${!canSwitch && !active ? "disabled" : ""}
            title="${canSwitch ? "切换出生背景专精" : "本次值班已获得经验，专精已锁定"}"
          >
            <div class="arch-name">${a.name}</div>
            <div class="arch-trait">${a.traitName}</div>
          </button>`;
      })
      .join("");

    const specialRows = (Object.keys(SPECIAL_LABELS) as SpecialKey[])
      .map((key) => {
        const meta = SPECIAL_LABELS[key];
        const val = rpg.stats[key];
        return `
          <div class="special-row" title="${meta.desc}">
            <span class="sp-code">${meta.code}</span>
            <span class="sp-name">${meta.name}</span>
            <span class="sp-val">${String(val).padStart(2, "0")}</span>
          </div>`;
      })
      .join("");

    const skillRows = (Object.keys(SKILL_LABELS) as SkillKey[])
      .map((key) => {
        const val = rpg.getSkill(key);
        const canInvest = rpg.skillPoints > 0 && val < 99;
        return `
          <div class="skill-row">
            <div class="skill-info">
              <span class="skill-name">${SKILL_LABELS[key]}</span>
              <span class="skill-val">${val}%</span>
            </div>
            <div class="skill-bar-row">
              <div class="skill-track"><div class="skill-fill" style="width:${val}%"></div></div>
              <button
                type="button"
                class="skill-plus-btn"
                data-skill="${key}"
                ${canInvest ? "" : "disabled"}
              >+5%</button>
            </div>
          </div>`;
      })
      .join("");

    const invItems = Array.from(rpg.items.values())
      .filter((it) => it.quantity > 0)
      .map((it) => {
        const useBtn =
          it.id === "med_stim"
            ? `<button type="button" class="inv-use-btn" data-use-item="${it.id}">💉 使用</button>`
            : it.equipped
            ? `<span class="inv-eq-tag">✓ 已装备</span>`
            : "";
        return `
          <div class="inv-item-card">
            <div class="inv-item-head">
              <span class="inv-ico">${it.icon}</span>
              <span class="inv-name">${it.name}</span>
              <span class="inv-qty">x${it.quantity}</span>
              ${useBtn}
            </div>
            ${it.bonusDesc ? `<div class="inv-bonus">${it.bonusDesc}</div>` : ""}
            <div class="inv-desc">${it.desc}</div>
          </div>`;
      })
      .join("");

    this.modalEl.innerHTML = `
      <div class="char-sheet">
        <div class="char-sheet-header">
          <div class="char-sheet-title">
            <span class="sheet-emblem">⚙</span>
            <span>远望号工勤人事与 S.P.E.C.I.A.L. 个人终端</span>
          </div>
          <button type="button" id="char-close-btn" class="minimap-close">✕ 关闭 (Tab / ESC)</button>
        </div>

        <div class="char-sheet-body">
          <!-- Left: Portrait & Origin -->
          <div class="char-col char-identity">
            <div class="char-portrait-frame">
              ${portraitUrl ? `<img class="portrait-hd" src="${portraitUrl}" alt="Player" />` : `<div class="avatar-icon-log">🧑‍🔧</div>`}
            </div>
            <div class="char-nameplate">巡检工勤 · 小徐 (Lv.${rpg.level})</div>
            <div class="char-xp-readout">XP ${rpg.xp} / ${rpg.xpForNextLevel} · HP ${Math.round(rpg.hp)}/${rpg.maxHp} · RAD ${Math.round(rpg.rad)} mSv</div>
            <div class="char-section-title">值班履历专精 ${canSwitch ? "(可切换)" : "(已锁定)"}</div>
            <div class="char-arch-list">${archButtons}</div>
            <div class="char-arch-desc">${archDef.traitDesc}</div>
          </div>

          <!-- Center: S.P.E.C.I.A.L. & Skills -->
          <div class="char-col char-stats-col">
            <div class="char-section-title">S.P.E.C.I.A.L. 基础素质</div>
            <div class="special-grid">${specialRows}</div>

            <div class="char-section-title skills-head">
              <span>工勤专精技能 (SKILLS)</span>
              <span class="sp-pool ${rpg.skillPoints > 0 ? "has-pts" : ""}">可用点数: ${rpg.skillPoints}</span>
            </div>
            <div class="skill-list">${skillRows}</div>
          </div>

          <!-- Right: Inventory & Passive Equipment -->
          <div class="char-col char-inv-col">
            <div class="char-section-title">随身工具包与机密物资</div>
            <div class="inv-list">${invItems}</div>
          </div>
        </div>
      </div>`;

    this.modalEl.querySelector("#char-close-btn")?.addEventListener("click", () => this.closeCharacterSheet());

    this.modalEl.querySelectorAll<HTMLButtonElement>("[data-arch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.arch as ArchetypeId | undefined;
        if (id) this.callbacks.onSelectArchetype(id);
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>("[data-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const skill = btn.dataset.skill as SkillKey | undefined;
        if (skill) this.callbacks.onInvestSkill(skill);
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>("[data-use-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = btn.dataset.useItem;
        if (itemId) this.callbacks.onUseItem(itemId);
      });
    });
  }
}
