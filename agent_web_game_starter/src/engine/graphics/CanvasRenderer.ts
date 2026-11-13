import type { Color, RectOptions, Renderer, SpriteOptions, TextOptions } from "./Renderer";
import { SimpleCamera, type Camera } from "./Camera";

/**
 * Canvas2D implementation of {@link Renderer}.
 *
 * Owns the camera transform for the frame: every world-space draw is wrapped in
 * a translate by the camera, so callers work purely in world coordinates.
 */
export class CanvasRenderer implements Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  readonly camera: Camera;
  private defaultTextColor: Color = "#ffffff";
  private lightCanvas: HTMLCanvasElement | null = null;
  private lightCtx: CanvasRenderingContext2D | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.camera = new SimpleCamera(canvas.width, canvas.height);
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  clear(color?: Color): void {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.clearRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, options: RectOptions = {}): void {
    this.withCamera(() => this.rect(x, y, width, height, options));
  }

  drawSprite(
    image: CanvasImageSource | null,
    x: number,
    y: number,
    options: SpriteOptions = {}
  ): void {
    const { anchor = "center", flipX = false, scale = 1, size, fallbackColor } = options;

    this.withCamera(() => {
      const resolved = size ?? (image ? this.imageSize(image, scale) : { w: 16, h: 16 });
      const { w, h } = resolved;
      // Anchor decides where (x, y) sits on the sprite.
      const left = x - w / 2;
      const top = anchor === "bottom-center" ? y - h : y - h / 2;

      if (!image) {
        // No art yet: a flat block keeps the layout readable.
        this.rect(left, top, w, h, { color: fallbackColor ?? "#ff00ff", radius: 4 });
        return;
      }

      if (flipX) {
        const { ctx } = this;
        ctx.save();
        ctx.translate(left + w / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, Math.round(-w / 2), Math.round(top), w, h);
        ctx.restore();
        return;
      }

      this.ctx.drawImage(image, Math.round(left), Math.round(top), w, h);
    });
  }

  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    this.text(text, x, y, options);
  }

  drawWorldText(text: string, x: number, y: number, options: TextOptions = {}): void {
    this.withCamera(() => this.text(text, x, y, options));
  }

  drawGradientRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stops: ReadonlyArray<{ offset: number; color: Color }>,
    vertical = true
  ): void {
    this.withCamera(() => {
      const { ctx } = this;
      const grad = vertical
        ? ctx.createLinearGradient(x, y, x, y + height)
        : ctx.createLinearGradient(x, y, x + width, y);
      for (const s of stops) grad.addColorStop(s.offset, s.color);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, width, height);
    });
  }

  drawEllipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: Color,
    additive = false
  ): void {
    this.withCamera(() => {
      const { ctx } = this;
      ctx.save();
      if (additive) ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    });
  }

  drawRadialLight(
    x: number,
    y: number,
    radius: number,
    innerColor: Color,
    outerColor: Color,
    additive = true
  ): void {
    this.withCamera(() => {
      const { ctx } = this;
      const r = Math.max(1, radius);
      ctx.save();
      if (additive) ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(1, outerColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
    width = 1.5,
    dash?: readonly number[]
  ): void {
    this.withCamera(() => {
      const { ctx } = this;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash([...dash]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    });
  }

  beginLightMask(ambientColor: Color): void {
    if (typeof document === "undefined") return;
    if (!this.lightCanvas || this.lightCanvas.width !== this.width || this.lightCanvas.height !== this.height) {
      this.lightCanvas = document.createElement("canvas");
      this.lightCanvas.width = this.width;
      this.lightCanvas.height = this.height;
      this.lightCtx = this.lightCanvas.getContext("2d");
    }
    const lctx = this.lightCtx;
    if (!lctx) return;

    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, this.width, this.height);
    lctx.fillStyle = ambientColor;
    lctx.fillRect(0, 0, this.width, this.height);
    lctx.restore();
  }

  punchLightHole(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    coneAngleRad?: number,
    coneSpreadRad?: number
  ): void {
    const lctx = this.lightCtx;
    if (!lctx) return;

    const sx = x - Math.round(this.camera.worldX);
    const sy = y - Math.round(this.camera.worldY);
    const r = Math.max(1, outerRadius);
    if (sx < -r || sy < -r || sx > this.width + r || sy > this.height + r) return;

    lctx.save();
    lctx.globalCompositeOperation = "destination-out";

    if (coneAngleRad !== undefined && coneSpreadRad !== undefined) {
      // Tactical cone beam (e.g. suit flashlight / headlight)
      lctx.beginPath();
      lctx.moveTo(sx, sy);
      lctx.arc(sx, sy, r, coneAngleRad - coneSpreadRad / 2, coneAngleRad + coneSpreadRad / 2);
      lctx.closePath();
      const grad = lctx.createRadialGradient(sx, sy, Math.max(1, innerRadius), sx, sy, r);
      grad.addColorStop(0, "rgba(0,0,0,0.96)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.65)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = grad;
      lctx.fill();
    } else {
      const grad = lctx.createRadialGradient(sx, sy, Math.max(0, innerRadius), sx, sy, r);
      grad.addColorStop(0, "rgba(0,0,0,0.98)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.62)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = grad;
      lctx.beginPath();
      lctx.arc(sx, sy, r, 0, Math.PI * 2);
      lctx.fill();
    }

    lctx.restore();
  }

  endLightMask(): void {
    if (!this.lightCanvas) return;
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.lightCanvas, 0, 0);
    ctx.restore();
  }

  // --- internals -------------------------------------------------------------

  /**
   * Run `draw` with the camera applied, so world coordinates map to the screen.
   * The camera only ever translates, keeping sprite pixel edges crisp.
   */
  private withCamera(draw: () => void): void {
    const { ctx, camera } = this;
    ctx.save();
    ctx.translate(-Math.round(camera.worldX), -Math.round(camera.worldY));
    draw();
    ctx.restore();
  }

  private rect(x: number, y: number, width: number, height: number, options: RectOptions): void {
    const { ctx } = this;
    const radius = options.radius ?? 0;
    const strokeWidth = options.stroke?.width ?? 0;
    // The stroke sits outside the fill, so the path is inset by half of it.
    const inset = strokeWidth / 2;
    const px = x + inset;
    const py = y + inset;
    const pw = Math.max(0, width - strokeWidth);
    const ph = Math.max(0, height - strokeWidth);
    const r = Math.max(0, Math.min(radius, pw / 2, ph / 2));

    ctx.beginPath();
    if (r > 0) {
      ctx.roundRect(px, py, pw, ph, r);
    } else {
      ctx.rect(px, py, pw, ph);
    }

    if (options.color) {
      ctx.fillStyle = options.color;
      ctx.fill();
    }
    if (options.stroke) {
      ctx.lineWidth = options.stroke.width;
      ctx.strokeStyle = options.stroke.color;
      ctx.stroke();
    }
  }

  private text(text: string, x: number, y: number, options: TextOptions): void {
    const { ctx } = this;
    const size = options.size ?? 14;
    ctx.save();
    ctx.font = `600 ${size}px "Segoe UI", system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = options.color ?? this.defaultTextColor;
    ctx.textAlign = options.align ?? "left";
    ctx.textBaseline = options.baseline ?? "top";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /** Intrinsic size of an image, or a sane default for sources that lack one. */
  private imageSize(image: CanvasImageSource, scale: number) {
    if (image instanceof HTMLImageElement && image.naturalWidth > 0) {
      return { w: image.naturalWidth * scale, h: image.naturalHeight * scale };
    }
    if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) {
      return { w: image.width * scale, h: image.height * scale };
    }
    // OffscreenCanvas / ImageBitmap expose width & height directly.
    const sized = image as { width?: number; height?: number };
    const w = sized.width ?? 16;
    const h = sized.height ?? 16;
    return { w: w * scale, h: h * scale };
  }
}
