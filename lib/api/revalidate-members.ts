import { mutate } from 'swr';
import { BOOTSTRAP_KEY, CONFIG_KEY } from './cache-keys';
import { apiFetch } from './fetcher';
import type { BootstrapData } from '@/lib/member-bootstrap-cache';

/** Force-refresh member lists used by navbar, sign-in, and settings. */
export async function revalidateMemberCaches() {
  try {
    const fresh = await apiFetch<BootstrapData>(BOOTSTRAP_KEY);
    await mutate(BOOTSTRAP_KEY, fresh, { revalidate: false, populateCache: true });
  } catch {
    await mutate(BOOTSTRAP_KEY, undefined, { revalidate: true });
  }
  await mutate(CONFIG_KEY, undefined, { revalidate: true });
}
