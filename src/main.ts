import { Game } from "./engine/core/Game";
import { TownWorld } from "./game/TownWorld";
import { createTownMap } from "./game/map/townMap";
import { assertMapMatchesConfig, TILE } from "./game/config";
import { loadGameAssets, debugSourceFor } from "./game/assets";
import { assertAnimationAssetsExist } from "./game/assets/animationSpec";
import { DialogueBox } from "./ui/DialogueBox";
import { STRUCTURES } from "./game/systems/TownGrowth";

const found = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!found) {
  throw new Error("Canvas not found");
}
// Re-bound so the non-null type survives into the closures below.
const canvas: HTMLCanvasElement = found;

const map = createTownMap();
assertMapMatchesConfig(map);

// Fail loudly during development if the animation names art the manifest does
// not define, rather than rendering an invisible character.
assertAnimationAssetsExist();

// Assets are loaded before the first frame so the world never renders a frame
// with nothing but fallback blocks. `loadGameAssets` resolves even when files
// are missing, so a broken asset cannot stop the game from starting.
// Every asset in the manifest is loaded up front. Deliberately NOT a hand-picked
// list: an earlier version loaded only the player frames and tiles, and every
// other picture (buildings, crops, items, UI) silently rendered as a flat
// fallback colour for several tasks because nothing ever asked for it.
const assets = await loadGameAssets();

const status = document.querySelector<HTMLSpanElement>("#status");
// Doubles as a startup signal: the HUD only clears the loading text once the
// assets have resolved and the first frame is about to run.
if (status) status.textContent = "小镇已就绪";

const world = new TownWorld(map, assets);

// `?spawn=x,y` moves the player and `&facing=up|down|left|right` sets which way
// they look, so a headless screenshot can be framed at a specific spot without
// simulating input. Development aid only.
const params = new URLSearchParams(window.location.search);
const spawnParam = params.get("spawn");
if (spawnParam) {
  const [x, y] = spawnParam.split(",").map(Number);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    world.player.x = x;
    world.player.y = y;
  }
}
const facingParam = params.get("facing");
if (facingParam === "up" || facingParam === "down" || facingParam === "left" || facingParam === "right") {
  world.player.animation.face(facingParam);
}

// `&farm=1` pre-works a few plots so a screenshot can show tilled soil, a
// growing crop and a ripe one at once, without days of play.
if (params.get("farm") === "1") {
  world.seedFarmForDisplay();
}

// `&contribute=N` pre-earns town reputation, so a screenshot can show the
// construction site or the finished building without playing the whole loop.
const contributeParam = Number(params.get("contribute"));
if (Number.isFinite(contributeParam) && contributeParam > 0) {
  world.growth.contribute(contributeParam);
}

const game = new Game(canvas, world);
game.start();

// The dialogue box is DOM, so the world pushes its dialogue state out to it
// rather than reaching for the document itself.
const app = document.querySelector<HTMLElement>("#app");
if (app) {
  const dialogueBox = new DialogueBox(app);
  world.onDialogueChange = (dialogue) => dialogueBox.render(dialogue);

  // `&dialogue=1` opens the box immediately, so a headless screenshot can show
  // it without being able to send keystrokes.
  if (params.get("dialogue") === "1") {
    world.startDialogueInReach();
    dialogueBox.render(world.dialogue.isOpen ? world.dialogue : null);
  }
}

/**
 * Snapshot of live game state, for automated checks in a headless browser.
 * The canvas cannot be inspected from outside, so this is the only way a
 * screenshot script can confirm where things actually are.
 */
/** Live state mirrored for headless checks. */
interface Probe {
  tile: number;
  mapColumns: number;
  mapRows: number;
  mapPixelWidth: number;
  mapPixelHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  playerX: number;
  playerY: number;
  playerCenterX: number;
  playerCenterY: number;
  /** Where the player's sprite frame lands on screen, for screenshot checks. */
  spriteLeft: number;
  spriteTop: number;
  /** What the player is being prompted about, or null. */
  target: string | null;
  targetLabel: string | null;
  promptWorldX: number;
  promptWorldY: number;
  /** Dialogue state, so a headless check can verify the box appearing. */
  dialogueOpen: number;
  dialogueLine: number;
  dialogueTotal: number;
  dialogueSpeaker: string | null;
  dialogueText: string | null;
  /** Farm and clock state, for headless checks. */
  clock: string;
  day: number;
  farmPlots: number;
  tilled: number;
  growing: number;
  ripe: number;
  harvested: number;
  job: string;
  reputation: number;
  delivered: number;
  marketState: string;
  artGrass: string;
  artMarket: string;
  artGrassUrlLen: number;
  artMarketUrlLen: number;
  artFailureCount: number;
  artMissingCount: number;
  artMissingSample: string;
  artFailureSample: string;
  inventory: string;
  plots: string;
}

