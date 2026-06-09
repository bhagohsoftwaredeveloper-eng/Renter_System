# Renter Notify

Slim cross-platform (Android + iOS) Expo app that lets a parent or student
receive meal-ticket / biometric-scan push notifications from the Renter Systems
backend. Push (Expo) is the sole notification channel.

## How it works

1. User enters their **registration number + phone** on the login screen.
2. The app requests notification permission and gets an **Expo push token**.
3. It calls `POST /api/push/register` on the backend. The server matches the
   phone to the registration's parent or student and stores the token.
4. When someone scans / a meal ticket is issued, the backend pushes to all
   tokens linked to that registration (respecting the parent/student toggles).

## Setup

```bash
cd RenterNotify
npm install
# fix Expo module versions to match the SDK:
npx expo install expo-notifications expo-device expo-constants expo-status-bar @react-native-async-storage/async-storage
```

### Configure before running

Edit `app.json` → `expo.extra`:

- **`apiBaseUrl`** — the backend URL reachable **from the phone**. Not
  `localhost`. Use your PC's LAN IP, e.g. `http://192.168.1.100:5005`
  (run `ipconfig` on Windows to find it; the phone must be on the same Wi‑Fi).
- **`eas.projectId`** — required to issue push tokens. Get it by running
  `npx eas init` (creates the project) or copy it from the Expo dashboard.

## Run (development)

```bash
npm run android   # or: npm start, then scan the QR in Expo Go
```

> Push tokens require a **physical device** — they do not work on emulators.

## Build a standalone APK / IPA

Push notifications work in Expo Go for testing, but for distribution use EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # produces an installable APK/AAB
```

## Notes

- Notification appearance/sound is handled in `src/notifications.js`.
- The backend toggles `push_enabled`, `notify_parent_enabled`,
  `notify_student_enabled` (in `system_settings`) control delivery.
