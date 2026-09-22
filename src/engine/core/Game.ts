import type { GameWorld } from "./GameWorld";
import { Input } from "../input/Input";
import { CanvasRenderer } from "../graphics/CanvasRenderer";

export class Game {
  private lastTime = 0;
  private readonly input = new Input();
  private readonly renderer: CanvasRenderer;

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

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.world.update(dt, this.input);
    this.renderer.beginFrame();
    this.world.render(this.renderer);
    this.renderer.endFrame();

    requestAnimationFrame(this.loop);
  };
}
