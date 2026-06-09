# Cloud Deployment (Railway)

This puts the backend + Postgres in the cloud so the RenterNotify app and the
SecureAccess terminal can reach it from anywhere (mobile data, any Wi-Fi).
Notifications are delivered via Expo push (→ FCM/APNs), which is already cloud,
so once the backend is reachable, notifications arrive on the phone wherever it is.

## 1. Create the project + database

1. Push this repo to GitHub.
2. Railway dashboard → **New Project → Deploy from GitHub repo** → select this repo.
3. In the service **Settings → Root Directory**, set `backend` (the API lives in a
   subfolder). Railway reads [backend/railway.json](backend/railway.json) for the
   build/start config (Nixpacks, `node server.js`, health check on `/health`).
4. Add Postgres: **New → Database → Add PostgreSQL** in the same project.

## 2. Set the service variables

In the backend service **Variables** tab:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (references the Postgres service) |
| `RUN_DB_INIT` | `true` (first deploy only — builds the schema from `init_db.sql`) |
| `API_KEY` | a strong random string (admin/terminal auth) |
| `MOBILE_API_KEY` | a different strong random string (app auth) |
| `JWT_SECRET` | a strong random string |
| `DB_SSL` | `false` **only if** `DATABASE_URL` uses `…railway.internal`; else omit |

> Railway sets `PORT` automatically and the server already reads it.
> After the first successful boot you may set `RUN_DB_INIT=false` (the SQL is
> idempotent, so leaving it is also harmless).

Your public URL appears under **Settings → Networking → Generate Domain**, e.g.
`https://renter-systems-api.up.railway.app`.

## 3. Point the clients at the cloud

**SecureAccess terminal** (browser console / terminal config, no rebuild needed):
```js
localStorage.setItem('BACKEND_URL', 'https://renter-systems-api.up.railway.app/api');
localStorage.setItem('API_KEY', '<API_KEY you set>');
```

**RenterNotify** ([app.json](RenterNotify/app.json) → `expo.extra`):
```json
"apiBaseUrl": "https://renter-systems-api.up.railway.app",
"mobileApiKey": "<MOBILE_API_KEY you set>"
```

## Notes

- Auth is opt-in: with `API_KEY` / `MOBILE_API_KEY` unset (local dev) the
  endpoints stay open. They enforce the `x-api-key` header once set (cloud).
- The biometric bridge stays **local** per terminal (`BRIDGE_URL`); only the
  backend moves to the cloud.
- Railway bills by usage (with a starter credit). Unlike free tiers it does not
  cold-start sleep, so push notifications fire without startup delay.
