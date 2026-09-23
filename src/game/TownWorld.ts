import type { GameCamera, GameWorld } from "../engine/core/GameWorld";
import type { Input } from "../engine/input/Input";
import type { Renderer } from "../engine/graphics/Renderer";
import type { TileMap } from "./map/TileMap";
import { Player, facingFor } from "./entities/Player";
import { PLAYER_INTERACT_REACH, PLAYER_SPAWN, FARM_WORK_REACH, createFarm, createGameTime } from "./config";
import type { GameAssets } from "./assets";
import { findInteractable, reachPoint, type Interactable } from "./systems/Interaction";
import { TOWN_INTERACTABLES, TOWN_NPCS } from "./map/townMap";
import { Dialogue, type DialogueLine } from "./systems/Dialogue";
import { dialogueFor } from "./text/dialogue";
import type { Npc } from "./entities/Npc";
import { Farm, cropStageFor, WHEAT_GROW_MINUTES, type Plot } from "./systems/Farm";
import { GameTime } from "./systems/Time";

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
  readonly dialogue = new Dialogue();
  readonly farm: Farm;
  readonly time: GameTime;
  private readonly map: TileMap;
  private readonly assets: GameAssets | null;
  private readonly interactables: readonly Interactable[];
  private readonly npcs: readonly Npc[];

  /** What the player is currently being prompted about, or null. */
  private target: Interactable | null = null;

  /**
   * Called whenever the open dialogue changes, so the DOM layer can redraw its
   * box. The world never touches the DOM itself.
   */
  onDialogueChange: ((dialogue: Dialogue | null) => void) | null = null;

  constructor(
    map: TileMap,
    assets: GameAssets | null = null,
    interactables: readonly Interactable[] = TOWN_INTERACTABLES,
    npcs: readonly Npc[] = TOWN_NPCS
  ) {
    this.map = map;
    this.assets = assets;
    this.interactables = interactables;
    this.npcs = npcs;
    this.player = new Player(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.farm = createFarm(map);
    this.time = createGameTime();
  }

  get tileMap(): TileMap {
    return this.map;
  }

  get townspeople(): readonly Npc[] {
    return this.npcs;
  }

  /** The interactable the player could act on right now. */
  get interactionTarget(): Interactable | null {
    return this.target;
  }

  /**
   * Open the dialogue for the interactable under the player's nose.
   *
   * A development aid, for reaching a talking state from a URL parameter in a
   * headless browser where keystrokes cannot be sent. Deliberately routed
   * through the same `startDialogue` path the E key uses, so it exercises the
   * real code rather than bypassing it.
   */
  startDialogueInReach(): boolean {
    if (this.dialogue.isOpen) return false;

    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    const found = findInteractable(this.interactables, reach);
    if (!found) return false;

    this.startDialogue(found);
    return this.dialogue.isOpen;
  }

  update(dt: number, input: Input): void {
    // The clock runs regardless, so crops keep growing while the player stands
    // still or is mid-conversation.
    this.farm.update(dt, this.time);

    if (this.dialogue.isOpen) {
      this.updateDialogue(input);
      // `target` is already null: startDialogue cleared it, and the interaction
      // scan below is skipped entirely while a box is open.
      return;
    }

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

    if (this.target && input.wasPressed("KeyE")) {
      this.interact(this.target);
    }
  }

  /**
   * Do whatever pressing E on `target` means.
   *
   * The field is special-cased: it is worked tile by tile, so standing next to
   * one plot tends that plot rather than the whole field.
   */
  private interact(target: Interactable): void {
    if (target.id === "farm") {
      this.workNearestPlot();
      return;
    }
    this.startDialogue(target);
  }

  /**
   * Tend the plot closest to the player: break ground, sow, or harvest.
   *
   * Which action applies is decided by the plot's own state, so one key does the
   * obvious thing at each step instead of needing a tool selector.
   */
  private workNearestPlot(): Plot | null {
    const plot = this.farm.nearest(
      this.player.centerX,
      this.player.y + this.player.height,
      this.map.tileSize,
      FARM_WORK_REACH
    );
    if (!plot) return null;

    if (plot.state === "untilled") {
      this.farm.till(plot);
    } else if (plot.state === "tilled") {
      this.farm.plant(plot);
    } else if (this.farm.canHarvest(plot)) {
      const gathered = this.farm.harvest(plot);
      if (gathered) this.harvested += gathered.amount;
    }
    // A growing plot needs nothing from the player; pressing E does nothing.

    return plot;
  }

  /** Wheat gathered so far. Temporary until the inventory lands in TASK-113. */
  private harvested = 0;

  get harvestedCount(): number {
    return this.harvested;
  }

  /**
   * Put the first few plots into different states for inspection.
   *
   * A development aid: letting a headless screenshot show tilled soil, a growing
   * crop and a ripe one side by side, which otherwise needs several in-game days
   * of play. Uses the same Farm calls the real interaction uses.
   */
  seedFarmForDisplay(): void {
    const plots = this.farm.all;
    if (plots.length === 0) return;

    // One plot broken but unsown.
    this.farm.till(plots[0]);

    if (plots.length > 1) {
      // One sown and part-grown.
      this.farm.till(plots[1]);
      this.farm.plant(plots[1]);
    }

    if (plots.length > 2) {
      // One sown and left to ripen.
      this.farm.till(plots[2]);
      this.farm.plant(plots[2]);
    }

    // Read in-game minutes straight off the clock, so the staging below is
    // expressed in the same unit the farm grows in.
    const clock = new GameTime(1);

    // Two minutes of growth: enough to leave the first sprout stage, not ripe.
    this.farm.update(2, clock);

    // Then take only the third plot all the way to ripe, by temporarily
    // unplanting the middle one -- `Farm.update` advances every growing plot, so
    // there is no way to fast-forward one alone.
    if (plots.length > 2) {
      const middle = plots[1];
      const middleState = middle.state;
      const middleGrowth = middle.growthMinutes;

      middle.state = "tilled";
      this.farm.update(WHEAT_GROW_MINUTES, clock);
      middle.state = middleState;
      middle.growthMinutes = middleGrowth;
    }
  }

  /** Debug: the first few plots, for inspecting the field's state. */
  firstPlots(n = 4): Array<{ tx: number; ty: number; state: string }> {
    return this.farm.all.slice(0, n).map((p) => ({ tx: p.tx, ty: p.ty, state: p.state }));
  }

  /**
   * While a box is open the player cannot move, and E or Space steps through the
   * lines. `wasPressed` is edge-triggered, so one press advances exactly one
   * line rather than racing through the whole conversation.
   */
  private updateDialogue(input: Input): void {
    if (input.wasPressed("KeyE") || input.wasPressed("Space")) {
      this.dialogue.advance();
      this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
    }
  }

  private startDialogue(target: Interactable): void {
    const lines: DialogueLine[] | null = dialogueFor(target.id);
    if (!lines || lines.length === 0) return;

    // Turn to face what is being addressed, which is what makes the character
    // look like they are talking to it rather than past it.
    const dx = target.x - this.player.centerX;
    const dy = target.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) {
      this.player.animation.face(facingFor(dx, dy));
    }

    // Cleared now rather than next frame, so the prompt never renders for one
    // frame underneath the box that just opened. This is the only place it needs
    // clearing: while a box is open the interaction scan below is skipped.
    this.target = null;

    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
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
    this.renderFarm(renderer);
    this.renderProps(renderer);
    this.renderNpcs(renderer);
    this.renderPlayer(renderer);
    this.renderPrompt(renderer);
  }

  /**
   * Draw the crop in each worked plot, on top of the farmland tile underneath.
   *
   * Only plots the player has actually touched are drawn: an untilled plot looks
   * exactly like the plain field, so drawing it would be redundant.
   */
  private renderFarm(renderer: Renderer): void {
    const size = this.map.tileSize;

    for (const plot of this.farm.all) {
      if (plot.state === "untilled") continue;

      const cx = (plot.tx + 0.5) * size;
      const cy = (plot.ty + 0.5) * size;

      if (plot.state === "tilled") {
        // Bare worked soil: darker than the field so the player can see which
        // squares they have already broken.
        renderer.drawRect(plot.tx * size + 3, plot.ty * size + 3, size - 6, size - 6, {
          color: "#6b4526",
          radius: 5
        });
        continue;
      }

      const stage = cropStageFor(plot);
      const image = this.assets?.image(`crop_wheat_stage${stage}`) ?? null;
      renderer.drawSprite(image, cx, cy, {
        anchor: "center",
        size: { w: size, h: size },
        fallbackColor: stage >= 4 ? "#e8c34a" : "#8fc45a"
      });
    }
  }

  /** Townspeople, drawn with the same anchor convention as the player. */
  private renderNpcs(renderer: Renderer): void {
    for (const npc of this.npcs) {
      const image = this.assets?.image(npc.spriteId) ?? null;
      renderer.drawSprite(image, npc.x, npc.y, {
        anchor: "bottom-center",
        size: { w: 32, h: 48 },
        fallbackColor: "#8a6642"
      });
    }
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
