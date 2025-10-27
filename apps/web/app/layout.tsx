import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://video-kit.chaqchase.com"),
  title: {
    default: "react-video-kit — Composable React Video Player",
    template: "%s — react-video-kit",
  },
  description:
    "Composable, declarative React video player primitives with Tailwind, SSR support, captions, quality switching and an imperative ref API.",
  applicationName: "react-video-kit",
  keywords: [
    "react",
    "video",
    "player",
    "react video player",
    "tailwind",
    "ssr",
    "captions",
    "subtitles",
  ],
  authors: [{ name: "Mohamed Achaq", url: "https://github.com/chaqchase" }],
  creator: "react-video-kit",
  openGraph: {
    title: "react-video-kit — Composable React Video Player",
    description:
      "Composable, declarative React video player primitives with Tailwind, SSR support, captions and quality menus.",
    url: "https://video-kit.chaqchase.com",
    siteName: "react-video-kit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "react-video-kit — Composable React Video Player",
    description:
      "Composable, declarative React video player primitives with Tailwind, SSR support, captions and quality menus.",
    creator: "@chaqchase",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
