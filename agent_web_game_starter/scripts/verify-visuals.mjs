import puppeteer from "puppeteer-core";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto("file:///home/antigravity/xiezhengtao13-sys/game2/index.html", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1200));

  const probeInit = await page.evaluate(() => window.__probe?.());
  console.log("Initial probe:", JSON.stringify(probeInit));
  if (!probeInit || probeInit.artMissingCount !== 0 || probeInit.artFailureCount !== 0) {
    throw new Error(`Asset integrity failure: ${JSON.stringify(probeInit)}`);
  }

  // 1. Initial wake-up dialogue screenshot
  await page.screenshot({ path: "/tmp/shot_01_wakeup.png" });
  console.log("Captured shot_01_wakeup.png");

  // Advance wake-up intro dialogue cleanly (both engine + UI)
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
  });
  await new Promise((r) => setTimeout(r, 400));

  // 2. Dorm A1 view after waking up
  await page.screenshot({ path: "/tmp/shot_02_dorm_a1.png" });
  console.log("Captured shot_02_dorm_a1.png");

  // 3. Examine Dorm A1 Locker
  await page.evaluate(() => {
    const locker = window.ship.examinable.find((e) => e.label.includes("A1 个人储物柜"));
    if (locker) window.ship.examine(locker);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_03_locker_examine.png" });
  console.log("Captured shot_03_locker_examine.png");

  // 4. Talk to roommate 小宋 (dorm_roommate) in Dorm A2
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
    const roommate = window.ship.examinable.find((e) => e.label.includes("小宋"));
    if (roommate) window.ship.examine(roommate);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_04_roommate_dialogue.png" });
  console.log("Captured shot_04_roommate_dialogue.png");

  // Advance to roommate branching choices
  await page.evaluate(() => {
    window.ship.dialogue.advance();
    window.ship.onDialogueChange?.(window.ship.dialogue.isOpen ? window.ship.dialogue : null);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_05_roommate_choices.png" });
  console.log("Captured shot_05_roommate_choices.png");

  // 5. Move to Mess Hall near cook_ma (老马) and capture scene without dialogue
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
    const cook = window.ship.people.find((p) => p.id === "cook_ma");
    if (cook) {
      window.ship.player.x = cook.x - 42;
      window.ship.player.y = cook.y + 8;
      window.ship.player.animation.face("right");
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "/tmp/shot_06_mess_hall_view.png" });
  console.log("Captured shot_06_mess_hall_view.png");

  // 6. Talk to cook_ma (老马)
  await page.evaluate(() => {
    const cookInteract = window.ship.examinable.find((e) => e.label.includes("老马"));
    if (cookInteract) window.ship.examine(cookInteract);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_07_cook_dialogue.png" });
  console.log("Captured shot_07_cook_dialogue.png");

  // Advance to cook choices
  await page.evaluate(() => {
    window.ship.dialogue.advance();
    window.ship.onDialogueChange?.(window.ship.dialogue.isOpen ? window.ship.dialogue : null);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_08_cook_choices.png" });
  console.log("Captured shot_08_cook_choices.png");

  // 7. Examine warming counter (全自动恒温暖餐柜)
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
    const warmer = window.ship.examinable.find((e) => e.label.includes("全自动恒温暖餐柜"));
    if (warmer) window.ship.examine(warmer);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_09_warmer_examine.png" });
  console.log("Captured shot_09_warmer_examine.png");

  // 8. Jump across representative zones with dialogue cleanly closed
  const zoneHops = [
    { file: "/tmp/shot_10_industrial_l2.png", tx: 10.5, ty: 101.5, facing: "up" },
    { file: "/tmp/shot_11_medical_cryo.png", tx: 41.0, ty: 125.0, facing: "up" },
    { file: "/tmp/shot_12_bridge_hall.png", tx: 43.5, ty: 28.5, facing: "up" },
    { file: "/tmp/shot_13_cabin_suite.png", tx: 41.5, ty: 49.0, facing: "up" },
    { file: "/tmp/shot_14_rehab_c7.png", tx: 11.5, ty: 125.5, facing: "up" },
    { file: "/tmp/shot_15_archives.png", tx: 72.5, ty: 126.5, facing: "down" },
    { file: "/tmp/shot_18_agri_l1.png", tx: 10.5, ty: 74.5, facing: "up" },
    { file: "/tmp/shot_19_ring_r1.png", tx: 72.5, ty: 74.5, facing: "right" },
    { file: "/tmp/shot_20_transit_shuttle.png", tx: 41.0, ty: 73.5, facing: "left" },
    { file: "/tmp/shot_21_hangar_pioneer.png", tx: 37.5, ty: 151.5, facing: "left" },
    { file: "/tmp/shot_22_reactor_bay.png", tx: 41.5, ty: 174.5, facing: "down" },
    { file: "/tmp/shot_23_propulsion_aft.png", tx: 42.0, ty: 194.0, facing: "down" },
    { file: "/tmp/shot_24_habitat_wet_dorm_b.png", tx: 45.0, ty: 108.5, facing: "right" }
  ];

  await page.evaluate(() => {
    window.ship.security.grant("midship_pass");
    window.ship.security.grant("bridge_pass");
    window.ship.security.grant("cabin_pass");
  });

  for (const hop of zoneHops) {
    await page.evaluate(({ tx, ty, facing }) => {
      window.ship.dialogue.close();
      window.ship.onDialogueChange?.(null);
      window.ship.player.x = tx * 48 - 16;
      window.ship.player.y = ty * 48 - 24;
      window.ship.player.animation.face(facing);
    }, hop);
    await new Promise((r) => setTimeout(r, 450));
    const p = await page.evaluate(() => window.__probe?.());
    console.log(`Hop ${hop.file} -> place=${p?.place}, pos=(${p?.playerX},${p?.playerY})`);
    await page.screenshot({ path: hop.file });
  }

  // 9. Trigger a side quest via Chen Ailin dialogue and expand #sidequest-tracker HUD
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
    const ailin = window.ship.examinable.find((e) => e.label.includes("和陈艾琳交谈"));
    if (ailin) window.ship.examine(ailin);
  });
  await new Promise((r) => setTimeout(r, 350));
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange?.(null);
  });
  await page.click("#sidequest-tracker .sq-header");
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "/tmp/shot_16_sidequest_tracker.png" });
  console.log("Captured shot_16_sidequest_tracker.png");

  // 10. Open [M] 15-compartment hull minimap overlay
  await page.keyboard.press("KeyM");
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: "/tmp/shot_17_minimap_15wings.png" });
  console.log("Captured shot_17_minimap_15wings.png");

  if (consoleErrors.length > 0) {
    throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
  }

  await browser.close();
  console.log("All visual verification steps completed cleanly with 0 errors!");
}

main().catch((err) => {
  console.error("Error in visual verification:", err);
  process.exit(1);
});
