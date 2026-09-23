import type { Dialogue } from "../game/systems/Dialogue";

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
  private readonly speakerEl: HTMLParagraphElement;
  private readonly textEl: HTMLParagraphElement;
  private readonly hintEl: HTMLSpanElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.id = "dialogue-box";
    this.root.hidden = true;

    this.speakerEl = document.createElement("p");
    this.speakerEl.className = "dialogue-speaker";

    this.textEl = document.createElement("p");
    this.textEl.className = "dialogue-text";

    this.hintEl = document.createElement("span");
    this.hintEl.className = "dialogue-hint";

    this.root.append(this.speakerEl, this.textEl, this.hintEl);
    parent.appendChild(this.root);
  }

  /**
   * Show or update the box. Passing null hides it.
   *
   * Safe to call every time the dialogue changes; it only touches the DOM when
   * something actually differs, so it does not thrash the layout each frame.
   */
  render(dialogue: Dialogue | null): void {
    if (!dialogue || !dialogue.isOpen || !dialogue.current) {
      this.root.hidden = true;
      return;
    }

    const line = dialogue.current;
    // Narration has no speaker, so the name row is hidden rather than left blank.
    this.speakerEl.textContent = line.speaker ?? "";
    this.speakerEl.hidden = line.speaker === null;

    this.textEl.textContent = line.text;

    const more = !dialogue.isLastLine;
    this.hintEl.textContent = more
      ? `E / 空格 继续　${dialogue.lineNumber}/${dialogue.lineCount}`
      : "E / 空格 结束";

    this.root.hidden = false;
  }

  /** True when the box is currently on screen. */
  get isVisible(): boolean {
    return !this.root.hidden;
  }
}
