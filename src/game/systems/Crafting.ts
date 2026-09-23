import type { Inventory, ItemId } from "./Inventory";
import { ITEM_NAMES } from "./Inventory";

/**
 * Converting what you grew into something worth giving away.
 *
 * Every recipe takes and gives whole items, and a craft either happens entirely
 * or not at all -- so a shortage can never leave the player having paid for
 * something they did not receive.
 */

export interface Recipe {
  id: string;
  /** Where this is done, for labelling. */
  name: string;
  inputs: Array<{ item: ItemId; amount: number }>;
  outputs: Array<{ item: ItemId; amount: number }>;
}

export const RECIPES: Record<string, Recipe> = {
  mill_flour: {
    id: "mill_flour",
    name: "磨面粉",
    inputs: [{ item: "wheat", amount: 2 }],
    outputs: [{ item: "flour", amount: 1 }]
  },
  bake_bread: {
    id: "bake_bread",
    name: "烤面包",
    inputs: [{ item: "flour", amount: 1 }],
    outputs: [{ item: "bread", amount: 1 }]
  }
};

export type CraftResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; recipe: Recipe; missing: Array<{ item: ItemId; amount: number }>; message: string };

/** True when the inventory can cover every input of `recipe`. */
export function canCraft(inventory: Inventory, recipe: Recipe): boolean {
  return recipe.inputs.every(({ item, amount }) => inventory.has(item, amount));
}

/** What is still needed, as a readable list. Empty when everything is available. */
export function missingFor(
  inventory: Inventory,
  recipe: Recipe
): Array<{ item: ItemId; amount: number }> {
  return recipe.inputs
    .map(({ item, amount }) => ({ item, amount: amount - inventory.count(item) }))
    .filter(({ amount }) => amount > 0);
}

/**
 * Perform a craft.
 *
 * Inputs are taken first and put back if any of them turns out to be
 * unavailable, so the inventory can never be left half-spent. In practice
 * `canCraft` is checked up front; the rollback is there because "atomic" is the
 * requirement, not "usually atomic".
 */
export function craft(inventory: Inventory, recipe: Recipe): CraftResult {
  if (!canCraft(inventory, recipe)) {
    const missing = missingFor(inventory, recipe);
    return { ok: false, recipe, missing, message: shortfallMessage(missing) };
  }

  const taken: Array<{ item: ItemId; amount: number }> = [];
  for (const { item, amount } of recipe.inputs) {
    if (!inventory.remove(item, amount)) {
      // Should be unreachable; undo anyway rather than corrupt the inventory.
      for (const entry of taken) inventory.add(entry.item, entry.amount);
      return {
        ok: false,
        recipe,
        missing: missingFor(inventory, recipe),
        message: shortfallMessage(missingFor(inventory, recipe))
      };
    }
    taken.push({ item, amount });
  }

  for (const { item, amount } of recipe.outputs) {
    inventory.add(item, amount);
  }

  return { ok: true, recipe };
}

/** A message naming exactly what is short, so the player is never left guessing. */
export function shortfallMessage(missing: Array<{ item: ItemId; amount: number }>): string {
  if (missing.length === 0) return "材料够了。";
  const parts = missing.map(({ item, amount }) => `${ITEM_NAMES[item]}还差 ${amount} 个`);
  return `材料不够：${parts.join("，")}。`;
}
