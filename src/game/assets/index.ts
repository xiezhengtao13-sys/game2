import { AssetLoader } from "../../engine/graphics/AssetLoader";
import { ALL_ASSETS, getAssetSpec } from "./manifest";
import type { AssetSpec } from "./types";

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

// Vite rewrites these globs at build time into path -> URL maps.
// `?.` keeps this module importable under plain Node (tests, build scripts),
// where the transform does not exist and the expression is undefined.
const spriteUrls: Record<string, string> = import.meta.glob?.("../../../assets/sprites/*.png", {
  query: "?url",
  import: "default",
  eager: true
}) ?? {};

const generatedUrls: Record<string, string> = import.meta.glob?.("../../../assets/generated/*.png", {
  query: "?url",
  import: "default",
  eager: true
}) ?? {};

/**
 * Find the URL for `id` inside a glob map keyed by file path.
 *
 * Matches the `id` as a whole file-name segment, so `grass` does not match
 * `tile_grass.png`. Both separators are accepted because Windows and POSIX
 * produce different paths.
 */
function findUrl(urls: Record<string, string>, id: string): string | undefined {
  const wanted = new Set([`/${id}.png`, `\\${id}.png`]);
  for (const [path, url] of Object.entries(urls)) {
    for (const suffix of wanted) {
      if (path.endsWith(suffix)) return url;
    }
  }
  return undefined;
}

/**
 * Choose the source URL for an asset id, preferring real art over placeholder.
 *
 * Pure, and the maps are injectable, so the priority rule is unit-testable
 * without a browser or a bundler.
 */
export function selectAssetSource(
  id: string,
  sprites: Record<string, string> = spriteUrls,
  generated: Record<string, string> = generatedUrls
): string | undefined {
  return findUrl(sprites, id) ?? findUrl(generated, id);
}

export interface GameAssets {
  /** The image for `id`, or null when only a placeholder recipe is available. */
  image(id: string): HTMLImageElement | null;
  /** The manifest recipe for `id`. Always available; throws on an unknown id. */
  spec(id: string): AssetSpec;
  /** Ids that were looked up but have no image, so the caller must draw them. */
  missing(): string[];
}

class LoadedAssets implements GameAssets {
  constructor(private readonly loader: AssetLoader) {}

  image(id: string): HTMLImageElement | null {
    return this.loader.get(id);
  }

  spec(id: string): AssetSpec {
    return getAssetSpec(id);
  }

  missing(): string[] {
    return ALL_ASSETS.filter((a) => this.loader.isMissing(a.id)).map((a) => a.id);
  }
}

/**
 * Load the given asset ids. Never rejects: an asset with no file simply has no
 * image, and the caller draws its recipe instead of crashing.
 */
export async function loadGameAssets(ids?: Iterable<string>): Promise<GameAssets> {
  const wanted = ids ? [...ids] : ALL_ASSETS.map((a) => a.id);
  const sources = wanted
    .map((id) => ({ id, url: selectAssetSource(id) }))
    .filter((s): s is { id: string; url: string } => s.url !== undefined);

  const loader = new AssetLoader();
  await loader.loadMany(sources);
  return new LoadedAssets(loader);
}
