import type { Input } from "../input/Input";
import type { Renderer } from "../graphics/Renderer";

export interface GameWorld {
  update(dt: number, input: Input): void;
  render(renderer: Renderer): void;
}
