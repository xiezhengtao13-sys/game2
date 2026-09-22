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

  drawSprite(image: CanvasImageSource, x: number, y: number, options: SpriteOptions = {}): void {
    const { anchor = "center", flipX = false, scale = 1, fallbackColor } = options;

    this.withCamera(() => {
      const { w, h } = this.imageSize(image, scale);
      // Anchor decides where (x, y) sits on the sprite.
      const left = anchor === "bottom-center" ? x - w / 2 : x - w / 2;
      const top = anchor === "bottom-center" ? y - h : y - h / 2;

      if (flipX) {
        const { ctx } = this;
        ctx.save();
        ctx.translate(left + w / 2, 0);
        ctx.scale(-1, 1);
        this.blit(image, -w / 2, top, w, h, fallbackColor);
        ctx.restore();
        return;
      }

      this.blit(image, left, top, w, h, fallbackColor);
    });
  }

  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    this.text(text, x, y, options);
  }

  drawWorldText(text: string, x: number, y: number, options: TextOptions = {}): void {
    this.withCamera(() => this.text(text, x, y, options));
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

  private blit(
    image: CanvasImageSource,
    x: number,
    y: number,
    w: number,
    h: number,
    fallbackColor?: Color
  ): void {
    if (fallbackColor) {
      this.rect(x, y, w, h, { color: fallbackColor, radius: 4 });
      return;
    }
    this.ctx.drawImage(image, Math.round(x), Math.round(y), w, h);
  }

  private text(text: string, x: number, y: number, options: TextOptions): void {
    const { ctx } = this;
    const size = options.size ?? 14;
    ctx.save();
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.fillStyle = options.color ?? this.defaultTextColor;
    ctx.textAlign = options.align ?? "left";
    ctx.textBaseline = options.baseline ?? "top";
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
