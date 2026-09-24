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
import { Inventory, ITEM_NAMES } from "./systems/Inventory";
import { craft, type Recipe } from "./systems/Crafting";
import { recipeFor } from "./text/workbenches";
import { Jobs } from "./systems/Jobs";
import { NO_JOB_HINT, NOTICE_BOARD_TITLE, offerIndexForKey, offerLine } from "./text/jobs";
import { STRUCTURES, TownGrowth } from "./systems/TownGrowth";

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
  readonly inventory = new Inventory();
  readonly jobs = new Jobs();
  readonly growth = new TownGrowth();

  /** True once the mayor has explained what the town needs. */
  private mayorHasExplained = false;
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

    // Routed through `interact`, so this exercises exactly what pressing E does
    // -- including the notice board menu and the workbenches.
    this.interact(found);
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
   * Four kinds of target, in order of specificity: the notice board offers
   * work, the field is worked tile by tile, a workbench converts what you carry,
   * and anything else just talks.
   */
  private interact(target: Interactable): void {
    this.faceToward(target);

    if (target.id === "noticeboard") {
      this.openJobMenu();
      return;
    }

    if (target.id === "farm") {
      // The field is the farmer's work, so it stays shut until the job is taken.
      // This is what makes choosing a job matter rather than being decorative.
      if (!this.jobs.hasJob) {
        this.target = null;
        this.dialogue.say(null, "这块地还没有人负责。先去告示板接下乡下的活吧。");
        this.onDialogueChange?.(this.dialogue);
        return;
      }
      this.workNearestPlot();
      return;
    }

    const recipe = recipeFor(target.id);
    if (recipe) {
      this.useWorkbench(target, recipe);
      return;
    }

    if (target.id === "mayor") {
      this.talkToMayor();
      return;
    }

    this.startDialogue(target);
  }

  /**
   * The mayor: explains the town's need first, then takes what the player brings.
   *
   * Two steps rather than one, so the player is told what is wanted before being
   * asked to hand anything over.
   */
  private talkToMayor(): void {
    this.target = null;

    if (!this.mayorHasExplained) {
      this.mayorHasExplained = true;
      const goal = this.growth.nextGoal();
      const lines: DialogueLine[] = [
        { speaker: "镇长", text: "你就是新搬来的那位吧？欢迎。" },
        { speaker: "镇长", text: "镇上人手少，但要是有人肯出力，日子就能好起来。" },
        { speaker: "镇长", text: "你烤的面包，交给我就行，我拿去分给大家。" }
      ];
      if (goal) lines.push({ speaker: "镇长", text: goal.promiseText });

      this.dialogue.open(lines);
      this.onDialogueChange?.(this.dialogue);
      return;
    }

    this.deliverBread();
  }

  /**
   * Hand over one loaf.
   *
   * Nothing is taken unless there is bread to take, so a delivery either
   * happens completely or not at all -- the same rule crafting follows.
   */
  private deliverBread(): void {
    if (!this.inventory.remove("bread", 1)) {
      this.dialogue.say("镇长", "空着手来啦？烤好面包再拿来吧。");
      this.onDialogueChange?.(this.dialogue);
      return;
    }

    const { unlocked } = this.growth.contribute(1);

    const lines: DialogueLine[] = [
      { speaker: "镇长", text: "好，收下了。谢谢你。" },
      {
        speaker: "镇长",
        text: `这是第 ${this.growth.deliveredCount} 份贡献，镇上记着呢。`
      }
    ];

    if (unlocked) {
      // The payoff line: the thing the player was promised now exists.
      lines.push({ speaker: "镇长", text: `好消息——${unlocked.doneText}` });
    } else {
      const goal = this.growth.nextGoal();
      if (goal) {
        const left = Math.max(0, goal.threshold - this.growth.reputationCount);
        if (left > 0) {
          lines.push({ speaker: "镇长", text: `再攒 ${left} 份，${goal.name}就能动工了。` });
        }
      }
    }

    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
  }

  /** Turn the player to look at something. Shared by every interaction. */
  private faceToward(target: Interactable): void {
    const dx = target.x - this.player.centerX;
    const dy = target.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));
  }

  /**
   * Show the notice board.
   *
   * With no job taken the board lists what is on offer; with one taken it says
   * so instead, so the player is never asked to choose again.
   */
  private openJobMenu(): void {
    this.target = null;

    if (this.jobs.hasJob) {
      const job = this.jobs.job!;
      this.dialogue.open([
        { speaker: NOTICE_BOARD_TITLE, text: `你现在的活是：${job.name}。` },
        { speaker: NOTICE_BOARD_TITLE, text: job.takenText }
      ]);
      this.onDialogueChange?.(this.dialogue);
      return;
    }

    const offers = this.jobs.offers();
    const lines: DialogueLine[] = offers.map(({ job, taken }, index) => ({
      speaker: NOTICE_BOARD_TITLE,
      text: offerLine(index, job.name, job.description, taken)
    }));
    lines.push({ speaker: NOTICE_BOARD_TITLE, text: NO_JOB_HINT });

    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
  }

  /**
   * Take the offered job for a pressed number key.
   *
   * Only meaningful while the board is open, so it is checked here rather than
   * letting any stray number press change the game state.
   */
  private chooseJobFromKey(code: string): boolean {
    if (!this.jobs.hasJob) {
      const offers = this.jobs.offers();
      const index = offerIndexForKey(code, offers.length);
      if (index === null) return false;

      const job = offers[index].job;
      if (!this.jobs.take(job.id)) return false;

      this.dialogue.open([
        { speaker: NOTICE_BOARD_TITLE, text: `好，你就是镇上的${job.name}了。` },
        { speaker: NOTICE_BOARD_TITLE, text: job.takenText }
      ]);
      this.onDialogueChange?.(this.dialogue);
      return true;
    }

    return false;
  }

  /**
   * Run a workbench recipe and say what happened.
   *
   * Success and failure both go through the dialogue box, so a shortage is
   * always explained rather than the press silently doing nothing.
   */
  private useWorkbench(target: Interactable, recipe: Recipe): void {
    const result = craft(this.inventory, recipe);

    // Turn to face the bench either way, so the character looks like they used it.
    const dx = target.x - this.player.centerX;
    const dy = target.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    this.target = null;
    this.dialogue.say(null, result.ok ? this.successMessage(result.recipe) : result.message);
    this.onDialogueChange?.(this.dialogue);
  }

  private successMessage(recipe: Recipe): string {
    const produced = recipe.outputs
      .map(({ item, amount }) => `${ITEM_NAMES[item]}×${amount}`)
      .join("、");
    return `做好了：${produced}。`;
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
      if (gathered) this.inventory.add(gathered.crop, gathered.amount);
    }
    // A growing plot needs nothing from the player; pressing E does nothing.

    return plot;
  }

  /** Wheat gathered so far, for the HUD and probe. */
  get harvestedCount(): number {
    return this.inventory.count("wheat");
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
    // A number key takes a job while the board is open. Checked before the
    // advance keys, since choosing replaces the line rather than stepping it.
    for (const code of ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"]) {
      if (input.wasPressed(code) && this.chooseJobFromKey(code)) return;
    }

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
    this.renderStructures(renderer);
    this.renderNpcs(renderer);
    this.renderPlayer(renderer);
    this.renderPrompt(renderer);
  }

  /**
   * Buildings the town has earned.
   *
   * Drawn on top of the ground rather than written into the tile grid, so the
   * map itself never changes: the same clearing holds scaffolding and then a
   * finished market depending only on how much the player has contributed.
   */
  private renderStructures(renderer: Renderer): void {
    const size = this.map.tileSize;

    for (const structure of STRUCTURES) {
      const state = this.growth.stateOf(structure);
      if (state === "none") continue;

      const built = state === "built";
      const assetId = built ? `bld_${structure.id}` : "bld_construction";
      const image = this.assets?.image(assetId) ?? null;

      // Centre of the structure's footprint.
      const cx = (structure.tx + structure.tilesWide / 2) * size;
      const cy = (structure.ty + structure.tilesTall / 2) * size;

      renderer.drawSprite(image, cx, cy, {
        anchor: "center",
        size: { w: structure.tilesWide * size, h: structure.tilesTall * size },
        fallbackColor: built ? "#d9c9a8" : "#a8865e"
      });
    }
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
