import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'ft:sync_queue';
const LOCAL_ID_PREFIX = 'local:';

export type QueuedOp =
  | {
      type: 'createFriend';
      localId: string;
      data: {
        name: string;
        phone_number?: string | null;
        birthday?: string | null;
      };
    }
  | { type: 'recordHangout'; friendId: string; date: string }
  | { type: 'deleteFriend'; friendId: string }
  | { type: 'addFriendToGroup'; friendId: string; groupName: string }
  | { type: 'removeFriendFromGroup'; friendId: string; groupName: string }
  | { type: 'deleteGroup'; groupName: string }
  | {
      type: 'createEvent';
      localId: string;
      data: { name: string; date: string };
    }
  | {
      type: 'updateEvent';
      eventId: string;
      data: { name?: string; date?: string };
    }
  | { type: 'deleteEvent'; eventId: string }
  | { type: 'addFriendsToEvent'; eventId: string; friendIds: string[] }
  | { type: 'removeFriendFromEvent'; eventId: string; friendId: string };

/**
 * Rows created offline get a client-side id so the rest of the app can treat
 * them like any other row. It is swapped for the real database id once the
 * create replays against the API.
 */
export function newLocalId(): string {
  return `${LOCAL_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

/** Rewrite every reference to a local id once the server id is known. */
export function remapQueueIds(
  ops: QueuedOp[],
  localId: string,
  serverId: string
): QueuedOp[] {
  const swap = (id: string) => (id === localId ? serverId : id);

  return ops.map((op) => {
    switch (op.type) {
      case 'recordHangout':
      case 'deleteFriend':
        return { ...op, friendId: swap(op.friendId) };
      case 'addFriendToGroup':
      case 'removeFriendFromGroup':
        return { ...op, friendId: swap(op.friendId) };
      case 'updateEvent':
      case 'deleteEvent':
        return { ...op, eventId: swap(op.eventId) };
      case 'addFriendsToEvent':
        return {
          ...op,
          eventId: swap(op.eventId),
          friendIds: op.friendIds.map(swap),
        };
      case 'removeFriendFromEvent':
        return {
          ...op,
          eventId: swap(op.eventId),
          friendId: swap(op.friendId),
        };
      default:
        return op;
    }
  });
}

export async function getQueue(userId: string): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(`${QUEUE_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

export async function enqueue(userId: string, op: QueuedOp): Promise<void> {
  try {
    const queue = await getQueue(userId);
    queue.push(op);
    await AsyncStorage.setItem(`${QUEUE_KEY}:${userId}`, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export async function setQueue(userId: string, ops: QueuedOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${QUEUE_KEY}:${userId}`, JSON.stringify(ops));
  } catch {
    // ignore storage errors
  }
}
