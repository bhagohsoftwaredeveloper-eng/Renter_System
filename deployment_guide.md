# ServeQueue Unified Deployment Guide (v1.3.0)

As of v1.3.0 the **backend + database run on Railway cloud**
(`https://rentersystem-production.up.railway.app`). The installer now ships
**only the Frontend (Electron) + Biometric Bridge** — no local Node server, no
local Postgres. Each terminal reaches the backend over the network and does
fingerprint matching locally on the bridge.

## Prerequisites
1. **Windows 10/11 x64**.
2. **Biometric Driver** (DigitalPersona / U.are.U SDK drivers installed).
3. **Internet access** on the terminal (to reach the Railway backend).
   *(Postgres is NOT required on the terminal anymore.)*

## A. Building the installer (one-time, on the dev machine)

1. **Frontend (Electron):**
   ```cmd
   cd SecureAccess
   npm run package
   ```
   → produces `SecureAccess\release\win-unpacked\`.
2. **Biometric Bridge (.NET):**
   ```cmd
   cd BiometricBridge
   dotnet publish -c Release -r win-x64
   ```
   → produces `BiometricBridge\bin\Release\net9.0\win-x64\publish\`.
3. **Compile the installer:** open `unified-setup.iss` in the **Inno Setup
   Compiler** and Build → produces `ServeQueue_v1.3.0_Setup.exe`.

## B. Installing on a terminal

1. **Run the Setup**: run `ServeQueue_v1.3.0_Setup.exe`, grant Administrator
   permissions when prompted.
2. Choose the install folder (default `C:\Program Files\ServeQueue`). The
   installer bundles:
   - **Frontend** (Admin & Terminal windows)
   - **Biometric Bridge** (local hardware interface)
3. The bridge auto-starts from the Startup folder (it needs an interactive
   session for hardware access). No background services or database setup run.

## C. Post-install configuration (per terminal)

Open **ServeQueue Admin → Settings → Network Configuration** and set:

| Setting | Value |
|---|---|
| `BACKEND_URL` | `https://rentersystem-production.up.railway.app/api` |
| **Backend API Key** | the cloud `API_KEY` (from the Railway dashboard / `railway variables --service Renter_System`) |
| `BRIDGE_URL` | `http://127.0.0.1:5003` (stays local) |

> The app already defaults to the cloud backend; you mainly need to fill in the
> **Backend API Key** so the terminal can authenticate (`x-api-key`). Without it,
> requests return 401. Use `127.0.0.1` (not `localhost`) for the bridge — the
> bridge listens on IPv4 only.

## D. Launching the system

- **ServeQueue Admin**: desktop shortcut — manage renters, send QR emails, settings.
- **ServeQueue Terminal**: desktop shortcut at the scanning kiosk.

---

## Troubleshooting

1. **Bridge Unreachable (Communication Error)**:
   - Open Chrome on the terminal and go to `http://127.0.0.1:5003/health`.
   - `{"Status":"Running", ...}` = bridge OK. "Site can't be reached" = bridge
     not running → start it from the Startup folder or run the exe manually (below).
2. **Hardware Not Ready**: go to `http://127.0.0.1:5003/status` and check
   `"readerCount"`. `0` = reader unplugged or drivers missing.
3. **Backend unreachable / 401 / no data**:
   - Confirm the terminal has internet and `BACKEND_URL` points at the Railway
     `/api` URL.
   - Confirm the **Backend API Key** in Settings matches the cloud `API_KEY`.
   - Check the API is up: open `https://rentersystem-production.up.railway.app/health`.
4. **Admin Rights**: run the setup as Administrator so the Startup shortcut and
   files install correctly.

**Manual Bridge Restart**: if the bridge is stuck, run
`C:\Program Files\ServeQueue\Bridge\BiometricBridge.exe` (keep the window open).
