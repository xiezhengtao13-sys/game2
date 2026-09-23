/**
 * A conversation in progress: a queue of lines the player advances through.
 *
 * Pure state with no DOM, so the rules that matter -- one key press advances
 * exactly one line, the last line closes the conversation -- are testable
 * without a browser. The dialogue *box* is DOM and lives in src/ui.
 */

export interface DialogueLine {
  /** Who is speaking. Null for narration or system messages. */
  speaker: string | null;
  text: string;
}

export class Dialogue {
  private lines: DialogueLine[] = [];
  private index = 0;

  /** True while the box should be on screen and the player should be frozen. */
  get isOpen(): boolean {
    return this.lines.length > 0;
  }

  /** The line to show right now, or null when nothing is open. */
  get current(): DialogueLine | null {
    return this.isOpen ? this.lines[this.index] : null;
  }

  /** Which line this is, 1-based, for a "2/3" style hint. */
  get lineNumber(): number {
    return this.index + 1;
  }

  get lineCount(): number {
    return this.lines.length;
  }

  /** True when the player is on the final line. */
  get isLastLine(): boolean {
    return this.isOpen && this.index === this.lines.length - 1;
  }

  /**
   * Start a conversation. Replaces anything already open, so talking to a second
   * NPC cannot leave the first conversation's lines queued up behind it.
   *
   * Lines are copied one level deep: a caller mutating its own line objects
   * afterwards must not change what is already on screen.
   */
  open(lines: readonly DialogueLine[]): void {
    if (lines.length === 0) {
      this.close();
      return;
    }
    this.lines = lines.map((line) => ({ speaker: line.speaker, text: line.text }));
    this.index = 0;
  }

  /** Convenience for a single line. */
  say(speaker: string | null, text: string): void {
    this.open([{ speaker, text }]);
  }

  /**
   * Advance one line. Closes the conversation after the last line.
   * Returns true if the conversation is still open afterwards.
   */
  advance(): boolean {
    if (!this.isOpen) return false;

    if (this.index < this.lines.length - 1) {
      this.index++;
      return true;
    }

    this.close();
    return false;
  }

  close(): void {
    this.lines = [];
    this.index = 0;
  }
}
