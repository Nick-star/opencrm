import { test, expect } from "@playwright/test";

for (const lang of ["ru", "en"] as const) {
  test(`sales workflow in ${lang}`, async ({ page }, info) => {
    const ru = lang === "ru";
    const customerName = `Workflow ${lang} ${info.retry}`;
    await page.goto(`/${lang}/customers`);
    const customerForm = page.getByRole("form", {
      name: ru ? "Создать клиента" : "Create customer",
      exact: true,
    });
    await customerForm
      .getByRole("textbox", { name: ru ? "Имя" : "Name", exact: true })
      .fill(customerName);
    await customerForm
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(`workflow-${lang}-${info.retry}@example.com`);
    await customerForm
      .getByRole("button", { name: ru ? "Создать клиента" : "Create customer", exact: true })
      .click();
    await page.getByRole("link", { name: customerName, exact: true }).click();
    await expect(page.getByRole("heading", { name: customerName, exact: true })).toBeVisible();
    const customer = { id: Number(new URL(page.url()).pathname.split("/").at(-1)) };
    await page.goto(`/${lang}/deals?customerId=${customer.id}`);
    await page
      .getByRole("textbox", { name: ru ? "Название" : "Title", exact: true })
      .fill(`Website ${lang}`);
    await page
      .getByRole("textbox", { name: ru ? "Сумма, ₽" : "Amount, ₽", exact: true })
      .fill("1234,56");
    await page
      .getByRole("button", { name: ru ? "Создать сделку" : "Create deal", exact: true })
      .click();
    await expect(page.getByRole("cell", { name: new RegExp(`Website ${lang}`) })).toBeVisible();
    await page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: new RegExp(`Website ${lang}`) }) })
      .getByRole("button", { name: ru ? "Изменить" : "Edit", exact: true })
      .click();
    const dealForm = page.getByRole("form", { name: ru ? "Изменить" : "Edit", exact: true });
    await dealForm
      .getByRole("textbox", { name: ru ? "Описание" : "Description", exact: true })
      .fill("Portfolio project");
    await dealForm.getByRole("button", { name: ru ? "Сохранить" : "Save", exact: true }).click();
    await expect(dealForm.getByRole("status")).toHaveText(ru ? "Сохранено" : "Saved");
    await page.goto(`/${lang}/tasks?customerId=${customer.id}`);
    await page
      .getByRole("textbox", { name: ru ? "Название" : "Title", exact: true })
      .fill(`Call ${lang}`);
    await page.getByLabel(ru ? "Срок" : "Due", { exact: true }).fill("2026-01-01T10:00");
    await page
      .getByRole("combobox", { name: ru ? "Сделка" : "Deal", exact: true })
      .selectOption({ label: `Website ${lang}` });
    await page
      .getByRole("button", { name: ru ? "Создать задачу" : "Create task", exact: true })
      .click();
    await expect(page.getByRole("cell", { name: new RegExp(`Call ${lang}`) })).toBeVisible();
    const taskRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: new RegExp(`Call ${lang}`) }) });
    await expect(taskRow).toContainText(ru ? "Просрочено" : "Overdue");
    await taskRow.getByRole("button", { name: ru ? "Изменить" : "Edit", exact: true }).click();
    const taskForm = page.getByRole("form", { name: ru ? "Изменить" : "Edit", exact: true });
    await taskForm.getByLabel(ru ? "Срок" : "Due", { exact: true }).fill("2026-01-02T11:30");
    await taskForm.getByRole("button", { name: ru ? "Сохранить" : "Save", exact: true }).click();
    await expect(taskForm.getByRole("status")).toHaveText(ru ? "Сохранено" : "Saved");
    await expect(taskRow.locator("time")).toContainText("11:30");

    await taskRow.getByRole("button", { name: ru ? "Выполнить" : "Complete", exact: true }).click();
    await expect(
      taskRow.getByRole("button", {
        name: ru ? "Вернуть в работу" : "Return to open",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`/${lang}/deals?customerId=${customer.id}`);
    const dealRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: new RegExp(`Website ${lang}`) }) });
    await dealRow.getByRole("combobox").selectOption("won");
    await expect(
      dealRow.getByRole("button", { name: ru ? "Возобновить" : "Reopen", exact: true }),
    ).toBeVisible();
    await dealRow.getByRole("button", { name: ru ? "Возобновить" : "Reopen", exact: true }).click();
    await expect(dealRow.getByRole("combobox")).toHaveValue("new");
    await dealRow.getByRole("combobox").selectOption("won");
    await expect(
      dealRow.getByRole("button", { name: ru ? "Возобновить" : "Reopen", exact: true }),
    ).toBeVisible();
    await page.goto(`/${lang}/customers/${customer.id}`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: ru ? "Архивировать" : "Archive", exact: true }).click();
    await expect(
      page.getByRole("button", { name: ru ? "Восстановить" : "Restore", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: ru ? "Восстановить" : "Restore", exact: true }).click();
    await expect(
      page.getByRole("button", { name: ru ? "Архивировать" : "Archive", exact: true }),
    ).toBeVisible();
    await page.goto(`/${lang}`);
    await expect(
      page.getByText(ru ? "Выигранные сделки" : "Won deals", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath("dashboard.png"), fullPage: true });
  });
}
