# RenterNotify Web — download landing page

A tiny Express site that lets renters download the **Renter Notify** Android APK.
Deployed as its own Railway service (separate from the backend).

## Layout

- `server.js` — serves `public/` and the APK at `GET /download`
- `public/` — landing page (`index.html`, `styles.css`, `assets/`)
- `downloads/` — drop the `.apk` here; newest `*.apk` is served automatically
- `railway.json` — Nixpacks build, `node server.js`, health check at `/health`

## Routes

| Route          | What it does                                              |
| -------------- | -------------------------------------------------------- |
| `/`            | Landing page with a Download button                      |
| `/download`    | Sends the APK as `ZT-Notify.apk` (503 if none yet)   |
| `/api/release` | JSON: `{ available, fileName, sizeMb, updatedAt }`       |
| `/health`      | `{ status: "ok" }` for Railway                           |

## Getting the APK

The distributable APK is the **EAS `preview` build** (signed, points at the cloud
backend, real FCM push). From `../RenterNotify`:

```bash
EXPO_TOKEN=… npx eas-cli build --platform android --profile preview --non-interactive
```

Download the resulting `.apk` and put it in `downloads/`. (The local
`android/app/build/outputs/apk/debug/app-debug.apk` is a debug build and is only
useful for testing this page, not for real users.)

## Run locally

```bash
npm install
npm start        # http://localhost:8080
```

## Deploy to Railway

The APK is gitignored (it is large), so pick one:

**A) Deploy from local files (recommended for the APK):**
```bash
railway link        # select the Renter_system project, create a new service
railway up          # uploads this folder incl. the APK in downloads/
```

**B) Deploy from GitHub:** add a new service in the `Renter_system` project,
repo `JhazonE/Renter_System`, **Root Directory = `RenterNotifyWeb`**. Because
GitHub deploys won't include the gitignored APK, force-add it once:
`git add -f RenterNotifyWeb/downloads/ZT-Notify.apk`.

Railway provides `PORT` automatically; no other env vars are required.
