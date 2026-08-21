export type SearchFilters = {
  categorySlug?: string;
  tagSlugs?: string[];
  priceMinCents?: number;
  priceMaxCents?: number;
  licenseKey?: string;
  productType?: "ORIGINAL" | "MARKETPLACE";
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  limit?: number;
};

export type SearchResultRow = { fontId: string; score: number };

export interface SearchProvider {
  search(query: string, filters: SearchFilters): Promise<{ rows: SearchResultRow[]; total: number }>;
  autocomplete(query: string): Promise<string[]>;
}
