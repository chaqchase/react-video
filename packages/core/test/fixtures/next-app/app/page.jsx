// A Server Component on purpose: the package must work from one directly.
import * as Video from "react-video-kit";

export default function Page() {
  return (
    <Video.Root>
      <span>rendered on the server</span>
    </Video.Root>
  );
}
