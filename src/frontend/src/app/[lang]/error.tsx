"use client";
import { useParams } from "next/navigation";
import { dictionaries, isLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { lang } = useParams();
  const t = dictionaries[typeof lang === "string" && isLocale(lang) ? lang : "ru"];
  return (
    <div role="alert" className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
      <p>{t.internal}</p>
      <Button onClick={reset}>{t.retry}</Button>
    </div>
  );
}
