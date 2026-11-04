import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">React Video Kit</h1>
      <p className="text-fd-muted-foreground text-lg">
        A composable, plugin-first React video player. Version 4 is in alpha.
      </p>
      <Link href="/docs/v4" className="font-medium underline">
        Read the v4 docs
      </Link>
    </main>
  );
}
