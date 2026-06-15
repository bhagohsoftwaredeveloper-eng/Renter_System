; ServeQueue Unified Installer Script (v1.3.0)
; Bundles the Frontend (Electron) + Biometric Bridge only.
; The Backend + Postgres now run on Railway cloud, so the installer no longer
; ships a local server.exe or sets up a local database. Configure the cloud URL
; and API key per terminal in Settings -> Network Configuration after install.

[Setup]
AppName=ServeQueue
AppVersion=1.3.0
AppPublisher=ServeQueue Team
DefaultDirName={autopf}\ServeQueue
DefaultGroupName=ServeQueue
OutputDir=.
OutputBaseFilename=ServeQueue_v1.3.0_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=SecureAccess\assets\serveQueue.ico
UninstallDisplayIcon={app}\Frontend\ServeQueue.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 1. Frontend (Electron App) -- points at the Railway cloud backend by default.
Source: "SecureAccess\release\win-unpacked\*"; DestDir: "{app}\Frontend"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Biometric Bridge -- local hardware interface (DigitalPersona SDK). Stays on
;    the terminal; does fingerprint matching locally and talks to the cloud by id.
Source: "BiometricBridge\bin\Release\net9.0\win-x64\publish\*"; DestDir: "{app}\Bridge"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\ServeQueue Admin"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--admin"
Name: "{group}\ServeQueue Terminal"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--terminal"
Name: "{commondesktop}\ServeQueue Admin"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--admin"; Tasks: desktopicon
Name: "{commondesktop}\ServeQueue Terminal"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--terminal"; Tasks: desktopicon
; The bridge needs an interactive session for hardware access, so it auto-starts
; from the common Startup folder (not as a Windows service).
Name: "{commonstartup}\ServeQueue Biometric Bridge"; Filename: "{app}\Bridge\BiometricBridge.exe"; WorkingDir: "{app}\Bridge"

[Run]
; Start the bridge and launch the app. No database/backend setup -- the backend
; lives on Railway; the terminal reaches it over the network.
Filename: "{app}\Bridge\BiometricBridge.exe"; Description: "Start Biometric Hardware Bridge"; Flags: nowait skipifsilent; WorkingDir: "{app}\Bridge"
Filename: "{app}\Frontend\ServeQueue.exe"; Description: "Launch ServeQueue Admin Panel"; Flags: postinstall nowait skipifsilent unchecked; Parameters: "--admin"
Filename: "{app}\Frontend\ServeQueue.exe"; Description: "Launch ServeQueue Terminal"; Flags: postinstall nowait skipifsilent; Parameters: "--terminal"
