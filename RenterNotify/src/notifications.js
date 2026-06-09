import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { EAS_PROJECT_ID } from './config';

// Show alerts + play sound even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission and returns this device's Expo push token, or throws a
// human-readable error explaining what to fix.
export async function getExpoPushToken() {
  if (!Device.isDevice) {
    // Remote push works on an Android emulator that has Google Play services
    // installed; it never works on an iOS simulator. Warn but keep going so
    // local testing on a Play-enabled Android emulator can still get a token.
    console.warn(
      'Running on an emulator/simulator. Remote push only works on an Android ' +
      'emulator with Google Play services — iOS simulators cannot receive push.'
    );
  }

  // Android needs an explicit channel for notifications to appear.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Meal Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('Notification permission was denied. Enable it in Settings to receive alerts.');
  }

  const projectId =
    EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId;

  // Without a real EAS projectId we can't get a true Expo push token. In a
  // production build that's a fatal misconfiguration — fail loudly rather than
  // silently saving fake tokens that never deliver. In a dev build only, fall
  // back to a fake token so the login + phone-matching flow is testable on an
  // emulator before EAS is set up.
  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') {
    if (!__DEV__) {
      throw new Error('Missing EAS projectId. Set it in app.json (expo.extra.eas.projectId).');
    }
    const fake = Math.random().toString(36).slice(2, 24).padEnd(22, '0');
    console.warn(
      'DEV: no EAS projectId set — using a fake push token. Login works, but real ' +
      'push notifications will not be delivered.'
    );
    return `ExponentPushToken[dev-${fake}]`;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}
