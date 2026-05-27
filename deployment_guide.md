# ServeQueue Unified Deployment Guide (v1.2.0)

Follow these steps to deploy and run the ServeQueue system using the unified setup.

## Prerequisites
1. **Windows 10/11 x64**.
2. **Postgres** (v14 or higher installed).
3. **Biometric Driver** (DigitalPersona/U.are.U SDK drivers installed).

## 1. Installation Process

1. **Run the Setup**:
   - Locate and run `ServeQueue_v1.2.0_Setup.exe`.
   - **Important**: Grant Administrator permissions when prompted.
2. **Configuration**:
   - Choose your installation folder (default: `C:\Program Files\ServeQueue`).
   - The installer will automatically bundle:
     - **Frontend** (Admin & Terminal windows)
     - **Backend** (Node.js API)
     - **Biometric Bridge** (Hardware interface)
3. **Automatic Background Setup**:
   - The installer will automatically register the **Backend** and **Biometric Bridge** as Windows background services.
   - You do NOT need to run any manual scripts.

## 2. Post-Installation Configuration

### Manual Database Setup (Fallback)
If the installer fails to create the database automatically, follow these steps:

#### Method A: Using pgAdmin (GUI)
1.  **Open pgAdmin 4** and connect to your server.
2.  **Create Database**: Right-click "Databases" -> Create -> Database. Name it **`renter_systems`**.
3.  **Run SQL**: Right-click the new `renter_systems` database -> **Query Tool**.
4.  **Load Script**: Open the folder `C:\Program Files (x86)\ServeQueue\Backend`. Drag the **`init_db.sql`** file into the Query Tool and click **Execute** (F5).

#### Method B: Using Command Line (psql)
1.  Open **Command Prompt** (cmd) as Administrator.
2.  **Create DB**:
    ```cmd
    psql -U postgres -c "CREATE DATABASE renter_systems;"
    ```
3.  **Apply Schema**:
    ```cmd
    psql -U postgres -d renter_systems -f "C:\Program Files (x86)\ServeQueue\Backend\init_db.sql"
    ```

### Environment Variables Check
1.  Navigate to `C:\Program Files (x86)\ServeQueue\Backend`.
2.  Open **`.env`** in a text editor (Notepad).
3.  Verify:
    - `DB_USER=postgres`
    - `DB_PASSWORD=123700` (Update this if your PostgreSQL password is different!)
    - `DB_NAME=renter_systems`
4.  **Save** and restart the **ServeQueueBackend** task in Task Scheduler.

### Environment Variables
1. Navigate to `{InstallationFolder}\Backend`.
2. Open the `.env` file.
3. Ensure the `DB_PASSWORD` matches your Postgres password.
4. Ensure `BIOMETRIC_BRIDGE_URL=http://127.0.0.1:5003`.

## 3. Launching the System

- **ServeQueue Admin**: Use the desktop shortcut to manage users and system settings.
- **ServeQueue Terminal**: Use the desktop shortcut at the scanning kiosk.

---

**Troubleshooting**:
1.  **Bridge Unreachable (Communication Error)**:
    - Open Google Chrome on the terminal PC.
    - Go to: `http://127.0.0.1:5003/health`
    - If it says `{"Status":"Running", ...}`, the bridge is working.
    - If it says "Site can't be reached", the bridge service is NOT running. Open **Task Scheduler** and ensure the `ServeQueueBridge` task status is **"Running"**.
2.  **Hardware Not Ready**:
    - Go to `http://127.0.0.1:5003/status`.
    - Check `"readerCount"`. If it is `0`, the Biometric Reader is not plugged in or the drivers are missing.
3.  **Database Error**: Check the `DB_PASSWORD` in the Backend `.env` and ensure the Postgres service is active.
4.  **Admin Rights**: Ensure the setup was run with Administrator privileges to register services.

**Manual Bridge Restart**:
If the bridge is stuck, you can manually run:
`C:\Program Files (x86)\ServeQueue\Bridge\BiometricBridge.exe`
(Keep this window open while testing).
