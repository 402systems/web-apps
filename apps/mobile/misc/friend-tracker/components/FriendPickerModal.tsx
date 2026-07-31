import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import type { Friend } from '../context/AppContext';
import { colors } from '../utils/colors';

interface FriendPickerModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
  title?: string;
}

export function FriendPickerModal({
  visible,
  onClose,
  friends,
  selectedIds,
  onConfirm,
  title = 'Add Friends',
}: FriendPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedIds)
  );
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const groups = useMemo(
    () => [...new Set(friends.flatMap((f) => f.groups ?? []))].sort(),
    [friends]
  );

  const groupFiltered = useMemo(
    () =>
      activeGroup
        ? friends.filter((f) => f.groups?.includes(activeGroup))
        : friends,
    [friends, activeGroup]
  );

  const filtered = useMemo(
    () =>
      groupFiltered.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      ),
    [groupFiltered, search]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const wholeGroupSelected =
    !!activeGroup &&
    groupFiltered.length > 0 &&
    groupFiltered.every((f) => selected.has(f.id));

  const toggleWholeGroup = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (wholeGroupSelected) {
        for (const f of groupFiltered) next.delete(f.id);
      } else {
        for (const f of groupFiltered) next.add(f.id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm([...selected]);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <TextInput
        style={styles.search}
        placeholder="Search..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {groups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.groupRow}
          style={styles.groupScroll}
        >
          <Pressable onPress={() => setActiveGroup(null)}>
            <View
              style={[styles.chip, activeGroup === null && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  activeGroup === null && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </View>
          </Pressable>
          {groups.map((name) => (
            <Pressable key={name} onPress={() => setActiveGroup(name)}>
              <View
                style={[styles.chip, activeGroup === name && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeGroup === name && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {activeGroup && groupFiltered.length > 0 && (
        <Pressable onPress={toggleWholeGroup} style={styles.wholeGroupRow}>
          <Text style={styles.wholeGroupText}>
            {wholeGroupSelected
              ? `Deselect all of ${activeGroup}`
              : `Select whole group (${groupFiltered.length})`}
          </Text>
          <View
            style={[
              styles.checkbox,
              wholeGroupSelected && styles.checkboxChecked,
            ]}
          >
            {wholeGroupSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </Pressable>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const checked = selected.has(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} style={styles.row}>
              <Text style={styles.rowName}>{item.name}</Text>
              <View
                style={[styles.checkbox, checked && styles.checkboxChecked]}
              >
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No friends found</Text>
        }
      />
      <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
        <Text style={styles.confirmBtnText}>
          Add{' '}
          {selected.size > 0
            ? `${selected.size} friend${selected.size !== 1 ? 's' : ''}`
            : 'friends'}
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 12,
  },
  groupScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  groupRow: { gap: 8 },
  chip: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.bgCard },
  wholeGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  wholeGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  list: { maxHeight: 240 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowName: { fontSize: 16, color: colors.primary, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: { color: colors.bgCard, fontSize: 13, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.bgInput },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: { color: colors.bgCard, fontSize: 16, fontWeight: '600' },
});
