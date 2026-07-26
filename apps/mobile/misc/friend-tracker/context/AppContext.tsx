import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@eastlake/lib-core-supabase-auth/native/hooks/useAuth';
import { api, OfflineError } from '../api/client';
import {
  requestNotificationPermission,
  scheduleEventReminder,
  cancelEventReminder,
} from '../utils/notifications';
import {
  getCachedFriends,
  cacheFriends,
  getCachedEvents,
  cacheEvents,
  getCachedUser,
  cacheUser,
  clearCachedUser,
  getLastSyncedAt,
  setLastSyncedAt,
} from '../storage/offlineStorage';
import {
  getQueue,
  enqueue,
  setQueue,
  newLocalId,
  isLocalId,
  remapQueueIds,
  type QueuedOp,
} from '../storage/syncQueue';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Friend {
  id: string;
  name: string;
  last_action: string | null;
  phone_number: string | null;
  birthday: string | null;
  groups: string[];
  created_at: string;
}

export interface NewFriend {
  name: string;
  phone_number?: string | null;
  birthday?: string | null;
}

export interface EventFriend {
  friend_id: string;
}

export interface AppEvent {
  id: string;
  name: string;
  date: string;
  created_at: string;
  event_friends: EventFriend[];
}

export interface NewEvent {
  name: string;
  date: string;
}

// ── Context ────────────────────────────────────────────────────────────────

interface AppContextValue {
  // Auth
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;

