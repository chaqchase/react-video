import type { DeveloperErrorCode, MediaErrorInfo, VideoErrorCode } from "./types";

export interface VideoKitErrorOptions {
  /** True when trying again could work, for failures reported while loading. */
  retryable?: boolean;
  /** The browser's or engine's own code. */
  nativeCode?: number | string;
  /** The original error. */
  cause?: unknown;
}

/**
 * What the library throws, with a `code` that stays the same between versions. A
 * plugin can also throw one from a load gate or a provider to choose the code the
 * player reports.
 */
export class VideoKitError extends Error {
  override readonly name = "VideoKitError";
  /** Identifies what went wrong, whatever the message says. */
  readonly code: DeveloperErrorCode | VideoErrorCode;
  readonly retryable: boolean | undefined;
  readonly nativeCode: number | string | undefined;
  override readonly cause: unknown;

  constructor(code: DeveloperErrorCode | VideoErrorCode, message: string, options: VideoKitErrorOptions = {}) {
    super(message);
    this.code = code;
    this.retryable = options.retryable;
    this.nativeCode = options.nativeCode;
    this.cause = options.cause;
  }
}

/** Describes anything thrown or rejected, using `fallback` for what it doesn't say. */
export function toErrorInfo(
  error: unknown,
  fallback: Pick<MediaErrorInfo, "code" | "fatal" | "retryable">
): MediaErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof VideoKitError) {
    return {
      ...fallback,
      code: error.code,
      message,
      retryable: error.retryable ?? fallback.retryable,
      nativeCode: error.nativeCode,
      cause: error.cause ?? error,
    };
  }
  return {
    ...fallback,
    message,
    nativeCode: error instanceof Error ? error.name : undefined,
    cause: error,
  };
}
