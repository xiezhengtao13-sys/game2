import type { GameCamera, GameWorld } from "../../engine/core/GameWorld";
import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue, type DialogueLine } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH } from "../config";

/**
 * Something that stands in a scene and can be looked at.
 *
 * `x`/`y` are the object's CENTRE in world pixels. `w`/`h` are in tiles, so a
 * scene can describe furniture without knowing the pixel size of a tile.
 */
export interface SceneProp {
  assetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** What the prompt calls it. */
  label: string;
  /** Shown on E. Null means scenery: it can be walked past but not examined. */
  lines: DialogueLine[] | null;
}

/**
 * Someone standing in a scene.
 *
 * `x`/`y` are their FEET, matching how the player is positioned, so the same
 * anchor convention draws both.
 */
export interface ScenePerson {
  id: string;
  name: string;
  assetId: string;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
  /** What the prompt calls them, e.g. "和舰长说话". */
  promptLabel: string;
  lines: readonly DialogueLine[];
}

/** How a scene draws itself: a backdrop colour plus draw order. */
export interface SceneOptions {
  /** Pixel size of one tile on screen. Differs per scene to convey scale. */
  tileSize: number;
  /** Fill colour for anything showing outside the map. */
  backdropColor: string;
  /** Tile asset used to continue the floor outward, or null for flat colour. */
  backdropTile: string | null;
  /** Bubble height above an interactable, in pixels. */
  promptHeight?: number;
}

/**
 * Shared behaviour for a room aboard the ship.
 *
 * Everything that is the same in every scene lives here: the player, walking,
 * the nearest-target interaction, dialogue, and the draw order. Subclasses
 * supply the map, the props and the people, and may override how a person's
 * lines are chosen (the captain's change depending on where you find him).
 *
 * Extracted only now that there is a second scene to justify it. Before that it
 * would have been a guess.
 */
