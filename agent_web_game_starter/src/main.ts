import { setSpriteCanvasFactory } from "./game/art/pixelCanvas";
import { sound } from "./game/audio/soundEngine";
import { GameController } from "./game/gameController";
import type { InputSnapshot } from "./game/types";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement | null;
if (!canvas) throw new Error("Missing #gameCanvas element");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Failed to acquire 2D canvas context");

setSpriteCanvasFactory((w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
});

const game = new GameController();

// Expose clean hooks for verification & automated Chromium tests
(window as unknown as Record<string, unknown>).__game = game;
(window as unknown as Record<string, unknown>).__probe = () => game.getProbe();

const held = new Set<string>();
const justPressed = new Set<string>();
let pendingClick: { x: number; y: number } | null = null;

const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyZ",
  "KeyX",
  "KeyC",
  "Enter",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Escape",
  "Tab"
]);

const muteBtn = document.getElementById("btn-mute") as HTMLButtonElement | null;
const fsBtn = document.getElementById("btn-fs") as HTMLButtonElement | null;

function syncMuteLabel(): void {
  if (muteBtn) muteBtn.textContent = sound.isMuted ? "🔇 静音" : "🔊 音效";
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    void document.exitFullscreen?.().catch(() => {});
  }
}

muteBtn?.addEventListener("click", () => {
  sound.unlock();
  sound.toggleMute();
  syncMuteLabel();
});

fsBtn?.addEventListener("click", () => {
  toggleFullscreen();
});

window.addEventListener("keydown", (e) => {
  sound.unlock();
  if (GAME_KEYS.has(e.code)) e.preventDefault();

  if (e.code === "KeyM" && !e.repeat) {
    sound.toggleMute();
    syncMuteLabel();
    return;
  }
  if (e.code === "KeyF" && !e.repeat) {
    toggleFullscreen();
    return;
  }

  if (!held.has(e.code)) {
    justPressed.add(e.code);
  }
  held.add(e.code);
});

window.addEventListener("keyup", (e) => {
  held.delete(e.code);
});

window.addEventListener("blur", () => {
  held.clear();
  justPressed.clear();
});

canvas.addEventListener("pointerdown", (e) => {
  sound.unlock();
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  pendingClick = {
    x: ((e.clientX - rect.left) / rect.width) * 1280,
    y: ((e.clientY - rect.top) / rect.height) * 720
  };
});

function pollInput(): InputSnapshot {
  const pressed = (codes: string[]) => codes.some((c) => justPressed.has(c));
  const down = (codes: string[]) => codes.some((c) => held.has(c));

  const snap: InputSnapshot = {
    up: down(["ArrowUp", "KeyW"]),
    down: down(["ArrowDown", "KeyS"]),
    left: down(["ArrowLeft", "KeyA"]),
    right: down(["ArrowRight", "KeyD"]),
    slow: down(["ShiftLeft", "ShiftRight"]),
    confirmPressed: pressed(["KeyZ", "Enter", "Space"]),
    cancelPressed: pressed(["KeyX", "Escape", "ShiftLeft", "ShiftRight"]),
    menuPressed: pressed(["KeyC", "Tab"]),
    upPressed: pressed(["ArrowUp", "KeyW"]),
    downPressed: pressed(["ArrowDown", "KeyS"]),
    leftPressed: pressed(["ArrowLeft", "KeyA"]),
    rightPressed: pressed(["ArrowRight", "KeyD"]),
    clickX: pendingClick?.x ?? null,
    clickY: pendingClick?.y ?? null
  };

  justPressed.clear();
  pendingClick = null;
  return snap;
}

let lastTime = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  const input = pollInput();
  game.update(dt, input);
  ctx!.imageSmoothingEnabled = false;
  game.render(ctx!);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
