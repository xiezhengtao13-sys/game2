import type { TileMap } from "../map/TileMap";
import type { GameAssets } from "../assets";
import { Scene, type ScenePerson, type SceneProp } from "./Scene";
import { BRIDGE_PROPS, BRIDGE_PEOPLE } from "./bridgeProps";
import { BRIDGE_TILE } from "../config";

/**
 * The bridge: an elliptical command hall.
 *
 * Bigger than the viewport, so unlike the captain's cabin the camera follows the
 * player. That is the point: walking in should feel like entering a much larger
 * space, which is what the setting document keeps asking for.
 *
 * The doorway is in the south of the hall; the player arrives from aft and walks
 * forward toward the display.
 */
export class Bridge extends Scene {
  constructor(
    map: TileMap,
    assets: GameAssets | null = null,
    props: readonly SceneProp[] = BRIDGE_PROPS,
    people: readonly ScenePerson[] = BRIDGE_PEOPLE
  ) {
    super(map, assets, spawnPoint(map), props, people, {
      tileSize: BRIDGE_TILE,
      // Outside the hull is structure, not void; the deck tile covers the
      // viewport edges before the map is drawn.
      backdropColor: "#5c636d",
      backdropTile: "tile_hull",
      // The hall's furniture is large, so the bubble floats a little higher.
      promptHeight: 34
    });
  }
}

/**
 * Just inside the doorway in the south of the hall.
 *
 * Found by scanning the map for the aft-most run of floor light, which is the
 * doorway, rather than hardcoding a tile. If the doorway moves, the spawn
 * follows; if it is deleted, this throws instead of dropping the player inside a
 * bulkhead.
 */
function spawnPoint(map: TileMap): { x: number; y: number } {
  const size = map.tileSize;
  let best: { tx: number; ty: number } | null = null;

  for (let ty = map.height - 1; ty >= 1; ty--) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.tileAt(tx, ty) !== "floor_light") continue;
      best = { tx, ty };
      break;
    }
    if (best) break;
  }

  if (!best) throw new Error("Bridge has no doorway: no floor light found near the aft wall");

  // Stand just inside the hall, a tile forward of the doorway. The doorway is cut
  // through the aft bulkhead, and the deck beyond it is the outer aisle, whose far
  // edge is the hull -- spawning there puts the player able to touch bare
  // structure, which reads as a gap in the ship.
  return { x: best.tx * size + size / 2 - 16, y: (best.ty - 2) * size };
}
