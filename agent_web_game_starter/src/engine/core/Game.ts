import type { GameWorld } from "./GameWorld";
import { Input } from "../input/Input";
import { CanvasRenderer } from "../graphics/CanvasRenderer";

export class Game {
  private lastTime = 0;
  private readonly input = new Input();
  private readonly renderer: CanvasRenderer;
  private afterFrame: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly world: GameWorld
  ) {
    this.renderer = new CanvasRenderer(canvas);
  }

  start() {
    window.addEventListener("keydown", this.input.onKeyDown);
    window.addEventListener("keyup", this.input.onKeyUp);
    requestAnimationFrame(this.loop);
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
