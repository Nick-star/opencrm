"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { api } from "@/lib/api";
import { dealSchema, stages, type Deal, type PageData } from "@/lib/schemas";
import { type Locale, type Dictionary, money } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Empty, Field, Pagination, selectClass, useAction, validated } from "./workspace-shared";
import { RelationPicker } from "./relation-picker";

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,11}([.,]\d{1,2})?$/)
  .transform((value) => {
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .pipe(z.number().int().min(0).max(1_000_000_000_000));
const dealFormSchema = z.object({
  title: z.string().trim().min(1).max(120),
  customerId: z.coerce.number().int().positive(),
  amountMinor: amountSchema,
  description: z.string().max(5000),
});
function DealForm({
  deal,
  customerId,
  t,
  onCancel,
}: {
  deal?: Deal;
  customerId: string;
  t: Dictionary;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(deal ? String(deal.customerId) : customerId);
  const action = useAction(t);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const saved = await action.run(() =>
      api(deal ? `/deals/${deal.id}` : "/deals", dealSchema, {
        method: deal ? "PATCH" : "POST",
        body: JSON.stringify(validated(dealFormSchema, { ...values, customerId: selected })),
      }),
    );
    if (saved && !deal) form.reset();
  }
  const amount = deal
    ? `${Math.floor(deal.amountMinor / 100)}.${String(deal.amountMinor % 100).padStart(2, "0")}`
    : "0";
  return (
    <form aria-label={deal ? t.edit : t.createDeal} onSubmit={submit} className="space-y-4">
      {deal ? (
        <p className="text-sm">
          {t.customer} #{deal.customerId}
        </p>
      ) : (
        <RelationPicker
          kind="customers"
          value={selected}
          onChange={setSelected}
          t={t}
          error={action.fields.customerId}
        />
      )}
      <Field
        name="title"
        label={t.title}
        defaultValue={deal?.title}
        required
        maxLength={120}
        error={action.fields.title}
      />
      <Field
        name="amountMinor"
        label={t.amount}
        defaultValue={amount}
        required
        error={action.fields.amountMinor}
      />
      <p className="text-xs text-slate-500">{t.moneyHint}</p>
      <Field
        name="description"
        label={t.description}
        defaultValue={deal?.description}
        maxLength={5000}
        multiline
        error={action.fields.description}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={action.pending}>
          {action.pending ? t.saving : deal ? t.save : t.createDeal}
        </Button>
        {deal ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : null}
      </div>
      {action.feedback}
    </form>
  );
}
export function DealPanel({
  data,
  t,
  lang,
  customerId = "",
  stage = "",
  embedded = false,
  archived = false,
}: {
  data: PageData<Deal>;
  t: Dictionary;
  lang: Locale;
  customerId?: string;
  stage?: string;
  embedded?: boolean;
  archived?: boolean;
}) {
  const [editing, setEditing] = useState<Deal>();
  const [filter, setFilter] = useState(customerId);
  const action = useAction(t);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="p-5">
          {!embedded ? (
            <form className="mb-6 grid items-end gap-3 sm:grid-cols-[1fr_150px_auto]">
              <RelationPicker
                kind="customers"
                value={filter}
                onChange={setFilter}
                t={t}
                optional
                includeArchived
              />
              <div className="space-y-2">
                <Label htmlFor="stage">{t.stage}</Label>
                <select className={selectClass} id="stage" name="stage" defaultValue={stage}>
                  <option value="">{t.all}</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {t[s]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">{t.apply}</Button>
            </form>
          ) : null}
          {data.items.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th scope="col" className="pb-3">
                      {t.title}
                    </th>
                    <th scope="col">{t.amount}</th>
                    <th scope="col">{t.stage}</th>
                    <th scope="col">
                      <span className="sr-only">{t.edit}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-4 pr-4">
                        {d.title}
                        <Link
                          className="mt-1 block text-xs text-indigo-600"
                          href={`/${lang}/customers/${d.customerId}`}
                        >
                          {t.customer} #{d.customerId}
                        </Link>
                      </td>
                      <td className="pr-4 whitespace-nowrap">{money(d.amountMinor, lang)}</td>
                      <td className="min-w-36 pr-3">
                        {d.stage === "won" || d.stage === "lost" ? (
                          <div className="space-y-2">
                            <span
                              className={d.stage === "won" ? "text-emerald-700" : "text-slate-500"}
                            >
                              {t[d.stage]}
                            </span>
                            <Button
                              variant="outline"
                              disabled={action.pending || archived}
                              onClick={() =>
                                void action.run(() =>
                                  api(`/deals/${d.id}/reopen`, dealSchema, {
                                    method: "POST",
                                    body: "{}",
                                  }),
                                )
                              }
                            >
                              {t.reopen}
                            </Button>
                          </div>
                        ) : (
                          <select
                            aria-label={`${t.stage}: ${d.title}`}
                            className={selectClass}
                            value={d.stage}
                            disabled={action.pending || archived}
                            onChange={(e) =>
                              void action.run(() =>
                                api(`/deals/${d.id}/stage`, dealSchema, {
                                  method: "PATCH",
                                  body: JSON.stringify({ stage: e.target.value }),
                                }),
                              )
                            }
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {t[s]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <Button variant="outline" disabled={archived} onClick={() => setEditing(d)}>
                          {t.edit}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!embedded ? (
            <Pagination {...data} t={t} />
          ) : (
            <Link
              className="mt-4 block text-sm text-indigo-700"
              href={`/${lang}/deals?customerId=${customerId}`}
            >
              {t.all} · {data.total}
            </Link>
          )}
          {action.feedback}
        </CardContent>
      </Card>
      {!archived ? (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-5 text-lg font-semibold">{editing ? t.edit : t.createDeal}</h2>
            <DealForm
              key={editing?.id ?? "new"}
              deal={editing}
              customerId={customerId}
              t={t}
              onCancel={() => setEditing(undefined)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
