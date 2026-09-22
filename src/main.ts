import { Game } from "./engine/core/Game";
import { DemoWorld } from "./game/DemoWorld";

const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!canvas) {
  throw new Error("Canvas not found");
}

const game = new Game(canvas, new DemoWorld());
game.start();
