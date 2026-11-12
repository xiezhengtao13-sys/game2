import { Game } from "./engine/core/Game";
import { ShipWorld } from "./game/scenes/ShipWorld";
import { createShipMap, SHIP_COLUMNS, SHIP_ROWS } from "./game/map/shipMap";
import { TILE } from "./game/config";
import { loadGameAssets } from "./game/assets";
import { assertAnimationAssetsExist } from "./game/assets/animationSpec";
import { DialogueBox } from "./ui/DialogueBox";

const found = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!found) {
  throw new Error("Canvas not found");
}
// Re-bound so the non-null type survives into the closures below.
const canvas: HTMLCanvasElement = found;

const map = createShipMap(TILE);

if (map.width !== SHIP_COLUMNS || map.height !== SHIP_ROWS) {
  throw new Error(
    `The ship is ${map.width}x${map.height} tiles but shipMap.ts says ` +
      `${SHIP_COLUMNS}x${SHIP_ROWS}. Update shipMap.ts so they agree.`
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

const ship = new ShipWorld(map, assets);

/**
 * Development aids, driven from the URL so a headless browser can reach a
 * specific state without being able to send keystrokes.
 *
 *   ?spawn=x,y          place the player (sprite top-left, world pixels)
 *   &facing=up|down|left|right
 *   &dialogue=1         interact with whatever is in reach on the first frame
 *   &debug=1            draw magenta corner markers inside the canvas
 */
const params = new URLSearchParams(window.location.search);

const spawnParam = params.get("spawn");
if (spawnParam) {
  const [x, y] = spawnParam.split(",").map(Number);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    ship.player.x = x;
    ship.player.y = y;
  }
}

const facingParam = params.get("facing");
if (facingParam === "up" || facingParam === "down" || facingParam === "left" || facingParam === "right") {
  ship.player.animation.face(facingParam);
}

const game = new Game(canvas, ship);
game.start();

// The dialogue box is DOM, so the world pushes its dialogue state out to it
// rather than reaching for the document itself.
const app = document.querySelector<HTMLElement>("#app");
if (app) {
  const dialogueBox = new DialogueBox(app);
  ship.onDialogueChange = (dialogue) => dialogueBox.render(dialogue);

  // Duty Tracker HUD
  const tracker = document.createElement("div");
  tracker.id = "duty-tracker";
  app.appendChild(tracker);

  const renderDuty = () => {
    const duty = ship.duty;
    const items = duty.tasks
      .map(
        (t) => `
        <div class="duty-item ${t.completed ? "done" : ""}">
          <span class="duty-box">${t.completed ? "✓" : ""}</span>
          <span>${t.title}</span>
        </div>`
      )
      .join("");

    tracker.innerHTML = `
      <div class="duty-header">
        <span>二班例行巡检日志</span>
        <span>${duty.completedCount}/${duty.totalCount}</span>
      </div>
      ${items}
    `;
  };

  renderDuty();
  ship.onDutyChange = () => renderDuty();

  // Crisis Tracker HUD (Chapter 1)
  const crisisTracker = document.createElement("div");
  crisisTracker.id = "crisis-tracker";
  app.appendChild(crisisTracker);

  const renderCrisis = () => {
    const crisis = ship.crisis;
    const obj = crisis.currentObjective;
    if (!obj) {
      crisisTracker.style.display = "none";
      return;
    }
    crisisTracker.style.display = "block";
    crisisTracker.className = crisis.isResolved ? "resolved" : "alert";
    crisisTracker.innerHTML = `
      <div class="crisis-badge">${crisis.isResolved ? "【危机解除 · 第一章完成】" : "【特级管损警报 · 紧要】"}</div>
      <div class="crisis-title">${obj.title}</div>
      <div class="crisis-hint">${obj.hint}</div>
    `;
  };

  renderCrisis();
  ship.onCrisisChange = () => {
    renderCrisis();
    renderExploration();
  };

  // Exploration Tracker HUD (Chapter 2)
  const explorationTracker = document.createElement("div");
  explorationTracker.id = "exploration-tracker";
  app.appendChild(explorationTracker);

  const renderExploration = () => {
    const exp = ship.exploration;
    const isVisible = ship.crisis.isResolved || ship.currentMode !== "deck";
    if (!isVisible) {
      explorationTracker.style.display = "none";
      return;
    }
    explorationTracker.style.display = "block";
    explorationTracker.className = exp.isChapter2Done ? "resolved" : "active";
    const obj = exp.currentObjective;
    explorationTracker.innerHTML = `
      <div class="exploration-badge">${exp.isChapter2Done ? "【深空初探完成 · 第二章结案】" : "【第二章 · 恒星系探索与地表勘测】"}</div>
      <div class="exploration-title">${obj.title}</div>
      <div class="exploration-hint">${obj.hint}</div>
    `;
  };

  renderExploration();
  ship.onExplorationChange = () => renderExploration();

  // `&dialogue=1` interacts immediately, so a screenshot can show the box.
  if (params.get("dialogue") === "1") {
    ship.interactInReach();
    dialogueBox.render(ship.dialogue.isOpen ? ship.dialogue : null);
  }
}

/** Live state, mirrored for automated checks in a headless browser. */
interface Probe {
  tile: number;
  place: string;
  mapColumns: number;
  mapRows: number;
  mapPixelWidth: number;
  mapPixelHeight: number;
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
  crisisStage: string;
  crisisAlarm: number;
  crisisResolved: number;
  explorationStage: string;
  explorationDone: number;
  currentMode: string;
  /** Art-load state, so "no art" can be told apart from "art failed to load". */
  artMissingCount: number;
  artFailureCount: number;
}

function readProbe(): Probe {
  const { camera } = game;

  return {
    tile: TILE,
    place: ship.placeLabel,
    mapColumns: map.width,
    mapRows: map.height,
    mapPixelWidth: map.pixelWidth,
    mapPixelHeight: map.pixelHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cameraX: camera.worldX,
    cameraY: camera.worldY,
    playerX: ship.player.x,
    playerY: ship.player.y,
    spriteLeft: ship.player.x - camera.worldX,
    spriteTop: ship.player.y - camera.worldY,
    target: ship.interactionTarget?.id ?? null,
    targetLabel: ship.interactionLabel,
    dialogueOpen: ship.dialogue.isOpen ? 1 : 0,
    dialogueLine: ship.dialogue.isOpen ? ship.dialogue.lineNumber : 0,
    dialogueTotal: ship.dialogue.lineCount,
    dialogueText: ship.dialogue.current?.text ?? null,
    crisisStage: ship.crisis.stage,
    crisisAlarm: ship.crisis.isAlarmActive ? 1 : 0,
    crisisResolved: ship.crisis.isResolved ? 1 : 0,
    explorationStage: ship.exploration.stage,
    explorationDone: ship.exploration.isChapter2Done ? 1 : 0,
    currentMode: ship.currentMode,
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

  // The HUD doubles as a prompt readout while walking around, and otherwise says
  // which part of the ship you are standing in.
  if (status) {
    status.textContent = snapshot.targetLabel
      ? `${snapshot.targetLabel} · 按 E`
      : snapshot.place;
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
