import { definePlugin } from "../../core/plugin";

export interface IdleOptions {
  /** Hide this long after the last mouse activity, in milliseconds. */
  mouseTimeout?: number;
  /** Hide this long after a touch reveals the controls, in milliseconds. */
  touchTimeout?: number;
  /** Hide this long after the mouse leaves the player, in milliseconds. */
  leaveTimeout?: number;
}

/** Elements that keep the controls up while the viewer is using them. */
const IN_USE = [
  '[data-part="controls"]:hover',
  '[data-part="controls"] :focus-visible',
  '[data-part="menu-content"][data-state="open"]',
].join(",");

/**
 * Hides the controls when the viewer isn't using them. They stay mounted while
 * hidden, so Tab reveals them, and pinned while paused or in use.
 */
export const idle = definePlugin("idle", (options: IdleOptions = {}) => {
  const { mouseTimeout = 3000, touchTimeout = 4000, leaveTimeout = 800 } = options;
  let show: (() => void) | null = null;
  return {
    state: () => ({ visible: true }),
    attrs: { "data-controls": (state) => (state.visible ? "shown" : "hidden") },
    commands(context) {
      return {
        /** Reveals the controls, which then hide again as usual. */
        show: () => (show ? show() : context.set({ visible: true })),
        hide: () => context.set({ visible: false }),
        toggle: () => context.set({ visible: !context.state().visible }),
      };
    },
    setup(context, scope) {
      const root = context.root();
      if (!root) return;
      let deadline = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const mediaPinned = () => {
        const { paused, ended, status, scrubbing } = context.media();
        return paused || ended || status === "error" || scrubbing;
      };
      const pinned = () =>
        mediaPinned() ||
        root.hasAttribute("data-casting") ||
        root.querySelector(IN_USE) !== null;

      const check = () => {
        timer = undefined;
        const left = deadline - performance.now();
        if (left > 0) {
          timer = setTimeout(check, left);
        } else if (pinned()) {
          // Pinned by something with no event of its own, so look again shortly.
          deadline = performance.now() + mouseTimeout;
          timer = setTimeout(check, mouseTimeout);
        } else {
          context.set({ visible: false });
        }
      };
      // Pointer moves only push the deadline, so they cost no timers or store writes.
      const reveal = (wait: number) => {
        context.set({ visible: true });
        deadline = performance.now() + wait;
        if (timer === undefined) timer = setTimeout(check, wait);
      };

      show = () => reveal(mouseTimeout);
      scope.add(() => {
        show = null;
      });

      scope.on(root, "pointermove", ((event: PointerEvent) => {
        if (event.pointerType !== "touch") reveal(mouseTimeout);
      }) as EventListener);
      scope.on(root, "pointerleave", ((event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        // Sooner than usual, because they've gone. This one replaces the running timer.
        clearTimeout(timer);
        deadline = performance.now() + leaveTimeout;
        timer = setTimeout(check, leaveTimeout);
      }) as EventListener);
      scope.on(root, "keydown", () => reveal(mouseTimeout));
      scope.on(root, "focusin", () => {
        if (root.querySelector(":focus-visible")) reveal(mouseTimeout);
      });

      // A tap on the video toggles the controls, since touch has no hover to reveal them.
      let tap: { id: number; x: number; y: number } | null = null;
      scope.on(root, "pointerdown", ((event: PointerEvent) => {
        tap = event.pointerType === "touch"
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
      }) as EventListener);
      scope.on(root, "pointerup", ((event: PointerEvent) => {
        if (!tap || tap.id !== event.pointerId) return;
        const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10;
        tap = null;
        if (moved || (event.target as Element).closest('[data-part="controls"]')) {
          reveal(touchTimeout);
          return;
        }
        if (context.state().visible && !pinned()) context.set({ visible: false });
        else reveal(touchTimeout);
      }) as EventListener);

      context.watch(scope, () => mediaPinned(), (isPinned) => {
        if (isPinned) context.set({ visible: true });
        reveal(mouseTimeout);
      });
      scope.add(() => clearTimeout(timer));
    },
  };
});
