import type { Input } from "../input/Input";
import type { Renderer } from "../graphics/Renderer";

export interface GameWorld {
  /** Advance the simulation. Reads input; never touches the DOM. */
  update(dt: number, input: Input): void;
  /** Draw one frame, in world coordinates. */
  render(renderer: Renderer): void;
  /**
   * Where the camera should look this frame. Called after `update`, so it can
   * follow whatever the world just did. The returned value is only read.
   */
  getCamera(): GameCamera;
}

export interface GameCamera {
  /** World point to frame at the centre of the viewport. */
  x: number;
  y: number;
  /** World bounds the view must stay inside. */
  mapWidth: number;
  mapHeight: number;
}
