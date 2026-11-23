export interface AdInfo {
  /** Length in seconds. */
  duration: number;
  /** Seconds before the viewer may skip, or null when they can't. */
  skipAfter: number | null;
  /** This ad's position in its break, from 1. */
  position?: number;
  /** How many ads the break has. */
  total?: number;
  /** Where "Learn more" goes. */
  clickThrough?: string | null;
}

/** What the player offers an engine while it runs. */
export interface AdHost {
  /** The content's video element. */
  readonly video: HTMLVideoElement;
  /** An element over the video, for the engine to draw into. */
  readonly container: HTMLElement;
  /** Pauses the content and locks seeking and rate, until `breakEnd`. */
  breakStart(): void;
  /** Tells the player an ad has begun, so the timeline and overlay follow it. */
  adStart(ad: AdInfo): void;
  /** Reports a failure partway through a break. Ending the break is still the engine's job. */
  error(error: unknown): void;
  /** Unlocks and resumes the content. */
  breakEnd(): void;
}

/**
 * A source of ads. `ima()` uses Google's SDK, and `vast()` plays VAST tags with none.
 * Anything an engine throws or rejects with means the content simply plays.
 */
export interface AdEngine {
  /** True when the engine draws its own skip button and countdown, as IMA does. */
  readonly ownsUi?: boolean;
  /** Position in the current ad, in seconds. */
  readonly time: number;
  /**
   * Runs inside the first play's gesture, before anything has been awaited, so an SDK
   * can unlock playback. Don't wait for anything here.
   */
  prepare(host: AdHost): void;
  /** Resolves once a pre-roll has started, or it's known there isn't one. */
  request(): Promise<void>;
  /** Resumes the current ad. */
  play(): Promise<void> | void;
  /** Pauses the current ad. */
  pause(): void;
  /** Skips the current ad. */
  skip(): void;
  /** The viewer followed the ad's link. */
  clicked?(): void;
  /** Applies the viewer's volume, from 0 to 1, and muted setting to the ad. */
  setVolume(volume: number, muted: boolean): void;
  /** The content ended, so any post-roll can play. */
  contentEnded?(): void;
  /** Stops the engine and removes what it added to the page. */
  destroy(): void;
}
