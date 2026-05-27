import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Drawer, Badge, useTheme } from 'react-native-paper';
import { colors } from '../theme/colors';
import { PERMISSIONS } from '../utils/permissions';
import { usePermissions } from '../context/PermissionContext';
import axios from 'axios';

const MENU_ITEMS = [
  { label: 'Overview', icon: 'view-dashboard', screen: 'Dashboard', requiredPermission: PERMISSIONS.VIEW_ANALYTICS },
  { label: 'Interactive', icon: 'pulse', screen: 'AdminInteractive', requiredPermission: PERMISSIONS.MANAGE_REGISTRATIONS },
  { label: 'Users', icon: 'account-group', screen: 'UserManagement', requiredPermission: PERMISSIONS.MANAGE_USERS },
  { label: 'Registrations', icon: 'account-plus', screen: 'Registrations', badge: '12', requiredPermission: PERMISSIONS.MANAGE_REGISTRATIONS },
  { label: 'Active Renters', icon: 'account-multiple', screen: 'ActiveRenters', requiredPermission: PERMISSIONS.MANAGE_REGISTRATIONS },
  { label: 'Reports', icon: 'chart-box-outline', screen: 'Reports', requiredPermission: PERMISSIONS.VIEW_REPORTS },
  { label: 'Access Logs', icon: 'history', screen: 'AccessLogs', requiredPermission: PERMISSIONS.VIEW_LOGS },
  { label: 'Audit Logs', icon: 'text-box-search-outline', screen: 'AuditLogs', requiredPermission: PERMISSIONS.VIEW_LOGS },
  { section: 'System' },
  { label: 'Security', icon: 'shield-check', screen: 'Permissions', requiredPermission: PERMISSIONS.SYSTEM_CONFIG },
  { label: 'Configuration', icon: 'cog', screen: 'Configuration', requiredPermission: PERMISSIONS.SYSTEM_CONFIG },
];

import { API_BASE_URL } from '../utils/api';

export const Sidebar = ({ currentScreen, onNavigate, isCollapsed }) => {
  const theme = useTheme();
  const { hasPermission, userRole, isAuthenticated } = usePermissions();
  const [registrationCount, setRegistrationCount] = useState(null);

  useEffect(() => {
    const fetchCount = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/registrations`, {
          headers: { 'X-User-Role': userRole }
        });
        if (res.data) {
          setRegistrationCount(res.data.length.toString());
        }
      } catch (error) {
        console.error('Error fetching registration count for sidebar:', error);
      }
    };
    fetchCount();
  }, [isAuthenticated, userRole]);

  const dynamicMenuItems = MENU_ITEMS.map(item => {
    if (item.screen === 'Registrations' && registrationCount !== null) {
      return { ...item, badge: registrationCount };
    }
    // Only return item if we don't need to override badge. 
    // Leave mock badge if fetch fails, or we can choose to remove it.
    // Let's remove the mock badge if we haven't fetched it yet:
    if (item.screen === 'Registrations' && registrationCount === null) {
       const { badge, ...rest } = item;
       return rest;
    }
    return item;
  });

  const filteredMenuItems = dynamicMenuItems.filter(item => 
    !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  return (
    <ScrollView style={styles.container}>
      <Drawer.Section title={isCollapsed ? undefined : "Main Menu"}>
        {filteredMenuItems.map((item, index) => {
          if (item.section) {
            // Only show section header if there are following items in that section
            const nextItemsInSection = filteredMenuItems.slice(index + 1);
            if (nextItemsInSection.length === 0 || nextItemsInSection[0].section || isCollapsed) return null;
            return (
              <Drawer.Section key={index} title={item.section} showDivider={false} />
            );
          }
          
          const isActive = currentScreen === item.screen || (currentScreen === 'Overview' && item.screen === 'Dashboard');

          return (
            <Drawer.Item
              key={index}
              label={isCollapsed ? "" : item.label}
              icon={item.icon}
              active={isActive}
              onPress={() => onNavigate(item.screen)}
              right={() => (item.badge && !isCollapsed) ? (
                <Badge size={20} style={styles.badge}>{item.badge}</Badge>
              ) : null}
              style={[styles.drawerItem, isCollapsed && { paddingHorizontal: 0 }]}
            />
          );
        })}
      </Drawer.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    flex: 1,
    backgroundColor: 'white',
  },
  drawerItem: {
    borderRadius: 8,
    marginVertical: 2,
  },
  badge: {
    backgroundColor: colors.indigo100,
    color: colors.primary,
    fontWeight: 'bold',
  }
});
