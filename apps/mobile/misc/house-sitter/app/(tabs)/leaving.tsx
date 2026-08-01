import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DepartureBanner } from '../../components/DepartureBanner';
import { SectionHeader } from '../../components/SectionHeader';
import { useHouse } from '../../context/HouseContext';
import { useProximity } from '../../hooks/useProximity';
import { colors } from '../../utils/colors';
import { formatDistance } from '../../utils/geo';
import {
  getCurrentCoords,
  getLocationPermissions,
  requestLocationPermissions,
  type PermissionState,
} from '../../utils/homeWatch';
import {
  notificationsSupported,
  presentDepartureAlert,
  requestNotificationPermission,
} from '../../utils/notifications';

const RADIUS_OPTIONS = [75, 150, 300, 500];

export default function LeavingScreen() {
  const { home, settings, saveHome, removeHome, updateSettings } = useHouse();
  const { distance, isAway, checking, refresh } = useProximity();

  const [permissions, setPermissions] = useState<PermissionState>({
    foreground: false,
    background: false,
  });
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState('');

  const loadPermissions = useCallback(async () => {
    setPermissions(await getLocationPermissions());
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const setHomeToHere = useCallback(async () => {
    setSaving(true);
    try {
      const granted = await requestLocationPermissions();
      setPermissions(granted);
      if (!granted.foreground) {
        Alert.alert(
          'Location needed',
          'House Sitter needs location access to tell when you’ve left the house. You can grant it in Settings → Apps → House Sitter → Permissions.'
        );
        return;
      }
      await requestNotificationPermission();
      const coords = await getCurrentCoords();
      if (!coords) {
        Alert.alert(
          'Couldn’t get a fix',
          'No location reading came back. Step near a window or outside and try again.'
        );
        return;
      }
      await saveHome(coords, 'The house');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [saveHome, refresh]);

  const confirmClearHome = useCallback(() => {
    Alert.alert(
      'Forget this location?',
      'Leave alerts stop until you set the house again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forget', style: 'destructive', onPress: () => removeHome() },
      ]
    );
  }, [removeHome]);

  const addChecklistItem = useCallback(() => {
    const label = newItem.trim();
    if (!label) return;
    updateSettings({
      leaveChecklist: [
        ...settings.leaveChecklist,
        { id: `${Date.now().toString(36)}`, label },
      ],
    });
    setNewItem('');
  }, [newItem, settings.leaveChecklist, updateSettings]);

  const removeChecklistItem = useCallback(
    (id: string) => {
      updateSettings({
        leaveChecklist: settings.leaveChecklist.filter((i) => i.id !== id),
      });
    },
    [settings.leaveChecklist, updateSettings]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaving</Text>
          <Text style={styles.subtitle}>
            When you get more than {settings.radiusMeters} m from the house,
            you’ll get the checklist below.
          </Text>
        </View>

        <DepartureBanner />

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={isAway ? 'walk' : 'home'}
              size={22}
              color={isAway ? colors.warningText : colors.success}
            />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {!home
                  ? 'No house set yet'
                  : isAway === null
                    ? 'Working out where you are…'
                    : isAway
                      ? 'Away from the house'
                      : 'At the house'}
              </Text>
              <Text style={styles.statusDetail}>
                {home && distance !== null
                  ? `${formatDistance(distance)} from the saved spot`
                  : 'Set the house below to start watching.'}
              </Text>
            </View>
            <Pressable onPress={refresh} hitSlop={8} disabled={checking}>
              {checking ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Ionicons name="refresh" size={20} color={colors.textMuted} />
              )}
            </Pressable>
          </View>
        </View>

        <SectionHeader title="The house" />
        <View style={styles.card}>
          {home ? (
            <>
              <Text style={styles.coords}>
                {home.latitude.toFixed(5)}, {home.longitude.toFixed(5)}
              </Text>
              <Text style={styles.cardHint}>
                Saved {new Date(home.savedAt).toLocaleDateString()}. Set it
                again while you’re standing inside for the best accuracy.
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={setHomeToHere}
                  disabled={saving}
                >
                  <Text style={styles.buttonSecondaryText}>
                    {saving ? 'Saving…' : 'Update to here'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonGhost]}
                  onPress={confirmClearHome}
                >
                  <Text style={styles.buttonGhostText}>Forget</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardHint}>
                Stand inside the apartment and save the spot. Everything else on
                this screen keys off it.
              </Text>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={setHomeToHere}
                disabled={saving}
              >
                <Text style={styles.buttonPrimaryText}>
                  {saving ? 'Getting your location…' : 'Set the house to here'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {home && !permissions.background ? (
          <View style={styles.warning}>
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.warningText}
            />
            <Text style={styles.warningText}>
              Background location is off, so alerts only fire while the app is
              open. Grant “Allow all the time” in Settings → Apps → House Sitter
              → Permissions → Location for alerts that work with the app closed.
            </Text>
          </View>
        ) : null}

        {!notificationsSupported ? (
          <View style={styles.warning}>
            <Ionicons name="warning" size={18} color={colors.warningText} />
            <Text style={styles.warningText}>
              Notifications don’t work in Expo Go — install the APK build to get
              actual alerts. Everything else works here.
            </Text>
          </View>
        ) : null}

        <SectionHeader title="How far counts as gone" />
        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map((meters) => {
            const selected = settings.radiusMeters === meters;
            return (
              <Pressable
                key={meters}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => updateSettings({ radiusMeters: meters })}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {meters} m
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Alert me when I leave</Text>
              <Text style={styles.cardHint}>
                One notification per trip out, not one per step.
              </Text>
            </View>
            <Switch
              value={settings.departureAlerts}
              onValueChange={(value) =>
                updateSettings({ departureAlerts: value })
              }
              trackColor={{ true: colors.indigo, false: colors.borderMuted }}
            />
          </View>
        </View>

        <SectionHeader
          title="On the way out"
          hint="This is what the alert says."
        />
        <View style={styles.card}>
          {settings.leaveChecklist.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Ionicons
                name="ellipse"
                size={7}
                color={colors.borderMuted}
                style={styles.checklistDot}
              />
              <Text style={styles.checklistText}>{item.label}</Text>
              <Pressable
                onPress={() => removeChecklistItem(item.id)}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Add something to check"
              placeholderTextColor={colors.textMuted}
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={addChecklistItem}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={addChecklistItem}
            >
              <Text style={styles.buttonSecondaryText}>Add</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.button, styles.buttonGhost]}
          onPress={() =>
            presentDepartureAlert(
              settings.leaveChecklist.map((item) => item.label)
            )
          }
        >
          <Text style={styles.buttonGhostText}>Send a test alert</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.textTertiary },
  statusCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { flex: 1, gap: 2 },
  statusTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  statusDetail: { fontSize: 13, color: colors.textTertiary },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  coords: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  cardHint: { fontSize: 13, lineHeight: 19, color: colors.textTertiary },
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: colors.indigo },
  buttonPrimaryText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  buttonSecondary: {
    backgroundColor: colors.bgInput,
    flex: 0,
    paddingHorizontal: 18,
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  buttonGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 14,
    padding: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.warningText,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.indigoBg,
    borderColor: colors.indigo,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textTertiary },
  chipTextSelected: { color: colors.indigo },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, gap: 2 },
  switchTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checklistDot: { marginTop: 1 },
  checklistText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.primary,
    backgroundColor: colors.bgInput,
  },
});
