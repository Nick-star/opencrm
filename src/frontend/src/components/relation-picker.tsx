"use client";

import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import { customerSchema, dealSchema, pageSchema } from "@/lib/schemas";
import { type Dictionary, errorMessage } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { selectClass } from "./workspace-shared";

type Choice = { id: number; name: string };
export function RelationPicker({
  kind,
  value,
  onChange,
  t,
  customerId,
  optional = false,
  includeArchived = false,
  error,
}: {
  kind: "customers" | "deals";
  value: string;
  onChange: (value: string) => void;
  t: Dictionary;
  customerId?: string;
  optional?: boolean;
  includeArchived?: boolean;
  error?: string;
}) {
  const fieldId = useId();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Choice[]>([]);
  const [total, setTotal] = useState(0);
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q,
        page: String(page),
        archived: includeArchived ? "all" : "false",
      });
      if (kind === "deals" && customerId) params.set("customerId", customerId);
      const load = async () => {
        setLoading(true);
        setFailure("");
        try {
          if (kind === "customers") {
            const data = await api(`/customers?${params}`, pageSchema(customerSchema), {
              signal: controller.signal,
            });
            if (!controller.signal.aborted) {
              setItems(data.items.map((c) => ({ id: c.id, name: c.name })));
              setTotal(data.total);
            }
          } else {
            const data = await api(`/deals?${params}`, pageSchema(dealSchema), {
              signal: controller.signal,
            });
            if (!controller.signal.aborted) {
              setItems(data.items.map((d) => ({ id: d.id, name: d.title })));
              setTotal(data.total);
            }
          }
        } catch (error) {
          if (!controller.signal.aborted) setFailure(errorMessage(error, t));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };
      void load();
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, q, page, includeArchived, customerId, t, retry]);
  const name = kind === "customers" ? "customerId" : "dealId";
  const label = kind === "customers" ? t.customer : t.deal;
  return (
    <div className="space-y-2">
      <Label htmlFor={`${fieldId}-search`}>
        {kind === "customers" ? t.customerSearch : t.dealSearch}
      </Label>
      <Input
        id={`${fieldId}-search`}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        className={selectClass}
        id={fieldId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={!optional}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        disabled={loading && items.length === 0}
      >
        <option value="">
          {optional ? (kind === "deals" ? t.none : t.all) : t.selectCustomer}
        </option>
        {value && !items.some((item) => String(item.id) === value) ? (
          <option value={value}>#{value}</option>
        ) : null}
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {failure ? (
        <p role="alert" className="text-sm text-red-700">
          {failure}
          <Button type="button" variant="outline" onClick={() => setRetry((n) => n + 1)}>
            {t.retry}
          </Button>
        </p>
      ) : null}
      {total > 20 ? (
        <div className="flex items-center gap-3 text-xs">
          <Button
            type="button"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            {t.previous}
          </Button>
          <span>{page}</span>
          <Button
            type="button"
            variant="outline"
            disabled={page * 20 >= total}
            onClick={() => setPage((n) => n + 1)}
          >
            {t.next}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
