import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, request } from "@/lib/api";
import { customerSchema, dealSchema, taskSchema, pageSchema, dashboardSchema } from "@/lib/schemas";
import { dictionaries, isLocale, errorMessage } from "@/lib/i18n";
import { CustomerList, CustomerForm, CustomerArchive } from "@/components/customer-panel";
import { DealPanel } from "@/components/deal-panel";
import { TaskPanel } from "@/components/task-panel";
import { Dashboard } from "@/components/dashboard";
import { RefreshButton } from "@/components/workspace-shared";
import { LanguageSwitch } from "@/components/language-switch";
import { TimeZoneBoundary } from "@/components/time-zone-boundary";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
async function loadPage(
  base: string,
  section: string,
  customerId: string | undefined,
  query: URLSearchParams,
) {
  try {
    if (section === "customers" && customerId) {
      const [customer, deals, tasks] = await Promise.all([
        request(`${base}/customers/${customerId}`, customerSchema),
        request(`${base}/deals?customerId=${customerId}`, pageSchema(dealSchema)),
        request(`${base}/tasks?customerId=${customerId}`, pageSchema(taskSchema)),
      ]);
      return { kind: "detail" as const, customer, deals, tasks, now: new Date().toISOString() };
    }
    if (section === "customers")
      return {
        kind: "customers" as const,
        data: await request(`${base}/customers?${query}`, pageSchema(customerSchema)),
      };
    if (section === "deals")
      return {
        kind: "deals" as const,
        data: await request(`${base}/deals?${query}`, pageSchema(dealSchema)),
      };
    if (section === "tasks")
      return {
        kind: "tasks" as const,
        data: await request(`${base}/tasks?${query}`, pageSchema(taskSchema)),
        now: new Date().toISOString(),
      };
    return {
      kind: "dashboard" as const,
      data: await request(`${base}/dashboard?${query}`, dashboardSchema),
    };
  } catch (error) {
    return { kind: "failure" as const, error };
  }
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang, path = [] } = await params;
  if (!isLocale(lang)) notFound();
  const t = dictionaries[lang];
  const section = path[0] || "dashboard";
  if (
    !["dashboard", "customers", "deals", "tasks"].includes(section) ||
    path.length > 2 ||
    (path.length === 2 && (section !== "customers" || !/^\d+$/.test(path[1])))
  )
    notFound();
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") query.set(key, value);
  }
  const timeZone = query.get("timeZone") ?? "UTC";
  const model = await loadPage(
    `${process.env.API_ORIGIN ?? "http://127.0.0.1:8080"}/api/v1`,
    section,
    path[1],
    query,
  );
  let content: React.ReactNode;
  switch (model.kind) {
    case "detail": {
      const c = model.customer;
      content = (
        <div className="space-y-8">
          <Card>
            <CardContent className="space-y-6 p-6">
              <Link href={`/${lang}/customers`} className="text-sm text-indigo-700">
                ← {t.backCustomers}
              </Link>
              <h2 className="text-2xl font-semibold">{c.name}</h2>
              <div className="max-w-xl">
                <CustomerForm customer={c} t={t} />
              </div>
              <CustomerArchive customer={c} t={t} />
            </CardContent>
          </Card>
          <section aria-label={t.deals}>
            <h2 className="mb-4 text-xl font-semibold">{t.deals}</h2>
            <DealPanel
              data={model.deals}
              t={t}
              lang={lang}
              customerId={String(c.id)}
              archived={c.archived}
              embedded
            />
          </section>
          <section aria-label={t.tasks}>
            <h2 className="mb-4 text-xl font-semibold">{t.tasks}</h2>
            <TaskPanel
              data={model.tasks}
              t={t}
              lang={lang}
              customerId={String(c.id)}
              archived={c.archived}
              embedded
              timeZone={timeZone}
              now={model.now}
            />
          </section>
        </div>
      );
      break;
    }
    case "customers":
      content = (
        <CustomerList
          data={model.data}
          t={t}
          lang={lang}
          query={query.get("q") ?? ""}
          archived={query.get("archived") ?? "false"}
        />
      );
      break;
    case "deals":
      content = (
        <DealPanel
          data={model.data}
          t={t}
          lang={lang}
          customerId={query.get("customerId") ?? ""}
          stage={query.get("stage") ?? ""}
        />
      );
      break;
    case "tasks":
      content = (
        <TaskPanel
          data={model.data}
          t={t}
          lang={lang}
          customerId={query.get("customerId") ?? ""}
          filter={query.get("filter") ?? "all"}
          timeZone={timeZone}
          now={model.now}
        />
      );
      break;
    case "dashboard":
      content = <Dashboard data={model.data} t={t} lang={lang} timeZone={timeZone} />;
      break;
    case "failure":
      if (model.error instanceof ApiError && model.error.code === "not_found") notFound();
      content = (
        <div role="alert" className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
          <p>{errorMessage(model.error, t)}</p>
          <RefreshButton label={t.retry} />
        </div>
      );
      break;
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
            {t.tagline}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t[section as "dashboard" | "customers" | "deals" | "tasks"]}
          </h1>
        </div>
        <LanguageSwitch />
      </div>
      {section !== "customers" || path.length === 2 ? (
        <TimeZoneBoundary label={t.timeZone}>{content}</TimeZoneBoundary>
      ) : (
        content
      )}
    </>
  );
}
