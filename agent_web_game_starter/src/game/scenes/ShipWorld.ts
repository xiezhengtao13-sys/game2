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
import { DutySystem } from "../systems/DutySystem";
import { CrisisSystem } from "../systems/CrisisSystem";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { SpaceFlight } from "./SpaceFlight";
import { PlanetSurface } from "./PlanetSurface";
import { HANGAR_ORIGIN } from "../map/shipMap";
import {
  SHIP_PROPS,
  ALL_SHIP_PEOPLE,
  PLACE_LABELS,
  type SceneProp,
  type ScenePerson
} from "./shipProps";
import { sounds } from "../../engine/audio/SoundEffects";

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
  readonly exploration = new ExplorationSystem();
  readonly spaceFlight = new SpaceFlight();
  readonly planetSurface: PlanetSurface;
  private mode: "deck" | "space_flight" | "planetary_surface" = "deck";

  private elapsedTime = 0;
  private readonly assets: GameAssets | null;
  private readonly props: readonly SceneProp[];
  private readonly people: readonly ScenePerson[];
  private readonly interactables: readonly Interactable[];
  private readonly propById = new Map<string, SceneProp>();
  private readonly personById = new Map<string, ScenePerson>();

  /** Dynamic screen shake mechanics. */
  private shakeIntensity = 0;
  private shakeDuration = 0;

  /** Central transit maglev hub stations. */
  private transitHubIndex = 0;
  private readonly transitHubs = [
    { name: "舰桥指挥区站台", tx: 20, ty: 14 },
    { name: "中央穿梭站平台", tx: 20, ty: 48 },
    { name: "穿梭机库备勤站台", tx: 10, ty: 78 },
    { name: "后部主聚变动力机房", tx: 20, ty: 152 }
  ];

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

  /** Told whenever the chapter 2 exploration progress updates. */
  onExplorationChange: ((exploration: ExplorationSystem) => void) | null = null;

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
    this.planetSurface = new PlanetSurface(assets, this.exploration);
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

  get currentMode(): "deck" | "space_flight" | "planetary_surface" {
    return this.mode;
  }

  get tileMap(): TileMap {
    return this.map;
  }

  get interactionTarget(): Interactable | null {
    if (this.mode === "space_flight") {
      const distP = this.spaceFlight.distanceToPlanet();
      const distM = this.spaceFlight.distanceToMothership();
      const distB = this.spaceFlight.distanceToBuoy();
      if (distP <= 140) {
        return { id: "orbit_farthest", label: "着陆远境-IV", x: this.spaceFlight.targetPlanet.x, y: this.spaceFlight.targetPlanet.y, radius: 140 };
      }
      if (distM <= 110) {
        return { id: "dock_mothership", label: "返回远望号母舰", x: this.spaceFlight.mothership.x, y: this.spaceFlight.mothership.y, radius: 110 };
      }
      if (distB <= 80) {
        return { id: "scan_buoy", label: "接收开阳-03浮标数据", x: this.spaceFlight.researchBuoy.x, y: this.spaceFlight.researchBuoy.y, radius: 80 };
      }
      return null;
    }
    if (this.mode === "planetary_surface") {
      return this.planetSurface.interactionTarget;
    }
    return this.target;
  }

  get interactionLabel(): string | null {
    return this.interactionTarget?.label ?? null;
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
    if (this.mode === "space_flight") {
      return "深空航线 · 初辉恒星系 (Dawn Star System)";
    }
    if (this.mode === "planetary_surface") {
      return "行星地表 · 远境-IV 玄武岩极地 (Farthest-IV)";
    }
    const size = this.map.tileSize;
    const tx = Math.floor(this.player.centerX / size);
    const ty = Math.floor((this.player.y + this.player.height - this.player.colliderHeight / 2) / size);

    return PLACE_LABELS[placeAt(tx, ty)];
  }

  addShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  cycleTransitHub(): void {
    this.transitHubIndex = (this.transitHubIndex + 1) % this.transitHubs.length;
    const dest = this.transitHubs[this.transitHubIndex];
    const size = this.map.tileSize;
    this.player.x = dest.tx * size;
    this.player.y = dest.ty * size;
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(5, 0.4);
  }

  update(dt: number, input: Input): void {
    this.elapsedTime += dt;

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    if (this.dialogue.isOpen) {
      if (input.wasPressed("KeyE") || input.wasPressed("Space")) {
        sounds.playBeep(920);
        this.dialogue.advance();
        this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
      }
      return;
    }

    if (this.mode === "space_flight") {
      this.spaceFlight.update(dt, input);
      if (input.wasPressed("KeyE")) {
        const distP = this.spaceFlight.distanceToPlanet();
        const distM = this.spaceFlight.distanceToMothership();
        const distB = this.spaceFlight.distanceToBuoy();
        if (distP <= 140) {
          this.landOnPlanet();
        } else if (distM <= 110) {
          this.dockAtMothership();
        } else if (distB <= 80) {
          this.scanBuoy();
        }
      }
      return;
    }

    if (this.mode === "planetary_surface") {
      this.planetSurface.update(dt, input);
      if (this.planetSurface.interactionTarget && input.wasPressed("KeyE")) {
        this.examineSurface(this.planetSurface.interactionTarget);
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

    sounds.playClick();

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
      } else if (prop.label === "交通调度终端") {
        this.cycleTransitHub();
        dutyNote = {
          speaker: null,
          text: `【高速穿梭捷运车已送达】气动水密门开启，捷运车已平稳送达：${this.placeLabel}！可再次互动前往下一站枢纽。`
        };
        dutyNoteFirst = true;
      } else if (prop.label === "重型防热工程服备勤架") {
        if (this.crisis.stage === "eva_gear") {
          this.crisis.equipEvaSuit();
          sounds.playClank();
          this.addShake(4, 0.3);
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
          sounds.playSteam(1.4);
          this.addShake(7, 0.7);
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
          sounds.playClank();
          sounds.stopAlarm();
          this.addShake(12, 1.2);
          dutyNote = {
            speaker: null,
            text: "【副散热翼应急展开】你拔下黄色安全插销，用全身力气将应急手柄拉到底！深空外爆鸣传导，副散热翼完全弹开！聚变反应堆热平衡恢复基线！"
          };
          dutyNoteFirst = true;
          this.onCrisisChange?.(this.crisis);
        }
      } else if (prop.label === "穿梭机登机舷梯控制台") {
        if (!this.crisis.isResolved) {
          dutyNote = {
            speaker: null,
            text: "【登机权限锁定】全舰处于特级管损警报状态，机库气闸已全部电控切断锁死！请先协助老周排除反应堆过热危机！"
          };
          dutyNoteFirst = true;
        } else {
          this.launchShuttle();
          dutyNote = {
            speaker: null,
            text: "【特级指令：拓荒者一号深空出舱】你换上宇航服登上驾驶席，主气闸抽真空，磁力锁解脱！穿梭机轰然冲出机库，初辉恒星系的浩瀚星空在眼前豁然展开！"
          };
          dutyNoteFirst = true;
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
        sounds.startAlarm();
        this.addShake(8, 1.2);
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

    if (this.mode === "space_flight") {
      const distP = this.spaceFlight.distanceToPlanet();
      const distM = this.spaceFlight.distanceToMothership();
      const distB = this.spaceFlight.distanceToBuoy();
      if (distP <= 140) {
        this.landOnPlanet();
        return true;
      }
      if (distM <= 110) {
        this.dockAtMothership();
        return true;
      }
      if (distB <= 80) {
        this.scanBuoy();
        return true;
      }
      return false;
    }

    if (this.mode === "planetary_surface") {
      const target = this.planetSurface.interactionTarget;
      if (!target) return false;
      this.examineSurface(target);
      return this.dialogue.isOpen;
    }

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

  launchShuttle(): void {
    this.exploration.startLaunchSequence();
    this.exploration.enterSpaceFlight();
    this.mode = "space_flight";
    this.spaceFlight.spawnAtMothership();
    sounds.playClank();
    this.addShake(10, 1.0);
    this.onExplorationChange?.(this.exploration);
  }

  landOnPlanet(): void {
    this.exploration.landOnSurface();
    this.mode = "planetary_surface";
    this.planetSurface.spawnAtLandingSite();
    sounds.playClank();
    this.addShake(8, 0.8);
    this.onExplorationChange?.(this.exploration);
    this.dialogue.open([
      { speaker: "穿梭机着陆计算系统", text: "【黑障穿透完毕】气动绝热瓦承受峰值摩擦，反推减速火箭精准切入！拓荒者一号已稳固降落在远境-IV 玄武岩极地！" },
      { speaker: "环境感知读数", text: "【地表大气读数】表面气压 0.18 atm，环境温度 -112℃，存在微弱高能离子风暴。请穿戴重型封闭防护服作业。" }
    ]);
    this.onDialogueChange?.(this.dialogue);
  }

  dockAtMothership(): void {
    this.mode = "deck";
    const size = this.map.tileSize;
    this.player.x = (HANGAR_ORIGIN.tx + 8) * size;
    this.player.y = (HANGAR_ORIGIN.ty + 6) * size;
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(4, 0.4);
    this.dialogue.open([
      { speaker: "机库调度终端", text: "【停泊磁吸闭锁】拓荒者一号已稳固归位。主气闸加压完毕，环境气压已恢复标准 101.3 kPa。欢迎回舰，开拓者！" }
    ]);
    this.onDialogueChange?.(this.dialogue);
  }

  scanBuoy(): void {
    this.spaceFlight.researchBuoy.scanned = true;
    sounds.playBeaconPulse();
    this.dialogue.open([
      { speaker: "开阳-03 浮标数据总线", text: "【科研遥测下行】正在读取前哨探测器遗留的历史遥测包……" },
      { speaker: "开阳-03 浮标数据总线", text: "【坐标解算完毕】确认远境-IV 极地裂谷处存在高密度重氢（Deuterium）冰晶矿脉，极具开采科研价值！" }
    ]);
    this.onDialogueChange?.(this.dialogue);
  }

  examineSurface(target: Interactable): void {
    if (target.id === "surface_shuttle") {
      if (this.exploration.isChapter2Done) {
        this.exploration.enterSpaceFlight();
        this.mode = "space_flight";
        this.spaceFlight.x = this.spaceFlight.targetPlanet.x - 160;
        this.spaceFlight.y = this.spaceFlight.targetPlanet.y - 120;
        this.spaceFlight.vx = -40;
        this.spaceFlight.vy = -30;
        sounds.playClank();
        this.addShake(6, 0.6);
        this.dialogue.open([
          { speaker: "穿梭机起飞系统", text: "【反推爬升】离子发动机二次点火，拓荒者一号脱离远境-IV 引力井，重回初辉恒星系深空巡航轨道！" },
          { speaker: "任务指令中心", text: "【返航指引】航向已自动对准远望号母舰（西北象限），请加速返回机库对接。" }
        ]);
        this.onDialogueChange?.(this.dialogue);
        this.onExplorationChange?.(this.exploration);
        return;
      }
      sounds.playClick();
      this.dialogue.open([
        { speaker: "拓荒者一号机载电脑", text: "地表勘测任务尚未全部完成：请先完成科研中继信标部署与高纯重氢样本采集，再执行返航程序。" }
      ]);
      this.onDialogueChange?.(this.dialogue);
      return;
    }

    if (target.id === "surface_beacon") {
      if (!this.exploration.beaconDeployed) {
        this.exploration.deployBeacon();
        sounds.playBeaconPulse();
        this.addShake(6, 0.6);
        this.onExplorationChange?.(this.exploration);
        this.dialogue.open([
          { speaker: "地面科考终端", text: "【科研中继信标展开】重型合金地锚稳固钉入玄武岩裂隙！高增益相控阵天线展开，成功锁定远望号高轨信号！" },
          { speaker: "地面科考终端", text: "初辉恒星系永久深空科学观测基站已建立，地质遥测数据实时回传中！" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      } else {
        sounds.playClick();
        this.dialogue.open([
          { speaker: "地面科考终端", text: "科研中继信标工作状态恒定。信号发射功率 120 W，已与远望号母舰中枢建立稳定低延迟链路。" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      }
      return;
    }

    if (target.id === "surface_sample") {
      if (!this.exploration.sampleCollected) {
        this.exploration.collectSample();
        sounds.playClank();
        this.addShake(4, 0.3);
        this.onExplorationChange?.(this.exploration);
        this.dialogue.open([
          { speaker: "便携地质采样器", text: "【高纯重氢冰晶采集完毕】超低温隔热密封罐已封存 500 mL 重氢冰晶矿石样品！" },
          { speaker: "便携地质采样器", text: "高品位聚变原料纯度测定达 99.4%！这验证了初辉恒星系具备长期自给自足聚变推进的可行性！" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      } else {
        sounds.playClick();
        this.dialogue.open([
          { speaker: "便携地质采样器", text: "该处露头的重氢样本已取样完毕。低温保温槽读数恒定在 14 K。" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      }
      return;
    }
  }

  getCamera(): GameCamera {
    const shakeX = this.shakeDuration > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
    const shakeY = this.shakeDuration > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0;

    if (this.mode === "space_flight") {
      return {
        x: this.spaceFlight.x + shakeX,
        y: this.spaceFlight.y + shakeY,
        mapWidth: this.spaceFlight.width,
        mapHeight: this.spaceFlight.height
      };
    }
    if (this.mode === "planetary_surface") {
      return {
        x: this.planetSurface.player.centerX + shakeX,
        y: this.planetSurface.player.centerY + shakeY,
        mapWidth: this.planetSurface.pixelWidth,
        mapHeight: this.planetSurface.pixelHeight
      };
    }
    return {
      x: this.player.centerX + shakeX,
      y: this.player.centerY + shakeY,
      mapWidth: this.map.pixelWidth,
      mapHeight: this.map.pixelHeight
    };
  }

  render(renderer: Renderer): void {
    if (this.mode === "space_flight") {
      this.spaceFlight.render(renderer);
      return;
    }
    if (this.mode === "planetary_surface") {
      this.planetSurface.render(renderer);
      return;
    }
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

    // If heavy EVA thermal suit is equipped, render high-tech suit visor overlay and ceramic chest armor
    if (this.crisis.isSuitEquipped) {
      const visorY = this.player.y + 11;
      const visorX = this.player.centerX - 6;
      renderer.drawRect(visorX, visorY, 12, 5, {
        color: "#38bdf8",
        radius: 2,
        stroke: { width: 1, color: "#e0f2fe" }
      });
      const chestY = this.player.y + 20;
      renderer.drawRect(this.player.centerX - 7, chestY, 14, 9, {
        color: "rgba(240, 246, 252, 0.55)",
        radius: 2,
        stroke: { width: 1, color: "rgba(56, 189, 248, 0.7)" }
      });
    }
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
