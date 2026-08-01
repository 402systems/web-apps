import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ManualSection as ManualSectionData } from '../house.config';
import { colors } from '../utils/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ManualSectionProps {
  section: ManualSectionData;
  defaultOpen?: boolean;
}

export function ManualSection({ section, defaultOpen }: ManualSectionProps) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((value) => !value);
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={toggle}>
        <Ionicons
          name={section.icon as never}
          size={18}
          color={colors.indigo}
        />
        <Text style={styles.title}>{section.title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {open && (
        <View style={styles.body}>
          {section.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.bullet} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  item: { flexDirection: 'row', gap: 10 },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderMuted,
    marginTop: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
