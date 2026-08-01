/**
 * The "did you lock the door?" trigger.
 *
 * Two independent mechanisms feed the same departure record:
 *
 *  1. An OS geofence around the saved home location, which fires even when the
 *     app is closed. This is the one that matters in practice.
 *  2. A foreground distance check (see `hooks/useProximity`), for when
 *     background location is denied or the OS is being stingy with geofence
 *     callbacks.
 *
 * `recordDeparture` de-dupes, so both firing on the same walk out is fine.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  getSettings,
  recordDeparture,
  type HomeLocation,
} from '../storage/store';
import { presentDepartureAlert } from './notifications';

export const GEOFENCE_TASK = 'house-sitter-home-geofence';
const REGION_ID = 'home';

/**
 * Defined at module scope so it's registered before the OS can deliver an
 * event — this module is imported from the root layout for that reason.
 */
TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  if (data.eventType !== Location.GeofencingEventType.Exit) return;

  const settings = await getSettings();
  if (!settings.departureAlerts) return;

  const departure = await recordDeparture('geofence');
  if (!departure) return;
  await presentDepartureAlert(settings.leaveChecklist.map((i) => i.label));
});

export interface PermissionState {
  foreground: boolean;
  background: boolean;
}

export async function requestLocationPermissions(): Promise<PermissionState> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      return { foreground: false, background: false };
    }
    // Android only surfaces the "allow all the time" prompt after foreground
    // access has already been granted.
    const bg = await Location.requestBackgroundPermissionsAsync();
    return { foreground: true, background: bg.status === 'granted' };
  } catch {
    return { foreground: false, background: false };
  }
}

export async function getLocationPermissions(): Promise<PermissionState> {
  try {
    const [fg, bg] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);
    return {
      foreground: fg.status === 'granted',
      background: bg.status === 'granted',
    };
  } catch {
    return { foreground: false, background: false };
  }
}

export async function isWatching(): Promise<boolean> {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  } catch {
    return false;
  }
}

/** (Re)starts the geofence. Returns false if background location isn't available. */
export async function startHomeWatch(
  home: HomeLocation,
  radiusMeters: number
): Promise<boolean> {
  const permissions = await getLocationPermissions();
  if (!permissions.background) return false;
  try {
    await stopHomeWatch();
    await Location.startGeofencingAsync(GEOFENCE_TASK, [
      {
        identifier: REGION_ID,
        latitude: home.latitude,
        longitude: home.longitude,
        radius: radiusMeters,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function stopHomeWatch(): Promise<void> {
  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch {
    // no-op
  }
}

export async function getCurrentCoords(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
