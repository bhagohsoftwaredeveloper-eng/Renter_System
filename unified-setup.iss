; ServeQueue Unified Installer Script (v1.2.0)
; Bundles Frontend, Backend, and Biometric Bridge

[Setup]
AppName=ServeQueue
AppVersion=1.2.0
AppPublisher=ServeQueue Team
DefaultDirName={autopf}\ServeQueue
DefaultGroupName=ServeQueue
OutputDir=.
OutputBaseFilename=ServeQueue_v1.2.0_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=SecureAccess\dist\favicon.ico
UninstallDisplayIcon={app}\Frontend\ServeQueue.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 1. Frontend (Electron App)
Source: "SecureAccess\release\win-unpacked\*"; DestDir: "{app}\Frontend"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Backend
Source: "backend\dist\server.exe"; DestDir: "{app}\Backend"; Flags: ignoreversion
Source: "backend\dist\.env"; DestDir: "{app}\Backend"; Flags: ignoreversion
Source: "backend\init_db.sql"; DestDir: "{app}\Backend"; Flags: ignoreversion
Source: "backend\scripts\setup-db.ps1"; DestDir: "{app}\Backend\scripts"; Flags: ignoreversion
Source: "backend\scripts\install-service.ps1"; DestDir: "{app}\Backend\scripts"; Flags: ignoreversion
Source: "backend\scripts\uninstall-service.ps1"; DestDir: "{app}\Backend\scripts"; Flags: ignoreversion

; 3. Biometric Bridge
Source: "BiometricBridge\bin\Release\net9.0\win-x64\publish\*"; DestDir: "{app}\Bridge"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "BiometricBridge\scripts\install-service.ps1"; DestDir: "{app}\Bridge\scripts"; Flags: ignoreversion
Source: "BiometricBridge\scripts\uninstall-service.ps1"; DestDir: "{app}\Bridge\scripts"; Flags: ignoreversion

; 4. Root Registration Script
Source: "install_services.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ServeQueue Admin"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--admin"
Name: "{group}\ServeQueue Terminal"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--terminal"
Name: "{commondesktop}\ServeQueue Admin"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--admin"; Tasks: desktopicon
Name: "{commondesktop}\ServeQueue Terminal"; Filename: "{app}\Frontend\ServeQueue.exe"; Parameters: "--terminal"; Tasks: desktopicon
Name: "{commonstartup}\ServeQueue Biometric Bridge"; Filename: "{app}\Bridge\BiometricBridge.exe"; WorkingDir: "{app}\Bridge"

[Run]
; 1. Update Database
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\Backend\scripts\setup-db.ps1"" -SqlFile ""{app}\Backend\init_db.sql"""; Flags: waituntilterminated; StatusMsg: "Updating PostgreSQL Database Schema..."

; 2. Register background services
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\install_services.ps1"""; Flags: waituntilterminated; StatusMsg: "Registering background services..."
; Launch the app after install
Filename: "{app}\Frontend\ServeQueue.exe"; Description: "Launch ServeQueue Admin Panel"; Flags: postinstall nowait skipifsilent unchecked; Parameters: "--admin"
Filename: "{app}\Frontend\ServeQueue.exe"; Description: "Launch ServeQueue Terminal"; Flags: postinstall nowait skipifsilent; Parameters: "--terminal"
Filename: "{app}\Bridge\BiometricBridge.exe"; Description: "Start Biometric Hardware Bridge"; Flags: postinstall nowait skipifsilent; WorkingDir: "{app}\Bridge"

[UninstallRun]
; Stop and remove background services
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\Backend\scripts\uninstall-service.ps1"""; Flags: runhidden waituntilterminated
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\Bridge\scripts\uninstall-service.ps1"""; Flags: runhidden waituntilterminated
