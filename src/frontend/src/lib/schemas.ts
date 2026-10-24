import { z } from "zod";

export const customerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string(),
  company: z.string(),
  phone: z.string(),
  notes: z.string(),
  archived: z.boolean(),
  createdAt: z.string(),
});
export const stages = ["new", "negotiation", "proposal", "won", "lost"] as const;
export const dealSchema = z.object({
  id: z.number().int().positive(),
  customerId: z.number().int().positive(),
  title: z.string(),
  amountMinor: z.number().int().min(0).max(1_000_000_000_000),
  stage: z.enum(stages),
  description: z.string(),
  createdAt: z.string(),
});
export const taskSchema = z.object({
  id: z.number().int().positive(),
  customerId: z.number().int().positive(),
  dealId: z.number().int().positive().nullable(),
  title: z.string(),
  dueAt: z.iso.datetime(),
  completed: z.boolean(),
  createdAt: z.string(),
});
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
export const customerFormSchema = customerSchema
  .pick({ name: true, email: true, company: true, phone: true, notes: true })
  .extend({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    company: z.string().trim().max(120),
    phone: z.string().trim().max(50),
    notes: z.string().max(5000),
  });
export type Customer = z.infer<typeof customerSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type Task = z.infer<typeof taskSchema>;
export type PageData<T> = { items: T[]; total: number; page: number; pageSize: number };
export const dashboardSchema = z.object({
  activeCustomers: z.number().int().nonnegative(),
  openDeals: z.number().int().nonnegative(),
  wonDeals: z.number().int().nonnegative(),
  openAmountMinor: z.number().int().nonnegative(),
  wonAmountMinor: z.number().int().nonnegative(),
  today: pageSchema(taskSchema),
  overdue: pageSchema(taskSchema),
});
