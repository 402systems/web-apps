/**
 * All app state lives on the device. Nothing here talks to a network — the
 * background geofence task and the React tree both read and write through
 * these helpers, which is why they're plain functions rather than a hook.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultLeaveChecklist } from '../house.config';

const HOME_KEY = 'hs:home';
const SETTINGS_KEY = 'hs:settings';
const COMPLETIONS_KEY = 'hs:completions';
const LAST_DONE_KEY = 'hs:lastDone';
const DEPARTURE_KEY = 'hs:departure';

export interface HomeLocation {
  latitude: number;
  longitude: number;
  label: string;
  savedAt: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface Settings {
  /** How far from home counts as "left the house". */
  radiusMeters: number;
  departureAlerts: boolean;
  remindersEnabled: boolean;
  /** "HH:MM", 24h. */
  morningTime: string;
  eveningTime: string;
  stayStart: string | null;
  stayEnd: string | null;
  leaveChecklist: ChecklistItem[];
}

export interface Departure {
  id: string;
  at: number;
  source: 'geofence' | 'foreground';
  /** Which checklist items you've ticked off since the alert fired. */
  checked: string[];
  resolvedAt: number | null;
}

/** `${taskId}|${YYYY-MM-DD}` → completion timestamp. */
export type Completions = Record<string, number>;
/** taskId → timestamp of the most recent completion, any day. */
export type LastDone = Record<string, number>;

export const defaultSettings: Settings = {
  radiusMeters: 150,
  departureAlerts: true,
  remindersEnabled: true,
  morningTime: '09:00',
  eveningTime: '20:00',
  stayStart: null,
  stayEnd: null,
  leaveChecklist: defaultLeaveChecklist.map((label, i) => ({
    id: `seed-${i}`,
    label,
  })),
};

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
    // ignore storage errors — the UI already holds the value in memory
  }
}

async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getHome(): Promise<HomeLocation | null> {
  return readJSON<HomeLocation>(HOME_KEY);
}

export function setHome(home: HomeLocation): Promise<void> {
  return writeJSON(HOME_KEY, home);
}

export function clearHome(): Promise<void> {
  return remove(HOME_KEY);
}

export async function getSettings(): Promise<Settings> {
  const stored = await readJSON<Partial<Settings>>(SETTINGS_KEY);
  // Merge so a settings key added in a later version doesn't come back undefined.
  return { ...defaultSettings, ...(stored ?? {}) };
}

export function setSettings(settings: Settings): Promise<void> {
  return writeJSON(SETTINGS_KEY, settings);
}

export async function getCompletions(): Promise<Completions> {
  return (await readJSON<Completions>(COMPLETIONS_KEY)) ?? {};
}

export function setCompletions(value: Completions): Promise<void> {
  return writeJSON(COMPLETIONS_KEY, value);
}

export async function getLastDone(): Promise<LastDone> {
  return (await readJSON<LastDone>(LAST_DONE_KEY)) ?? {};
}

export function setLastDone(value: LastDone): Promise<void> {
  return writeJSON(LAST_DONE_KEY, value);
}

export function getDeparture(): Promise<Departure | null> {
  return readJSON<Departure>(DEPARTURE_KEY);
}

export function setDeparture(value: Departure): Promise<void> {
  return writeJSON(DEPARTURE_KEY, value);
}

export function clearDeparture(): Promise<void> {
  return remove(DEPARTURE_KEY);
}

/**
 * Records that you've left, unless there's already an unresolved departure or
 * one was recorded moments ago. Geofencing and the in-app distance check can
 * both notice the same walk out the door, and they shouldn't both alert.
 */
const DEDUPE_WINDOW_MS = 3 * 60 * 1000;

export async function recordDeparture(
  source: Departure['source']
): Promise<Departure | null> {
  const existing = await getDeparture();
  if (existing && existing.resolvedAt === null) return null;
  if (existing && Date.now() - existing.at < DEDUPE_WINDOW_MS) return null;

  const departure: Departure = {
    id: `${Date.now().toString(36)}`,
    at: Date.now(),
    source,
    checked: [],
    resolvedAt: null,
  };
  await setDeparture(departure);
  return departure;
}
