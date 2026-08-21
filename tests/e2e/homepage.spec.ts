import { test, expect } from "@playwright/test";

// Smoke test proving the Playwright harness itself works end-to-end (config,
// webServer boot, seeded data) — the fuller customer/designer/admin E2E flows
// (spec §45/§49) land once those routes exist.
test.describe("Homepage", () => {
  test("shows the hero, seeded fonts, and primary navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the type that defines your");

    await expect(page.getByRole("link", { name: "Explore fonts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse marketplace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Originals" })).toBeVisible();

    // Seeded data (npm run seed) should be visible — the font can legitimately
    // appear in more than one homepage rail (e.g. both Featured Originals and
    // Trending), so assert on the first match rather than requiring uniqueness.
    await expect(page.getByText("Playfair Display Original").first()).toBeVisible();

    await expect(page.getByRole("banner").getByRole("link", { name: "Glyphora" })).toBeVisible();
  });

  test("search form submits to the discovery page with the query", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Search/i).fill("luxury");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/fonts\?q=luxury/);
  });
});
