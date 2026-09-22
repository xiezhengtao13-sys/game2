import type { GameCamera, GameWorld } from "../engine/core/GameWorld";
import type { Input } from "../engine/input/Input";
import type { Renderer } from "../engine/graphics/Renderer";
import type { TileMap } from "./map/TileMap";
import { Player } from "./entities/Player";
import { PLAYER_SPAWN } from "./config";
import type { GameAssets } from "./assets";

/**
 * Colour used for a tile while its art is missing or still loading. Flat but
 * distinct per surface, so "is the map right?" stays answerable by eye even
 * with no art at all.
 */
const TILE_FALLBACK: Record<string, string> = {
  grass: "#7ec850",
  path: "#b98b5e",
  water: "#4aa3d8",
  farmland: "#8a5f3c",
  wall: "#efe0c8",
  roof: "#c8593f"
};

/**
 * The town: ground layer plus the player, drawn in world coordinates.
 *
 * This is the v1 world. It replaced `DemoWorld`, which was scaffolding for
 * proving the renderer worked.
 */
export class TownWorld implements GameWorld {
  readonly player: Player;
  private readonly map: TileMap;
  private readonly assets: GameAssets | null;

  constructor(map: TileMap, assets: GameAssets | null = null) {
    this.map = map;
    this.assets = assets;
    this.player = new Player(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  }

  get tileMap(): TileMap {
    return this.map;
  }

  update(dt: number, input: Input): void {
    this.player.update(dt, input, this.map);
  }

  getCamera(): GameCamera {
    return {
      x: this.player.centerX,
      y: this.player.centerY,
      mapWidth: this.map.pixelWidth,
      mapHeight: this.map.pixelHeight
    };
  }

  render(renderer: Renderer): void {
    this.renderGround(renderer);
    this.renderPlayer(renderer);
  }

  /**
   * Draw only the tiles the camera can see. The view rect is taken from the
   * camera, so this stays correct for any viewport size.
   */
  private renderGround(renderer: Renderer): void {
    const { camera } = renderer;
    const size = this.map.tileSize;
    const view = {
      x: camera.worldX,
      y: camera.worldY,
      width: camera.viewportWidth,
      height: camera.viewportHeight
    };

    for (const tile of this.map.visibleTiles(view)) {
      const assetId = `tile_${tile.type}`;
      const image = this.assets?.image(assetId) ?? null;

      // Drawn at the tile's centre; tile art is centre-anchored. The explicit
      // size lets a flat block stand in for a missing image.
      renderer.drawSprite(image, tile.tx * size + size / 2, tile.ty * size + size / 2, {
        anchor: "center",
        size: { w: size, h: size },
        fallbackColor: TILE_FALLBACK[tile.type] ?? "#ff00ff"
      });
    }
  }

  private renderPlayer(renderer: Renderer): void {
    const image = this.assets?.image("player") ?? null;
    const { width, height } = this.player;

    // bottom-center anchor: (x, y) is the player's feet.
    renderer.drawSprite(image, this.player.centerX, this.player.y + height, {
      anchor: "bottom-center",
      size: { w: width, h: height },
      fallbackColor: "#4a5fb0"
    });
  }
}
