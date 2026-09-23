/**
 * Choosing what you do in the town.
 *
 * v1 has a single branch. The structure is here because "pick a job and do it"
 * is the core of the game's pitch, and the plan is to add more branches later --
 * but nothing generic is being built for jobs that do not exist yet.
 */

export type JobId = "farmer";

export interface Job {
  id: JobId;
  name: string;
  /** One line for the notice board, saying what the work involves. */
  description: string;
  /** Extra lines shown once the job is taken. */
  takenText: string;
}

export const JOBS: readonly Job[] = [
  {
    id: "farmer",
    name: "农夫",
    description: "照料镇南那块地：翻土、播种、收割。",
    takenText: "你已经接下农夫的活。地里的小麦随时可以去照看。"
  }
];

/** The job with this id, or null. */
export function jobById(id: JobId): Job | null {
  return JOBS.find((job) => job.id === id) ?? null;
}

/**
 * Which job the player has taken, if any.
 *
 * Taking a job is one-way in v1: there is no quitting or switching, because
 * with a single branch there is nothing to switch to.
 */
export class Jobs {
  private current: JobId | null = null;

  /** The job taken, or null when the player has not chosen yet. */
  get taken(): JobId | null {
    return this.current;
  }

  get hasJob(): boolean {
    return this.current !== null;
  }

  /** The taken job's details, or null. */
  get job(): Job | null {
    return this.current ? jobById(this.current) : null;
  }

  /**
   * Take a job. Returns false when it was already taken, so a caller can tell
   * "chosen now" from "already had it" and avoid double-announcing it.
   */
  take(id: JobId): boolean {
    if (this.current === id) return false;
    this.current = id;
    return true;
  }

  /** The offer for the notice board: available jobs, with taken ones flagged. */
  offers(): Array<{ job: Job; taken: boolean }> {
    return JOBS.map((job) => ({ job, taken: this.current === job.id }));
  }
}
