import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HouseProvider } from '../context/HouseContext';
import { configureNotifications } from '../utils/notifications';
// Imported for its side effect: the geofence task has to be defined before the
// OS can deliver an exit event, including on a cold headless start.
import '../utils/homeWatch';

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
  }, []);

  return (
    <HouseProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </HouseProvider>
  );
}
