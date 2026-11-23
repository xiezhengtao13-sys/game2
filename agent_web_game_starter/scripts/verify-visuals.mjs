import puppeteer from "puppeteer-core";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto("file:///home/antigravity/xiezhengtao13-sys/game2/index.html", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 700));

  const initProbe = await page.evaluate(() => window.__probe?.());
  console.log("01 Title probe:", JSON.stringify(initProbe));
  await page.screenshot({ path: "/tmp/ut_01_title.png" });

  // 2. Intro slide
  await page.keyboard.press("KeyZ");
  await new Promise((r) => setTimeout(r, 450));
  await page.keyboard.press("KeyZ"); // complete typewriter
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: "/tmp/ut_02_intro.png" });

  // 3. Overworld Room 1: Breached Airlock + opening radio portrait dialogue
  await page.evaluate(() => window.__game.skipIntroToOverworld());
  await new Promise((r) => setTimeout(r, 650));
  await page.screenshot({ path: "/tmp/ut_03_room1_airlock_dialogue.png" });

  // Dismiss dialogue & show Room 1 cleanly
  await page.evaluate(() => {
    window.__game.overworld.dialogue = null;
  });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: "/tmp/ut_04_room1_airlock_clear.png" });

  // 4. Overworld Room 2: Frozen Conservatory
  await page.evaluate(() => {
    window.__game.overworld.enterRoom("cryo", 240, 310, "right");
    window.__game.overworld.dialogue = null;
    window.__game.route.flags.cryo_sw_0 = true;
  });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: "/tmp/ut_05_room2_cryo.png" });

  // 5. Overworld Room 4: Scorched Corridor + Vark
  await page.evaluate(() => {
    window.__game.overworld.enterRoom("corridor", 360, 310, "right");
    window.__game.overworld.dialogue = null;
  });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: "/tmp/ut_06_room4_corridor.png" });

  // 6. Overworld Room 5: Shattered Core Sanctum (Judgement Bridge)
  await page.evaluate(() => {
    window.__game.overworld.enterRoom("sanctum", 380, 310, "right");
    window.__game.overworld.dialogue = null;
  });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: "/tmp/ut_07_room5_sanctum.png" });

  // 7. Battle: MED-07 BLUE Soul 0.45g Gravity Dodge!
  await page.evaluate(() => {
    window.__game.startBattleImmediate("med07");
    const b = window.__game.battle;
    b.tp = 42;
    b.phase = "enemy_talk";
    b.bubbleTimer = 0;
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: "/tmp/ut_08_battle_med07_blue.png" });

  // 8. Battle: SYNC-WEAVER YELLOW Soul Shooter!
  await page.evaluate(() => {
    window.__game.startBattleImmediate("weaver");
    const b = window.__game.battle;
    b.tp = 55;
    b.phase = "enemy_talk";
    b.bubbleTimer = 0;
  });
  await new Promise((r) => setTimeout(r, 1250));
  await page.keyboard.press("KeyZ");
  await new Promise((r) => setTimeout(r, 140));
  await page.screenshot({ path: "/tmp/ut_09_battle_weaver_yellow.png" });

  // 9. Battle: MID-BOSS EXECUTOR VARK GREEN Soul 4-Way Shield + Speech Bubble & Spears!
  await page.evaluate(() => {
    window.__game.startBattleImmediate("vark");
    const b = window.__game.battle;
    b.tp = 68;
    b.phase = "enemy_talk";
    b.bubbleTimer = 0;
  });
  await new Promise((r) => setTimeout(r, 1150));
  await page.screenshot({ path: "/tmp/ut_10_battle_vark_green.png" });

  // 10. Battle: FINAL BOSS CHARON-Ω (ACT submenu & Speech Bubble + Spareable Golden Glow!)
  await page.evaluate(() => {
    window.__game.startBattleImmediate("charon");
    const b = window.__game.battle;
    b.tp = 75;
    b.selectedBtn = 1;
    b.phase = "submenu";
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "/tmp/ut_11_battle_charon_menu.png" });

  // 11. Battle: GENOCIDE / RUTHLESS CHARON-Ω (Unhinged Crimson + Slashed MERCY!)
  await page.evaluate(() => {
    window.__game.route.kills = 4;
    window.__game.startBattleImmediate("charon");
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/ut_12_battle_charon_ruthless.png" });

  // 12. True Pacifist Watch-Accord Ending!
  await page.evaluate(() => {
    window.__game.route.kills = 0;
    window.__game.route.spares = 5;
    window.__game.route.totalGraze = 48;
    window.__game.route.outcomes.charon = "spared";
    window.__game.enterEnding();
  });
  await new Promise((r) => setTimeout(r, 450));
  await page.screenshot({ path: "/tmp/ut_13_ending_pacifist.png" });

  const winErrors = await page.evaluate(() => window.__errors || []);
  if (consoleErrors.length > 0 || winErrors.length > 0) {
    throw new Error(`Errors detected: ${JSON.stringify({ consoleErrors, winErrors })}`);
  }

  await browser.close();
  console.log("All 13 Undertale-reboot visual checks completed cleanly with 0 errors!");
}

main().catch((err) => {
  console.error("Visual verification failed:", err);
  process.exit(1);
});
