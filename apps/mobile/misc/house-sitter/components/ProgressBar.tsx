import { StyleSheet, View } from 'react-native';
import { colors } from '../utils/colors';

interface ProgressBarProps {
  done: number;
  total: number;
}

export function ProgressBar({ done, total }: ProgressBarProps) {
  const ratio = total === 0 ? 0 : Math.min(1, done / total);
  const complete = total > 0 && done >= total;

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${ratio * 100}%` },
          complete && styles.fillComplete,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.indigo },
  fillComplete: { backgroundColor: colors.success },
});
