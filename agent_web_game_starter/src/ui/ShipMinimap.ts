/**
 * Holographic Ship Blueprint Minimap Overlay (M Key)
 *
 * Provides a high-contrast tactical side-profile topology of the 2,800m Yuanwang
 * mothership, showing player coordinates, compartment sectors, and objective markers.
 */

export interface MinimapState {
  playerRow: number;
  totalRows: number;
  placeLabel: string;
  objectiveText: string;
  isCrisisActive: boolean;
}

export class ShipMinimap {
  private readonly container: HTMLDivElement;
  private isOpen = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.id = "ship-minimap-modal";
    this.container.style.display = "none";
    parent.appendChild(this.container);
  }

  get visible(): boolean {
    return this.isOpen;
  }

  toggle(stateProvider: () => MinimapState): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(stateProvider());
    }
  }

  open(state: MinimapState): void {
    this.isOpen = true;
    this.container.style.display = "flex";
    this.render(state);
  }

  close(): void {
    this.isOpen = false;
    this.container.style.display = "none";
  }

  render(state: MinimapState): void {
    const pct = Math.max(0, Math.min(100, (state.playerRow / state.totalRows) * 100));
    const distanceMeters = Math.round((state.playerRow / state.totalRows) * 2800);

    this.container.innerHTML = `
      <div class="minimap-panel">
        <div class="minimap-header">
          <div class="minimap-title">
            <span class="minimap-icon">🛰️</span>
            <span>远望号 2800 米全舰全息蓝图剖面 (HULL TOPOLOGY)</span>
          </div>
          <button id="minimap-close-btn" class="minimap-close">✕ 关闭 (M / ESC)</button>
        </div>

        <div class="minimap-hull-container">
          <!-- Ship Schematic Spine -->
          <div class="minimap-ship-spine">
            <!-- 7 Compartment Blocks -->
            <div class="hull-segment seg-bridge" title="0-300m: 舰桥核心区与舰长室">
              <span class="hull-tag">舰桥指挥区</span>
              <span class="hull-meter">0-300m</span>
            </div>
            <div class="hull-segment seg-transit" title="300-950m: 中央穿梭轨道枢纽">
              <span class="hull-tag">中央穿梭站</span>
              <span class="hull-meter">300-950m</span>
            </div>
            <div class="hull-segment seg-habitat" title="950-1400m: 船员生态与生活区">
              <span class="hull-tag">生态生活区</span>
              <span class="hull-meter">950-1400m</span>
            </div>
            <div class="hull-segment seg-cryo" title="1400-1800m: 冷冻休眠与医疗监护部">
              <span class="hull-tag">冷冻休眠区</span>
              <span class="hull-meter">1400-1800m</span>
            </div>
            <div class="hull-segment seg-hangar" title="1800-2200m: 机库与深空气闸舱">
              <span class="hull-tag">穿梭机库</span>
              <span class="hull-meter">1800-2200m</span>
            </div>
            <div class="hull-segment seg-industrial" title="2200-2500m: 重工业检修走廊">
              <span class="hull-tag">工业维护段</span>
              <span class="hull-meter">2200-2500m</span>
            </div>
            <div class="hull-segment seg-reactor" title="2500-2800m: 主聚变动力与散热翼区">
              <span class="hull-tag">聚变反应堆</span>
              <span class="hull-meter">2500-2800m</span>
            </div>

            <!-- Player Pin Beacon -->
            <div class="player-pin" style="top: ${pct.toFixed(1)}%;">
              <div class="player-pin-marker"></div>
              <div class="player-pin-label">📍 你在这里 (${distanceMeters}m / 2800m)</div>
            </div>
          </div>
        </div>

        <div class="minimap-footer">
          <div class="minimap-current-info">
            <span class="info-label">当前所在分区：</span>
            <span class="info-value text-cyan-300">${state.placeLabel}</span>
          </div>
          <div class="minimap-objective">
            <span class="info-label">任务引导：</span>
            <span class="info-value text-amber-300">${state.objectiveText}</span>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector("#minimap-close-btn")?.addEventListener("click", () => {
      this.close();
    });
  }
}