  // Friends
  friends: Friend[];
  isLoadingFriends: boolean;
  addFriend: (f: NewFriend) => Promise<void>;
  addFriends: (fs: NewFriend[]) => Promise<void>;
  recordHangout: (friendId: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;

  // Groups (stored on friend rows)
  addFriendToGroup: (
    friendId: string,
    groupName: string
  ) => Promise<string[] | null>;
  removeFriendFromGroup: (
    friendId: string,
    groupName: string
  ) => Promise<string[] | null>;
  deleteGroup: (groupName: string) => Promise<string | undefined>;
  updateFriendGroupsLocally: (friendId: string, groups: string[]) => void;

  // Events
  events: AppEvent[];
  isLoadingEvents: boolean;
  createEvent: (e: NewEvent) => Promise<AppEvent | null>;
  updateEvent: (id: string, e: Partial<NewEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addFriendsToEvent: (eventId: string, friendIds: string[]) => Promise<void>;
  removeFriendFromEvent: (eventId: string, friendId: string) => Promise<void>;

  // Sync
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  isRefreshing: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: number | null;
  /** Number of writes made offline waiting to sync */
  pendingSyncCount: number;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ── Config ─────────────────────────────────────────────────────────────────

/** How often to push queued writes and pull fresh data while the app is open. */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Longest we wait for Supabase to say whether there is a session before
 * falling back to the locally cached identity. Keeps a stalled auth call from
 * holding the app on its launch spinner.
 */
const AUTH_RESOLVE_TIMEOUT_MS = 4000;

// ── Helpers ────────────────────────────────────────────────────────────────

function isOfflineError(err: unknown): boolean {
  return (
    err instanceof OfflineError ||
    (err instanceof TypeError &&
      (err.message === 'Network request failed' ||
        err.message === 'Failed to fetch'))
  );
}

function sortEvents(events: AppEvent[]): AppEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

/** A create that has replayed successfully, so its local id can be retired. */
type ReplayResult =
  | { kind: 'friend'; localId: string; row: Friend }
  | { kind: 'event'; localId: string; row: AppEvent }
  | null;

async function replayOp(op: QueuedOp): Promise<ReplayResult> {
  switch (op.type) {
    case 'createFriend': {
      const row = await api.post<Friend>('/friends', op.data);
      return row ? { kind: 'friend', localId: op.localId, row } : null;
    }
    case 'createEvent': {
      const row = await api.post<AppEvent>('/events', op.data);
      return row ? { kind: 'event', localId: op.localId, row } : null;
    }
    case 'recordHangout':
      await api.post(`/friends/${op.friendId}/hangout`, { date: op.date });
      return null;
    case 'deleteFriend':
      await api.delete(`/friends/${op.friendId}`);
      return null;
    case 'addFriendToGroup':
      await api.put(
        `/friends/${op.friendId}/groups/${encodeURIComponent(op.groupName)}`
      );
      return null;
    case 'removeFriendFromGroup':
      await api.delete(
        `/friends/${op.friendId}/groups/${encodeURIComponent(op.groupName)}`
      );
      return null;
    case 'deleteGroup':
      await api.delete(`/groups/${encodeURIComponent(op.groupName)}`);
      return null;
    case 'updateEvent':
      await api.put(`/events/${op.eventId}`, op.data);
      return null;
    case 'deleteEvent':
      await api.delete(`/events/${op.eventId}`);
      return null;
    case 'addFriendsToEvent':
      await api.post(`/events/${op.eventId}/friends`, {
        friend_ids: op.friendIds,
      });
      return null;
    case 'removeFriendFromEvent':
      await api.delete(`/events/${op.eventId}/friends/${op.friendId}`);
      return null;
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    user: sessionUser,
    loading: sessionLoading,
    signIn: sessionSignIn,
    signUp: sessionSignUp,
    signOut: sessionSignOut,
  } = useAuth();

  // Locally cached identity: lets the app open into the user's data with no
  // network, and keeps them signed in when the token can't be refreshed.
  const [cachedUser, setCachedUser] = useState<User | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [signedOutId, setSignedOutId] = useState<string | null>(null);

  useEffect(() => {
    getCachedUser().then((u) => {
      setCachedUser(u);
      setCacheChecked(true);
    });
    const timer = setTimeout(
      () => setAuthTimedOut(true),
      AUTH_RESOLVE_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sessionUser) return;
    setCachedUser(sessionUser);
    cacheUser(sessionUser);
  }, [sessionUser]);

  const candidateUser = sessionUser ?? cachedUser;
  const user =
    candidateUser && candidateUser.id !== signedOutId ? candidateUser : null;
  const authLoading =
    !authTimedOut && sessionLoading && !(cacheChecked && !!cachedUser);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await sessionSignIn(email, password);
      if (!result.error) setSignedOutId(null);
      return result;
    },
    [sessionSignIn]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const result = await sessionSignUp(email, password);
      if (!result.error) setSignedOutId(null);
      return result;
    },
    [sessionSignUp]
  );

  const signOut = useCallback(async () => {
    // Sign out locally first so it works with no connectivity.
    if (candidateUser) setSignedOutId(candidateUser.id);
    setCachedUser(null);
    await clearCachedUser();
    return sessionSignOut();
  }, [candidateUser, sessionSignOut]);

