/**
 * Chapter 2: Interstellar Exploration & Shuttle Navigation System
 *
 * Manages the state machine and objectives for Chapter 2:
 *   1. ready_to_board: Post Chapter 1, Pioneer-1 shuttle is cleared for maiden flight.
 *   2. launch_sequence: Depressurization, clamp disengagement, bay airlock opening.
 *   3. space_flight: Macro-scale spaceflight across the star system.
 *   4. approaching_planet: Close proximity to target planet Farthest-IV (远境-IV).
 *   5. surface_eva: Landed on planetary surface, EVA ground survey & sampling.
 *   6. chapter2_resolved: Scientific beacon deployed, rare deuterium crystals sampled, return ready.
 */

export type Chapter2Stage =
  | "ready_to_board"
  | "launch_sequence"
  | "space_flight"
  | "approaching_planet"
  | "surface_eva"
  | "chapter2_resolved";

export interface ExplorationObjective {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly done: boolean;
}

export class ExplorationSystem {
  private _stage: Chapter2Stage = "ready_to_board";
  private _beaconDeployed = false;
  private _sampleCollected = false;

  get stage(): Chapter2Stage {
    return this._stage;
  }

  get isSpaceFlightActive(): boolean {
    return (
      this._stage === "space_flight" ||
      this._stage === "approaching_planet"
    );
  }

  get isSurfaceActive(): boolean {
    return (
      this._stage === "surface_eva" ||
      this._stage === "chapter2_resolved"
    );
  }

  get isChapter2Done(): boolean {
    return this._stage === "chapter2_resolved";
  }

  get beaconDeployed(): boolean {
    return this._beaconDeployed;
  }

  get sampleCollected(): boolean {
    return this._sampleCollected;
  }

  get currentObjective(): ExplorationObjective {
    switch (this._stage) {
      case "ready_to_board":
        return {
          id: "board_shuttle",
          title: "登上「拓荒者一号」地表穿梭机",
          hint: "前往机库西侧登艇舷梯，准备启动深空首航出舱程序",
          done: false
        };
      case "launch_sequence":
        return {
          id: "launch_countdown",
          title: "机库减压与弹射出舱中",
          hint: "气闸内气压正在归零，解脱磁吸基座飞离远望号",
          done: false
        };
      case "space_flight":
        return {
          id: "navigate_farthest",
          title: "导航飞往目标行星「远境-IV」",
          hint: "驾驶穿梭机穿越开阳小行星环，向东南方冰封行星推进",
          done: false
        };
      case "approaching_planet":
        return {
          id: "enter_orbit",
          title: "切入行星引力井准备黑障着陆",
          hint: "已抵达「远境-IV」高轨，按 E 启动大气耐磨绝热瓦着陆程序",
          done: false
        };
      case "surface_eva":
        if (!this._beaconDeployed) {
          return {
            id: "deploy_beacon",
            title: "在地表展开科研引力中继信标",
            hint: "在着陆点前方的平坦玄武岩基座上按下 E 部署中继天线",
            done: false
          };
        }
        return {
          id: "collect_sample",
          title: "采集重氢冰晶聚变原料样本",
          hint: "勘测东侧的深蓝地质露头裂缝，获取高品位地外燃料",
          done: false
        };
      case "chapter2_resolved":
        return {
          id: "return_mothership",
          title: "地表初探完成 · 第二章结案",
          hint: "科研信标与重氢样本已齐备，可登机随时返航远望号",
          done: true
        };
    }
  }

  /** Advance from ready_to_board to launch_sequence. */
  startLaunchSequence(): boolean {
    if (this._stage !== "ready_to_board") return false;
    this._stage = "launch_sequence";
    return true;
  }

  /** Complete launch and enter space flight. */
  enterSpaceFlight(): boolean {
    if (this._stage !== "launch_sequence" && this._stage !== "surface_eva" && this._stage !== "chapter2_resolved") {
      return false;
    }
    this._stage = "space_flight";
    return true;
  }

  /** Called when shuttle approaches Planet Farthest-IV. */
  reachPlanetOrbit(): boolean {
    if (this._stage !== "space_flight") return false;
    this._stage = "approaching_planet";
    return true;
  }

  /** Land on planet surface from orbit. */
  landOnSurface(): boolean {
    if (this._stage !== "approaching_planet" && this._stage !== "space_flight") return false;
    this._stage = "surface_eva";
    return true;
  }

  /** Deploy surface research beacon. */
  deployBeacon(): boolean {
    if (this._stage !== "surface_eva") return false;
    this._beaconDeployed = true;
    if (this._sampleCollected) {
      this._stage = "chapter2_resolved";
    }
    return true;
  }

  /** Collect heavy hydrogen deuterium crystal sample. */
  collectSample(): boolean {
    if (this._stage !== "surface_eva") return false;
    this._sampleCollected = true;
    if (this._beaconDeployed) {
      this._stage = "chapter2_resolved";
    }
    return true;
  }

  /** Reset back to ready for deterministic testing. */
  reset(): void {
    this._stage = "ready_to_board";
    this._beaconDeployed = false;
    this._sampleCollected = false;
  }
}
