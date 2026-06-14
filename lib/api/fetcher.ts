/** JSON fetch helper for SWR and preload. */
export async function apiFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
