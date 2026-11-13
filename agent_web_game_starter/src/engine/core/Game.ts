import type { GameWorld } from "./GameWorld";
import { Input } from "../input/Input";
import { CanvasRenderer } from "../graphics/CanvasRenderer";

export class Game {
  private lastTime = 0;
  private readonly input = new Input();
  private readonly renderer: CanvasRenderer;
  private afterFrame: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: GameWorld
  ) {
    this.renderer = new CanvasRenderer(canvas);
  }

  start() {
    window.addEventListener("keydown", this.input.onKeyDown);
    window.addEventListener("keyup", this.input.onKeyUp);
    window.addEventListener("blur", () => this.input.reset());

    this.canvas.addEventListener("mousemove", (e) => {
      const pt = this.mapClientToCanvas(e.clientX, e.clientY);
      this.input.setMousePos(pt.x, pt.y, pt.inside);
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.input.setMousePos(this.input.mouseX, this.input.mouseY, false);
    });
    this.canvas.addEventListener("mousedown", (e) => {
      const pt = this.mapClientToCanvas(e.clientX, e.clientY);
      if (pt.inside) {
        this.input.triggerMouseClick(e.button, pt.x, pt.y);
      }
    });
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    requestAnimationFrame(this.loop);
  }

  /**
   * Maps client CSS coordinates into exact canvas pixel space accounting for
   * CSS `object-fit: contain` letterboxing and optional CSS transform scale.
   */
  private mapClientToCanvas(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (rect.width <= 0 || rect.height <= 0) {
      return { x: 0, y: 0, inside: false };
    }
    const aspectCanvas = cw / ch;
    const aspectRect = rect.width / rect.height;

    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (aspectRect > aspectCanvas) {
      drawW = rect.height * aspectCanvas;
      offsetX = (rect.width - drawW) / 2;
    } else {
      drawH = rect.width / aspectCanvas;
      offsetY = (rect.height - drawH) / 2;
    }

    const relX = clientX - rect.left - offsetX;
    const relY = clientY - rect.top - offsetY;
    const inside = relX >= 0 && relX <= drawW && relY >= 0 && relY <= drawH;
    return {
      x: Math.max(0, Math.min(cw, (relX / drawW) * cw)),
      y: Math.max(0, Math.min(ch, (relY / drawH) * ch)),
      inside
    };
  }

  /**
   * Run `callback` at the end of every frame, once the camera has been framed
   * and the frame drawn. Used to mirror live state somewhere observable; a
   * timer would race the loop and read half-updated values.
   */
  onAfterFrame(callback: () => void): void {
    this.afterFrame = callback;
  }

  /** The camera for the current frame. */
  get camera() {
    return this.renderer.camera;
  }

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.world.update(dt, this.input);

    // Frame the camera before drawing, so the whole frame renders consistently.
    const target = this.world.getCamera();
    const { camera } = this.renderer;
    camera.centerOn(target.x, target.y);
    camera.clampTo(target.mapWidth, target.mapHeight);

    this.renderer.clear("#1b1b1b");
    this.world.render(this.renderer);

    // Input edges last exactly one frame.
    this.input.endFrame();

    this.afterFrame?.();

    requestAnimationFrame(this.loop);
  };
}
