import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Easing, 
  Dimensions, 
  Platform,
  Alert
} from 'react-native';
import { 
  Text, 
  Button, 
  ProgressBar, 
  IconButton, 
  Surface, 
  Avatar, 
  useTheme,
  ActivityIndicator,
  Divider,
  Menu,
  Portal,
  Dialog
} from 'react-native-paper';
import axios from 'axios';
import { colors } from '../theme/colors';
import { BiometricService } from '../utils/biometric';
import { API_BASE_URL, BRIDGE_BASE_URL } from '../utils/api';

const { width, height } = Dimensions.get('window');

export const BiometricTerminal = ({ onExit, registrationId = null }) => {
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, SUCCESS, ERROR
  const [progress, setProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const [mealTicket, setMealTicket] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalError, setTerminalError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null); // null, 'Sent', 'Failed', 'Error'
  const theme = useTheme();
  
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const runDiagnostic = async () => {
    setStatus('SCANNING');
    let backendStatus = 'Checking...';
    let bridgeStatus = 'Checking...';
    
    try {
      const bRes = await axios.get(`${API_BASE_URL}/meal-tickets/status`, { timeout: 3000 });
      backendStatus = `ONLINE (${bRes.status})`;
    } catch (e) {
      backendStatus = `OFFLINE: ${e.message}`;
    }

    try {
      const brRes = await fetch(`${BRIDGE_BASE_URL}/health`, { method: 'GET' });
      if (brRes.ok) {
        const data = await brRes.json();
        bridgeStatus = `ONLINE (${data.Status})`;
      } else {
        bridgeStatus = `ERROR (${brRes.status})`;
      }
    } catch (e) {
      bridgeStatus = `UNREACHABLE: ${e.message}`;
    }

    setStatus('IDLE');
    Alert.alert(
      "SYSTEM DIAGNOSTIC",
      `Version: V2.4.5-STABLE\n\n` +
      `Backend API: ${backendStatus}\n` +
      `Biometric Bridge: ${bridgeStatus}\n\n` +
      `Configured Backend: ${API_BASE_URL}\n` +
      `Configured Bridge: ${BRIDGE_BASE_URL}`,
      [{ text: "OK" }]
    );
  };

  const scanAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the scanner
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  // Auto-reset when success or error screen is shown (V2.4.6)
  useEffect(() => {
    let timer;
    if (status === 'SUCCESS' && mealTicket) {
      console.log('Success state detected, starting auto-reset timer (5s)...');
      timer = setTimeout(() => {
        reset();
      }, 5000);
    } else if (status === 'ERROR') {
      console.log('Error state detected, starting auto-reset timer (10s)...');
      timer = setTimeout(() => {
        reset();
      }, 10000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, mealTicket]);

  const startScan = async (isSilent = false) => {
    if (!isSilent) {
      setStatus('SCANNING');
      setProgress(0);
      setScanStep(1);
    }
    
    try {
      const isRunning = await BiometricService.isServiceRunning();
      if (!isRunning) {
        if (isSilent) return;
        throw new Error('SYSTEM ERROR: BIOMETRIC SERVICE NOT DETECTED. PLEASE ENSURE THE BRIDGE ON PORT 5003 IS RUNNING.');
      }

      console.log(`Initiating SDK capture (${isSilent ? 'Silent' : 'Active'})...`);
      const captureResult = await BiometricService.capture();
      
      if (captureResult.status === 'SUCCESS') {
        setStatus('SCANNING'); 
        setProgress(0.5);
        setScanStep(3);
        
        const ticketData = await handleGenerateMealTicket(captureResult.template);
        
        if (ticketData) {
          try {
            const logResponse = await axios.post(`${API_BASE_URL}/access-logs`, {
              name: ticketData?.renterName || `Renter ID: ${registrationId || 'Unknown'}`,
              dept: 'Resident',
              point: 'Biometric Terminal X1',
              location: 'Main Lobby',
              type: 'Biometric Scan',
              status: 'Granted',
              avatar: null
            });
            
            if (logResponse.data && logResponse.data.whatsapp_status) {
              setWhatsappStatus(logResponse.data.whatsapp_status);
            }
          } catch (err) {
            console.error('Failed to log biometric access', err);
          }
        }
      }
    } catch (err) {
      console.error('Biometric Scan Failed:', err);
      let errorMsg = err.message || 'HARDWARE ERROR: CAPTURE FAILED';
      
      if (errorMsg.includes('timed out') || errorMsg.includes('no data received') || errorMsg.includes('Capture timed out')) {
        reset();
        return;
      }

      if (isSilent) {
        reset();
        return;
      }

      if (errorMsg.includes('DETECTED') || errorMsg.includes('unreachable') || errorMsg.includes('refused')) {
        errorMsg = 'SYSTEM READY TO SCAN, BUT THE BIOMETRIC BRIDGE IS UNREACHABLE. PLEASE ENSURE THE DIGITAL PERSONA SERVICE IS RUNNING AND SSL IS ACCEPTED.';
      } else if (errorMsg.includes('0x8000ffff')) {
        errorMsg = 'HARDWARE INITIALIZATION ERROR (0x8000ffff). PLEASE RE-PLUG THE READER AND RESTART THE SERVICE.';
      }
      
      setTerminalError(errorMsg);
      setStatus('ERROR');
    }
  };

  const handlePrintTicket = async (ticket) => {
    try {
      let printerName = null;
      if (Platform.OS === 'web') {
        printerName = localStorage.getItem('SELECTED_PRINTER') || null;
      }
      // Format the renter's plan expiration (set per-renter); blank if none
      let expiration = '';
      if (ticket.mealTicketExpirationDate) {
        const exp = new Date(ticket.mealTicketExpirationDate);
        if (!isNaN(exp.getTime())) expiration = exp.toLocaleDateString();
      }
      await axios.post(`${BRIDGE_BASE_URL}/print`, {
        renterName: ticket.renterName || 'Renter',
        mealType: ticket.mealType || 'Non-Veggie',
        date: new Date(ticket.generatedAt || ticket.createdAt || Date.now()).toLocaleString(),
        floor: ticket.floorNo ? String(ticket.floorNo) : '',
        expiration: expiration,
        printerName: printerName
      });
    } catch (error) {
      console.warn('Printing failed:', error.message);
      Alert.alert("PRINT ERROR", `Failed to send to printer: ${error.message}`);
    }
  };

  const handleGenerateMealTicket = async (fmdTemplate) => {
    try {
      setIsGenerating(true);
      setTerminalError(null);
      const response = await axios.post(`${API_BASE_URL}/meal-tickets/generate`, {
        registrationId: registrationId,
        mealType: null,
        biometricTemplate: fmdTemplate 
      });
      setMealTicket(response.data);
      setProgress(1);
      setStatus('SUCCESS');
      handlePrintTicket(response.data);

      Alert.alert(
        "MEAL TICKET AUTHORIZED",
        `Identity Verified. Meal Ticket #${response.data.ticketNumber} generated locally.`,
        [{ text: "OK" }]
      );
      return response.data;
    } catch (error) {
      console.error('Error generating meal ticket:', error);
      let errorMsg = error.response?.data?.error || error.message || 'SYSTEM ERROR: GENERATION FAILED';

      // 409 = one-meal-per-period limit reached. This is NOT an access denial:
      // the user is valid, they've simply already biometric-scanned for this
      // meal service (Breakfast/Lunch/Dinner) today. Show a distinct alert so
      // the user clearly knows they can only claim each meal once.
      if (error.response?.status === 409 || errorMsg.toLowerCase().includes('already claimed')) {
        setTerminalError(errorMsg);
        setStatus('ERROR');
        Alert.alert(
          "MEAL ALREADY CLAIMED",
          `${errorMsg}\n\nYou can only scan once per meal service. Please come back for the next meal.`,
          [{ text: "OK" }]
        );
        return;
      }

      if ((error.response?.status === 403 || errorMsg.includes('403')) && !errorMsg.toLowerCase().includes('registrar')) {
        errorMsg = 'Please Contact the Registrar Office for the Validations';
      }

      setTerminalError(errorMsg);
      setStatus('ERROR');
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setStatus('IDLE');
    setProgress(0);
    setScanStep(0);
    setMealTicket(null);
    setWhatsappStatus(null);
    setTerminalError(null);
    scanAnim.setValue(0);
  };

  const currentInfo = (() => {
    switch (status) {
      case 'IDLE':
        return {
          title: 'SYSTEM READY',
          subtitle: 'AWAITING BIOMETRIC INPUT',
          color: colors.primary,
          icon: 'fingerprint'
        };
      case 'SCANNING':
        return {
          title: 'CAPTURING',
          subtitle: `PROCESSING LAYER ${scanStep} OF 3`,
          color: colors.primary,
          icon: 'fingerprint'
        };
      case 'SUCCESS':
        return {
          title: 'ACCESS GRANTED',
          subtitle: mealTicket ? 'MEAL TICKET GENERATED' : 'IDENTITY VERIFIED & SECURED',
          color: colors.emerald500,
          statusColor: colors.emerald500,
          icon: 'check-circle'
        };
      case 'ERROR':
        // One-meal-per-period limit reached: the user is valid, they've simply
        // already claimed this meal. Show it in amber as a notice, not a red denial.
        const isClaimed = terminalError?.toLowerCase().includes('already claimed');
        if (isClaimed) {
          return {
            title: 'ALREADY CLAIMED',
            subtitle: terminalError,
            color: colors.amber600,
            statusColor: colors.amber600,
            icon: 'food-off'
          };
        }
        const isReg = terminalError?.toLowerCase().includes('registrar') || terminalError?.toLowerCase().includes('validation') || terminalError?.includes('403');
        return {
          title: 'ACCESS DENIED',
          subtitle: isReg ? "Please Contact the Registrar Office\nfor the Validations" : (terminalError || 'INVALID BIOMETRIC PROFILE'),
          color: colors.rose600,
          statusColor: colors.rose600,
          isRegistrar: isReg,
          icon: 'alert-circle'
        };
      default: return {};
    }
  })();

  const isElectron = Platform.OS === 'web' && (window.electron || (typeof process !== 'undefined' && process.versions && process.versions.electron));

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.bgGlow, { top: -100, left: -100, backgroundColor: 'rgba(17, 50, 212, 0.08)' }]} />
      <View style={[styles.bgGlow, { bottom: -100, right: -100, backgroundColor: 'rgba(16, 185, 129, 0.05)' }]} />

      <Surface style={styles.header} elevation={1} dataSet={Platform.OS === 'web' ? { class: 'electron-drag' } : {}}>
        <View style={styles.headerLeft}>
          <Avatar.Icon size={40} icon="cpu-64-bit" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
          <View>
            <Text variant="titleMedium" style={styles.terminalTitle}>SERVEQUEUE™ TERMINAL</Text>
            <Text variant="labelSmall" style={[styles.terminalVersion, { color: colors.rose600, fontWeight: '900' }]}>V2.4.2-DIAGNOSTIC-ACTIVE</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} dataSet={Platform.OS === 'web' ? { class: 'electron-no-drag' } : {}}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={<IconButton icon="cog" size={20} onPress={openMenu} style={styles.settingsButton} disabled={status === 'SCANNING'} />}
          >
            <Menu.Item leadingIcon="database-check" onPress={() => { closeMenu(); runDiagnostic(); }} title="Run Diagnostic" />
            <Menu.Item leadingIcon="printer" onPress={() => { closeMenu(); handlePrintTicket({ renterName: 'TEST USER', mealType: 'Non-Veggie', createdAt: new Date() }); }} title="Test Printer" />
            <Menu.Item leadingIcon="format-line-spacing" onPress={() => { closeMenu(); handlePrintTicket({ renterName: 'FEED', mealType: 'NONE', createdAt: new Date() }); }} title="Feed Paper" />
            {isElectron && window.electron?.openWindow && (
              <Menu.Item leadingIcon="view-dashboard" onPress={() => { closeMenu(); window.electron.openWindow('admin'); }} title="Open Admin Panel" />
            )}
          </Menu>
          <Surface style={styles.statusLabel} elevation={0}>
            <View style={[styles.statusDot, { backgroundColor: currentInfo.statusColor || colors.primary }]} />
            <Text variant="labelSmall" style={styles.statusLabelText}>{status === 'SCANNING' ? 'SYSTEM ACTIVE' : 'TERMINAL READY'}</Text>
          </Surface>
          {onExit && <IconButton icon="close" size={20} onPress={onExit} style={styles.exitButton} />}
        </View>
      </Surface>

      <View style={styles.mainContent}>
        <Surface style={styles.terminalFrame} elevation={4}>
          <View style={styles.contentInner}>
            <View style={styles.scannerWrapper}>
              <Animated.View style={[styles.scannerCircle, { borderColor: currentInfo.color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}>
                <Avatar.Icon size={120} icon={currentInfo.icon} style={{ backgroundColor: 'transparent' }} color={currentInfo.color} />
                {status === 'SCANNING' && (
                  <Animated.View style={[styles.scanline, { backgroundColor: currentInfo.color, transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-110, 110] }) }] }]} />
                )}
              </Animated.View>

              <View style={styles.textContainer}>
                <Text variant="headlineSmall" style={[styles.statusTitle, { color: currentInfo.color }]}>{currentInfo.title}</Text>
                <Text variant={status === 'ERROR' ? "titleMedium" : "bodyMedium"} style={[styles.statusSubtitle, status === 'ERROR' && { color: currentInfo.statusColor || colors.rose700, fontWeight: '800' }]} numberOfLines={3}>{currentInfo.subtitle}</Text>
                {status === 'SUCCESS' && mealTicket && (
                  <Surface style={styles.ticketResult} elevation={1}>
                    <View style={styles.ticketHeader}>
                      <Avatar.Icon size={24} icon="food" style={{ backgroundColor: colors.emerald100 }} color={colors.emerald600} />
                      <Text variant="labelLarge" style={styles.ticketHeaderText}>MEAL TICKET VALID</Text>
                    </View>
                    <Text variant="headlineSmall" style={styles.ticketNumber}>{mealTicket.ticketNumber}</Text>
                  </Surface>
                )}

                {status === 'SUCCESS' && whatsappStatus === 'Sent' && (
                  <Surface style={styles.whatsappBadge} elevation={0}>
                    <Avatar.Icon size={20} icon="whatsapp" style={{ backgroundColor: 'transparent' }} color={colors.emerald600} />
                    <Text variant="labelSmall" style={styles.whatsappBadgeText}>PARENT NOTIFIED</Text>
                  </Surface>
                )}
                {status === 'SUCCESS' && whatsappStatus === 'Failed' && (
                  <Surface style={[styles.whatsappBadge, { backgroundColor: colors.rose50 }]} elevation={0}>
                    <Avatar.Icon size={20} icon="whatsapp" style={{ backgroundColor: 'transparent' }} color={colors.rose600} />
                    <Text variant="labelSmall" style={[styles.whatsappBadgeText, { color: colors.rose600 }]}>NOTIFY FAILED</Text>
                  </Surface>
                )}
              </View>
            </View>

            <View style={styles.progressSection}>
              <ProgressBar progress={status === 'ERROR' ? 1 : progress} color={currentInfo.color} style={styles.progressBar} />
            </View>

            <View style={styles.actionsContainer}>
              {status === 'IDLE' ? (
                <Button mode="contained" onPress={() => startScan(false)} style={styles.primaryActionButton} contentStyle={styles.actionButtonContent} icon="fingerprint">
                  IDENTIFY & GENERATE TICKET
                </Button>
              ) : (
                <Button mode="contained" onPress={reset} style={[styles.primaryActionButton, { backgroundColor: currentInfo.color }]} contentStyle={styles.actionButtonContent}>
                  {status === 'SCANNING' ? 'SYSTEM SCANNING...' : 'BACK TO HOME'}
                </Button>
              )}
            </View>
          </View>
        </Surface>

        <View style={styles.footerStats}>
          <View style={styles.statItem}>
            <IconButton icon="shield-check" size={16} iconColor={colors.primary} />
            <Text variant="labelSmall" style={styles.statText}>RSA-4096 VALID</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <IconButton icon="database" size={16} iconColor={colors.primary} />
            <Text variant="labelSmall" style={styles.statText}>SYNCED</Text>
          </View>
        </View>
      </View>

      {/* ERROR MESSAGE NOW ON THE CARD ITSELF V2.4.5 */}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f8fafc' },
  bgGlow: { position: 'absolute', width: 600, height: 600, borderRadius: 300 },
  header: { paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  terminalTitle: { letterSpacing: 1.5, fontWeight: '900' },
  terminalVersion: { fontSize: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  windowControls: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.slate200, paddingLeft: 8, marginLeft: 8 },
  windowButton: { margin: 0 },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.indigo50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabelText: { color: colors.primary, fontWeight: '800' },
  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  terminalFrame: { width: '100%', maxWidth: 550, backgroundColor: 'white', borderRadius: 32, padding: 40 },
  contentInner: { alignItems: 'center', gap: 32 },
  scannerWrapper: { alignItems: 'center', gap: 20 },
  scannerCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', overflow: 'hidden' },
  scanline: { position: 'absolute', width: '100%', height: 4, zIndex: 3 },
  textContainer: { alignItems: 'center', gap: 4 },
  statusTitle: { letterSpacing: 4, fontWeight: '900', textAlign: 'center' },
  statusSubtitle: { color: colors.slate500, fontWeight: '600', textAlign: 'center' },
  progressSection: { width: '100%', gap: 8 },
  progressBar: { height: 10, borderRadius: 5 },
  actionsContainer: { width: '100%' },
  primaryActionButton: { width: '100%', borderRadius: 16, backgroundColor: colors.primary },
  actionButtonContent: { height: 56 },
  footerStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: colors.slate500, fontWeight: '700' },
  statDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.slate200 },
  ticketResult: { marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: colors.emerald50, alignItems: 'center' },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ticketHeaderText: { color: colors.emerald600, fontWeight: 'bold' },
  ticketNumber: { color: colors.emerald600, fontWeight: '900' },
  whatsappBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 16, 
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  whatsappBadgeText: { color: colors.emerald600, fontWeight: '900', fontSize: 10, letterSpacing: 0.5 }
});
