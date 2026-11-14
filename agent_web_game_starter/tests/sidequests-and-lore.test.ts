import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVES_ORIGIN,
  BRIDGE_ORIGIN,
  C7_ORIGIN,
  L1_ORIGIN,
  MEDICAL_ORIGIN,
  isFloor,
  placeAt
} from "../src/game/map/shipMap";
import { findSmartPath } from "../src/game/map/pathfinding";
import {
  AGRI_PROPS,
  ALL_SHIP_PEOPLE,
  ARCHIVES_PROPS,
  BRIDGE_PROPS,
  MEDICAL_PROPS,
  REHAB_PROPS,
  SHIP_PROPS
} from "../src/game/scenes/shipProps";
import { SideQuestSystem } from "../src/game/systems/SideQuestSystem";
import { ship } from "./shipWorld";

function examineByLabel(world: ReturnType<typeof ship>, labelSubstr: string): void {
  const item = world.examinable.find((e) => e.label.includes(labelSubstr));
  assert.ok(item, `Interactable containing "${labelSubstr}" must exist`);
  world.player.x = item.x - world.player.width / 2;
  world.player.y = item.y + item.radius - world.player.height;
  world.dialogue.close();
  // Invoke examine directly so tests exercise full ShipWorld side-quest & reward pipelines
  (world as unknown as { examine: (t: typeof item) => void }).examine(item);
}

