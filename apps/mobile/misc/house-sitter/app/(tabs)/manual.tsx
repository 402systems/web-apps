import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ManualSection } from '../../components/ManualSection';
import { SectionHeader } from '../../components/SectionHeader';
import {
  contacts,
  emergency,
  houseName,
  manual,
  wifi,
} from '../../house.config';
import { colors } from '../../utils/colors';

export default function ManualScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>House manual</Text>
          <Text style={styles.subtitle}>{houseName}</Text>
        </View>

        <View style={styles.wifiCard}>
          <Ionicons name="wifi" size={20} color={colors.blueMid} />
          <View style={styles.wifiText}>
            <Text style={styles.wifiSsid}>{wifi.ssid}</Text>
            <Text style={styles.wifiPassword} selectable>
              {wifi.password}
            </Text>
          </View>
        </View>

        <View style={styles.emergency}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="medkit" size={18} color={colors.error} />
            <Text style={styles.emergencyTitle}>{emergency.headline}</Text>
          </View>
          <Text style={styles.emergencyBody}>{emergency.body}</Text>
          {emergency.reassurance.map((line, index) => (
            <Text key={index} style={styles.emergencyCalm}>
              Don’t worry about: {line}
            </Text>
          ))}
          <View style={styles.contacts}>
            {contacts.map((contact) => (
              <Pressable
                key={contact.name}
                style={styles.contact}
                onPress={() => contact.url && Linking.openURL(contact.url)}
              >
                <View style={styles.contactText}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactName}>{contact.name}</Text>
                </View>
                {contact.url ? (
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.error}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <SectionHeader title="Everything else" />
        <View style={styles.list}>
          {manual.map((section) => (
            <ManualSection key={section.id} section={section} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: colors.textTertiary },
  wifiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.blueBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  wifiText: { flex: 1, gap: 2 },
  wifiSsid: { fontSize: 15, fontWeight: '700', color: colors.primary },
  wifiPassword: {
    fontSize: 14,
    color: colors.blueMid,
    fontVariant: ['tabular-nums'],
  },
  emergency: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emergencyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  emergencyBody: { fontSize: 14, lineHeight: 21, color: colors.primary },
  emergencyCalm: { fontSize: 13, lineHeight: 19, color: colors.textTertiary },
  contacts: { gap: 8, paddingTop: 4 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactText: { flex: 1 },
  contactLabel: { fontSize: 12, color: colors.textMuted },
  contactName: { fontSize: 15, fontWeight: '600', color: colors.primary },
  list: { gap: 10 },
});
