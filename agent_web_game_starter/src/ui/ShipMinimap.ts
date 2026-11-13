/**
 * Holographic 2D Ship Blueprint Minimap Overlay (M Key)
 *
 * Renders the full 2,800m Yuanwang colony ship topology across all 13 longitudinal
 * and lateral colonial wings (L-1, R-1, L-2, R-2, Fore Sensors, Stern Radiators),
 * showing real-time security clearance status and 2D crewman beacon coordinates.
 */

export interface MinimapState {
  playerCol: number;
  totalCols: number;
  playerRow: number;
  totalRows: number;
  placeLabel: string;
  objectiveText: string;
  isCrisisActive: boolean;
  clearances: {
    midship: boolean;
    crisis: boolean;
    bridge: boolean;
    cabin: boolean;
  };
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
    const colPct = Math.max(8, Math.min(92, (state.playerCol / Math.max(1, state.totalCols)) * 100));
    const rowPct = Math.max(3, Math.min(97, (state.playerRow / Math.max(1, state.totalRows)) * 100));
    const distanceMeters = Math.round((state.playerRow / Math.max(1, state.totalRows)) * 2800);

    const { midship, crisis, bridge, cabin } = state.clearances;

    const badge = (ok: boolean, lockText: string, okText = "已解锁") =>
      `<span class="hull-lock-badge ${ok ? "open" : "locked"}">${ok ? `🔓 ${okText}` : `🔒 ${lockText}`}</span>`;

