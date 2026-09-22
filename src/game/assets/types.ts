// Types for the placeholder art pipeline.
//
// Deliberately DOM-free and dependency-free so that BOTH sides can use them:
//   - src/game/...      (the game, at runtime, for fallback rendering)
//   - scripts/gen-*.mjs (plain Node, for pre-generating PNGs)
//
// See docs/ART_PIPELINE.md for the workflow these types serve.

export interface Size {
  w: number;
  h: number;
}

/**
 * Where (x, y) refers to on the sprite.
 * `bottom-center` is what world objects normally use so they visually "stand"
 * on their tile rather than being centered on it.
 */
export type Anchor = "center" | "bottom-center";

/**
 * A placeholder primitive. Coordinates are in sprite space, relative to the
 * anchor: x grows right, y grows DOWN, (0, 0) is the anchor point.
 *
 * Everything is ultimately a rounded rect. That covers flat color blocks (no
 * stroke), cartoon-outlined characters (stroke), and dots such as eyes or
 * berries (a 4x4 rounded rect is a circle).
 */
export interface Shape {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** Corner radius in pixels. Omit for square corners. */
  radius?: number;
  /** Optional cartoon outline, drawn just outside the shape. */
  stroke?: { width: number; color: string };
}

/**
 * A small deterministic dot pattern, for texture such as dirt or grass.
 * Dot placement is derived from the asset id, so the same id always produces
 * the same image -- no RNG state, and no churn in generated files.
 */
export interface Speckle {
  count: number;
  color: string;
  sizeMin: number;
  sizeMax: number;
}

export interface PlaceholderRecipe {
  shapes: Shape[];
  speckles?: Speckle;
}

export interface AssetSpec {
  /** Stable identifier. This is what game code references -- never a file path. */
  id: string;
  /** Human-readable Chinese name, used in the art brief. */
  nameZh: string;
  /** Chinese description, for humans reading the manifest. */
  descZh: string;
  /**
   * English description used directly as an image-generation prompt: subject,
   * viewing angle, palette, and line style all spelled out.
   */
  descEn: string;
  size: Size;
  anchor: Anchor;
  /** Category, used only to group the generated art brief. */
  category: "terrain" | "character" | "crop" | "building" | "item" | "ui";
  placeholder: PlaceholderRecipe;
}
