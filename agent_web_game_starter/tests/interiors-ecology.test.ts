import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHIVES_ORIGIN,
  BRIDGE_ORIGIN,
  C7_ORIGIN,
  CABIN_ORIGIN,
  FORE_ORIGIN,
  HABITAT_ORIGIN,
  HANGAR_ORIGIN,
  L1_ORIGIN,
  L2_ORIGIN,
  MEDICAL_ORIGIN,
  PROPULSION_ORIGIN,
  R1_ORIGIN,
  R2_ORIGIN,
  REACTOR_ORIGIN,
  TRANSIT_ORIGIN,
  isFloor,
  shipSpawn
} from "../src/game/map/shipMap";
import {
  AGRI_PROPS,
  ALL_SHIP_PEOPLE,
  ARCHIVES_PROPS,
  FORE_PROPS,
  HABITAT_PROPS,
  HANGAR_PROPS,
  INDUSTRIAL_PROPS,
  MEDICAL_PROPS,
  PROPULSION_PROPS,
  REACTOR_PROPS,
  REHAB_PROPS,
  RING_PROPS,
  SCIENCE_PROPS,
  TRANSIT_PROPS
} from "../src/game/scenes/shipProps";
import {
  renderShipInteriorFloorDetails,
  renderShipInteriorPropDetailsAndBots
} from "../src/game/scenes/shipInteriors";
import type { Renderer } from "../src/engine/graphics/Renderer";
import { TILE } from "../src/game/config";
import { ship } from "./shipWorld";

function makeMockRenderer(worldX: number, worldY: number, withOptionals: boolean): Renderer & { counts: Record<string, number> } {
  const counts: Record<string, number> = { rect: 0, text: 0, line: 0, ellipse: 0, light: 0 };
  const cam = {
    worldX,
    worldY,
    viewportWidth: 1280,
    viewportHeight: 800,
    follow: () => {},
    snap: () => {}
  };
  const base: Renderer & { counts: Record<string, number> } = {
    counts,
    width: 1280,
    height: 800,
    camera: cam,
    clear: () => {},
    drawRect: () => { counts.rect++; },
    drawSprite: () => {},
    drawText: () => {},
    drawWorldText: () => { counts.text++; }
  };
  if (withOptionals) {
    base.drawLine = () => { counts.line++; };
    base.drawEllipse = () => { counts.ellipse++; };
    base.drawRadialLight = () => { counts.light++; };
    base.drawGradientRect = () => {};
  }
  return base;
}

