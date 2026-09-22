export class Input {
  private keys = new Set<string>();
  /** Keys that went down since the last `endFrame()`. */
  private pressedThisFrame = new Set<string>();

  onKeyDown = (event: KeyboardEvent) => {
    // Ignore auto-repeat, otherwise holding a key would report a press every
    // frame and "press E to interact" would fire continuously.
    if (!this.keys.has(event.code)) this.pressedThisFrame.add(event.code);
    this.keys.add(event.code);
  };

  onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  /** True while `code` is held. */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /**
   * True only on the frame `code` went down. Use for one-shot actions such as
   * interacting or advancing dialogue.
   */
  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  /** Clear per-frame state. `Game` calls this at the end of every frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
  }

  /** Forget all held keys, e.g. when the window loses focus. */
  reset(): void {
    this.keys.clear();
    this.pressedThisFrame.clear();
  }
}
