import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { colors } from '../utils/colors';

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Compact indicator for offline state and unsynced writes. Tapping it forces
 * a sync instead of waiting for the periodic one.
 */
export function SyncStatusPill() {
  const { isOnline, isSyncing, pendingSyncCount, lastSyncedAt, syncNow } =
    useAppContext();

  // Everything is up to date and online — stay out of the way.
  if (isOnline && !isSyncing && pendingSyncCount === 0 && !lastSyncedAt) {
    return null;
  }

  const offline = !isOnline;

  let label: string;
  if (isSyncing) {
    label = 'Syncing…';
  } else if (offline) {
    label =
      pendingSyncCount > 0
        ? `Offline · ${pendingSyncCount} to sync`
        : 'Offline';
  } else if (pendingSyncCount > 0) {
    label = `${pendingSyncCount} to sync`;
  } else {
    label = lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : 'Not synced yet';
  }

  const tone = offline
    ? { bg: colors.warningBg, fg: colors.warningText }
    : pendingSyncCount > 0
      ? { bg: colors.blueBg, fg: colors.blueMid }
      : { bg: colors.bgInput, fg: colors.textTertiary };

  return (
    <Pressable
      onPress={() => syncNow()}
      disabled={isSyncing}
      hitSlop={6}
      style={[styles.pill, { backgroundColor: tone.bg }]}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'}
          size={13}
          color={tone.fg}
        />
      )}
      <Text style={[styles.label, { color: tone.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Full-width banner for screens with room to explain what offline means. */
export function OfflineBanner() {
  const { isOnline, pendingSyncCount } = useAppContext();
  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons
        name="cloud-offline-outline"
        size={14}
        color={colors.warningText}
      />
      <Text style={styles.bannerText}>
        Offline — changes are saved on this device
        {pendingSyncCount > 0
          ? ` and will sync (${pendingSyncCount} pending).`
          : ' and will sync automatically.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: { fontSize: 11, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningBg,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.warningText },
});