describe("interior compartment furnishings, 1:1 floor clearance & vector details", () => {
  test("all upgraded compartment furnishings sit purely on walkable floor and never collide with NPCs or player spawn", () => {
    const world = ship();
    const s = world.tileMap.tileSize;
    const spawn = shipSpawn(s);
    const spawnFootY = spawn.y + 40;

    const propsToCheck = [
      ...FORE_PROPS,
      ...TRANSIT_PROPS,
      ...AGRI_PROPS,
      ...RING_PROPS,
      ...HABITAT_PROPS,
      ...INDUSTRIAL_PROPS,
      ...SCIENCE_PROPS,
      ...MEDICAL_PROPS,
      ...REHAB_PROPS,
      ...ARCHIVES_PROPS,
      ...HANGAR_PROPS,
      ...REACTOR_PROPS,
      ...PROPULSION_PROPS
    ];

    for (const prop of propsToCheck) {
      const x0 = Math.floor((prop.x - prop.w * s * 0.42) / s);
      const x1 = Math.floor((prop.x + prop.w * s * 0.42) / s);
      const y0 = Math.floor((prop.y - prop.h * s * 0.42) / s);
      const y1 = Math.floor((prop.y + prop.h * s * 0.42) / s);

      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const tile = world.tileMap.tileAt(tx, ty);
          assert.ok(
            isFloor(tile),
            `Prop "${prop.label}" (${prop.assetId}) overlaps non-floor "${tile}" at (${tx},${ty})`
          );
        }
      }

      const halfW = (prop.w * s) / 2;
      const halfH = (prop.h * s) / 2;
      const hitsSpawn =
        spawn.x > prop.x - halfW &&
        spawn.x < prop.x + halfW &&
        spawnFootY > prop.y - halfH &&
        spawnFootY < prop.y + halfH;
      assert.equal(hitsSpawn, false, `Prop "${prop.label}" overlaps player spawn point`);

      for (const person of ALL_SHIP_PEOPLE) {
        const overlapsNpc =
          person.x > prop.x - halfW &&
          person.x < prop.x + halfW &&
          person.y - 8 > prop.y - halfH &&
          person.y - 8 < prop.y + halfH;
        assert.equal(overlapsNpc, false, `Prop "${prop.label}" overlaps NPC "${person.name}"`);
      }
    }
  });

  test("enriched compartments contain domain-specific furnishings, chairs around tables, lockers, and labs", () => {
    const hasLabel = (arr: readonly { label: string }[], sub: string) => arr.some((p) => p.label.includes(sub));

    assert.ok(hasLabel(HABITAT_PROPS, "便签写字台"));
    assert.ok(hasLabel(HABITAT_PROPS, "餐桌西座") && hasLabel(HABITAT_PROPS, "自助饮水"));
    assert.ok(hasLabel(HABITAT_PROPS, "B1 轮休班储物柜") && hasLabel(HABITAT_PROPS, "B2 轮休班储物柜"));
    assert.ok(hasLabel(AGRI_PROPS, "微藻光反应器列") && hasLabel(AGRI_PROPS, "常绿固碳灌木槽"));
    assert.ok(hasLabel(RING_PROPS, "麦芽茶饮服务台") && hasLabel(RING_PROPS, "体能训练台"));
    assert.ok(hasLabel(INDUSTRIAL_PROPS, "钛铝合金胚料架") && hasLabel(INDUSTRIAL_PROPS, "焊修钳工台"));
    assert.ok(hasLabel(SCIENCE_PROPS, "无尘风淋") && hasLabel(SCIENCE_PROPS, "辐射耐受对比"));
    assert.ok(hasLabel(MEDICAL_PROPS, "无菌药械与冷藏血浆柜"));
    assert.ok(hasLabel(REHAB_PROPS, "手工绘画与认知拼图桌"));
    assert.ok(hasLabel(ARCHIVES_PROPS, "物理只读光隔离磁带"));
    assert.ok(hasLabel(HANGAR_PROPS, "微重力密封备件箱架"));
    assert.ok(hasLabel(REACTOR_PROPS, "冷却泵压手检表") && hasLabel(REACTOR_PROPS, "蓄能压力缸表"));
  });

  test("interior architecture & bot render passes work cleanly across all 15 compartments with or without optional primitives", () => {
    const world = ship();
    const origins = [
      FORE_ORIGIN,
      BRIDGE_ORIGIN,
      CABIN_ORIGIN,
      TRANSIT_ORIGIN,
      L1_ORIGIN,
      R1_ORIGIN,
      HABITAT_ORIGIN,
      L2_ORIGIN,
      R2_ORIGIN,
      MEDICAL_ORIGIN,
      C7_ORIGIN,
      ARCHIVES_ORIGIN,
      HANGAR_ORIGIN,
      REACTOR_ORIGIN,
      PROPULSION_ORIGIN
    ];

    for (const withOptionals of [false, true]) {
      for (const crisis of [false, true]) {
        let totalRects = 0;
        let totalTexts = 0;
        for (const o of origins) {
          const mock = makeMockRenderer(o.tx * TILE - 80, o.ty * TILE - 80, withOptionals);
          renderShipInteriorFloorDetails(mock, world.tileMap, HABITAT_PROPS, 12.5, crisis);
          renderShipInteriorPropDetailsAndBots(
            mock,
            world.tileMap,
            [
              ...FORE_PROPS,
              ...TRANSIT_PROPS,
              ...AGRI_PROPS,
              ...RING_PROPS,
              ...HABITAT_PROPS,
              ...INDUSTRIAL_PROPS,
              ...SCIENCE_PROPS,
              ...MEDICAL_PROPS,
              ...REHAB_PROPS,
              ...ARCHIVES_PROPS,
              ...HANGAR_PROPS,
              ...REACTOR_PROPS,
              ...PROPULSION_PROPS
            ],
            12.5,
            crisis
          );
          totalRects += mock.counts.rect;
          totalTexts += mock.counts.text;
        }
        assert.ok(totalRects > 200, `Expected rich architectural primitives across 15 compartments, got ${totalRects}`);
        assert.ok(totalTexts >= 15, `Expected stenciled zone headers across compartments, got ${totalTexts}`);
      }
    }
  });
});
