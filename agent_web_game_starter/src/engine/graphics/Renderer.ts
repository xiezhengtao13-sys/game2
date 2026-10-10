/** A colour as a CSS hex literal, the same form the asset manifest uses. */
export type Color = string;

export interface RectOptions {
  color?: Color;
  /** Corner radius in pixels. */
  radius?: number;
  /** Cartoon outline drawn just outside the fill. */
  stroke?: { width: number; color: Color };
}

export interface SpriteOptions {
  /**
   * Where (x, y) refers to on the sprite.
   * `bottom-center` is what world entities use so they "stand" on their tile.
   */
  anchor?: "center" | "bottom-center";
  /** Mirror horizontally, so one facing can serve both left and right. */
  flipX?: boolean;
  /** Scale the image. Ignored when `size` is given. */
  scale?: number;
  /** Draw size in pixels. Required when there is no image to measure. */
  size?: { w: number; h: number };
  /**
   * Flat colour to draw instead of the image. Used when an asset has no image
   * yet, so the game still shows something recognisable.
   */
  fallbackColor?: Color;
}

export interface TextOptions {
  color?: Color;
  /** Font size in pixels. */
  size?: number;
  align?: "left" | "center" | "right";
  baseline?: "top" | "middle" | "bottom";
}

/**
 * Drawing surface for the game.
 *
 * Two rules keep this simple:
 *   1. **World space is the default.** `drawRect` and `drawSprite` take world
 *      coordinates and the renderer applies the camera, so no game code ever
 *      contains viewport maths.
 *   2. **Text is screen space.** `drawText` is for HUD-ish text that should not
 *      scroll. Use `drawWorldText` for labels attached to world objects.
 */
export interface Renderer {
  /** Viewport size in pixels. */
  readonly width: number;
  readonly height: number;

  /** Camera for the current frame. Read it to frame things; never do its maths. */
  readonly camera: import("./Camera").Camera;

  clear(color?: Color): void;

  drawRect(x: number, y: number, width: number, height: number, options?: RectOptions): void;
  /**
   * Draw a world sprite. `image` may be null, in which case `fallbackColor` is
   * drawn instead -- that is how the game stays playable while art is missing.
   */
  drawSprite(
    image: CanvasImageSource | null,
    x: number,
    y: number,
    options?: SpriteOptions
  ): void;
  /** Screen-space text (UI). */
  drawText(text: string, x: number, y: number, options?: TextOptions): void;
  /** World-space text, for labels pinned to objects on the map. */
  drawWorldText(text: string, x: number, y: number, options?: TextOptions): void;
}
