"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Rotates the visual treatment of "brand" through a handful of distinct type
// voices so the hero itself demonstrates the product in the first second (spec
// §5: "the user should immediately understand this is a font marketplace").
// Kept to system/Google fonts already loaded platform-wide plus a couple of
// generic-family fallbacks — swapping in live marketplace fonts here is a nice
// follow-up once font-loading is wired end to end.
const VOICES = [
  { label: "brand", className: "font-display italic font-medium" },
  { label: "brand", className: "font-sans font-black tracking-tight" },
  { label: "brand", className: "font-mono font-medium" },
  { label: "brand", className: "font-display font-light tracking-wide" },
];

export function Hero() {
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setInterval(() => setVoiceIndex((i) => (i + 1) % VOICES.length), 2200);
    return () => clearInterval(id);
  }, []);

  const voice = VOICES[voiceIndex];

  return (
    <section className="relative overflow-hidden border-b border-border/80 px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">A premium type marketplace</p>
        <h1 className="mt-5 text-balance font-display text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl md:text-7xl">
          Find the type that defines your{" "}
          <span
            key={voiceIndex}
            className={cn("inline-block animate-in fade-in slide-in-from-bottom-2 duration-500", voice.className)}
          >
            {voice.label}
          </span>
          .
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Discover a font in seconds, see it rendered your way instantly, and buy it
          with a checkout that gets out of your way.
        </p>

        <form
          action="/fonts"
          className="mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-sm"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search “luxury serif”, “handwritten”, a designer…"
            className="h-9 border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            aria-label="Search fonts"
          />
          <Button type="submit" size="sm" className="shrink-0 rounded-full px-5">
            Search
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/fonts">
              Explore fonts <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/fonts?type=MARKETPLACE">Browse marketplace</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full">
            <Link href="/originals">Explore Originals</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
