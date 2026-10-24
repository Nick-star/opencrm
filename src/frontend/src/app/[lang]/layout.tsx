import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaries, isLocale } from "@/lib/i18n";
import "../globals.css";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: "OpenCRM", description: isLocale(lang) ? dictionaries[lang].tagline : "OpenCRM" };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = dictionaries[lang];
  return (
    <html lang={lang}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-5">
            <Link href={`/${lang}`} className="flex items-center gap-3 text-lg font-bold">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
                O
              </span>
              OpenCRM
            </Link>
            <nav aria-label={t.app} className="flex flex-wrap gap-5 text-sm font-medium">
              {(["dashboard", "customers", "deals", "tasks"] as const).map((key) => (
                <Link
                  className="hover:text-indigo-600 focus-visible:outline-2"
                  key={key}
                  href={`/${lang}${key === "dashboard" ? "" : `/${key}`}`}
                >
                  {t[key]}
                </Link>
              ))}
            </nav>
            <span className="ml-auto text-xs text-slate-500">{t.localOnly}</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
