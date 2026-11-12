import type { Dialogue } from "../game/systems/Dialogue";
import type { GameAssets } from "../game/assets";

/**
 * The dialogue box: an HTML overlay, not canvas.
 *
 * Text is DOM rather than canvas because Chinese typography, font fallback,
 * line wrapping and accessibility all come free here and would otherwise have
 * to be hand-built. The trade-off is that it cannot be positioned in world
 * space -- which a dialogue box does not need to be.
 */
export class DialogueBox {
  private readonly root: HTMLDivElement;
  private readonly avatarEl: HTMLDivElement;
  private readonly badgeEl: HTMLSpanElement;
  private readonly speakerEl: HTMLSpanElement;
  private readonly textEl: HTMLParagraphElement;
  private readonly hintEl: HTMLSpanElement;
  private readonly assets: GameAssets | null;

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

    this.hintEl = document.createElement("span");
    this.hintEl.className = "dialogue-hint";

    contentCol.append(headerRow, this.textEl, this.hintEl);
    this.root.append(this.avatarEl, contentCol);
    parent.appendChild(this.root);
  }

  /**
   * Show or update the box. Passing null hides it.
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
      const captainImg = this.assets?.image("npc_captain")?.src;
      this.avatarEl.innerHTML = captainImg ? `<img src="${captainImg}" alt="Captain" />` : `<div class="avatar-icon-log">👨‍✈️</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else if (speaker === "老周" || speaker?.includes("老周") || speaker?.includes("轮机")) {
      this.badgeEl.textContent = "ENG · 轮机维护二班班长";
      this.badgeEl.className = "dialogue-badge badge-eng";
      const crewImg = this.assets?.image("crew_down_idle")?.src;
      this.avatarEl.innerHTML = crewImg ? `<img src="${crewImg}" alt="Engineer" />` : `<div class="avatar-icon-log">🧑‍🔧</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else if (speaker === "陈医生" || speaker?.includes("医")) {
      this.badgeEl.textContent = "MED & CRYO · 休眠监护中心";
      this.badgeEl.className = "dialogue-badge badge-med";
      const crewImg = this.assets?.image("crew_down_idle")?.src;
      this.avatarEl.innerHTML = crewImg ? `<img src="${crewImg}" alt="Doctor" />` : `<div class="avatar-icon-log">🩺</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else if (speaker === "调度员小刘" || speaker?.includes("调度")) {
      this.badgeEl.textContent = "TRANSIT · 中央轨道换乘站";
      this.badgeEl.className = "dialogue-badge badge-transit";
      const crewImg = this.assets?.image("crew_down_idle")?.src;
      this.avatarEl.innerHTML = crewImg ? `<img src="${crewImg}" alt="Transit" />` : `<div class="avatar-icon-log">🚝</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else if (speaker === "领航员" || speaker?.includes("领航")) {
      this.badgeEl.textContent = "NAV · 深空航线导航席";
      this.badgeEl.className = "dialogue-badge badge-nav";
      const crewImg = this.assets?.image("crew_down_idle")?.src;
      this.avatarEl.innerHTML = crewImg ? `<img src="${crewImg}" alt="Navigator" />` : `<div class="avatar-icon-log">🧭</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else if (speaker) {
      this.badgeEl.textContent = "CREW · 远望号当班人员";
      this.badgeEl.className = "dialogue-badge badge-crew";
      const crewImg = this.assets?.image("crew_down_idle")?.src;
      this.avatarEl.innerHTML = crewImg ? `<img src="${crewImg}" alt="Crew" />` : `<div class="avatar-icon-log">🧑‍🚀</div>`;
      this.speakerEl.textContent = speaker;
      this.speakerEl.hidden = false;
      this.badgeEl.hidden = false;
    } else {
      // Narration / inspection
      this.badgeEl.textContent = "LOG · 巡检现场勘测记录";
      this.badgeEl.className = "dialogue-badge badge-log";
      this.avatarEl.innerHTML = `<div class="avatar-icon-log">📋</div>`;
      this.speakerEl.textContent = "";
      this.speakerEl.hidden = true;
      this.badgeEl.hidden = false;
    }

    this.textEl.textContent = line.text;

    const more = !dialogue.isLastLine;
    this.hintEl.innerHTML = more
      ? `<span class="hint-key">E / 空格</span> 下一句 <span class="hint-counter">${dialogue.lineNumber}/${dialogue.lineCount}</span>`
      : `<span class="hint-key">E / 空格</span> 翻阅结束`;

    this.root.hidden = false;
  }

  /** True when the box is currently on screen. */
  get isVisible(): boolean {
    return !this.root.hidden;
  }
}
