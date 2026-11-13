export class Input {
  private keys = new Set<string>();
  /** Keys that went down since the last `endFrame()`. */
  private pressedThisFrame = new Set<string>();

  /** Cursor position in internal canvas pixel space (e.g. 0..1280, 0..720). */
  mouseX = 0;
  mouseY = 0;
  mouseOver = false;
  /** True only on the frame left or right mouse button clicked inside canvas. */
  leftClicked = false;
  rightClicked = false;

  onKeyDown = (event: KeyboardEvent) => {
    // Ignore auto-repeat, otherwise holding a key would report a press every
    // frame and "press E to interact" would fire continuously.
    if (!this.keys.has(event.code)) this.pressedThisFrame.add(event.code);
    this.keys.add(event.code);
  };

  onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  setMousePos(x: number, y: number, inside: boolean): void {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseOver = inside;
  }

  triggerMouseClick(button: number, x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseOver = true;
    if (button === 0) this.leftClicked = true;
    if (button === 2) this.rightClicked = true;
  }

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
    this.leftClicked = false;
    this.rightClicked = false;
  }

  /** Forget all held keys, e.g. when the window loses focus. */
  reset(): void {
    this.keys.clear();
    this.pressedThisFrame.clear();
    this.leftClicked = false;
    this.rightClicked = false;
    this.mouseOver = false;
  }
}
