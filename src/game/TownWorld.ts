import type { GameCamera, GameWorld } from "../engine/core/GameWorld";
import type { Input } from "../engine/input/Input";
import type { Renderer } from "../engine/graphics/Renderer";
import type { TileMap } from "./map/TileMap";
import { Player } from "./entities/Player";
import { PLAYER_INTERACT_REACH, PLAYER_SPAWN } from "./config";
import type { GameAssets } from "./assets";
import { findInteractable, reachPoint, type Interactable } from "./systems/Interaction";
import { TOWN_INTERACTABLES } from "./map/townMap";

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

/** Every tile asset id, so they can be preloaded in one go. */
export function tileAssetIds(): string[] {
  return Object.keys(TILE_FALLBACK).map((type) => `tile_${type}`);
}

/** How far above an interactable its prompt bubble floats, in pixels. */
const PROMPT_HEIGHT = 34;

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
  private readonly interactables: readonly Interactable[];

  /** What the player is currently being prompted about, or null. */
  private target: Interactable | null = null;

  constructor(
    map: TileMap,
    assets: GameAssets | null = null,
    interactables: readonly Interactable[] = TOWN_INTERACTABLES
  ) {
    this.map = map;
    this.assets = assets;
    this.interactables = interactables;
    this.player = new Player(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  }

  get tileMap(): TileMap {
    return this.map;
  }

  /** The interactable the player could act on right now. */
  get interactionTarget(): Interactable | null {
    return this.target;
  }

  update(dt: number, input: Input): void {
    this.player.update(dt, input, this.map);

    // Recomputed every frame after movement, so the prompt always reflects where
    // the player has ended up and which way they are facing.
    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    this.target = findInteractable(this.interactables, reach);
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
    this.renderProps(renderer);
    this.renderPlayer(renderer);
    this.renderPrompt(renderer);
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

  /**
   * Standing props that sit on top of the ground and are not part of the tile
   * grid, because the grid has one tile per square and these share their square
   * with the grass or path underneath.
   */
  private renderProps(renderer: Renderer): void {
    const noticeBoard = TOWN_INTERACTABLES.find((i) => i.id === "noticeboard");
    if (!noticeBoard) return;

    const image = this.assets?.image("bld_noticeboard") ?? null;
    renderer.drawSprite(image, noticeBoard.x, noticeBoard.y - 6, {
      anchor: "bottom-center",
      size: { w: 48, h: 48 },
      fallbackColor: "#c9a06a"
    });
  }

  private renderPlayer(renderer: Renderer): void {
    const frame = this.player.animation.frame;
    const image = this.assets?.image(frame.assetId) ?? null;
    const { width, height } = this.player;

    // bottom-center anchor: (x, y) is the player's feet. `flipX` is what lets a
    // single set of right-facing art serve both directions.
    renderer.drawSprite(image, this.player.centerX, this.player.y + height, {
      anchor: "bottom-center",
      flipX: frame.flipX,
      size: { w: width, h: height },
      fallbackColor: "#4a5fb0"
    });
  }

  /**
   * The "press E" bubble, floating above whatever the player is facing.
   *
   * Drawn in world space so it tracks the object as the camera moves, which is
   * what keeps it anchored rather than sliding around on screen.
   */
  private renderPrompt(renderer: Renderer): void {
    if (!this.target) return;

    const image = this.assets?.image("ui_prompt_e") ?? null;
    renderer.drawSprite(image, this.target.x, this.target.y - PROMPT_HEIGHT, {
      anchor: "bottom-center",
      size: { w: 32, h: 32 },
      fallbackColor: "#ffffff"
    });
  }
}
