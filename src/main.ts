import { Game } from "./engine/core/Game";
import { TownWorld, tileAssetIds } from "./game/TownWorld";
import { createTownMap } from "./game/map/townMap";
import { assertMapMatchesConfig, TILE } from "./game/config";
import { loadGameAssets } from "./game/assets";
import { assertAnimationAssetsExist, playerAnimationAssetIds } from "./game/assets/animationSpec";

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
const assets = await loadGameAssets([...playerAnimationAssetIds(), ...tileAssetIds()]);

const status = document.querySelector<HTMLSpanElement>("#status");
// Doubles as a startup signal: the HUD only clears the loading text once the
// assets have resolved and the first frame is about to run.
if (status) status.textContent = "小镇已就绪";

const world = new TownWorld(map, assets);
const game = new Game(canvas, world);
game.start();

/**
 * Snapshot of live game state, for automated checks in a headless browser.
 * The canvas cannot be inspected from outside, so this is the only way a
 * screenshot script can confirm where things actually are.
 */
function readProbe(): Record<string, number> {
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
    spriteTop: world.player.y - camera.worldY
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

const drawMarkers = new URLSearchParams(window.location.search).get("debug") === "1";

game.onAfterFrame(() => {
  const snapshot = readProbe();
  probeElement.textContent = JSON.stringify(snapshot);

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
