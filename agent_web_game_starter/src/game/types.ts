export type Direction = "down" | "up" | "left" | "right";

export type SoulMode = "red" | "blue" | "green" | "yellow";

export type DifficultyMode = "story" | "normal" | "hardcore";

export type GameScreen = "title" | "intro" | "overworld" | "battle_transition" | "battle" | "ending";

export type EndingKind = "pacifist" | "neutral" | "ruthless";

export type PortraitId =
  | "none"
  | "minerva_v"
  | "vaughn"
  | "ailin"
  | "mna01"
  | "kiosk"
  | "kiosk_mad"
  | "med07"
  | "weaver"
  | "vark"
  | "vark_doubt"
  | "charon"
  | "charon_mad"
  | "charon_warm"
  | "captain";

export type VoiceId =
  | "narrator"
  | "minerva_v"
  | "vaughn"
  | "ailin"
  | "mna01"
  | "kiosk"
  | "med07"
  | "weaver"
  | "vark"
  | "charon"
  | "captain";

export type MusicTrack =
  | "none"
  | "title"
  | "wreck_ambient"
  | "battle_normal"
  | "battle_miniboss"
  | "battle_final"
  | "battle_ruthless"
  | "ending";

export interface DialogueLine {
  speaker?: string;
  portrait?: PortraitId;
  voice?: VoiceId;
  text: string;
  color?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  shortName: string;
  heal: number;
  tpGain?: number;
  description: string;
  useText: string;
}

export type EnemyId = "kiosk" | "med07" | "weaver" | "vark" | "charon";

export type EncounterOutcome = "spared" | "destroyed";

export interface RouteState {
  difficulty: DifficultyMode;
  lv: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  kills: number;
  spares: number;
  totalGraze: number;
  outcomes: Partial<Record<EnemyId, EncounterOutcome>>;
  items: string[];
  gear: string[];
  flags: Record<string, boolean>;
  currentRoomId: string;
  saveRoomId: string;
  saveX: number;
  saveY: number;
}

export interface ActOption {
  id: string;
  label: string;
  tpCost?: number;
  hintGold?: boolean;
  visible?: (ctx: BattleActContext) => boolean;
}

export interface BattleActContext {
  enemyId: EnemyId;
  actStage: number;
  turn: number;
  enemyHp: number;
  enemyMaxHp: number;
  spareable: boolean;
  ruthlessMode: boolean;
  tp: number;
  barrierActive: boolean;
  route: RouteState;
  flags: Record<string, boolean>;
}

export interface ActOutcome {
  lines: string[];
  bubble?: string;
  nextStage?: number;
  makeSpareable?: boolean;
  healPlayer?: number;
  grantBarrier?: boolean;
  weakenNextWave?: boolean;
  enemyDefDelta?: number;
  tpDelta?: number;
  setFlag?: string;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  subtitle: string;
  maxHp: number;
  atk: number;
  def: number;
  xpReward: number;
  isBoss?: boolean;
  music: MusicTrack;
  ruthlessMusic?: MusicTrack;
  introText: string;
  flavorTexts: string[];
  spareableFlavorText: string;
  checkText: string;
  voice: VoiceId;
  portrait: PortraitId;
  acts: ActOption[];
  handleAct: (actId: string, ctx: BattleActContext) => ActOutcome;
  enemyTurnBubble: (ctx: BattleActContext) => string;
  selectWave: (ctx: BattleActContext) => {
    patternId: BulletPatternId;
    soulMode: SoulMode;
    duration: number;
    boxW: number;
    boxH: number;
  };
  spareDialogue: DialogueLine[];
  destroyDialogue: DialogueLine[];
}

