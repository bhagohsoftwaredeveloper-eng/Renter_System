import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { unregisterPushToken } from '../api';
import { clearSession } from '../storage';

export default function HomeScreen({ session, notifications, onLogout }) {
  const handleLogout = async () => {
    if (session?.expoToken) {
      await unregisterPushToken(session.expoToken);
    }
    await clearSession();
    onLogout();
  };

  const renderItem = ({ item }) => (
    <View style={styles.notif}>
      <Text style={styles.notifTitle}>{item.title || 'Notification'}</Text>
      <Text style={styles.notifBody}>{item.body}</Text>
      <Text style={styles.notifTime}>{item.receivedAt}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusDot} />
        <Text style={styles.headerText}>Active</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profile}>
        <Text style={styles.name}>{session.name || 'Renter'}</Text>
        <Text style={styles.meta}>
          Reg #{session.registrationNumber} · notifying the{' '}
          <Text style={styles.metaBold}>{session.recipientType}</Text>
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => String(index)}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No alerts yet. You'll see meal-ticket notifications here.
          </Text>
        }
        contentContainerStyle={notifications.length === 0 && styles.emptyWrap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  headerText: { fontSize: 14, color: '#16A34A', fontWeight: '600', flex: 1 },
  logout: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  profile: {
    backgroundColor: '#0F766E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  name: { color: '#fff', fontSize: 22, fontWeight: '700' },
  meta: { color: '#CCFBF1', fontSize: 13, marginTop: 4 },
  metaBold: { fontWeight: '700', textTransform: 'capitalize' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  notif: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
  },
  notifTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  notifBody: { fontSize: 14, color: '#475569', marginTop: 4 },
  notifTime: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  empty: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingHorizontal: 40 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
});
