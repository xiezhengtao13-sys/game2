/**
 * Loads images from URLs and hands them back by id.
 *
 * Kept deliberately dumb: it knows nothing about the asset manifest, the
 * placeholder recipes, or fallback rules. Those policy decisions live in
 * `src/game/assets/`, because this module is engine code and must not depend on
 * game code (see docs/AGENT_RULES.md).
 */

export interface LoadedAsset {
  id: string;
  image: HTMLImageElement | null;
}

export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly missing = new Set<string>();
  /** Why each failed load failed, for diagnosing missing art. */
  readonly failures = new Map<string, string>();

  private loadImage(id: string, url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (event) => {
        // The event carries no reason in most browsers, so record what we know.
        const detail = event instanceof Event ? event.type : String(event);
        this.failures.set(id, `${detail} (url length ${url.length})`);
        resolve(null);
      };
      image.src = url;
    });
  }

  /**
   * Load each id from its URL. Resolves for every id; a failed load is recorded
   * as missing rather than rejected, so one bad file cannot break the game.
   */
  async loadMany(sources: Iterable<{ id: string; url: string }>): Promise<LoadedAsset[]> {
    const results = await Promise.all(
      [...sources].map(async ({ id, url }) => ({ id, image: await this.loadImage(id, url) }))
    );

    for (const { id, image } of results) {
      if (image) this.images.set(id, image);
      else this.missing.add(id);
    }
    return results;
  }

  /** The image for `id`, or null when it is missing or failed to load. */
  get(id: string): HTMLImageElement | null {
    return this.images.get(id) ?? null;
  }

  /** True when `id` was requested but produced no usable image. */
  isMissing(id: string): boolean {
    return this.missing.has(id);
  }
}
