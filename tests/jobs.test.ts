import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Jobs, JOBS, jobById } from "../src/game/systems/Jobs";
import { NO_JOB_HINT, NOTICE_BOARD_TITLE, offerIndexForKey, offerLine } from "../src/game/text/jobs";
import { dialogueFor, interactablesWithDialogue } from "../src/game/text/dialogue";
import { workbenchIds } from "../src/game/text/workbenches";
import { TOWN_INTERACTABLES, createTownMap } from "../src/game/map/townMap";
import { TownWorld } from "../src/game/TownWorld";
import { findInteractable, reachPoint } from "../src/game/systems/Interaction";
import { PLAYER_INTERACT_REACH } from "../src/game/config";
import type { Input } from "../src/engine/input/Input";

// TASK-111: choosing a job at the notice board. Two things must hold: the board
// guides the player while no job is taken, and it does not re-offer work that
// has already been accepted.

function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

/** A world with the player standing at the notice board, facing it. */
function worldAtBoard() {
  const world = new TownWorld(createTownMap(), null);
  const board = TOWN_INTERACTABLES.find((i) => i.id === "noticeboard")!;

  world.player.x = board.x - world.player.width / 2;
  world.player.y = board.y + 48 - world.player.height;
  world.player.animation.face("up");
  return { world, board };
}

/** Open the board with E. */
function openBoard(world: TownWorld) {
  world.update(0.016, fakeInput(["KeyW"], ["KeyE"]));
}

describe("Jobs (TASK-111)", () => {
  test("starts with no job", () => {
    const jobs = new Jobs();

    assert.equal(jobs.taken, null);
    assert.equal(jobs.hasJob, false);
    assert.equal(jobs.job, null);
  });

  test("taking a job records it", () => {
    const jobs = new Jobs();

    assert.equal(jobs.take("farmer"), true);
    assert.equal(jobs.taken, "farmer");
    assert.equal(jobs.hasJob, true);
    assert.equal(jobs.job?.name, "农夫");
  });

  test("taking the same job twice reports that it was not new", () => {
    const jobs = new Jobs();
    jobs.take("farmer");

    assert.equal(jobs.take("farmer"), false, "should report it was already held");
    assert.equal(jobs.taken, "farmer", "and must not lose it");
  });

  test("offers flag which job is already taken", () => {
    const jobs = new Jobs();

    assert.deepEqual(
      jobs.offers().map((o) => o.taken),
      [false]
    );

    jobs.take("farmer");

    assert.deepEqual(
      jobs.offers().map((o) => o.taken),
      [true]
    );
  });

  test("there is at least one job, and each is fully described", () => {
    assert.ok(JOBS.length > 0);
    for (const job of JOBS) {
      assert.ok(job.name.length > 0, `${job.id} has no name`);
      assert.ok(job.description.length > 0, `${job.id} has no description`);
      assert.ok(job.takenText.length > 0, `${job.id} has no taken text`);
    }
  });

  test("job lookup by id", () => {
    assert.equal(jobById("farmer")?.id, "farmer");
  });
});

describe("the notice board text (TASK-111)", () => {
  test("an offer line shows its number, name and description", () => {
    const line = offerLine(0, "农夫", "照料镇南那块地。", false);

    assert.match(line, /^1\. /, "the number to press should lead the line");
    assert.match(line, /农夫/);
    assert.match(line, /照料镇南那块地。/);
    assert.ok(!line.includes("已接下"), "an untaken job should not be marked as taken");
  });

  test("a taken job is marked as such", () => {
    assert.match(offerLine(0, "农夫", "说明", true), /已接下/);
  });

  test("the no-job hint tells the player which key to press", () => {
    assert.match(NO_JOB_HINT, /1/, "the hint should name the key");
    assert.match(NO_JOB_HINT, /农夫/);
  });

  test("number keys map to offers, and out-of-range keys map to nothing", () => {
    assert.equal(offerIndexForKey("Digit1", 1), 0);
    assert.equal(offerIndexForKey("Digit2", 3), 1);
    assert.equal(offerIndexForKey("Digit3", 3), 2);

    assert.equal(offerIndexForKey("Digit4", 3), null, "beyond the last offer");
    assert.equal(offerIndexForKey("Digit1", 0), null, "no offers at all");
    assert.equal(offerIndexForKey("Digit0", 3), null, "0 is not an offer key");
    assert.equal(offerIndexForKey("KeyE", 3), null, "letters are not offer keys");
    assert.equal(offerIndexForKey("Numpad1", 3), null, "the numpad is a different key");
  });
});

