import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  clearDeparture,
  clearHome,
  defaultSettings,
  getCompletions,
  getDeparture,
  getHome,
  getLastDone,
  getSettings,
  recordDeparture,
  setCompletions,
  setDeparture,
  setHome,
  setLastDone,
  setSettings,
  type Completions,
  type Departure,
  type HomeLocation,
  type LastDone,
  type Settings,
} from '../storage/store';
import { dateKey } from '../utils/date';
import {
  presentDepartureAlert,
  rescheduleAll,
  requestNotificationPermission,
} from '../utils/notifications';
import { startHomeWatch, stopHomeWatch } from '../utils/homeWatch';

interface HouseContextValue {
  ready: boolean;
  settings: Settings;
  home: HomeLocation | null;
  completions: Completions;
  lastDone: LastDone;
  departure: Departure | null;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  saveHome: (
    coords: { latitude: number; longitude: number },
    label: string
  ) => Promise<void>;
  removeHome: () => Promise<void>;

  isDone: (taskId: string, day?: string) => boolean;
  toggleTask: (taskId: string) => Promise<void>;
  resetProgress: () => Promise<void>;

  raiseDeparture: (source: Departure['source']) => Promise<void>;
  reloadDeparture: () => Promise<void>;
  toggleDepartureItem: (itemId: string) => Promise<void>;
  resolveDeparture: () => Promise<void>;
}

const HouseContext = createContext<HouseContextValue | null>(null);

export function completionKey(taskId: string, day: string): string {
  return `${taskId}|${day}`;
}

/** Most recent completion of a task across all days, or undefined. */
function latestCompletion(
  completions: Completions,
  taskId: string
): number | undefined {
  let latest: number | undefined;
  for (const [key, at] of Object.entries(completions)) {
    if (key.split('|')[0] !== taskId) continue;
    if (latest === undefined || at > latest) latest = at;
  }
  return latest;
}

export function HouseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [home, setHomeState] = useState<HomeLocation | null>(null);
  const [completions, setCompletionsState] = useState<Completions>({});
  const [lastDone, setLastDoneState] = useState<LastDone>({});
  const [departure, setDepartureState] = useState<Departure | null>(null);

  useEffect(() => {
    (async () => {
      const [s, h, c, l, d] = await Promise.all([
        getSettings(),
        getHome(),
        getCompletions(),
        getLastDone(),
        getDeparture(),
      ]);
      setSettingsState(s);
      setHomeState(h);
      setCompletionsState(c);
      setLastDoneState(l);
      setDepartureState(d);
      setReady(true);
    })();
  }, []);

  // The notification schedule is derived state — rebuilding it whenever its
  // inputs change is the only way to keep it honest.
  useEffect(() => {
    if (!ready) return;
    rescheduleAll(settings, lastDone);
  }, [ready, settings, lastDone]);

  // Same idea for the geofence: it should exist exactly when there's a home
  // saved and departure alerts are switched on.
  useEffect(() => {
    if (!ready) return;
    if (home && settings.departureAlerts) {
      startHomeWatch(home, settings.radiusMeters);
    } else {
      stopHomeWatch();
    }
  }, [ready, home, settings.departureAlerts, settings.radiusMeters]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettingsState(next);
      if (patch.remindersEnabled) await requestNotificationPermission();
      await setSettings(next);
    },
    [settings]
  );

  const saveHome = useCallback(
    async (coords: { latitude: number; longitude: number }, label: string) => {
      const next: HomeLocation = { ...coords, label, savedAt: Date.now() };
      setHomeState(next);
      await setHome(next);
    },
    []
  );

  const removeHome = useCallback(async () => {
    setHomeState(null);
    await Promise.all([clearHome(), stopHomeWatch()]);
  }, []);

  const isDone = useCallback(
    (taskId: string, day: string = dateKey()) =>
      completions[completionKey(taskId, day)] !== undefined,
    [completions]
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const key = completionKey(taskId, dateKey());
      const nextCompletions = { ...completions };
      if (nextCompletions[key] !== undefined) {
        delete nextCompletions[key];
      } else {
        nextCompletions[key] = Date.now();
      }

      const nextLastDone = { ...lastDone };
      const latest = latestCompletion(nextCompletions, taskId);
      if (latest === undefined) {
        delete nextLastDone[taskId];
      } else {
        nextLastDone[taskId] = latest;
      }

      setCompletionsState(nextCompletions);
      setLastDoneState(nextLastDone);
      await Promise.all([
        setCompletions(nextCompletions),
        setLastDone(nextLastDone),
      ]);
    },
    [completions, lastDone]
  );

  const resetProgress = useCallback(async () => {
    setCompletionsState({});
    setLastDoneState({});
    await Promise.all([setCompletions({}), setLastDone({})]);
  }, []);

  const raiseDeparture = useCallback(
    async (source: Departure['source']) => {
      const created = await recordDeparture(source);
      if (!created) return;
      setDepartureState(created);
      if (source !== 'geofence') {
        // The background task posts its own notification when it fires.
        await presentDepartureAlert(
          settings.leaveChecklist.map((item) => item.label)
        );
      }
    },
    [settings.leaveChecklist]
  );

  const reloadDeparture = useCallback(async () => {
    setDepartureState(await getDeparture());
  }, []);

  const toggleDepartureItem = useCallback(
    async (itemId: string) => {
      if (!departure) return;
      const checked = departure.checked.includes(itemId)
        ? departure.checked.filter((id) => id !== itemId)
        : [...departure.checked, itemId];
      const next = { ...departure, checked };
      setDepartureState(next);
      await setDeparture(next);
    },
    [departure]
  );

  const resolveDeparture = useCallback(async () => {
    setDepartureState(null);
    await clearDeparture();
  }, []);

  const value = useMemo<HouseContextValue>(
    () => ({
      ready,
      settings,
      home,
      completions,
      lastDone,
      departure,
      updateSettings,
      saveHome,
      removeHome,
      isDone,
      toggleTask,
      resetProgress,
      raiseDeparture,
      reloadDeparture,
      toggleDepartureItem,
      resolveDeparture,
    }),
    [
      ready,
      settings,
      home,
      completions,
      lastDone,
      departure,
      updateSettings,
      saveHome,
      removeHome,
      isDone,
      toggleTask,
      resetProgress,
      raiseDeparture,
      reloadDeparture,
      toggleDepartureItem,
      resolveDeparture,
    ]
  );

  return (
    <HouseContext.Provider value={value}>{children}</HouseContext.Provider>
  );
}

export function useHouse(): HouseContextValue {
  const context = useContext(HouseContext);
  if (!context) {
    throw new Error('useHouse must be used inside a HouseProvider');
  }
  return context;
}
