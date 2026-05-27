import './src/polyfills';
import './global.css';
import 'react-native-gesture-handler';

import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, Dimensions } from 'react-native';
import * as Font from 'expo-font';
import { PublicSans_400Regular, PublicSans_700Bold, PublicSans_900Black } from '@expo-google-fonts/public-sans';
import axios from 'axios';
import { Header } from './src/components/Header';
import { Sidebar } from './src/components/Sidebar';
import { ResponsiveLayout } from './src/components/ResponsiveLayout';
import { Dashboard } from './src/screens/Dashboard';
import { UserManagement } from './src/screens/UserManagement';
import { Login } from './src/screens/Login';
import * as Screens from './src/screens/RemainingScreens';
import { BiometricTerminal } from './src/screens/BiometricTerminal';
import { UnauthorizedView } from './src/screens/UnauthorizedView';
import { PERMISSIONS } from './src/utils/permissions';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { colors } from './src/theme/colors';
import { PermissionProvider, usePermissions } from './src/context/PermissionContext';
import { SnackbarProvider } from './src/context/SnackbarContext';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.slate600,
    tertiary: colors.emerald600,
    error: colors.amber600,
  },
};

const SCREEN_CONFIG = {
  'Dashboard': { component: Dashboard, permission: PERMISSIONS.VIEW_ANALYTICS },
  'Overview': { component: Dashboard, permission: PERMISSIONS.VIEW_ANALYTICS },
  'Users': { component: UserManagement, permission: PERMISSIONS.MANAGE_USERS },
  'UserManagement': { component: UserManagement, permission: PERMISSIONS.MANAGE_USERS },
  'Registrations': { component: Screens.Registrations, permission: PERMISSIONS.MANAGE_REGISTRATIONS },
  'ActiveRenters': { component: Screens.ActiveRenters, permission: PERMISSIONS.MANAGE_REGISTRATIONS },
  'AccessLogs': { component: Screens.AccessLogs, permission: PERMISSIONS.VIEW_LOGS },
  'AuditLogs': { component: Screens.AuditLogs, permission: PERMISSIONS.VIEW_LOGS },
  'Permissions': { component: Screens.Permissions, permission: PERMISSIONS.SYSTEM_CONFIG },
  'Reports': { component: Screens.Reports, permission: PERMISSIONS.VIEW_REPORTS },

  'Configuration': { component: Screens.Configuration, permission: PERMISSIONS.SYSTEM_CONFIG },

  'FingerprintUI': { component: Screens.FingerprintUI, permission: PERMISSIONS.MANAGE_REGISTRATIONS },
  'AdminInteractive': { component: Screens.AdminInteractive, permission: PERMISSIONS.MANAGE_REGISTRATIONS },
  'BiometricTerminal': { component: BiometricTerminal, permission: PERMISSIONS.MANAGE_REGISTRATIONS },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <SnackbarProvider>
          <PermissionProvider>
            <MainApp />
          </PermissionProvider>
        </SnackbarProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function MainApp() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { isAuthenticated, hasPermission } = usePermissions();

  // Mode detection for Desktop/Web
  const [appMode, setAppMode] = useState('admin'); // 'admin' or 'terminal'
  const [currentScreen, setCurrentScreen] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    Platform.OS === 'web' && Dimensions.get('window').width >= 1024
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      // 1. Try URL parameters (for dev mode or deep links)
      const params = new URLSearchParams(window.location.search);
      let mode = params.get('mode');

      // 2. Try Electron-passed arguments (for robust production mode detection)
      // window.electron is exposed via preload.js
      if (!mode && window.electron && window.electron.args) {
        const modeArg = window.electron.args.find(arg => arg.startsWith('--mode='));
        if (modeArg) {
          mode = modeArg.split('=')[1];
        }
      }

      console.log('Detected Mode:', mode);
      if (mode === 'terminal') {
        setAppMode('terminal');
        setCurrentScreen('BiometricTerminal');
      }
    }
  }, []);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'PublicSans-Regular': PublicSans_400Regular,
          'PublicSans-Bold': PublicSans_700Bold,
          'PublicSans-Black': PublicSans_900Black,
        });
      } catch (e) {
        console.warn('Fonts failed to load', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated && appMode !== 'terminal') {
    return <Login />;
  }

  const renderScreen = () => {
    const config = SCREEN_CONFIG[currentScreen];

    if (appMode !== 'terminal' && config && config.permission && !hasPermission(config.permission)) {
      return (
        <UnauthorizedView onBackToDashboard={() => setCurrentScreen('Dashboard')} />
      );
    }

    let Content;
    switch (currentScreen) {
      case 'Dashboard':
      case 'Overview': Content = <Dashboard />; break;
      case 'Users':
      case 'UserManagement': Content = <UserManagement />; break;
      case 'Registrations': Content = <Screens.Registrations />; break;
      case 'ActiveRenters': Content = <Screens.ActiveRenters />; break;
      case 'AccessLogs': Content = <Screens.AccessLogs />; break;
      case 'AuditLogs': Content = <Screens.AuditLogs />; break;
      case 'Permissions': Content = <Screens.Permissions />; break;
      case 'Reports': Content = <Screens.Reports />; break;

      case 'Configuration': Content = <Screens.Configuration />; break;

      case 'FingerprintUI': Content = <Screens.FingerprintUI />; break;
      case 'BiometricTerminal': 
        Content = (
          <BiometricTerminal 
            onExit={appMode !== 'terminal' ? (() => setCurrentScreen('Dashboard')) : undefined} 
          />
        ); 
        break;
      case 'AdminInteractive': Content = <Screens.AdminInteractive />; break;
      default: Content = <Dashboard />; break;
    }

    return (
      <View
        key={currentScreen}
        style={{ flex: 1, width: '100%' }}
      >
        {Content}
      </View>
    );
  };

  if (appMode === 'terminal' || currentScreen === 'BiometricTerminal') {
    return renderScreen();
  }

  return (
    <ResponsiveLayout
      header={<Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />}
      sidebar={<Sidebar 
        currentScreen={currentScreen} 
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          // Only auto-close sidebar on navigate if on mobile
          if (Dimensions.get('window').width < 1024) {
            setIsSidebarOpen(false);
          }
        }} 
        isCollapsed={Dimensions.get('window').width >= 1024 ? !isSidebarOpen : false}
      />}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      {renderScreen()}
    </ResponsiveLayout>
  );
}
