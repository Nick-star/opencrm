"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { customerSchema, customerFormSchema, type Customer, type PageData } from "@/lib/schemas";
import { type Locale, type Dictionary } from "@/lib/i18n";
import { Empty, Field, Pagination, selectClass, useAction, validated } from "./workspace-shared";

export function CustomerForm({ customer, t }: { customer?: Customer; t: Dictionary }) {
  const action = useAction(t);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const saved = await action.run(() =>
      api(customer ? `/customers/${customer.id}` : "/customers", customerSchema, {
        method: customer ? "PATCH" : "POST",
        body: JSON.stringify(validated(customerFormSchema, values)),
      }),
    );
    if (saved && !customer) form.reset();
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-label={customer ? t.edit : t.createCustomer}>
      <Field
        name="name"
        label={t.name}
        defaultValue={customer?.name}
        required
        maxLength={120}
        error={action.fields.name}
      />
      <Field
        name="email"
        label={t.email}
        defaultValue={customer?.email}
        type="email"
        required
        maxLength={254}
        error={action.fields.email}
      />
      <Field
        name="company"
        label={t.company}
        defaultValue={customer?.company}
        maxLength={120}
        error={action.fields.company}
      />
      <Field
        name="phone"
        label={t.phone}
        defaultValue={customer?.phone}
        maxLength={50}
        error={action.fields.phone}
      />
      <Field
        name="notes"
        label={t.notes}
        defaultValue={customer?.notes}
        maxLength={5000}
        multiline
        error={action.fields.notes}
      />
      <Button type="submit" disabled={action.pending}>
        {action.pending ? t.saving : customer ? t.save : t.createCustomer}
      </Button>
      {action.feedback}
    </form>
  );
}
export function CustomerList({
  data,
  t,
  lang,
  query,
  archived,
}: {
  data: PageData<Customer>;
  t: Dictionary;
  lang: Locale;
  query: string;
  archived: string;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="p-5">
          <form className="mb-6 flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="q">{t.search}</Label>
              <Input className="h-10" id="q" name="q" defaultValue={query} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archived">{t.customers}</Label>
              <select id="archived" name="archived" defaultValue={archived} className={selectClass}>
                <option value="false">{t.active}</option>
                <option value="true">{t.archived}</option>
                <option value="all">{t.all}</option>
              </select>
            </div>
            <Button type="submit">{t.apply}</Button>
          </form>
          {data.items.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="pb-3" scope="col">
                      {t.name}
                    </th>
                    <th scope="col">{t.company}</th>
                    <th scope="col">{t.email}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-4 pr-4">
                        <Link
                          className="font-medium text-indigo-700 hover:underline"
                          href={`/${lang}/customers/${c.id}`}
                        >
                          {c.name}
                        </Link>
                        {c.archived ? (
                          <span className="ml-2 text-xs text-slate-500">{t.archived}</span>
                        ) : null}
                      </td>
                      <td className="pr-4">{c.company || "—"}</td>
                      <td>{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination {...data} t={t} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-5 text-lg font-semibold">{t.createCustomer}</h2>
          <CustomerForm t={t} />
        </CardContent>
      </Card>
    </div>
  );
}
export function CustomerArchive({ customer, t }: { customer: Customer; t: Dictionary }) {
  const action = useAction(t);
  return (
    <div className="space-y-3">
      {customer.archived ? <p className="text-sm text-amber-800">{t.archivedNotice}</p> : null}
      <Button
        variant="outline"
        disabled={action.pending}
        onClick={() => {
          if (!customer.archived && !window.confirm(t.archivedConfirm)) return;
          void action.run(() =>
            api(`/customers/${customer.id}/archive`, customerSchema, {
              method: "PATCH",
              body: JSON.stringify({ archived: !customer.archived }),
            }),
          );
        }}
      >
        {customer.archived ? t.restore : t.archive}
      </Button>
      {action.feedback}
    </div>
  );
}
