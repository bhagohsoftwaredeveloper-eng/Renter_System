import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Snackbar, Portal, Text } from 'react-native-paper';
import { colors } from '../theme/colors';

/**
 * Global snackbar used to confirm actions (saves, creates, deletes, etc.).
 * Usage:
 *   const { showSnackbar } = useSnackbar();
 *   showSnackbar('Settings saved');                 // success (default)
 *   showSnackbar('Could not save', 'error');        // error
 *   showSnackbar('Heads up', 'info');               // neutral
 */
const SnackbarContext = createContext({ showSnackbar: () => {} });

export const useSnackbar = () => useContext(SnackbarContext);

const VARIANT_COLORS = {
  success: colors.emerald600,
  error: colors.rose600,
  info: colors.slate800,
};

const VARIANT_ICONS = {
  success: '✓  ',
  error: '✕  ',
  info: 'ℹ  ',
};

export const SnackbarProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('success');
  // Bump a key so a new call re-triggers the animation even if one is showing.
  const keyRef = useRef(0);
  const [snackKey, setSnackKey] = useState(0);

  const showSnackbar = useCallback((msg, type = 'success') => {
    setMessage(String(msg ?? ''));
    setVariant(VARIANT_COLORS[type] ? type : 'info');
    keyRef.current += 1;
    setSnackKey(keyRef.current);
    setVisible(true);
  }, []);

  const onDismiss = useCallback(() => setVisible(false), []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Portal>
        <Snackbar
          key={snackKey}
          visible={visible}
          onDismiss={onDismiss}
          duration={3000}
          style={{ backgroundColor: VARIANT_COLORS[variant] || VARIANT_COLORS.info }}
          action={{ label: 'Dismiss', textColor: colors.white, onPress: onDismiss }}
        >
          <Text style={{ color: colors.white, fontWeight: '700' }}>
            {VARIANT_ICONS[variant] || ''}{message}
          </Text>
        </Snackbar>
      </Portal>
    </SnackbarContext.Provider>
  );
};
