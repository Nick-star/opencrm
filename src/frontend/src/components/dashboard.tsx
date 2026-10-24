import Link from "next/link";
import { type z } from "zod";
import { type dashboardSchema } from "@/lib/schemas";
import { type Dictionary, type Locale, money } from "@/lib/i18n";
import { Card, CardContent } from "./ui/card";
import { Empty } from "./workspace-shared";

export function Dashboard({
  data,
  t,
  lang,
  timeZone,
}: {
  data: z.infer<typeof dashboardSchema>;
  t: Dictionary;
  lang: Locale;
  timeZone: string;
}) {
  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: t.activeCustomers,
            value: String(data.activeCustomers),
            detail: t.customers,
            href: `/${lang}/customers`,
          },
          {
            label: t.openDeals,
            value: money(data.openAmountMinor, lang),
            detail: `${t.total}: ${data.openDeals}`,
            href: `/${lang}/deals`,
          },
          {
            label: t.wonDeals,
            value: money(data.wonAmountMinor, lang),
            detail: `${t.total}: ${data.wonDeals}`,
            href: `/${lang}/deals?stage=won`,
          },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="my-4 text-3xl font-semibold tracking-tight">{card.value}</p>
              <Link href={card.href} className="text-sm text-indigo-600">
                {card.detail} →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {t.timeZone}: {timeZone}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {(["today", "overdue"] as const).map((key) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="mb-5 flex justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {t[key]} <span className="text-slate-400">{data[key].total}</span>
                </h2>
                <Link
                  className="text-sm text-indigo-600"
                  href={`/${lang}/tasks?filter=${key}&timeZone=${encodeURIComponent(timeZone)}`}
                >
                  {t.allTasks} →
                </Link>
              </div>
              {data[key].items.length === 0 ? (
                <Empty t={t} />
              ) : (
                <ul className="divide-y">
                  {data[key].items.map((task) => (
                    <li key={task.id} className="flex justify-between gap-4 py-4">
                      <Link
                        className="font-medium text-indigo-700"
                        href={`/${lang}/tasks?customerId=${task.customerId}&timeZone=${encodeURIComponent(timeZone)}`}
                      >
                        {task.title}
                      </Link>
                      <time className="text-sm text-slate-500" dateTime={task.dueAt}>
                        {new Intl.DateTimeFormat(lang, {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone,
                        }).format(new Date(task.dueAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
