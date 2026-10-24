"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, type Customer } from "@/lib/api";

export function CustomerWorkspace() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try { setCustomers(await api<Customer[]>("/customers")); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load customers."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<Customer[]>("/customers", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setCustomers(data); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load customers."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setError(""); setMessage("");
    try {
      const customer = await api<Customer>("/customers", { method: "POST", body: JSON.stringify({ name: data.get("name"), email: data.get("email"), company: data.get("company") }) });
      setCustomers(current => [customer, ...current].slice(0, 100));
      setMessage(`${customer.name} added to your workspace.`);
      form.reset();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save customer."); }
    finally { setSaving(false); }
  }

  const visible = customers.filter(customer => `${customer.name} ${customer.email} ${customer.company}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">O</span>OpenCRM<span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500">Workspace</span></Link>
      <span className="text-xs text-slate-500">Your relationships, in focus.</span>
    </div></header>
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Customer relationships</p><h1 className="text-4xl font-semibold tracking-tight">A little closer to your customers.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Keep the people behind your business in one place. Start with a name, build a lasting connection.</p></div>
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="customers-title">
          <Card><CardContent className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 id="customers-title" className="text-lg font-semibold">Customers <span className="ml-2 text-sm font-normal text-slate-400">{customers.length}</span></h2><p className="mt-1 text-xs text-slate-500">Your most recent 100 connections</p></div><div><Label htmlFor="search" className="sr-only">Search customers</Label><Input id="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your customers…" className="w-60" /></div></div>
            {loading ? <p role="status" className="py-20 text-center text-sm text-slate-500">Loading customers…</p> : visible.length === 0 ? <div className="rounded-xl border border-dashed bg-slate-50 px-6 py-20 text-center"><div className="mb-4 text-3xl text-indigo-400" aria-hidden="true">◎</div><h3 className="font-medium">{search ? "No matching customers" : "Your next connection starts here"}</h3><p className="mt-2 text-sm text-slate-500">{search ? "Try a different name, company or email." : "Add your first customer using the form alongside."}</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wider text-slate-400"><tr><th scope="col" className="pb-4 font-medium">Customer</th><th scope="col" className="pb-4 font-medium">Company</th><th scope="col" className="pb-4 font-medium">Email</th></tr></thead><tbody>{visible.map(customer => <tr key={customer.id} className="border-b last:border-0"><td className="py-5 pr-5 font-medium"><span className="mr-3 inline-grid size-8 place-items-center rounded-lg bg-indigo-50 text-xs text-indigo-600">{customer.name.slice(0, 2).toUpperCase()}</span>{customer.name}</td><td className="pr-5 text-slate-500">{customer.company || "—"}</td><td><a className="text-indigo-600 hover:underline" href={`mailto:${customer.email}`}>{customer.email}</a></td></tr>)}</tbody></table></div>}
          </CardContent></Card>
          <p className="mt-4 text-xs text-slate-400">Made for meaningful connections. Built with Go + Next.js.</p>
        </section>
        <aside><Card><CardContent className="p-6"><span className="mb-4 inline-grid size-10 place-items-center rounded-xl bg-indigo-50 text-xl text-indigo-600" aria-hidden="true">+</span><h2 className="text-lg font-semibold">Add a customer</h2><p className="mb-6 mt-1 text-sm text-slate-500">Make room for a new relationship.</p>
          <form onSubmit={createCustomer} className="space-y-4"><div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" placeholder="Alex Morgan" maxLength={120} required /></div><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" placeholder="alex@company.com" maxLength={254} required /></div><div className="space-y-2"><Label htmlFor="company">Company <span className="font-normal text-slate-400">(optional)</span></Label><Input id="company" name="company" placeholder="Company name" maxLength={120} /></div><Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700" disabled={saving || loading} type="submit">{saving ? "Saving…" : "Create customer"}</Button></form>
        </CardContent></Card></aside>
      </div>
      {error ? <div role="alert" className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<Button variant="outline" onClick={() => { setLoading(true); setError(""); void load(); }}>Retry connection</Button></div> : null}
      <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>
    </main>
  </div>;
}
