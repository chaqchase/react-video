import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { ThemeColor } from "@/components/site/theme-color";
import "./global.css";

// Dark unless someone chose light. This runs before the first paint, so the page never flashes the wrong theme.
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("theme")}catch(e){}t=t==="light"?"light":"dark";var r=document.documentElement;r.classList.remove("dark","light");r.classList.add(t);r.style.colorScheme=t})();`;

// The site's own typeface, so it reads the same on every system.
const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "React Video Kit", template: "%s | React Video Kit" },
  description:
    "A composable React video player. Everything is a plugin, from fullscreen to DRM, so you only ship what you use.",
  openGraph: {
    title: "React Video Kit",
    description: "The React video player you compose. Everything is a plugin.",
    images: ["/media/poster.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable} font-sans`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/*
          Counts React commits for the render meter on the home page. React reports to
          this hook in every build, where <Profiler> only works in development.
        */}
        <Script id="commit-counter" strategy="beforeInteractive">{`(function(){var w=window,h=w.__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!h){h=w.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,isDisabled:false,renderers:new Map(),inject:function(){return 1},onCommitFiberRoot:function(){},onCommitFiberUnmount:function(){},onPostCommitFiberRoot:function(){},checkDCE:function(){}}}var o=h.onCommitFiberRoot;w.__rvkCommits=0;h.onCommitFiberRoot=function(){w.__rvkCommits++;return o&&o.apply(this,arguments)}})();`}</Script>
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeColor />
        {children}
      </body>
    </html>
  );
}
