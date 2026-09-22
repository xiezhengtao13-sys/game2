import type { Renderer } from "./Renderer";

export class CanvasRenderer implements Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  beginFrame() {
    this.clear();
  }

  endFrame() {}

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawRect(x: number, y: number, width: number, height: number) {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(x, y, width, height);
  }
}
