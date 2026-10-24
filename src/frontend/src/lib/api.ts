export type Customer = {
  id: number;
  name: string;
  email: string;
  company: string;
  createdAt: string;
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "API unavailable. Check that the Go server is running.");
  }
  return response.json() as Promise<T>;
}
