"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { api } from "@/lib/api";
import { taskSchema, type Task, type PageData } from "@/lib/schemas";
import { type Locale, type Dictionary } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Empty, Field, Pagination, selectClass, useAction, validated } from "./workspace-shared";
import { RelationPicker } from "./relation-picker";

function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const taskFormSchema = z.object({
  title: z.string().trim().min(1).max(120),
  customerId: z.coerce.number().int().positive(),
  dealId: z.number().int().positive().nullable(),
  dueAt: z
    .string()
    .refine((value) => {
      const date = new Date(value);
      return (
        Number.isFinite(date.getTime()) &&
        date.getFullYear() >= 1970 &&
        date.getFullYear() <= 9999 &&
        localInput(date) === value
      );
    })
    .transform((value) => new Date(value).toISOString()),
});
function TaskForm({
  task,
  customerId,
  t,
  onCancel,
}: {
  task?: Task;
  customerId: string;
  t: Dictionary;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(task ? String(task.customerId) : customerId);
  const [related, setRelated] = useState(task?.dealId ? String(task.dealId) : "");
  const action = useAction(t);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const saved = await action.run(() =>
      api(task ? `/tasks/${task.id}` : "/tasks", taskSchema, {
        method: task ? "PATCH" : "POST",
        body: JSON.stringify(
          validated(taskFormSchema, {
            ...values,
            customerId: selected,
            dealId: related ? Number(related) : null,
          }),
        ),
      }),
    );
    if (saved && !task) {
      form.reset();
      setRelated("");
    }
  }
  return (
    <form className="space-y-4" aria-label={task ? t.edit : t.createTask} onSubmit={submit}>
      {task ? (
        <p className="text-sm">
          {t.customer} #{task.customerId}
        </p>
      ) : (
        <RelationPicker
          kind="customers"
          value={selected}
          onChange={(value) => {
            setSelected(value);
            setRelated("");
          }}
          t={t}
          error={action.fields.customerId}
        />
      )}
      <Field
        name="title"
        label={t.title}
        defaultValue={task?.title}
        required
        maxLength={120}
        error={action.fields.title}
      />
      <Field
        name="dueAt"
        label={t.dueAt}
        type="datetime-local"
        defaultValue={task ? localInput(new Date(task.dueAt)) : ""}
        required
        error={action.fields.dueAt}
      />
      {selected ? (
        <RelationPicker
          key={selected}
          kind="deals"
          value={related}
          onChange={setRelated}
          customerId={selected}
          t={t}
          optional
          error={action.fields.dealId}
        />
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={action.pending}>
          {action.pending ? t.saving : task ? t.save : t.createTask}
        </Button>
        {task ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : null}
      </div>
      {action.feedback}
    </form>
  );
}
export function TaskPanel({
  data,
  t,
  lang,
  customerId = "",
  filter = "all",
  timeZone = "UTC",
  embedded = false,
  archived = false,
  now,
}: {
  data: PageData<Task>;
  t: Dictionary;
  lang: Locale;
  customerId?: string;
  filter?: string;
  timeZone?: string;
  embedded?: boolean;
  archived?: boolean;
  now: string;
}) {
  const [editing, setEditing] = useState<Task>();
  const [selected, setSelected] = useState(customerId);
  const action = useAction(t);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="p-5">
          {!embedded ? (
            <>
              <form className="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_150px_auto]">
                <input type="hidden" name="timeZone" value={timeZone} />
                <RelationPicker
                  kind="customers"
                  value={selected}
                  onChange={setSelected}
                  t={t}
                  optional
                  includeArchived
                />
                <div className="space-y-2">
                  <Label htmlFor="filter">{t.tasks}</Label>
                  <select id="filter" name="filter" defaultValue={filter} className={selectClass}>
                    {(["all", "open", "today", "overdue", "completed"] as const).map((value) => (
                      <option key={value} value={value}>
                        {t[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit">{t.apply}</Button>
              </form>
              <p className="mb-4 text-xs text-slate-500">
                {t.timeZone}: {timeZone}
              </p>
            </>
          ) : null}
          {data.items.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="pb-3" scope="col">
                      {t.title}
                    </th>
                    <th scope="col">{t.dueAt}</th>
                    <th scope="col">
                      <span className="sr-only">{t.tasks}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((task) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="py-4 pr-3">
                        {task.title}
                        <Link
                          href={`/${lang}/customers/${task.customerId}`}
                          className="mt-1 block text-xs text-indigo-600"
                        >
                          {t.customer} #{task.customerId}
                          {task.dealId ? ` · ${t.deal} #${task.dealId}` : ""}
                        </Link>
                      </td>
                      <td className="pr-3">
                        <time dateTime={task.dueAt}>
                          {new Intl.DateTimeFormat(lang, {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone,
                          }).format(new Date(task.dueAt))}
                        </time>
                        <span
                          className={`mt-1 block text-xs ${!task.completed && Date.parse(task.dueAt) < Date.parse(now) ? "text-red-700" : "text-slate-500"}`}
                        >
                          {task.completed
                            ? t.completed
                            : new Date(task.dueAt).getTime() < new Date(now).getTime()
                              ? t.overdue
                              : t.open}
                        </span>
                      </td>
                      <td className="space-y-2 py-3">
                        <Button
                          variant="outline"
                          disabled={action.pending || archived}
                          onClick={() =>
                            void action.run(() =>
                              api(`/tasks/${task.id}/completion`, taskSchema, {
                                method: "PATCH",
                                body: JSON.stringify({ completed: !task.completed }),
                              }),
                            )
                          }
                        >
                          {task.completed ? t.undo : t.complete}
                        </Button>
                        <Button
                          className="ml-2"
                          variant="outline"
                          disabled={archived}
                          onClick={() => setEditing(task)}
                        >
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
              href={`/${lang}/tasks?customerId=${customerId}`}
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
            <h2 className="mb-5 text-lg font-semibold">{editing ? t.edit : t.createTask}</h2>
            <TaskForm
              key={editing?.id ?? "new"}
              task={editing}
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
