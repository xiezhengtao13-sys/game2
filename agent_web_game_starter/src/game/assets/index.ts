import { AssetLoader } from "../../engine/graphics/AssetLoader";
import { selectAssetSource, type UrlMap } from "./sources";
export { selectAssetSource } from "./sources";
import { ALL_ASSETS, getAssetSpec } from "./manifest";
import type { AssetSpec } from "./types";
import { resolvePortraitUrl } from "./portraits";

/**
 * The game-side asset layer: decides WHERE art comes from and what to do when
 * it is absent. The engine only provides the dumb `AssetLoader`.
 *
 * Fallback chain:
 *   1. assets/sprites/<id>.png   -- real art; wins whenever it exists
 *   2. assets/generated/<id>.png -- committed placeholder art
 *   3. no image                  -- caller draws from the manifest recipe
 *
 * See docs/ART_PIPELINE.md.
 */

const spriteUrls: UrlMap = import.meta.glob("../../../assets/sprites/*.png", {
  query: "?url",
  import: "default",
  eager: true
});

const generatedUrls: UrlMap = import.meta.glob("../../../assets/generated/*.png", {
  query: "?url",
  import: "default",
  eager: true
});

export function assetSourceFor(id: string): string | undefined {
  return selectAssetSource(id, spriteUrls, generatedUrls);
}

/** Debug: the URL chosen for an id, for diagnosing missing art. */
export function debugSourceFor(id: string): string | undefined {
  return assetSourceFor(id);
}

export interface GameAssets {
  /** The image for `id`, or null when only a placeholder recipe is available. */
  image(id: string): HTMLImageElement | null;
  /** High-resolution painterly portrait URL if present. */
  portraitUrl?(id: string): string | undefined;
  /** The manifest recipe for `id`. Always available; throws on an unknown id. */
  spec(id: string): AssetSpec;
  /** Ids that were looked up but have no image, so the caller must draw them. */
  missing(): string[];
  /** Why the failed loads failed, for diagnosing missing art. */
  failures(): Array<{ id: string; reason: string }>;
}

class LoadedAssets implements GameAssets {
  constructor(private readonly loader: AssetLoader) {}

  image(id: string): HTMLImageElement | null {
    return this.loader.get(id);
  }

  portraitUrl(id: string): string | undefined {
    return resolvePortraitUrl(id);
  }

  spec(id: string): AssetSpec {
    return getAssetSpec(id);
  }

  missing(): string[] {
    return ALL_ASSETS.filter((a) => this.loader.isMissing(a.id)).map((a) => a.id);
  }

  /** Why the failed loads failed, for diagnosing missing art. */
  failures(): Array<{ id: string; reason: string }> {
    return [...this.loader.failures.entries()].map(([id, reason]) => ({ id, reason }));
  }
}

/**
 * Load the given asset ids. Never rejects: an asset with no file simply has no
 * image, and the caller draws its recipe instead of crashing.
 */
export async function loadGameAssets(ids?: Iterable<string>): Promise<GameAssets> {
  const wanted = ids ? [...ids] : ALL_ASSETS.map((a) => a.id);
  const sources = wanted
    // `assetSourceFor` binds the bundler's maps. Calling the pure
    // `selectAssetSource` here instead would silently resolve nothing, because
    // its maps default to empty -- which is exactly the bug that hid all the art.
    .map((id) => ({ id, url: assetSourceFor(id) }))
    .filter((s): s is { id: string; url: string } => s.url !== undefined);

  const loader = new AssetLoader();
  await loader.loadMany(sources);
  return new LoadedAssets(loader);
}
