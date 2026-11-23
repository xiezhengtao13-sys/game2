import { sound } from "../audio/soundEngine";
import { ENEMIES } from "../data/enemies";
import { getItem } from "../data/items";
import { ROOMS, TILE_PX } from "../data/rooms";
import type {
  DialogueLine,
  Direction,
  EnemyId,
  InputSnapshot,
  Rect,
  RoomDef,
  RoomObject,
  RouteState
} from "../types";
import { renderOverworld } from "./roomRenderer";

export interface OverworldCallbacks {
  onStartBattle: (enemyId: EnemyId) => void;
  onReachEnding: () => void;
}

export class OverworldEngine {
  readonly route: RouteState;
  private readonly callbacks: OverworldCallbacks;

  playerX = TILE_PX * 3.8;
  playerY = TILE_PX * 6.5;
  playerDir: Direction = "right";
  walkAnimTimer = 0;
  walkFrame = 0;
  t = 0;

  // Dialogue modal state
  dialogue: DialogueLine[] | null = null;
  dialogueIdx = 0;
  typedChars = 0;
  typeTimer = 0;
  pendingBattleAfterDialogue: EnemyId | null = null;
  pendingEndingAfterDialogue = false;

  // Field menu (`[C]` / `[Tab]`)
  menuOpen = false;
  menuIdx = 0;
  menuSub: "root" | "items" | "status" = "root";
  itemIdx = 0;

  // Room transition cooldown & locked door bounce guard
  exitCooldown = 0;

  constructor(route: RouteState, callbacks: OverworldCallbacks) {
    this.route = route;
    this.callbacks = callbacks;
    this.enterRoom(route.currentRoomId, this.playerX, this.playerY, "right");
  }

  get room(): RoomDef {
    return ROOMS[this.route.currentRoomId] ?? ROOMS.airlock;
  }

  enterRoom(roomId: string, spawnX: number, spawnY: number, dir: Direction): void {
    this.route.currentRoomId = roomId;
    this.playerX = spawnX;
    this.playerY = spawnY;
    this.playerDir = dir;
    this.exitCooldown = 0.25;
    sound.setMusic("wreck_ambient");

    const r = this.room;
    if (r.onEnterFlag && r.onEnterLines && !this.route.flags[r.onEnterFlag]) {
      this.route.flags[r.onEnterFlag] = true;
      this.openDialogue(r.onEnterLines(this.route));
    }
  }

  openDialogue(lines: DialogueLine[], options?: { battleAfter?: EnemyId; endingAfter?: boolean }): void {
    if (lines.length === 0) return;
    this.dialogue = lines;
    this.dialogueIdx = 0;
    this.typedChars = 0;
    this.typeTimer = 0;
    this.pendingBattleAfterDialogue = options?.battleAfter ?? null;
    this.pendingEndingAfterDialogue = options?.endingAfter ?? false;
  }

  /** Called right after returning from a won battle (spared or destroyed). */
  handleBattleComplete(enemyId: EnemyId, outcome: "spared" | "destroyed"): void {
    const def = ENEMIES[enemyId];
    sound.setMusic("wreck_ambient");

    // Grant MED-07 gift if spared!
    if (enemyId === "med07" && outcome === "spared" && !this.route.flags.med07_gift) {
      this.route.flags.med07_gift = true;
      this.route.items.push("fifth_ampoule");
    }

    const postLines = outcome === "spared" ? def.spareDialogue : def.destroyDialogue;
    const isFinale = enemyId === "charon";
    this.openDialogue(postLines, { endingAfter: isFinale });
  }

