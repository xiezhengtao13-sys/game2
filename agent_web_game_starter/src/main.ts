import { Game } from "./engine/core/Game";
import { ShipWorld } from "./game/scenes/ShipWorld";
import { createShipMap, SHIP_COLUMNS, SHIP_ROWS } from "./game/map/shipMap";
import { TILE } from "./game/config";
import { loadGameAssets } from "./game/assets";
import { assertAnimationAssetsExist } from "./game/assets/animationSpec";
import { DialogueBox } from "./ui/DialogueBox";
import { ShipMinimap } from "./ui/ShipMinimap";
import { FalloutHud } from "./ui/FalloutHud";
import { sounds } from "./engine/audio/SoundEffects";

const found = document.querySelector<HTMLCanvasElement>("#gameCanvas");

if (!found) {
  throw new Error("Canvas not found");
}
const canvas: HTMLCanvasElement = found;

const map = createShipMap(TILE);

if (map.width !== SHIP_COLUMNS || map.height !== SHIP_ROWS) {
  throw new Error(
    `The ship is ${map.width}x${map.height} tiles but shipMap.ts says ` +
      `${SHIP_COLUMNS}x${SHIP_ROWS}. Update shipMap.ts so they agree.`
  );
}

assertAnimationAssetsExist();

const assets = await loadGameAssets();

const status = document.querySelector<HTMLSpanElement>("#status");
const ship = new ShipWorld(map, assets);

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

const app = document.querySelector<HTMLElement>("#app");
const stage = document.querySelector<HTMLElement>("#canvas-stage") ?? app;
const hudTools = document.querySelector<HTMLElement>("#hud-tools");

let falloutHud: FalloutHud | null = null;

