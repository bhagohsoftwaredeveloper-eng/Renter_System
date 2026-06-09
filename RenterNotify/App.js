import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { loadSession } from './src/storage';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const receivedListener = useRef();

  // Restore an existing session on launch.
  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (stored) setSession(stored);
      setBooting(false);
    })();
  }, []);

  // Collect incoming notifications into the in-memory list shown on Home.
  useEffect(() => {
    receivedListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      setNotifications((prev) => [
        { title, body, receivedAt: new Date().toLocaleString() },
        ...prev,
      ]);
    });
    return () => {
      if (receivedListener.current) {
        receivedListener.current.remove();
      }
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
