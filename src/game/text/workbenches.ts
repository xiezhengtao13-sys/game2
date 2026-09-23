import type { Recipe } from "../systems/Crafting";
import { RECIPES } from "../systems/Crafting";

/**
 * Which workbench does what.
 *
 * Keyed by interactable id, so the map decides where a workbench is and this
 * table decides what pressing E there means.
 */
const WORKBENCHES: Record<string, Recipe> = {
  mill: RECIPES.mill_flour,
  bakery: RECIPES.bake_bread
};

/** The recipe for an interactable, or null when it is not a workbench. */
export function recipeFor(id: string): Recipe | null {
  return WORKBENCHES[id] ?? null;
}

/** Every interactable id that is a workbench. */
export function workbenchIds(): string[] {
  return Object.keys(WORKBENCHES);
}
