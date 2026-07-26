import { createClient } from '@eastlake/lib-core-supabase-auth/native/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const API_BASE =
  process.env.EXPO_PUBLIC_FRIEND_TRACKER_API_URL ??
  'https://api.402systems.com/friend-tracker';

/** Requests give up rather than hanging when the network is unreachable. */
const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Raised whenever a request could not reach the API: no connectivity, a
 * timeout, or a locally stored session that cannot be refreshed while offline.
 * Callers treat it as "try again later" and queue the write instead of
 * surfacing an error.
 */
export class OfflineError extends Error {
  constructor(message = 'Offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  supabase ??= createClient();
  return supabase;
}

async function getAccessToken(): Promise<string> {
  // getSession() reads from AsyncStorage, so it resolves offline. It only
  // touches the network when the access token has expired — which fails
  // offline and leaves us without a usable token.
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new OfflineError('No usable session');
    return token;
  } catch (err) {
    if (err instanceof OfflineError) throw err;
    throw new OfflineError('Session unavailable');
  }
}

function isConnectivityFailure(err: unknown): boolean {
  if (err instanceof OfflineError) return true;
  // Aborted by our own timeout.
  if (err instanceof Error && err.name === 'AbortError') return true;
  return (
    err instanceof TypeError &&
    (err.message === 'Network request failed' ||
      err.message === 'Failed to fetch')
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (err) {
    if (isConnectivityFailure(err)) throw new OfflineError();
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;

  // A gateway that can't be reached properly may return a non-JSON body;
  // treat that as a transient failure rather than corrupting local state.
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    if (res.ok) return undefined as T;
    throw new OfflineError(`Bad response: ${res.status}`);
  }

  if (!res.ok)
    throw new Error((body.error as string) ?? `Request failed: ${res.status}`);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
