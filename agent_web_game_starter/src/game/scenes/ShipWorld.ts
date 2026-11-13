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
  placeAt,
  shipSpawn,
  FORE_ORIGIN,
  BRIDGE_ORIGIN,
  CABIN_ORIGIN,
  TRANSIT_ORIGIN,
  L1_ORIGIN,
  HABITAT_ORIGIN,
  HANGAR_ORIGIN,
  REACTOR_ORIGIN,
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
 *   - Intelligent A* pathfinding across 13 compartments + prop/corner smoothing
 *   - Physical security bulkhead clearances isolating lower crewman zones at game start
 *   - Three-phase crewman storyline leading from restricted Habitat/Workshop duties
 *     -> Crisis Damage Control -> Command Commendation -> Planetary Exploration -> Captain's Quarters
 */
export class ShipWorld implements GameWorld {
  readonly player: Player;
  readonly dialogue = new Dialogue();
  readonly map: TileMap;
  readonly duty = new DutySystem();
  readonly crisis = new CrisisSystem();
  readonly exploration = new ExplorationSystem();
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
      const pad = 8;
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
              desc: "铬钒合金重型管路扳手，握把缠着防滑油布。老周落在生活区值班台的趁手家伙。",
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
            bonusDesc: "热辐射减免 +85%",
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
      case "mechanic_liu":
        return "portrait_engineer";
      case "medic":
      case "agronomist":
        return "portrait_medic";
      case "navigator":
      case "researcher_su":
        return "portrait_navigator";
      case "transit_guard":
      case "ring_steward":
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

  private linesFor(person: ScenePerson): readonly DialogueLine[] {
    if (person.id === "engineer") {
      // Phase 1 -> Grant midship_pass
      if (!this.duty.isLowerTasksDone()) {
        return [
          { speaker: "老周", text: "「小徐，刚换班吧？咱们底层工勤二班现在没权去中层干线，南北跟东边的气闸都落着电子门禁。」" },
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
        { speaker: "舰长", text: "看来你已经在全船上下转了一圈，把这十几个仓段实实在在踩过一遍了？" },
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
          { speaker: "领航员", text: "「欢迎平安归来！星图桌刚刚把你测绘回来的远境-IV 重氢航点标上去，这条走了三十年的直线，终于迎来终站坐标了！」" }
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
    this.renderDeck(renderer);
    this.atmosphere.renderWallDepthAndAO(renderer, this.map);
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

        renderer.drawWorldText(`🔒 ${gate.badgeText}`, gx + gw / 2, gy + gh / 2 + 4, {
          color: gate.id === "gate_cabin" ? "#e9d5ff" : "#fecaca",
          size: 11,
          align: "center",
          baseline: "middle"
        });
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
        renderer.drawEllipse(prop.x + 2, prop.y + (prop.h * size) / 2 - 4, (prop.w * size) / 2 + 2, 7, "rgba(2, 4, 9, 0.56)");
      }
      for (const person of this.people) {
        renderer.drawEllipse(person.x, person.y - 2, 13, 6, "rgba(2, 4, 9, 0.65)");
      }
      renderer.drawEllipse(this.player.centerX, this.player.y + this.player.height - 2, 13, 6, "rgba(2, 4, 9, 0.7)");
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