export abstract class Scene implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();
  readonly map: TileMap;

  protected readonly assets: GameAssets | null;
  protected readonly props: readonly SceneProp[];
  protected readonly people: readonly ScenePerson[];
  protected readonly options: SceneOptions;

  private readonly interactables: readonly Interactable[];
  private readonly propById = new Map<string, SceneProp>();
  private readonly personById = new Map<string, ScenePerson>();

  /** What the player is being prompted about right now, or null. */
  private target: Interactable | null = null;

  /** Told whenever the open dialogue changes, so the DOM box can redraw. */
  onDialogueChange: ((dialogue: Dialogue | null) => void) | null = null;

  constructor(
    map: TileMap,
    assets: GameAssets | null,
    spawn: { x: number; y: number },
    props: readonly SceneProp[],
    people: readonly ScenePerson[],
    options: SceneOptions
  ) {
    this.map = map;
    this.assets = assets;
    this.props = props;
    this.people = people;
    this.options = options;
    this.player = new Player(spawn.x, spawn.y);

    // Only props and people with something to say become targets, so pressing E
    // on scenery can never produce an empty box.
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
        // Big furniture is reachable from further out; small objects need you
        // standing right at them.
        //
        // The floor is 32, not something smaller: the reach point sits 40 px in
        // front of the player's feet, and on a tile grid the nearest it ever gets
        // to a tile-centre prop is about 28.8 px. A smaller radius would make
        // every 1x1 prop on the ship unreachable while looking perfectly placed.
        radius: Math.max(32, (Math.max(prop.w, prop.h) * map.tileSize) / 2)
      });
    });

    for (const person of people) {
      const id = `person-${person.id}`;
      this.personById.set(id, person);
      interactables.push({
        id,
        label: person.promptLabel,
        x: person.x,
        y: person.y,
        radius: 46
      });
    }

    this.interactables = interactables;
  }

  get tileMap(): TileMap {
    return this.map;
  }

  get interactionTarget(): Interactable | null {
    return this.target;
  }

  get interactionLabel(): string | null {
    return this.target?.label ?? null;
  }

  /** Everything that can be examined here, for tests and tooling. */
  get examinable(): readonly Interactable[] {
    return this.interactables;
  }

  get townspeople(): readonly ScenePerson[] {
    return this.people;
  }

  update(dt: number, input: Input): void {
    if (this.dialogue.isOpen) {
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

    // A scene may claim the E press for itself before it becomes "examine".
    if (this.target && input.wasPressed("KeyE")) {
      if (!this.onInteract(this.target)) this.examine(this.target);
    }
  }

  /**
   * Give a subclass first refusal on an interaction. Return true to say it was
   * handled. Scenes that are only scenery never need to override this.
   */
  protected onInteract(_target: Interactable): boolean {
    return false;
  }

  /**
   * Look at something, turning to face it first.
   *
   * Protected rather than private so a subclass can trigger it from its own
   * interaction handling.
   */
  protected examine(target: Interactable): void {
    const person = this.personById.get(target.id);
    const prop = this.propById.get(target.id);
    const anchor = person ?? prop;
    if (!anchor) return;

    const lines = person ? this.linesFor(person) : prop?.lines;
    if (!lines || lines.length === 0) return;

    const dx = anchor.x - this.player.centerX;
    const dy = anchor.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    if (prop) this.onExamined(prop);

    this.target = null;
    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
  }

  /** Told when a prop has been examined, so a scene can track what you have seen. */
  protected onExamined(_prop: SceneProp): void {}

  /** What a person says. Overridable, so lines can depend on the scene's state. */
  protected linesFor(person: ScenePerson): readonly DialogueLine[] {
    return person.lines;
  }

  /**
   * Interact with whatever is in reach right now.
   *
   * A development aid: reaching a talking state from a URL parameter in a
   * headless browser, where keystrokes cannot be sent. Routed through the same
   * path the E key uses, so it exercises the real code rather than bypassing it.
   */
  interactInReach(): boolean {
    if (this.dialogue.isOpen) return false;

    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    const found = findInteractable(this.interactables, reach);
    if (!found) return false;

    if (!this.onInteract(found)) this.examine(found);
    return this.dialogue.isOpen;
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
    this.renderBackdrop(renderer);
    this.renderDeck(renderer);
    this.renderProps(renderer);
    this.renderPeople(renderer);
    this.renderPlayer(renderer);
    this.renderPrompt(renderer);
  }

  /**
   * Fill anything outside the map before the deck is drawn.
   *
   * A scene smaller than the viewport shows this around its edges; a scene
   * larger than the viewport never does, because the camera stays inside it.
   */
  protected renderBackdrop(renderer: Renderer): void {
    const image = this.options.backdropTile
      ? this.assets?.image(this.options.backdropTile) ?? null
      : null;
    const size = this.options.tileSize;

    if (!image) {
      renderer.drawRect(0, 0, renderer.width, renderer.height, {
        color: this.options.backdropColor
      });
      return;
    }

    for (let y = 0; y < renderer.height; y += size) {
      for (let x = 0; x < renderer.width; x += size) {
        renderer.drawSprite(image, x + size / 2, y + size / 2, {
          anchor: "center",
          size: { w: size, h: size },
          fallbackColor: this.options.backdropColor
        });
      }
    }
  }

  /** Only the tiles the camera can see, so this stays correct at any size. */
  protected renderDeck(renderer: Renderer): void {
    const { camera } = renderer;
    const size = this.map.tileSize;
    const view = {
      x: camera.worldX,
      y: camera.worldY,
      width: camera.viewportWidth,
      height: camera.viewportHeight
    };

    for (const tile of this.map.visibleTiles(view)) {
      const image = this.assets?.image(`tile_${tile.type}`) ?? null;
      renderer.drawSprite(image, tile.tx * size + size / 2, tile.ty * size + size / 2, {
        anchor: "center",
        size: { w: size, h: size },
        // Magenta on purpose: a missing picture must be impossible to miss.
        fallbackColor: "#ff00ff"
      });
    }
  }

  protected renderProps(renderer: Renderer): void {
    const size = this.map.tileSize;
    for (const prop of this.props) {
      const image = this.assets?.image(prop.assetId) ?? null;
      renderer.drawSprite(image, prop.x, prop.y, {
        anchor: "center",
        size: { w: prop.w * size, h: prop.h * size },
        fallbackColor: "#ff00ff"
      });
    }
  }

  protected renderPeople(renderer: Renderer): void {
    for (const person of this.people) {
      const image = this.assets?.image(person.assetId) ?? null;
      renderer.drawSprite(image, person.x, person.y, {
        anchor: "bottom-center",
        // Facing left reuses the right-facing art, mirrored.
        flipX: person.facing === "left",
        size: { w: 32, h: 48 },
        fallbackColor: "#ff00ff"
      });
    }
  }

  protected renderPlayer(renderer: Renderer): void {
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

  protected renderPrompt(renderer: Renderer): void {
    if (!this.target) return;

    const image = this.assets?.image("ui_prompt_e") ?? null;
    const height = this.options.promptHeight ?? 30;
    renderer.drawSprite(image, this.target.x, this.target.y - height, {
      anchor: "bottom-center",
      size: { w: 32, h: 32 },
      fallbackColor: "#f2efe8"
    });
  }
}
