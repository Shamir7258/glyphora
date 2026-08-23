"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CategoryDTO, TagDTO, LicenseDTO } from "@/types/dto";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

const MAX_PRICE = 200;

type FilterOptions = {
  categories: CategoryDTO[];
  tags: TagDTO[];
  licenses: LicenseDTO[];
  hideCategory?: boolean;
  hideType?: boolean;
};

function useDiscoveryUrl(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page"); // any filter change resets pagination
      const qs = next.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [router, searchParams, basePath]
  );

  return { searchParams, pushParams, router };
}

function FilterFields({
  basePath,
  categories,
  tags,
  licenses,
  hideCategory,
  hideType,
}: FilterOptions & { basePath: string }) {
  const { searchParams, pushParams, router } = useDiscoveryUrl(basePath);
  const priceMinParam = searchParams.get("priceMin");
  const priceMaxParam = searchParams.get("priceMax");
  const urlPriceRange: [number, number] = [
    priceMinParam ? Number(priceMinParam) : 0,
    priceMaxParam ? Number(priceMaxParam) : MAX_PRICE,
  ];
  const [priceRange, setPriceRange] = useState<[number, number]>(urlPriceRange);
  // Re-sync local slider state when the URL changes externally (e.g. "Clear
  // filters", browser back/forward) — adjusted during render rather than in a
  // useEffect, per React's guidance for resetting state from a changed prop.
  const [trackedUrlPriceRange, setTrackedUrlPriceRange] = useState(urlPriceRange);
  if (trackedUrlPriceRange[0] !== urlPriceRange[0] || trackedUrlPriceRange[1] !== urlPriceRange[1]) {
    setTrackedUrlPriceRange(urlPriceRange);
    setPriceRange(urlPriceRange);
  }

  const activeTag = searchParams.get("tag");
  const activeCategory = searchParams.get("category");
  const activeType = searchParams.get("type");
  const activeLicense = searchParams.get("license");
  const hasActiveFilters = !!(activeTag || activeCategory || activeType || activeLicense || priceMinParam || priceMaxParam);

  return (
    <div className="flex flex-col gap-6">
      {!hideCategory && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={activeCategory ?? "all"} onValueChange={(v) => pushParams({ category: v === "all" ? null : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!hideType && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Type</label>
          <Select value={activeType ?? "all"} onValueChange={(v) => pushParams({ type: v === "all" ? null : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fonts</SelectItem>
              <SelectItem value="ORIGINAL">Originals</SelectItem>
              <SelectItem value="MARKETPLACE">Marketplace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">License</label>
        <Select value={activeLicense ?? "all"} onValueChange={(v) => pushParams({ license: v === "all" ? null : v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any license</SelectItem>
            {licenses.map((l) => (
              <SelectItem key={l.id} value={l.key}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Price</label>
          <span className="text-xs text-muted-foreground">
            ${priceRange[0]} – {priceRange[1] >= MAX_PRICE ? `$${MAX_PRICE}+` : `$${priceRange[1]}`}
          </span>
        </div>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={5}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          onValueCommit={(v) =>
            pushParams({
              priceMin: v[0] > 0 ? String(v[0]) : null,
              priceMax: v[1] < MAX_PRICE ? String(v[1]) : null,
            })
          }
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Style</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pushParams({ tag: activeTag === t.slug ? null : t.slug })}
                className={
                  activeTag === t.slug
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
                }
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => router.push(basePath)}>
          <X className="size-3.5" /> Clear filters
        </Button>
      )}
    </div>
  );
}

/** Desktop sidebar — render this in a left column next to the grid. */
export function DiscoveryFilterPanel(props: FilterOptions & { basePath: string }) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <FilterFields {...props} />
    </aside>
  );
}

/** Search box, sort select, and (mobile-only) a sheet holding the same filters. */
export function DiscoveryToolbar({ basePath, ...filterProps }: FilterOptions & { basePath: string }) {
  const { searchParams, pushParams } = useDiscoveryUrl(basePath);
  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  // Same render-time resync pattern as FilterFields' price range above.
  const [trackedUrlQ, setTrackedUrlQ] = useState(urlQ);
  if (trackedUrlQ !== urlQ) {
    setTrackedUrlQ(urlQ);
    setQ(urlQ);
  }
  const activeSort = searchParams.get("sort") ?? "newest";

  const activeFilterCount = ["tag", "category", "type", "license", "priceMin", "priceMax"].filter((k) =>
    searchParams.get(k)
  ).length;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: q.trim() || null });
        }}
        className="relative flex-1"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fonts, styles, designers…"
          aria-label="Search fonts"
          className="pl-9"
        />
      </form>

      <div className="flex items-center gap-2">
        <Select value={activeSort} onValueChange={(v) => pushParams({ sort: v === "newest" ? null : v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="size-4" /> Filters
              {activeFilterCount > 0 && <Badge className="ml-1 px-1.5">{activeFilterCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterFields basePath={basePath} {...filterProps} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
