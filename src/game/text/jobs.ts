/**
 * The text shown on the notice board, and how choosing works.
 *
 * A job menu is a dialogue that also accepts a number key, so it needs no new
 * UI. That keeps this task small; a proper menu can come when there is more than
 * one job to choose between.
 */

export const NOTICE_BOARD_TITLE = "告示板";

/** Shown before any job has been taken, to point the player at the choice. */
export const NO_JOB_HINT = "（你还没有接下任何活。按 1 选择农夫。）";

/** Prefix for each offer line, so the number to press is obvious. */
export function offerLine(index: number, name: string, description: string, taken: boolean): string {
  const suffix = taken ? "（已接下）" : "";
  return `${index + 1}. ${name}——${description}${suffix}`;
}

/** How many offers there are, and therefore which number keys are live. */
export const MAX_OFFERS = 9;

/**
 * Which offer a pressed key selects, or null.
 *
 * Only "1".."9" count, and only up to `offerCount`, so pressing 5 with two
 * offers does nothing rather than selecting nothing silently.
 */
export function offerIndexForKey(code: string, offerCount: number): number | null {
  const match = /^Digit([1-9])$/.exec(code);
  if (!match) return null;

  const index = Number(match[1]) - 1;
  return index < offerCount ? index : null;
}
