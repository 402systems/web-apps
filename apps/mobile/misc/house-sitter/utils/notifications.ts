/**
 * Local notifications only — nothing is registered with a push service.
 *
 * expo-notifications is loaded lazily because it isn't usable inside Expo Go
 * on Android; in that case every function here quietly becomes a no-op so the
 * rest of the app still runs.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { scheduledTasks, watchTasks } from '../house.config';
import type { LastDone, Settings } from '../storage/store';
import { parseTime, weekdayName } from './date';

const isExpoGo = Constants.appOwnership === 'expo';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEPARTURE_CHANNEL = 'departures';
export const ROUTINE_CHANNEL = 'routine';

type NotificationsModule = typeof import('expo-notifications');

async function load(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export const notificationsSupported = !isExpoGo;

/** Show notifications even when the app is open — the leave alert is useless otherwise. */
export async function configureNotifications(): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEPARTURE_CHANNEL, {
    name: 'Leaving the house',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync(ROUTINE_CHANNEL, {
    name: 'Daily routine',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Fires right now — used by the geofence handler and the in-app distance check. */
export async function presentDepartureAlert(
  checklist: string[]
): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Did you lock up?',
        body: checklist.join('\n'),
        sound: true,
        ...(Platform.OS === 'android'
          ? { channelId: DEPARTURE_CHANNEL }
          : null),
      },
      trigger: null,
    });
  } catch {
    // no-op
  }
}

function eveningBody(weekday: number): { title: string; body: string } {
  const garbage = scheduledTasks.find((t) => t.weekdays?.includes(weekday));
  if (garbage) {
    return {
      title:
        weekday === 4
          ? 'Garbage + recycling night'
          : `${weekdayName(weekday)} — garbage night`,
      body:
        weekday === 4
          ? 'Both bins out on the curb before bed. Good night to swap the litter robot’s waste drawer too.'
          : 'Bag out on the curb before bed, if it’s full or starting to smell.',
    };
  }
  return {
    title: 'Evening check',
    body: 'Litter looking low? Waste drawer light on? Bathroom squeegeed?',
  };
}

/**
 * Next occurrence of a local HH:MM strictly after both `from` and now — an
 * overdue task shouldn't try to schedule itself into the past.
 */
function nextAt(hhmm: string, from: number): Date {
  const { hour, minute } = parseTime(hhmm);
  const floor = Math.max(from, Date.now());
  const candidate = new Date(floor);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= floor) {
    candidate.setTime(candidate.getTime() + DAY_MS);
  }
  return candidate;
}

/**
 * Rebuilds the whole local schedule: one daily morning reminder, one evening
 * reminder per weekday (so garbage nights read differently), and a one-off
 * nudge for each "when it looks low" task, timed off when it was last done.
 *
 * Cheaper to tear down and rebuild than to diff — there are only ~12 of them.
 */
export async function rescheduleAll(
  settings: Settings,
  lastDone: LastDone
): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.remindersEnabled) return;

    const androidChannel =
      Platform.OS === 'android' ? { channelId: ROUTINE_CHANNEL } : null;
    const morning = parseTime(settings.morningTime);
    const evening = parseTime(settings.eveningTime);

    await Notifications.scheduleNotificationAsync({
      identifier: 'routine-morning',
      content: {
        title: 'Morning routine',
        body: 'Wet food split between both bowls, and fresh water in Jack’s bowl.',
        ...androidChannel,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: morning.hour,
        minute: morning.minute,
      },
    });

    for (let weekday = 0; weekday < 7; weekday++) {
      const { title, body } = eveningBody(weekday);
      await Notifications.scheduleNotificationAsync({
        identifier: `routine-evening-${weekday}`,
        content: { title, body, ...androidChannel },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // expo-notifications counts weekdays 1–7 with Sunday first.
          weekday: weekday + 1,
          hour: evening.hour,
          minute: evening.minute,
        },
      });
    }

    for (const task of watchTasks) {
      if (!task.intervalDays) continue;
      const since = lastDone[task.id] ?? Date.now();
      const due = since + task.intervalDays * DAY_MS;
      await Notifications.scheduleNotificationAsync({
        identifier: `watch-${task.id}`,
        content: {
          title: task.title,
          body: task.trigger
            ? `Worth a look — ${task.trigger}.`
            : 'Worth a look.',
          ...androidChannel,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextAt(settings.eveningTime, due),
        },
      });
    }
  } catch {
    // no-op — a failed schedule shouldn't take the app down
  }
}

export async function cancelAll(): Promise<void> {
  const Notifications = await load();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // no-op
  }
}
