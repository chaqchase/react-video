/** Formats seconds as m:ss, or h:mm:ss once the video or time reaches an hour. */
export function formatTime(seconds: number, total = seconds): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = String(value % 60).padStart(2, "0");
  if (hours > 0 || (Number.isFinite(total) && total >= 3600)) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
  }
  return `${minutes}:${rest}`;
}
