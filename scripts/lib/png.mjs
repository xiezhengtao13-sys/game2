// Minimal RGBA raster + PNG encoder.
//
// This exists so placeholder art can be generated with the plain `node` runtime
// only -- no Pillow, no node-canvas, no native module, no browser. PNG needs
// just zlib deflate and CRC32, both of which Node ships.
import { deflateSync } from "node:zlib";

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} RGBA
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

export class Raster {
  /**
   * @param {number} width
   * @param {number} height
   * @param {{ x: number, y: number }} [origin] coordinates of pixel (0, 0) in
   *   whatever space the caller draws in. Defaults to the top-left corner, so
   *   drawing in simple `0..width` / `0..height` space needs no thought.
   */
  constructor(width, height, origin = { x: 0, y: 0 }) {
    this.width = width;
    this.height = height;
    this.origin = origin;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }

  /** Convert a point in the caller's drawing space to a pixel index, or -1. */
  indexOf(x, y) {
    const px = x - this.origin.x;
    const py = y - this.origin.y;
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return -1;
    return py * this.width + px;
  }

  /** Source-over alpha blend of `color` onto the pixel at (x, y). */
  blend(x, y, color, coverage = 1) {
    const index = this.indexOf(x, y);
    if (index < 0) return;

    const alpha = (color.a / 255) * coverage;
    if (alpha <= 0) return;

    const i = index * 4;
    const p = this.pixels;
    const dstA = p[i + 3] / 255;
    const outA = alpha + dstA * (1 - alpha);
    if (outA <= 0) {
      p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0;
      return;
    }

    p[i] = (color.r * alpha + p[i] * dstA * (1 - alpha)) / outA;
    p[i + 1] = (color.g * alpha + p[i + 1] * dstA * (1 - alpha)) / outA;
    p[i + 2] = (color.b * alpha + p[i + 2] * dstA * (1 - alpha)) / outA;
    p[i + 3] = outA * 255;
  }

  toPNG() {
    const { width, height, pixels } = this;

    // One filter byte (0 = None) per scanline.
    const raw = Buffer.alloc(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
      const rowStart = y * (width * 4 + 1);
      raw[rowStart] = 0;
      for (let x = 0; x < width * 4; x++) {
        raw[rowStart + 1 + x] = pixels[y * width * 4 + x];
      }
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0))
    ]);
  }
}

/** Parse `#rgb` or `#rrggbb` (with optional `#rrggbbaa`). */
export function parseColor(hex) {
  const s = hex.startsWith("#") ? hex.slice(1) : hex;

  if (s.length === 3) {
    return {
      r: parseInt(s[0] + s[0], 16),
      g: parseInt(s[1] + s[1], 16),
      b: parseInt(s[2] + s[2], 16),
      a: 255
    };
  }
  if (s.length === 6 || s.length === 8) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255
    };
  }
  throw new Error(`Unsupported color: ${hex}`);
}
