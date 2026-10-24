import { test, expect } from "@playwright/test";

test("server conflict preserves the deal form and retry succeeds", async ({ page }) => {
  const response = await page.request.post("/api/v1/customers", {
    data: { name: "Conflict customer", email: "conflict@example.com" },
  });
  const c = (await response.json()) as { id: number };
  await page.goto(`/en/deals?customerId=${c.id}`);
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Preserved deal");
  await page.getByRole("textbox", { name: "Amount, ₽", exact: true }).fill("42.75");
  await page.request.patch(`/api/v1/customers/${c.id}/archive`, { data: { archived: true } });
  await page.getByRole("button", { name: "Create deal", exact: true }).click();
  await expect(page.getByRole("form", { name: "Create deal" }).getByRole("alert")).toContainText(
    "Action unavailable",
  );
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(
    "Preserved deal",
  );
  await expect(page.getByRole("textbox", { name: "Amount, ₽", exact: true })).toHaveValue("42.75");
  await page.request.patch(`/api/v1/customers/${c.id}/archive`, { data: { archived: false } });
  await page.getByRole("button", { name: "Create deal", exact: true }).click();
  await expect(page.getByRole("cell", { name: /Preserved deal/ })).toBeVisible();
});

test("task instant is displayed in each browser time zone", async ({ browser, request }) => {
  const customer = await request.post("/api/v1/customers", {
    data: { name: "Timezone customer", email: "timezone@example.com" },
  });
  const c = (await customer.json()) as { id: number };
  await request.post("/api/v1/tasks", {
    data: { customerId: c.id, title: "Timezone task", dueAt: "2026-01-01T03:00:00Z" },
  });
  for (const [zone, time] of [
    ["UTC", "03:00"],
    ["Asia/Krasnoyarsk", "10:00"],
  ]) {
    const context = await browser.newContext({
      timezoneId: zone,
      baseURL: "http://127.0.0.1:13000",
    });
    const page = await context.newPage();
    await page.goto(`/ru/tasks?customerId=${c.id}`);
    await expect(page).toHaveURL((url) => url.searchParams.get("timeZone") === zone);
    await expect(
      page.getByRole("row").filter({ hasText: "Timezone task" }).locator("time"),
    ).toContainText(time);
    await context.close();
  }
});

test("nonexistent DST local time is rejected without clearing the task form", async ({
  browser,
  request,
}) => {
  const response = await request.post("/api/v1/customers", {
    data: { name: "DST customer", email: "dst@example.com" },
  });
  const c = (await response.json()) as { id: number };
  const context = await browser.newContext({
    timezoneId: "America/New_York",
    baseURL: "http://127.0.0.1:13000",
  });
  const page = await context.newPage();
  await page.goto(`/en/tasks?customerId=${c.id}`);
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("DST task");
  await page.getByLabel("Due", { exact: true }).fill("2026-03-08T02:30");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByLabel("Due", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("DST task");
  await context.close();
});
