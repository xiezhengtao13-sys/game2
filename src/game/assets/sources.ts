/**
 * Choosing which file supplies an asset's art.
 *
 * Deliberately free of `import.meta.glob` and of any browser API, so this policy
 * is unit-testable in plain Node. The bundler-specific url maps are supplied by
 * `index.ts`, which is the only place that needs them.
 */

/** A map of module path -> resolved url, as produced by the bundler. */
export type UrlMap = Record<string, string>;

/**
 * Find the URL for `id` inside a map keyed by file path.
 *
 * Matches `id` as a whole file-name segment, so `grass` does not match
 * `tile_grass.png`. Both separators are accepted because Windows and POSIX
 * produce different paths.
 */
export function findUrl(urls: UrlMap, id: string): string | undefined {
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
 * The maps are injectable so the priority rule can be tested without a bundler.
 */
export function selectAssetSource(
  id: string,
  sprites: UrlMap = {},
  generated: UrlMap = {}
): string | undefined {
  return findUrl(sprites, id) ?? findUrl(generated, id);
}
