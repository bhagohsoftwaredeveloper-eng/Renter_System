import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Badge, IconButton, Menu, Text, Divider, useTheme } from 'react-native-paper';
import { API_BASE_URL } from '../utils/api';
import { usePermissions } from '../context/PermissionContext';
import { colors } from '../theme/colors';

export const NotificationBell = () => {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userToken } = usePermissions();
  const theme = useTheme();

  const fetchExpiredTickets = async () => {
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      } else {
        // Fallback for development if token is not available
        headers['x-user-role'] = 'Administrator';
      }

      // This component uses fetch (not axios), so include the cloud API key
      // explicitly when one is configured for this terminal.
      try {
        const apiKey = typeof localStorage !== 'undefined' && localStorage.getItem('API_KEY');
        if (apiKey && apiKey.trim().length > 0) {
          headers['x-api-key'] = apiKey.trim();
        }
      } catch (e) {
        // ignore — non-web platforms have no localStorage
      }

      const response = await fetch(`${API_BASE_URL}/registrations/expired-meal-tickets`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching expired tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiredTickets();
    // Poll every 1 minute
    const interval = setInterval(fetchExpiredTickets, 60000);
    return () => clearInterval(interval);
  }, [userToken]);

  const openMenu = () => {
    fetchExpiredTickets();
    setVisible(true);
  };
  const closeMenu = () => setVisible(false);

  const badgeCount = notifications.length;

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <View>
            <IconButton
              icon="bell-outline"
              size={24}
              onPress={openMenu}
              style={styles.iconButton}
            />
            {badgeCount > 0 && (
              <Badge 
                size={18} 
                style={styles.badge}
              >
                {badgeCount}
              </Badge>
            )}
          </View>
        }
        contentStyle={styles.menuContent}
      >
        <Text variant="titleSmall" style={styles.menuTitle}>
          Expired Meal Tickets
        </Text>
        <Divider />
        <ScrollView style={styles.scrollView}>
          {notifications.length === 0 ? (
            <Menu.Item title="No new notifications" disabled />
          ) : (
            notifications.map((item) => (
              <React.Fragment key={item.id}>
                <Menu.Item
                  onPress={() => {}}
                  title={`${item.firstName} ${item.lastName}`}
                  description={`Expired: ${new Date(item.mealTicketExpirationDate).toLocaleDateString()}`}
                  leadingIcon="account-alert-outline"
                  titleStyle={styles.itemTitle}
                />
                <Divider />
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    margin: 0,
  },
  iconButton: {
    margin: 0,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF5252',
    color: 'white',
    fontWeight: 'bold',
  },
  menuContent: {
    marginTop: 40,
    width: 250,
    maxHeight: 400,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 8,
  },
  menuTitle: {
    padding: 12,
    fontWeight: 'bold',
    color: colors.slate900,
  },
  scrollView: {
    maxHeight: 300,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  }
});
