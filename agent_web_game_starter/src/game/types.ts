export type Direction = "down" | "up" | "left" | "right";

export type SoulMode = "red" | "blue" | "green" | "yellow";

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
  /** Optional text highlight color (defaults to crisp white). */
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
  flags: Record<string, boolean>;
  currentRoomId: string;
  saveRoomId: string;
  saveX: number;
  saveY: number;
}

export interface ActOption {
  id: string;
  label: string;
  /** Optional TP cost (e.g. Resonance skill). */
  tpCost?: number;
  /** Highlight option gold when it directly advances sparing. */
  hintGold?: boolean;
  /** Only show when predicate holds. */
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
  route: RouteState;
  flags: Record<string, boolean>;
}

export interface ActOutcome {
  lines: string[];
  bubble?: string;
  /** Increment or set spare progress. */
  nextStage?: number;
  makeSpareable?: boolean;
  healPlayer?: number;
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
  /** Speech bubble shown right before bullet-hell turn. */
  enemyTurnBubble: (ctx: BattleActContext) => string;
  /** Select bullet pattern ID and soul mode for the turn. */
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
  /** For green-soul directional spears: direction coming FROM ("up"|"down"|"left"|"right"). */
  fromDir?: Direction;
  /** Yellow spear flips to opposite side mid-flight! */
  isReverse?: boolean;
  reversed?: boolean;
  /** For warning beams: telegraph time before active damage. */
  telegraph?: number;
  /** Shootable by yellow soul. */
  destructible?: boolean;
  hp?: number;
  /** Blue/Orange Undertale rule: "blue" only hurts if moving, "orange" only hurts if still. */
  motionRule?: "blue" | "orange";
  /** Pull strength toward center (Continuum probe). */
  pullForce?: number;
  /** Rotation in radians for visual rendering. */
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
  /** Optional canvas-space click point in 1280x720 coordinates. */
  clickX: number | null;
  clickY: number | null;
}

export type RoomTheme = "airlock" | "cryo" | "relay" | "corridor" | "sanctum";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomExit {
  rect: Rect;
  targetRoomId: string;
  spawnX: number;
  spawnY: number;
  spawnDir: Direction;
  /** Optional flag that must be true (or enemy that must be resolved) to unlock. */
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
  /** Linked enemy ID (removed/visual-changed once resolved). */
  enemyId?: EnemyId;
  /** Item granted on interact (one-time via flag). */
  pickupItemId?: string;
  /** Puzzle switch index (0, 1, 2). */
  switchIndex?: number;
  /** Auto-trigger when player steps within radius (for 15-sec ambush / boss confront). */
  autoTriggerRadius?: number;
  /** Interaction handler data. */
  lines?: DialogueLine[];
  sparedLines?: DialogueLine[];
  destroyedLines?: DialogueLine[];
  /** Custom flag set when inspected. */
  setFlag?: string;
}

export interface RoomDef {
  id: string;
  name: string;
  subtitle: string;
  theme: RoomTheme;
  /** Playable room dimensions in 48px tiles. */
  cols: number;
  rows: number;
  /** Playable walkable interior rectangles (world pixels) or solid obstacles. */
  walls: Rect[];
  exits: RoomExit[];
  objects: RoomObject[];
  /** Optional room-enter radio banter (fires once via flag). */
  onEnterFlag?: string;
  onEnterLines?: (route: RouteState) => DialogueLine[];
}
