import { Game } from "./engine/core/Game";
import { CaptainRoom } from "./game/scenes/CaptainRoom";
import { createCaptainRoomMap } from "./game/map/captainRoomMap";
import { ROOM_COLUMNS, ROOM_ROWS, TILE } from "./game/config";
import { loadGameAssets } from "./game/assets";
import { assertAnimationAssetsExist } from "./game/assets/animationSpec";
import { DialogueBox } from "./ui/DialogueBox";

const found = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!found) {
  throw new Error("Canvas not found");
}
// Re-bound so the non-null type survives into the closures below.
const canvas: HTMLCanvasElement = found;

const map = createCaptainRoomMap(TILE);

if (map.width !== ROOM_COLUMNS || map.height !== ROOM_ROWS) {
  throw new Error(
    `Captain's room is ${map.width}x${map.height} tiles but config says ` +
      `${ROOM_COLUMNS}x${ROOM_ROWS}. Update captainRoomMap.ts or config.ts so they agree.`
  );
}

// Fail loudly during development if the animation names art the manifest does
// not define, rather than rendering an invisible character.
assertAnimationAssetsExist();

// Every asset in the manifest is loaded up front. Deliberately NOT a hand-picked
// list: an earlier version loaded only what it thought it needed, and everything
// else silently rendered as a flat fallback colour for several tasks.
const assets = await loadGameAssets();

const status = document.querySelector<HTMLSpanElement>("#status");
const IDLE_HUD = "远望号 · 舰长室";
if (status) status.textContent = IDLE_HUD;

const room = new CaptainRoom(map, assets);
const game = new Game(canvas, room);
game.start();

// The dialogue box is DOM, so the scene pushes its dialogue state out to it
// rather than reaching for the document itself.
const app = document.querySelector<HTMLElement>("#app");
if (app) {
  const dialogueBox = new DialogueBox(app);
  room.onDialogueChange = (dialogue) => dialogueBox.render(dialogue);
}

/** Live state, mirrored for automated checks in a headless browser. */
interface Probe {
  tile: number;
  roomColumns: number;
  roomRows: number;
  roomPixelWidth: number;
  roomPixelHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  cameraX: number;
  cameraY: number;
  playerX: number;
  playerY: number;
  spriteLeft: number;
  spriteTop: number;
  target: string | null;
  targetLabel: string | null;
  dialogueOpen: number;
  dialogueLine: number;
  dialogueTotal: number;
  dialogueText: string | null;
  /** Art-load state, so "no art" can be told apart from "art failed to load". */
  artMissingCount: number;
  artFailureCount: number;
}

function readProbe(): Probe {
  const { camera } = game;

  return {
    tile: TILE,
    roomColumns: map.width,
    roomRows: map.height,
    roomPixelWidth: map.pixelWidth,
    roomPixelHeight: map.pixelHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cameraX: camera.worldX,
    cameraY: camera.worldY,
    playerX: room.player.x,
    playerY: room.player.y,
    spriteLeft: room.player.x - camera.worldX,
    spriteTop: room.player.y - camera.worldY,
    target: room.interactionTarget?.id ?? null,
    targetLabel: room.interactionLabel,
    dialogueOpen: room.dialogue.isOpen ? 1 : 0,
    dialogueLine: room.dialogue.isOpen ? room.dialogue.lineNumber : 0,
    dialogueTotal: room.dialogue.lineCount,
    dialogueText: room.dialogue.current?.text ?? null,
    artMissingCount: assets.missing().length,
    artFailureCount: assets.failures().length
  };
}

(window as unknown as { __probe: unknown }).__probe = readProbe;

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

const debugMarker = new URLSearchParams(window.location.search).get("debug") === "1";

game.onAfterFrame(() => {
  const snapshot = readProbe();
  probeElement.textContent = JSON.stringify(snapshot);

  // The HUD doubles as a prompt readout while walking around.
  if (status) {
    status.textContent = snapshot.targetLabel ? `${snapshot.targetLabel} · 按 E` : IDLE_HUD;
  }

  if (!debugMarker) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(0, 0, 6, 6);
  ctx.fillRect(snapshot.spriteLeft, snapshot.spriteTop, 3, 3);
  ctx.restore();
});
