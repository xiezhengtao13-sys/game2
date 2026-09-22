import type { GameWorld } from "../engine/core/GameWorld";
import type { Input } from "../engine/input/Input";
import type { Renderer } from "../engine/graphics/Renderer";

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

export class DemoWorld implements GameWorld {
  private player = {
    x: 620,
    y: 340,
    width: 40,
    height: 40,
    speed: 250
  };

  update(dt: number, input: Input) {
    let dx = 0;
    let dy = 0;

    if (input.isDown("KeyW")) dy -= 1;
    if (input.isDown("KeyS")) dy += 1;
    if (input.isDown("KeyA")) dx -= 1;
    if (input.isDown("KeyD")) dx += 1;

    // Normalize so diagonal movement is not faster than straight movement.
    const length = Math.hypot(dx, dy) || 1;
    const nextX = this.player.x + (dx / length) * this.player.speed * dt;
    const nextY = this.player.y + (dy / length) * this.player.speed * dt;

    this.player.x = Math.min(Math.max(nextX, 0), WORLD_WIDTH - this.player.width);
    this.player.y = Math.min(Math.max(nextY, 0), WORLD_HEIGHT - this.player.height);
  }

  render(renderer: Renderer) {
    renderer.drawRect(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );
  }
}
