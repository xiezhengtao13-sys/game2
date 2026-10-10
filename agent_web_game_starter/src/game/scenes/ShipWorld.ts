import type { GameCamera, GameWorld } from "../../engine/core/GameWorld";
import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue, type DialogueLine } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH } from "../config";
import { placeAt, shipSpawn } from "../map/shipMap";
import { PLACE_LABELS, ALL_SHIP_PEOPLE, SHIP_PROPS, type ScenePerson, type SceneProp } from "./shipProps";
import { DutySystem } from "../systems/DutySystem";

/**
 * The ship, as one continuous world.
 *
 * The cabin, the corridor and the bridge are one map, so moving between them is
 * walking: there is no transition, no load screen, no moment where the game
 * stops being a place. That is why this is a single world rather than two scenes
 * with a door between them.
 *
 * The camera follows the player, which on a map this size is the whole point --
 * the cabin is smaller than the viewport and the bridge is larger, so the change
 * from "I can see the whole room" to "I can see part of a much bigger room" is
 * felt rather than described.
 */
export class ShipWorld implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();
  readonly map: TileMap;
  readonly duty = new DutySystem();

  private readonly assets: GameAssets | null;
  private readonly props: readonly SceneProp[];
  private readonly people: readonly ScenePerson[];
  private readonly interactables: readonly Interactable[];
  private readonly propById = new Map<string, SceneProp>();
  private readonly personById = new Map<string, ScenePerson>();

  /** What the player is being prompted about right now, or null. */
  private target: Interactable | null = null;

  /** Ids of props already examined, so a person can react to what you have seen. */
  private readonly seen = new Set<string>();

  /** True once the captain has spoken, so his remark about your looking occurs once. */
  private captainGreeted = false;

  /** Told whenever the open dialogue changes, so the DOM box can redraw. */
  onDialogueChange: ((dialogue: Dialogue | null) => void) | null = null;

  /** Told whenever the duty task progress updates. */
  onDutyChange: ((duty: DutySystem) => void) | null = null;

  constructor(
    map: TileMap,
    assets: GameAssets | null = null,
    props: readonly SceneProp[] = SHIP_PROPS,
    people: readonly ScenePerson[] = ALL_SHIP_PEOPLE
  ) {
    this.map = map;
    this.assets = assets;
    this.props = props;
    this.people = people;
    // Derived from the map's own doorway rather than a constant: the player
    // arrives where the ship says its door is, and the two cannot drift apart.
    const spawn = shipSpawn(map.tileSize);
    this.player = new Player(spawn.x, spawn.y);

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
        // People are reached by their feet, not their centre: you stand in front
        // of someone, not on top of them.
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

  /** Everything that can be examined, for tests and tooling. */
  get examinable(): readonly Interactable[] {
    return this.interactables;
  }

  /**
   * What the HUD should call wherever the player is standing.
   *
   * The ship is one continuous place, which means the game cannot say where you
   * are by showing you a different loading screen -- so it says it in words
   * instead. Reads the tile under the player's feet, not their head: you are where
   * you are standing.
   */
  get placeLabel(): string {
    const size = this.map.tileSize;
    const tx = Math.floor(this.player.centerX / size);
    const ty = Math.floor((this.player.y + this.player.height - this.player.colliderHeight / 2) / size);

    return PLACE_LABELS[placeAt(tx, ty)];
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

    if (this.target && input.wasPressed("KeyE")) this.examine(this.target);
  }

  /** Look at something, turning to face it first. */
  private examine(target: Interactable): void {
    const person = this.personById.get(target.id);
    const prop = this.propById.get(target.id);
    const anchor = person ?? prop;
    if (!anchor) return;

    let dutyNote: DialogueLine | null = null;
    if (prop) {
      if (prop.label === "动力席") {
        if (this.duty.complete("power")) {
          dutyNote = { speaker: null, text: "【二班值班记录已更新】散热翼当前展开角度为 42°，第一回路状态恒定。已记入当班巡检日志。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "机械应急开关" && prop.x > 20 * this.map.tileSize) {
        if (this.duty.complete("switch")) {
          dutyNote = { speaker: null, text: "【二班值班记录已更新】右舷机械应急开关的手动保护罩已确认处于锁定安全位。已记入当班巡检日志。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "绿植" && prop.y < 20 * this.map.tileSize) {
        if (this.duty.complete("plant")) {
          dutyNote = { speaker: null, text: "【二班值班记录已更新】你从随身水壶倒了点水给这盆绿植。干涸的土壤吸收了水分，叶片显得精神了些。" };
          this.onDutyChange?.(this.duty);
        }
      }
    }

    let lines = person ? this.linesFor(person) : prop?.lines;
    if (!lines || lines.length === 0) return;

    if (dutyNote) {
      lines = [...lines, dutyNote];
    }

    const dx = anchor.x - this.player.centerX;
    const dy = anchor.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    if (prop) this.seen.add(prop.assetId);

    this.target = null;
    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
  }

  /**
   * What a person says.
   *
   * The captain notices if the player has already looked around before finding
   * him. A small thing, but it is the difference between a ship full of props and
   * a ship someone actually lives on. Only once, on the first conversation: a
   * captain who remarked on your sightseeing every time would be a gimmick.
   */
  private linesFor(person: ScenePerson): readonly DialogueLine[] {
    if (person.id === "navigator") {
      if (!this.duty.isInspectionDone()) {
        return [
          { speaker: "领航员", text: "「二班的巡检员，来得正好。今天的巡检任务还没结签呢。」" },
          { speaker: "领航员", text: "「去查一下动力席的散热翼、右舷应急开关锁闭销、还有人员席角落那盆快干枯的绿植。」" },
          ...person.lines
        ];
      }
    }

    if (person.id !== "captain") return person.lines;

    if (this.duty.isInspectionDone() && !this.duty.tasks.find((t) => t.id === "report")?.completed) {
      this.duty.complete("report");
      this.onDutyChange?.(this.duty);
      return [
        { speaker: "舰长", text: "「动力席读数、应急开关……还给人员席那盆绿植浇了水？」舰长接过你的巡检单，认真签下了名字。" },
        { speaker: "舰长", text: "「这艘船能平稳飞三十年，靠的就是你们每天按部就班的检查。二班当班合格，辛苦了。」" },
        ...person.lines
      ];
    }

    if (this.captainGreeted) return person.lines;
    this.captainGreeted = true;

    if (this.seen.size < 4) return person.lines;

    return [
      ...person.lines.slice(0, 3),
      { speaker: "舰长", text: "你已经把船上转了一圈了？" },
      ...person.lines.slice(3)
    ];
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

    this.examine(found);
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
   * Fill anything showing outside the map.
   *
   * The ship is solid structure all the way to its edges, so this only shows at
   * the very corners of the world; it is here so there is never a black gap.
   */
  private renderBackdrop(renderer: Renderer): void {
    renderer.drawRect(0, 0, renderer.width, renderer.height, { color: "#5c636d" });
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
      const image = this.assets?.image(`tile_${tile.type}`) ?? null;
      renderer.drawSprite(image, tile.tx * size + size / 2, tile.ty * size + size / 2, {
        anchor: "center",
        size: { w: size, h: size },
        // Magenta on purpose: a missing picture must be impossible to miss.
        fallbackColor: "#ff00ff"
      });
    }
  }

  private renderProps(renderer: Renderer): void {
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

  private renderPeople(renderer: Renderer): void {
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

  private renderPrompt(renderer: Renderer): void {
    if (!this.target) return;

    const image = this.assets?.image("ui_prompt_e") ?? null;
    renderer.drawSprite(image, this.target.x, this.target.y - 32, {
      anchor: "bottom-center",
      size: { w: 32, h: 32 },
      fallbackColor: "#f2efe8"
    });
  }
}