if (app && stage) {
  const dialogueBox = new DialogueBox(stage, assets);
  dialogueBox.onSelectChoice = (idx) => {
    sounds.init();
    ship.selectDialogueChoice(idx);
  };
  ship.onDialogueChange = (dialogue) => dialogueBox.render(dialogue);

  // Duty Tracker HUD (top-left of canvas stage)
  const tracker = document.createElement("div");
  tracker.id = "duty-tracker";
  stage.appendChild(tracker);

  const renderDuty = () => {
    const duty = ship.duty;
    const tasks = duty.visibleTasks;
    const done = tasks.filter((t) => t.completed).length;
    const items = tasks
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
        <span>${duty.phaseTitle}</span>
        <span>${done}/${tasks.length}</span>
      </div>
      ${items}
    `;
  };

  renderDuty();
  ship.onDutyChange = () => renderDuty();

  // Crisis Tracker HUD (Chapter 1)
  const crisisTracker = document.createElement("div");
  crisisTracker.id = "crisis-tracker";
  stage.appendChild(crisisTracker);

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
  stage.appendChild(explorationTracker);

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

  // Collapsible SideQuest Tracker HUD (left side, below Duty Tracker)
  const sqTracker = document.createElement("div");
  sqTracker.id = "sidequest-tracker";
  sqTracker.className = "collapsed";
  stage.appendChild(sqTracker);

  const renderSideQuests = () => {
    const snaps = ship.sideQuests.snapshot();
    const done = snaps.filter((q) => q.status === "completed").length;
    const isCollapsed = sqTracker.classList.contains("collapsed");
    const rowsHtml = snaps
      .map((q) => {
        const cls = q.status === "completed" ? "completed" : q.status === "active" ? "active" : "";
        const prog = q.status === "completed" ? "✓ 已完成" : `${q.doneCount}/${q.totalSteps}`;
        return `
          <div class="sq-row ${cls}">
            <div class="sq-row-title">
              <span>${q.title}</span>
              <span class="sq-prog">${prog}</span>
            </div>
            <div class="sq-row-step">${q.currentStepText}</div>
          </div>`;
      })
      .join("");

    sqTracker.innerHTML = `
      <button type="button" class="sq-header" title="展开/收起 2491 船员支线见闻录">
        <span>📜 船员支线档案 · ${done}/${snaps.length}</span>
        <span class="sq-toggle">${isCollapsed ? "展开 ▾" : "收起 ▴"}</span>
      </button>
      <div class="sq-list">${rowsHtml}</div>
    `;
    const btn = sqTracker.querySelector<HTMLButtonElement>(".sq-header");
    if (btn) {
      btn.onclick = () => {
        sqTracker.classList.toggle("collapsed");
        renderSideQuests();
      };
    }
  };

  renderSideQuests();
  ship.onSideQuestsChange = () => renderSideQuests();

  // Holographic 2D Ship Blueprint Minimap (M Key)
  const minimap = new ShipMinimap(app);
  const getMinimapState = () => ({
    playerCol: Math.floor(ship.player.centerX / TILE),
    totalCols: map.width,
    playerRow: Math.floor(ship.player.y / TILE),
    totalRows: map.height,
    placeLabel: ship.placeLabel,
    objectiveText: ship.crisis.isAlarmActive
      ? ship.crisis.currentObjective?.title ?? ""
      : ship.crisis.isResolved
      ? ship.exploration.currentObjective.title
      : ship.duty.visibleTasks.find((t) => !t.completed)?.title ?? "找轮机长老周汇报进度",
    isCrisisActive: ship.crisis.isAlarmActive,
    clearances: {
      midship: ship.security.hasClearance("midship_pass"),
      crisis: ship.security.hasClearance("crisis_override"),
      bridge: ship.security.hasClearance("bridge_pass"),
      cabin: ship.security.hasClearance("captain_auth")
    }
  });

  ship.onSecurityChange = () => {
    renderDuty();
    falloutHud?.sync(ship.rpg);
    if (minimap.visible) {
      minimap.render(getMinimapState());
    }
  };

  // Classic Fallout Docked Bottom Console & Character Sheet (Tab / C)
  falloutHud = new FalloutHud(app, assets, {
    onSelectMode: (mode) => {
      sounds.init();
      sounds.playClick();
      ship.rpg.activeMode = mode;
      falloutHud?.sync(ship.rpg);
    },
    onUseItem: (itemId) => {
      sounds.init();
      if (itemId === "med_stim" || itemId === "l1_herbal_kit" || itemId === "malt_drink") {
        ship.useConsumable(itemId);
        falloutHud?.sync(ship.rpg);
      }
    },
    onInvestSkill: (skill) => {
      sounds.init();
      if (ship.rpg.investSkillPoint(skill, 5)) {
        sounds.playBeep(880);
        falloutHud?.sync(ship.rpg);
      }
    },
    onSelectArchetype: (id) => {
      sounds.init();
      if (ship.rpg.canSwitchArchetype()) {
        ship.rpg.applyArchetype(id);
        sounds.playClick();
        falloutHud?.sync(ship.rpg);
      }
    }
  });
  falloutHud.sync(ship.rpg);
  ship.onRpgChange = () => falloutHud?.sync(ship.rpg);

  // Header Utility Toolbar (Zoom, Blueprint, Fullscreen, Popout)
  const toolsMount = hudTools ?? app;
  const actionToolbar = document.createElement("div");
  actionToolbar.id = "action-toolbar";

  let currentZoomIndex = 0;
  const zoomLevels = [1.0, 1.25, 1.5];
  const zoomBtn = document.createElement("button");
  zoomBtn.className = "toolbar-btn";
  zoomBtn.innerHTML = "🔍 1.0x <kbd>Z</kbd>";
  zoomBtn.title = "切换镜头缩放比例 (快捷键 Z)";
  const updateZoom = () => {
    const zoom = zoomLevels[currentZoomIndex];
    canvas.style.transform = zoom === 1 ? "none" : `scale(${zoom})`;
    canvas.style.transformOrigin = "center center";
    zoomBtn.innerHTML = `🔍 ${zoom.toFixed(2)}x <kbd>Z</kbd>`;
  };
  zoomBtn.onclick = () => {
    currentZoomIndex = (currentZoomIndex + 1) % zoomLevels.length;
    updateZoom();
    sounds.playClick();
  };

  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.className = "toolbar-btn";
  fullscreenBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"/></svg> 全屏 <kbd>F</kbd>`;
  fullscreenBtn.title = "进入/退出浏览器全屏 (快捷键 F)";
  fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    sounds.playClick();
  };

  const newTabBtn = document.createElement("button");
  newTabBtn.className = "toolbar-btn highlight";
  newTabBtn.innerHTML = "↗ 独立大屏";
  newTabBtn.title = "在独立的 Chrome 新标签页中开启全屏游玩";
  newTabBtn.onclick = () => {
    window.open(window.location.href, "_blank");
  };

  const minimapBtn = document.createElement("button");
  minimapBtn.id = "minimap-btn";
  minimapBtn.className = "toolbar-btn";
  minimapBtn.innerHTML = "🗺️ 蓝图 <kbd>M</kbd>";
  minimapBtn.title = "开启/关闭 2800米 全舰拓扑全息蓝图 (快捷键 M)";
  minimapBtn.onclick = () => {
    sounds.init();
    if (falloutHud?.characterOpen) falloutHud.closeCharacterSheet();
    minimap.toggle(getMinimapState);
    sounds.playClick();
  };

  actionToolbar.append(zoomBtn, minimapBtn, fullscreenBtn, newTabBtn);
  toolsMount.appendChild(actionToolbar);

  window.addEventListener("keydown", (e) => {
    sounds.init();
    if (e.code === "Tab") {
      e.preventDefault();
      if (minimap.visible) minimap.close();
      falloutHud?.toggleCharacterSheet();
      sounds.playClick();
      return;
    }
    if (e.code === "KeyC" && !ship.dialogue.isOpen) {
      if (minimap.visible) minimap.close();
      falloutHud?.toggleCharacterSheet();
      sounds.playClick();
      return;
    }
    if (e.code === "KeyM" && !ship.dialogue.isOpen) {
      if (falloutHud?.characterOpen) falloutHud.closeCharacterSheet();
      minimap.toggle(getMinimapState);
      sounds.playClick();
      return;
    }
    if (e.code === "KeyZ" && !ship.dialogue.isOpen) {
      currentZoomIndex = (currentZoomIndex + 1) % zoomLevels.length;
      updateZoom();
      sounds.playClick();
      return;
    }
    if (e.code === "KeyF") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      sounds.playClick();
      return;
    }
    if (e.code === "Escape") {
      if (falloutHud?.characterOpen) {
        falloutHud.closeCharacterSheet();
        sounds.playClick();
      } else if (minimap.visible) {
        minimap.close();
        sounds.playClick();
      }
    }
  });

  if (params.get("dialogue") === "1") {
    ship.interactInReach();
    dialogueBox.render(ship.dialogue.isOpen ? ship.dialogue : null);
  } else if (!spawnParam && params.get("intro") !== "0") {
    ship.beginWakeUpIntro();
    dialogueBox.render(ship.dialogue.isOpen ? ship.dialogue : null);
  }
}

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
  sideQuestsCompleted: number;
  sideQuestsTotal: number;
  currentMode: string;
  rpgLevel: number;
  rpgHp: number;
  rpgRad: number;
  waypointCount: number;
  securityClearances: string[];
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
    sideQuestsCompleted: ship.sideQuests.completedCount(),
    sideQuestsTotal: ship.sideQuests.all().length,
    currentMode: ship.currentMode,
    rpgLevel: ship.rpg.level,
    rpgHp: Math.round(ship.rpg.hp),
    rpgRad: Math.round(ship.rpg.rad),
    waypointCount: ship.player.waypoints.length,
    securityClearances: ship.security.grantedList(),
    artMissingCount: assets.missing().length,
    artFailureCount: assets.failures().length
  };
}

(window as unknown as { __probe: unknown }).__probe = readProbe;
(window as unknown as { ship: unknown }).ship = ship;

const probeElement = document.createElement("div");
probeElement.id = "debug-probe";
probeElement.hidden = true;
probeElement.style.display = "none";
document.body.appendChild(probeElement);

const debugMarker = new URLSearchParams(window.location.search).get("debug") === "1";

game.onAfterFrame(() => {
  const snapshot = readProbe();
  probeElement.textContent = JSON.stringify(snapshot);

  canvas.dataset.mode = ship.rpg.activeMode;
  canvas.dataset.hover = ship.hoveredTarget ? "1" : "0";
  falloutHud?.syncVitalsOnly(ship.rpg);

  if (status) {
    status.textContent = snapshot.targetLabel
      ? `${snapshot.targetLabel} · 按 E / 点击`
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
