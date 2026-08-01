import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionHeader } from '../../components/SectionHeader';
import { TimeField } from '../../components/TimeField';
import { useHouse } from '../../context/HouseContext';
import { scheduledTasks, watchTasks } from '../../house.config';
import { colors } from '../../utils/colors';
import { addDays, dateKey, stayProgress, weekdayName } from '../../utils/date';
import { notificationsSupported } from '../../utils/notifications';

const STAY_LENGTHS = [7, 14, 21, 30];

export default function SettingsScreen() {
  const { settings, updateSettings, resetProgress } = useHouse();

  const stay = stayProgress(settings.stayStart, settings.stayEnd);
  const garbageNights = (scheduledTasks[0]?.weekdays ?? [])
    .map((day) => weekdayName(day))
    .join(', ');

  const startStay = useCallback(
    (lengthDays: number) => {
      const start = settings.stayStart ?? dateKey();
      const startMs = Date.parse(`${start}T00:00:00`);
      updateSettings({
        stayStart: start,
        stayEnd: dateKey(new Date(addDays(startMs, lengthDays - 1))),
      });
    },
    [settings.stayStart, updateSettings]
  );

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Clear all ticks?',
      'Every completed task and “last done” count goes back to zero. The house location and your settings stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => resetProgress(),
        },
      ]
    );
  }, [resetProgress]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Everything is stored on this phone. No account, no server.
          </Text>
        </View>

        <SectionHeader title="Reminders" />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.rowTitle}>Daily reminders</Text>
              <Text style={styles.hint}>
                A morning nudge for the cats, an evening one for the litter
                robot and the bins.
              </Text>
            </View>
            <Switch
              value={settings.remindersEnabled}
              onValueChange={(value) =>
                updateSettings({ remindersEnabled: value })
              }
              trackColor={{ true: colors.indigo, false: colors.borderMuted }}
            />
          </View>

          {settings.remindersEnabled ? (
            <View style={styles.divided}>
              <TimeField
                label="Morning reminder"
                value={settings.morningTime}
                onChange={(morningTime) => updateSettings({ morningTime })}
              />
              <TimeField
                label="Evening reminder"
                value={settings.eveningTime}
                onChange={(eveningTime) => updateSettings({ eveningTime })}
              />
              <Text style={styles.hint}>
                {garbageNights} evenings say “garbage night” instead. The{' '}
                {watchTasks.length} keep-an-eye-on items get their own nudge a
                few days after you last ticked them off.
              </Text>
            </View>
          ) : null}
        </View>

        {!notificationsSupported ? (
          <Text style={styles.warning}>
            Running in Expo Go — notifications are disabled here. Install the
            APK build to get real reminders.
          </Text>
        ) : null}

        <SectionHeader title="The stay" />
        <View style={styles.card}>
          <Text style={styles.rowTitle}>
            {stay
              ? `Day ${stay.day} of ${stay.total}`
              : 'No stay dates set yet'}
          </Text>
          <Text style={styles.hint}>
            {settings.stayStart
              ? `Started ${settings.stayStart}${
                  settings.stayEnd ? `, through ${settings.stayEnd}` : ''
                }.`
              : 'Pick a length to start the countdown from today.'}
          </Text>
          <View style={styles.chipRow}>
            {STAY_LENGTHS.map((days) => (
              <Pressable
                key={days}
                style={styles.chip}
                onPress={() => startStay(days)}
              >
                <Text style={styles.chipText}>{days}d</Text>
              </Pressable>
            ))}
          </View>
          {settings.stayStart ? (
            <Pressable
              onPress={() => updateSettings({ stayStart: null, stayEnd: null })}
            >
              <Text style={styles.link}>Clear the dates</Text>
            </Pressable>
          ) : null}
        </View>

        <SectionHeader title="Data" />
        <View style={styles.card}>
          <Pressable onPress={confirmReset}>
            <Text style={styles.danger}>Clear all ticks</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          House Sitter keeps everything — tasks, ticks, the saved house location
          — in local storage on this device.
        </Text>
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
  subtitle: { fontSize: 14, color: colors.textTertiary },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  hint: { fontSize: 13, lineHeight: 19, color: colors.textTertiary },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    gap: 6,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  link: { fontSize: 14, fontWeight: '600', color: colors.indigo },
  danger: { fontSize: 15, fontWeight: '600', color: colors.danger },
  warning: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.warningText,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 14,
    padding: 14,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    paddingTop: 8,
  },
});
