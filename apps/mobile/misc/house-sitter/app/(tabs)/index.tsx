import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DepartureBanner } from '../../components/DepartureBanner';
import { ProgressBar } from '../../components/ProgressBar';
import { SectionHeader } from '../../components/SectionHeader';
import { TaskRow } from '../../components/TaskRow';
import { useHouse } from '../../context/HouseContext';
import { useProximity } from '../../hooks/useProximity';
import { dailyTasks, scheduledTasks, watchTasks } from '../../house.config';
import { colors } from '../../utils/colors';
import {
  daysSince,
  formatDaysAgo,
  formatLongDate,
  stayProgress,
} from '../../utils/date';
import { formatDistance } from '../../utils/geo';

export default function TodayScreen() {
  const { settings, home, lastDone, isDone, toggleTask } = useHouse();
  const { distance, isAway } = useProximity();

  const today = new Date();
  const weekday = today.getDay();

  const todaysTasks = [
    ...dailyTasks,
    ...scheduledTasks.filter((task) => task.weekdays?.includes(weekday)),
  ];

  const doneCount = todaysTasks.filter((task) => isDone(task.id)).length;
  const stay = stayProgress(settings.stayStart, settings.stayEnd, today);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Today</Text>
            {home ? <LocationPill isAway={isAway} distance={distance} /> : null}
          </View>
          <Text style={styles.date}>
            {formatLongDate(today)}
            {stay ? ` · day ${stay.day} of ${stay.total}` : ''}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            {doneCount === todaysTasks.length
              ? 'Everything on today’s list is done 🎉'
              : `${doneCount} of ${todaysTasks.length} done`}
          </Text>
          <ProgressBar done={doneCount} total={todaysTasks.length} />
        </View>

        <DepartureBanner />

        <SectionHeader title="Today" />
        <View style={styles.list}>
          {todaysTasks.map((task) => (
            <TaskRow
              key={task.id}
              title={task.title}
              icon={task.icon}
              detail={task.weekdayDetail?.[weekday] ?? task.detail}
              done={isDone(task.id)}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </View>

        <SectionHeader
          title="Keep an eye on"
          hint="No schedule — the house tells you when. Tick one off and the app starts counting again."
        />
        <View style={styles.list}>
          {watchTasks.map((task) => {
            const done = isDone(task.id);
            const last = lastDone[task.id];
            const overdue =
              !done &&
              last !== undefined &&
              task.intervalDays !== undefined &&
              daysSince(last) >= task.intervalDays;
            return (
              <TaskRow
                key={task.id}
                title={task.title}
                icon={task.icon}
                detail={task.detail}
                done={done}
                overdue={overdue}
                meta={
                  last === undefined
                    ? `Not done yet · ${task.trigger}`
                    : `Last done ${formatDaysAgo(last)} · ${task.trigger}`
                }
                onToggle={() => toggleTask(task.id)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationPill({
  isAway,
  distance,
}: {
  isAway: boolean | null;
  distance: number | null;
}) {
  if (isAway === null) {
    return (
      <View style={styles.pill}>
        <Ionicons name="ellipse-outline" size={12} color={colors.textMuted} />
        <Text style={styles.pillText}>Locating…</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, isAway ? styles.pillAway : styles.pillHome]}>
      <Ionicons
        name={isAway ? 'walk-outline' : 'home'}
        size={12}
        color={isAway ? colors.warningText : colors.success}
      />
      <Text
        style={[
          styles.pillText,
          { color: isAway ? colors.warningText : colors.success },
        ]}
      >
        {isAway && distance !== null
          ? `Away · ${formatDistance(distance)}`
          : 'At the house'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  date: { fontSize: 14, color: colors.textTertiary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgInput,
  },
  pillHome: { backgroundColor: colors.successBg },
  pillAway: { backgroundColor: colors.warningBg },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textTertiary },
  progressCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  progressText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  list: { gap: 10 },
});
