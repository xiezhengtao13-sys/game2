export interface Renderer {
  clear(): void;
  drawRect(x: number, y: number, width: number, height: number): void;
}