export type BulletPatternId =
  | "kiosk_beam_intro"
  | "kiosk_smiley_burst"
  | "med_cryo_jump"
  | "med_icicle_rain"
  | "med_heartbeat_jump"
  | "weaver_pull_rings"
  | "weaver_nodes_shoot"
  | "weaver_tether_spiral"
  | "vark_spears_basic"
  | "vark_spears_reverse"
  | "vark_gravity_sweep"
  | "charon_morse_grid"
  | "charon_gravity_debris"
  | "charon_memory_spears"
  | "charon_core_shoot"
  | "charon_unhinged_box"
  | "charon_unhinged_barrage";

export interface Bullet {
  id: number;
  kind:
    | "orb"
    | "shard"
    | "bone"
    | "beam"
    | "spear"
    | "node"
    | "ring_pellet"
    | "heart_tear"
    | "heal_orb"
    | "player_shot";
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  radius: number;
  color: string;
  accent?: string;
  damage: number;
  age: number;
  maxAge: number;
  grazed?: boolean;
  fromDir?: Direction;
  isReverse?: boolean;
  reversed?: boolean;
  telegraph?: number;
  destructible?: boolean;
  hp?: number;
  motionRule?: "blue" | "orange";
  pullForce?: number;
  angle?: number;
}

export interface BattleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface FloatingNumber {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export interface InputSnapshot {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  slow: boolean;
  confirmPressed: boolean;
  cancelPressed: boolean;
  menuPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  clickX: number | null;
  clickY: number | null;
}

export type RoomTheme = "airlock" | "cryo" | "vault" | "relay" | "corridor" | "sanctum";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Architectural floor sub-zone painted cleanly over the neutral steel deck to create crisp visual hierarchy. */
export interface RoomFloorZone {
  x: number;
  y: number;
  w: number;
  h: number;
  kind:
    | "walkway"
    | "grate"
    | "cryo_bay"
    | "warm_pad"
    | "hazard_pad"
    | "server_pit"
    | "void_breach"
    | "sanctum_carpet"
    | "evidence_pad";
  label?: string;
}

/** Focused overhead pool of light guiding the player's eye directly to key focal points. */
export interface RoomSpotlight {
  x: number;
  y: number;
  radius: number;
  color: string;
}

/** Decorative non-blocking environmental prop (pipes, server racks, cargo, frost, barricades, pillars). */
export interface RoomDecor {
  x: number;
  y: number;
  w: number;
  h: number;
  kind:
    | "cargo_stack"
    | "server_rack"
    | "pipe_run"
    | "barricade"
    | "crater"
    | "frost_drift"
    | "holo_sign"
    | "gold_pillar"
    | "med_cross_inlay"
    | "desk_unit";
  text?: string;
}

export interface RoomExit {
  rect: Rect;
  targetRoomId: string;
  spawnX: number;
  spawnY: number;
  spawnDir: Direction;
  edge: "left" | "right" | "top" | "bottom";
  requireFlag?: string;
  requireEnemyResolved?: EnemyId;
  lockedText?: string;
}

export type PropKind =
  | "shuttle"
  | "save_star"
  | "kiosk_npc"
  | "med07_npc"
  | "weaver_npc"
  | "vark_npc"
  | "charon_core"
  | "cryo_pod"
  | "frozen_wheat"
  | "terminal"
  | "relay_switch"
  | "supply_crate"
  | "surrender_beacon"
  | "blast_door"
  | "radio_node"
  | "scorched_debris";

export interface RoomObject {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  solid?: boolean;
  label: string;
  enemyId?: EnemyId;
  pickupItemId?: string;
  pickupGearId?: string;
  switchIndex?: number;
  autoTriggerRadius?: number;
  lines?: DialogueLine[];
  sparedLines?: DialogueLine[];
  destroyedLines?: DialogueLine[];
  setFlag?: string;
}

export interface RoomDef {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  theme: RoomTheme;
  cols: number;
  rows: number;
  walls: Rect[];
  zones: RoomFloorZone[];
  spotlights: RoomSpotlight[];
  decor: RoomDecor[];
  exits: RoomExit[];
  objects: RoomObject[];
  onEnterFlag?: string;
  onEnterLines?: (route: RouteState) => DialogueLine[];
}