function readProbe(): Probe {
  const { camera } = game;

  return {
    tile: TILE,
    mapColumns: map.width,
    mapRows: map.height,
    mapPixelWidth: map.pixelWidth,
    mapPixelHeight: map.pixelHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    viewportWidth: camera.viewportWidth,
    viewportHeight: camera.viewportHeight,
    cameraX: camera.worldX,
    cameraY: camera.worldY,
    playerX: world.player.x,
    playerY: world.player.y,
    playerCenterX: world.player.centerX,
    playerCenterY: world.player.centerY,
    /** Where the player's sprite frame lands on screen, for screenshot checks. */
    spriteLeft: world.player.x - camera.worldX,
    spriteTop: world.player.y - camera.worldY,
    target: world.interactionTarget?.id ?? null,
    targetLabel: world.interactionTarget?.label ?? null,
    promptWorldX: world.interactionTarget?.x ?? 0,
    promptWorldY: world.interactionTarget?.y ?? 0,
    /** Dialogue state, so a headless check can verify the box appearing. */
    dialogueOpen: world.dialogue.isOpen ? 1 : 0,
    dialogueLine: world.dialogue.isOpen ? world.dialogue.lineNumber : 0,
    dialogueTotal: world.dialogue.lineCount,
    dialogueSpeaker: world.dialogue.current?.speaker ?? null,
    dialogueText: world.dialogue.current?.text ?? null,
    /** Farm and clock state, for headless checks. */
    clock: world.time.clock,
    day: world.time.day,
    farmPlots: world.farm.size,
    tilled: world.farm.all.filter((p) => p.state === "tilled").length,
    growing: world.farm.all.filter((p) => p.state === "seeded").length,
    ripe: world.farm.all.filter((p) => p.state === "mature").length,
    harvested: world.harvestedCount,
    job: world.jobs.taken ?? "none",
    reputation: world.growth.reputationCount,
    delivered: world.growth.deliveredCount,
    marketState: world.growth.stateOf(STRUCTURES[0]),
    /** Art-load state for a few ids, to tell "no art" from "art failed". */
    artGrass: assets.image("tile_grass") ? "loaded" : "missing",
    artMarket: assets.image("bld_market") ? "loaded" : "missing",
    artGrassUrlLen: (debugSourceFor("tile_grass") ?? "").length,
    artMarketUrlLen: (debugSourceFor("bld_market") ?? "").length,
    /** Why loads failed, so a missing picture is not a mystery. */
    artFailureCount: assets.failures().length,
    /** Ids with no image at all, to see the shape of the problem. */
    artMissingCount: assets.missing().length,
    artMissingSample: assets.missing().slice(0, 6).join(","),
    artFailureSample: assets
      .failures()
      .slice(0, 3)
      .map((f) => `${f.id}:${f.reason}`)
      .join(" | "),
    inventory: world.inventory
      .entries()
      .map((e) => `${e.item}:${e.count}`)
      .join(" ") || "-",
    plots: world
      .firstPlots(4)
      .map((p) => `${p.tx},${p.ty}:${p.state}`)
      .join(" ")
  };
}

(window as unknown as { __probe: unknown }).__probe = readProbe;

// Debug: expose the chosen URL and load state for a few asset ids, so a headless
// check can tell "no art bundled" apart from "art bundled but failed to load".
(window as unknown as { __assetDebug: unknown }).__assetDebug = (id: string) => ({
  id,
  url: debugSourceFor(id) ?? null,
  hasImage: assets.image(id) !== null,
  isMissing: assets.missing().includes(id)
});

/**
 * Mirrors live state into the DOM and, with `?debug=1`, marks the sprite's
 * top-left corner inside the canvas. Both exist so a headless browser can check
 * what actually rendered: the canvas is opaque to script, and markers drawn in
 * the same frame are the only way to compare reported state against pixels.
 */
const probeElement = document.createElement("div");
probeElement.id = "debug-probe";
probeElement.hidden = true;
probeElement.style.display = "none";
document.body.appendChild(probeElement);

const drawMarkers = new URLSearchParams(window.location.search).get("debug") === "1";

game.onAfterFrame(() => {
  const snapshot = readProbe();
  probeElement.textContent = JSON.stringify(snapshot);

  // The HUD clock, so the player can see the day passing.
  if (status) status.textContent = `第 ${snapshot.day} 天 ${snapshot.clock}`;

  if (!drawMarkers) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ff00ff";
  // 6x6 at the canvas origin, 3x3 at the sprite frame's top-left.
  ctx.fillRect(0, 0, 6, 6);
  ctx.fillRect(snapshot.spriteLeft, snapshot.spriteTop, 3, 3);
  ctx.restore();
});
