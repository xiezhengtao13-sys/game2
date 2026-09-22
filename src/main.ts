import { Game } from "./engine/core/Game";
import { TownWorld } from "./game/TownWorld";
import { createTownMap } from "./game/map/townMap";
import { assertMapMatchesConfig } from "./game/config";
import { loadGameAssets } from "./game/assets";

const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!canvas) {
  throw new Error("Canvas not found");
}

const map = createTownMap();
assertMapMatchesConfig(map);

// Assets are loaded before the first frame so the world never renders a frame
// with nothing but fallback blocks. `loadGameAssets` resolves even when files
// are missing, so a broken asset cannot stop the game from starting.
const assets = await loadGameAssets();

const status = document.querySelector<HTMLSpanElement>("#status");
if (status) status.textContent = "小镇";

const game = new Game(canvas, new TownWorld(map, assets));
game.start();
