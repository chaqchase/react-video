import { version } from "react";
import * as Video from "react-video-kit";

export function getServerSideProps() {
  return { props: { reactVersion: version } };
}

export default function Page({ reactVersion }) {
  return (
    <Video.Root>
      <span>rendered on the server with React {reactVersion}</span>
    </Video.Root>
  );
}
