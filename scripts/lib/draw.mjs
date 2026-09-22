// Renders a PlaceholderRecipe into a Raster.
//
// Shared coordinate convention with the game's renderer: coordinates are
// relative to the anchor, y grows down, and `bottom-center` means (0,0) sits at
// the bottom middle of the sprite. Keeping the two in sync is what lets the
// same recipe work both pre-generated (PNG) and drawn live (Canvas).
import { Raster, parseColor } from "./png.mjs";

/** Deterministic 32-bit hash, so a given asset id always yields the same art. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Signed distance from a point to a rounded rect centred on the origin:
 * negative inside, zero on the edge, positive outside.
 */
function distanceToRoundedRect(cx, cy, hw, hh, r) {
  const dx = Math.abs(cx) - (hw - r);
  const dy = Math.abs(cy) - (hh - r);
  return dx > 0 && dy > 0 ? Math.hypot(dx, dy) - r : Math.max(dx, dy) - r;
}

/**
 * Coverage of one pixel by an axis-aligned rounded rect, sampled on a 3x3 grid.
 * Returned as 0..1 so edges can be blended, keeping flat cartoon shapes from
 * looking jagged at the rounded corners.
 *
 * The pixel position is relative to the RECT'S CENTER, and the rect's own
 * width/height are given separately -- passing a top-left corner here is a
 * mistake this signature makes hard to write by accident.
 */
function coversPixel(rectW, rectH, relX, relY, radius) {
  const hw = rectW / 2;
  const hh = rectH / 2;
  const r = Math.max(0, Math.min(radius, hw, hh));

  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const ox = relX + (sx + 0.5) / 3;
      const oy = relY + (sy + 0.5) / 3;
      if (distanceToRoundedRect(ox, oy, hw, hh, r) <= 0) hits++;
    }
  }
  return hits / 9;
}

function fillShape(raster, shape, anchorOffsetX, anchorOffsetY) {
  const color = parseColor(shape.color);
  const stroke = shape.stroke
    ? { width: shape.stroke.width, color: parseColor(shape.stroke.color) }
    : undefined;
  const radius = shape.radius ?? 0;
  const pad = stroke ? stroke.width : 0;

  // Shape position in sprite space.
  const sx = shape.x + anchorOffsetX;
  const sy = shape.y + anchorOffsetY;

  // Scan only the region the shape (plus its outward stroke) can touch.
  const x0 = Math.floor(sx - pad);
  const x1 = Math.ceil(sx + shape.w + pad);
  const y0 = Math.floor(sy - pad);
  const y1 = Math.ceil(sy + shape.h + pad);

  // The stroke sits outside the fill, so the stroke's outer edge is simply a
  // bigger rounded rect with the same center.
  const outerW = shape.w + pad * 2;
  const outerH = shape.h + pad * 2;
  const outerR = radius + pad;
  const centerX = sx + shape.w / 2;
  const centerY = sy + shape.h / 2;

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      // Offset of this pixel's top-left corner from the shape center.
      const relX = px - centerX;
      const relY = py - centerY;

      const outer = coversPixel(outerW, outerH, relX, relY, outerR);
      if (outer <= 0) continue;

      if (stroke) {
        const inner = coversPixel(shape.w, shape.h, relX, relY, radius);
        if (inner < outer) {
          raster.blend(px, py, stroke.color, outer - inner);
        }
        if (inner > 0) {
          raster.blend(px, py, color, inner);
        }
        continue;
      }

      raster.blend(px, py, color, outer);
    }
  }
}

function drawSpeckles(raster, speckles, spec) {
  const { w, h } = spec.size;
  // Anchor-relative bounds of the sprite.
  const left = -w / 2;
  const top = spec.anchor === "center" ? -h / 2 : -h;

  const rng = makeRng(hashString(spec.id));
  const sizeSpan = Math.max(1, speckles.sizeMax - speckles.sizeMin + 1);

  for (let i = 0; i < speckles.count; i++) {
    const size = speckles.sizeMin + Math.floor(rng() * sizeSpan);
    const x = left + Math.floor(rng() * Math.max(1, w - size));
    const y = top + Math.floor(rng() * Math.max(1, h - size));

    // Already in anchor-relative space, so no translation is applied.
    fillShape(raster, { kind: "rect", x, y, w: size, h: size, color: speckles.color, radius: Math.floor(size / 2) }, 0, 0);
  }
}

/** Render one asset spec to a raster. */
export function renderPlaceholder(spec) {
  const { w, h } = spec.size;

  // Recipes are written in anchor-relative coordinates, but the raster's pixel
  // grid starts at its top-left corner. Tell the raster where the anchor sits
  // in that grid:
  //   center        -> anchor is the middle of the sprite
  //   bottom-center -> anchor is the middle of the bottom edge
  const origin =
    spec.anchor === "center"
      ? { x: -w / 2, y: -h / 2 }
      : { x: -w / 2, y: -h };

  const raster = new Raster(w, h, origin);
  const anchorOffsetX = 0;
  const anchorOffsetY = 0;

  for (const shape of spec.placeholder.shapes) {
    fillShape(raster, shape, anchorOffsetX, anchorOffsetY);
  }
  if (spec.placeholder.speckles) {
    drawSpeckles(raster, spec.placeholder.speckles, spec);
  }
  return raster;
}

export { hashString, makeRng, parseColor, Raster };
