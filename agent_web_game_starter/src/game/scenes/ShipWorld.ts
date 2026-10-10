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
import { CrisisSystem } from "../systems/CrisisSystem";

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
  readonly crisis = new CrisisSystem();

  private elapsedTime = 0;
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

  /** Told whenever the chapter 1 crisis progress updates. */
  onCrisisChange: ((crisis: CrisisSystem) => void) | null = null;

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
    this.elapsedTime += dt;

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
    let dutyNoteFirst = false;
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
      } else if (prop.label === "重型防热工程服备勤架") {
        if (this.crisis.stage === "eva_gear") {
          this.crisis.equipEvaSuit();
          dutyNote = {
            speaker: null,
            text: "【应急装备穿戴完毕】你迅速换上重型防热工程服。加厚陶瓷胸甲密闭锁死，独立加压呼吸循环启动！现在可以耐受高温机舱！"
          };
          dutyNoteFirst = true;
          this.onCrisisChange?.(this.crisis);
        }
      } else if (prop.label === "应急旁路泄压转轮") {
        if (this.crisis.stage === "valve_vent") {
          this.crisis.ventCoolantValve();
          dutyNote = {
            speaker: null,
            text: "【旁路泄压成功】你咬紧牙关逆时针连转三圈重型转轮！高压旁路阀门轰然弹开，过热蒸汽喷入吸收池，第一回路压力骤降到安全警戒线！"
          };
          dutyNoteFirst = true;
          this.onCrisisChange?.(this.crisis);
        }
      } else if (prop.label === "副散热翼机械强制展开栓") {
        if (this.crisis.stage === "eject_lever") {
          this.crisis.pullEjectionLever();
          dutyNote = {
            speaker: null,
            text: "【副散热翼应急展开】你拔下黄色安全插销，用全身力气将应急手柄拉到底！深空外爆鸣传导，副散热翼完全弹开！聚变反应堆热平衡恢复基线！"
          };
          dutyNoteFirst = true;
          this.onCrisisChange?.(this.crisis);
        }
      }
    }

    let lines = person ? this.linesFor(person) : prop?.lines;
    if (!lines || lines.length === 0) return;

    if (dutyNote) {
      lines = dutyNoteFirst ? [dutyNote, ...lines] : [...lines, dutyNote];
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
   * Characters react realistically to whether ship routine is normal, an emergency
   * thermal runaway is underway, or the Chapter 1 crisis has been resolved.
   */
  private linesFor(person: ScenePerson): readonly DialogueLine[] {
    // 1. Engineer Lao Zhou (二班班长兼轮机工 - 底层工勤主线对接人)
    if (person.id === "engineer") {
      // (a) Routine inspection completion -> Crisis爆发
      if (this.duty.isInspectionDone() && !this.duty.tasks.find((t) => t.id === "report")?.completed) {
        this.duty.complete("report");
        this.onDutyChange?.(this.duty);
        this.crisis.triggerAlarm();
        this.crisis.advanceToEva();
        this.onCrisisChange?.(this.crisis);
        return [
          { speaker: "老周", text: "「动力席读数、应急开关……还给人员席那盆绿植浇了水？行，小徐，没偷懒。」老周在你的手抄巡检单上重重盖下当班红印。" },
          { speaker: "老周", text: "「咱们远望号飞了三十年，两千八百米长的舰体，全靠各个底层系统按部就班。二班合格，准备交——」" },
          { speaker: null, text: "【突然间，整艘飞船剧烈震颤！金属管线发出可怖的呻吟！暗红色的警报光柱瞬间划破廊道，全舰蜂鸣器尖锐长鸣！】" },
          { speaker: "全舰广播", text: "【特级管损警报：微碎片擦伤！右舷主散热翼在 42° 展开角液压锁死！两座聚变反应堆废热无法排入真空！】" },
          { speaker: "广播杂音", text: "【对讲机呼号：……机控中心尝试电控旁通……指令无响应！电控线路烧断！各工段损管队执行手动应急规程！……】" },
          { speaker: "老周", text: "老周猛然抓住管线扶手，脸色骤变：“操！主散热翼卡死了！机控中心那帮坐办公室的根本不知道这底下老旧管线的受热极限！”" },
          { speaker: "老周", text: "“小徐！别愣着！机控室高层顾不上咱们这头，生活区和休眠舱的备用冷却泵马上就会被反冲蒸汽烧毁！”" },
          { speaker: "老周", text: "“快去机库工程柜套上重型防热服！然后下到最南端的动力排险泵房，帮我把那个死沉的红色泄压手轮转开！快，慢一秒这截管子都得炸！”" }
        ];
      }

      // (b) Crisis actively underway
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "老周", text: "「咳咳……小徐！主回路气压快把高压管顶爆了，我在这守着主循环！」" },
          { speaker: "老周", text: "「快按刚才说的，去机库拿重型防热服，下到泵房转泄压转轮，再拉开副散热翼的击发栓！」" }
        ];
      }

      // (c) Crisis resolved: Grounded blue-collar relief
      if (this.crisis.isResolved) {
        return [
          { speaker: "老周", text: "老周坐在翻倒的工具箱上，正用棉纱擦拭扳手上的黑油，长长舒了一口气。" },
          { speaker: "老周", text: "「呼……听见排气声停了，压力表指针掉下来了。小子，手脚挺利索啊，没慌。」" },
          { speaker: "老周", text: "「机控室那些坐大位子的高层，大概永远不会知道是咱们在最底层把手轮拧开的。但无所谓，咱们自己活着，这一万两千号休眠者也活着，这就够了。」" },
          { speaker: "老周", text: "「喝口温水，把终端上的当班交接刷了。今晚生活区加餐，有压缩脱水羊肉，赶紧去打一份。」" }
        ];
      }

      // (d) Routine in-progress reminder
      if (!this.duty.isInspectionDone()) {
        return [
          { speaker: "老周", text: "「哟，小徐，来得正好。今天的二班巡检任务还没结签呢。」" },
          { speaker: "老周", text: "「去查一下动力席的散热翼、右舷应急开关锁闭销、还有人员席角落那盆快干枯的绿植。」" },
          { speaker: "老周", text: "「咱们底层的工勤任务得按部就班，机控室不管咱们琐事，但咱们自己得把底层的底子摸清。」" }
        ];
      }
    }

    // 2. Captain (舰队指挥核心圈层 - 与底层船员保持客观层级距离)
    if (person.id === "captain") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "舰长", text: "舰长正戴着通讯耳机死死盯住前方主控大屏，甚至无暇回头看你一眼。" },
          { speaker: "舰长", text: "「通信席，接通第三殖民模块！损管二组，汇报姿态修正喷口压差！……」" },
          { speaker: "副官警卫", text: "「工勤巡检员请立刻退回生活区！舰桥正在执行特级应急姿态指挥，无关人员不得靠近！」" }
        ];
      }

      if (this.crisis.isResolved) {
        return [
          { speaker: "舰长", text: "舰桥前方弧形大屏正在解算新的深空轨道，参谋军官们快速低语记录数据。" },
          { speaker: "舰长", text: "「……全舰警报降为三级，推进阵列保持微推巡航。记录航行日志。」" },
          { speaker: null, text: "（舰长专注于宏观态势调度，并未注意到站在后方入口的基层工勤人员。）" }
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

    // 3. Navigator (舰桥领航员)
    if (person.id === "navigator") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "领航员", text: "「特级管损！整条中枢星图都在红闪！机控室的指令总线全烧了……」" },
          { speaker: "领航员", text: "「别在这挡着，快去救你们底层的回路！」" }
        ];
      }
      if (this.crisis.isResolved) {
        return [
          { speaker: "领航员", text: "「呼……副散热翼强制展开了，总算没偏航。去吧，回你们底层休息去。」" }
        ];
      }
      return [
        { speaker: "领航员", text: "「哎，别踩进来，前方是主星图投影区。三十年了，这条线基本没怎么弯过。你们巡检员没事别往核心区跑，去生活区找老周吧。」" }
      ];
    }

    // 4. Medic Dr. Chen (中央医疗与休眠监护员)
    if (person.id === "medic") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "陈医生", text: "「【警报急促蜂鸣】休眠母线电压在剧烈跌落！循环温度超标 4.2 度了！」" },
          { speaker: "陈医生", text: "「小徐，求求你们快保住底层管路，休眠者经不起高温脑损伤！」" }
        ];
      }
      if (this.crisis.isResolved) {
        return [
          { speaker: "陈医生", text: "「一万两千四百零八个生命体征信号灯全都恢复平稳绿光了……老天保佑。」" },
          { speaker: "陈医生", text: "「小徐，你们底层机修工今天救了所有人一命，辛苦了。」" }
        ];
      }
    }

    // 5. Transit Guard Xiao Liu (中央交通站调度员)
    if (person.id === "transit_guard") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "调度员小刘", text: "「【对讲机杂音】『呼叫站台！中央穿梭轨道已切入特级损管优先！南向通道全线锁闭！』小徐，快走人行梯去机库！」" }
        ];
      }
      if (this.crisis.isResolved) {
        return [
          { speaker: "调度员小刘", text: "「全线轨道警报解除！机控室那帮大佬刚才把我们信号全抢了……好在没事了。」" }
        ];
      }
    }

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
    this.renderAlarmOverlay(renderer);
  }

  /**
   * Deep space emergency alarm lighting.
   *
   * Pulses an atmospheric amber-red alert glow over the visible deck when
   * the Chapter 1 thermal runaway crisis is active.
   */
  private renderAlarmOverlay(renderer: Renderer): void {
    if (!this.crisis.isAlarmActive) return;

    const pulse = (Math.sin(this.elapsedTime * 4) + 1) / 2;
    const alpha = 0.08 + pulse * 0.12;
    renderer.drawRect(
      renderer.camera.worldX,
      renderer.camera.worldY,
      renderer.camera.viewportWidth,
      renderer.camera.viewportHeight,
      { color: `rgba(235, 50, 20, ${alpha.toFixed(3)})` }
    );
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
