"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { type Dictionary, errorMessage } from "@/lib/i18n";

export const selectClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-indigo-600";
export function Field({
  name,
  label,
  defaultValue = "",
  type = "text",
  required = false,
  error,
  maxLength,
  multiline = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  error?: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  const fieldId = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      {multiline ? (
        <textarea
          id={fieldId}
          name={name}
          defaultValue={defaultValue}
          maxLength={maxLength}
          className={`${selectClass} min-h-24 py-2`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      ) : (
        <Input
          className="h-10"
          id={fieldId}
          name={name}
          defaultValue={defaultValue}
          type={type}
          required={required}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      )}
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function useAction(t: Dictionary) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  async function run(action: () => Promise<unknown>) {
    if (pending) return false;
    setPending(true);
    setError("");
    setMessage("");
    setFields({});
    try {
      await action();
      setMessage(t.saved);
      router.refresh();
      return true;
    } catch (error) {
      setError(errorMessage(error, t));
      if (error instanceof ApiError && error.fields)
        setFields(
          Object.fromEntries(Object.keys(error.fields).map((key) => [key, t.invalidField])),
        );
      return false;
    } finally {
      setPending(false);
    }
  }
  return {
    pending,
    fields,
    run,
    feedback: (
      <>
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
        <output className="block text-sm text-emerald-700">{message}</output>
      </>
    ),
  };
}
export function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new ApiError(
    "validation",
    Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), "invalid"])),
  );
}
export function Pagination({
  total,
  page,
  pageSize,
  t,
}: {
  total: number;
  page: number;
  pageSize: number;
  t: Dictionary;
}) {
  const router = useRouter();
  const move = (value: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(value));
    router.push(url.pathname + url.search);
  };
  return (
    <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        {t.total}: {total} · {t.page} {page} / {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => move(page - 1)}>
          {t.previous}
        </Button>
        <Button
          variant="outline"
          disabled={page * pageSize >= total}
          onClick={() => move(page + 1)}
        >
          {t.next}
        </Button>
      </div>
    </div>
  );
}
export function Empty({ t }: { t: Dictionary }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <h2 className="font-medium">{t.noData}</h2>
      <p className="mt-2 text-sm text-slate-500">{t.emptyHint}</p>
    </div>
  );
}

export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => router.refresh())}>
      {label}
    </Button>
  );
}
