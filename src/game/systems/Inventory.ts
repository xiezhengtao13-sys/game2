/**
 * What the player is carrying.
 *
 * Counts are whole numbers and never go negative: every removal is checked
 * first, so a failed attempt cannot leave the inventory in a half-changed state.
 */
export type ItemId = "wheat" | "flour" | "bread";

export const ITEM_NAMES: Record<ItemId, string> = {
  wheat: "小麦",
  flour: "面粉",
  bread: "面包"
};

export class Inventory {
  private readonly counts = new Map<ItemId, number>();

  /** How many of `item` are held. */
  count(item: ItemId): number {
    return this.counts.get(item) ?? 0;
  }

  /** True when at least `amount` are held. */
  has(item: ItemId, amount = 1): boolean {
    return this.count(item) >= amount;
  }

  /** Add items. Ignores non-positive or non-finite amounts. */
  add(item: ItemId, amount = 1): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.counts.set(item, this.count(item) + Math.floor(amount));
  }

  /**
   * Remove items. Returns false and changes nothing when there are not enough,
   * so a caller can treat this as the "can I afford it" check and the spend in
   * one step.
   */
  remove(item: ItemId, amount = 1): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const needed = Math.floor(amount);
    if (!this.has(item, needed)) return false;

    const left = this.count(item) - needed;
    if (left === 0) this.counts.delete(item);
    else this.counts.set(item, left);
    return true;
  }

  /** Everything held, for the HUD and for saving. */
  entries(): Array<{ item: ItemId; count: number }> {
    return [...this.counts.entries()].map(([item, count]) => ({ item, count }));
  }

  /** Total number of items held, across all kinds. */
  get total(): number {
    let sum = 0;
    for (const count of this.counts.values()) sum += count;
    return sum;
  }

  /** Wipe the inventory, for a new game. */
  clear(): void {
    this.counts.clear();
  }
}
