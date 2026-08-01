import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';

interface SectionHeaderProps {
  title: string;
  hint?: string;
}

export function SectionHeader({ title, hint }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2, paddingTop: 8 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  hint: { fontSize: 13, color: colors.textTertiary },
});
