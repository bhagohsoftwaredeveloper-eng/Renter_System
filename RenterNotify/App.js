import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { loadSession, loadAlerts, saveAlerts } from './src/storage';

// Format a moment in Philippine time (Asia/Manila), regardless of device locale.
const phReceivedAt = (d) =>
  d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const receivedListener = useRef();
  const responseListener = useRef();

  // Restore an existing session + the last day's alerts on launch.
  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (stored) setSession(stored);
      const alerts = await loadAlerts(); // already pruned to the last 24h
      setNotifications(alerts);
      setBooting(false);
    })();
  }, []);

  // Add an alert to the list (PH time), keep only the last 24h, and persist it.
  const addAlert = (title, body) => {
    const now = new Date();
    const alert = { title, body, at: now.getTime(), receivedAt: phReceivedAt(now) };
    setNotifications((prev) => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const next = [alert, ...prev].filter((a) => a.at && a.at >= cutoff);
      saveAlerts(next);
      return next;
    });
  };

  // Collect incoming notifications (foreground) and taps (from a closed app).
  useEffect(() => {
    receivedListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      addAlert(title, body);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body } = response.notification.request.content;
      addAlert(title, body);
    });
    return () => {
      if (receivedListener.current) receivedListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={session ? 'dark' : 'light'} />
      {session ? (
        <HomeScreen
          session={session}
          notifications={notifications}
          onLogout={() => {
            setNotifications([]);
            saveAlerts([]);
            setSession(null);
          }}
        />
      ) : (
        <LoginScreen onLogin={setSession} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
