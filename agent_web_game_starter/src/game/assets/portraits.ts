import type { UrlMap } from "./sources";

/**
 * High-resolution Baldur's Gate 3 / Diablo-grade painterly CRPG portraits
 * kept cleanly separate from sprite tiles so the sprite manifest dimension guard
 * remains focused on pixel-accurate map tiles and walk frames.
 */
const portraitUrls: UrlMap = import.meta.glob("../../../assets/portraits/*.{jpg,jpeg,png}", {
  query: "?url",
  import: "default",
  eager: true
});

export type PortraitId =
  | "portrait_player"
  | "portrait_captain"
  | "portrait_engineer"
  | "portrait_medic"
  | "portrait_navigator"
  | "portrait_transit"
  | "portrait_terminal"
  | "portrait_reactor";

export function resolvePortraitUrl(id: string): string | undefined {
  for (const [path, url] of Object.entries(portraitUrls)) {
    const normalized = path.replaceAll("\\", "/");
    if (normalized.endsWith(`/${id}.jpg`) || normalized.endsWith(`/${id}.png`) || normalized.endsWith(`/${id}.jpeg`)) {
      return url;
    }
  }
  return undefined;
}
