import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import { colors } from '../utils/colors';
import { formatTime } from '../utils/date';

const STEP_MINUTES = 15;

interface TimeFieldProps {
  label: string;
  /** "HH:MM", 24h. */
  value: string;
  onChange: (next: string) => void;
}

/** Every quarter hour of the day as "HH:MM" — constant, so built once. */
const OPTIONS: string[] = Array.from(
  { length: (24 * 60) / STEP_MINUTES },
  (_, index) => {
    const minutes = index * STEP_MINUTES;
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
);

export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  // Snap to the nearest slot so a hand-edited value still highlights something.
  const initialIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option >= value)
  );

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.value}>
          <Text style={styles.valueText}>{formatTime(value)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={OPTIONS}
          keyExtractor={(item) => item}
          style={styles.list}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: 44,
            offset: 44 * index,
            index,
          })}
          renderItem={({ item }) => {
            const selected = item === value;
            return (
              <Pressable
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {formatTime(item)}
                </Text>
                {selected && (
                  <Ionicons name="checkmark" size={18} color={colors.indigo} />
                )}
              </Pressable>
            );
          }}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  label: { flex: 1, fontSize: 15, color: colors.primary },
  value: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  list: { maxHeight: 320 },
  option: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionSelected: { backgroundColor: colors.indigoBg },
  optionText: { fontSize: 15, color: colors.primary },
  optionTextSelected: { fontWeight: '700', color: colors.indigo },
});
