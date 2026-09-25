import type { TileMap } from "../map/TileMap";
import type { GameAssets } from "../assets";
import type { DialogueLine } from "../systems/Dialogue";
import { Scene, type ScenePerson, type SceneProp } from "./Scene";
import { ROOM_PROPS } from "./captainRoomProps";
import { ROOM_PEOPLE } from "./captainRoomPeople";
import { PLAYER_SPAWN, ROOM_HEIGHT, ROOM_WIDTH, TILE } from "../config";

/**
 * The captain's quarters: the game's first scene.
 *
 * Reached as a low-ranking crew member, so everything here is seen from the
 * doorway: the captain's working space, his books, his photograph of Earth.
 *
 * The room is smaller than the viewport, so the camera centres it and the deck
 * plating is continued outward as a backdrop -- you are in a compartment, and
 * the compartment has more floor than this one cabin.
 */
export class CaptainRoom extends Scene {
  /** Ids of props already examined, so the captain can react to them. */
  private readonly seen = new Set<string>();

  /** True once the captain has been spoken to, so his opening varies only once. */
  private captainGreeted = false;

  constructor(
    map: TileMap,
    assets: GameAssets | null = null,
    props: readonly SceneProp[] = ROOM_PROPS,
    people: readonly ScenePerson[] = ROOM_PEOPLE
  ) {
    super(map, assets, PLAYER_SPAWN, props, people, {
      tileSize: TILE,
      backdropColor: "#3a4049",
      backdropTile: "tile_deck"
    });
  }

  get roomWidth(): number {
    return ROOM_WIDTH;
  }

  get roomHeight(): number {
    return ROOM_HEIGHT;
  }

  protected override onExamined(prop: SceneProp): void {
    this.seen.add(prop.assetId);
  }

  /**
   * The captain notices if the player has already looked around his room. It is
   * a small thing, but it is the difference between a room full of props and a
   * room someone actually lives in.
   *
   * Only his FIRST line varies, and only once: a captain who commented on your
   * sightseeing every single time you spoke to him would be a gimmick.
   */
  protected override linesFor(person: ScenePerson): readonly DialogueLine[] {
    if (person.id !== "captain" || this.captainGreeted) return person.lines;
    this.captainGreeted = true;

    if (this.seen.size < 3) return person.lines;

    return [
      ...person.lines.slice(0, 3),
      { speaker: "舰长", text: "你已经把这儿看了一圈了？" },
      ...person.lines.slice(3)
    ];
  }
}
