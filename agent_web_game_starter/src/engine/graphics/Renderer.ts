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

  // --- Optional BG3 / Diablo atmospheric CRPG lighting primitives -----------

  /** Draw a smooth linear-gradient world rectangle (used for 2.5D wall extrusion & AO). */
  drawGradientRect?(
    x: number,
    y: number,
    width: number,
    height: number,
    stops: ReadonlyArray<{ offset: number; color: Color }>,
    vertical?: boolean
  ): void;

  /** Draw a soft ellipse (contact shadows under props & crew, or volumetric pools). */
  drawEllipse?(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: Color,
    additive?: boolean
  ): void;

  /** Draw a radial gradient point light halo in world space. */
  drawRadialLight?(
    x: number,
    y: number,
    radius: number,
    innerColor: Color,
    outerColor: Color,
    additive?: boolean
  ): void;

  /** Draw a crisp line in world space (reticles, navigation paths, cables). */
  drawLine?(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
    width?: number,
    dash?: readonly number[]
  ): void;

  /** Begin offscreen atmospheric darkness pass (clears & fills ambient shadow tint). */
  beginLightMask?(ambientColor: Color): void;

  /** Punch a radial or cone-shaped light cutout through the offscreen darkness mask. */
  punchLightHole?(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    coneAngleRad?: number,
    coneSpreadRad?: number
  ): void;

  /** Composite the offscreen darkness mask onto the viewport. */
  endLightMask?(): void;
}
