import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import type { Friend, AppEvent } from '../context/AppContext';

const FRIENDS_KEY = 'ft:friends';
const EVENTS_KEY = 'ft:events';
const USER_KEY = 'ft:user';
const LAST_SYNC_KEY = 'ft:last_sync';

async function readJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function getCachedFriends(userId: string): Promise<Friend[] | null> {
  return readJSON<Friend[]>(`${FRIENDS_KEY}:${userId}`);
}

export function cacheFriends(userId: string, friends: Friend[]): Promise<void> {
  return writeJSON(`${FRIENDS_KEY}:${userId}`, friends);
}

export function getCachedEvents(userId: string): Promise<AppEvent[] | null> {
  return readJSON<AppEvent[]>(`${EVENTS_KEY}:${userId}`);
}

export function cacheEvents(userId: string, events: AppEvent[]): Promise<void> {
  return writeJSON(`${EVENTS_KEY}:${userId}`, events);
}

// ── Cached identity ────────────────────────────────────────────────────────
// The app must open straight into the user's data with no network at all, so
// the last signed-in user is persisted locally. Supabase can only confirm a
// session when it can reach its servers (or while the access token is still
// valid); this cache is what keeps the app usable in between.

export function getCachedUser(): Promise<User | null> {
  return readJSON<User>(USER_KEY);
}

export function cacheUser(user: User): Promise<void> {
  return writeJSON(USER_KEY, user);
}

export async function clearCachedUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage errors
  }
}

// ── Sync bookkeeping ───────────────────────────────────────────────────────

export function getLastSyncedAt(userId: string): Promise<number | null> {
  return readJSON<number>(`${LAST_SYNC_KEY}:${userId}`);
}

export function setLastSyncedAt(
  userId: string,
  timestamp: number
): Promise<void> {
  return writeJSON(`${LAST_SYNC_KEY}:${userId}`, timestamp);
}
