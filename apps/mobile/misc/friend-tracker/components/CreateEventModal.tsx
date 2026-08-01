import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import type { Friend, NewEvent } from '../context/AppContext';
import { FriendPickerModal } from './FriendPickerModal';
import { colors } from '../utils/colors';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (event: NewEvent, friendIds: string[]) => void;
  friends: Friend[];
  /** Prefills the calendar, e.g. the day the user tapped to get here. */
  initialDate?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function getMonthName(month: number) {
  return [
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
  ][month];
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

/** Splits a "YYYY-MM-DD" key into calendar-nav parts without any TZ conversion. */
function parseDateKey(dateKey: string) {
  const [year, month] = dateKey.split('-').map(Number);
  return { year, month: month - 1 };
}

export function CreateEventModal({
  visible,
  onClose,
  onCreate,
  friends,
  initialDate,
}: CreateEventModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const [viewYear, setViewYear] = useState(
    () =>
      (initialDate ? parseDateKey(initialDate) : parseDateKey(todayStr)).year
  );
  const [viewMonth, setViewMonth] = useState(
    () =>
      (initialDate ? parseDateKey(initialDate) : parseDateKey(todayStr)).month
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialDate ?? null
  );

  // Re-prefill from the tapped calendar day each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    const base = parseDateKey(initialDate ?? todayStr);
    setViewYear(base.year);
    setViewMonth(base.month);
    setSelectedDate(initialDate ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialDate]);

  const cells = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedFriends = friends.filter((f) =>
    selectedFriendIds.includes(f.id)
  );

  const reset = () => {
    setName('');
    setError('');
    setSelectedFriendIds([]);
    setSelectedDate(initialDate ?? null);
    const base = parseDateKey(initialDate ?? todayStr);
    setViewYear(base.year);
    setViewMonth(base.month);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Event name is required');
      return;
    }
    if (!selectedDate) {
      setError('Pick a date');
      return;
    }
    onCreate({ name: name.trim(), date: selectedDate }, selectedFriendIds);
    reset();
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        onClose={() => {
          reset();
          onClose();
        }}
        title="New Event"
      >
        <TextInput
          style={{
            backgroundColor: colors.bgInput,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.primary,
          }}
          placeholder="Event name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError('');
          }}
          autoFocus
        />

        {/* Calendar */}
        <View
          style={{
            backgroundColor: colors.bgScreen,
            borderRadius: 12,
            padding: 12,
          }}
        >
          {/* Month nav */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Pressable onPress={prevMonth} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                ‹
              </Text>
            </Pressable>
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}
            >
              {getMonthName(viewMonth)} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                ›
              </Text>
            </Pressable>
          </View>

          {/* Day headers */}
          <View style={{ flexDirection: 'row' }}>
            {DAYS.map((d) => (
              <View
                key={d}
                style={{ flex: 1, alignItems: 'center', marginBottom: 4 }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.textMuted,
                  }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <View
                    key={`e-${i}`}
                    style={{ width: '14.28%', height: 36 }}
                  />
                );
              }
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => {
                    setSelectedDate(dateStr);
                    setError('');
                  }}
                  style={{
                    width: '14.28%',
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected
                        ? colors.primary
                        : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: colors.borderMuted,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected || isToday ? '700' : '400',
                        color: isSelected ? colors.bgCard : colors.primary,
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedDate && (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Selected: {selectedDate}
          </Text>
        )}

        {/* Friends */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.textSecondary,
              }}
            >
              Friends ({selectedFriends.length})
            </Text>
            <Pressable
              onPress={() => setPickerVisible(true)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.bgCard,
                }}
              >
                + Add
              </Text>
            </Pressable>
          </View>

          {selectedFriends.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {selectedFriends.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() =>
                    setSelectedFriendIds((prev) =>
                      prev.filter((id) => id !== f.id)
                    )
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.bgInput,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.primary }}>
                    {f.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    ✕
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <Text style={{ fontSize: 13, color: colors.error }}>{error}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => {
              reset();
              onClose();
            }}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: colors.bgInput,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.textTertiary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleCreate}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderRadius: 12,
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: colors.bgCard }}
            >
              Create
            </Text>
          </Pressable>
        </View>
      </Modal>

      <FriendPickerModal
        key={pickerVisible ? 'open' : 'closed'}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        friends={friends}
        selectedIds={selectedFriendIds}
        onConfirm={setSelectedFriendIds}
        title="Add Friends to Event"
      />
    </>
  );
}
