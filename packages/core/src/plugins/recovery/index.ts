import { definePlugin } from "../../core/plugin";
import type { MediaErrorInfo } from "../../core/types";

export interface RecoveryOptions {
  /** How many times to retry a failure before reporting it. */
  retries?: number;
  /** The first wait in milliseconds, doubling for each retry. */
  delay?: number;
  /** Decides which errors are worth retrying. */
  retryOn?: (error: MediaErrorInfo) => boolean;
}

// MEDIA_ERR_NETWORK, or the code engine providers use for a lost connection.
const isTransient = ({ code }: MediaErrorInfo) => code === 2 || code === "network";

/** Playing this far past a failure earns a fresh set of retries. */
const RECOVERED_AFTER_SECONDS = 5;

/**
 * Retries failures that can pass, such as a dropped connection, resuming from the
 * same position. While offline it waits to reconnect instead of using up retries.
 */
export const recovery = definePlugin("recovery", (options: RecoveryOptions = {}) => {
  const { retries = 3, delay = 1000, retryOn = isTransient } = options;
  let position = 0;
  let failedAt = 0;
  let lastSource: string | null = null;
  let cancelRetry = () => {};

  return {
    state: () => ({ attempt: 0, retrying: false }),
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
        context.commands.reload(position > 0 ? position : undefined);
      };

      context.watch(
        scope,
        (media) => media.error,
        (error) => {
          if (!error?.fatal) return;
          cancelRetry();
          const { attempt } = context.state();
          if (!retryOn(error) || attempt >= retries) {
            context.set({ retrying: false });
            return;
          }
          failedAt = position;
          context.set({ attempt: attempt + 1, retrying: true });
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
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
        (media) => media.status === "ready" && !media.error,
        (ready) => {
          if (ready) context.set({ retrying: false });
        }
      );
    },
    source(context, source) {
      // A reload keeps its place, but a different video starts from nothing.
      if (source.src === lastSource) return;
      lastSource = source.src;
      cancelRetry();
      position = 0;
      context.set({ attempt: 0, retrying: false });
    },
  };
});
