import { ShipWorld } from "../src/game/scenes/ShipWorld";
import { createShipMap } from "../src/game/map/shipMap";
import { isBoxBlocked } from "../src/game/map/collision";
import { TILE } from "../src/game/config";
import type { TileMap } from "../src/game/map/TileMap";
import type { Input } from "../src/engine/input/Input";

/**
 * Shared test scaffolding for the ship.
 *
 * Three test files walk the same deck, so the parts that must behave identically
 * -- the keyboard stand-in and "which tiles can the player actually stand on" --
 * live here rather than in three slightly different copies.
 */

/** Stand-in for the real keyboard: a test can hold keys down and press others. */
export function fakeInput(held: string[] = [], pressed: string[] = []): Input {
  return {
    isDown: (code: string) => held.includes(code),
    wasPressed: (code: string) => pressed.includes(code)
  } as unknown as Input;
}

/** The whole game world: one map, one player, no assets. */
export function ship(): ShipWorld {
  return new ShipWorld(createShipMap(TILE), null);
}

/** True when this tile is floor the player could stand on. */
export function isFloor(type: string | null | undefined): boolean {
  return type === "deck" || type === "deck_dark" || type === "deck_rug" || type === "floor_light";
}

/** The tile the middle of the player's feet is over. */
export function feetTile(map: TileMap, x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor((x + 16) / map.tileSize),
    ty: Math.floor((y + 48 - 8) / map.tileSize)
  };
}

/**
 * Every tile the player can stand on, reached by walking from where they start.
 *
 * Uses the game's own collision and the real collider, so "reachable" means
 * reachable in play rather than "the tile looks like floor".
 */
export function standableTiles(world: ShipWorld): Set<string> {
  const map = world.tileMap;
  const size = map.tileSize;
  const collider = { width: 22, height: 16 };

  const free = (tx: number, ty: number) =>
    !isBoxBlocked(map, {
      x: tx * size + (size - collider.width) / 2,
      y: ty * size + (size - collider.height) / 2,
      ...collider
    });

  const start = feetTile(map, world.player.x, world.player.y);
  const seen = new Set<string>();
  if (!free(start.tx, start.ty)) return seen;

  const queue = [{ tx: start.tx, ty: start.ty }];
  seen.add(`${start.tx},${start.ty}`);

  while (queue.length > 0) {
    const { tx, ty } = queue.shift()!;
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nx = tx + ox;
      const ny = ty + oy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !map.inBounds(nx, ny) || !free(nx, ny)) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }

  return seen;
}