describe("the notice board in the world (TASK-111)", () => {
  test("it is prompted when the player stands at it", () => {
    const { world } = worldAtBoard();
    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "noticeboard");
  });

  test("with no job taken, opening it lists the offers and the hint", () => {
    const { world } = worldAtBoard();

    openBoard(world);

    assert.equal(world.dialogue.isOpen, true);
    const all = world.dialogue.lineCount;
    assert.ok(all >= 2, "expected an offer plus the hint");

    // Walk the whole board and collect the text.
    const texts: string[] = [world.dialogue.current!.text];
    while (world.dialogue.isOpen) {
      world.update(0.016, fakeInput([], ["Space"]));
      if (world.dialogue.isOpen) texts.push(world.dialogue.current!.text);
    }

    const joined = texts.join("\n");
    assert.match(joined, /农夫/, "the offer should name the job");
    assert.match(joined, /按 1/, "and say which key takes it");
  });

  test("pressing 1 takes the farmer job", () => {
    const { world } = worldAtBoard();
    openBoard(world);
    assert.equal(world.jobs.hasJob, false);

    world.update(0.016, fakeInput([], ["Digit1"]));

    assert.equal(world.jobs.taken, "farmer");
    assert.equal(world.dialogue.isOpen, true, "a confirmation should be shown");
    assert.match(world.dialogue.current!.text, /农夫/);
  });

  test("after taking the job the board reports it rather than re-offering", () => {
    const { world } = worldAtBoard();
    openBoard(world);
    world.update(0.016, fakeInput([], ["Digit1"]));

    // Close the confirmation, then use the board again.
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));
    openBoard(world);

    const texts: string[] = [world.dialogue.current!.text];
    while (world.dialogue.isOpen) {
      world.update(0.016, fakeInput([], ["Space"]));
      if (world.dialogue.isOpen) texts.push(world.dialogue.current!.text);
    }
    const joined = texts.join("\n");

    assert.match(joined, /农夫/, "should still name the current job");
    assert.ok(!joined.includes("按 1"), `should not ask again: ${joined}`);
  });

  test("pressing a number with no job offer pending does nothing", () => {
    const { world } = worldAtBoard();
    world.update(0.016, fakeInput([], ["Digit1"]));

    assert.equal(world.jobs.hasJob, false, "a stray key press must not take a job");
  });

  test("pressing an out-of-range number while the board is open does nothing", () => {
    const { world } = worldAtBoard();
    openBoard(world);

    world.update(0.016, fakeInput([], ["Digit5"]));

    assert.equal(world.jobs.hasJob, false);
    assert.equal(world.dialogue.isOpen, true, "the board should still be showing");
  });

  test("taking the job again is a no-op rather than a second announcement", () => {
    const { world } = worldAtBoard();
    openBoard(world);
    world.update(0.016, fakeInput([], ["Digit1"]));

    // A second press while the confirmation is up must not re-take it.
    world.update(0.016, fakeInput([], ["Digit1"]));

    assert.equal(world.jobs.taken, "farmer");
    assert.equal(world.dialogue.isOpen, true);
  });
});

describe("the job gates the field (TASK-111)", () => {
  /** A world with the player standing on the field gate. */
  function worldAtField() {
    const world = new TownWorld(createTownMap(), null);
    const gate = TOWN_INTERACTABLES.find((i) => i.id === "farm")!;
    world.player.x = gate.x - world.player.width / 2;
    world.player.y = gate.y + 48 - world.player.height;
    world.player.animation.face("up");
    return { world, gate };
  }

  const press = (world: TownWorld) => world.update(0.016, fakeInput([], ["KeyE"]));

  test("without a job the field refuses and points at the notice board", () => {
    const { world } = worldAtField();

    press(world);

    assert.equal(world.dialogue.isOpen, true, "the refusal should be explained");
    assert.match(world.dialogue.current!.text, /告示板/, "and say where to go");
    assert.equal(
      world.farm.all.filter((p) => p.state !== "untilled").length,
      0,
      "no plot should have been worked"
    );
  });

  test("with the farmer job taken, the field can be worked", () => {
    const { world } = worldAtField();
    world.jobs.take("farmer");

    press(world);

    assert.equal(
      world.farm.all.filter((p) => p.state === "tilled").length,
      1,
      "the nearest plot should have been broken"
    );
  });

  test("the full loop works once the job is taken", () => {
    const { world } = worldAtField();
    world.jobs.take("farmer");

    press(world); // till
    press(world); // sow
    world.update(10, fakeInput());
    press(world); // harvest

    assert.equal(world.inventory.count("wheat"), 1);
  });

  test("a refused field press does not leave the prompt suppressed", () => {
    // The refusal clears the prompt for the frame, but the player is still
    // standing there, so the next frame should offer it again.
    const { world } = worldAtField();
    press(world);
    assert.equal(world.dialogue.isOpen, true);
    while (world.dialogue.isOpen) world.update(0.016, fakeInput([], ["Space"]));

    world.update(0.016, fakeInput(["KeyW"]));

    assert.equal(world.interactionTarget?.id, "farm", "the prompt should come back");
  });
});

describe("job and notice board wiring (TASK-111)", () => {
  test("the notice board is a real interactable in the town", () => {
    assert.ok(TOWN_INTERACTABLES.some((i) => i.id === "noticeboard"));
  });

  test("the board is reachable from a tile the player can stand on", () => {
    const map = createTownMap();
    const board = TOWN_INTERACTABLES.find((i) => i.id === "noticeboard")!;

    // Stand south of the board, facing north.
    const feetY = board.y + 48;
    const reach = reachPoint(board.x, feetY - 24, "up", PLAYER_INTERACT_REACH);

    assert.equal(findInteractable(TOWN_INTERACTABLES, reach)?.id, "noticeboard");
    void map;
  });

  test("the board's own title is used as the speaker", () => {
    const { world } = worldAtBoard();
    openBoard(world);

    assert.equal(world.dialogue.current?.speaker, NOTICE_BOARD_TITLE);
  });

  test("the board is not also a dialogue target", () => {
    // It builds its own text from the job list, so a static entry would be dead
    // data that the player could never see. Same rule as the workbenches.
    assert.equal(
      dialogueFor("noticeboard"),
      null,
      "the notice board should get its text from the job menu alone"
    );
  });

  test("the dialogue table holds no entry for anything the game routes away", () => {
    // Every interactable either has its own handler (field, workbenches, notice
    // board) or falls through to the dialogue table. An entry for a handled one
    // can never appear.
    const handled = new Set<string>(["farm", "noticeboard", ...workbenchIds()]);
    for (const id of interactablesWithDialogue()) {
      assert.ok(!handled.has(id), `"${id}" is handled elsewhere, so its dialogue is dead`);
    }
  });
});
