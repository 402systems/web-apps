import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

interface TaskRowProps {
  title: string;
  detail: string;
  icon: string;
  done: boolean;
  /** Small line under the title — e.g. "last done 3 days ago". */
  meta?: string;
  /** Renders the row in an attention-getting state. */
  overdue?: boolean;
  onToggle: () => void;
}

export function TaskRow({
  title,
  detail,
  icon,
  done,
  meta,
  overdue,
  onToggle,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[styles.row, done && styles.rowDone, overdue && styles.rowOverdue]}
    >
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkbox}>
        <View style={[styles.box, done && styles.boxDone]}>
          {done && <Ionicons name="checkmark" size={16} color="#ffffff" />}
        </View>
      </Pressable>

      <Pressable
        style={styles.body}
        onPress={() => setExpanded((value) => !value)}
      >
        <View style={styles.titleLine}>
          <Ionicons
            name={icon as never}
            size={16}
            color={done ? colors.textMuted : colors.indigo}
          />
          <Text
            style={[styles.title, done && styles.titleDone]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {meta ? (
          <Text style={[styles.meta, overdue && styles.metaOverdue]}>
            {meta}
          </Text>
        ) : null}
        <Text style={styles.detail} numberOfLines={expanded ? undefined : 2}>
          {detail}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowDone: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  rowOverdue: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  checkbox: { paddingTop: 1 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.success, borderColor: colors.success },
  body: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  titleDone: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  meta: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  metaOverdue: { color: colors.warningText },
  detail: { fontSize: 13, lineHeight: 19, color: colors.textTertiary },
});
