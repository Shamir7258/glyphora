import { LocalTextSearchProvider } from "@/server/services/search/local-provider";
import { AtlasSearchProvider } from "@/server/services/search/atlas-provider";
import type { SearchProvider } from "@/server/services/search/provider";

export const searchProvider: SearchProvider =
  process.env.SEARCH_PROVIDER === "atlas" ? AtlasSearchProvider : LocalTextSearchProvider;

export * from "@/server/services/search/provider";