  // null = not yet fetched; [] = fetched but empty; Friend[] = loaded
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [events, setEvents] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAtState] = useState<number | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Refs so callbacks can read current state without being recreated
  const friendsRef = useRef(friends);
  const syncingRef = useRef(false);
  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  // Track previous user ID to reset data when the user changes.
  // setState-during-render is the React-recommended pattern for derived state
  // resets: React re-renders immediately with the new state, no effect needed.
  const [prevUserId, setPrevUserId] = useState(user?.id);
  if (prevUserId !== user?.id) {
    setPrevUserId(user?.id);
    setFriends(null);
    setEvents(null);
    setPendingSyncCount(0);
    setLastSyncedAtState(null);
  }

  const isLoadingFriends = !!user && !authLoading && friends === null;
  const isLoadingEvents = !!user && !authLoading && events === null;

  /** Records connectivity state; returns true when the caller should queue. */
  const handledOffline = useCallback((err: unknown) => {
    if (!isOfflineError(err)) return false;
    setIsOnline(false);
    return true;
  }, []);

  // Request notification permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-persist to cache whenever state changes
  useEffect(() => {
    if (user && friends !== null) cacheFriends(user.id, friends);
  }, [user, friends]);

  useEffect(() => {
    if (user && events !== null) cacheEvents(user.id, events);
  }, [user, events]);

  // Load friends: serve cache immediately, then refresh from API in background
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getCachedFriends(user.id).then((cached) => {
      if (cached && !cancelled) setFriends((prev) => prev ?? cached);
    });

    api
      .get<Friend[]>('/friends')
      .then((data) => {
        if (cancelled || !data) return;
        setIsOnline(true);
        setFriends((prev) => [
          ...data,
          ...(prev ?? []).filter((f) => isLocalId(f.id)),
        ]);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handledOffline(err)) {
          setError(
            err instanceof Error ? err.message : 'Failed to load friends'
          );
        }
        // Offline: fall back to the cache, and show an empty list rather than
        // an endless spinner when there is nothing cached yet.
        setFriends((prev) => prev ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [user, handledOffline]);

  // Load events: serve cache immediately, then refresh from API in background
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getCachedEvents(user.id).then((cached) => {
      if (cached && !cancelled) setEvents((prev) => prev ?? cached);
    });

    api
      .get<AppEvent[]>('/events')
      .then((data) => {
        if (cancelled || !data) return;
        setIsOnline(true);
        setEvents((prev) =>
          sortEvents([...data, ...(prev ?? []).filter((e) => isLocalId(e.id))])
        );
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handledOffline(err)) {
          setError(
            err instanceof Error ? err.message : 'Failed to load events'
          );
        }
        setEvents((prev) => prev ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [user, handledOffline]);

  // Load queue depth and last sync time on user change
  useEffect(() => {
    if (!user) return;
    getQueue(user.id).then((q) => setPendingSyncCount(q.length));
    getLastSyncedAt(user.id).then(setLastSyncedAtState);
  }, [user]);

  // ── Friend actions ──

  /** Insert a friend locally and queue the create for the next sync. */
  const queueFriendCreate = useCallback(
    async (f: NewFriend) => {
      const localId = newLocalId();
      const data = {
        name: f.name,
        phone_number: f.phone_number ?? null,
        birthday: f.birthday ?? null,
      };
      setFriends((prev) => [
        ...(prev ?? []),
        {
          id: localId,
          last_action: null,
          groups: [],
          created_at: new Date().toISOString(),
          ...data,
        },
      ]);
      if (!user) return;
      await enqueue(user.id, { type: 'createFriend', localId, data });
      setPendingSyncCount((c) => c + 1);
    },
    [user]
  );

  const addFriend = useCallback(
    async (f: NewFriend) => {
      try {
        const data = await api.post<Friend>('/friends', f);
        if (data) {
          setIsOnline(true);
          setFriends((prev) => [...(prev ?? []), data]);
        }
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await queueFriendCreate(f);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to add friend');
        }
      }
    },
    [user, handledOffline, queueFriendCreate]
  );

  const addFriends = useCallback(
    async (fs: NewFriend[]) => {
      const failed: string[] = [];
      let offline = false;

      for (const f of fs) {
        // Once we know we're offline, queue the rest without retrying.
        if (offline) {
          await queueFriendCreate(f);
          continue;
        }
        try {
          const data = await api.post<Friend>('/friends', f);
          if (data) setFriends((prev) => [...(prev ?? []), data]);
        } catch (err) {
          if (handledOffline(err) && user) {
            offline = true;
            await queueFriendCreate(f);
          } else {
            failed.push(f.name);
          }
        }
      }

      if (failed.length > 0) setError(`Failed to import: ${failed.join(', ')}`);
    },
    [user, handledOffline, queueFriendCreate]
  );

  const recordHangout = useCallback(
    async (friendId: string) => {
      const today = new Date().toISOString().split('T')[0];

      // Friends created offline have no server row yet — record locally only.
      if (isLocalId(friendId)) {
        setFriends((prev) =>
          (prev ?? []).map((f) =>
            f.id === friendId ? { ...f, last_action: today } : f
          )
        );
        if (user) {
          await enqueue(user.id, {
            type: 'recordHangout',
            friendId,
            date: today,
          });
          setPendingSyncCount((c) => c + 1);
        }
        return;
      }

      try {
        const { last_action } = await api.post<{ last_action: string }>(
          `/friends/${friendId}/hangout`
        );
        setIsOnline(true);
        setFriends((prev) =>
          (prev ?? []).map((f) =>
            f.id === friendId ? { ...f, last_action } : f
          )
        );
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          setFriends((prev) =>
            (prev ?? []).map((f) =>
              f.id === friendId ? { ...f, last_action: today } : f
            )
          );
          await enqueue(user.id, {
            type: 'recordHangout',
            friendId,
            date: today,
          });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to record hangout'
          );
        }
      }
    },
    [user, handledOffline]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      // Optimistic remove
      setFriends((prev) => (prev ?? []).filter((f) => f.id !== friendId));
      setEvents((prev) =>
        (prev ?? []).map((e) => ({
          ...e,
          event_friends: e.event_friends.filter(
            (ef) => ef.friend_id !== friendId
          ),
        }))
      );

      if (isLocalId(friendId)) {
        // Never reached the server — drop its queued create instead.
        if (user) {
          const queue = await getQueue(user.id);
          const remaining = queue.filter(
            (op) =>
              !(op.type === 'createFriend' && op.localId === friendId) &&
              !('friendId' in op && op.friendId === friendId)
          );
          await setQueue(user.id, remaining);
          setPendingSyncCount(remaining.length);
        }
        return;
      }

      try {
        await api.delete(`/friends/${friendId}`);
        setIsOnline(true);
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await enqueue(user.id, { type: 'deleteFriend', friendId });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to delete friend'
          );
        }
      }
    },
    [user, handledOffline]
  );

  // ── Group actions ──

  const addFriendToGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      const queueLocally = async () => {
        const current = friendsRef.current?.find((f) => f.id === friendId);
        const newGroups = [...new Set([...(current?.groups ?? []), groupName])];
        setFriends((prev) =>
          (prev ?? []).map((f) =>
            f.id === friendId ? { ...f, groups: newGroups } : f
          )
        );
        if (user) {
          await enqueue(user.id, {
            type: 'addFriendToGroup',
            friendId,
            groupName,
          });
          setPendingSyncCount((c) => c + 1);
        }
        return newGroups;
      };

      if (isLocalId(friendId)) return queueLocally();

      try {
        const { groups } = await api.put<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        setIsOnline(true);
        setFriends((prev) =>
          (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
        );
        return groups;
      } catch (err) {
        if (handledOffline(err) && user) return queueLocally();
        return null;
      }
    },
    [user, handledOffline]
  );

  const removeFriendFromGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      const queueLocally = async () => {
        const current = friendsRef.current?.find((f) => f.id === friendId);
        const newGroups = (current?.groups ?? []).filter(
          (g) => g !== groupName
        );
        setFriends((prev) =>
          (prev ?? []).map((f) =>
            f.id === friendId ? { ...f, groups: newGroups } : f
          )
        );
        if (user) {
          await enqueue(user.id, {
            type: 'removeFriendFromGroup',
            friendId,
            groupName,
          });
          setPendingSyncCount((c) => c + 1);
        }
        return newGroups;
      };

      if (isLocalId(friendId)) return queueLocally();

      try {
        const { groups } = await api.delete<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        setIsOnline(true);
        setFriends((prev) =>
          (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
        );
        return groups;
      } catch (err) {
        if (handledOffline(err) && user) return queueLocally();
        return null;
      }
    },
    [user, handledOffline]
  );

  const deleteGroup = useCallback(
    async (groupName: string): Promise<string | undefined> => {
      // Optimistic remove
      setFriends((prev) =>
        (prev ?? []).map((f) => ({
          ...f,
          groups: f.groups?.filter((g) => g !== groupName) ?? [],
        }))
      );

      try {
        await api.delete(`/groups/${encodeURIComponent(groupName)}`);
        setIsOnline(true);
        return groupName;
      } catch (err) {
        if (handledOffline(err) && user) {
          await enqueue(user.id, { type: 'deleteGroup', groupName });
          setPendingSyncCount((c) => c + 1);
          return groupName;
        }
        return undefined;
      }
    },
    [user, handledOffline]
  );

  const updateFriendGroupsLocally = useCallback(
    (friendId: string, groups: string[]) => {
      setFriends((prev) =>
        (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
      );
    },
    []
  );

  // ── Event actions ──

  const createEvent = useCallback(
    async (e: NewEvent): Promise<AppEvent | null> => {
      try {
        const data = await api.post<AppEvent>('/events', e);
        if (data) {
          setIsOnline(true);
          setEvents((prev) => sortEvents([...(prev ?? []), data]));
          scheduleEventReminder(data);
        }
        return data;
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          const localId = newLocalId();
          const optimistic: AppEvent = {
            id: localId,
            name: e.name,
            date: e.date,
            created_at: new Date().toISOString(),
            event_friends: [],
          };
          setEvents((prev) => sortEvents([...(prev ?? []), optimistic]));
          scheduleEventReminder(optimistic);
          await enqueue(user.id, { type: 'createEvent', localId, data: e });
          setPendingSyncCount((c) => c + 1);
          return optimistic;
        }
        setError(err instanceof Error ? err.message : 'Failed to create event');
        return null;
      }
    },
    [user, handledOffline]
  );

  const updateEvent = useCallback(
    async (id: string, e: Partial<NewEvent>) => {
      // Optimistic update
      setEvents((prev) =>
        sortEvents(
          (prev ?? []).map((ev) => (ev.id === id ? { ...ev, ...e } : ev))
        )
      );

      const queueLocally = async () => {
        if (!user) return;
        await enqueue(user.id, { type: 'updateEvent', eventId: id, data: e });
        setPendingSyncCount((c) => c + 1);
      };

      if (isLocalId(id)) {
        // Fold the edit into the queued create so it replays as one insert.
        if (!user) return;
        const queue = await getQueue(user.id);
        const merged = queue.map((op) =>
          op.type === 'createEvent' && op.localId === id
            ? { ...op, data: { ...op.data, ...e } }
            : op
        );
        await setQueue(user.id, merged);
        return;
      }

      try {
        const data = await api.put<AppEvent>(`/events/${id}`, e);
        if (data) {
          setIsOnline(true);
          setEvents((prev) =>
            sortEvents((prev ?? []).map((ev) => (ev.id === id ? data : ev)))
          );
          scheduleEventReminder(data);
        }
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await queueLocally();
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to update event'
          );
        }
      }
    },
    [user, handledOffline]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      // Optimistic remove
      setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
      cancelEventReminder(id);

      if (isLocalId(id)) {
        if (user) {
          const queue = await getQueue(user.id);
          const remaining = queue.filter(
            (op) =>
              !(op.type === 'createEvent' && op.localId === id) &&
              !('eventId' in op && op.eventId === id)
          );
          await setQueue(user.id, remaining);
          setPendingSyncCount(remaining.length);
        }
        return;
      }

      try {
        await api.delete(`/events/${id}`);
        setIsOnline(true);
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await enqueue(user.id, { type: 'deleteEvent', eventId: id });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to delete event'
          );
        }
      }
    },
    [user, handledOffline]
  );

  const addFriendsToEvent = useCallback(
    async (eventId: string, friendIds: string[]) => {
      // Optimistic update
      setEvents((prev) =>
        (prev ?? []).map((e) =>
          e.id === eventId
            ? {
                ...e,
                event_friends: [
                  ...e.event_friends,
                  ...friendIds
                    .filter(
                      (id) => !e.event_friends.some((ef) => ef.friend_id === id)
                    )
                    .map((id) => ({ friend_id: id })),
                ],
              }
            : e
        )
      );

      const queueLocally = async () => {
        if (!user) return;
        await enqueue(user.id, {
          type: 'addFriendsToEvent',
          eventId,
          friendIds,
        });
        setPendingSyncCount((c) => c + 1);
      };

      // Either side of the link may still be local-only.
      if (isLocalId(eventId) || friendIds.some(isLocalId)) {
        await queueLocally();
        return;
      }

      try {
        const data = await api.post<AppEvent>(`/events/${eventId}/friends`, {
          friend_ids: friendIds,
        });
        setIsOnline(true);
        if (data)
          setEvents((prev) =>
            (prev ?? []).map((e) => (e.id === eventId ? data : e))
          );
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await queueLocally();
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to add friends to event'
          );
        }
      }
    },
    [user, handledOffline]
  );

  const removeFriendFromEvent = useCallback(
    async (eventId: string, friendId: string) => {
      // Optimistic remove
      setEvents((prev) =>
        (prev ?? []).map((e) =>
          e.id === eventId
            ? {
                ...e,
                event_friends: e.event_friends.filter(
                  (ef) => ef.friend_id !== friendId
                ),
              }
            : e
        )
      );

      const queueLocally = async () => {
        if (!user) return;
        await enqueue(user.id, {
          type: 'removeFriendFromEvent',
          eventId,
          friendId,
        });
        setPendingSyncCount((c) => c + 1);
      };

      if (isLocalId(eventId) || isLocalId(friendId)) {
        if (!user) return;
        // Cancel the queued add rather than queueing a remove for a row the
        // server has never seen.
        const queue = await getQueue(user.id);
        const remaining = queue
          .map((op) =>
            op.type === 'addFriendsToEvent' && op.eventId === eventId
              ? {
                  ...op,
                  friendIds: op.friendIds.filter((id) => id !== friendId),
                }
              : op
          )
          .filter(
            (op) =>
              !(op.type === 'addFriendsToEvent' && op.friendIds.length === 0)
          );
        await setQueue(user.id, remaining);
        setPendingSyncCount(remaining.length);
        return;
      }

      try {
        await api.delete(`/events/${eventId}/friends/${friendId}`);
        setIsOnline(true);
      } catch (err: unknown) {
        if (handledOffline(err) && user) {
          await queueLocally();
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to remove friend from event'
          );
        }
      }
    },
    [user, handledOffline]
  );

  // ── Sync ──

  /** Swap a local id for the real one across state once a create lands. */
  const applyReplayResult = useCallback((result: NonNullable<ReplayResult>) => {
    if (result.kind === 'friend') {
      setFriends((prev) =>
        (prev ?? []).map((f) => (f.id === result.localId ? result.row : f))
      );
      setEvents((prev) =>
        (prev ?? []).map((e) => ({
          ...e,
          event_friends: e.event_friends.map((ef) =>
            ef.friend_id === result.localId ? { friend_id: result.row.id } : ef
          ),
        }))
      );
    } else {
      setEvents((prev) =>
        sortEvents(
          (prev ?? []).map((e) =>
            e.id === result.localId
              ? { ...result.row, event_friends: e.event_friends }
              : e
          )
        )
      );
      cancelEventReminder(result.localId);
      scheduleEventReminder(result.row);
    }
  }, []);

  const runRefresh = useCallback(
    async (silent: boolean) => {
      if (!user) return;
      if (!silent) setIsRefreshing(true);
      try {
        const [friendsData, eventsData] = await Promise.all([
          api.get<Friend[]>('/friends'),
          api.get<AppEvent[]>('/events'),
        ]);
        if (!friendsData || !eventsData) return;
        setIsOnline(true);

        const today = new Date().toISOString().split('T')[0];

        // For each friend, find the most recent past event they attended
        const latestEventDate: Record<string, string> = {};
        for (const event of eventsData) {
          if (event.date > today) continue;
          for (const { friend_id } of event.event_friends) {
            if (
              !latestEventDate[friend_id] ||
              event.date > latestEventDate[friend_id]
            ) {
              latestEventDate[friend_id] = event.date;
            }
          }
        }

        // Backfill last_action where the event date is more recent
        const updates = friendsData
          .filter((f) => {
            const eventDate = latestEventDate[f.id];
            if (!eventDate) return false;
            return !f.last_action || eventDate > f.last_action;
          })
          .map((f) =>
            api
              .post<{
                last_action: string;
              }>(`/friends/${f.id}/hangout`, { date: latestEventDate[f.id] })
              .then(({ last_action }) => ({ id: f.id, last_action }))
          );

        const updated = await Promise.all(updates);
        const updatedMap = Object.fromEntries(
          updated.map((u) => [u.id, u.last_action])
        );

        // Rows created offline aren't on the server yet — keep them until
        // their queued create replays.
        setFriends((prev) => [
          ...friendsData.map((f) =>
            updatedMap[f.id] ? { ...f, last_action: updatedMap[f.id] } : f
          ),
          ...(prev ?? []).filter((f) => isLocalId(f.id)),
        ]);
        setEvents((prev) =>
          sortEvents([
            ...eventsData,
            ...(prev ?? []).filter((e) => isLocalId(e.id)),
          ])
        );

        const now = Date.now();
        setLastSyncedAtState(now);
        setLastSyncedAt(user.id, now);
      } catch (err: unknown) {
        if (!handledOffline(err)) {
          setError(err instanceof Error ? err.message : 'Failed to refresh');
        }
        // Offline: silently keep cached data
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [user, handledOffline]
  );

  const refresh = useCallback(() => runRefresh(false), [runRefresh]);

  /** Replay queued offline writes in order, stopping if we're still offline. */
  const flushQueue = useCallback(async () => {
    if (!user) return;
    const queue = await getQueue(user.id);
    if (queue.length === 0) return;

    let remaining = queue;
    while (remaining.length > 0) {
      const [op, ...rest] = remaining;
      try {
        const result = await replayOp(op);
        setIsOnline(true);
        remaining = result
          ? remapQueueIds(rest, result.localId, result.row.id)
          : rest;
        if (result) applyReplayResult(result);
      } catch (err) {
        if (handledOffline(err)) break; // Still offline — keep the rest queued
        remaining = rest; // Drop ops the server rejects (e.g. already gone)
      }
      await setQueue(user.id, remaining);
      setPendingSyncCount(remaining.length);
    }
  }, [user, handledOffline, applyReplayResult]);

  const syncNow = useCallback(async () => {
    if (!user || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await flushQueue();
      await runRefresh(true);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user, flushQueue, runRefresh]);

  // Push anything left over from a previous offline session on startup. The
  // load effects fetch fresh data separately, so this only drains the queue.
  useEffect(() => {
    if (!user) return;
    flushQueue();
  }, [user, flushQueue]);

  // Periodically push local writes to Supabase and pull fresh data
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, syncNow]);

  // Sync whenever the app comes to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => sub.remove();
  }, [syncNow]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        signIn,
        signUp,
        signOut,
        friends: friends ?? [],
        isLoadingFriends,
        addFriend,
        addFriends,
        recordHangout,
        deleteFriend,
        addFriendToGroup,
        removeFriendFromGroup,
        deleteGroup,
        updateFriendGroupsLocally,
        events: events ?? [],
        isLoadingEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        addFriendsToEvent,
        removeFriendFromEvent,
        refresh,
        syncNow,
        isRefreshing,
        isSyncing,
        isOnline,
        lastSyncedAt,
        pendingSyncCount,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
