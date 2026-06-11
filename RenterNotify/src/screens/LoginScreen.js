import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getExpoPushToken } from '../notifications';
import { registerPushToken } from '../api';
import { saveSession } from '../storage';
import QrScanner from './QrScanner';

export default function LoginScreen({ onLogin }) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  // Registers this device for push using the given registration + phone. Both the
  // manual form and the QR scanner funnel through here.
  const submit = async (reg, ph) => {
    setError('');
    const regNo = String(reg || '').trim();
    const phoneNo = String(ph || '').trim();
    if (!regNo || !phoneNo) {
      setError('Enter your registration number and phone.');
      return;
    }

    setLoading(true);
    try {
      const expoToken = await getExpoPushToken();
      const result = await registerPushToken({
        registrationNumber: regNo,
        phone: phoneNo,
        expoToken,
        platform: Platform.OS,
      });

      const session = {
        registrationNumber: result.registration.registrationNumber,
        name: result.registration.name,
        recipientType: result.recipientType,
        expoToken,
      };
      await saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => submit(registrationNumber, phone);

  // Parse a scanned QR payload. Accepts JSON {registrationNumber, phone} (or short
  // {r,p}) and a "reg|phone" fallback, then auto-submits.
  const handleScanned = (raw) => {
    setScanning(false);
    let reg = '';
    let ph = '';
    try {
      const parsed = JSON.parse(raw);
      reg = String(parsed.registrationNumber ?? parsed.r ?? '');
      ph = String(parsed.phone ?? parsed.p ?? '');
    } catch {
      const parts = String(raw).split(/[|,;]/);
      if (parts.length >= 2) {
        reg = parts[0];
        ph = parts[1];
      }
    }
    if (!reg || !ph) {
      setError('That QR code is not a valid Renter Notify code. Enter your details manually.');
      return;
    }
    setRegistrationNumber(reg);
    setPhone(ph);
    submit(reg, ph);
  };

  if (scanning) {
    return <QrScanner onScan={handleScanned} onClose={() => setScanning(false)} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Renter Notify</Text>
        <Text style={styles.subtitle}>
          Sign in to get meal-ticket alerts on this phone.
        </Text>

        <TouchableOpacity
          style={[styles.scanButton, loading && styles.buttonDisabled]}
          onPress={() => setScanning(true)}
          disabled={loading}
        >
          <Text style={styles.scanButtonText}>📷  Scan QR Code</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.label}>Registration Number</Text>
        <TextInput
          style={styles.input}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
          placeholder="e.g. 100245"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 09171234567"
          keyboardType="phone-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enable Notifications</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          We match your phone to a parent or student on the registration.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0F766E' },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 6, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#0F172A',
  },
  scanButton: {
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 12, color: '#94A3B8', fontSize: 12 },
  button: {
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: 16, textAlign: 'center' },
});
