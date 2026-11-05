import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { REPO } from "./site";

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* A CSS gradient: the nav renders this twice, and an SVG one breaks when its id's first copy is hidden. */}
      <svg
        viewBox="0 0 32 32"
        width="24"
        height="24"
        aria-hidden="true"
        className="shrink-0 rounded-[7px] bg-[linear-gradient(#2a1f5e,#7a4a8c_55%,#ffb27a)]"
      >
        <path
          d="M12.5 9.8c0-.9 1-1.5 1.8-1l8.6 5.3c.8.5.8 1.6 0 2.1l-8.6 5.3c-.8.5-1.8-.1-1.8-1z"
          transform="translate(-.5 1.3)"
          fill="#fff"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.015em]">React Video Kit</span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <Logo /> },
    githubUrl: REPO,
    links: [
      { text: "Docs", url: "/docs/v4", active: "nested-url" },
      { text: "Plugins", url: "/plugins", active: "nested-url" },
      { text: "Playground", url: "/playground", active: "nested-url" },
    ],
  };
}
