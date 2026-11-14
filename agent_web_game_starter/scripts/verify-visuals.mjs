import puppeteer from "puppeteer-core";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  await page.goto("file:///home/antigravity/xiezhengtao13-sys/game2/index.html", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. Initial wake-up dialogue screenshot
  await page.screenshot({ path: "/tmp/shot_01_wakeup.png" });
  console.log("Captured shot_01_wakeup.png");

  // Advance wake-up intro dialogue
  await page.evaluate(() => {
    window.ship.dialogue.close();
    window.ship.onDialogueChange(null);
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
    const roommate = window.ship.examinable.find((e) => e.label.includes("小宋"));
    if (roommate) window.ship.examine(roommate);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_04_roommate_dialogue.png" });
  console.log("Captured shot_04_roommate_dialogue.png");

  // Advance to roommate branching choices
  await page.evaluate(() => {
    window.ship.dialogue.advance();
    window.ship.onDialogueChange(window.ship.dialogue.isOpen ? window.ship.dialogue : null);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_05_roommate_choices.png" });
  console.log("Captured shot_05_roommate_choices.png");

  // 5. Move to Mess Hall near cook_ma (老马) and examine
  await page.evaluate(() => {
    window.ship.dialogue.close();
    const cook = window.ship.people.find((p) => p.id === "cook_ma");
    if (cook) {
      window.ship.player.x = cook.x - 36;
      window.ship.player.y = cook.y;
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
    window.ship.onDialogueChange(window.ship.dialogue.isOpen ? window.ship.dialogue : null);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_08_cook_choices.png" });
  console.log("Captured shot_08_cook_choices.png");

  // 7. Examine warming counter (全自动恒温暖餐柜)
  await page.evaluate(() => {
    window.ship.dialogue.close();
    const warmer = window.ship.examinable.find((e) => e.label.includes("全自动恒温暖餐柜"));
    if (warmer) window.ship.examine(warmer);
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "/tmp/shot_09_warmer_examine.png" });
  console.log("Captured shot_09_warmer_examine.png");

  await browser.close();
  console.log("All visual verification steps completed successfully!");
}

main().catch((err) => {
  console.error("Error in visual verification:", err);
  process.exit(1);
});
