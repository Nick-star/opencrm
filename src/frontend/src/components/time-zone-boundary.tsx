"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => "";
export function TimeZoneBoundary({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const zone = useSyncExternalStore(subscribe, browserZone, serverZone);
  useEffect(() => {
    if (zone && search.get("timeZone") !== zone) {
      const params = new URLSearchParams(search.toString());
      params.set("timeZone", zone);
      router.replace(`${path}?${params}`, { scroll: false });
    }
  }, [router, path, search, zone]);
  // Forms become interactive only after the timezone navigation, preserving unsaved input.
  return zone && search.get("timeZone") === zone ? (
    children
  ) : (
    <output className="block p-6 text-sm text-slate-500">{label}…</output>
  );
}
