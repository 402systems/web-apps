import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppEvent, Friend } from '../context/AppContext';
import { EventCard } from './EventCard';
import { formatDayHeading, toDateKey } from '../utils/date';
import { colors } from '../utils/colors';

interface EventCalendarProps {
  events: AppEvent[];
  friends: Friend[];
  onSelectEvent: (event: AppEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateEvent: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Leading blanks so the 1st lands under the right weekday, then the days. */
function buildGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function EventCalendar({
  events,
  friends,
  onSelectEvent,
  onDeleteEvent,
  onCreateEvent,
}: EventCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const eventsByDate = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    for (const event of events) {
      (map[event.date] ??= []).push(event);
    }
    return map;
  }, [events]);

  const cells = useMemo(
    () => buildGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthCount = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return events.filter((e) => e.date.startsWith(prefix)).length;
  }, [events, viewYear, viewMonth]);

  const selectedEvents = eventsByDate[selectedDate] ?? [];

  const goToMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  const showingCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.calendar}>
        {/* Month navigation */}
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => goToMonth(-1)}
            hitSlop={8}
            style={styles.navBtn}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <View style={styles.monthLabelWrap}>
            <Text style={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Text style={styles.monthCount}>
              {monthCount} {monthCount === 1 ? 'event' : 'events'}
            </Text>
          </View>

          <Pressable
            onPress={() => goToMonth(1)}
            hitSlop={8}
            style={styles.navBtn}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {!showingCurrentMonth && (
          <Pressable onPress={goToToday} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Jump to today</Text>
          </Pressable>
        )}

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.weekCell}>
              <Text style={styles.weekLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) {
              return <View key={`blank-${index}`} style={styles.dayCell} />;
            }

            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;
            const isPastDay = dateKey < todayKey;

            return (
              <Pressable
                key={dateKey}
                onPress={() => setSelectedDate(dateKey)}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isToday && !isSelected && styles.dayCircleToday,
                    isSelected && styles.dayCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isPastDay && styles.dayTextPast,
                      (isToday || isSelected) && styles.dayTextEmphasis,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </View>

                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <View
                      key={event.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isPastDay
                              ? colors.textMuted
                              : colors.blue,
                        },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected day */}
      <View style={styles.dayHeaderRow}>
        <Text style={styles.dayHeading}>{formatDayHeading(selectedDate)}</Text>
        {selectedDate === todayKey && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
        )}
      </View>

      {selectedEvents.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>Nothing planned this day.</Text>
          <Pressable onPress={onCreateEvent} style={styles.emptyDayBtn}>
            <Text style={styles.emptyDayBtnText}>+ New event</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.dayEvents}>
          {selectedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              friends={friends}
              onPress={() => onSelectEvent(event)}
              onDelete={() => onDeleteEvent(event.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
  calendar: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 8 },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: colors.primary },
  monthCount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  todayBtn: { alignSelf: 'center', paddingVertical: 6 },
  todayBtnText: { fontSize: 12, fontWeight: '600', color: colors.blueMid },
  weekRow: { flexDirection: 'row', marginTop: 8, marginBottom: 2 },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center' },
  weekLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    height: 46,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: { borderWidth: 1, borderColor: colors.borderMuted },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, color: colors.primary },
  dayTextPast: { color: colors.textTertiary },
  dayTextEmphasis: { fontWeight: '700' },
  dayTextSelected: { color: colors.bgCard },
  dotRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  dayHeading: { fontSize: 16, fontWeight: '700', color: colors.primary },
  todayBadge: {
    backgroundColor: colors.blueBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.blueMid,
    letterSpacing: 0.5,
  },
  dayEvents: { gap: 10 },
  emptyDay: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyDayText: { fontSize: 14, color: colors.textMuted },
  emptyDayBtn: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyDayBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
