/**
 * A conversation in progress: a queue of lines and optional Classic Fallout
 * branching skill-checked choices.
 *
 * Pure state with no DOM, so both linear advancement (pressing Space/E) and
 * CRPG branching choices (clicking options or pressing 1-4) are fully testable
 * in plain Node.
 */

export interface DialogueChoice {
  readonly label: string;
  /** Optional Fallout badge shown before label, e.g. "[话术 62%]" or "[科学 75%]". */
  readonly tag?: string;
  /** Optional accent styling ("ok" | "warn" | "special" | "leave"). */
  readonly tone?: "default" | "skill" | "warn" | "leave";
  readonly disabled?: boolean;
  /** Runs when selected. Return follow-up lines to transition, or void/[] to close. */
  readonly action: () => readonly DialogueLine[] | void;
}

export interface DialogueLine {
  /** Who is speaking. Null for narration or system messages. */
  speaker: string | null;
  text: string;
  /** Optional explicit portrait id overriding automatic speaker lookup. */
  portraitId?: string;
  /** Optional Fallout numbered choices displayed below this line. */
  choices?: readonly DialogueChoice[];
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

  /** True when the current line exposes Fallout dialogue choices. */
  get hasChoices(): boolean {
    return !!(this.current?.choices && this.current.choices.length > 0);
  }

  /**
   * Start a conversation. Replaces anything already open, so talking to a second
   * NPC cannot leave the first conversation's lines queued up behind it.
   */
  open(lines: readonly DialogueLine[]): void {
    if (lines.length === 0) {
      this.close();
      return;
    }
    this.lines = lines.map((line) => ({
      speaker: line.speaker,
      text: line.text,
      portraitId: line.portraitId,
      choices: line.choices
    }));
    this.index = 0;
  }

  /** Convenience for a single line. */
  say(speaker: string | null, text: string, portraitId?: string): void {
    this.open([{ speaker, text, portraitId }]);
  }

  /**
   * Execute a branching choice by 0-based index on the current line.
   * Returns true if dialogue remains open afterwards.
   */
  selectChoice(choiceIndex: number): boolean {
    if (!this.isOpen || !this.current?.choices) return false;
    const choice = this.current.choices[choiceIndex];
    if (!choice || choice.disabled) return this.isOpen;

    const next = choice.action();
    if (next && next.length > 0) {
      this.open(next);
      return true;
    }

    this.close();
    return false;
  }

  /**
   * Advance one line. Closes the conversation after the last line.
   * Preserves deterministic linear progression for standard conversations.
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
