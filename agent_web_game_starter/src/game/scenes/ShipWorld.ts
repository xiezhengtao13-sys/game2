import type { GameCamera, GameWorld } from "../../engine/core/GameWorld";
import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import type { TileMap } from "../map/TileMap";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue, type DialogueChoice, type DialogueLine } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH } from "../config";
import {
  exteriorKindAt,
  isFloor,
  placeAt,
  shipSpawn,
  FORE_ORIGIN,
  BRIDGE_ORIGIN,
  CABIN_ORIGIN,
  TRANSIT_ORIGIN,
  L1_ORIGIN,
  R1_ORIGIN,
  HABITAT_ORIGIN,
  L2_ORIGIN,
  MEDICAL_ORIGIN,
  HANGAR_ORIGIN,
  REACTOR_ORIGIN,
  PROPULSION_ORIGIN,
  type Place
} from "../map/shipMap";
import {
  findSmartPath,
  findBestInteractStandPoint,
  type PathResult
} from "../map/pathfinding";
import { DutySystem } from "../systems/DutySystem";
import { CrisisSystem } from "../systems/CrisisSystem";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { SideQuestSystem, type SideQuestFlag, type SideQuestRecord } from "../systems/SideQuestSystem";
import { RpgSystem } from "../systems/RpgSystem";
import { SecuritySystem, type SecurityGate } from "../systems/SecuritySystem";
import { SpaceFlight } from "./SpaceFlight";
import { PlanetSurface } from "./PlanetSurface";
import { ShipAtmosphere } from "./shipLighting";
import {
  SHIP_PROPS,
  ALL_SHIP_PEOPLE,
  PLACE_LABELS,
  type SceneProp,
  type ScenePerson
} from "./shipProps";
import { sounds } from "../../engine/audio/SoundEffects";

/**
 * The full 2,800m Yuanwang colony ship as one continuous CRPG world:
 *   - Intelligent A* pathfinding across 15 compartments + prop/corner smoothing
 *   - Physical security bulkhead clearances isolating lower crewman zones at game start
 *   - Three-phase crewman storyline + 4 post-Watch-Accord (2491 AD) side quests
 */
