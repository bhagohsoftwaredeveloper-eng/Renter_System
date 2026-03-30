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
  Menu
} from 'react-native-paper';
import axios from 'axios';
import { colors } from '../theme/colors';
import { BiometricService } from '../utils/biometric';
import { API_BASE_URL } from '../utils/api';

const { width, height } = Dimensions.get('window');

export const BiometricTerminal = ({ onExit, registrationId = null }) => {
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, SUCCESS, ERROR
  const [progress, setProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const [mealTicket, setMealTicket] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [terminalError, setTerminalError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();
  
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  
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

  const startScan = async () => {
    setStatus('SCANNING');
    setProgress(0);
    setScanStep(1);
    
    try {
      // 1. Check if the Biometric Service is running
      const isRunning = await BiometricService.isServiceRunning();
      if (!isRunning) {
        throw new Error('SYSTEM ERROR: BIOMETRIC SERVICE NOT DETECTED. PLEASE ENSURE DIGITAL PERSONA WEB COMPONENTS ARE INSTALLED AND RUNNING.');
      }

      // 2. Start visual feedback
      runScanCycle(1);

      // 3. Trigger real hardware capture via SDK
      console.log('Initiating SDK capture...');
      const captureResult = await BiometricService.capture();
      
      if (captureResult.status === 'SUCCESS') {
        console.log('SDK Capture Success');
        setProgress(1);
        setStatus('SUCCESS');
        
        // 4. Send the template to backend
        const ticketData = await handleGenerateMealTicket(captureResult.template);
        
        // Log access attempt using identified details
        try {
          await axios.post(`${API_BASE_URL}/access-logs`, {
            name: ticketData?.renterName || `Renter ID: ${registrationId || 'Unknown'}`,
            dept: 'Resident',
            point: 'Biometric Terminal X1',
            location: 'Main Lobby',
            type: 'Biometric Scan',
            status: 'Granted',
            avatar: null
          });
        } catch (err) {
          console.error('Failed to log biometric access', err);
        }
      }
    } catch (err) {
      console.error('Biometric Scan Failed:', err);
      let errorMsg = err.message || 'HARDWARE ERROR: CAPTURE FAILED';
      
      // Add specific hints for common connection issues
      if (errorMsg.includes('DETECTED') || errorMsg.includes('unreachable') || errorMsg.includes('refused')) {
        errorMsg = 'SYSTEM READY TO SCAN, BUT THE BIOMETRIC BRIDGE IS UNREACHABLE. PLEASE ENSURE THE DIGITAL PERSONA SERVICE IS RUNNING AND SSL IS ACCEPTED.';
      } else if (errorMsg.includes('0x8000ffff')) {
        errorMsg = 'HARDWARE INITIALIZATION ERROR (0x8000ffff). PLEASE RE-PLUG THE READER AND RESTART THE SERVICE.';
      }
      
      setTerminalError(errorMsg);
      setStatus('ERROR');
    }
  };

  const runScanCycle = (step) => {
    setScanStep(step);
    
    // Start scanline animation
    scanAnim.setValue(0);
    Animated.timing(scanAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Progress bar visual only (real capture is handled by BiometricService)
    if (status === 'SCANNING' && step < 3) {
      setTimeout(() => runScanCycle(step + 1), 1000);
    }
  };

  const handlePrintTicket = async (ticket) => {
    try {
      console.log('Sending print request to Biometric Bridge...');
      // Use 127.0.0.1 instead of localhost for better compatibility
      await axios.post('http://127.0.0.1:5001/print', {
        renterName: ticket.renterName || 'Renter',
        mealType: ticket.mealType || 'Non-Veggie',
        date: new Date(ticket.createdAt || Date.now()).toLocaleString()
      });
      console.log('Print request sent successfully');
    } catch (error) {
      console.warn('Printing failed:', error.message);
      // Show error alert for debugging
      Alert.alert("PRINT ERROR", `Failed to send to printer: ${error.message}`);
    }
  };

  const handleGenerateMealTicket = async (fmdTemplate) => {
    try {
      setIsGenerating(true);
      setTerminalError(null);
      const response = await axios.post(`${API_BASE_URL}/meal-tickets/generate`, {
        registrationId: registrationId,
        mealType: null, // Allow backend to resolve from registration
        biometricTemplate: fmdTemplate 
      });
      setMealTicket(response.data);
      
      // Trigger POS Printing via Biometric Bridge
      handlePrintTicket(response.data);

      // Add native alert for authorization confirmation
      Alert.alert(
        "MEAL TICKET AUTHORIZED",
        `Identity Verified. Meal Ticket #${response.data.ticketNumber} has been successfully generated locally for ${response.data.mealType} diet.`,
        [{ text: "OK" }]
      );
      return response.data;
    } catch (error) {
      console.error('Error generating meal ticket:', error);
      const errorMsg = error.response?.data?.error || 'SYSTEM ERROR: GENERATION FAILED';
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
          icon: 'check-circle'
        };
      case 'ERROR':
        return {
          title: 'ACCESS DENIED',
          subtitle: terminalError || 'INVALID BIOMETRIC PROFILE',
          color: colors.rose500,
          icon: 'alert-circle'
        };
      default: return {};
    }
  })();

  return (
    <View style={styles.outerContainer}>
      {/* Background Glows */}
      <View style={[styles.bgGlow, { top: -100, left: -100, backgroundColor: 'rgba(17, 50, 212, 0.08)' }]} />
      <View style={[styles.bgGlow, { bottom: -100, right: -100, backgroundColor: 'rgba(16, 185, 129, 0.05)' }]} />

      {/* Header Bar */}
      <Surface style={[styles.header, Platform.OS === 'web' && { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)' }]} elevation={Platform.OS === 'web' ? 0 : 1}>
        <View style={styles.headerLeft}>
          <Avatar.Icon 
            size={40} 
            icon="cpu-64-bit" 
            style={{ backgroundColor: colors.indigo50 }} 
            color={colors.primary} 
          />
          <View>
            <Text variant="titleMedium" style={styles.terminalTitle}>SECUREACCESS™ TERMINAL</Text>
            <Text variant="labelSmall" style={styles.terminalVersion}>V2.4.0-STABLE // ENCRYPTION ACTIVE</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton 
                icon="cog" 
                size={20} 
                onPress={openMenu} 
                style={styles.settingsButton}
                disabled={status === 'SCANNING'} 
              />
            }
          >
            <Menu.Item 
              leadingIcon="printer" 
              onPress={() => {
                closeMenu();
                handlePrintTicket({ renterName: 'TEST USER', mealType: 'Non-Veggie', createdAt: new Date() });
              }} 
              title="Test Printer" 
            />
            <Menu.Item 
              leadingIcon="format-line-spacing" 
              onPress={() => {
                closeMenu();
                handlePrintTicket({ renterName: 'FEED', mealType: 'NONE', createdAt: new Date() });
              }} 
              title="Feed Paper" 
            />
          </Menu>
          <Surface style={styles.statusLabel} elevation={0}>
            <View style={[styles.statusDot, { backgroundColor: status === 'SUCCESS' ? colors.emerald500 : colors.primary }]} />
            <Text variant="labelSmall" style={styles.statusLabelText}>
              {status === 'SCANNING' ? 'SYSTEM ACTIVE' : 'TERMINAL READY'}
            </Text>
          </Surface>
          {onExit && (
            <IconButton icon="close" size={20} onPress={onExit} style={styles.exitButton} />
          )}
        </View>
      </Surface>

      <View style={styles.mainContent}>
        {/* Main Terminal Frame */}
        <Surface style={[styles.terminalFrame, Platform.OS === 'web' && { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }]} elevation={Platform.OS === 'web' ? 0 : 4}>
          <View style={styles.contentInner}>
            {/* Scanner Area */}
            <View style={styles.scannerWrapper}>
              <Animated.View style={[
                styles.scannerCircle,
                {
                  borderColor: currentInfo.color,
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1]
                  }),
                  transform: [{
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05]
                    })
                  }]
                }
              ]}>
                <Avatar.Icon 
                  size={120} 
                  icon={currentInfo.icon} 
                  style={{ backgroundColor: 'transparent' }} 
                  color={currentInfo.color} 
                />

                {status === 'SCANNING' && (
                  <Animated.View style={[
                    styles.scanline,
                    {
                      backgroundColor: currentInfo.color,
                      transform: [{
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-110, 110]
                        })
                      }]
                    }
                  ]} />
                )}
              </Animated.View>

              <View style={styles.textContainer}>
                <Text variant="headlineSmall" style={[styles.statusTitle, { color: currentInfo.color }]}>
                  {currentInfo.title}
                </Text>
                <Text variant="bodyMedium" style={styles.statusSubtitle}>
                  {currentInfo.subtitle}
                </Text>

                {status === 'SUCCESS' && mealTicket && (
                  <Surface style={styles.ticketResult} elevation={1}>
                    <View style={styles.ticketHeader}>
                      <Avatar.Icon size={24} icon="food" style={{ backgroundColor: colors.emerald100 }} color={colors.emerald600} />
                      <Text variant="labelLarge" style={styles.ticketHeaderText}>MEAL TICKET VALID</Text>
                    </View>
                    {mealTicket.renterName && (
                      <Text variant="titleMedium" style={{ textAlign: 'center', fontWeight: '900', color: colors.slate800, marginVertical: 4, letterSpacing: 0.5 }}>
                        {mealTicket.renterName.toUpperCase()}
                      </Text>
                    )}
                    <Text variant="headlineSmall" style={styles.ticketNumber}>{mealTicket.ticketNumber}</Text>
                    <View style={styles.mealTypeBadge}>
                      <Text variant="labelSmall" style={styles.mealTypeText}>REMARK: {mealTicket.mealType}</Text>
                    </View>
                    <View style={styles.ticketFooter}>
                      <Text variant="labelSmall" style={styles.ticketValidity}>EXPIRES: {new Date(mealTicket.expiresAt).toLocaleTimeString()}</Text>
                    </View>
                  </Surface>
                )}

                {status === 'SUCCESS' && isGenerating && (
                  <ActivityIndicator style={{ marginTop: 12 }} color={colors.emerald500} />
                )}
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <ProgressBar 
                progress={progress} 
                color={currentInfo.color} 
                style={styles.progressBar} 
              />
              <View style={styles.progressMeta}>
                <Text variant="labelSmall" style={styles.progressPercent}>
                  {Math.round(progress * 100)}% SECURED
                </Text>
                <Text variant="labelSmall" style={styles.progressHash}>
                  NODE_0XF4A2...{status === 'IDLE' ? 'READY' : 'BUSY'}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {status === 'IDLE' ? (
                <View style={{ gap: 16 }}>
                  <Button 
                    mode="contained" 
                    onPress={startScan} 
                    style={styles.primaryActionButton}
                    contentStyle={styles.actionButtonContent}
                  >
                    INITIATE BIOMETRIC SCAN
                  </Button>
                </View>
              ) : status === 'SCANNING' ? (
                <Button 
                  mode="contained" 
                  loading 
                  disabled 
                  style={styles.primaryActionButton}
                  contentStyle={styles.actionButtonContent}
                >
                  SCANNING...
                </Button>
              ) : (
                <View style={{ gap: 12 }}>
                  {status === 'ERROR' && (
                    <Surface style={styles.helpBox} elevation={0}>
                      <Text variant="labelMedium" style={styles.helpTitle}>TROUBLESHOOTING GUIDE:</Text>
                      <Text variant="labelSmall" style={styles.helpText}>1. ENSURE THE ".NET BIOMETRIC BRIDGE" IS RUNNING (PORT 5001)</Text>
                      <Text variant="labelSmall" style={styles.helpText}>   👉 RUN: dotnet run --project BiometricBridge</Text>
                      <Divider style={{ marginVertical: 8 }} />
                      <Text variant="labelSmall" style={styles.helpText}>2. ALTERNATIVE: ENSURE "DIGITALPERSONA LITE SERVICE" IS RUNNING</Text>
                      <Text variant="labelSmall" style={[styles.helpText, { color: colors.rose600, fontWeight: '900' }]}>   👉 THEN VISIT THIS LINK TO ACCEPT SSL:</Text>
                      <Text variant="labelSmall" style={[styles.helpText, { textDecorationLine: 'underline' }]}>   https://127.0.0.1:52181/get_connection</Text>
                    </Surface>
                  )}
                  <View style={styles.successActions}>
                    <Button 
                      mode="outlined" 
                      icon="refresh" 
                      onPress={reset} 
                      style={styles.secondaryActionButton}
                    >
                      RETRY
                    </Button>
                    <Button 
                      mode="contained" 
                      onPress={reset} 
                      style={[styles.primaryActionButton, { flex: 1, backgroundColor: status === 'ERROR' ? colors.slate700 : colors.emerald500 }]}
                    >
                      {status === 'ERROR' ? 'BACK TO HOME' : 'PROCEED'}
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Surface>

        {/* Footer Stats */}
        <View style={styles.footerStats}>
          <View style={styles.statItem}>
            <IconButton icon="shield-check" size={16} iconColor={colors.primary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={styles.statText}>RSA-4096 VALID</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <IconButton icon="wifi" size={16} iconColor={colors.primary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={styles.statText}>LOCAL GATEWAY</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <IconButton icon="database" size={16} iconColor={colors.primary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={styles.statText}>SYNCED</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    width: '100%',
    height: '100%',
  },
  bgGlow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  terminalTitle: {
    letterSpacing: 1.5,
    fontWeight: '900',
  },
  terminalVersion: {
    color: colors.slate500,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.indigo50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.indigo100,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabelText: {
    color: colors.primary,
    letterSpacing: 1,
    fontWeight: '800',
  },
  exitButton: {
    backgroundColor: colors.slate100,
  },
  settingsButton: {
    backgroundColor: colors.slate100,
    marginRight: 4,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  terminalFrame: {
    width: '100%',
    maxWidth: 550,
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 40,
  },
  contentInner: {
    alignItems: 'center',
    gap: 32,
  },
  scannerWrapper: {
    alignItems: 'center',
    gap: 20,
  },
  scannerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    width: '100%',
    height: 4,
    zIndex: 3,
  },
  textContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusTitle: {
    letterSpacing: 4,
    fontWeight: '900',
    textAlign: 'center',
  },
  statusSubtitle: {
    color: colors.slate500,
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    gap: 8,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    color: colors.slate500,
    fontWeight: '800',
  },
  progressHash: {
    color: colors.slate400,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  actionsContainer: {
    width: '100%',
  },
  primaryActionButton: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  actionButtonContent: {
    height: 56,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 0.5,
    borderRadius: 16,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: colors.slate500,
    letterSpacing: 1,
    fontWeight: '700',
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate200,
  },
  ticketResult: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald100,
    width: '100%',
    alignItems: 'center',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ticketHeaderText: {
    color: colors.emerald600,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  ticketNumber: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: colors.emerald600,
    fontWeight: '900',
    letterSpacing: 2,
  },
  ticketFooter: {
    marginTop: 8,
  },
  ticketValidity: {
    color: colors.emerald600,
    fontWeight: '600',
  },
  mealTypeSelector: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
  },
  mealTypeBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mealTypeText: {
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.slate700,
  },
  helpBox: {
    backgroundColor: colors.slate50,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginBottom: 8,
  },
  helpTitle: {
    color: colors.slate800,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  helpText: {
    color: colors.slate600,
    fontWeight: '600',
    marginBottom: 4,
  },
});
