import type { Dialogue } from "../game/systems/Dialogue";
import type { GameAssets } from "../game/assets";

/**
 * Baldur's Gate 3 / Classic Fallout-styled CRPG dialogue console.
 *
 * Features painterly chiaroscuro portraits in an ornate obsidian/bronze frame
 * and interactive numbered Fallout skill-checked dialogue choices.
 */
export class DialogueBox {
  private readonly root: HTMLDivElement;
  private readonly avatarEl: HTMLDivElement;
  private readonly badgeEl: HTMLSpanElement;
  private readonly speakerEl: HTMLSpanElement;
  private readonly textEl: HTMLParagraphElement;
  private readonly choicesEl: HTMLDivElement;
  private readonly hintEl: HTMLSpanElement;
  private readonly assets: GameAssets | null;

  /** Triggered when the player clicks a numbered choice option. */
  onSelectChoice: ((index: number) => void) | null = null;

  constructor(parent: HTMLElement, assets: GameAssets | null = null) {
    this.assets = assets;
    this.root = document.createElement("div");
    this.root.id = "dialogue-box";
    this.root.hidden = true;

    this.avatarEl = document.createElement("div");
    this.avatarEl.className = "dialogue-avatar";

    const contentCol = document.createElement("div");
    contentCol.className = "dialogue-content";

    const headerRow = document.createElement("div");
    headerRow.className = "dialogue-header";

    this.badgeEl = document.createElement("span");
    this.badgeEl.className = "dialogue-badge";

    this.speakerEl = document.createElement("span");
    this.speakerEl.className = "dialogue-speaker";

    headerRow.append(this.badgeEl, this.speakerEl);

    this.textEl = document.createElement("p");
    this.textEl.className = "dialogue-text";

    this.choicesEl = document.createElement("div");
    this.choicesEl.className = "dialogue-choices";

    this.hintEl = document.createElement("span");
    this.hintEl.className = "dialogue-hint";

    contentCol.append(headerRow, this.textEl, this.choicesEl, this.hintEl);
    this.root.append(this.avatarEl, contentCol);
    parent.appendChild(this.root);
  }

  private resolvePortrait(speaker: string | null, explicitId?: string): string | undefined {
    const id = explicitId ?? this.defaultPortraitId(speaker);
    if (id && this.assets?.portraitUrl) {
      const url = this.assets.portraitUrl(id);
      if (url) return url;
    }
    return undefined;
  }

  private defaultPortraitId(speaker: string | null): string | undefined {
    if (!speaker) return undefined;
    if (speaker === "舰长") return "portrait_captain";
    if (speaker.includes("沃恩")) return "portrait_captain";
    if (speaker === "老周" || speaker.includes("老周") || speaker.includes("轮机")) return "portrait_engineer";
    if (speaker === "小宋" || speaker.includes("小宋") || speaker.includes("机工")) return "portrait_engineer";
    if (speaker === "老马" || speaker.includes("老马") || speaker.includes("配餐")) return "portrait_transit";
    if (speaker === "陈医生" || speaker.includes("医") || speaker.includes("艾琳")) return "portrait_medic";
    if (speaker === "林芸" || speaker === "阿诚" || speaker === "调度员小刘" || speaker.includes("调度")) {
      return "portrait_transit";
    }
    if (speaker === "领航员" || speaker.includes("领航") || speaker.includes("苏博士")) return "portrait_navigator";
    if (
      speaker.includes("林文") ||
      speaker.includes("MNA-01") ||
      speaker.includes("弥涅瓦") ||
      speaker.includes("全舰广播") ||
      speaker.includes("杂音") ||
      speaker.includes("系统") ||
      speaker.includes("终端")
    ) {
      return "portrait_terminal";
    }
    if (speaker.includes("副官")) return "portrait_captain";
    return "portrait_player";
  }