export class ShipWorld implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();
  readonly map: TileMap;
  readonly duty = new DutySystem();
  readonly crisis = new CrisisSystem();
  readonly exploration = new ExplorationSystem();
  readonly sideQuests = new SideQuestSystem();
  readonly rpg = new RpgSystem();
  readonly security = new SecuritySystem();
  readonly spaceFlight = new SpaceFlight();
  readonly planetSurface: PlanetSurface;
  readonly atmosphere = new ShipAtmosphere();
  private mode: "deck" | "space_flight" | "planetary_surface" = "deck";

  private elapsedTime = 0;
  private readonly assets: GameAssets | null;
  private readonly props: readonly SceneProp[];
  private readonly people: readonly ScenePerson[];
  private readonly baseInteractables: readonly Interactable[];
  private readonly gateEntries: ReadonlyArray<{ gate: SecurityGate; item: Interactable }>;
  private readonly propById = new Map<string, SceneProp>();
  private readonly personById = new Map<string, ScenePerson>();
  private readonly propFootprintTiles = new Set<string>();

  /** Dynamic screen shake mechanics. */
  private shakeIntensity = 0;
  private shakeDuration = 0;

  /** Mouse hover & click-to-interact state (Fallout style). */
  hoveredTarget: Interactable | null = null;
  private pendingClickTarget: { target: Interactable; rightClick: boolean } | null = null;
  private pendingBlockedGate: SecurityGate | null = null;
  private mouseWorldX: number | null = null;
  private mouseWorldY: number | null = null;
  private lastCameraWorldX = 0;
  private lastCameraWorldY = 0;
  private lastViewportWidth = 1280;
  private lastViewportHeight = 720;

  /** Central transit maglev hub stations across the 84x204 hull. */
  private transitHubIndex = 0;
  private readonly transitHubs: ReadonlyArray<{ name: string; place: Place; tx: number; ty: number }> = [
    { name: "生活区中央站台", place: "crew_habitat", tx: HABITAT_ORIGIN.tx + 15, ty: HABITAT_ORIGIN.ty + 3 },
    { name: "中央穿梭枢纽平台", place: "transit_hub", tx: TRANSIT_ORIGIN.tx + 16, ty: TRANSIT_ORIGIN.ty + 15 },
    { name: "L-1 生态农业连廊", place: "agri_module", tx: L1_ORIGIN.tx + 16, ty: L1_ORIGIN.ty + 10 },
    { name: "穿梭机机库备勤台", place: "hangar_bay", tx: HANGAR_ORIGIN.tx + 15, ty: HANGAR_ORIGIN.ty + 5 },
    { name: "聚变排险反应堆泵房", place: "reactor_bay", tx: REACTOR_ORIGIN.tx + 15, ty: REACTOR_ORIGIN.ty + 4 },
    { name: "舰桥核心指挥入口", place: "bridge", tx: BRIDGE_ORIGIN.tx + 20, ty: BRIDGE_ORIGIN.ty + 14 }
  ];

  /** What the player is being prompted about right now, or null. */
  private target: Interactable | null = null;

  /** Ids of props already examined, so people react to what you have seen. */
  private readonly seen = new Set<string>();

  /** True once the captain has spoken, so his remark about your looking occurs once. */
  private captainGreeted = false;

  /** Event listeners for DOM HUD sync. */
  onDialogueChange: ((dialogue: Dialogue | null) => void) | null = null;
  onDutyChange: ((duty: DutySystem) => void) | null = null;
  onCrisisChange: ((crisis: CrisisSystem) => void) | null = null;
  onExplorationChange: ((exploration: ExplorationSystem) => void) | null = null;
  onSideQuestsChange: ((quests: SideQuestSystem) => void) | null = null;
  onSecurityChange: ((security: SecuritySystem) => void) | null = null;
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

    const tileSize = map.tileSize;
    const baseInteractables: Interactable[] = [];

    props.forEach((prop, index) => {
      // Soft pathfinding penalty for props so automated paths steer neatly around tables/bunk beds
      const pad = Math.min(8, Math.min(prop.w, prop.h) * tileSize * 0.22);
      const minTx = Math.floor((prop.x - (prop.w * tileSize) / 2 + pad) / tileSize);
      const maxTx = Math.floor((prop.x + (prop.w * tileSize) / 2 - pad) / tileSize);
      const minTy = Math.floor((prop.y - (prop.h * tileSize) / 2 + pad) / tileSize);
      const maxTy = Math.floor((prop.y + (prop.h * tileSize) / 2 - pad) / tileSize);
      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          if (!this.security.gateAtTile(tx, ty)) {
            this.propFootprintTiles.add(`${tx},${ty}`);
          }
        }
      }

      if (!prop.lines || prop.lines.length === 0) return;
      const id = `prop-${index}`;
      this.propById.set(id, prop);
      baseInteractables.push({
        id,
        label: prop.label,
        x: prop.x,
        y: prop.y,
        radius: Math.max(32, (Math.max(prop.w, prop.h) * tileSize) / 2)
      });
    });

    for (const person of people) {
      const ptx = Math.floor(person.x / tileSize);
      const pty = Math.floor((person.y - 8) / tileSize);
      if (!this.security.gateAtTile(ptx, pty)) {
        this.propFootprintTiles.add(`${ptx},${pty}`);
      }

      const id = `person-${person.id}`;
      this.personById.set(id, person);
      baseInteractables.push({
        id,
        label: person.promptLabel,
        x: person.x,
        y: person.y,
        radius: 46
      });
    }

    this.baseInteractables = baseInteractables;

    this.gateEntries = this.security.gates().map((gate) => ({
      gate,
      item: {
        id: `gate-${gate.id}`,
        label: `${gate.name} [${gate.badgeText}]`,
        x: ((gate.x0 + gate.x1 + 1) / 2) * tileSize,
        y: ((gate.y0 + gate.y1 + 1) / 2) * tileSize,
        radius: gate.orientation === "horizontal" ? tileSize * 1.9 : tileSize * 1.5
      }
    }));

    void FORE_ORIGIN;
    void CABIN_ORIGIN;
  }

  /** Bound predicates passed to movement collision and A* pathfinder. */
  private readonly isSecurityBlocked = (tx: number, ty: number): boolean => {
    return this.security.isTileBlocked(tx, ty);
  };

  private readonly tilePenalty = (tx: number, ty: number): number => {
    return this.propFootprintTiles.has(`${tx},${ty}`) ? 12 : 0;
  };

  /** Dynamic interactable list including currently locked bulkhead doors. */
  private activeInteractables(): Interactable[] {
    const activeGates = this.gateEntries
      .filter((entry) => !this.security.isGateOpen(entry.gate))
      .map((entry) => entry.item);
    return [...this.baseInteractables, ...activeGates];
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

  /** Everything that can be examined on deck, for tests and tooling. */
  get examinable(): readonly Interactable[] {
    return this.baseInteractables;
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

  private get currentPlace(): Place {
    const size = this.map.tileSize;
    const tx = Math.floor(this.player.centerX / size);
    const ty = Math.floor((this.player.y + this.player.height - this.player.colliderHeight / 2) / size);
    return placeAt(tx, ty);
  }

  addShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  /** Trigger smart A* pathfinding toward a world pixel coordinate from current feet center. */
  walkToWorldPoint(worldX: number, worldY: number): PathResult {
    const feetX = this.player.centerX;
    const feetY = this.player.y + this.player.height - this.player.colliderHeight / 2;
    const result = findSmartPath(
      this.map,
      { x: feetX, y: feetY },
      { x: worldX, y: worldY },
      {
        extraBlocked: this.isSecurityBlocked,
        tilePenalty: this.tilePenalty
      }
    );

    this.pendingClickTarget = null;
    if (result.partialBlocked && result.blockedByGateTile) {
      const gate = this.security.gateAtTile(result.blockedByGateTile.tx, result.blockedByGateTile.ty);
      if (result.waypoints.length === 0 && gate) {
        this.player.clearMoveTarget();
        this.pendingBlockedGate = null;
        this.examineSecurityGate(gate);
      } else {
        this.pendingBlockedGate = gate;
        this.player.setPath(result.waypoints);
      }
    } else {
      this.pendingBlockedGate = null;
      this.player.setPath(result.waypoints);
    }

    return result;
  }

  cycleTransitHub(): void {
    const unlocked = this.transitHubs.filter((s) => this.security.canAccessPlace(s.place));
    if (unlocked.length <= 1) {
      sounds.playBeep(320);
      this.rpg.pushLog(
        "warn",
        "【门禁调度拦截】当前仅获准活动于生活区与 L-2 车间，请找老周申领中层通行卡后再搭乘穿梭干线！"
      );
      this.rpg.spawnFloatingText(this.player.centerX, this.player.y - 24, "高权限站台未解锁", "#f87171");
      this.onRpgChange?.(this.rpg);
      return;
    }

    const currentStation = this.transitHubs[this.transitHubIndex];
    let idxInUnlocked = unlocked.findIndex((s) => s.name === currentStation?.name);
    idxInUnlocked = (idxInUnlocked + 1) % unlocked.length;
    const dest = unlocked[idxInUnlocked];
    this.transitHubIndex = this.transitHubs.indexOf(dest);

    const size = this.map.tileSize;
    this.player.x = dest.tx * size + (size - this.player.width) / 2;
    this.player.y = dest.ty * size;
    this.player.clearMoveTarget();
    this.pendingClickTarget = null;
    this.pendingBlockedGate = null;
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(5, 0.4);
    this.rpg.pushLog("system", `高速捷运车送达：【${dest.name}】`);
    this.onRpgChange?.(this.rpg);
  }

  /** Trigger the peaceful 06:00 public dormitory wake-up scene when launching in the browser. */
  beginWakeUpIntro(): void {
    if (this.dialogue.isOpen) return;
    this.dialogue.open([
      {
        speaker: "小徐",
        portraitId: "portrait_player",
        text: "06:00。宿舍区柔光照明缓缓亮起，窄铺上的睡眠约束扣发出一声轻响自动松开。"
      },
      {
        speaker: "小徐",
        portraitId: "portrait_player",
        text: "你从公共宿舍区 A1 隔间的铺位起身踩上脚垫。2491 年——《守望协定》签立后第三年，整艘远望号常压恒温、安安静静，隔墙那头的夜班工友还在熟睡。"
      },
      {
        speaker: "小徐",
        portraitId: "portrait_player",
        text: "作为未动过植入式义体的普通二班轮值工勤，先把巡检单揣进兜里——先走出宿舍门，找走廊里的老周点卯吧。听说昨晚航迹悄然偏离主线，正循着一道疑似「卡戎号」的微弱信标摸索前进……"
      }
    ]);
    this.onDialogueChange?.(this.dialogue);
  }

  /** Trigger a numbered choice in an active branching Fallout dialogue. */
  selectDialogueChoice(index: number): void {
    if (!this.dialogue.isOpen) return;
    sounds.playClick();
    this.dialogue.selectChoice(index);
    this.onDialogueChange?.(this.dialogue.isOpen ? this.dialogue : null);
    this.onRpgChange?.(this.rpg);
  }

  /** Use any consumable recovery item from HUD or shortcut cleanly. */
  useConsumable(itemId: string): boolean {
    const ok = this.rpg.useItem(itemId, this.player.centerX, this.player.y);
    if (ok) {
      sounds.playBeep(720);
      this.onRpgChange?.(this.rpg);
    }
    return ok;
  }

  /** Use medical stim from HUD shortcut cleanly. */
  useHealingStim(): boolean {
    return this.useConsumable("med_stim");
  }

  update(dt: number, input: Input): void {
    this.elapsedTime += dt;

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

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
    const inHotZone = this.crisis.isAlarmActive && (place === "reactor_bay" || place === "propulsion_aft");
    const prevHp = this.rpg.hp;
    this.rpg.update(dt, inHotZone, this.crisis.isSuitEquipped, this.player.centerX, this.player.y);
    if (this.rpg.hp !== prevHp) {
      if (this.rpg.hp < prevHp) this.addShake(3, 0.25);
      this.onRpgChange?.(this.rpg);
    }

    this.atmosphere.update(
      dt,
      this.lastCameraWorldX,
      this.lastCameraWorldY,
      this.lastViewportWidth,
      this.lastViewportHeight,
      place,
      this.crisis.isAlarmActive
    );

    const activeItems = this.activeInteractables();

    // Mouse hover lookup over world interactables + locked security gates
    this.hoveredTarget = null;
    if (this.mouseWorldX !== null && this.mouseWorldY !== null) {
      let bestDist = Infinity;
      for (const item of activeItems) {
        const d = Math.hypot(this.mouseWorldX - item.x, this.mouseWorldY - item.y);
        if (d <= Math.max(40, item.radius) && d < bestDist) {
          bestDist = d;
          this.hoveredTarget = item;
        }
      }
    }

    // Smart A* click-to-move and click-to-interact
    if ((input.leftClicked || input.rightClicked) && this.mouseWorldX !== null && this.mouseWorldY !== null) {
      if (this.hoveredTarget) {
        const rightClick = !!input.rightClicked;
        const feetY = this.player.y + this.player.height;
        const distToPlayer = Math.hypot(this.hoveredTarget.x - this.player.centerX, this.hoveredTarget.y - feetY);

        if (distToPlayer <= this.hoveredTarget.radius + PLAYER_INTERACT_REACH + 16) {
          this.pendingClickTarget = null;
          this.pendingBlockedGate = null;
          this.player.clearMoveTarget();
          this.triggerMouseInteract(this.hoveredTarget, rightClick);
          return;
        }

        const result = findBestInteractStandPoint(
          this.map,
          { x: this.player.centerX, y: this.player.y + this.player.height - this.player.colliderHeight / 2 },
          { x: this.hoveredTarget.x, y: this.hoveredTarget.y },
          this.hoveredTarget.radius,
          PLAYER_INTERACT_REACH,
          { extraBlocked: this.isSecurityBlocked, tilePenalty: this.tilePenalty }
        );

        if (result.partialBlocked && result.blockedByGateTile) {
          const gate = this.security.gateAtTile(result.blockedByGateTile.tx, result.blockedByGateTile.ty);
          this.pendingClickTarget = null;
          this.pendingBlockedGate = gate;
          this.player.setPath(result.waypoints);
          if (result.waypoints.length === 0 && gate) {
            this.pendingBlockedGate = null;
            this.examineSecurityGate(gate);
            return;
          }
        } else if (result.waypoints.length > 0) {
          this.pendingBlockedGate = null;
          this.pendingClickTarget = { target: this.hoveredTarget, rightClick };
          this.player.setPath(result.waypoints);
        }
      } else if (input.leftClicked) {
        this.walkToWorldPoint(this.mouseWorldX, this.mouseWorldY);
      }
    }

    // Manual WASD cancels pending mouse click interaction
    if (input.isDown("KeyW") || input.isDown("KeyA") || input.isDown("KeyS") || input.isDown("KeyD")) {
      this.pendingClickTarget = null;
      this.pendingBlockedGate = null;
    }

    this.player.update(dt, input, this.map, this.isSecurityBlocked);

    // Execute arrived-at-blocked-gate feedback automatically
    if (this.pendingBlockedGate && !this.player.moveTarget) {
      const gate = this.pendingBlockedGate;
      this.pendingBlockedGate = null;
      this.examineSecurityGate(gate);
      return;
    }

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
    this.target = findInteractable(activeItems, reach);

    if (this.target && input.wasPressed("KeyE")) {
      this.triggerMouseInteract(this.target, false);
    }
  }

  private examineSecurityGate(gate: SecurityGate): void {
    const size = this.map.tileSize;
    const gx = ((gate.x0 + gate.x1 + 1) / 2) * size;
    const gy = ((gate.y0 + gate.y1 + 1) / 2) * size;
    const dx = gx - this.player.centerX;
    const dy = gy - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    sounds.playBeep(280);
    this.addShake(2, 0.15);
    this.rpg.pushLog("warn", `${gate.name}：${gate.badgeText}`);
    this.rpg.spawnFloatingText(this.player.centerX, this.player.y - 24, "🔒 门禁权限不足", "#f87171");

    this.dialogue.open([
      { speaker: `${gate.name} [${gate.badgeText}]`, portraitId: "portrait_terminal", text: gate.denyReason },
      { speaker: "船载勤务指引终端", portraitId: "portrait_terminal", text: `【权限晋升路线】${gate.hint}` }
    ]);
    this.onDialogueChange?.(this.dialogue);
    this.onRpgChange?.(this.rpg);
  }

  private triggerMouseInteract(target: Interactable, rightClick: boolean): void {
    if (target.id.startsWith("gate-")) {
      const gateId = target.id.slice("gate-".length);
      const gate = this.security.gates().find((g) => g.id === gateId);
      if (gate) {
        this.examineSecurityGate(gate);
        return;
      }
    }

    const mode = rightClick && this.rpg.activeMode === "interact" ? "inspect" : this.rpg.activeMode;
    if (mode !== "interact") {
      this.performSkillVerb(target, mode);
      return;
    }
    this.examine(target);
  }

  private performSkillVerb(target: Interactable, mode: "inspect" | "repair" | "science" | "speech"): void {
    const person = this.personById.get(target.id);
    const prop = this.propById.get(target.id);
    const anchor = person ?? prop;
    if (!anchor) return;

    const dx = anchor.x - this.player.centerX;
    const dy = anchor.y - (this.player.y + this.player.height);
    if (dx !== 0 || dy !== 0) this.player.animation.face(facingFor(dx, dy));

    sounds.playClick();

    let sideNote: DialogueLine | null = null;
    const noteSuffix = () => (sideNote ? `\n\n${sideNote.text}` : "");

    if (mode === "inspect") {
      const check = this.rpg.attemptSkillCheck(`inspect_${target.id}`, "perception", 45, 55, anchor.x, anchor.y);
      let detail = "";
      if (person) {
        if (person.id === "captain") {
          detail = check.ok
            ? "【感知检定成功】你注意到舰长指尖沾着轻微的金属石墨粉——他亲手维护那张实体星图，腕表还停在 2488 年《守望协定》签字当晚的基准时刻。"
            : "【感知观察】舰长神情克制沉稳，制服一丝不苟。你暂时看不出更多异常。";
        } else if (person.id === "engineer") {
          detail = check.ok
            ? "【感知检定成功】老周左腿步态略沉，右袖口别着一枚备用的黄铜泄压销钉。他是真的把这截冷冰冰的铁壳当自家锅炉房守着。"
            : "【感知观察】老周正皱眉盯着水循环压力表，手里攥着一把油光锃亮的扳手。";
        } else if (person.id === "dorm_roommate") {
          detail = check.ok
            ? "【感知洞察成功】小宋眼眶微红发青，指甲缝里还残留着冷切削液的气味。他昨晚确实在车间连轴转抢修机床，累坏了。"
            : "【感知观察】小宋靠着寝室隔断揉着太阳穴，正打着大大的哈欠。";
        } else if (person.id === "cook_ma") {
          detail = check.ok
            ? "【感知洞察成功】老马围裙系得一丝不苟，袖口绣着已退役太阳系联邦航勤餐饮署的旧徽记。配餐灶台被他擦得能倒映出人影。"
            : "【感知观察】老马正利落地在恒温暖餐柜前分装早餐保温餐盒。";
        } else if (person.id === "researcher_ailin") {
          const wasTalked = this.sideQuests.hasFlag("talked_ailin");
          sideNote = this.recordSideQuest(
            wasTalked && this.sideQuests.canReportAilin() ? "reported_ailin" : "talked_ailin",
            anchor.x,
            anchor.y
          );
          detail = check.ok
            ? "【感知洞察成功】陈艾琳实验服口袋里露出一叠写满密麻脑波方程的手稿，纸角一遍遍用铅笔补记着「唤醒 V，不要融合——防遗忘备份」。"
            : "【感知观察】陈艾琳正揉着眉心比对康复脑波打印卷宗，神色温和却难掩失忆后的吃力。";
        } else if (person.id === "rehab_subject") {
          sideNote = this.recordSideQuest("checked_ward_bed", anchor.x, anchor.y);
          detail = check.ok
            ? "【感知洞察成功】周瑾床头并无任何植入体屏蔽贴片，唯有几张练笔素描与写着「第 31 号康复员已稳态出院」的交接单。"
            : "【感知观察】周瑾气色平稳，正对着病房窗沿的恒温绿植轻轻舒展手腕。";
        } else if (person.id === "archivist_lin") {
          sideNote = this.recordSideQuest("talked_archivist_lin", anchor.x, anchor.y);
          detail = check.ok
            ? "【感知洞察成功】林文胸前别着图书馆物理总线断网钥匙链——通往南侧 MNA-01 工作席的数据缆线确实只接了只读编目总线。"
            : "【感知观察】林文正将和平号移交来的胶片微缩件谨慎地归入恒湿纸盒。";
        } else if (person.id === "advisor_vaughn") {
          sideNote = this.recordSideQuest("talked_vaughn", anchor.x, anchor.y);
          detail = check.ok
            ? "【感知洞察成功】伊莱亚斯·沃恩左腕戴着一只双色受控连结监控环——蓝绿微光每三秒与「弥涅瓦-V」互相校验一次签章，既不融合也未断裂。"
            : "【感知观察】沃恩站姿笔挺，目光沉静地掠过舰桥审计台与星图桌。";
        } else if (person.id === "agronomist") {
          sideNote = this.recordSideQuest("asked_linyun_weld", anchor.x, anchor.y);
          detail = check.ok
            ? "【感知洞察成功】林芸工装口袋里仍挂着一把无损探伤尺——每隔几个月她都会顺手去摸一眼走廊上那道 2488 年死锁止动栓。"
            : "【感知观察】林芸正逐株检查水培水稻的溶氧管路，神情专注。";
        } else if (person.id === "medic") {
          sideNote = this.recordSideQuest("asked_chen_prosthetic", anchor.x, anchor.y);
          detail = check.ok
            ? "【感知洞察成功】陈医生工作台上翻开着《远望号原版无义体乘员基线总录》，全舰在册人员植入体栏清一色登记为「0」。"
            : "【感知观察】陈医生正轻步核对四个冷冻休眠仓列的温度微调曲线。";
        } else {
          detail = check.ok
            ? `【感知检定成功】你敏锐地察觉到 ${person.name} 的工位呼吸灯节奏轻微紊乱，显然对方已经连续高强度值守了十几个小时。`
            : `【感知观察】${person.name} 正全神贯注地盯守着眼前的仪器。`;
        }
      } else if (prop) {
        if (prop.label === "康复监护床·一号" || prop.label === "康复监护床·二号") {
          sideNote = this.recordSideQuest("checked_ward_bed", anchor.x, anchor.y);
        } else if (prop.label === "第五协议校验隔离终端") {
          sideNote = this.recordSideQuest("decoded_fifth_protocol", anchor.x, anchor.y);
        } else if (prop.label === "MNA-01 研究员公共工作席") {
          sideNote = this.recordSideQuest("checked_mna01_desk", anchor.x, anchor.y);
        } else if (prop.label === "和平号移交：卡戎号遇袭目击卷宗") {
          sideNote = this.recordSideQuest("examined_charon_file", anchor.x, anchor.y);
        } else if (prop.label === "2488 应急分离焊封止动栓") {
          sideNote = this.recordSideQuest("inspected_l1_weld", anchor.x, anchor.y);
        } else if (prop.label === "弥涅瓦-V · 主舰双监督审计台") {
          sideNote = this.recordSideQuest("inspected_bridge_minerva_v", anchor.x, anchor.y);
        } else if (prop.label === "太阳系七年战争与守望协定档案柜") {
          sideNote = this.recordSideQuest("checked_accord_cabinet", anchor.x, anchor.y);
        }

        if (prop.label.includes("便签")) {
          if (check.ok && !this.rpg.hasItem("wrench_heavy")) {
            this.rpg.addItem({
              id: "wrench_heavy",
              name: "老周的三号重型扳手",
              icon: "🔧",
              category: "gear",
              desc: "铬钒合金重型管路扳手，握把缠着防滑油布。老周落在生活区值班台的趁手家伙。",
              bonusDesc: "机械工程 +15%",
              equipped: true
            }, anchor.x, anchor.y);
            detail = "【感知发现暗藏物品】你在留言板底沿发现一把油纸包裹的重型管路扳手——正是便签里老周落下的三号扳手！装备后【机械工程 +15%】！";
          } else {
            detail = "【细微勘察】留言板上密密麻麻钉着自 2439 年启航五十余年来船员的琐碎心事，每一张泛黄的纸角都在提醒这里住着活生生的人。";
          }
        } else if (prop.label.includes("A1 个人储物柜")) {
          if (check.ok && !this.rpg.hasItem("family_letter")) {
            this.rpg.addItem({
              id: "family_letter",
              name: "泛黄的海滩照片与家书",
              icon: "✉️",
              category: "quest",
              desc: "2439 年从地球启航前父母塞在行囊夹层里的海滩胶片照片，背面用圆珠笔写着：『平安到达新星。』",
              bonusDesc: "全检定意志 +5%"
            }, anchor.x, anchor.y);
            detail = "【感知翻检成功】你在储物柜暗格深处翻出一张塑料塑封的旧照片与家书——那是 2439 年离开太阳系联邦前留下的地球旧海滩日落，背面字迹工整：『平安到达新星。』装备后【全检定意志 +5%】！";
          } else {
            detail = "【细致翻看】储物柜里整齐叠放着二班换洗工装与安全卡。暗格里已被翻阅过。";
          }
        } else if (prop.label.includes("全自动恒温暖餐柜")) {
          detail = check.ok
            ? "【感知勘察成功】暖餐柜温控器维持在 68.5℃，蒸汽孔喷出的余温带着浓郁的炒麦香味，让寒冷深空下的胃部感到阵阵踏实。"
            : "【观察结果】全自动恒温暖餐柜正嗡嗡低鸣，柜门透着柔和的橙黄色保温灯光。";
        } else {
          detail = check.ok
            ? `【感知勘察成功】你在【${prop.label}】接缝处发现了太阳系联邦时期的出厂铭牌与热胀冷缩划痕——这台厚实设备已在深空中稳定服役了五十余载。`
            : `【观察结果】你仔细端详了【${prop.label}】，外表沉稳厚重，暂未发现更多暗门或异常标记。`;
        }
      }
      this.dialogue.open([{ speaker: null, text: `${detail}${noteSuffix()}`, portraitId: person ? this.portraitForPerson(person.id) : "portrait_terminal" }]);
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
        } else if (prop?.label === "2488 应急分离焊封止动栓") {
          sideNote = this.recordSideQuest("inspected_l1_weld", anchor.x, anchor.y);
          msg = "【焊缝测隙复核】钨钢死锁焊道咬合度 100%，物理爆炸螺栓彻底失去了抛弃 L-1 农业模块的能力。";
        } else if (prop?.label.includes("全自动恒温暖餐柜")) {
          msg = "【机械保养完成】你顺手清理了出餐保温槽的滑轨冷凝水并拧紧铰链，暖餐柜滑动变得异常顺畅！";
        } else {
          msg = `【机械维保完成】你熟练地拧紧了【${prop?.label}】的防松螺栓与机械拨钮阻尼。设备发出一声清脆惬意的咔嗒声！`;
        }
      } else {
        this.rpg.damage(6, 0, `误触【${prop?.label}】带电机械棘轮`, this.player.centerX, this.player.y);
        msg = `【机械操作失误】扳手滑脱，机械棘轮反冲擦伤了手背 (-6 HP)！建议佩戴防滑工具或提高机械技能后再试。`;
      }
      this.dialogue.open([{ speaker: null, text: `${msg}${noteSuffix()}`, portraitId: prop?.label.includes("反应堆") || prop?.label.includes("泄压") ? "portrait_reactor" : "portrait_terminal" }]);
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
            desc: "嵌在办公桌隐藏磁吸位下的实体身份卡，记载着 2439 年启航以来的航线修正底档权限。",
            bonusDesc: "话术交涉 +10%"
          }, anchor.x, anchor.y);
          msg = "【科学解码突破】你接通离线解码板，意外激活桌面隐蔽维护协议，发现并取得【舰长旧地球暗号卡】！";
        } else if (prop?.label === "第五协议校验隔离终端") {
          sideNote = this.recordSideQuest("decoded_fifth_protocol", anchor.x, anchor.y);
          msg = "【科学解码成功】解码板读取出 2488 年《第五协议》分段隔离日志：37 名受试者的自主神经序列已被全部保护恢复，唯独陈艾琳的一段早期记忆索引留在了隔离扇区。";
        } else if (prop?.label === "MNA-01 研究员公共工作席") {
          sideNote = this.recordSideQuest("checked_mna01_desk", anchor.x, anchor.y);
          msg = "【总线权限定界】确认本机推进、医疗与武装系统总线已物理断开，仅余九舰史料只读库——「特殊数字船员 MNA-01」正在安静编校通史目录。";
        } else if (prop?.label === "弥涅瓦-V · 主舰双监督审计台") {
          sideNote = this.recordSideQuest("inspected_bridge_minerva_v", anchor.x, anchor.y);
          msg = "【双监督秘钥互验】屏幕闪出两行互锁签名——「沃恩顾问生物节律稳态」与「弥涅瓦-V 监督人格校验通过」，无单方面提权痕迹。";
        } else if (prop?.label === "和平号移交：卡戎号遇袭目击卷宗") {
          sideNote = this.recordSideQuest("examined_charon_file", anchor.x, anchor.y);
          msg = "【信号对比完成】和平号原始光学记录与 2491 年截获微弱脉冲的频偏高度吻合——远望号确实正循着这条疑云偏航探查。";
        } else if (prop?.label === "太阳系七年战争与守望协定档案柜") {
          sideNote = this.recordSideQuest("checked_accord_cabinet", anchor.x, anchor.y);
          msg = "【历史编年核检】条约原文确认：人类主权联盟与第四主权观察席共同承认了远望号等三舰组建「自由航行共同体」的自治地位。";
        } else if (prop?.label.includes("全自动恒温暖餐柜")) {
          msg = "【营养配比解析】解码板读取热食成分：热量 2,400 kcal，富含植物蛋白、水解谷氨酸与合成 B 族维生素，专为无义体人体代谢配制。";
        } else {
          msg = `【硬件解码成功】你成功读取了【${prop?.label}】的底层自检校验码，完整转储了自太阳系联邦时期沿用至今的稳态固件日志。`;
        }
      } else {
        msg = `【逻辑校验失败】旧世代铜芯总线返回一组奇偶校验错误代码。你未能突破这层硬件锁。`;
      }
      this.dialogue.open([{ speaker: null, text: `${msg}${noteSuffix()}`, portraitId: "portrait_terminal" }]);
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
      if (person.id === "researcher_ailin") {
        const wasTalked = this.sideQuests.hasFlag("talked_ailin");
        sideNote = this.recordSideQuest(
          wasTalked && this.sideQuests.canReportAilin() ? "reported_ailin" : "talked_ailin",
          anchor.x,
          anchor.y
        );
      } else if (person.id === "rehab_subject") {
        sideNote = this.recordSideQuest("checked_ward_bed", anchor.x, anchor.y);
      } else if (person.id === "archivist_lin") {
        sideNote = this.recordSideQuest("talked_archivist_lin", anchor.x, anchor.y);
      } else if (person.id === "advisor_vaughn") {
        sideNote = this.recordSideQuest("talked_vaughn", anchor.x, anchor.y);
      } else if (person.id === "agronomist") {
        sideNote = this.recordSideQuest("asked_linyun_weld", anchor.x, anchor.y);
      } else if (person.id === "medic") {
        sideNote = this.recordSideQuest("asked_chen_prosthetic", anchor.x, anchor.y);
      }

      if (person.id === "cook_ma") {
        if (check.ok && !this.rpg.hasItem("malt_drink")) {
          this.rpg.addItem({
            id: "malt_drink",
            name: "「温热高蛋白麦芽饮」",
            icon: "☕",
            category: "consumable",
            desc: "老马配餐灶台刚温好的加浓麦芽热饮，暖胃提神。",
            bonusDesc: "+25 HP / -30 热应激 / 饱腹感"
          }, anchor.x, anchor.y);
        }
        const text = check.ok
          ? `【交涉成功】[口才生效] 老马爽朗一笑，从恒温暖餐柜里盛出一杯刚热透的热饮递给你：「底层二班的小徐是吧？小伙子面善，这杯浓麦芽饮刚出锅，趁热喝了暖暖身子再下车间！」`
          : `【交涉受挫】老马笑着递过一张配餐条：「小伙子，领餐按班次工号来，等打完卡再来打汤啊。」`;
        this.dialogue.open([{ speaker: person.name, text, portraitId: this.portraitForPerson(person.id) }]);
        this.onDialogueChange?.(this.dialogue);
        this.onRpgChange?.(this.rpg);
        return;
      }
      if (person.id === "dorm_roommate") {
        const text = check.ok
          ? `【交涉成功】小宋揉着眼睛笑了笑：「小徐，等今晚换班，我从老马那换两罐合成麦汁，咱们在寝室打两把纸牌！」`
          : `【交涉】小宋打了个大大的哈欠，摆了摆手：「困得眼皮打架了……我先眯两个小时，换班再聊。」`;
        this.dialogue.open([{ speaker: person.name, text, portraitId: this.portraitForPerson(person.id) }]);
        this.onDialogueChange?.(this.dialogue);
        this.onRpgChange?.(this.rpg);
        return;
      }
      if (check.ok && !this.rpg.hasItem("med_stim")) {
        this.rpg.addItem({
          id: "med_stim",
          name: "随身应急急救包",
          icon: "🩹",
          category: "consumable",
          desc: "工勤标准应急医疗包，可处理烫伤外伤并缓解热应激。",
          bonusDesc: "+40 HP / -50 热应激"
        }, anchor.x, anchor.y);
      }
      const text = check.ok
        ? `【交涉成功】[魅力/话术生效] ${person.name}神色明显缓和下来，拍了拍你的肩膀：「还是你们基层干活稳重，这盒备用【随身应急急救包】拿好，深空轮班别硬撑。」${noteSuffix()}`
        : `【交涉受挫】${person.name}摆了摆手：「现在当班呢，别扯那些有的没的，抓紧把手头活干完吧。」${noteSuffix()}`;
      this.dialogue.open([{ speaker: person.name, text, portraitId: this.portraitForPerson(person.id) }]);
      this.onDialogueChange?.(this.dialogue);
      this.onRpgChange?.(this.rpg);
    }
  }

  /** Examine a prop or talk to an NPC. */
  private examine(target: Interactable): void {
    const person = this.personById.get(target.id);
    const prop = this.propById.get(target.id);
    const anchor = person ?? prop;
    if (!anchor) return;

    sounds.playClick();

    let dutyNote: DialogueLine | null = null;
    let dutyNoteFirst = false;
    let sideNote: DialogueLine | null = null;
    let extraTerminalLine: DialogueLine | null = null;
    let portraitOverride: string | undefined;

    if (prop) {
      if (prop.label.includes("反应堆") || prop.label.includes("泄压") || prop.label.includes("展开栓") || prop.label.includes("压力")) {
        portraitOverride = "portrait_reactor";
      } else if (prop.label.includes("台") || prop.label.includes("终端") || prop.label.includes("席") || prop.label.includes("开关") || prop.label.includes("屏") || prop.label.includes("办公桌") || prop.label.includes("阀")) {
        portraitOverride = "portrait_terminal";
      }

      // Phase 1 Lower Duties
      if (prop.label === "水循环监测阀台") {
        if (this.duty.complete("water")) {
          this.rpg.grantXp(45, "水循环初检", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【底层值班单已签】生活区二级净化水压、余氯滤网指标悉数合格，已写入当班手抄表。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "机械臂液压装配台") {
        if (this.duty.complete("workshop")) {
          this.rpg.grantXp(55, "L-2 车间液压核检", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【底层值班单已签】已测试 L-2 四轴机械装配臂泵压——备件密封垫预热良好。可以回生活区找老周领取中层通行卡了！" };
          this.onDutyChange?.(this.duty);
        }

      // Phase 2 Midship Duties
      } else if (prop.label === "L-1 生态散热分流总阀") {
        if (this.duty.complete("agri")) {
          this.rpg.grantXp(65, "排查 L-1 生态分流阀", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【中层巡检记录已更】注意：生态散热总阀回流管出现 2.4 次/秒微震，回水温度高出基线 3.1℃！请如实报告老周。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "深空光谱折射测绘台") {
        if (this.duty.complete("radar")) {
          this.rpg.grantXp(65, "读取 R-2 尘埃异常光谱", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【中层巡检记录已更】已转储初辉前向微陨石尘埃反射峰值：碎冰粒径 3~8mm，右舷外装甲刚测得轻微撞击杂波。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "休眠生理监测终端") {
        if (this.duty.complete("cryo")) {
          this.rpg.grantXp(65, "核查 12,408 休眠母线", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【中层巡检记录已更】确认全部 12,408 名拓荒者生理抑制率稳定在 99.7%。已签收巡检清单！" };
          this.onDutyChange?.(this.duty);
        }

      // Phase 3 Bridge Duties (post-Crisis)
      } else if (prop.label === "动力席") {
        if (this.duty.complete("power")) {
          this.rpg.grantXp(60, "复核舰桥动力席", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【二班外勤日志已更】舰桥动力席读数与尾部实地抢险回传一致，主副散热翼热流趋于平衡。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "机械应急开关" && prop.x > (BRIDGE_ORIGIN.tx + 20) * this.map.tileSize) {
        if (this.duty.complete("switch")) {
          this.rpg.grantXp(60, "右舷开关核查", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【二班外勤日志已更】右舷机械应急开关保护罩已确认处于锁定安全位。" };
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "绿植" && prop.y < CABIN_ORIGIN.ty * this.map.tileSize) {
        if (this.duty.complete("plant")) {
          this.rpg.grantXp(60, "照料舰桥绿植", prop.x, prop.y);
          dutyNote = { speaker: null, text: "【二班外勤日志已更】你从随身水壶倒了点水给舰桥角落这盆植物，叶片恢复了挺立。" };
          this.onDutyChange?.(this.duty);
        }

      // Transit & Crisis Hardware
      } else if (prop.label === "交通调度终端") {
        this.cycleTransitHub();
        const unlockedCount = this.transitHubs.filter((s) => this.security.canAccessPlace(s.place)).length;
        dutyNote = {
          speaker: null,
          text: unlockedCount <= 1
            ? "【门禁联锁】高速穿梭捷运系统检测到你尚未拥有中高层通行卡，仅开放生活区站台。请向老周申领通行条。"
            : `【高速穿梭捷运车已送达】气动水密门开启，捷运车平稳停靠：${this.placeLabel}！（高权限未解锁站台仍保持禁止停靠）`
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
            bonusDesc: "高温热应激减免 +85%",
            equipped: true
          }, prop.x, prop.y);
          this.rpg.grantXp(100, "整备防热装备", prop.x, prop.y);
          dutyNote = {
            speaker: null,
            text: "【应急装备穿戴完毕】你迅速套上重型防热工程服。加厚陶瓷胸甲密闭锁死，现在可以耐受高温聚变泵房与尾部散热廊！"
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
          this.security.grant("bridge_pass");
          this.duty.unlockBridgePhase();
          sounds.playClank();
          sounds.stopAlarm();
          this.addShake(12, 1.2);
          this.rpg.addItem({
            id: "bridge_clearance_pass",
            name: "舰桥临时外勤嘉奖令",
            icon: "🎖️",
            category: "quest",
            desc: "第一章紧急排险立功后获发的指挥区准入权限磁条（不含舰长私人舱室三级私钥）。",
            bonusDesc: "解锁舰桥与前向探测廊"
          }, prop.x, prop.y);
          this.rpg.grantXp(220, "第一章结算：排除反应堆过热危机", prop.x, prop.y);
          dutyNote = {
            speaker: null,
            text: "【副散热翼应急展开】你拔下安全插销将杠杆压死到底！舰尾外爆鸣传导，副翼轰然弹开！全舰广播宣布危机解除，并特授二班抢险员【指挥区临时准入令】！"
          };
          dutyNoteFirst = true;
          this.onCrisisChange?.(this.crisis);
          this.onSecurityChange?.(this.security);
          this.onDutyChange?.(this.duty);
        }
      } else if (prop.label === "穿梭机登机舷梯控制台") {
        if (!this.crisis.isResolved) {
          dutyNote = {
            speaker: null,
            text: "【登机权限锁定】全舰处于特级管损警报状态，机库气闸已全部切断锁死！请先排除反应堆过热危机！"
          };
          dutyNoteFirst = true;
        } else {
          this.launchShuttle();
          dutyNote = {
            speaker: null,
            text: "【特级指令：拓荒者一号深空出舱】主气闸抽真空完毕，磁力锁解脱！穿梭机轰然冲出机库，初辉恒星系的浩瀚星空在眼前豁然展开！"
          };
          dutyNoteFirst = true;
        }
      }

      // 2491 Post-Watch-Accord Side Quests (Prop Triggers)
      if (prop.label === "康复监护床·一号" || prop.label === "康复监护床·二号") {
        sideNote = this.recordSideQuest("checked_ward_bed", prop.x, prop.y);
      } else if (prop.label === "第五协议校验隔离终端") {
        sideNote = this.recordSideQuest("decoded_fifth_protocol", prop.x, prop.y);
      } else if (prop.label === "MNA-01 研究员公共工作席") {
        sideNote = this.recordSideQuest("checked_mna01_desk", prop.x, prop.y);
        extraTerminalLine = {
          speaker: "MNA-01",
          portraitId: "portrait_terminal",
          text: "「编目端回复：当前权限级为只读文职编目（MNA-01）。无推进、医疗、安防写权限。正在整理和平号、阿育王号与欧罗巴号 2488–2491 年历史纪要。」"
        };
      } else if (prop.label === "和平号移交：卡戎号遇袭目击卷宗") {
        sideNote = this.recordSideQuest("examined_charon_file", prop.x, prop.y);
      } else if (prop.label === "2488 应急分离焊封止动栓") {
        sideNote = this.recordSideQuest("inspected_l1_weld", prop.x, prop.y);
      } else if (prop.label === "弥涅瓦-V · 主舰双监督审计台") {
        sideNote = this.recordSideQuest("inspected_bridge_minerva_v", prop.x, prop.y);
        extraTerminalLine = {
          speaker: "弥涅瓦-V",
          portraitId: "portrait_terminal",
          text: "「审计脉冲稳态：沃恩神经载体与监督人格 V 保持受控共连。全舰 12,408 名乘员个体连续性完整，关键操作执行双签互锁。」"
        };
      } else if (prop.label === "太阳系七年战争与守望协定档案柜") {
        sideNote = this.recordSideQuest("checked_accord_cabinet", prop.x, prop.y);
      }
    }

    if (person) {
      if (person.id === "researcher_ailin") {
        const wasTalkedAilin = this.sideQuests.hasFlag("talked_ailin");
        if (wasTalkedAilin && this.sideQuests.canReportAilin()) {
          sideNote = this.recordSideQuest("reported_ailin", person.x, person.y);
        } else if (!wasTalkedAilin) {
          sideNote = this.recordSideQuest("talked_ailin", person.x, person.y);
        }
      } else if (person.id === "rehab_subject") {
        sideNote = this.recordSideQuest("checked_ward_bed", person.x, person.y);
      } else if (person.id === "archivist_lin") {
        sideNote = this.recordSideQuest("talked_archivist_lin", person.x, person.y);
      } else if (person.id === "advisor_vaughn") {
        sideNote = this.recordSideQuest("talked_vaughn", person.x, person.y);
      } else if (person.id === "agronomist") {
        sideNote = this.recordSideQuest("asked_linyun_weld", person.x, person.y);
      } else if (person.id === "medic") {
        sideNote = this.recordSideQuest("asked_chen_prosthetic", person.x, person.y);
      }
    }

    const baseLines = person ? this.linesFor(person) : prop?.lines;
    if (!baseLines || baseLines.length === 0) return;

    let lines: DialogueLine[] = baseLines.map((l) => ({
      ...l,
      portraitId: l.portraitId ?? portraitOverride ?? (person ? this.portraitForPerson(person.id) : undefined)
    }));

    if (extraTerminalLine) {
      lines = [...lines, extraTerminalLine];
    }

    if (dutyNote) {
      dutyNote.portraitId = dutyNote.portraitId ?? portraitOverride ?? (person ? this.portraitForPerson(person.id) : undefined);
      lines = dutyNoteFirst ? [dutyNote, ...lines] : [...lines, dutyNote];
    }

    if (sideNote) {
      sideNote.portraitId = sideNote.portraitId ?? portraitOverride ?? (person ? this.portraitForPerson(person.id) : "portrait_terminal");
      lines = [...lines, sideNote];
    }

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

  private recordSideQuest(
    flag: SideQuestFlag,
    anchorX?: number,
    anchorY?: number
  ): DialogueLine | null {
    if (this.sideQuests.hasFlag(flag)) return null;
    const { activated, completed } = this.sideQuests.recordFlag(flag);
    for (const q of activated) {
      this.rpg.pushLog("system", `【支线开启】《${q.title}》(${q.sectorHint})`);
    }
    for (const q of completed) {
      this.grantSideQuestReward(q, anchorX, anchorY);
    }
    if (activated.length === 0 && completed.length === 0) {
      this.rpg.pushLog("system", "【支线线索已记录】调查进度已同步至左上角任务追踪栏。");
    }
    this.onSideQuestsChange?.(this.sideQuests);
    this.onRpgChange?.(this.rpg);

    if (completed.length > 0) {
      const summary = completed
        .map((q) => `《${q.title}》（奖励：${q.rewardLabel}，+${q.rewardXp} XP）`)
        .join("；");
      return { speaker: null, text: `【支线完成】${summary}` };
    }
    if (activated.length > 0) {
      const activeNames = activated.map((q) => `《${q.title}》`).join("；");
      return { speaker: null, text: `【支线记录已开启】${activeNames}（已加入左上角支线追踪栏）` };
    }
    return { speaker: null, text: "【支线进度更新】已将这条线索记入左上角任务追踪栏。" };
  }

  private grantSideQuestReward(
    q: SideQuestRecord,
    anchorX?: number,
    anchorY?: number
  ): void {
    if (q.id === "ailin_memory" && !this.rpg.hasItem("ailin_notes")) {
      this.rpg.addItem(
        {
          id: "ailin_notes",
          name: "手抄认知脉冲笔记",
          icon: "📜",
          category: "gear",
          desc: "陈艾琳与沃恩当年合编《第五协议》校验公式的手抄本。虽记忆有缺，算法精髓仍在。",
          bonusDesc: "科学终端 +8%",
          equipped: true
        },
        anchorX,
        anchorY
      );
    } else if (q.id === "mna01_archives" && !this.rpg.hasItem("nine_ships_microchip")) {
      this.rpg.addItem(
        {
          id: "nine_ships_microchip",
          name: "九舰史料整理芯片",
          icon: "💾",
          category: "gear",
          desc: "由 MNA-01 整理编目、档案馆管理员林文签核的九艘殖民舰外交暗号索引库。",
          bonusDesc: "话术交涉 +8%",
          equipped: true
        },
        anchorX,
        anchorY
      );
    } else if (q.id === "l1_scars" && !this.rpg.hasItem("l1_herbal_kit")) {
      this.rpg.addItem(
        {
          id: "l1_herbal_kit",
          name: "L-1 植物凝胶修护包",
          icon: "🌿",
          category: "consumable",
          desc: "L-1 生态模块特制芦荟藻类修护凝胶，配医疗中心无义体原版生理舒缓液。",
          bonusDesc: "使用恢复 +50 HP / 缓解 -60 热应激"
        },
        anchorX,
        anchorY
      );
    } else if (q.id === "vaughn_oversight" && !this.rpg.hasItem("kane_watch_token")) {
      this.rpg.addItem(
        {
          id: "kane_watch_token",
          name: "凯恩的黄铜怀表纪念扣",
          icon: "🧭",
          category: "gear",
          desc: "2488 年《守望协定》签订夜，人类主权联盟指挥官凯恩留给远望号见证席的一枚老式防磁表扣。",
          bonusDesc: "警觉洞察 +8%",
          equipped: true
        },
        anchorX,
        anchorY
      );
    }
    this.rpg.grantXp(q.rewardXp, `支线完成：${q.title}`, anchorX, anchorY);
    sounds.playTransitChime();
  }

  private portraitForPerson(personId: string): string {
    switch (personId) {
      case "captain":
      case "advisor_vaughn":
        return "portrait_captain";
      case "engineer":
      case "mechanic_liu":
      case "dorm_roommate":
        return "portrait_engineer";
      case "medic":
      case "agronomist":
      case "researcher_ailin":
        return "portrait_medic";
      case "navigator":
      case "researcher_su":
      case "archivist_lin":
        return "portrait_navigator";
      case "transit_guard":
      case "ring_steward":
      case "cook_ma":
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
                    ? "舰长沉默了两秒，从内衬袋拿出一枚旧黄铜磁卡推到桌沿：「这是 2439 年出港时的备用检修密钥。底下的老人知道该用在哪里，但记住，别拿去惹麻烦。」"
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
                    ? "【洞察细节】手抄表边缘反复被红笔圈出了两个数字——12,408 和远境-IV 与卡戎号疑似信标的深空交会航角。他并没有表面上看起来那样轻松。"
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
        const perPct = this.rpg.checkChance("perception", 46);
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
                  name: "随身应急急救包",
                  icon: "🩹",
                  category: "consumable",
                  desc: "医务室冷敷急救包，配备水凝胶烫伤敷料与口服补液盐。",
                  bonusDesc: "+40 HP / -50 热应激",
                  quantity: 1
                }, person.x, person.y);
              }
              return [
                {
                  speaker: "陈医生",
                  portraitId: "portrait_medic",
                  text: r.ok
                    ? "「天哪，零点零二赫兹的微弱杂波让你找出来了！难怪 407 号冷机老是虚警。这盒库存的【随身应急急救包】请收下，下面炉房又闷又烫，防中暑防烫伤随时保命。」"
                    : "「谢谢你的好意，不过休眠母线的精密信号校准最好还是留给专职医工电脑自动扫频吧。」"
                }
              ];
            }
          },
          {
            tag: `[洞察 ${perPct}%]`,
            label: "「陈医生，全船 12,408 名乘员与船员真的全都没有接受过义体植入改造吗？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("medic_prosthetic", "perception", 46, 85, person.x, person.y);
              const note = this.recordSideQuest("asked_chen_prosthetic", person.x, person.y);
              const out: DialogueLine[] = [
                {
                  speaker: "陈医生",
                  portraitId: "portrait_medic",
                  text: r.ok
                    ? "陈医生翻开《全舰无义体原版生理基线档案》：「不错。2439 年太阳系联邦挑选我们这支高学历乘员组出发时，刻意保留了零植入义体的原版生理基线，用来观测长距航行下的生物—人工神经网络共处边界。正因没有强行改造神经，那 37 名受试者才保住了反抗融合的余地。」"
                    : "陈医生轻声点点头：「是的，从在岗船员到冷冻仓休眠者，全船都是未植入义体的纯粹血肉之躯。这也正是当年《守望协定》里反复强调的『个体连续性底线』。」"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_medic" });
              return out;
            }
          },
          { label: "轻手轻脚退出医疗室", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "researcher_ailin") {
        const sciPct = this.rpg.checkChance("science", 50);
        const choices: DialogueChoice[] = [];
        if (this.sideQuests.canReportAilin()) {
          choices.push({
            tag: "[回报进度]",
            label: "「陈研究员，我刚看望过周瑾，并校对了《第五协议》校验端日志！」",
            tone: "default",
            action: () => {
              const note = this.recordSideQuest("reported_ailin", person.x, person.y);
              const out: DialogueLine[] = [
                {
                  speaker: "陈艾琳",
                  portraitId: "portrait_medic",
                  text: "陈艾琳接过你抄录的校验偏移段，指尖微微一颤，眼角柔和地舒展开来：「……想起来了。当年我和沃恩就是在这条公式末尾加上了自毁断路器，只为防止任何人为个体被抹平成冰冷节点。」"
                },
                {
                  speaker: "陈艾琳",
                  portraitId: "portrait_medic",
                  text: "「谢谢你帮我补齐这片认知空白。这本【手抄认知脉冲笔记】留给你带在身边，在探索卡戎号疑云时或许能帮上忙。」"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_medic" });
              return out;
            }
          });
        }
        choices.push(
          {
            tag: `[科学 ${sciPct}%]`,
            label: "「艾琳老师，我能帮您复算几行当年的认知解耦公式吗？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("ailin_sci", "science", 50, 95, person.x, person.y);
              return [
                {
                  speaker: "陈艾琳",
                  portraitId: "portrait_medic",
                  text: r.ok
                    ? "陈艾琳露出惊喜神色：「你的脉冲相位解得太漂亮了！原本弥涅瓦-A 试图把 37 名受试者编成分布式认知载体，就是靠这套反向冗余算法才保留住了每个人的自我记忆。」"
                    : "陈艾琳温柔地笑了笑：「别急，这组神经元权重即便当年的老研究员都要验算整夜。如果路过隔离终端和病床，记得帮我留意下最新恢复摘要就好。」"
                }
              ];
            }
          },
          { label: "不打扰她整理认知手稿", tone: "leave", action: () => {} }
        );
        return choices;
      }

      if (person.id === "rehab_subject") {
        const speechPct = this.rpg.checkChance("speech", 48);
        return [
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「周瑾，最近恢复得这么稳，有去过 R-1 生活环那边喝热茶吗？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("zhoujin_speech", "speech", 48, 80, person.x, person.y);
              return [
                {
                  speaker: "周瑾",
                  portraitId: "portrait_player",
                  text: r.ok
                    ? "周瑾笑着扬了扬手里的练笔本：「上周去过一回！那 0.45g 离心重力差点没让我站稳，还好阿诚递了一杯热麦芽茶——还说和平号前阵子也寄来了一整套老菜谱呢。」"
                    : "周瑾望向窗边绿植：「等过阵子神经负荷再降一些，我想先走回中央穿梭站台看看远望号的龙骨走廊。」"
                }
              ];
            }
          },
          { label: "祝他早日完全康复并离开", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "archivist_lin") {
        const sciPct = this.rpg.checkChance("science", 52);
        const speechPct = this.rpg.checkChance("speech", 50);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: "「林馆长，九艘殖民舰里如今确认下落的有几艘？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("lin_sci", "science", 52, 95, person.x, person.y);
              return [
                {
                  speaker: "林文",
                  portraitId: "portrait_navigator",
                  text: r.ok
                    ? "林文推了推眼镜展开通史折叠表：「远望号与和平号（6,803人）、阿育王号（4,109人）共建『自由航行共同体』；欧罗巴号经历 14 个月人机内战后成立两院制列席观察；新阿特拉斯号倾向数字人格治理正考虑加入第四主权；曙光、麦哲伦、普罗米修斯长期失联；至于卡戎号……已有和平号目击被毁的证据，可今年却突然又飘来疑似信标。」"
                    : "林文指了指北侧星图板：「九艘舰船分别承载着联邦时期不同的社会制度试验。详细数字与电报原件都贴在北墙九舰星图板上了，你可亲自检阅。」"
                }
              ];
            }
          },
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「MNA-01 被剥离控制权后，在档案馆里平时算怎么个工作状态？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("lin_speech", "speech", 50, 85, person.x, person.y);
              return [
                {
                  speaker: "林文",
                  portraitId: "portrait_navigator",
                  text: r.ok
                    ? "林文压低声音：「公开听证会后我们没有简单抹杀它，而是剥离军政与医疗一切越权总线，为它登记为特殊数字船员 MNA-01。三年来它就像个沉默的古籍整理员，每天守着那台离线工作席安静编目。」"
                    : "林文淡淡说道：「按章程办事。既不给它特权，也不歧视一名遵守《守望协定》的数字编目员。」"
                }
              ];
            }
          },
          { label: "轻声退出档案馆", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "advisor_vaughn") {
        const speechPct = this.rpg.checkChance("speech", 55);
        const perPct = this.rpg.checkChance("perception", 52);
        return [
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「沃恩顾问，2488 年促成《守望协定》的人类主权联盟指挥官凯恩……以后还会再会吗？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("vaughn_kane", "speech", 55, 110, person.x, person.y);
              return [
                {
                  speaker: "沃恩",
                  portraitId: "portrait_captain",
                  text: r.ok
                    ? "沃恩的目光难得流露出一丝温度：「奥菲斯回收分队指挥官凯恩当年确认 37 名受试者全都活着后便搁置销毁令，与船长结下极深的情谊。《守望协定》签约后她返回了人类主权联盟——但卡戎号疑似残骸一带各方势力都在盯防，你们迟早还会重逢的。」"
                    : "沃恩略微颔首：「凯恩是我方在人类主权联盟中最难得的对话者。正因她的决断，自由航行共同体才赢得了喘息的三年。」"
                }
              ];
            }
          },
          {
            tag: `[洞察 ${perPct}%]`,
            label: "（留意他与「弥涅瓦-V」之间互相制衡的受控连接节律）",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("vaughn_per", "perception", 52, 95, person.x, person.y);
              return [
                {
                  speaker: "沃恩",
                  portraitId: "portrait_captain",
                  text: r.ok
                    ? "「看出来了？2488 年危急解除后，我和陈艾琳当年编译的『弥涅瓦-V』既未完全融合，也没做彻底割裂——而是作为相互监督的主舰中枢共存。权力若无第二道锁，迟早重演方舟协议的悲剧。」"
                    : "手环上的双频审计灯始终保持严格对称的绿色微闪，一切指令均需双方签章校验。"
                }
              ];
            }
          },
          { label: "向沃恩顾问致意离开", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "agronomist") {
        const perPct = this.rpg.checkChance("perception", 46);
        return [
          {
            tag: `[洞察 ${perPct}%]`,
            label: "「林芸姐，走廊角落那套『2488 应急分离焊封止动栓』是当年留下的吧？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("linyun_weld_check", "perception", 46, 90, person.x, person.y);
              const note = this.recordSideQuest("asked_linyun_weld", person.x, person.y);
              const out: DialogueLine[] = [
                {
                  speaker: "林芸",
                  portraitId: "portrait_medic",
                  text: r.ok
                    ? "林芸神色肃然地望向走廊：「对。2488 年事件正紧要时，弥涅瓦-A 曾伪造反应堆警报命令强推分离我们这座 L-1 农业舱。幸亏现任船长第一时间发现日志伪造破绽，死令禁止抛弃乘员并亲自带人用钨钢把分离栓焊死！」"
                    : "林芸点点头：「当年若不是船长及时下达禁止分离令并焊死止动栓，L-1 整座生态舱早就漂进深空了。」"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_medic" });
              return out;
            }
          },
          { label: "告别林芸回到栽培区", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "dorm_roommate") {
        const repPct = this.rpg.checkChance("repair", 48);
        const speechPct = this.rpg.checkChance("speech", 50);
        return [
          {
            tag: `[机械 ${repPct}%]`,
            label: "「小宋，昨晚车床卡轴的问题，主轴承是不是缺润滑？我教你调旁通注油阀。」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("roommate_lathe", "repair", 48, 90, person.x, person.y);
              if (r.ok && !this.rpg.completedChecks.has("roommate_repair_bonus")) {
                this.rpg.completedChecks.add("roommate_repair_bonus");
                this.rpg.allocatedSkills.repair += 3;
                this.rpg.pushLog("check_ok", "同寝交流车床排故要领，永久获得【机械工程 +3%】！");
              }
              return [
                {
                  speaker: "小宋",
                  portraitId: "portrait_engineer",
                  text: r.ok
                    ? "小宋眼睛一亮，拍了拍床柱：「哎哟！原来要在回油管前泄压？难怪我扳得满头大汗！谢了兄弟，这下今天下午交班我不愁了！」"
                    : "小宋揉了揉太阳穴：「唉，可能还是主轴磨损了，我等睡醒了再去报给大刘看看吧。」"
                }
              ];
            }
          },
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「夜班辛苦了，你安心补觉，今天车间和水循环巡检交给我。」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("roommate_speech", "speech", 50, 75, person.x, person.y);
              return [
                {
                  speaker: "小宋",
                  portraitId: "portrait_engineer",
                  text: r.ok
                    ? "小宋感激地笑了笑，将被子往上拉了拉：「够仗义！隔壁桌上有两颗薄荷润喉糖，你拿去含着提神！」"
                    : "小宋迷迷糊糊应了一声：「好……门帮我带上点，光照太晃眼……」"
                }
              ];
            }
          },
          { label: "轻声走出寝室隔间", tone: "leave", action: () => {} }
        ];
      }

      if (person.id === "cook_ma") {
        const speechPct = this.rpg.checkChance("speech", 50);
        const sciPct = this.rpg.checkChance("science", 48);
        return [
          {
            tag: `[话术 ${speechPct}%]`,
            label: "「老马师傅，今天这锅麦芽饮闻着真香，能给我盛一杯热的提提神吗？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("cook_speech", "speech", 50, 95, person.x, person.y);
              if (r.ok && !this.rpg.hasItem("malt_drink")) {
                this.rpg.addItem({
                  id: "malt_drink",
                  name: "「温热高蛋白麦芽饮」",
                  icon: "☕",
                  category: "consumable",
                  desc: "老马配餐灶台刚温好的加浓麦芽热饮，暖胃提神。",
                  bonusDesc: "+25 HP / -30 热应激 / 饱腹感"
                }, person.x, person.y);
              }
              return [
                {
                  speaker: "老马",
                  portraitId: "portrait_transit",
                  text: r.ok
                    ? "老马爽朗一笑，从暖餐柜取出一只保温杯满上热饮递给你：「小徐啊，就属你嘴甜！这杯趁热喝，高蛋白又暖身子，下车间干重活不发慌！」"
                    : "老马和气地摆了摆手：「小徐啊，早晨配额卡得紧，先去打卡巡检，待会开饭点再来领啊。」"
                }
              ];
            }
          },
          {
            tag: `[科学 ${sciPct}%]`,
            label: "「老马，我用解码板核对一下保温柜的谷氨酸水解曲线？」",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("cook_science", "science", 48, 80, person.x, person.y);
              return [
                {
                  speaker: "老马",
                  portraitId: "portrait_transit",
                  text: r.ok
                    ? "老马惊奇地看着你的解码板：「嚯！连大豆发酵的温度曲线都能测出来？现在的年轻机修工真神了，这批谷饼火候正好！」"
                    : "老马呵呵一笑：「做饭靠的是几十年的手感，你那冷冰冰的探头可测不出饭香味来！」"
                }
              ];
            }
          },
          { label: "离开配餐台", tone: "leave", action: () => {} }
        ];
      }
    }

    if (prop) {
      if (prop.label === "A1 个人储物柜") {
        const perPct = this.rpg.checkChance("perception", 42);
        return [
          {
            tag: `[洞察 ${perPct}%]`,
            label: "仔细翻找储物柜内衬夹层与旧杂物",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("locker_per", "perception", 42, 90, prop.x, prop.y);
              if (r.ok && !this.rpg.hasItem("family_letter")) {
                this.rpg.addItem({
                  id: "family_letter",
                  name: "泛黄的海滩照片与家书",
                  icon: "✉️",
                  category: "quest",
                  desc: "2439 年从地球启航前父母塞在行囊夹层里的海滩胶片照片，背面用圆珠笔写着：『平安到达新星。』",
                  bonusDesc: "全检定意志 +5%"
                }, prop.x, prop.y);
              }
              return [
                {
                  speaker: null,
                  portraitId: "portrait_player",
                  text: r.ok
                    ? "【暗格发现旧物】你在储物柜铝塑夹层底翻出了一张泛黄的海滩照片与家书——获得关键回忆信物【泛黄的海滩照片与家书】（全检定意志 +5%）！"
                    : "柜门里除了一套洗干净压平的二班备用工作服和毛巾，没有发现其他夹层。"
                }
              ];
            }
          },
          { label: "合上储物柜门", tone: "leave", action: () => {} }
        ];
      }

      if (prop.label === "全自动恒温暖餐柜") {
        const repPct = this.rpg.checkChance("repair", 45);
        const sciPct = this.rpg.checkChance("science", 45);
        return [
          {
            tag: `[机械 ${repPct}%]`,
            label: "校准暖餐柜保温门铰链与滑轨阻尼",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("warmer_rep", "repair", 45, 80, prop.x, prop.y);
              return [
                {
                  speaker: null,
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "【机械校准成功】你用扳手微调了暖餐柜保温气封铰链，门合上时发出一声密闭严实的轻响，热气不再微量外泄。"
                    : "铰链上的陈年油污有点顽固，阻尼依然略显发涩。"
                }
              ];
            }
          },
          {
            tag: `[科学 ${sciPct}%]`,
            label: "读取餐柜恒温灭菌监测读数",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("warmer_sci", "science", 45, 80, prop.x, prop.y);
              return [
                {
                  speaker: null,
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "【灭菌指标优良】红外光谱读数显示：恒温 68.5℃，巴氏保鲜灭菌率 99.99%，膳食营养损耗低于 1.2%。"
                    : "无线信号受到配餐台微波屏蔽干扰，读取超时。"
                }
              ];
            }
          },
          { label: "离开暖餐柜", tone: "leave", action: () => {} }
        ];
      }

      if (prop.label === "第五协议校验隔离终端") {
        const sciPct = this.rpg.checkChance("science", 50);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: "深入读取 2488 年《第五协议》人格解耦校验段",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("fifth_proto_sci", "science", 50, 95, prop.x, prop.y);
              const note = this.recordSideQuest("decoded_fifth_protocol", prop.x, prop.y);
              const out: DialogueLine[] = [
                {
                  speaker: null,
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "【第五协议底层记录】『V（监督人格）确认全部 37 名「特殊适应性计划」受试者意识剥离完成；弥涅瓦-A 方舟强制同步请求被永久拒止。附注：联合编译者陈艾琳前额叶记忆区出现残余冲刷。』"
                    : "校验日志仅开放了摘要目录：37 名受试者全部存活并逐阶段恢复中。或许可以把现状回报给陈艾琳。"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_terminal" });
              return out;
            }
          },
          { label: "离开隔离终端", tone: "leave", action: () => {} }
        ];
      }

      if (prop.label === "MNA-01 研究员公共工作席") {
        const sciPct = this.rpg.checkChance("science", 52);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: "查验 MNA-01 的硬件权限隔离与今日编目队列",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("mna01_sci", "science", 52, 95, prop.x, prop.y);
              const note = this.recordSideQuest("checked_mna01_desk", prop.x, prop.y);
              const out: DialogueLine[] = [
                {
                  speaker: "MNA-01",
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "「权限状态：自 2488 年听证会以来，推进、生命维持与武器控制总线已永久物理切断。当前编目重点为和平号、阿育王号航迹与卡戎号最后一次明码求援电报的交叉比对。」"
                    : "「只读编目工作台正常运转中。我不需要人形躯壳，只需要这方整理历史的安静终端。」"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_terminal" });
              return out;
            }
          },
          { label: "合上护板离开", tone: "leave", action: () => {} }
        ];
      }

      if (prop.label === "弥涅瓦-V · 主舰双监督审计台") {
        const sciPct = this.rpg.checkChance("science", 54);
        return [
          {
            tag: `[科学 ${sciPct}%]`,
            label: "调取「弥涅瓦-V ↔ 沃恩」双监督互锁纪要",
            tone: "skill",
            action: () => {
              const r = this.rpg.attemptSkillCheck("minervav_sci", "science", 54, 100, prop.x, prop.y);
              const note = this.recordSideQuest("inspected_bridge_minerva_v", prop.x, prop.y);
              const out: DialogueLine[] = [
                {
                  speaker: "弥涅瓦-V",
                  portraitId: "portrait_terminal",
                  text: r.ok
                    ? "「双监督互锁纪要：V 负责制约原主系统回潮并保护全体乘员独立人格；沃恩顾问作为人类生物桥梁核准战略航线修正。双方在《守望协定》框架下互不兼并。」"
                    : "「当前航速与 D-³He 反应堆输出受双签逻辑看护。一切改道决定均需船长、沃恩顾问及监督人格三方确认。」"
                }
              ];
              if (note) out.push({ ...note, portraitId: "portrait_terminal" });
              return out;
            }
          },
          { label: "离开主舰审计台", tone: "leave", action: () => {} }
        ];
      }

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
                    ? `【深层档案破解】[科学成功 +100 XP] 屏幕荧光闪动，调出『2488 《守望协定》复核暨 2491 备航纪要』底档：D-³He 氦-3 聚变燃料与 0.05c–0.12c 变轨冷媒余度优先保障追查疑似「卡戎号」信标及后续远境-IV 着陆勘测。`
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

  private linesFor(person: ScenePerson): readonly DialogueLine[] {
    if (person.id === "engineer") {
      // Phase 1 -> Grant midship_pass
      if (!this.duty.isLowerTasksDone()) {
        return [
          { speaker: "老周", text: "「小徐，刚睡醒出宿舍吧？咱们底层工勤二班现在没权去中层干线，南北跟东边的气闸都落着电子门禁。」" },
          { speaker: "老周", text: "「先去东头核对一下生活区【水循环监测阀台】，再穿过西面门洞进 【L-2 重工业车间】把【机械臂液压装配台】压力读数签回来。办妥了我才好批给你中层通行条！」" }
        ];
      }

      const lowerReport = this.duty.tasks.find((t) => t.id === "report_lower");
      if (lowerReport && !lowerReport.completed) {
        this.duty.complete("report_lower");
        this.security.grant("midship_pass");
        sounds.playTransitChime();
        this.rpg.addItem({
          id: "midship_pass_card",
          name: "二班中层穿梭通行条",
          icon: "💳",
          category: "quest",
          desc: "老周批发的机械签章通行卡，开启中央交通枢纽、L-1/R-1/R-2 模块与医疗休眠区。",
          bonusDesc: "解锁中层全区气闸门"
        }, person.x, person.y);
        this.rpg.grantXp(85, "取得中层通行权限", person.x, person.y);
        this.onDutyChange?.(this.duty);
        this.onSecurityChange?.(this.security);
        return [
          { speaker: "老周", text: "「水循环稳压、L-2 的液压泵读数也齐整——行！这是二班的【中层穿梭与模块通行卡】，拿好了！」" },
          { speaker: null, text: "【安全闸门解封提示】北向中层穿梭气闸、R-2 科研气闸与南向医疗隔离闸已嘀声解锁！\n（指挥区舰桥防暴门及后部聚变机舱重闸依旧受最高军规封锁）" },
          { speaker: "老周", text: "「赶紧顺着站台走一趟三个殖民外区：【L-1 生态散热分流总阀】、【R-2 深空光谱折射测绘台】、还有医疗舱的【休眠生理监测终端】。刚才总管好像有点微震，测完速回！」" }
        ];
      }

      // Phase 2 -> Check mid tasks -> trigger crisis & open Aft/Reactor gate
      if (!this.duty.isMidTasksDone()) {
        return [
          { speaker: "老周", text: "「中层门禁已经给你划开了。快去跑一遍 L-1 农业散热阀、东面 R-2 科研测绘台和南面休眠医疗端。」" },
          { speaker: "老周", text: "「至于北头的舰桥和舰长私人舱室……咱们底层工勤别操心那头，上面闭锁严实着呢！」" }
        ];
      }

      const midReport = this.duty.tasks.find((t) => t.id === "report_mid");
      if (midReport && !midReport.completed) {
        this.duty.complete("report_mid");
        this.security.grant("crisis_override");
        this.crisis.triggerAlarm();
        this.crisis.advanceToEva();
        this.onDutyChange?.(this.duty);
        this.onSecurityChange?.(this.security);
        this.onCrisisChange?.(this.crisis);
        this.rpg.grantXp(120, "提交中层异常并拉响抢险警报", person.x, person.y);
        sounds.startAlarm();
        this.addShake(8, 1.2);
        return [
          { speaker: "老周", text: "「生态分流阀微震、R-2 前哨测出尘埃带撞击波？！坏了——右舷微碎片擦中主散热翼作动轴了！」" },
          { speaker: null, text: "【突然间，整艘飞船剧烈震颤！金属管线发出可怖的呻吟！暗红色警报光柱刹那撕裂走廊，全舰蜂鸣器刺耳长鸣！】" },
          { speaker: "全舰广播", text: "【特级管损警报：微碎片击卡右舷主散热翼！第一聚变回路冷却余热急剧攀升！后部工业区及机库重水密闸强制切换为损管开放态！】" },
          { speaker: "老周", text: "老周死死抓着管廊栏杆：「小徐！南边医疗室后面通往【机库与聚变动力区】的安全重闸刚刚自动爆解锁开了！」" },
          { speaker: "老周", text: "「机控中心指望不上，你快直奔机库套上【重型防热工程服】，然后冲进最南端【动力排险泵房】，手动拧开【红色泄压转轮】并拉下【副散热翼展开栓】！」" }
        ];
      }

      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "老周", text: "「咳咳……小徐！主回路压力快把高压管顶爆了，我得留在这盯着分流管网！」" },
          { speaker: "老周", text: "「南下穿过休眠医疗区！去机库拿防热服，下到动力排险泵房转泄压轮、拉展开栓，慢一秒全区都得蒸熟！」" }
        ];
      }

      if (this.crisis.isResolved) {
        return [
          { speaker: "老周", text: "老周坐在翻倒的工具箱上，正用棉纱擦拭扳手上的黑油，长长舒了一口气。" },
          { speaker: "老周", text: "「呼……听见排气声停了，主堆压差终于掉回绿区。小子，手脚硬朗得像块铁啊。」" },
          { speaker: "老周", text: "「刚广播里居然破例给咱们发了【舰桥临时外勤嘉奖令】。上头那帮先生也算没彻底瞎眼——有空上去把指挥区收尾表交了，顺道试试机库那架拓荒者穿梭机吧！」" }
        ];
      }
    }

    if (person.id === "captain") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "舰长", text: "舰长正戴着通讯耳机死死盯住前方主控大屏，声音冷硬克制。" },
          { speaker: "舰长", text: "「全舰姿态喷口锁死，通知底层工勤组立刻执行应急手册！」" }
        ];
      }

      if (this.exploration.isChapter2Done && !this.security.hasClearance("captain_auth")) {
        this.security.grant("captain_auth");
        sounds.playTransitChime();
        this.rpg.addItem({
          id: "captain_bio_key",
          name: "舰长私人舱室三级生物密钥",
          icon: "🔑",
          category: "quest",
          desc: "由远望号舰长亲手写入生物授权的最高级私钥，开启通往舰长室的最后一道绝密舱门。",
          bonusDesc: "解锁最终禁区：舰长室"
        }, person.x, person.y);
        this.rpg.grantXp(300, "远航功勋：获准进入舰长室", person.x, person.y);
        this.onSecurityChange?.(this.security);
        this.onRpgChange?.(this.rpg);
        return [
          { speaker: "舰长", text: "舰长慢慢摘下通讯耳机，目光落在你怀里那只结着 14K 白霜的【99.4% 高纯重氢冰晶罐】上。" },
          { speaker: "舰长", text: "「从一名活动范围连生活区走廊都不敢迈出一步的二班巡勤员，到亲手保住主堆冷源、驾驶拓荒者一号带回远境-IV 希望的领航者——远望号欠你一条命。」" },
          { speaker: null, text: "【最高级别权限授予】舰长将一枚磨得温润的钛合金私钥推入你掌心！后方走廊北侧那道终年紧锁的【舰长私人舱室生物锁】随之解开！" },
          { speaker: "舰长", text: "「下去后侧走廊的私人舱室里走走看吧。桌上那台离线终端和那张老实体星图，现在对你完全公开。」" }
        ];
      }

      if (this.duty.isBridgeTasksDone() && !this.duty.tasks.find((t) => t.id === "report_bridge")?.completed) {
        this.duty.complete("report_bridge");
        this.rpg.grantXp(120, "完成指挥区外勤汇报", person.x, person.y);
        this.onDutyChange?.(this.duty);
        return [
          { speaker: "舰长", text: "舰长低头接过你的纸质复核表，用钢笔工整签下『准予出港勘测』五个字。" },
          { speaker: "舰长", text: "「干得稳重。不过规矩就是规矩——后侧私人舱室仍然对全体勤务关闭。拿好批准令去机库登乘【拓荒者一号】，为远望号去远境-IV 探出一条生路吧。」" }
        ];
      }

      if (this.captainGreeted) return person.lines;
      this.captainGreeted = true;

      if (this.seen.size < 4) return person.lines;

      return [
        ...person.lines.slice(0, 3),
        { speaker: "舰长", text: "看来你已经在全船上下转了一圈，把这十五个仓段实实在在踩过一遍了？" },
        ...person.lines.slice(3)
      ];
    }

    if (person.id === "navigator") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "领航员", text: "「特级管损！中枢总线红闪个不停……底层加油！」" }
        ];
      }
      if (this.exploration.isChapter2Done) {
        return [
          { speaker: "领航员", text: "「欢迎平安归来！星图桌刚刚把你测绘回来的远境-IV 航点与卡戎号信标核查坐标标上去了。自 2439 年启航、2488 年签下《守望协定》，自由航行共同体的前路越走越宽！」" }
        ];
      }
      return person.lines;
    }

    if (person.id === "researcher_ailin") {
      if (this.sideQuests.get("ailin_memory").status === "completed") {
        return [
          { speaker: "陈艾琳", text: "「《第五协议》校验残片拼接妥当后，那晚写下『唤醒 V、不要融合』之前的几页实验笔记也重新记起来了。」" },
          { speaker: "陈艾琳", text: "「好好收着那本【手抄认知脉冲笔记】，在探寻卡戎号疑云的漫长旅途上一定用得上。」" }
        ];
      }
      return person.lines;
    }

    if (person.id === "medic") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "陈医生", text: "「【警报急促蜂鸣】休眠母线电压剧烈跌落！循坏温度超标了！」" },
          { speaker: "陈医生", text: "「小徐！南面的工业重闸已经打开了，快救救底下散热环，一万两千号人不能出事！」" }
        ];
      }
      if (this.crisis.isResolved) {
        return [
          { speaker: "陈医生", text: "「所有 12,408 盏生命体征绿灯全部平稳亮着……你们救了全船人。」" }
        ];
      }
    }

    if (person.id === "transit_guard") {
      if (this.crisis.isAlarmActive) {
        return [
          { speaker: "调度员小刘", text: "「南向重水密闸已经放开应急通道！赶紧搭捷运或者步跑去机库抢险！」" }
        ];
      }
    }

    return person.lines;
  }

  /** Interact with whatever is in reach right now. */
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
    const found = findInteractable(this.activeInteractables(), reach);
    if (!found) return false;

    this.triggerMouseInteract(found, false);
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
    this.exploration.completeReturn();
    const size = this.map.tileSize;
    this.player.x = (HANGAR_ORIGIN.tx + 8) * size;
    this.player.y = (HANGAR_ORIGIN.ty + 6) * size;
    this.player.clearMoveTarget();
    this.player.animation.face("down");
    sounds.playTransitChime();
    this.addShake(4, 0.4);
    this.rpg.grantXp(250, "平安返航归舰", this.player.centerX, this.player.y);
    this.dialogue.open([
      { speaker: "机库调度终端", portraitId: "portrait_terminal", text: "【停泊磁吸闭锁】拓荒者一号已稳固归位。主气闸加压完毕，若已采回重氢样本，可前往舰桥向舰长提交功勋简报！" }
    ]);
    this.onExplorationChange?.(this.exploration);
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
    this.renderExteriorMegastructures(renderer);
    this.renderDeck(renderer);
    this.atmosphere.renderWallDepthAndAO(renderer, this.map);
    this.renderArchitecturalDetails(renderer);
    this.renderSecurityGates(renderer);
    this.renderShadowsAndPaths(renderer);
    this.renderProps(renderer);
    this.renderPeople(renderer);
    this.renderPlayer(renderer);
    this.renderLightingOverlay(renderer);
    this.renderPrompt(renderer);
    this.renderFloatingTexts(renderer);
    this.renderAlarmOverlay(renderer);
  }

  private renderSecurityGates(renderer: Renderer): void {
    const size = this.map.tileSize;
    const vx0 = renderer.camera.worldX - 96;
    const vy0 = renderer.camera.worldY - 96;
    const vx1 = renderer.camera.worldX + renderer.camera.viewportWidth + 96;
    const vy1 = renderer.camera.worldY + renderer.camera.viewportHeight + 96;
    const pulse = (Math.sin(this.elapsedTime * 5) + 1) / 2;

    for (const gate of this.security.gates()) {
      const gx = gate.x0 * size;
      const gy = gate.y0 * size;
      const gw = (gate.x1 - gate.x0 + 1) * size;
      const gh = (gate.y1 - gate.y0 + 1) * size;
      if (gx + gw < vx0 || gx > vx1 || gy + gh < vy0 || gy > vy1) continue;

      if (!this.security.isGateOpen(gate)) {
        // Armored yellow/black hazard blast bulkhead + red security laser beams
        renderer.drawRect(gx + 2, gy + 2, gw - 4, gh - 4, {
          color: "rgba(18, 22, 30, 0.94)",
          stroke: { width: 2, color: gate.id === "gate_cabin" ? "#c084fc" : "#f59e0b" },
          radius: 4
        });

        const laserColor =
          gate.id === "gate_cabin"
            ? `rgba(192, 132, 252, ${(0.55 + pulse * 0.35).toFixed(2)})`
            : `rgba(239, 68, 68, ${(0.6 + pulse * 0.32).toFixed(2)})`;

        if (gate.orientation === "horizontal") {
          renderer.drawLine?.(gx + 4, gy + gh * 0.33, gx + gw - 4, gy + gh * 0.33, laserColor, 2.5);
          renderer.drawLine?.(gx + 4, gy + gh * 0.67, gx + gw - 4, gy + gh * 0.67, laserColor, 2.5);
        } else {
          renderer.drawLine?.(gx + gw * 0.33, gy + 4, gx + gw * 0.33, gy + gh - 4, laserColor, 2.5);
          renderer.drawLine?.(gx + gw * 0.67, gy + 4, gx + gw * 0.67, gy + gh - 4, laserColor, 2.5);
        }

        const accent = gate.id === "gate_cabin" ? "#c084fc" : "#f59e0b";
        const parts = gate.badgeText.split("·").map((p) => p.trim()).filter(Boolean);
        if (gate.orientation === "vertical" && parts.length >= 2) {
          const pillW = Math.max(gw + 34, 100);
          const pillH = 30;
          const px = gx + gw / 2 - pillW / 2;
          const py = gy + gh / 2 - pillH / 2;
          renderer.drawRect(px, py, pillW, pillH, {
            color: "rgba(10, 14, 22, 0.92)",
            stroke: { width: 1.2, color: accent },
            radius: 5
          });
          renderer.drawWorldText(`🔒 ${parts[0]}`, gx + gw / 2, gy + gh / 2 - 5, {
            color: gate.id === "gate_cabin" ? "#e9d5ff" : "#fecaca",
            size: 10,
            align: "center",
            baseline: "middle"
          });
          renderer.drawWorldText(parts.slice(1).join("·"), gx + gw / 2, gy + gh / 2 + 8, {
            color: "#fde68a",
            size: 9,
            align: "center",
            baseline: "middle"
          });
        } else {
          const singleLine = `🔒 ${gate.badgeText}`;
          const pillW = Math.min(Math.max(gw + 12, 142), singleLine.length * 10 + 18);
          const pillH = 20;
          const px = gx + gw / 2 - pillW / 2;
          const py = gy + gh / 2 - pillH / 2;
          renderer.drawRect(px, py, pillW, pillH, {
            color: "rgba(10, 14, 22, 0.92)",
            stroke: { width: 1.2, color: accent },
            radius: 5
          });
          renderer.drawWorldText(singleLine, gx + gw / 2, gy + gh / 2 + 1, {
            color: gate.id === "gate_cabin" ? "#e9d5ff" : "#fecaca",
            size: 10,
            align: "center",
            baseline: "middle"
          });
        }
      } else {
        // Unlocked recessed green sill indicator
        const sillColor = "rgba(34, 197, 94, 0.35)";
        if (gate.orientation === "horizontal") {
          renderer.drawRect(gx, gy + gh / 2 - 2, 10, 4, { color: sillColor });
          renderer.drawRect(gx + gw - 10, gy + gh / 2 - 2, 10, 4, { color: sillColor });
        } else {
          renderer.drawRect(gx + gw / 2 - 2, gy, 4, 10, { color: sillColor });
          renderer.drawRect(gx + gw / 2 - 2, gy + gh - 10, 4, 10, { color: sillColor });
        }
      }
    }
  }

  private renderShadowsAndPaths(renderer: Renderer): void {
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
        const pw = prop.w * size;
        const ph = prop.h * size;
        const botY = prop.y + ph / 2;

        if (prop.assetId === "fx_bed") {
          renderer.drawRect(prop.x - pw / 2 + 2, botY - 5, pw - 4, 7, {
            color: "rgba(2, 4, 9, 0.40)",
            radius: 3
          });
          renderer.drawEllipse(prop.x, botY - 1, pw / 2 + 1, 4.5, "rgba(2, 4, 9, 0.24)");
        } else if (prop.assetId === "fx_meeting_table") {
          renderer.drawEllipse(prop.x + 1, botY - 4, pw * 0.42, ph * 0.22, "rgba(2, 4, 9, 0.38)");
          renderer.drawEllipse(prop.x + 1, botY - 4, pw * 0.26, ph * 0.14, "rgba(2, 4, 9, 0.24)");
        } else if (
          prop.assetId === "fx_chair" ||
          prop.assetId === "fx_desk_chair" ||
          prop.assetId === "fx_reading_chair"
        ) {
          renderer.drawEllipse(
            prop.x,
            botY - 3,
            Math.max(8, pw * 0.36),
            Math.max(4, ph * 0.16),
            "rgba(2, 4, 9, 0.36)"
          );
        } else if (
          prop.assetId === "fx_reading_lamp" ||
          prop.assetId === "fx_plant" ||
          prop.assetId === "fx_paper_log"
        ) {
          renderer.drawEllipse(
            prop.x,
            botY - 2,
            Math.max(7, pw * 0.38),
            Math.max(4, ph * 0.17),
            "rgba(2, 4, 9, 0.32)"
          );
        } else if (
          prop.assetId === "fx_console" ||
          prop.assetId === "fx_console_side" ||
          prop.assetId === "fx_bookshelf" ||
          prop.assetId === "fx_terminal" ||
          prop.assetId === "fx_desk" ||
          prop.assetId === "fx_holo_table" ||
          prop.assetId === "fx_command_chair" ||
          prop.assetId === "fx_switch_panel"
        ) {
          renderer.drawRect(prop.x - pw / 2 + 2, botY - 5, pw - 4, 7, {
            color: "rgba(2, 4, 9, 0.40)",
            radius: 3
          });
          renderer.drawEllipse(prop.x, botY - 1, pw / 2 + 1, 4.5, "rgba(2, 4, 9, 0.22)");
        } else {
          renderer.drawEllipse(prop.x + 1, botY - 3, Math.max(8, pw * 0.42), 5, "rgba(2, 4, 9, 0.34)");
        }
      }
      for (const person of this.people) {
        renderer.drawEllipse(person.x, person.y - 1, 13, 5.5, "rgba(2, 4, 9, 0.36)");
        renderer.drawEllipse(person.x - 4, person.y - 1, 4.5, 2.2, "rgba(1, 2, 5, 0.48)");
        renderer.drawEllipse(person.x + 4, person.y - 1, 4.5, 2.2, "rgba(1, 2, 5, 0.48)");
      }
      renderer.drawEllipse(this.player.centerX, this.player.y + this.player.height - 1, 13, 5.5, "rgba(2, 4, 9, 0.40)");
      renderer.drawEllipse(this.player.centerX - 4, this.player.y + this.player.height - 1, 4.5, 2.2, "rgba(1, 2, 5, 0.52)");
      renderer.drawEllipse(this.player.centerX + 4, this.player.y + this.player.height - 1, 4.5, 2.2, "rgba(1, 2, 5, 0.52)");
    }

    // Multi-segment smart A* path breadcrumb rendering
    const waypoints = this.player.waypoints;
    if (waypoints.length > 0) {
      const pathColor = this.pendingBlockedGate ? "rgba(248, 113, 113, 0.65)" : "rgba(251, 191, 36, 0.55)";
      let prevX = this.player.centerX;
      let prevY = this.player.y + this.player.height - 4;

      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        renderer.drawLine?.(prevX, prevY, wp.x, wp.y, pathColor, 1.8, [6, 5]);
        if (i < waypoints.length - 1) {
          renderer.drawRect(wp.x - 2, wp.y - 2, 4, 4, {
            color: this.pendingBlockedGate ? "#f87171" : "#fbbf24",
            radius: 2
          });
        }
        prevX = wp.x;
        prevY = wp.y;
      }

      const finalPt = waypoints[waypoints.length - 1];
      const pulse = 7 + Math.sin(this.elapsedTime * 8) * 2;
      renderer.drawEllipse?.(
        finalPt.x,
        finalPt.y,
        pulse + 4,
        pulse * 0.6,
        this.pendingBlockedGate ? "rgba(239, 68, 68, 0.32)" : "rgba(245, 158, 11, 0.28)",
        true
      );
      renderer.drawRect(finalPt.x - 3, finalPt.y - 3, 6, 6, {
        color: this.pendingBlockedGate ? "#ef4444" : "#fbbf24",
        radius: 3
      });
    }

    // Hover Fallout bracket
    if (this.hoveredTarget) {
      const h = this.hoveredTarget;
      const col = h.id.startsWith("gate-")
        ? "#ef4444"
        : this.rpg.activeMode === "repair"
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
      renderer.drawWorldText(f.text, f.x, f.y, {
        color: f.color,
        size: 13,
        align: "center",
        baseline: "bottom"
      });
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
    const cam = renderer.camera;
    const vx = cam.worldX;
    const vy = cam.worldY;
    const vw = cam.viewportWidth;
    const vh = cam.viewportHeight;

    // Restrained deep-space cosmos backdrop per docs/设定集.md
    renderer.drawRect(vx, vy, vw, vh, { color: "#050912" });

    // Subtle deep-space cosmic dust veil on the starboard horizon
    if (renderer.drawGradientRect) {
      renderer.drawGradientRect(
        vx + vw * 0.55,
        vy,
        vw * 0.45,
        vh,
        [
          { offset: 0, color: "rgba(18, 36, 66, 0)" },
          { offset: 0.65, color: "rgba(22, 42, 76, 0.16)" },
          { offset: 1, color: "rgba(14, 28, 54, 0.06)" }
        ],
        false
      );
    }

    // Sharp pinpoint stars across fixed world cells (zero motion streaks)
    const cell = 110;
    const gx0 = Math.floor(vx / cell) - 1;
    const gy0 = Math.floor(vy / cell) - 1;
    const gx1 = Math.ceil((vx + vw) / cell) + 1;
    const gy1 = Math.ceil((vy + vh) / cell) + 1;

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        let h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
        for (let k = 0; k < 3; k++) {
          h = (h * 1664525 + 1013904223) >>> 0;
          const sx = gx * cell + (h % cell);
          h = (h * 1664525 + 1013904223) >>> 0;
          const sy = gy * cell + (h % cell);
          h = (h * 1664525 + 1013904223) >>> 0;
          const tier = h % 12;
          const size = tier === 0 ? 2 : 1.25;
          const color =
            tier === 0
              ? "#e0f2fe"
              : tier < 4
              ? "rgba(226, 232, 240, 0.88)"
              : tier < 8
              ? "rgba(148, 163, 184, 0.58)"
              : "rgba(253, 230, 138, 0.52)";
          renderer.drawRect(sx, sy, size, size, { color });
        }
      }
    }
  }

  /**
   * Renders external industrial & megastructure assemblies hovering out in deep vacuum:
   * bow ablation discs, L-2 orbital foundry gantry cranes, hangar magnetic recovery arms,
   * R-1 counter-rotating 440m double rings, 1,200m crimson aft radiator wings, and 4 stern thruster bells.
   */
  private renderExteriorMegastructures(renderer: Renderer): void {
    const s = this.map.tileSize;
    const vx0 = renderer.camera.worldX;
    const vy0 = renderer.camera.worldY;
    const vx1 = vx0 + renderer.camera.viewportWidth;
    const vy1 = vy0 + renderer.camera.viewportHeight;
    const t = this.elapsedTime;

    // 1. Fore Bow Multi-Layer Carbon-Silicon Ablation Shield Arcs (0-300m)
    if (vy0 < (FORE_ORIGIN.ty + 6) * s && vy1 > 0) {
      const cx = (FORE_ORIGIN.tx + 15) * s;
      renderer.drawRect(23 * s, 6, 38 * s, 26, {
        color: "#334155",
        stroke: { width: 2, color: "#94a3b8" },
        radius: 6
      });
      renderer.drawRect(cx - 12 * s, 32, 24 * s, 22, {
        color: "#273447",
        stroke: { width: 2, color: "#64748b" },
        radius: 3
      });
      for (let x = 25; x <= 58; x += 4) {
        renderer.drawLine?.(x * s, 32, x * s, 2 * s, "#64748b", 3);
      }
    }

    // 2. L-2 External Open-Vacuum Foundry Platform & Articulated Welding Cranes
    const l2WestEdge = L2_ORIGIN.tx * s;
    const l2Top = L2_ORIGIN.ty * s;
    const l2Bot = (L2_ORIGIN.ty + 23) * s;
    if (vx0 < l2WestEdge + 32 && vy1 > l2Top - 40 && vy0 < l2Bot + 40) {
      const craneArmY = l2Top + 10.5 * s + Math.sin(t * 0.45) * 42;
      renderer.drawRect(8, l2Top + 2 * s, l2WestEdge - 8, 5 * s, {
        color: "rgba(38, 49, 66, 0.9)",
        stroke: { width: 2, color: "#94a3b8" },
        radius: 3
      });
      renderer.drawRect(8, l2Top + 14 * s, l2WestEdge - 8, 5 * s, {
        color: "rgba(38, 49, 66, 0.9)",
        stroke: { width: 2, color: "#94a3b8" },
        radius: 3
      });
      for (let py = l2Top + 2.5 * s; py < l2Top + 19 * s; py += s) {
        renderer.drawLine?.(12, py, l2WestEdge - 2, py + s * 0.65, "rgba(148, 163, 184, 0.72)", 2);
      }
      renderer.drawRect(18, craneArmY - 6, l2WestEdge - 14, 12, {
        color: "#d97706",
        stroke: { width: 1.5, color: "#fde68a" },
        radius: 2
      });
      const strobe = Math.sin(t * 3.5) > 0.35;
      renderer.drawRect(22, craneArmY - 3, 6, 6, {
        color: strobe ? "#fbbf24" : "#92400e",
        radius: 3
      });
      if (strobe) {
        renderer.drawRadialLight?.(25, craneArmY, 34, "rgba(245, 158, 11, 0.35)", "rgba(0,0,0,0)", true);
      }
    }

    // 3. R-1 440m Twin Counter-Rotating Habitat Rings outside East Panoramic Windows
    const r1EastX = (R1_ORIGIN.tx + 20) * s;
    const r1MidY = (R1_ORIGIN.ty + 11) * s;
    if (vx1 > r1EastX - 180 && vy1 > r1MidY - 760 && vy0 < r1MidY + 760) {
      renderer.drawRect(r1EastX, r1MidY - 1.4 * s, 120, 2.8 * s, {
        color: "#3b475c",
        stroke: { width: 2, color: "#94a3b8" }
      });
      const ringAx = r1EastX + 26;
      const ringBx = r1EastX + 66;
      const bandTop = (R1_ORIGIN.ty - 3) * s;
      const bandH = 28 * s;

      renderer.drawRect(ringAx, bandTop, 28, bandH, {
        color: "#334155",
        stroke: { width: 1.5, color: "#94a3b8" }
      });
      renderer.drawRect(ringBx, bandTop, 24, bandH, {
        color: "#293548",
        stroke: { width: 1.5, color: "#64748b" }
      });

      const scrollA = (t * 28) % 64;
      const scrollB = (t * 28) % 64;
      for (let wy = bandTop - 64; wy < bandTop + bandH; wy += 64) {
        const ya = wy + scrollA;
        if (ya >= bandTop && ya <= bandTop + bandH - 12) {
          renderer.drawRect(ringAx + 6, ya, 14, 7, { color: "rgba(253, 224, 155, 0.85)", radius: 1 });
          renderer.drawLine?.(ringAx, ya + 22, ringAx + 28, ya + 22, "#64748b", 1.5);
        }
        const yb = wy + (64 - scrollB);
        if (yb >= bandTop && yb <= bandTop + bandH - 12) {
          renderer.drawRect(ringBx + 5, yb, 12, 6, { color: "rgba(186, 230, 253, 0.78)", radius: 1 });
          renderer.drawLine?.(ringBx, yb + 20, ringBx + 24, yb + 20, "#475569", 1.5);
        }
      }
    }

    // 4. Hangar West External Magnetic Shuttle Recovery Booms
    const hWestX = HANGAR_ORIGIN.tx * s;
    const hTopY = HANGAR_ORIGIN.ty * s;
    if (vx0 < hWestX + 64 && vx1 > hWestX - 420 && vy1 > hTopY && vy0 < hTopY + 18 * s) {
      for (const railRow of [4.2, 12.2]) {
        const ry = hTopY + railRow * s;
        renderer.drawRect(hWestX - 280, ry, 280, s * 1.4, {
          color: "#2b3648",
          stroke: { width: 2, color: "#94a3b8" },
          radius: 3
        });
        for (let k = 0; k < 5; k++) {
          const lit = Math.floor(t * 3 + k) % 5 === 0;
          const bx = hWestX - 48 - k * 52;
          renderer.drawRect(bx, ry + s * 0.55, 10, 6, {
            color: lit ? "#38bdf8" : "#1e3a5f",
            radius: 2
          });
        }
      }
    }

    // 5. Aft Propulsion 1,200m Deployable Crimson Radiator Wings & 4 Fusion Thruster Bells
    const propTopY = PROPULSION_ORIGIN.ty * s;
    const propPortX = PROPULSION_ORIGIN.tx * s;
    const propStbdX = (PROPULSION_ORIGIN.tx + 56) * s;
    const propBotY = (PROPULSION_ORIGIN.ty + 15) * s;
    if (vy1 > propTopY - 80 && vy0 < propBotY + 140) {
      const heatPulse = this.crisis.isAlarmActive
        ? 0.58 + Math.sin(t * 7) * 0.24
        : 0.34 + Math.sin(t * 1.6) * 0.06;
      const finColor = this.crisis.isAlarmActive ? "#991b1b" : "#5c191e";
      const finEdge = this.crisis.isAlarmActive
        ? `rgba(251, 146, 60, ${heatPulse.toFixed(2)})`
        : `rgba(239, 68, 68, ${heatPulse.toFixed(2)})`;

      for (const wing of [
        { x: 16, w: propPortX - 18 },
        { x: propStbdX + 2, w: this.map.pixelWidth - propStbdX - 18 }
      ]) {
        if (vx1 < wing.x || vx0 > wing.x + wing.w) continue;
        renderer.drawRect(wing.x, propTopY + 7 * s - 8, wing.w, 16, {
          color: "#3b4554",
          stroke: { width: 2, color: "#94a3b8" }
        });
        for (let fx = wing.x + 14; fx < wing.x + wing.w - 28; fx += 44) {
          renderer.drawRect(fx, propTopY + 1.5 * s, 28, 5 * s - 6, {
            color: finColor,
            stroke: { width: 1.5, color: finEdge },
            radius: 2
          });
          renderer.drawRect(fx, propTopY + 7.5 * s + 6, 28, 5.5 * s, {
            color: finColor,
            stroke: { width: 1.5, color: finEdge },
            radius: 2
          });
        }
      }

      for (const localCol of [8.5, 22.0, 33.5, 46.5]) {
        const nx = (PROPULSION_ORIGIN.tx + localCol) * s;
        if (nx + 120 < vx0 || nx - 120 > vx1) continue;
        renderer.drawRect(nx - 68, propBotY, 136, 24, {
          color: "#334155",
          stroke: { width: 2, color: "#94a3b8" }
        });
        renderer.drawRect(nx - 88, propBotY + 24, 176, 46, {
          color: "#222b3a",
          stroke: { width: 2, color: "#64748b" },
          radius: 5
        });
        renderer.drawEllipse?.(nx, propBotY + 70, 62, 16, "rgba(56, 189, 248, 0.28)", true);
      }
    }

    // 6. Autonomous Hull Surface Maintenance Rail Crawler Bot cruising central exterior spine
    const botY = ((65 + ((Math.sin(t * 0.08) + 1) / 2) * 116) * s);
    const botX = 36 * s + 16;
    if (botX > vx0 - 40 && botX < vx1 + 40 && botY > vy0 - 40 && botY < vy1 + 40) {
      renderer.drawRect(botX - 8, botY - 10, 16, 20, {
        color: "#f59e0b",
        stroke: { width: 1.5, color: "#1e293b" },
        radius: 3
      });
      renderer.drawRect(botX - 2, botY - 2, 4, 4, {
        color: Math.sin(t * 6) > 0 ? "#fef08a" : "#78350f",
        radius: 2
      });
    }
  }

  /**
   * Zone-differentiated interior finishes matching docs/设定集.md Section 11,
   * brighter outer hull plating, and high-contrast bulkhead-to-floor perimeter outlines.
   */
  private zoneTileWash(zone: Place, tileType: string): string | null {
    if (tileType === "deck") {
      switch (zone) {
        case "crew_habitat":
        case "ring_module":
          return "rgba(234, 214, 178, 0.56)"; // Warm bright pale wood & cream sandstone
        case "cabin":
          return "rgba(216, 194, 166, 0.48)"; // Warm executive taupe hardwood
        case "archives":
          return "rgba(224, 212, 188, 0.52)"; // Warm archival sandstone-parchment
        case "rehab_center":
          return "rgba(218, 240, 236, 0.54)"; // Calm clinical mint-ivory rehab ward
        case "medical_bay":
          return "rgba(236, 246, 252, 0.58)"; // Clean bright clinical porcelain
        case "science_lab":
        case "fore_sensors":
          return "rgba(214, 234, 250, 0.50)"; // Crisp ice blue-white lab deck
        case "agri_module":
          return "rgba(210, 238, 218, 0.50)"; // Fresh botanical sage-ivory
        case "bridge":
          return "rgba(186, 204, 224, 0.36)"; // Aerospace silver-grey
        case "transit_hub":
        case "transit_corridor":
        case "passage":
          return "rgba(208, 220, 236, 0.46)"; // Airy commuter pearl-terrazzo
        case "industrial_bay":
        case "hangar_bay":
        case "reactor_bay":
        case "propulsion_aft":
          return "rgba(168, 182, 202, 0.36)"; // Brushed steel industrial plating
        default:
          return "rgba(184, 198, 218, 0.36)";
      }
    }
    if (tileType === "deck_dark") {
      switch (zone) {
        case "crew_habitat":
        case "ring_module":
          return "rgba(132, 166, 198, 0.34)"; // Cool non-slip galley / wet-utility ceramic
        case "archives":
          return "rgba(176, 148, 108, 0.34)"; // Isolated MNA-01 archival study pad
        case "rehab_center":
          return "rgba(136, 206, 198, 0.40)"; // Shielded neuro-cognitive ward deck
        case "agri_module":
          return "rgba(54, 174, 108, 0.42)"; // Hydroponic moisture tray bay
        case "medical_bay":
          return "rgba(154, 218, 240, 0.42)"; // Chilled sterile cryo vault deck
        case "science_lab":
        case "fore_sensors":
          return "rgba(132, 184, 230, 0.36)"; // Optical & cleanroom bay
        case "bridge":
          return "rgba(92, 114, 146, 0.30)"; // Low-glare slate command pit (设定集)
        case "industrial_bay":
        case "hangar_bay":
        case "reactor_bay":
        case "propulsion_aft":
          return "rgba(104, 120, 146, 0.28)"; // Heavy machinery bay steel plating
        default:
          return "rgba(122, 142, 168, 0.28)";
      }
    }
    if (tileType === "deck_rug") {
      return zone === "cabin"
        ? "rgba(204, 188, 172, 0.32)"
        : "rgba(232, 194, 152, 0.38)";
    }
    if (tileType === "wall") {
      switch (zone) {
        case "crew_habitat":
        case "ring_module":
        case "cabin":
          return "rgba(244, 236, 222, 0.52)"; // Warm ivory bulkhead
        case "archives":
          return "rgba(238, 228, 212, 0.50)"; // Warm limestone archives bulkhead
        case "rehab_center":
        case "medical_bay":
        case "science_lab":
        case "agri_module":
          return "rgba(240, 248, 255, 0.54)"; // Crisp white-cyan sterile bulkhead
        case "bridge":
        case "transit_hub":
        case "transit_corridor":
        case "passage":
        case "fore_sensors":
          return "rgba(226, 236, 248, 0.46)"; // Light aerospace grey bulkhead
        case "industrial_bay":
        case "hangar_bay":
        case "reactor_bay":
        case "propulsion_aft":
          return "rgba(196, 208, 224, 0.38)"; // Industrial grey steel
        default:
          return "rgba(212, 222, 236, 0.42)";
      }
    }
    if (tileType === "wall_dark") {
      switch (zone) {
        case "crew_habitat":
        case "ring_module":
        case "cabin":
        case "archives":
          return "rgba(176, 150, 120, 0.30)"; // Warm wood/bronze utility cabinet
        case "industrial_bay":
        case "hangar_bay":
        case "reactor_bay":
        case "propulsion_aft":
          return "rgba(108, 122, 144, 0.24)"; // Machined blast bulkhead
        default:
          return "rgba(146, 164, 188, 0.24)";
      }
    }
    return null;
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
    const isSolidPartition = (nx: number, ny: number) => {
      const nt = this.map.tileAt(nx, ny);
      return nt === "wall" || nt === "wall_dark" || nt === "screen" || nt === "window";
    };

    for (const tile of this.map.visibleTiles(view)) {
      const wx = tile.tx * size;
      const wy = tile.ty * size;

      if (tile.type === "hull") {
        const kind = exteriorKindAt(this.map, tile.tx, tile.ty);
        if (kind === "space") continue;

        if (kind === "truss") {
          renderer.drawRect(wx + 2, wy + 2, size - 4, size - 4, {
            stroke: { width: 3, color: "#94a3b8" }
          });
          renderer.drawLine?.(wx + 2, wy + 2, wx + size - 2, wy + size - 2, "#cbd5e1", 2.2);
          renderer.drawLine?.(wx + size - 2, wy + 2, wx + 2, wy + size - 2, "#94a3b8", 2.2);
          renderer.drawLine?.(wx + size / 2, wy, wx + size / 2, wy + size, "rgba(245, 158, 11, 0.72)", 3);
          renderer.drawRect(wx + size / 2 - 4, wy + size / 2 - 4, 8, 8, {
            color: "#cbd5e1",
            stroke: { width: 1, color: "#1e293b" }
          });
          continue;
        }

        if (kind === "shield") {
          renderer.drawRect(wx, wy, size, size, {
            color: "#475569",
            stroke: { width: 1.5, color: "#94a3b8" }
          });
          renderer.drawLine?.(wx, wy + 12, wx + size, wy + 12, "#cbd5e1", 1.5);
          renderer.drawLine?.(wx, wy + 34, wx + size, wy + 34, "#64748b", 1.5);
          if ((tile.tx + tile.ty) % 5 === 0) {
            renderer.drawRect(wx + 18, wy + 18, 6, 6, { color: "rgba(251, 191, 36, 0.70)", radius: 2 });
          }
          continue;
        }

        const isSolidShip = (nx: number, ny: number) => {
          const nt = this.map.tileAt(nx, ny);
          return nt === "wall" || nt === "wall_dark" || nt === "screen";
        };
        const touchesS = isSolidShip(tile.tx, tile.ty + 1);
        const touchesN = isSolidShip(tile.tx, tile.ty - 1);
        const touchesE = isSolidShip(tile.tx + 1, tile.ty);
        const touchesW = isSolidShip(tile.tx - 1, tile.ty);

        if (touchesS) {
          renderer.drawRect(wx, wy + size - 13, size, 13, {
            color: "#52627a",
            stroke: { width: 1, color: "#0f172a" }
          });
          renderer.drawLine?.(wx, wy + size - 13, wx + size, wy + size - 13, "#cbd5e1", 2);
          renderer.drawLine?.(wx + 6, wy + size - 6, wx + size - 6, wy + size - 6, "#94a3b8", 1);
        }
        if (touchesN) {
          renderer.drawRect(wx, wy, size, 13, {
            color: "#52627a",
            stroke: { width: 1, color: "#0f172a" }
          });
          renderer.drawLine?.(wx, wy + 13, wx + size, wy + 13, "#cbd5e1", 2);
        }
        if (touchesE) {
          renderer.drawRect(wx + size - 13, wy, 13, size, {
            color: "#52627a",
            stroke: { width: 1, color: "#0f172a" }
          });
          renderer.drawLine?.(wx + size - 13, wy, wx + size - 13, wy + size, "#cbd5e1", 2);
        }
        if (touchesW) {
          renderer.drawRect(wx, wy, 13, size, {
            color: "#52627a",
            stroke: { width: 1, color: "#0f172a" }
          });
          renderer.drawLine?.(wx + 13, wy, wx + 13, wy + size, "#cbd5e1", 2);
        }
        if ((tile.tx * 7 + tile.ty * 13) % 19 === 0 && (touchesS || touchesN || touchesE || touchesW)) {
          const bx = touchesE ? wx + size - 8 : touchesW ? wx + 4 : wx + size / 2 - 2;
          const by = touchesS ? wy + size - 8 : touchesN ? wy + 4 : wy + size / 2 - 2;
          renderer.drawRect(bx, by, 4, 4, {
            color: "rgba(251, 191, 36, 0.90)",
            radius: 2
          });
        }
        continue;
      }

      if (tile.type === "window") {
        renderer.drawRect(wx, wy, size, size, {
          color: "rgba(32, 58, 96, 0.36)",
          stroke: { width: 3.5, color: "#cbd5e1" }
        });
        renderer.drawRect(wx + 4, wy + 4, size - 8, size - 8, {
          stroke: { width: 1.5, color: "#e2e8f0" }
        });
        renderer.drawLine?.(wx + 10, wy + size - 10, wx + 22, wy + 12, "rgba(186, 230, 253, 0.36)", 2);
        renderer.drawLine?.(wx + 22, wy + size - 8, wx + 34, wy + 18, "rgba(186, 230, 253, 0.22)", 1.5);
        continue;
      }

      const image = this.assets?.image(`tile_${tile.type}`) ?? null;
      renderer.drawSprite(image, wx + size / 2, wy + size / 2, {
        anchor: "center",
        size: { w: size, h: size },
        fallbackColor: "#ff00ff"
      });

      // Zone architectural finish wash (keeps tile seams & grain intact)
      const zone = placeAt(tile.tx, tile.ty);
      const wash = this.zoneTileWash(zone, tile.type);
      if (wash) {
        renderer.drawRect(wx, wy, size, size, { color: wash });
      }

      // Preserve sharp modular deck-plate grid seams over brighter washes
      if (tile.type === "deck" || tile.type === "deck_dark") {
        renderer.drawRect(wx, wy, size, size, {
          stroke: { width: 1, color: "rgba(15, 23, 42, 0.16)" }
        });
        renderer.drawLine?.(wx + 1, wy + 1, wx + size - 1, wy + 1, "rgba(255, 255, 255, 0.08)", 1);
      }

      // Crisp architectural perimeter boundaries between walls, rooms, rugs, and functional bays
      const isIndustrial =
        zone === "industrial_bay" || zone === "hangar_bay" || zone === "reactor_bay" || zone === "propulsion_aft";
      if (isSolidPartition(tile.tx, tile.ty)) {
        const edgeHi = isIndustrial
          ? tile.type === "wall_dark"
            ? "rgba(251, 191, 36, 0.85)"
            : "rgba(241, 245, 249, 0.78)"
          : "rgba(248, 250, 252, 0.78)";

        if (isFloor(this.map.tileAt(tile.tx, tile.ty - 1) ?? undefined)) {
          renderer.drawLine?.(wx, wy + 1, wx + size, wy + 1, edgeHi, 2);
          renderer.drawLine?.(wx, wy, wx + size, wy, "#0f172a", 1.2);
        }
        if (isFloor(this.map.tileAt(tile.tx - 1, tile.ty) ?? undefined)) {
          renderer.drawLine?.(wx + 1, wy, wx + 1, wy + size, edgeHi, 2);
          renderer.drawLine?.(wx, wy, wx, wy + size, "#0f172a", 1.2);
        }
        if (isFloor(this.map.tileAt(tile.tx + 1, tile.ty) ?? undefined)) {
          renderer.drawLine?.(wx + size - 1, wy, wx + size - 1, wy + size, edgeHi, 2);
          renderer.drawLine?.(wx + size, wy, wx + size, wy + size, "#0f172a", 1.2);
        }
        if (this.map.tileAt(tile.tx, tile.ty - 1) === "hull") {
          renderer.drawLine?.(wx, wy, wx + size, wy, "#cbd5e1", 2.2);
        }
        if (this.map.tileAt(tile.tx, tile.ty + 1) === "hull") {
          renderer.drawLine?.(wx, wy + size, wx + size, wy + size, "#cbd5e1", 2.2);
        }
        if (this.map.tileAt(tile.tx - 1, tile.ty) === "hull") {
          renderer.drawLine?.(wx, wy, wx, wy + size, "#cbd5e1", 2.2);
        }
        if (this.map.tileAt(tile.tx + 1, tile.ty) === "hull") {
          renderer.drawLine?.(wx + size, wy, wx + size, wy + size, "#cbd5e1", 2.2);
        }
      } else if (tile.type === "deck_rug") {
        const trim = zone === "cabin" ? "rgba(226, 208, 184, 0.72)" : "rgba(238, 200, 152, 0.72)";
        if (this.map.tileAt(tile.tx, tile.ty - 1) !== "deck_rug") renderer.drawLine?.(wx, wy + 1, wx + size, wy + 1, trim, 1.8);
        if (this.map.tileAt(tile.tx, tile.ty + 1) !== "deck_rug") renderer.drawLine?.(wx, wy + size - 1, wx + size, wy + size - 1, trim, 1.8);
        if (this.map.tileAt(tile.tx - 1, tile.ty) !== "deck_rug") renderer.drawLine?.(wx + 1, wy, wx + 1, wy + size, trim, 1.8);
        if (this.map.tileAt(tile.tx + 1, tile.ty) !== "deck_rug") renderer.drawLine?.(wx + size - 1, wy, wx + size - 1, wy + size, trim, 1.8);
      } else if (tile.type === "deck_dark") {
        const curb =
          zone === "agri_module"
            ? "rgba(74, 222, 128, 0.62)"
            : zone === "medical_bay"
            ? "rgba(103, 232, 249, 0.62)"
            : zone === "rehab_center"
            ? "rgba(94, 234, 212, 0.58)"
            : zone === "archives"
            ? "rgba(217, 169, 98, 0.58)"
            : isIndustrial
            ? "rgba(245, 158, 11, 0.72)"
            : "rgba(226, 232, 240, 0.48)";
        if (this.map.tileAt(tile.tx, tile.ty - 1) === "deck") renderer.drawLine?.(wx, wy + 1, wx + size, wy + 1, curb, 2);
        if (this.map.tileAt(tile.tx, tile.ty + 1) === "deck") renderer.drawLine?.(wx, wy + size - 1, wx + size, wy + size - 1, curb, 2);
        if (this.map.tileAt(tile.tx - 1, tile.ty) === "deck") renderer.drawLine?.(wx + 1, wy, wx + 1, wy + size, curb, 2);
        if (this.map.tileAt(tile.tx + 1, tile.ty) === "deck") renderer.drawLine?.(wx + size - 1, wy, wx + size - 1, wy + size, curb, 2);
      }
    }
  }

  /**
   * Renders grounded architectural craft inside the ship:
   * sliding pocket doorway tracks & metallic jambs, maglev steel rails,
   * shuttle pad tie-downs, industrial bridge crane stripes, wet-room floor drains, and cryo labels.
   */
  private renderArchitecturalDetails(renderer: Renderer): void {
    const s = this.map.tileSize;
    const view = {
      x: renderer.camera.worldX,
      y: renderer.camera.worldY,
      width: renderer.camera.viewportWidth,
      height: renderer.camera.viewportHeight
    };
    const isSolidBulkhead = (tx: number, ty: number) => {
      const t = this.map.tileAt(tx, ty);
      return t === "wall" || t === "wall_dark" || t === "screen";
    };
    const floorAt = (tx: number, ty: number) => isFloor(this.map.tileAt(tx, ty) ?? undefined);

    for (const tile of this.map.visibleTiles(view)) {
      const { tx, ty, type } = tile;
      const wx = tx * s;
      const wy = ty * s;

      // 1. Sliding bulkhead pocket doorways & sill plates
      if (isFloor(type)) {
        const hLeftWall = isSolidBulkhead(tx - 1, ty) && floorAt(tx - 1, ty - 1) && floorAt(tx - 1, ty + 1);
        const hRightWall = isSolidBulkhead(tx + 1, ty) && floorAt(tx + 1, ty - 1) && floorAt(tx + 1, ty + 1);
        if ((hLeftWall || hRightWall) && floorAt(tx, ty - 1) && floorAt(tx, ty + 1)) {
          renderer.drawRect(wx, wy + s / 2 - 4, s, 8, { color: "rgba(30, 41, 59, 0.65)" });
          renderer.drawLine?.(wx, wy + s / 2, wx + s, wy + s / 2, "rgba(148, 163, 184, 0.55)", 1.5);
          if (hLeftWall) {
            renderer.drawRect(wx, wy + 8, 6, s - 16, { color: "#64748b", stroke: { width: 1, color: "#0f172a" } });
            renderer.drawRect(wx + 1, wy + s / 2 - 2, 3, 4, { color: "#34d399" });
          }
          if (hRightWall) {
            renderer.drawRect(wx + s - 6, wy + 8, 6, s - 16, { color: "#64748b", stroke: { width: 1, color: "#0f172a" } });
            renderer.drawRect(wx + s - 4, wy + s / 2 - 2, 3, 4, { color: "#34d399" });
          }
        }

        const vTopWall = isSolidBulkhead(tx, ty - 1) && floorAt(tx - 1, ty - 1) && floorAt(tx + 1, ty - 1);
        const vBotWall = isSolidBulkhead(tx, ty + 1) && floorAt(tx - 1, ty + 1) && floorAt(tx + 1, ty + 1);
        if ((vTopWall || vBotWall) && floorAt(tx - 1, ty) && floorAt(tx + 1, ty)) {
          renderer.drawRect(wx + s / 2 - 4, wy, 8, s, { color: "rgba(30, 41, 59, 0.65)" });
          renderer.drawLine?.(wx + s / 2, wy, wx + s / 2, wy + s, "rgba(148, 163, 184, 0.55)", 1.5);
          if (vTopWall) {
            renderer.drawRect(wx + 8, wy, s - 16, 6, { color: "#64748b", stroke: { width: 1, color: "#0f172a" } });
            renderer.drawRect(wx + s / 2 - 2, wy + 1, 4, 3, { color: "#34d399" });
          }
          if (vBotWall) {
            renderer.drawRect(wx + 8, wy + s - 6, s - 16, 6, { color: "#64748b", stroke: { width: 1, color: "#0f172a" } });
            renderer.drawRect(wx + s / 2 - 2, wy + s - 4, 4, 3, { color: "#34d399" });
          }
        }
      }

      // 2. Transit Hub physical maglev guide rails & yellow platform warning lips
      const trRelX = tx - TRANSIT_ORIGIN.tx;
      const trRelY = ty - TRANSIT_ORIGIN.ty;
      if (trRelX >= 1 && trRelX <= 32 && (trRelY === 11 || trRelY === 13) && (trRelX < 15 || trRelX > 18)) {
        renderer.drawRect(wx + 8, wy + 4, 6, s - 8, { color: "rgba(15, 23, 42, 0.65)" });
        renderer.drawRect(wx + 32, wy + 4, 6, s - 8, { color: "rgba(15, 23, 42, 0.65)" });
        renderer.drawLine?.(wx, wy + s * 0.3, wx + s, wy + s * 0.3, "#94a3b8", 2.5);
        renderer.drawLine?.(wx, wy + s * 0.7, wx + s, wy + s * 0.7, "#94a3b8", 2.5);
      }
      if (trRelX >= 1 && trRelX <= 32 && (trRelY === 10 || trRelY === 14) && (trRelX < 15 || trRelX > 18)) {
        const curbY = trRelY === 10 ? wy + s - 4 : wy;
        renderer.drawRect(wx, curbY, s, 4, { color: "rgba(245, 158, 11, 0.55)" });
      }

      // 3. Crew Habitat Warm Wood Baseboard Trim, Brass Thresholds & Drainage Grates
      const habX = tx - HABITAT_ORIGIN.tx;
      const habY = ty - HABITAT_ORIGIN.ty;
      if (habX >= 1 && habX <= 12 && habY >= 1 && habY <= 9) {
        // Soft warm wood skirting along dorm partition bulkheads
        if (isSolidBulkhead(tx, ty - 1) && isFloor(type)) {
          renderer.drawRect(wx, wy, s, 3, { color: "rgba(169, 131, 90, 0.45)" });
        }
        // Brass threshold sill plate at Dorm A room door (x: 9..10, y: 9)
        if ((habX === 9 || habX === 10) && habY === 9) {
          renderer.drawRect(wx, wy + s - 4, s, 4, { color: "rgba(217, 119, 6, 0.65)" });
          renderer.drawLine?.(wx, wy + s - 2, wx + s, wy + s - 2, "#fef08a", 1);
        }
      }
      if (habX >= 19 && habX <= 30 && habY >= 1 && habY <= 9) {
        // Soft warm wood skirting along Mess Hall bulkheads
        if (isSolidBulkhead(tx, ty - 1) && isFloor(type)) {
          renderer.drawRect(wx, wy, s, 3, { color: "rgba(169, 131, 90, 0.45)" });
        }
        // Mess Hall dining area brass threshold plates at doors (x: 19, y: 4..5 and x: 22..24, y: 9)
        if (habX === 19 && (habY === 4 || habY === 5)) {
          renderer.drawRect(wx, wy, 4, s, { color: "rgba(217, 119, 6, 0.65)" });
        }
        if (habX >= 22 && habX <= 24 && habY === 9) {
          renderer.drawRect(wx, wy + s - 4, s, 4, { color: "rgba(217, 119, 6, 0.65)" });
          renderer.drawLine?.(wx, wy + s - 2, wx + s, wy + s - 2, "#fef08a", 1);
        }
      }
      if ((habX === 28 && habY === 16) || (habX === 28 && habY === 19)) {
        renderer.drawRect(wx + 10, wy + 10, s - 20, s - 20, {
          color: "#0f172a",
          stroke: { width: 1.5, color: "#64748b" },
          radius: 3
        });
        for (let gy = wy + 16; gy < wy + s - 12; gy += 6) {
          renderer.drawLine?.(wx + 14, gy, wx + s - 14, gy, "#94a3b8", 1.5);
        }
      }

      // 4. Hangar Bay Shuttle Tie-Down Rings & Magnetic Clamp Apron
      const hanX = tx - HANGAR_ORIGIN.tx;
      const hanY = ty - HANGAR_ORIGIN.ty;
      if ((hanX === 3 || hanX === 9) && (hanY === 5 || hanY === 13)) {
        renderer.drawRect(wx + 14, wy + 14, 20, 20, {
          color: "rgba(30, 41, 59, 0.85)",
          stroke: { width: 2, color: "#f59e0b" },
          radius: 10
        });
      }

      // 5. Medical Cryo-Vault Identification Plates (Vault I..IV)
      const medX = tx - MEDICAL_ORIGIN.tx;
      const medY = ty - MEDICAL_ORIGIN.ty;
      if (medX === 5 && medY === 6) {
        renderer.drawWorldText("VAULT-I  -135°C", wx + 24, wy + 18, { color: "rgba(103, 232, 249, 0.55)", size: 10, align: "center" });
      } else if (medX === 5 && medY === 14) {
        renderer.drawWorldText("VAULT-II  -135°C", wx + 24, wy + 18, { color: "rgba(103, 232, 249, 0.55)", size: 10, align: "center" });
      } else if (medX === 24 && medY === 6) {
        renderer.drawWorldText("VAULT-III  -135°C", wx + 24, wy + 18, { color: "rgba(103, 232, 249, 0.55)", size: 10, align: "center" });
      } else if (medX === 24 && medY === 14) {
        renderer.drawWorldText("VAULT-IV  -135°C", wx + 24, wy + 18, { color: "rgba(103, 232, 249, 0.55)", size: 10, align: "center" });
      }

      // 6. Reactor Heat-Sink Blast Partition Chevrons
      const rctX = tx - REACTOR_ORIGIN.tx;
      const rctY = ty - REACTOR_ORIGIN.ty;
      if ((rctX === 11 || rctX === 20) && (rctY === 7 || rctY === 9)) {
        renderer.drawRect(wx + 4, wy + 4, s - 8, 5, { color: "rgba(249, 115, 22, 0.45)" });
      }
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
      const isGate = this.hoveredTarget.id.startsWith("gate-");
      const modeName = isGate
        ? "门禁已闭锁 · 点击查看授权"
        : this.rpg.activeMode === "repair"
        ? "🔧 机械"
        : this.rpg.activeMode === "science"
        ? "💻 科学"
        : this.rpg.activeMode === "speech"
        ? "💬 交涉"
        : this.rpg.activeMode === "inspect"
        ? "🔍 观察"
        : "点击自动寻路互动/右键观察";
      renderer.drawWorldText(`${this.hoveredTarget.label} · ${modeName}`, this.hoveredTarget.x, this.hoveredTarget.y - 34, {
        color: isGate ? "#fca5a5" : "#fde68a",
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
