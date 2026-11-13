import type { GameCamera, GameWorld } from "../../engine/core/GameWorld";
import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue, type DialogueChoice, type DialogueLine } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH } from "../config";
import { placeAt, shipSpawn } from "../map/shipMap";
import { DutySystem } from "../systems/DutySystem";
import { CrisisSystem } from "../systems/CrisisSystem";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { RpgSystem } from "../systems/RpgSystem";
import { SpaceFlight } from "./SpaceFlight";
import { PlanetSurface } from "./PlanetSurface";
import { ShipAtmosphere } from "./shipLighting";
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
 * The ship, as one continuous world, rendered with Baldur's Gate 3 / Diablo-grade
 * atmospheric lighting and driven by Classic Fallout CRPG mechanics.
 */
export class ShipWorld implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();
  readonly map: TileMap;
  readonly duty = new DutySystem();
  readonly crisis = new CrisisSystem();
  readonly exploration = new ExplorationSystem();
  readonly rpg = new RpgSystem();
  readonly spaceFlight = new SpaceFlight();
  readonly planetSurface: PlanetSurface;
  readonly atmosphere = new ShipAtmosphere();
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

  /** Mouse hover & click-to-interact state (Fallout style). */
  hoveredTarget: Interactable | null = null;
  private pendingClickTarget: { target: Interactable; rightClick: boolean } | null = null;
  private mouseWorldX: number | null = null;
  private mouseWorldY: number | null = null;
  private lastCameraWorldX = 0;
  private lastCameraWorldY = 0;
  private lastViewportWidth = 1280;
  private lastViewportHeight = 720;

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

  /** Told whenever RPG stats, XP, logs, or inventory update. */
  onRpgChange: ((rpg: RpgSystem) => void) | null = null;

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

  private get currentPlace() {
    const size = this.map.tileSize;
    const tx = Math.floor(this.player.centerX / size);
    const ty = Math.floor((this.player.y + this.player.height - this.player.colliderHeight / 2) / size);
    return placeAt(tx, ty);
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
    this.player.clearMoveTarget();
    this.pendingClickTarget = null;
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(5, 0.4);
    this.rpg.pushLog("system", `高速捷运车送达：【${dest.name}】`);
    this.onRpgChange?.(this.rpg);
  }

  /** Trigger a numbered choice in an active branching Fallout dialogue. */
  selectDialogueChoice(index: number): void {
    if (!this.dialogue.isOpen) return;
    sounds.playClick();
    this.dialogue.selectChoice(index);
    this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
    this.onRpgChange?.(this.rpg);
  }

  /** Use medical stim from HUD shortcut cleanly. */
  useHealingStim(): boolean {
    const ok = this.rpg.useItem("med_stim", this.player.centerX, this.player.y);
    if (ok) {
      sounds.playBeep(720);
      this.onRpgChange?.(this.rpg);
    }
    return ok;
  }

  update(dt: number, input: Input): void {
    this.elapsedTime += dt;

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    // Track mouse position in world coordinates
    const hasMouse = typeof input.mouseOver === "boolean" && input.mouseOver;
    if (hasMouse) {
      this.mouseWorldX = this.lastCameraWorldX + input.mouseX;
      this.mouseWorldY = this.lastCameraWorldY + input.mouseY;
    } else {
      this.mouseWorldX = null;
      this.mouseWorldY = null;
    }

    if (this.dialogue.isOpen) {
      if (this.dialogue.hasChoices) {
        const digits = ["Digit1", "Digit2", "Digit3", "Digit4"] as const;
        for (let i = 0; i < digits.length; i++) {
          if (input.wasPressed(digits[i])) {
            this.selectDialogueChoice(i);
            return;
          }
        }
      }
      if (input.wasPressed("Escape")) {
        sounds.playClick();
        this.dialogue.close();
        this.onDialogueChange?.(null);
        return;
      }
      if (input.wasPressed("KeyE") || input.wasPressed("Space")) {
        sounds.playBeep(920);
        this.dialogue.advance();
        this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
        this.onRpgChange?.(this.rpg);
      }
      return;
    }

    // Quick stim hotkey H
    if (input.wasPressed("KeyH")) {
      this.useHealingStim();
    }

    if (this.mode === "space_flight") {
      this.spaceFlight.update(dt, input);
      this.rpg.update(dt, false, this.crisis.isSuitEquipped);
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
      this.rpg.update(dt, false, true, this.planetSurface.player.centerX, this.planetSurface.player.y);
      if (this.planetSurface.interactionTarget && input.wasPressed("KeyE")) {
        this.examineSurface(this.planetSurface.interactionTarget);
      }
      return;
    }

    const place = this.currentPlace;
    const inHotZone = this.crisis.isAlarmActive && place === "reactor_bay";
    const prevHp = this.rpg.hp;
    this.rpg.update(dt, inHotZone, this.crisis.isSuitEquipped, this.player.centerX, this.player.y);
    if (this.rpg.hp !== prevHp) {
      if (this.rpg.hp < prevHp) this.addShake(3, 0.25);
      this.onRpgChange?.(this.rpg);
    }

    // Update ambient particle simulation around visible deck
    this.atmosphere.update(
      dt,
      this.lastCameraWorldX,
      this.lastCameraWorldY,
      this.lastViewportWidth,
      this.lastViewportHeight,
      place,
      this.crisis.isAlarmActive
    );

    // Mouse hover lookup over world interactables
    this.hoveredTarget = null;
    if (this.mouseWorldX !== null && this.mouseWorldY !== null) {
      let bestDist = Infinity;
      for (const item of this.interactables) {
        const d = Math.hypot(this.mouseWorldX - item.x, this.mouseWorldY - item.y);
        if (d <= Math.max(40, item.radius) && d < bestDist) {
          bestDist = d;
          this.hoveredTarget = item;
        }
      }
    }

    // Mouse left/right click-to-move and click-to-interact
    if ((input.leftClicked || input.rightClicked) && this.mouseWorldX !== null && this.mouseWorldY !== null) {
      if (this.hoveredTarget) {
        const rightClick = !!input.rightClicked;
        const distToPlayer = Math.hypot(
          this.hoveredTarget.x - this.player.centerX,
          this.hoveredTarget.y - (this.player.y + this.player.height)
        );
        if (distToPlayer <= this.hoveredTarget.radius + PLAYER_INTERACT_REACH + 16) {
          this.pendingClickTarget = null;
          this.player.clearMoveTarget();
          this.triggerMouseInteract(this.hoveredTarget, rightClick);
          return;
        } else {
          this.pendingClickTarget = { target: this.hoveredTarget, rightClick };
          this.player.setMoveTarget(this.hoveredTarget.x, this.hoveredTarget.y + 18);
        }
      } else if (input.leftClicked) {
        this.pendingClickTarget = null;
        this.player.setMoveTarget(this.mouseWorldX, this.mouseWorldY);
      }
    }

    // Manual WASD cancels pending mouse click interaction
    if (input.isDown("KeyW") || input.isDown("KeyA") || input.isDown("KeyS") || input.isDown("KeyD")) {
      this.pendingClickTarget = null;
    }

    this.player.update(dt, input, this.map);

    if (this.pendingClickTarget) {
      const p = this.pendingClickTarget;
      const dist = Math.hypot(
        p.target.x - this.player.centerX,
        p.target.y - (this.player.y + this.player.height)
      );
      if (dist <= p.target.radius + PLAYER_INTERACT_REACH + 20) {
        this.pendingClickTarget = null;
        this.player.clearMoveTarget();
        this.triggerMouseInteract(p.target, p.rightClick);
        return;
      }
      if (!this.player.moveTarget) {
        this.pendingClickTarget = null;
      }
    }

    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    this.target = findInteractable(this.interactables, reach);

    if (this.target && input.wasPressed("KeyE")) {
      this.triggerMouseInteract(this.target, false);
    }
  }

  private triggerMouseInteract(target: Interactable, rightClick: boolean): void {
    const mode = rightClick && this.rpg.activeMode === "interact" ? "inspect" : this.rpg.activeMode;
    if (mode !== "interact") {
      this.performSkillVerb(target, mode);
      return;
    }
    this.examine(target);
  }

  /**
   * Execute a specific Fallout skill action directly against a target
   * (triggered via Right-Click or selecting a specialized tool mode on bottom HUD).
   */
  private performSkillVerb(target: Interactable, mode: "inspect" | "repair" | "science" | "speech"): void {
    const person = this.personById.get(target.id);
    const prop = this.propById.get(target.id);
    const anchor = person ?? prop;
    if (!anchor) return;

    const dx = anchor.x - this.player.centerX;
    const dy = anchor.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    sounds.playClick();

    if (mode === "inspect") {
      const check = this.rpg.attemptSkillCheck(`inspect_${target.id}`, "perception", 45, 55, anchor.x, anchor.y);
      let detail = "";
      if (person) {
        if (person.id === "captain") {
          detail = check.ok
            ? "【感知检定成功】你注意到舰长指尖沾着轻微的金属石墨粉——他亲手维护那张实体星图，腕表却停在了两年前某次变轨校准时刻。"
            : "【感知观察】舰长神情克制沉稳，制服一丝不苟。你暂时看不出更多异常。";
        } else if (person.id === "engineer") {
          detail = check.ok
            ? "【感知检定成功】老周左腿步态略沉，右袖口别着一枚备用的黄铜泄压销钉。他是真的把这截冷冰冰的铁壳当自家锅炉房守着。"
            : "【感知观察】老周正皱眉盯着水循环压力表，手里攥着一把油光锃亮的扳手。";
        } else {
          detail = check.ok
            ? `【感知检定成功】你敏锐地察觉到 ${person.name} 的工位呼吸灯节奏轻微紊乱，显然对方已经连续高强度值守了十几个小时。`
            : `【感知观察】${person.name} 正全神贯注地盯守着眼前的仪器。`;
        }
      } else if (prop) {
        if (prop.label.includes("便签")) {
          if (check.ok && !this.rpg.hasItem("wrench_heavy")) {
            this.rpg.addItem({
              id: "wrench_heavy",
              name: "老周的三号重型扳手",
              icon: "🔧",
              category: "gear",
              desc: "铬钒合金重型管路扳手，握把缠着防滑油布。老周落在站台値班台的趁手家伙。",
              bonusDesc: "机械工程 +15%",
              equipped: true
            }, anchor.x, anchor.y);
            detail = "【感知发现暗藏物品】你在留言板底沿发现一把油纸包裹的重型管路扳手——正是便签里老周落下的三号扳手！装备后【机械工程 +15%】！";
          } else {
            detail = "【细微勘察】留言板上密密麻麻钉着三十年来船员的琐碎心事，每一张泛黄的纸角都在提醒这里住着活生生的人。";
          }
        } else {
          detail = check.ok
            ? `【感知勘察成功】你在【${prop.label}】接缝处发现了出厂铭牌与微米级热胀冷缩划痕——这台老设备已经在深空中稳定服役了二十八年零七个月。`
            : `【观察结果】你仔细端详了【${prop.label}】，外表沉稳厚重，暂未发现更多暗门或异常标记。`;
        }
      }
      this.dialogue.open([{ speaker: null, text: detail, portraitId: person ? this.portraitForPerson(person.id) : "portrait_terminal" }]);
      this.onDialogueChange?.(this.dialogue);
      this.onRpgChange?.(this.rpg);
      return;
    }

    if (mode === "repair") {
      if (person) {
        this.rpg.pushLog("system", "无法对活人使用【机械维修】扳手。请换用交涉或观察！");
        this.rpg.spawnFloatingText(anchor.x, anchor.y - 36, "无法对乘员维修", "#fbbf24");
        this.onRpgChange?.(this.rpg);
        return;
      }
      const check = this.rpg.attemptSkillCheck(`repair_${target.id}`, "repair", 52, 85, anchor.x, anchor.y);
      let msg = "";
      if (check.ok) {
        if (prop?.label === "聚变反应堆状态监测台" && this.crisis.isAlarmActive) {
          this.rpg.grantXp(40, "机房抢修辅助", anchor.x, anchor.y);
          msg = "【机械校准成功】你迅速清理了传感器积碳并紧固接线端子，副泵压降曲线稳定了下来 (+85 XP)！";
        } else {
          msg = `【机械维保完成】你熟练地拧紧了【${prop?.label}】的防松螺栓与机械拨钮阻尼。设备发出一声清脆惬意的咔嗒声！`;
        }
      } else {
        this.rpg.damage(6, 0, `误触【${prop?.label}】带电机械棘轮`, this.player.centerX, this.player.y);
        msg = `【机械操作失误】扳手滑脱，机械棘轮反冲擦伤了手背 (-6 HP)！建议佩戴防滑工具或提高机械技能后再试。`;
      }
      this.dialogue.open([{ speaker: null, text: msg, portraitId: prop?.label.includes("反应堆") || prop?.label.includes("泄压") ? "portrait_reactor" : "portrait_terminal" }]);
      this.onDialogueChange?.(this.dialogue);
      this.onRpgChange?.(this.rpg);
      return;
    }

    if (mode === "science") {
      if (person) {
        this.dialogue.open([{ speaker: null, text: `${person.name}狐疑地看着你举起的便携信号解码板：「把测试探头收起来，我不是终端。」`, portraitId: this.portraitForPerson(person.id) }]);
        this.onDialogueChange?.(this.dialogue);
        return;
      }
      const check = this.rpg.attemptSkillCheck(`sci_${target.id}`, "science", 55, 95, anchor.x, anchor.y);
      let msg = "";
      if (check.ok) {
        if (prop?.label === "舰长的办公桌" && !this.rpg.hasItem("captain_cipher")) {
          this.rpg.addItem({
            id: "captain_cipher",
            name: "舰长旧地球暗号卡",
            icon: "🪪",
            category: "quest",
            desc: "嵌在办公桌隐藏磁吸位下的实体身份卡，记载着三十年航线修正底档权限。",
            bonusDesc: "话术交涉 +10%"
          }, anchor.x, anchor.y);
          msg = "【科学解码突破】你接通离线解码板，意外激活桌面隐蔽维护协议，发现并取得【舰长旧地球暗号卡】！";
        } else {
          msg = `【硬件解码成功】你成功读取了【${prop?.label}】的底层自检校验码，完整转储近三十年的固件日志。`;
        }
      } else {
        msg = `【逻辑校验失败】旧世代铜芯总线返回一组奇偶校验错误代码。你未能突破这层硬件锁。`;
      }
      this.dialogue.open([{ speaker: null, text: msg, portraitId: "portrait_terminal" }]);
      this.onDialogueChange?.(this.dialogue);
      this.onRpgChange?.(this.rpg);
      return;
    }

    if (mode === "speech") {
      if (!person) {
        this.rpg.pushLog("system", "对着死物自言自语得不到回应——机械设备只会听从逻辑与扳手。");
        this.onRpgChange?.(this.rpg);
        return;
      }
      const check = this.rpg.attemptSkillCheck(`speech_${person.id}`, "speech", 55, 110, anchor.x, anchor.y);
      if (check.ok && !this.rpg.hasItem("med_stim")) {
        this.rpg.addItem({
          id: "med_stim",
          name: "抗辐宁急救注射剂",
          icon: "💉",
          category: "consumable",
          desc: "应急储备注射剂，可回复生命与清除辐射。",
          bonusDesc: "+40 HP / -50 RAD"
        }, anchor.x, anchor.y);
      }
      const text = check.ok
        ? `【交涉成功】[魅力/话术生效] ${person.name}神色明显缓和下来，拍了拍你的肩膀：「还是你们基层干活稳重，这支备用【抗辐宁注射剂】拿好，深空轮班别硬撑。」`
        : `【交涉受挫】${person.name}摆了摆手：「现在当班呢，别扯那些有的没的，抓紧把手头活干完吧。」`;
      this.dialogue.open([{ speaker: person.name, text, portraitId: this.portraitForPerson(person.id) }]);
      this.onDialogueChange?.(this.dialogue);
      this.onRpgChange?.(this.rpg);
      return;
    }
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
    let portraitOverride: string | undefined;

    if (prop) {
      if (prop.label.includes("反应堆") || prop.label.includes("泄压") || prop.label.includes("展开栓") || prop.label.includes("压力")) {
        portraitOverride = "portrait_reactor";
      } else if (prop.label.includes("台") || prop.label.includes("终端") || prop.label.includes("席") || prop.label.includes("开关") || prop.label.includes("屏") || prop.label.includes("办公桌")) {
        portraitOverride = "portrait_terminal";
      }

      if (prop.label === "动力席") {
        if (this.duty.complete("power")) {
          this.rpg.grantXp(60, "动力席巡检", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【二班值班记录已更新】散热翼当前展开角度为 42°，第一回路状态恒定。已记入当班巡检日志。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "机械应急开关" && prop.x > 20 * this.map.tileSize) {
        if (this.duty.complete("switch")) {
          this.rpg.grantXp(60, "右舷开关核查", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【二班值班记录已更新】右舷机械应急开关的手动保护罩已确认处于锁定安全位。已记入当班巡检日志。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "绿植" && prop.y < 20 * this.map.tileSize) {
        if (this.duty.complete("plant")) {
          this.rpg.grantXp(60, "照料舰桥绿植", prop.x, prop.y);
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
          this.rpg.addItem({
            id: "eva_thermal_suit",
            name: "重型陶瓷防热工程服",
            icon: "🦺",
            category: "gear",
            desc: "加厚陶瓷胸甲与独立加压闭路呼吸循环系统，专为高温聚变泵房抢险设计。",
            bonusDesc: "热辐射减免 +85%",
            equipped: true
          }, prop.x, prop.y);
          this.rpg.grantXp(100, "整备防热装备", prop.x, prop.y);
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
          const check = this.rpg.attemptSkillCheck("valve_bypass_steam", "repair", 48, 120, prop.x, prop.y);
          if (!check.ok) {
            this.rpg.damage(10, 12, "高压阀喷溅过热蒸汽反冲", prop.x, prop.y);
          }
          dutyNote = {
            speaker: null,
            text: check.ok
              ? "【旁路泄压成功】[机械检定成功] 你找准泄压波谷，逆时针连转三圈重型转轮！高压旁路阀门轰然弹开，未受灼伤便将第一回路压力骤降至安全警戒线！"
              : "【旁路泄压成功】[强行扳开 (-10 HP)] 你咬紧牙关顶着喷溅蒸汽逆时针连转三圈重型转轮！高压旁路阀门轰然弹开，压力骤降至安全线！"
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
          this.rpg.grantXp(220, "第一章结算：排除反应堆过热危机", prop.x, prop.y);
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

    const baseLines = person ? this.linesFor(person) : prop?.lines;
    if (!baseLines || baseLines.length === 0) return;

    let lines: DialogueLine[] = baseLines.map((l) => ({
      ...l,
      portraitId: l.portraitId ?? portraitOverride ?? (person ? this.portraitForPerson(person.id) : undefined)
    }));

    if (dutyNote) {
      dutyNote.portraitId = dutyNote.portraitId ?? portraitOverride ?? (person ? this.portraitForPerson(person.id) : undefined);
      lines = dutyNoteFirst ? [dutyNote, ...lines] : [...lines, dutyNote];
    }

    // Attach optional Classic Fallout branching skill checks to the final line of rich fixtures/NPCs
    if (!lines[lines.length - 1].choices) {
      const extraChoices = this.choicesFor(target.id, prop, person);
      if (extraChoices && extraChoices.length > 0) {
        lines[lines.length - 1] = {
          ...lines[lines.length - 1],
          choices: extraChoices
        };
      }
    }

    const dx = anchor.x - this.player.centerX;
    const dy = anchor.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    if (prop) this.seen.add(prop.assetId);

    this.target = null;
    this.dialogue.open(lines);
    this.onDialogueChange?.(this.dialogue);
    this.onRpgChange?.(this.rpg);
  }

  private portraitForPerson(personId: string): string {
    switch (personId) {
      case "captain":
        return "portrait_captain";
      case "engineer":
        return "portrait_engineer";
      case "medic":
        return "portrait_medic";
      case "navigator":
        return "portrait_navigator";
      case "transit_guard":
        return "portrait_transit";
      default:
        return "portrait_player";
    }
  }

  private choicesFor(
    targetId: string,
    prop?: SceneProp,
    person?: ScenePerson
  ): DialogueChoice[] | undefined {
    if (person) {
      if (person.id === "captain") {
        const speechPct = this.rpg.checkChance("speech", 58);
        const perPct = this.rpg.checkChance("perception", 50);
        return [
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「长官，底层管线超龄服役的事，指挥室档案里到底写到哪一步？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("cap_speech", "speech", 58, 120, person.x, person.y);
              if (r.ok && !this.rpg.hasItem("captain_cipher")) {
                this.rpg.addItem({
                  id: "captain_cipher",
                  name: "舰长旧地球暗号卡",
                  icon: "🪪",
                  category: "quest",
                  desc: "刻着旧历航线加密编号的实体身份磁卡。",
                  bonusDesc: "话术交涉 +10%"
                }, person.x, person.y);
              }
              return [
                {
                  speaker: "舰长",
                  portraitId: "portrait_captain",
                  text: r.ok
                    ? "舰长沉默了两秒，从内衬袋拿出一枚旧黄铜磁卡推到桌沿：「这是三十年前出港时的备用检修密钥。底下的老人知道该用在哪里，但记住，别拿去惹麻烦。」"
                    : "舰长的目光冷淡地越过你的肩头：「每一段舰体的寿命评估都在指挥网里。作为二班巡检员，你只需确保你手上的阀门不漏压就行。」"
                }
              ];
            }
          },
          {
            tag: `[洞察 ${perPct}%]`,
            label: "(不动声色地扫视他身侧的操作面板和手抄纸页)",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("cap_per", "perception", 50, 90, person.x, person.y);
              return [
                {
                  speaker: null,
                  portraitId: "portrait_captain",
                  text: r.ok
                    ? "【洞察细节】手抄表边缘反复被红笔圈出了两个数字——12,408 和远境-IV 的深空轨道倾角。他并没有表面上看起来那样轻松。"
                    : "一切摆设都严丝合缝，克制得让人看不出一丝破绽。"
                }
              ];
            }
          },
          { label: "立正离开", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "engineer") {
        const repPct = this.rpg.checkChance("repair", 50);
        return [
          {
            tag: `[机械 ${repPct}%]`,
            label: "「周班长，这段聚变一回路老阀芯有什么讲究，教我两手？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("zhou_repair", "repair", 50, 95, person.x, person.y);
              if (r.ok && !this.rpg.completedChecks.has("zhou_lesson_bonus")) {
                this.rpg.completedChecks.add("zhou_lesson_bonus");
                this.rpg.allocatedSkills.repair += 4;
                this.rpg.pushLog("check_ok", "老周亲自指点阀芯阻尼手感，永久获得【机械工程 +4%】！");
              }
              return [
                {
                  speaker: "老周",
                  portraitId: "portrait_engineer",
                  text: r.ok
                    ? "老周咧嘴笑了笑，抄起扳手比划着：「听着点！听到第2圈嘎吱响别蛮扭，回半齿泄半口闷气再一口气带死。记住了啊，关键时能保命！」"
                    : "老周叹了口气：「你这力道光看手势还差了火候，得多钻几次冷风管廊才磨得出来。」"
                }
              ];
            }
          },
          { label: "「好嘞，我这就再去干活。」", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "medic") {
        const sciPct = this.rpg.checkChance("science", 52);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: "「陈医生，我用解码板帮您校测一下休眠母线谐波？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("medic_sci", "science", 52, 115, person.x, person.y);
              if (r.ok && !this.rpg.completedChecks.has("medic_stim_gift")) {
                this.rpg.completedChecks.add("medic_stim_gift");
                this.rpg.addItem({
                  id: "med_stim",
                  name: "抗辐宁急救注射剂",
                  icon: "💉",
                  category: "consumable",
                  desc: "舰载损管急救剂，可快速缓解热灼伤与清除辐射。",
                  bonusDesc: "+40 HP / -50 RAD",
                  quantity: 1
                }, person.x, person.y);
              }
              return [
                {
                  speaker: "陈医生",
                  portraitId: "portrait_medic",
                  text: r.ok
                    ? "「天哪，零点零二赫兹的微弱杂波让你找出来了！难怪 407 号冷机老是虚警。这支库存的【抗辐宁急救针】请收下，下面炉房热毒重，随时保命。」"
                    : "「谢谢你的好意，不过休眠母线的精密信号校准最好还是留给专职医工电脑自动扫频吧。」"
                }
              ];
            }
          },
          { label: "轻手轻脚退出医疗室", tone: "leave", action: () => {} }
        ];
      }
    }

    if (prop) {
      if (prop.label === "舰长的办公桌" || prop.label === "离线资料终端" || prop.label === "休眠生理监测终端" || prop.label === "聚变反应堆状态监测台") {
        const sciPct = this.rpg.checkChance("science", 54);
        const perPct = this.rpg.checkChance("perception", 46);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: `接入解码板，深层解析【${prop.label}】离线缓存`,
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck(`term_sci_${targetId}`, "science", 54, 100, prop.x, prop.y);
              return [
                {
                  speaker: null,
                  portraitId: prop.label.includes("聚变") ? "portrait_reactor" : "portrait_terminal",
                  text: r.ok
                    ? `【深层档案破解】[科学成功 +100 XP] 屏幕荧光闪动，调出一段标有『远航第29年冬眠校准纪要』的底档：全舰储备冷媒余量仅足够再执行一次满载制动，一切重担都在“远境-IV”的新能源样本上。`
                    : `【终端加密锁死】连续三次奇偶校验超时，老式离线终端自动挂起当前端口并切断调试线。`
                }
              ];
            }
          },
          {
            tag: `[洞察 ${perPct}%]`,
            label: "检查实体按键、缝隙与手写便签痕迹",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck(`term_per_${targetId}`, "perception", 46, 70, prop.x, prop.y);
              return [
                {
                  speaker: null,
                  portraitId: prop.label.includes("聚变") ? "portrait_reactor" : "portrait_terminal",
                  text: r.ok
                    ? `【细微洞察 (+70 XP)】你顺着外壳灰尘轨迹发现某个高频使用的红色物理键早已磨露出黄铜底色——有人比班次表写得更频繁地偷偷查看过它。`
                    : `金属外壳表面只留着常规保养后的淡淡油迹，没有其他线索。`
                }
              ];
            }
          },
          { label: "合上护盖离开", tone: "leave", action: () => {} }
        ];
      }

      if (prop.label === "船员便签留言板") {
        const perPct = this.rpg.checkChance("perception", 40);
        return [
          {
            tag: `[洞察 ${perPct}%]`,
            label: "顺着「三号管路扳手」的留言去值班台下方翻找",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("find_wrench", "perception", 40, 100, prop.x, prop.y);
              if (r.ok && !this.rpg.hasItem("wrench_heavy")) {
                this.rpg.addItem({
                  id: "wrench_heavy",
                  name: "老周的三号重型扳手",
                  icon: "🔧",
                  category: "gear",
                  desc: "老周落在生活区值班台夹层里的重型铬钒管路扳手。",
                  bonusDesc: "机械工程 +15%",
                  equipped: true
                }, prop.x, prop.y);
              }
              return [
                {
                  speaker: null,
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "【找到贵重工具！】你在桌角工具袋夹层里果然摸到了那把沉甸甸的三号铬钒管路扳手！获得被动加成：【机械工程 +15%】！"
                    : "桌脚杂物堆里只有些废弃焊条和棉纱，暂时没摸到那把扳手（按[Tab]提升洞察后再来试试）。"
                }
              ];
            }
          },
          { label: "离开留言板", tone: "leave", action: () => {} }
        ];
      }
    }

    return undefined;
  }

  /**
   * What a person says.
   */
  private linesFor(person: ScenePerson): readonly DialogueLine[] {
    if (person.id === "engineer") {
      if (this.duty.isInspectionDone() && !this.duty.tasks.find((t) => t.id === "report")?.completed) {
        this.duty.complete("report");
        this.onDutyChange?.(this.duty);
        this.crisis.triggerAlarm();
        this.crisis.advanceToEva();
        this.onCrisisChange?.(this.crisis);
        this.rpg.grantXp(120, "完成二班巡检交接", person.x, person.y);
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

      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "老周", text: "「咳咳……小徐！主回路气压快把高压管顶爆了，我在这守着主循环！」" },
          { speaker: "老周", text: "「快按刚才说的，去机库拿重型防热服，下到泵房转泄压转轮，再拉开副散热翼的击发栓！」" }
        ];
      }

      if (this.crisis.isResolved) {
        return [
          { speaker: "老周", text: "老周坐在翻倒的工具箱上，正用棉纱擦拭扳手上的黑油，长长舒了一口气。" },
          { speaker: "老周", text: "「呼……听见排气声停了，压力表指针掉下来了。小子，手脚挺利索啊，没慌。」" },
          { speaker: "老周", text: "「机控室那些坐大位子的高层，大概永远不会知道是咱们在最底层把手轮拧开的。但无所谓，咱们自己活着，这一万两千号休眠者也活着，这就够了。」" },
          { speaker: "老周", text: "「喝口温水，把终端上的当班交接刷了。今晚生活区加餐，有压缩脱水羊肉，赶紧去打一份。」" }
        ];
      }

      if (!this.duty.isInspectionDone()) {
        return [
          { speaker: "老周", text: "「哟，小徐，来得正好。今天的二班巡检任务还没结签呢。」" },
          { speaker: "老周", text: "「去查一下动力席的散热翼、右舷应急开关锁闭销、还有人员席角落那盆快干枯的绿植。」" },
          { speaker: "老周", text: "「咱们底层的工勤任务得按部就班，机控室不管咱们琐事，但咱们自己得把底层的底子摸清。」" }
        ];
      }
    }

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
    this.rpg.pushLog("system", "开拓者一号脱离远望号电磁滑轨，切入初辉恒星系巡航轨迹。");
    this.onExplorationChange?.(this.exploration);
    this.onRpgChange?.(this.rpg);
  }

  landOnPlanet(): void {
    this.exploration.landOnSurface();
    this.mode = "planetary_surface";
    this.planetSurface.spawnAtLandingSite();
    sounds.playClank();
    this.addShake(8, 0.8);
    this.onExplorationChange?.(this.exploration);
    this.dialogue.open([
      { speaker: "穿梭机着陆计算系统", portraitId: "portrait_terminal", text: "【黑障穿透完毕】气动绝热瓦承受峰值摩擦，反推减速火箭精准切入！拓荒者一号已稳固降落在远境-IV 玄武岩极地！" },
      { speaker: "环境感知读数", portraitId: "portrait_player", text: "【地表大气读数】表面气压 0.18 atm，环境温度 -112℃，存在微弱高能离子风暴。请穿戴重型封闭防护服作业。" }
    ]);
    this.onDialogueChange?.(this.dialogue);
  }

  dockAtMothership(): void {
    this.mode = "deck";
    const size = this.map.tileSize;
    this.player.x = (HANGAR_ORIGIN.tx + 8) * size;
    this.player.y = (HANGAR_ORIGIN.ty + 6) * size;
    this.player.clearMoveTarget();
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(4, 0.4);
    this.rpg.grantXp(250, "平安返航归舰", this.player.centerX, this.player.y);
    this.dialogue.open([
      { speaker: "机库调度终端", portraitId: "portrait_terminal", text: "【停泊磁吸闭锁】拓荒者一号已稳固归位。主气闸加压完毕，环境气压已恢复标准 101.3 kPa。欢迎回舰，开拓者！" }
    ]);
    this.onDialogueChange?.(this.dialogue);
    this.onRpgChange?.(this.rpg);
  }

  scanBuoy(): void {
    this.spaceFlight.researchBuoy.scanned = true;
    sounds.playBeaconPulse();
    if (!this.rpg.hasItem("kaiyang_cipher")) {
      this.rpg.addItem({
        id: "kaiyang_cipher",
        name: "开阳-03 加密遥测盘",
        icon: "🛰️",
        category: "intel",
        desc: "由废弃星际浮标恢复的远境-IV 重氢裂谷精密地质频谱数据。",
        bonusDesc: "科学终端 +8%"
      });
      this.rpg.grantXp(140, "打捞深空浮标遥测");
    }
    this.dialogue.open([
      { speaker: "开阳-03 浮标数据总线", portraitId: "portrait_terminal", text: "【科研遥测下行】正在读取前哨探测器遗留的历史遥测包……" },
      { speaker: "开阳-03 浮标数据总线", portraitId: "portrait_terminal", text: "【坐标解算完毕】确认远境-IV 极地裂谷处存在高密度重氢（Deuterium）冰晶矿脉，极具开采科研价值！" }
    ]);
    this.onDialogueChange?.(this.dialogue);
    this.onRpgChange?.(this.rpg);
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
          { speaker: "穿梭机起飞系统", portraitId: "portrait_terminal", text: "【反推爬升】离子发动机二次点火，拓荒者一号脱离远境-IV 引力井，重回初辉恒星系深空巡航轨道！" },
          { speaker: "任务指令中心", portraitId: "portrait_navigator", text: "【返航指引】航向已自动对准远望号母舰（西北象限），请加速返回机库对接。" }
        ]);
        this.onDialogueChange?.(this.dialogue);
        this.onExplorationChange?.(this.exploration);
        return;
      }
      sounds.playClick();
      this.dialogue.open([
        { speaker: "拓荒者一号机载电脑", portraitId: "portrait_terminal", text: "地表勘测任务尚未全部完成：请先完成科研中继信标部署与高纯重氢样本采集，再执行返航程序。" }
      ]);
      this.onDialogueChange?.(this.dialogue);
      return;
    }

    if (target.id === "surface_beacon") {
      if (!this.exploration.beaconDeployed) {
        this.exploration.deployBeacon();
        sounds.playBeaconPulse();
        this.addShake(6, 0.6);
        this.rpg.grantXp(160, "建立永久深空信标基站");
        this.onExplorationChange?.(this.exploration);
        this.onRpgChange?.(this.rpg);
        this.dialogue.open([
          { speaker: "地面科考终端", portraitId: "portrait_terminal", text: "【科研中继信标展开】重型合金地锚稳固钉入玄武岩裂隙！高增益相控阵天线展开，成功锁定远望号高轨信号！" },
          { speaker: "地面科考终端", portraitId: "portrait_terminal", text: "初辉恒星系永久深空科学观测基站已建立，地质遥测数据实时回传中！" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      } else {
        sounds.playClick();
        this.dialogue.open([
          { speaker: "地面科考终端", portraitId: "portrait_terminal", text: "科研中继信标工作状态恒定。信号发射功率 120 W，已与远望号母舰中枢建立稳定低延迟链路。" }
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
        this.rpg.addItem({
          id: "deuterium_sample",
          name: "99.4%高纯重氢冰晶罐",
          icon: "💎",
          category: "quest",
          desc: "密封在 14 K 恒温钛罐中的远境-IV 原生聚变重氢样品。"
        });
        this.rpg.grantXp(180, "采集关键聚变重氢样本");
        this.onExplorationChange?.(this.exploration);
        this.onRpgChange?.(this.rpg);
        this.dialogue.open([
          { speaker: "便携地质采样器", portraitId: "portrait_player", text: "【高纯重氢冰晶采集完毕】超低温隔热密封罐已封存 500 mL 重氢冰晶矿石样品！" },
          { speaker: "便携地质采样器", portraitId: "portrait_player", text: "高品位聚变原料纯度测定达 99.4%！这验证了初辉恒星系具备长期自给自足聚变推进的可行性！" }
        ]);
        this.onDialogueChange?.(this.dialogue);
      } else {
        sounds.playClick();
        this.dialogue.open([
          { speaker: "便携地质采样器", portraitId: "portrait_player", text: "该处露头的重氢样本已取样完毕。低温保温槽读数恒定在 14 K。" }
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
    this.lastCameraWorldX = renderer.camera.worldX;
    this.lastCameraWorldY = renderer.camera.worldY;
    this.lastViewportWidth = renderer.width;
    this.lastViewportHeight = renderer.height;

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
    this.atmosphere.renderWallDepthAndAO(renderer, this.map);
    this.renderShadowsAndPaths(renderer);
    this.renderProps(renderer);
    this.renderPeople(renderer);
    this.renderPlayer(renderer);
    this.renderLightingOverlay(renderer);
    this.renderPrompt(renderer);
    this.renderFloatingTexts(renderer);
    this.renderAlarmOverlay(renderer);
  }

  private renderShadowsAndPaths(renderer: Renderer): void {
    // Drop shadow discs under fixtures
    if (renderer.drawEllipse) {
      const size = this.map.tileSize;
      for (const prop of this.props) {
        if (
          prop.x < renderer.camera.worldX - 180 ||
          prop.x > renderer.camera.worldX + renderer.camera.viewportWidth + 180 ||
          prop.y < renderer.camera.worldY - 180 ||
          prop.y > renderer.camera.worldY + renderer.camera.viewportHeight + 180
        ) {
          continue;
        }
        renderer.drawEllipse(prop.x + 2, prop.y + (prop.h * size) / 2 - 4, (prop.w * size) / 2 + 2, 7, "rgba(2, 4, 9, 0.56)");
      }
      for (const person of this.people) {
        renderer.drawEllipse(person.x, person.y - 2, 13, 6, "rgba(2, 4, 9, 0.65)");
      }
      renderer.drawEllipse(this.player.centerX, this.player.y + this.player.height - 2, 13, 6, "rgba(2, 4, 9, 0.7)");
    }

    // Fallout mouse click destination marker & dashed path
    if (this.player.moveTarget) {
      const tx = this.player.moveTarget.x;
      const ty = this.player.moveTarget.y;
      renderer.drawLine?.(
        this.player.centerX,
        this.player.y + this.player.height - 4,
        tx,
        ty,
        "rgba(251, 191, 36, 0.45)",
        1.5,
        [5, 5]
      );
      const pulse = 7 + Math.sin(this.elapsedTime * 8) * 2;
      renderer.drawEllipse?.(tx, ty, pulse + 4, pulse * 0.6, "rgba(245, 158, 11, 0.28)", true);
      renderer.drawRect(tx - 3, ty - 3, 6, 6, { color: "#fbbf24", radius: 3 });
    }

    // Mouse hover Fallout targeting bracket
    if (this.hoveredTarget) {
      const h = this.hoveredTarget;
      const col = this.rpg.activeMode === "repair"
        ? "#f97316"
        : this.rpg.activeMode === "science"
        ? "#38bdf8"
        : this.rpg.activeMode === "speech"
        ? "#c084fc"
        : "#fbbf24";
      renderer.drawEllipse?.(h.x, h.y + 4, Math.max(18, h.radius * 0.52), 11, `${col}2e`, true);
      renderer.drawRect(h.x - 16, h.y - 16, 32, 32, {
        stroke: { width: 1.5, color: col },
        radius: 6
      });
    }
  }

  private renderLightingOverlay(renderer: Renderer): void {
    // Aim shoulder lamp along player facing or slight angle toward hovered cursor
    let beamAngle = Math.PI / 2;
    if (this.player.facing === "up") beamAngle = -Math.PI / 2;
    else if (this.player.facing === "left") beamAngle = Math.PI;
    else if (this.player.facing === "right") beamAngle = 0;

    if (this.mouseWorldX !== null && this.mouseWorldY !== null && !this.player.moveTarget) {
      const dx = this.mouseWorldX - this.player.centerX;
      const dy = this.mouseWorldY - (this.player.y + 20);
      if (Math.hypot(dx, dy) > 18) {
        beamAngle = Math.atan2(dy, dx);
      }
    }

    this.atmosphere.renderLightingPass(
      renderer,
      this.map,
      this.props,
      this.player.centerX,
      this.player.y + this.player.height,
      beamAngle,
      this.currentPlace,
      this.crisis.isAlarmActive,
      this.elapsedTime
    );
  }

  private renderFloatingTexts(renderer: Renderer): void {
    for (const f of this.rpg.floatingTexts) {
      const alpha = Math.max(0, 1 - f.life / f.maxLife);
      renderer.drawWorldText(f.text, f.x, f.y, {
        color: f.color,
        size: 13,
        align: "center",
        baseline: "bottom"
      });
      void alpha;
    }
  }

  private renderAlarmOverlay(renderer: Renderer): void {
    if (!this.crisis.isAlarmActive) return;

    const pulse = (Math.sin(this.elapsedTime * 4) + 1) / 2;
    const alpha = 0.06 + pulse * 0.1;
    renderer.drawRect(
      renderer.camera.worldX,
      renderer.camera.worldY,
      renderer.camera.viewportWidth,
      renderer.camera.viewportHeight,
      { color: `rgba(220, 38, 20, ${alpha.toFixed(3)})` }
    );
  }

  private renderBackdrop(renderer: Renderer): void {
    renderer.drawRect(0, 0, renderer.width, renderer.height, { color: "#06090e" });
  }

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
    if (this.hoveredTarget && this.hoveredTarget !== this.target) {
      const modeName =
        this.rpg.activeMode === "repair"
          ? "🔧 机械"
          : this.rpg.activeMode === "science"
          ? "💻 科学"
          : this.rpg.activeMode === "speech"
          ? "💬 交涉"
          : this.rpg.activeMode === "inspect"
          ? "🔍 观察"
          : "点击靠近/右键观察";
      renderer.drawWorldText(`${this.hoveredTarget.label} · ${modeName}`, this.hoveredTarget.x, this.hoveredTarget.y - 34, {
        color: "#fde68a",
        size: 12,
        align: "center",
        baseline: "bottom"
      });
    }

    if (!this.target) return;

    const image = this.assets?.image("ui_prompt_e") ?? null;
    renderer.drawSprite(image, this.target.x, this.target.y - 32, {
      anchor: "bottom-center",
      size: { w: 32, h: 32 },
      fallbackColor: "#f2efe8"
    });
  }
}
