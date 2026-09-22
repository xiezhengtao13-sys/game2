export class Input {
  private keys = new Set<string>();

  onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
  };

  onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  isDown(code: string) {
    return this.keys.has(code);
  }
}
