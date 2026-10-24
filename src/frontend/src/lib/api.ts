import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  error: z.string(),
  fields: z.record(z.string(), z.string()).nullish(),
});
export class ApiError extends Error {
  constructor(
    public code: string,
    public fields?: Record<string, string> | null,
  ) {
    super(code);
  }
}
export async function request<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch {
    throw new ApiError("unavailable");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = errorSchema.safeParse(body);
    throw new ApiError(
      error.success ? error.data.code : "unavailable",
      error.success ? error.data.fields : null,
    );
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError("invalid_response");
  return result.data;
}
export const api = <T>(path: string, schema: z.ZodType<T>, options?: RequestInit) =>
  request(`/api/v1${path}`, schema, options);
