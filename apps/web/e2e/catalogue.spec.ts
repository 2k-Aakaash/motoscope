import { expect, test } from "@playwright/test";

// Requires the development demo seed (fictional brands). See README "Run the end-to-end tests".

test("visitor searches for a motorcycle and opens its detail page", async ({ page, isMobile }) => {
  await page.goto("/");
  const search = isMobile ? page.locator("#home-search") : page.locator("#header-search");
  await search.fill("kestrel strix");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/motorcycles\?q=kestrel\+strix/);
  await expect(page.getByText("1 motorcycle match your filters")).toBeVisible();
  await page.getByRole("link", { name: "Kestrel Moto Strix 390" }).click();

  await expect(page).toHaveURL(/\/motorcycles\/kestrel-strix-390$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kestrel Moto Strix 390" })).toBeVisible();
  await expect(page.getByText("Illustrative demo price").first()).toBeVisible();
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("filters are applied from the form and reflected in a shareable URL", async ({ page, isMobile }) => {
  await page.goto("/motorcycles");
  if (isMobile) await page.getByRole("button", { name: /show filters/i }).click();

  await page.getByLabel("Electric", { exact: true }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/fuel=Electric/);
  await expect(page.getByText("2 motorcycles match your filters")).toBeVisible();
  await page.getByRole("link", { name: /Electric \(remove filter\)/ }).click();
  await expect(page).toHaveURL(/\/motorcycles$/);
});

test("sorting by price puts the cheapest model first", async ({ page }) => {
  await page.goto("/motorcycles?sort=price-asc");
  const firstCard = page.getByRole("heading", { level: 2 }).first();
  await expect(firstCard).toHaveText("Arka Motors Sprint 125");
});

test("unknown motorcycles return a real 404 page", async ({ page }) => {
  const response = await page.goto("/motorcycles/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
});

test("anonymous visitors are blocked from admin APIs", async ({ request }) => {
  const response = await request.get("/api/v1/admin/motorcycles");
  expect(response.status()).toBe(401);
});
