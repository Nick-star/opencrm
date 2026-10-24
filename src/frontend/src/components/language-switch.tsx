"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
export function LanguageSwitch() {
  const path = usePathname();
  const search = useSearchParams().toString();
  return (
    <div className="flex gap-3 text-sm">
      <Link
        href={path.replace(/^\/(ru|en)(?=\/|$)/, "/ru") + (search ? `?${search}` : "")}
        lang="ru"
      >
        Русский
      </Link>
      <Link
        href={path.replace(/^\/(ru|en)(?=\/|$)/, "/en") + (search ? `?${search}` : "")}
        lang="en"
      >
        English
      </Link>
    </div>
  );
}
