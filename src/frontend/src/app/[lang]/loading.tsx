"use client";
import { useParams } from "next/navigation";
import { dictionaries, isLocale } from "@/lib/i18n";
export default function Loading() {
  const { lang } = useParams();
  const t = dictionaries[typeof lang === "string" && isLocale(lang) ? lang : "ru"];
  return (
    <output className="block rounded-xl border bg-white p-8 text-sm text-slate-500">
      {t.refresh}…
    </output>
  );
}
