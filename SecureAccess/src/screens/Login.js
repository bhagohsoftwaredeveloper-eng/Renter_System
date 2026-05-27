import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Card, HelperText, useTheme, IconButton } from 'react-native-paper';
import { colors } from '../theme/colors';
import { usePermissions } from '../context/PermissionContext';
import axios from 'axios';
import { LogIn, Lock, User, Eye, EyeOff } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isLargeScreen = width > 768;

import { API_BASE_URL } from '../utils/api';
import { createAuditLog } from '../utils/audit';

export function Login() {
  const theme = useTheme();
  const { setAuthState } = usePermissions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Using centralized API URL
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        username,
        password,
      });

      const { user, token } = response.data;
      setAuthState({ user, token, role: user.role });
      
      await createAuditLog({
        admin: user.name,
        adminId: user.username,
        type: 'Login',
        details: 'User logged into the system',
        subDetails: `Role: ${user.role}`,
        status: 'Success'
      });
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isElectron = Platform.OS === 'web' && (window.electron || (typeof process !== 'undefined' && process.versions && process.versions.electron));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={{ height: 48 }} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.loginCardContainer, isLargeScreen && styles.largeScreenContainer]}>
          <Card style={styles.card} elevation={4}>
            <View style={styles.cardHeader}>
              <View style={styles.logoCircle}>
                <LogIn color={colors.white} size={32} />
              </View>
              <Text style={styles.title}>ServeQueue</Text>
              <Text style={styles.subtitle}>Enter your credentials to access the dashboard</Text>
            </View>

            <Card.Content style={styles.cardContent}>
              <View style={styles.inputGroup}>
                <TextInput
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  mode="outlined"
                  outlineColor={colors.slate300}
                  activeOutlineColor={colors.primary}
                  placeholder="admin"
                  left={<TextInput.Icon icon={() => <User size={20} color={colors.slate500} />} />}
                  autoCapitalize="none"
                  style={styles.input}
                  onSubmitEditing={handleLogin}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  outlineColor={colors.slate300}
                  activeOutlineColor={colors.primary}
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon={() => <Lock size={20} color={colors.slate500} />} />}
                  right={
                    <TextInput.Icon 
                      icon={() => showPassword ? <EyeOff size={20} color={colors.slate500} /> : <Eye size={20} color={colors.slate500} />} 
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
              </View>

              {error ? (
                <HelperText type="error" visible={true} style={styles.errorText}>
                  {error}
                </HelperText>
              ) : null}

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
                labelStyle={styles.loginButtonLabel}
                buttonColor={colors.primary}
              >
                Sign In
              </Button>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New here? Contact your administrator for access.</Text>
              </View>
            </Card.Content>
          </Card>
          
          <View style={styles.bottomBranding}>
            <Text style={styles.brandingText}>© 2024 ServeQueue Systems. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  dragRegion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  windowControls: {
    flexDirection: 'row',
  },
  windowButton: {
    margin: 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCardContainer: {
    width: '100%',
    maxWidth: 450,
  },
  largeScreenContainer: {
    paddingVertical: 40,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PublicSans-Bold',
    color: colors.slate900,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.slate500,
    textAlign: 'center',
    fontFamily: 'PublicSans-Regular',
  },
  cardContent: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.white,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontFamily: 'PublicSans-Bold',
    textTransform: 'none',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
  },
  bottomBranding: {
    marginTop: 20,
    alignItems: 'center',
  },
  brandingText: {
    fontSize: 12,
    color: colors.slate400,
  },
});