describe("2491 post-Watch-Accord navigation, spatial layout & side quests", () => {
  test("midship_pass unlocks A* walking route from Crew Habitat through Medical Bay to C-7 and Archives", () => {
    const world = ship();
    const s = world.tileMap.tileSize;
    const start = { x: world.player.centerX, y: world.player.y + world.player.height - world.player.colliderHeight / 2 };
    const c7Dest = { x: (C7_ORIGIN.tx + 12) * s + s / 2, y: (C7_ORIGIN.ty + 8) * s + s / 2 };
    const archDest = { x: (ARCHIVES_ORIGIN.tx + 8) * s + s / 2, y: (ARCHIVES_ORIGIN.ty + 8) * s + s / 2 };
    const extraBlocked = (tx: number, ty: number) => world.security.isTileBlocked(tx, ty);

    const beforeC7 = findSmartPath(world.tileMap, start, c7Dest, { extraBlocked });
    const beforeArch = findSmartPath(world.tileMap, start, archDest, { extraBlocked });
    assert.equal(beforeC7.partialBlocked, true, "C-7 route is sealed behind security bulkheads before midship_pass");
    assert.equal(beforeArch.partialBlocked, true, "Archives route is sealed behind security bulkheads before midship_pass");

    world.security.grant("midship_pass");

    const afterC7 = findSmartPath(world.tileMap, start, c7Dest, { extraBlocked });
    const afterArch = findSmartPath(world.tileMap, start, archDest, { extraBlocked });
    assert.ok(afterC7.waypoints.length > 0, "player can A* walk to C-7 Rehab Center after midship_pass");
    assert.equal(afterC7.partialBlocked, false);
    assert.ok(afterArch.waypoints.length > 0, "player can A* walk to Archives after midship_pass");
    assert.equal(afterArch.partialBlocked, false);
    assert.equal(placeAt(Math.floor(c7Dest.x / s), Math.floor(c7Dest.y / s)), "rehab_center");
    assert.equal(placeAt(Math.floor(archDest.x / s), Math.floor(archDest.y / s)), "archives");
  });

  test("new wings, relocated vaults, L-1 weld, and Bridge oversight props have wall and NPC clearance", () => {
    const world = ship();
    const s = world.tileMap.tileSize;

    const checkedProps = [
      ...REHAB_PROPS,
      ...ARCHIVES_PROPS,
      ...MEDICAL_PROPS,
      ...AGRI_PROPS.filter((p) => p.label.includes("焊封")),
      ...BRIDGE_PROPS.filter((p) => p.label.includes("弥涅瓦-V"))
    ];

    for (const prop of checkedProps) {
      const x0 = Math.floor((prop.x - prop.w * s * 0.42) / s);
      const x1 = Math.floor((prop.x + prop.w * s * 0.42) / s);
      const y0 = Math.floor((prop.y - prop.h * s * 0.42) / s);
      const y1 = Math.floor((prop.y + prop.h * s * 0.42) / s);

      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const tile = world.tileMap.tileAt(tx, ty);
          assert.ok(
            isFloor(tile),
            `Prop "${prop.label}" overlaps non-floor tile "${tile}" at (${tx},${ty})`
          );
        }
      }
    }

    // Verify new NPCs stand on floor away from every prop bounding box center
    for (const pid of ["researcher_ailin", "rehab_subject", "archivist_lin", "advisor_vaughn"]) {
      const p = ALL_SHIP_PEOPLE.find((person) => person.id === pid);
      assert.ok(p, `NPC ${pid} missing`);
      const tx = Math.floor(p.x / s);
      const ty = Math.floor((p.y - 8) / s);
      assert.ok(isFloor(world.tileMap.tileAt(tx, ty)), `NPC ${p.name} not on walkable floor at (${tx},${ty})`);

      for (const prop of checkedProps) {
        const halfW = (prop.w * s) / 2;
        const halfH = (prop.h * s) / 2;
        const insideProp =
          p.x > prop.x - halfW &&
          p.x < prop.x + halfW &&
          p.y - 8 > prop.y - halfH &&
          p.y - 8 < prop.y + halfH;
        assert.equal(insideProp, false, `NPC ${p.name} overlaps prop "${prop.label}"`);
      }
    }

    assert.equal(L1_ORIGIN.tx, 2);
    assert.equal(MEDICAL_ORIGIN.tx, 27);
    assert.equal(BRIDGE_ORIGIN.ty, 18);
    assert.equal(C7_ORIGIN.tx, 2);
    assert.equal(ARCHIVES_ORIGIN.tx, 61);
  });

  test("SideQuestSystem supports out-of-order flags and prevents duplicate completion", () => {
    const sq = new SideQuestSystem();
    assert.equal(sq.completedCount(), 0);
    assert.equal(sq.canReportAilin(), false);

    // Inspect C-7 terminal and ward bed BEFORE meeting Chen Ailin
    const t1 = sq.recordFlag("decoded_fifth_protocol");
    assert.equal(t1.activated.length, 1);
    assert.equal(t1.activated[0].id, "ailin_memory");

    sq.recordFlag("checked_ward_bed");
    assert.equal(sq.canReportAilin(), false, "must also talk to Ailin before reporting");

    // Duplicate flag is a clean no-op
    const dup = sq.recordFlag("decoded_fifth_protocol");
    assert.equal(dup.activated.length, 0);
    assert.equal(dup.completed.length, 0);

    sq.recordFlag("talked_ailin");
    assert.equal(sq.canReportAilin(), true);

    const fin = sq.recordFlag("reported_ailin");
    assert.equal(fin.completed.length, 1);
    assert.equal(fin.completed[0].id, "ailin_memory");
    assert.equal(sq.completedCount(), 1);
    assert.equal(sq.canReportAilin(), false);
  });

  test("all 4 side quests complete end-to-end in ShipWorld with items, passive stats & XP", () => {
    const world = ship();
    const baseSci = world.rpg.getSkill("science");
    const baseSpeech = world.rpg.getSkill("speech");
    const basePer = world.rpg.getSkill("perception");
    const xpStart = world.rpg.xp;

    // 1. Chen Ailin's Missing Memories
    examineByLabel(world, "和陈艾琳交谈");
    examineByLabel(world, "康复监护床·二号");
    examineByLabel(world, "第五协议校验隔离终端");
    assert.equal(world.sideQuests.canReportAilin(), true);
    examineByLabel(world, "和陈艾琳交谈");
    assert.equal(world.sideQuests.get("ailin_memory").status, "completed");
    assert.equal(world.rpg.hasItem("ailin_notes"), true);
    assert.equal(world.rpg.getSkill("science"), baseSci + 8, "ailin_notes boosts science +8");

    // Verify no duplicate item/XP on repeat talk
    const xpAfterQ1 = world.rpg.xp + world.rpg.level * 250;
    examineByLabel(world, "和陈艾琳交谈");
    assert.equal(world.rpg.items.get("ailin_notes")?.quantity, 1);
    assert.equal(world.rpg.xp + world.rpg.level * 250, xpAfterQ1);

    // 2. MNA-01 & Charon Enigma
    examineByLabel(world, "和档案馆管理员林文交谈");
    examineByLabel(world, "MNA-01 研究员公共工作席");
    examineByLabel(world, "和平号移交：卡戎号遇袭目击卷宗");
    assert.equal(world.sideQuests.get("mna01_archives").status, "completed");
    assert.equal(world.rpg.hasItem("nine_ships_microchip"), true);
    assert.equal(world.rpg.getSkill("speech"), baseSpeech + 8, "nine_ships_microchip boosts speech +8");

    // 3. L-1 Old Weld & Non-Prosthetic Crew
    examineByLabel(world, "2488 应急分离焊封止动栓");
    examineByLabel(world, "和生态农艺师说话");
    examineByLabel(world, "和休眠监护员说话");
    assert.equal(world.sideQuests.get("l1_scars").status, "completed");
    assert.equal(world.rpg.hasItem("l1_herbal_kit"), true);

    // Test consumable recovery on l1_herbal_kit
    world.rpg.damage(30, 40, "test burn");
    assert.equal(world.useConsumable("l1_herbal_kit"), true);
    assert.equal(world.rpg.rad, 0, "l1_herbal_kit purges thermal strain");

    // 4. Vaughn, Minerva-V & Kane's Accord
    examineByLabel(world, "弥涅瓦-V · 主舰双监督审计台");
    examineByLabel(world, "和船长顾问沃恩交谈");
    examineByLabel(world, "太阳系七年战争与守望协定档案柜");
    assert.equal(world.sideQuests.get("vaughn_oversight").status, "completed");
    assert.equal(world.rpg.hasItem("kane_watch_token"), true);
    assert.equal(world.rpg.getSkill("perception"), basePer + 8, "kane_watch_token boosts perception +8");

    assert.equal(world.sideQuests.completedCount(), 4);
    assert.ok(world.rpg.level > 1 || world.rpg.xp > xpStart, "completing 4 quests grants substantial XP");
  });

  test("lore regression guard: zero outdated 30-year or Minerva-B strings in ship props & crew", () => {
    const outdated = /三十年|二十九年|二十八年|29年|30年|二十年前|弥涅瓦-B/;
    for (const prop of SHIP_PROPS) {
      assert.equal(outdated.test(prop.label), false, `Outdated lore in prop label: ${prop.label}`);
      for (const line of prop.lines ?? []) {
        assert.equal(outdated.test(line.text), false, `Outdated lore in prop "${prop.label}": ${line.text}`);
      }
    }
    for (const person of ALL_SHIP_PEOPLE) {
      assert.equal(outdated.test(person.name), false, `Outdated lore in crew name: ${person.name}`);
      for (const line of person.lines) {
        assert.equal(outdated.test(line.text), false, `Outdated lore in crew "${person.name}": ${line.text}`);
      }
    }
  });
});
