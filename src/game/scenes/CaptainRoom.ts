import type { GameCamera, GameWorld } from "../../engine/core/GameWorld";
import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH, PLAYER_SPAWN, ROOM_HEIGHT, ROOM_WIDTH } from "../config";
import { ROOM_PROPS, type Prop } from "./captainRoomProps";

/**
 * Colour used for a tile while its art is missing or still loading.
 *
 * Deliberately ugly. An earlier project picked fallback colours that matched the
 * real art, and a bug that stopped all artwork loading went unnoticed for ten
 * tasks because the screenshots still "looked fine". These are picked to be
 * obviously wrong so that failure mode cannot recur.
 */
const TILE_FALLBACK: Record<string, string> = {
  deck: "#ff00ff",
  deck_rug: "#ff00ff",
  wall: "#ff00ff",
  wall_dark: "#ff00ff",
  window: "#ff00ff",
  floor_light: "#ff00ff"
};

/** How far above an interactable its prompt bubble floats, in pixels. */
const PROMPT_HEIGHT = 30;

/**
 * The captain's quarters: the game's first scene.
 *
 * Reached as a low-ranking crew member, so everything here is seen from the
 * doorway: the captain's working space, his books, his photograph of Earth.
 */
export class CaptainRoom implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();

  private readonly map: TileMap;
  private readonly assets: GameAssets | null;
  private readonly props: readonly Prop[];
  private readonly interactables: readonly Interactable[];
  /** Interactable id -> the prop behind it. Avoids reverse-parsing ids. */
  private readonly propById = new Map<string, Prop>();

  /** What the player is being prompted about right now, or null. */
  private target: Interactable | null = null;

  /** Told whenever the open dialogue changes, so the DOM box can redraw. */
  onDialogueChange: ((dialogue: Dialogue | null) => void) | null = null;

  constructor(map: TileMap, assets: GameAssets | null = null, props: readonly Prop[] = ROOM_PROPS) {
    this.map = map;
    this.assets = assets;
    this.props = props;
    this.player = new Player(PLAYER_SPAWN.x, PLAYER_SPAWN.y);

    // Only props with something to say become interaction targets, so there is
    // no way to press E on a chair and get nothing.
    const interactables: Interactable[] = [];
    props.forEach((prop, index) => {
      if (!prop.lines || prop.lines.length === 0) return;

      const id = `prop-${index}`;
      this.propById.set(id, prop);
      interactables.push({
        id,
        label: prop.label,
        x: prop.x,
        y: prop.y,
        // Big furniture is reachable from further out; small objects need you to
        // be standing right at them.
        radius: Math.max(28, (Math.max(prop.w, prop.h) * this.map.tileSize) / 2)
      });
    });
    this.interactables = interactables;
  }

  get tileMap(): TileMap {
    return this.map;
  }

  /** The prop the player could examine right now. */
  get interactionTarget(): Interactable | null {
    return this.target;
  }

  /** Everything in the room that can be examined, for tests and tooling. */
  get examinable(): readonly Interactable[] {
    return this.interactables;
  }

  /** The label on the current prompt, for the HUD. */
  get interactionLabel(): string | null {
    return this.target?.label ?? null;
  }

  update(dt: number, input: Input): void {
    if (this.dialogue.isOpen) {
      // The player is frozen while reading; only the box advances.
      if (input.wasPressed("KeyE") || input.wasPressed("Space")) {
        this.dialogue.advance();
        this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
      }
      return;
    }

    this.player.update(dt, input, this.map);

    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    this.target = findInteractable(this.interactables, reach);

    if (this.target && input.wasPressed("KeyE")) this.examine(this.target);
  }

  /** Open the description for a prop, turning to face it first. */
  private examine(target: Interactable): void {
    const prop = this.propById.get(target.id);
    if (!prop?.lines) return;

    const dx = target.x - this.player.centerX;
    const dy = target.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    this.target = null;
    this.dialogue.open(prop.lines);
    this.onDialogueChange?.(this.dialogue);
  }

  getCamera(): GameCamera {
    // The room is smaller than the viewport, so the camera's `clampTo` centres it
    // on screen. Anything showing around the edges is filled with deck plating in
    // `renderDeck`, so it reads as "you are inside a ship" rather than as void.
    return { x: 0, y: 0, mapWidth: ROOM_WIDTH, mapHeight: ROOM_HEIGHT };
  }

  render(renderer: Renderer): void {
    this.renderBackdrop(renderer);
    this.renderDeck(renderer);
    this.renderProps(renderer);
    this.renderPlayer(renderer);
    this.renderPrompt(renderer);
  }

  /**
   * Deck plating across the whole viewport, behind everything.
   *
   * The room is smaller than the viewport, so without this there would be plain
   * void down the sides. Continuing the floor outward is both cheaper and more
   * honest than stretching the room: you are standing in a compartment, and the
   * compartment has more floor than this one cabin.
   */
  private renderBackdrop(renderer: Renderer): void {
    const image = this.assets?.image("tile_deck") ?? null;
    const size = this.map.tileSize;

    for (let y = 0; y < renderer.height; y += size) {
      for (let x = 0; x < renderer.width; x += size) {
        renderer.drawSprite(image, x + size / 2, y + size / 2, {
          anchor: "center",
          size: { w: size, h: size },
          fallbackColor: "#ff00ff"
        });
      }
    }
  }

  /** Only the tiles the camera can see, so this stays correct at any size. */
  private renderDeck(renderer: Renderer): void {
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

      renderer.drawSprite(image, tile.tx * size + size / 2, tile.ty * size + size / 2, {
        anchor: "center",
        size: { w: size, h: size },
        fallbackColor: TILE_FALLBACK[tile.type] ?? "#ff00ff"
      });
    }
  }

  /** Furniture, drawn over the deck. */
  private renderProps(renderer: Renderer): void {
    for (const prop of this.props) {
      const image = this.assets?.image(prop.assetId) ?? null;
      renderer.drawSprite(image, prop.x, prop.y, {
        anchor: "center",
        size: { w: prop.w * this.map.tileSize, h: prop.h * this.map.tileSize },
        fallbackColor: "#ff00ff"
      });
    }
  }

  private renderPlayer(renderer: Renderer): void {
    const frame = this.player.animation.frame;
    const image = this.assets?.image(frame.assetId) ?? null;
    const { width, height } = this.player;

    renderer.drawSprite(image, this.player.centerX, this.player.y + height, {
      anchor: "bottom-center",
      flipX: frame.flipX,
      size: { w: width, h: height },
      fallbackColor: "#ff00ff"
    });
  }

  /** The "press E" bubble, above whatever the player is facing. */
  private renderPrompt(renderer: Renderer): void {
    if (!this.target) return;

    const image = this.assets?.image("ui_prompt_e") ?? null;
    renderer.drawSprite(image, this.target.x, this.target.y - PROMPT_HEIGHT, {
      anchor: "bottom-center",
      size: { w: 32, h: 32 },
      fallbackColor: "#f2efe8"
    });
  }
}
