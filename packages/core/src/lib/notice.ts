const VISIBLE_MS = 2200;
/** Keep in step with the toast's exit transition. */
const FADE_MS = 300;

/** Shows a message for a moment, then leaves it in place while it fades. */
export function createNotice<Notice extends string>(
  write: (state: { notice: Notice | null; noticeVisible: boolean }) => void
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    show(notice: Notice) {
      clearTimeout(timer);
      write({ notice, noticeVisible: true });
      timer = setTimeout(() => {
        write({ notice, noticeVisible: false });
        timer = setTimeout(() => write({ notice: null, noticeVisible: false }), FADE_MS);
      }, VISIBLE_MS);
    },
    stop: () => clearTimeout(timer),
  };
}
