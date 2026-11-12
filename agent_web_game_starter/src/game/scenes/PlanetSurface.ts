import type { Input } from "../../engine/input/Input";
import type { Renderer } from "../../engine/graphics/Renderer";
import { Player, facingFor } from "../entities/Player";
import type { GameAssets } from "../assets";
import { findInteractable, reachPoint, type Interactable } from "../systems/Interaction";
import { Dialogue } from "../systems/Dialogue";
import { PLAYER_INTERACT_REACH, TILE } from "../config";
import type { ExplorationSystem } from "../systems/ExplorationSystem";

/**
 * Surface of Planet Farthest-IV (远境-IV 地表勘测现场).
 *
 * 28 cols x 18 rows (1344 x 864 px).
 */
export class PlanetSurface {
  readonly cols = 28;
  readonly rows = 18;
  readonly pixelWidth = 28 * TILE;
  readonly pixelHeight = 18 * TILE;

  readonly player: Player;
  private readonly assets: GameAssets | null;
  private readonly exploration: ExplorationSystem;
  private target: Interactable | null = null;
  private elapsedTime = 0;

  // Key interactive spots on the surface
  readonly landingShuttle = { x: 7 * TILE, y: 8 * TILE, label: "登机返航 · 拓荒者一号" };
  readonly beaconSite = { x: 14 * TILE, y: 8 * TILE, label: "部署科研中继信标" };
  readonly sampleSite = { x: 21 * TILE, y: 11 * TILE, label: "重氢冰晶露头" };

  private readonly interactables: Interactable[] = [];

  constructor(assets: GameAssets | null, exploration: ExplorationSystem) {
    this.assets = assets;
    this.exploration = exploration;
    // Spawn just outside the shuttle landing ramp
    this.player = new Player(8 * TILE, 9 * TILE);

    this.interactables = [
      { id: "surface_shuttle", label: this.landingShuttle.label, x: this.landingShuttle.x, y: this.landingShuttle.y, radius: 46 },
      { id: "surface_beacon", label: this.beaconSite.label, x: this.beaconSite.x, y: this.beaconSite.y, radius: 46 },
      { id: "surface_sample", label: this.sampleSite.label, x: this.sampleSite.x, y: this.sampleSite.y, radius: 46 }
    ];
  }

  get interactionTarget(): Interactable | null {
    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    return findInteractable(this.interactables, reach) ?? this.target;
  }

  get interactionLabel(): string | null {
    return this.interactionTarget?.label ?? null;
  }

  spawnAtLandingSite(): void {
    this.player.x = 8 * TILE;
    this.player.y = 9 * TILE;
    this.player.animation.face("down");
  }

  update(dt: number, input: Input): void {
    this.elapsedTime += dt;

    // Direct movement on the planetary surface
    const speed = 140; // px/s on low gravity alien surface
    let dx = 0;
    let dy = 0;
    if (input.isDown("KeyW") || input.isDown("ArrowUp")) dy -= 1;
    if (input.isDown("KeyS") || input.isDown("ArrowDown")) dy += 1;
    if (input.isDown("KeyA") || input.isDown("ArrowLeft")) dx -= 1;
    if (input.isDown("KeyD") || input.isDown("ArrowRight")) dx += 1;

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * speed * dt;
      dy = (dy / len) * speed * dt;
      this.player.x += dx;
      this.player.y += dy;
      this.player.animation.face(facingFor(dx, dy));
    }
    this.player.animation.update(dt, moving);

    // Clamp within surface exploration boundary
    this.player.x = Math.max(60, Math.min(this.pixelWidth - 60, this.player.x));
    this.player.y = Math.max(60, Math.min(this.pixelHeight - 60, this.player.y));

    // Interaction reach check
    const reach = reachPoint(
      this.player.centerX,
      this.player.y + this.player.height,
      this.player.facing,
      PLAYER_INTERACT_REACH
    );
    this.target = findInteractable(this.interactables, reach);
  }

  render(renderer: Renderer): void {
    // 1. Alien basalt terrain ground tiles
    const size = TILE;
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const isFrost = (tx * 7 + ty * 13) % 5 === 0;
        const tileAsset = isFrost ? "tile_window" : "tile_deck_dark";
        const img = this.assets?.image(tileAsset) ?? null;
        renderer.drawSprite(img, tx * size + size / 2, ty * size + size / 2, {
          anchor: "center",
          size: { w: size, h: size },
          fallbackColor: "#1e293b"
        });
      }
    }

    // 2. Landed Pioneer-1 Shuttle
    const shuttleImg = this.assets?.image("fx_holo_table") ?? null;
    renderer.drawSprite(shuttleImg, this.landingShuttle.x, this.landingShuttle.y, {
      anchor: "center",
      size: { w: 144, h: 96 },
      fallbackColor: "#e2e8f0"
    });
    renderer.drawWorldText("🚀 拓荒者一号 (着陆状态)", this.landingShuttle.x - 70, this.landingShuttle.y - 60, {
      color: "#93c5fd",
      size: 13
    });

    // 3. Research Beacon Site
    const beaconActive = this.exploration.beaconDeployed;
    const pulse = (Math.sin(this.elapsedTime * 6) + 1) / 2;
    if (beaconActive) {
      // Pulsing vertical beam
      renderer.drawRect(this.beaconSite.x - 6, this.beaconSite.y - 120, 12, 120, {
        color: `rgba(52, 211, 153, ${(0.4 + pulse * 0.4).toFixed(2)})`
      });
      renderer.drawWorldText("✅ 科研中继信标 · 信号满格", this.beaconSite.x - 80, this.beaconSite.y - 135, {
        color: "#6ee7b7",
        size: 13
      });
    }
    const beaconImg = this.assets?.image("fx_switch_panel") ?? null;
    renderer.drawSprite(beaconImg, this.beaconSite.x, this.beaconSite.y, {
      anchor: "center",
      size: { w: 96, h: 48 },
      fallbackColor: "#10b981"
    });

    // 4. Heavy Hydrogen Ice Outcrop
    const sampleDone = this.exploration.sampleCollected;
    const sampleImg = this.assets?.image("fx_plant") ?? null;
    renderer.drawSprite(sampleImg, this.sampleSite.x, this.sampleSite.y, {
      anchor: "center",
      size: { w: 48, h: 48 },
      fallbackColor: "#38bdf8"
    });
    renderer.drawWorldText(
      sampleDone ? "✅ 重氢样本已采集" : "💎 纯度99.4% 重氢冰晶",
      this.sampleSite.x - 60,
      this.sampleSite.y - 36,
      { color: sampleDone ? "#6ee7b7" : "#7dd3fc", size: 12 }
    );

    // 5. Player Character (EVA suit)
    const frame = this.player.animation.frame;
    const playerImg = this.assets?.image(frame.assetId) ?? null;
    renderer.drawSprite(playerImg, this.player.centerX, this.player.y + this.player.height, {
      anchor: "bottom-center",
      flipX: frame.flipX,
      size: { w: this.player.width, h: this.player.height },
      fallbackColor: "#ffffff"
    });

    // 6. Interaction Prompt E
    if (this.target) {
      const promptImg = this.assets?.image("ui_prompt_e") ?? null;
      renderer.drawSprite(promptImg, this.target.x, this.target.y - 32, {
        anchor: "bottom-center",
        size: { w: 32, h: 32 },
        fallbackColor: "#fde047"
      });
    }
  }
}