  /**
   * Show or update the dialogue panel. Passing null hides it.
   */
  render(dialogue: Dialogue | null): void {
    if (!dialogue || !dialogue.isOpen || !dialogue.current) {
      this.root.hidden = true;
      return;
    }

    const line = dialogue.current;
    const speaker = line.speaker;

    if (speaker === "舰长") {
      this.badgeEl.textContent = "COMMAND · 远望号旗舰指挥官";
      this.badgeEl.className = "dialogue-badge badge-command";
    } else if (speaker?.includes("沃恩")) {
      this.badgeEl.textContent = "ADVISOR · 船长顾问 & 弥涅瓦-V 协同载体";
      this.badgeEl.className = "dialogue-badge badge-command";
    } else if (speaker?.includes("弥涅瓦-V")) {
      this.badgeEl.textContent = "MINERVA-V · 主舰双监督独立系统";
      this.badgeEl.className = "dialogue-badge badge-command";
    } else if (speaker?.includes("MNA-01")) {
      this.badgeEl.textContent = "MNA-01 · 历史档案馆特殊数字船员";
      this.badgeEl.className = "dialogue-badge badge-nav";
    } else if (speaker === "陈艾琳" || speaker?.includes("艾琳")) {
      this.badgeEl.textContent = "REHAB · 第七神经康复中心（原 C-7）";
      this.badgeEl.className = "dialogue-badge badge-med";
    } else if (speaker === "周瑾" || speaker?.includes("受试")) {
      this.badgeEl.textContent = "SUBJECT · 第七神经康复观察受试者";
      this.badgeEl.className = "dialogue-badge badge-med";
    } else if (speaker === "林文" || speaker?.includes("档案")) {
      this.badgeEl.textContent = "ARCHIVE · 远望号历史档案馆";
      this.badgeEl.className = "dialogue-badge badge-nav";
    } else if (speaker === "林芸") {
      this.badgeEl.textContent = "AGRI · L-1 封闭生态农业区";
      this.badgeEl.className = "dialogue-badge badge-eng";
    } else if (speaker === "苏博士") {
      this.badgeEl.textContent = "SCI · R-2 深空光谱分析室";
      this.badgeEl.className = "dialogue-badge badge-nav";
    } else if (speaker === "阿诚") {
      this.badgeEl.textContent = "RING · R-1 双旋转生活环厅";
      this.badgeEl.className = "dialogue-badge badge-transit";
    } else if (speaker === "老周" || speaker?.includes("老周") || speaker?.includes("轮机")) {
      this.badgeEl.textContent = "ENG · 轮机维护二班班长";
      this.badgeEl.className = "dialogue-badge badge-eng";
    } else if (speaker === "老马" || speaker?.includes("老马") || speaker?.includes("配餐")) {
      this.badgeEl.textContent = "GALLEY · 生活区公共配餐中心";
      this.badgeEl.className = "dialogue-badge badge-eng";
    } else if (speaker === "小宋" || speaker?.includes("小宋") || speaker?.includes("机工")) {
      this.badgeEl.textContent = "CREW · 底层工勤夜班机修";
      this.badgeEl.className = "dialogue-badge badge-crew";
    } else if (speaker === "陈医生" || speaker?.includes("医")) {
      this.badgeEl.textContent = "MED & CRYO · 休眠监护中心";
      this.badgeEl.className = "dialogue-badge badge-med";
    } else if (speaker === "调度员小刘" || speaker?.includes("调度")) {
      this.badgeEl.textContent = "TRANSIT · 中央轨道换乘站";
      this.badgeEl.className = "dialogue-badge badge-transit";
    } else if (speaker === "领航员" || speaker?.includes("领航")) {
      this.badgeEl.textContent = "NAV · 深空航线导航席";
      this.badgeEl.className = "dialogue-badge badge-nav";
    } else if (speaker === "小徐") {
      this.badgeEl.textContent = "CREW · 底层工勤二班（生活宿舍区）";
      this.badgeEl.className = "dialogue-badge badge-crew";
    } else if (speaker) {
      this.badgeEl.textContent = "COMM · 远望号通讯链路";
      this.badgeEl.className = "dialogue-badge badge-crew";
    } else {
      this.badgeEl.textContent = "LOG · 巡检勘测与系统终端";
      this.badgeEl.className = "dialogue-badge badge-log";
    }

    this.speakerEl.textContent = speaker ?? "";
    this.speakerEl.hidden = !speaker;
    this.badgeEl.hidden = false;

    const hdPortrait = this.resolvePortrait(speaker, line.portraitId);
    if (hdPortrait) {
      this.avatarEl.innerHTML = `<img class="portrait-hd" src="${hdPortrait}" alt="${speaker ?? "Log"}" />`;
    } else {
      const spriteId = speaker === "舰长" ? "npc_captain" : speaker ? "crew_down_idle" : undefined;
      const spriteImg = spriteId ? this.assets?.image(spriteId)?.src : undefined;
      this.avatarEl.innerHTML = spriteImg
        ? `<img class="portrait-sprite" src="${spriteImg}" alt="${speaker ?? "Crew"}" />`
        : `<div class="avatar-icon-log">📋</div>`;
    }

    this.textEl.textContent = line.text;

    // Classic Fallout Interactive Dialogue Choices
    this.choicesEl.innerHTML = "";
    const choices = line.choices ?? [];
    if (choices.length > 0) {
      this.choicesEl.hidden = false;
      choices.forEach((choice, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `dialogue-choice choice-${choice.tone ?? "default"}`;
        if (choice.disabled) btn.disabled = true;

        const keySpan = document.createElement("span");
        keySpan.className = "choice-num";
        keySpan.textContent = `[${idx + 1}]`;
        btn.appendChild(keySpan);

        if (choice.tag) {
          const tagSpan = document.createElement("span");
          tagSpan.className = "choice-tag";
          tagSpan.textContent = choice.tag;
          btn.appendChild(tagSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.className = "choice-label";
        labelSpan.textContent = choice.label;
        btn.appendChild(labelSpan);

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onSelectChoice?.(idx);
        });
        this.choicesEl.appendChild(btn);
      });
    } else {
      this.choicesEl.hidden = true;
    }

    const more = !dialogue.isLastLine;
    if (choices.length > 0) {
      this.hintEl.innerHTML =
        `<span class="hint-key">点击 / 1-${choices.length}</span> 决策交互` +
        `<span class="hint-key">ESC / 空格</span> 退出对话`;
    } else {
      this.hintEl.innerHTML = more
        ? `<span class="hint-key">E / 空格</span> 下一句 <span class="hint-counter">${dialogue.lineNumber}/${dialogue.lineCount}</span>`
        : `<span class="hint-key">E / 空格</span> 结束对话`;
    }

    this.root.hidden = false;
  }

  /** True when the box is currently on screen. */
  get isVisible(): boolean {
    return !this.root.hidden;
  }
}
