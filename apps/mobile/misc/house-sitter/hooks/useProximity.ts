import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useHouse } from '../context/HouseContext';
import { distanceMeters, type Coords } from '../utils/geo';
import { getCurrentCoords, getLocationPermissions } from '../utils/homeWatch';

const POLL_MS = 90_000;

/**
 * Foreground half of the leave detection. The OS geofence does the real work
 * in the background; this exists so the app can show live distance, and so a
 * departure is still caught when background location was never granted.
 */
export function useProximity() {
  const { home, settings, raiseDeparture, reloadDeparture } = useHouse();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);
  /** null until the first fix — we only alert on a home → away transition. */
  const wasAway = useRef<boolean | null>(null);

  const check = useCallback(async () => {
    if (!home) return;
    setChecking(true);
    try {
      const permissions = await getLocationPermissions();
      if (!permissions.foreground) {
        setDenied(true);
        return;
      }
      setDenied(false);

      const position = await getCurrentCoords();
      if (!position) return;
      setCoords(position);

      const away = distanceMeters(home, position) > settings.radiusMeters;
      const justLeft = wasAway.current === false && away;
      wasAway.current = away;
      if (justLeft && settings.departureAlerts) {
        await raiseDeparture('foreground');
      }
    } finally {
      setChecking(false);
    }
  }, [home, settings.radiusMeters, settings.departureAlerts, raiseDeparture]);

  useEffect(() => {
    check();
  }, [check]);

  // Coming back to the app is the most likely moment for the picture to have
  // changed — both the location and anything the background task wrote.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      check();
      reloadDeparture();
    });
    return () => subscription.remove();
  }, [check, reloadDeparture]);

  useEffect(() => {
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [check]);

  const distance = home && coords ? distanceMeters(home, coords) : null;

  return {
    coords,
    distance,
    isAway: distance === null ? null : distance > settings.radiusMeters,
    checking,
    permissionDenied: denied,
    refresh: check,
  };
}