    this.container.innerHTML = `
      <div class="minimap-panel">
        <div class="minimap-header">
          <div class="minimap-title">
            <span class="minimap-icon">🛰️</span>
            <span>远望号 2800米 全舰 13 仓段全息蓝图 (HULL TOPOLOGY)</span>
          </div>
          <button id="minimap-close-btn" class="minimap-close">✕ 关闭 (M / ESC)</button>
        </div>

        <div class="minimap-clearance-bar">
          <span class="clr-pill open">✓ 一级底层工勤区</span>
          <span class="clr-pill ${midship ? "open" : "locked"}">${midship ? "✓" : "🔒"} 二级中层/科研</span>
          <span class="clr-pill ${crisis ? "open" : "locked"}">${crisis ? "✓" : "🔒"} 损管/机库反应堆</span>
          <span class="clr-pill ${bridge ? "open" : "locked"}">${bridge ? "✓" : "🔒"} 指挥区舰桥</span>
          <span class="clr-pill ${cabin ? "open" : "special-locked"}">${cabin ? "✓" : "🔒"} 舰长私人舱室</span>
        </div>

        <div class="minimap-hull-container">
          <div class="minimap-ship-blueprint">
            <!-- Bow Fore Sensors (0-300m) -->
            <div class="bp-row bp-single">
              <div class="hull-segment seg-fore ${bridge ? "is-open" : "is-locked"}">
                <span class="hull-tag">前向探测与消融盾</span>
                ${badge(bridge, "需舰桥权限")}
                <span class="hull-meter">0-300m</span>
              </div>
            </div>

            <!-- Bridge & Captain's Quarters (300-550m) -->
            <div class="bp-row bp-split-cmd">
              <div class="hull-segment seg-bridge ${bridge ? "is-open" : "is-locked"}">
                <span class="hull-tag">舰桥指挥大厅</span>
                ${badge(bridge, "抢险特批")}
                <span class="hull-meter">300-460m</span>
              </div>
              <div class="hull-segment seg-cabin ${cabin ? "is-open" : "is-special-locked"}">
                <span class="hull-tag">舰长室</span>
                ${badge(cabin, "三级生物私钥", "完全公开")}
                <span class="hull-meter">460-550m</span>
              </div>
            </div>

            <!-- Midship Hub + L-1 Agri + R-1 Rotating Ring (550-1050m) -->
            <div class="bp-row bp-three">
              <div class="hull-segment seg-agri ${midship ? "is-open" : "is-locked"}">
                <span class="hull-tag">L-1 生态农业舱</span>
                ${badge(midship, "需中层卡")}
              </div>
              <div class="hull-segment seg-transit ${midship ? "is-open" : "is-locked"}">
                <span class="hull-tag">中央交通站 HUB</span>
                ${badge(midship, "需中层卡")}
                <span class="hull-meter">550-1050m</span>
              </div>
              <div class="hull-segment seg-ring ${midship ? "is-open" : "is-locked"}">
                <span class="hull-tag">R-1 440m旋转环</span>
                ${badge(midship, "需中层卡")}
              </div>
            </div>

            <!-- Lower Habitat (START) + L-2 Foundry (OPEN) + R-2 Science Lab (1050-1450m) -->
            <div class="bp-row bp-three">
              <div class="hull-segment seg-industrial is-open">
                <span class="hull-tag">L-2 重工业车间</span>
                ${badge(true, "", "初始开放")}
              </div>
              <div class="hull-segment seg-habitat is-open">
                <span class="hull-tag">船员生活区 [起点]</span>
                ${badge(true, "", "初始开放")}
                <span class="hull-meter">1050-1450m</span>
              </div>
              <div class="hull-segment seg-science ${midship ? "is-open" : "is-locked"}">
                <span class="hull-tag">R-2 深空科学室</span>
                ${badge(midship, "需中层卡")}
              </div>
            </div>

            <!-- Medical & Cryo (1450-1850m) -->
            <div class="bp-row bp-single">
              <div class="hull-segment seg-cryo ${midship ? "is-open" : "is-locked"}">
                <span class="hull-tag">U-1 医疗与 12,408 休眠舱区</span>
                ${badge(midship, "需中层卡")}
                <span class="hull-meter">1450-1850m</span>
              </div>
            </div>

            <!-- Hangar (1850-2250m) -->
            <div class="bp-row bp-single">
              <div class="hull-segment seg-hangar ${crisis ? "is-open" : "is-locked"}">
                <span class="hull-tag">D-1 气闸与拓荒者穿梭机机库</span>
                ${badge(crisis, "损管开放")}
                <span class="hull-meter">1850-2250m</span>
              </div>
            </div>

            <!-- Reactor (2250-2550m) -->
            <div class="bp-row bp-single">
              <div class="hull-segment seg-reactor ${crisis ? "is-open" : "is-locked"}">
                <span class="hull-tag">主聚变动力与应急散热排险泵房</span>
                ${badge(crisis, "损管开放")}
                <span class="hull-meter">2250-2550m</span>
              </div>
            </div>

            <!-- Propulsion & 1200m Radiator Wings (2550-2800m) -->
            <div class="bp-row bp-wide">
              <div class="hull-segment seg-propulsion ${crisis ? "is-open" : "is-locked"}">
                <span class="hull-tag">◄ 600m 左散热羽翼 │ 尾部主磁约束推进阵 │ 右散热羽翼 600m ►</span>
                ${badge(crisis, "损管开放")}
                <span class="hull-meter">2550-2800m</span>
              </div>
            </div>

            <!-- 2D Player Pin Beacon -->
            <div class="player-pin" style="left: ${colPct.toFixed(1)}%; top: ${rowPct.toFixed(1)}%;">
              <div class="player-pin-marker"></div>
              <div class="player-pin-label">📍 你 (${distanceMeters}m)</div>
            </div>
          </div>
        </div>

        <div class="minimap-footer">
          <div class="minimap-current-info">
            <span class="info-label">当前位置：</span>
            <span class="info-value info-zone">${state.placeLabel}</span>
          </div>
          <div class="minimap-objective">
            <span class="info-label">勤务引导：</span>
            <span class="info-value info-obj">${state.objectiveText}</span>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector("#minimap-close-btn")?.addEventListener("click", () => {
      this.close();
    });
  }
}
