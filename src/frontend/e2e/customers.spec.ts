import { test, expect } from "@playwright/test";

test("customer can be created, edited and found in both languages", async ({ page }, info) => {
  const name = `Тестовый клиент ${info.retry}`;
  await page.goto("/");
  await expect(page).toHaveURL(/\/ru(?:\?|$)/);
  await page.getByRole("link", { name: "Клиенты", exact: true }).click();
  const create = page.getByRole("form", { name: "Создать клиента", exact: true });
  await create.getByRole("textbox", { name: "Имя", exact: true }).fill(name);
  await create
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(`browser-${info.retry}@example.com`);
  await create.getByRole("button", { name: "Создать клиента", exact: true }).click();
  await page.getByRole("link", { name, exact: true }).click();
  const edit = page.getByRole("form", { name: "Изменить", exact: true });
  await edit.getByRole("textbox", { name: "Телефон", exact: true }).fill("+7 999 1234567");
  await edit.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(edit.getByRole("status")).toHaveText("Сохранено");
  await page.reload();
  await expect(edit.getByRole("textbox", { name: "Телефон", exact: true })).toHaveValue(
    "+7 999 1234567",
  );
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/customers\/\d+(?:\?|$)/);
  await expect(
    page
      .getByRole("form", { name: "Edit", exact: true })
      .getByRole("textbox", { name: "Phone", exact: true }),
  ).toHaveValue("+7 999 1234567");
});