  update(dt: number, input: InputSnapshot): void {
    this.t += dt;
    if (this.exitCooldown > 0) this.exitCooldown = Math.max(0, this.exitCooldown - dt);

    // 1. Active Dialogue
    if (this.dialogue) {
      this.updateDialogue(dt, input);
      return;
    }

    // 2. Field Menu toggle (`C` or `Tab`)
    if (input.menuPressed) {
      if (this.menuOpen) {
        this.menuOpen = false;
        this.menuSub = "root";
        sound.playCancel();
      } else {
        this.menuOpen = true;
        this.menuSub = "root";
        this.menuIdx = 0;
        sound.playConfirm();
      }
      return;
    }

    if (this.menuOpen) {
      this.updateFieldMenu(input);
      return;
    }

    // 3. Player Movement (Crisp Deltarune feel!)
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;

    if (mx !== 0 || my !== 0) {
      if (Math.abs(mx) >= Math.abs(my)) {
        this.playerDir = mx < 0 ? "left" : "right";
      } else {
        this.playerDir = my < 0 ? "up" : "down";
      }
      const len = Math.hypot(mx, my);
      const speed = 225;
      const dx = (mx / len) * speed * dt;
      const dy = (my / len) * speed * dt;
      this.moveWithCollision(dx, dy);

      this.walkAnimTimer += dt;
      if (this.walkAnimTimer >= 0.13) {
        this.walkAnimTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      this.walkFrame = 0;
      this.walkAnimTimer = 0;
    }

    // 4. Step-on floor puzzle switches (instant tactile feedback!)
    this.checkStepSwitches();

    // 5. Auto-trigger boss/enemy ambushes when player enters confrontation range
    if (this.checkAutoTriggers()) return;

    // 6. Room exits
    if (this.exitCooldown <= 0 && this.checkExits()) return;

    // 7. Manual Interact (`[Z]` / `Enter` / `Space`)
    if (input.confirmPressed) {
      const target = this.findNearestInteractable();
      if (target) {
        this.interactWith(target);
      }
    }
  }

  private updateDialogue(dt: number, input: InputSnapshot): void {
    if (!this.dialogue) return;
    const line = this.dialogue[this.dialogueIdx];
    if (!line) {
      this.finishDialogue();
      return;
    }

    if (this.typedChars < line.text.length) {
      if (input.cancelPressed) {
        this.typedChars = line.text.length;
        return;
      }
      this.typeTimer += dt;
      while (this.typeTimer >= 0.024 && this.typedChars < line.text.length) {
        this.typeTimer -= 0.024;
        this.typedChars++;
        const ch = line.text[this.typedChars - 1];
        if (ch && ch !== " " && this.typedChars % 2 === 0) {
          sound.playVoiceBlip(line.voice ?? "narrator");
        }
      }
      return;
    }

    if (input.confirmPressed || (input.clickX !== null && input.clickY !== null)) {
      if (this.dialogueIdx + 1 < this.dialogue.length) {
        this.dialogueIdx++;
        this.typedChars = 0;
        this.typeTimer = 0;
        sound.playConfirm();
      } else {
        this.finishDialogue();
      }
    }
  }

  private finishDialogue(): void {
    const battle = this.pendingBattleAfterDialogue;
    const ending = this.pendingEndingAfterDialogue;
    this.dialogue = null;
    this.pendingBattleAfterDialogue = null;
    this.pendingEndingAfterDialogue = false;

    if (battle) {
      this.callbacks.onStartBattle(battle);
    } else if (ending) {
      this.callbacks.onReachEnding();
    }
  }

  private updateFieldMenu(input: InputSnapshot): void {
    if (input.cancelPressed) {
      sound.playCancel();
      if (this.menuSub !== "root") {
        this.menuSub = "root";
      } else {
        this.menuOpen = false;
      }
      return;
    }

    if (this.menuSub === "root") {
      if (input.upPressed) {
        this.menuIdx = (this.menuIdx + 2) % 3;
        sound.playMenuMove();
      } else if (input.downPressed) {
        this.menuIdx = (this.menuIdx + 1) % 3;
        sound.playMenuMove();
      } else if (input.confirmPressed) {
        sound.playConfirm();
        if (this.menuIdx === 0) {
          this.menuSub = "items";
          this.itemIdx = 0;
        } else if (this.menuIdx === 1) {
          this.menuSub = "status";
        } else {
          this.menuOpen = false;
        }
      }
      return;
    }

    if (this.menuSub === "items") {
      const len = this.route.items.length;
      if (len === 0) return;
      if (input.upPressed) {
        this.itemIdx = (this.itemIdx - 1 + len) % len;
        sound.playMenuMove();
      } else if (input.downPressed) {
        this.itemIdx = (this.itemIdx + 1) % len;
        sound.playMenuMove();
      } else if (input.confirmPressed) {
        const id = this.route.items[this.itemIdx];
        const it = id ? getItem(id) : undefined;
        if (!it) return;
        this.route.items.splice(this.itemIdx, 1);
        this.route.hp = Math.min(this.route.maxHp, this.route.hp + it.heal);
        sound.playHeal();
        this.menuOpen = false;
        this.menuSub = "root";
        this.openDialogue([{ speaker: "补给", portrait: "none", voice: "narrator", text: it.useText }]);
      }
    }
  }

  private moveWithCollision(dx: number, dy: number): void {
    const halfW = 14;
    const halfH = 10;

    const tryX = this.playerX + dx;
    if (!this.collidesAt(tryX, this.playerY, halfW, halfH)) {
      this.playerX = tryX;
    }
    const tryY = this.playerY + dy;
    if (!this.collidesAt(this.playerX, tryY, halfW, halfH)) {
      this.playerY = tryY;
    }
  }

  private collidesAt(cx: number, footY: number, halfW: number, halfH: number): boolean {
    const r: Rect = { x: cx - halfW, y: footY - halfH * 2, w: halfW * 2, h: halfH * 2 };
    const room = this.room;

    // Room bounds guard
    if (r.x < 0 || r.y < 0 || r.x + r.w > room.cols * TILE_PX || r.y + r.h > room.rows * TILE_PX) {
      return true;
    }

    for (const w of room.walls) {
      if (rectsOverlap(r, w)) return true;
    }

    for (const obj of room.objects) {
      if (!obj.solid) continue;
      if (obj.pickupItemId && this.route.flags[`picked_${obj.id}`]) continue;
      if (obj.enemyId && this.route.outcomes[obj.enemyId] === "destroyed") continue;
      const box: Rect = { x: obj.x + 4, y: obj.y + obj.h * 0.4, w: obj.w - 8, h: obj.h * 0.55 };
      if (rectsOverlap(r, box)) return true;
    }
    return false;
  }

  private checkStepSwitches(): void {
    for (const obj of this.room.objects) {
      if (obj.kind !== "relay_switch" || obj.switchIndex === undefined) continue;
      const flagKey = `cryo_sw_${obj.switchIndex}`;
      if (this.route.flags[flagKey]) continue;
      const cx = obj.x + obj.w / 2;
      const cy = obj.y + obj.h / 2;
      if (Math.hypot(this.playerX - cx, this.playerY - 8 - cy) <= 30) {
        this.activateRelaySwitch(obj.switchIndex);
      }
    }
  }

  private activateRelaySwitch(idx: number): void {
    const flagKey = `cryo_sw_${idx}`;
    if (this.route.flags[flagKey]) return;
    this.route.flags[flagKey] = true;
    sound.playPuzzleClick();

    const allLit =
      !!this.route.flags.cryo_sw_0 && !!this.route.flags.cryo_sw_1 && !!this.route.flags.cryo_sw_2;
    if (allLit && !this.route.flags.cryo_door_open) {
      this.route.flags.cryo_door_open = true;
      sound.playHeal();
      this.openDialogue([
        {
          speaker: "弥涅瓦-V",
          portrait: "minerva_v",
          voice: "minerva_v",
          color: "#4ade80",
          text: "* 咔嗒——全部 3 枚冰封压力继电器同步接通！东侧通往【信号中继厅】的防爆门锁解除了！"
        }
      ]);
    }
  }

  private checkAutoTriggers(): boolean {
    for (const obj of this.room.objects) {
      if (!obj.autoTriggerRadius || !obj.enemyId) continue;
      if (this.route.outcomes[obj.enemyId]) continue;
      const cx = obj.x + obj.w / 2;
      const cy = obj.y + obj.h / 2;
      if (Math.hypot(this.playerX - cx, this.playerY - 12 - cy) <= obj.autoTriggerRadius) {
        this.interactWith(obj);
        return true;
      }
    }
    return false;
  }

  private checkExits(): boolean {
    const pr: Rect = { x: this.playerX - 12, y: this.playerY - 18, w: 24, h: 18 };
    for (const ex of this.room.exits) {
      if (!rectsOverlap(pr, ex.rect)) continue;

      const blockedByEnemy = ex.requireEnemyResolved && !this.route.outcomes[ex.requireEnemyResolved];
      const blockedByFlag = ex.requireFlag && !this.route.flags[ex.requireFlag];
      if (blockedByEnemy || blockedByFlag) {
        sound.playCancel();
        // Gently nudge player back inside room
        if (ex.rect.x > TILE_PX * 10) this.playerX -= 28;
        else this.playerX += 28;
        this.exitCooldown = 0.35;
        if (ex.lockedText) {
          this.openDialogue([{ speaker: "封锁门禁", portrait: "none", voice: "narrator", text: ex.lockedText }]);
        }
        return true;
      }

      sound.playMenuMove();
      this.enterRoom(ex.targetRoomId, ex.spawnX, ex.spawnY, ex.spawnDir);
      return true;
    }
    return false;
  }

  findNearestInteractable(): RoomObject | null {
    let best: RoomObject | null = null;
    let bestDist = 72;
    for (const obj of this.room.objects) {
      if (obj.pickupItemId && this.route.flags[`picked_${obj.id}`]) continue;
      const cx = obj.x + obj.w / 2;
      const cy = obj.y + obj.h / 2;
      const d = Math.hypot(this.playerX - cx, this.playerY - 14 - cy);
      if (d < bestDist) {
        bestDist = d;
        best = obj;
      }
    }
    return best;
  }

  private interactWith(obj: RoomObject): void {
    if (obj.kind === "save_star") {
      this.route.hp = this.route.maxHp;
      this.route.saveRoomId = this.route.currentRoomId;
      this.route.saveX = this.playerX;
      this.route.saveY = this.playerY;
      sound.playHeal();
      if (obj.lines) this.openDialogue(obj.lines);
      return;
    }

    if (obj.kind === "relay_switch" && obj.switchIndex !== undefined) {
      this.activateRelaySwitch(obj.switchIndex);
      return;
    }

    if (obj.pickupItemId) {
      const flag = `picked_${obj.id}`;
      if (!this.route.flags[flag]) {
        this.route.flags[flag] = true;
        this.route.items.push(obj.pickupItemId);
        sound.playHeal();
        if (obj.lines) this.openDialogue(obj.lines);
      }
      return;
    }

    if (obj.setFlag) {
      this.route.flags[obj.setFlag] = true;
    }

    if (obj.enemyId) {
      const out = this.route.outcomes[obj.enemyId];
      if (!out) {
        sound.playConfirm();
        this.openDialogue(obj.lines ?? [], { battleAfter: obj.enemyId });
      } else if (out === "spared") {
        if (obj.sparedLines) this.openDialogue(obj.sparedLines);
      } else if (obj.destroyedLines) {
        this.openDialogue(obj.destroyedLines);
      }
      return;
    }

    if (obj.lines) {
      sound.playConfirm();
      this.openDialogue(obj.lines);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const nearest = !this.dialogue && !this.menuOpen ? this.findNearestInteractable() : null;
    renderOverworld(ctx, {
      room: this.room,
      route: this.route,
      playerX: this.playerX,
      playerY: this.playerY,
      playerDir: this.playerDir,
      walkFrame: this.walkFrame,
      t: this.t,
      promptLabel: nearest ? nearest.label : null,
      dialogue: this.dialogue,
      dialogueIdx: this.dialogueIdx,
      typedChars: this.typedChars,
      menuOpen: this.menuOpen,
      menuIdx: this.menuIdx,
      menuSub: this.menuSub,
      itemIdx: this.itemIdx
    });
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
