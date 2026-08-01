import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouse } from '../context/HouseContext';
import { colors } from '../utils/colors';
import { formatClock } from '../utils/date';

/**
 * The point of the whole app: you walked away from the house, so here is the
 * list of things you were supposed to do on the way out.
 */
export function DepartureBanner() {
  const { departure, settings, toggleDepartureItem, resolveDeparture } =
    useHouse();

  if (!departure) return null;

  const checklist = settings.leaveChecklist;
  const allChecked = checklist.every((item) =>
    departure.checked.includes(item.id)
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={20} color={colors.warningText} />
        <Text style={styles.title}>You left the house</Text>
        <Text style={styles.time}>{formatClock(departure.at)}</Text>
      </View>

      <View style={styles.list}>
        {checklist.map((item) => {
          const checked = departure.checked.includes(item.id);
          return (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={() => toggleDepartureItem(item.id)}
            >
              <View style={[styles.box, checked && styles.boxChecked]}>
                {checked && (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                )}
              </View>
              <Text
                style={[styles.itemText, checked && styles.itemTextChecked]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.button, allChecked && styles.buttonAllGood]}
        onPress={resolveDeparture}
      >
        <Text style={styles.buttonText}>
          {allChecked ? 'All good — dismiss' : 'Dismiss anyway'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.warningText,
  },
  time: { fontSize: 12, fontWeight: '600', color: colors.warningText },
  list: { gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.warningText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary },
  itemTextChecked: { color: colors.textTertiary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonAllGood: { backgroundColor: colors.success },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
