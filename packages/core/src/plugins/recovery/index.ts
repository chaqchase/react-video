import { definePlugin } from "../../core/plugin";
import type { MediaErrorInfo } from "../../core/types";

export interface RecoveryOptions {
  /** How many times to retry a failure before reporting it. */
  retries?: number;
  /** The first wait in milliseconds, doubling for each retry. */
  delay?: number;
  /** Decides which errors are worth retrying. By default, those marked `retryable`. */
  retryOn?: (error: MediaErrorInfo) => boolean;
}

const isRetryable = ({ retryable }: MediaErrorInfo) => retryable === true;

/** Playing this far past a failure earns a fresh set of retries. */
const RECOVERED_AFTER_SECONDS = 5;

/**
 * Retries failures that can pass, such as a dropped connection, resuming from the
 * same position. While offline it waits to reconnect instead of using up retries.
 */
export const recovery = definePlugin("recovery", (options: RecoveryOptions = {}) => {
  const { retries = 3, delay = 1000, retryOn = isRetryable } = options;
  let position = 0;
  let failedAt = 0;
  let lastSource: string | null = null;
  const tried = new Set<string>();
  let reloading = false;
  let cancelRetry = () => {};

  return {
    state: () => ({
      /** Retries used so far, back to 0 once playback recovers or the source changes. */
      attempt: 0,
      /** True from a retryable failure until the video is ready again or the plugin gives up. */
      retrying: false,
    }),
    attrs: { "data-retrying": (state) => state.retrying },
    setup(context, scope) {
      scope.add(() => cancelRetry());
      scope.add(
        context.clock.bind(
          (time) => {
            if (time > 0) position = time;
            if (context.state().attempt > 0 && time > failedAt + RECOVERED_AFTER_SECONDS) {
              context.set({ attempt: 0 });
            }
          },
          () => 1
        )
      );

      const retry = () => {
        reloading = true;
        context.commands.reload(position > 0 ? position : undefined);
      };

      context.watch(
        scope,
        (media) => media.error,
        (error) => {
          if (!error?.fatal) return;
          reloading = false;
          cancelRetry();
          const { attempt } = context.state();
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          if (!retryOn(error) || (!offline && attempt >= retries)) {
            context.set({ retrying: false });
            return;
          }
          failedAt = position;
          context.set({ attempt: offline ? attempt : attempt + 1, retrying: true });
          if (offline) {
            window.addEventListener("online", retry, { once: true });
            cancelRetry = () => window.removeEventListener("online", retry);
          } else {
            const timer = setTimeout(retry, delay * 2 ** attempt);
            cancelRetry = () => clearTimeout(timer);
          }
        }
      );
      context.watch(
        scope,
        (media) => media.status === "ready" && !media.error?.fatal,
        (ready) => {
          if (!ready) return;
          reloading = false;
          context.set({ retrying: false });
        }
      );
    },
    source(context, { src }) {
      // Its own reload keeps counting, even through a list of fallbacks.
      const own = reloading && tried.has(src);
      tried.add(src);
      if (own) return;
      // Anything else starts counting again, and a different video starts from nothing.
      cancelRetry();
      if (src !== lastSource) position = 0;
      lastSource = src;
      context.set({ attempt: 0, retrying: false });
    },
  };
});
