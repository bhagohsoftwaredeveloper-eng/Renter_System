import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { 
  Text, 
  Button, 
  TextInput, 
  IconButton, 
  Card, 
  Avatar, 
  DataTable, 
  Portal, 
  Modal, 
  Menu,
  SegmentedButtons,
  ActivityIndicator, 
  useTheme,
  Surface,
  Divider,
  Checkbox
} from 'react-native-paper';
import axios from 'axios';
import { colors } from '../theme/colors';
import { Table } from '../components/Table';
import { usePermissions } from '../context/PermissionContext';
import { useSnackbar } from '../context/SnackbarContext';
import { PERMISSIONS, ROLES } from '../utils/permissions';

import { API_BASE_URL } from '../utils/api';
import { createAuditLog } from '../utils/audit';

const API_URL = `${API_BASE_URL}/users`;

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    role: 'Staff',
    password: '',
    customPermissions: []
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const theme = useTheme();
  const { hasPermission, userRole, user, isAuthenticated } = usePermissions();
  const { showSnackbar } = useSnackbar();
  const canManageUsers = hasPermission(PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, userRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, {
        headers: { 
          'X-User-Role': userRole,
          // Interceptor handles Authorization header
        }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!formData.fullname || !formData.username || (!isEditing && !formData.password)) {
      showSnackbar('Please fill in all required fields.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const submissionData = {
        name: formData.fullname,
        username: formData.username,
        role: formData.role,
        password: formData.password,
        customPermissions: formData.customPermissions
      };

      if (isEditing) {
        const updateData = { ...submissionData };
        if (!updateData.password) {
          delete updateData.password;
        }
        const response = await axios.put(`${API_URL}/${editingUserId}`, updateData);
        setUsers(prev => prev.map(u => u.id === editingUserId ? response.data : u));
        showSnackbar('User updated successfully.', 'success');
        
        await createAuditLog({
          admin: user?.name || userRole,
          adminId: user?.username || userRole,
          type: 'User Update',
          details: `Updated user: ${formData.fullname}`,
          subDetails: `Role: ${formData.role}, Username: ${formData.username}`,
          status: 'Success'
        });
      } else {
        const response = await axios.post(API_URL, submissionData);
        setUsers(prev => [response.data, ...prev]);
        showSnackbar('User added successfully.', 'success');
        
        await createAuditLog({
          admin: user?.name || userRole,
          adminId: user?.username || userRole,
          type: 'User Creation',
          details: `Added new user: ${formData.fullname}`,
          subDetails: `Role: ${formData.role}, Username: ${formData.username}`,
          status: 'Success'
        });
      }
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
      showSnackbar(`Failed to ${isEditing ? 'update' : 'add'} user.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const userToDelete = users.find(u => u.id === id);
              const response = await axios.delete(`${API_URL}/${id}`);
              
              if (response.data && response.data.success === false) {
                if (response.data.code === 'HAS_TRANSACTIONS') {
                  showSnackbar('User has existing audit logs and cannot be deleted.', 'error');
                  return;
                }
                if (response.data.code === 'IS_ADMIN') {
                  showSnackbar('The primary administrator account cannot be deleted.', 'error');
                  return;
                }
                showSnackbar(response.data.error || 'Failed to delete user.', 'error');
                return;
              }

              setUsers(prev => prev.filter(u => u.id !== id));
              showSnackbar('User deleted.', 'success');

              await createAuditLog({
                admin: user?.name || userRole,
                adminId: user?.username || userRole,
                type: 'User Deletion',
                details: `Deleted user: ${userToDelete?.name || id}`,
                subDetails: `Username: ${userToDelete?.username || 'unknown'}`,
                status: 'Success'
              });
            } catch (error) {
              console.error('Error deleting user:', error);
              showSnackbar('Failed to delete user due to a communication error.', 'error');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (user) => {
    setFormData({
      fullname: user.name,
      username: user.username,
      role: user.role,
      password: '',
      customPermissions: user.customPermissions || []
    });
    setEditingUserId(user.id);
    setIsEditing(true);
    setIsModalVisible(true);
  };

  const togglePermission = (permission) => {
    setFormData(prev => {
      const current = prev.customPermissions || [];
      if (current.includes(permission)) {
        return { ...prev, customPermissions: current.filter(p => p !== permission) };
      } else {
        return { ...prev, customPermissions: [...current, permission] };
      }
    });
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({ fullname: '', username: '', role: 'Staff', password: '', customPermissions: [] });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
                         (user.username || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || user.role.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>User Management</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Manage system access, roles, and security permissions.</Text>
        </View>
        {canManageUsers && (
          <Button 
            mode="contained" 
            icon="account-plus" 
            onPress={() => setIsModalVisible(true)}
            style={styles.addButton}
            contentStyle={{ paddingHorizontal: 4 }}
          >
            Add New User
          </Button>
        )}
      </View>
      
      <View style={styles.filtersRow}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { 
              value: 'all', 
              label: `All (${users.length})`,
              labelStyle: { fontWeight: filter === 'all' ? '800' : '600', fontSize: 13 }
            },
            { 
              value: 'administrator', 
              label: 'Admins',
              labelStyle: { fontWeight: filter === 'administrator' ? '800' : '600', fontSize: 13 }
            },
            { 
              value: 'staff', 
              label: 'Staff',
              labelStyle: { fontWeight: filter === 'staff' ? '800' : '600', fontSize: 13 }
            },
          ]}
          style={styles.segmentedButtons}
          theme={{ 
            colors: { 
              secondaryContainer: colors.white, 
              onSecondaryContainer: colors.primary,
              outline: 'transparent'
            } 
          }}
          showSelectedCheck={false}
        />
        
        <TextInput
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={colors.slate400} />}
          style={styles.searchBar}
          outlineStyle={{ borderRadius: 12, borderColor: colors.slate200 }}
          contentStyle={{ fontSize: 14 }}
        />
      </View>
      
      <Card style={styles.tableCard}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 16, color: colors.slate500 }}>Loading users...</Text>
          </View>
        ) : (
          <Table 
            headers={['User Details', 'Role', 'Status', 'Last Login', 'Actions']}
            columnFlex={[2, 1.2, 1, 1, 1]}
            data={filteredUsers}
            renderRow={(item) => (
              <>
                <DataTable.Cell style={{ flex: 2 }}>
                  <View style={styles.userInfo}>
                    <Avatar.Text 
                      size={32} 
                      label={item.initials || item.name.substring(0, 2).toUpperCase()} 
                      style={styles.avatar}
                      labelStyle={styles.avatarLabel}
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>@{item.username}</Text>
                    </View>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell style={{ flex: 1.2 }}>
                  <Surface style={[styles.roleBadge, item.role === 'Administrator' && styles.adminBadge]} elevation={0}>
                    <Text variant="labelSmall" style={[styles.roleText, item.role === 'Administrator' && styles.adminText]}>
                      {item.role}
                    </Text>
                  </Surface>
                </DataTable.Cell>
                <DataTable.Cell style={{ flex: 1 }}>
                  <View style={styles.statusBox}>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'Active' ? colors.emerald500 : colors.slate400 }]} />
                    <Text variant="bodySmall" style={{ color: item.status === 'Active' ? colors.emerald600 : colors.slate500 }}>
                      {item.status}
                    </Text>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: colors.slate400 }}>{item.lastLogin || 'Never'}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>
                  <View style={styles.actionButtons}>
                    <IconButton 
                      icon="pencil-outline" 
                      size={18} 
                      onPress={() => openEditModal(item)} 
                      iconColor={colors.slate400}
                    />
                    {canManageUsers && (
                      <IconButton 
                        icon="delete-outline" 
                        size={18} 
                        onPress={() => handleDeleteUser(item.id)} 
                        iconColor={colors.rose500}
                      />
                    )}
                  </View>
                </DataTable.Cell>
              </>
            )}
          />
        )}
        {!loading && filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: colors.slate400 }}>No users found. Try adding one!</Text>
          </View>
        )}
      </Card>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title={isEditing ? 'Edit User' : 'Add New User'} 
              subtitle={isEditing ? 'Update existing user account details.' : 'Create a new system account.'}
              right={(props) => <IconButton {...props} icon="close" onPress={closeModal} />}
            />
            <ScrollView contentContainerStyle={styles.modalBody}>
              <TextInput
                label="Username *"
                value={formData.username}
                onChangeText={(val) => setFormData(prev => ({ ...prev, username: val }))}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account-circle" color={colors.slate400} />}
              />
              <TextInput
                label="Fullname"
                value={formData.fullname}
                onChangeText={(val) => setFormData(prev => ({ ...prev, fullname: val }))}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account" color={colors.slate400} />}
              />
              <TextInput
                label={isEditing ? "New System Password (optional)" : "System Password *"}
                value={formData.password}
                onChangeText={(val) => setFormData(prev => ({ ...prev, password: val }))}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="lock-outline" color={colors.slate400} />}
              />
              <Text variant="labelLarge" style={styles.inputLabel}>System Role *</Text>
              <Menu
                visible={roleMenuVisible}
                onDismiss={() => setRoleMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    onPress={() => setRoleMenuVisible(true)}
                    style={styles.roleSelector}
                    activeOpacity={0.7}
                  >
                    <Text variant="bodyLarge" style={styles.roleSelectorText}>{formData.role}</Text>
                    <IconButton icon="chevron-down" size={20} iconColor={colors.slate500} style={{ margin: 0 }} />
                  </TouchableOpacity>
                }
                contentStyle={styles.roleMenuContent}
              >
                {[ROLES.STAFF, ROLES.ADMINISTRATOR, ROLES.SUPER_ADMIN].map((role, idx) => (
                  <React.Fragment key={role}>
                    <Menu.Item
                      onPress={() => { setFormData(prev => ({ ...prev, role })); setRoleMenuVisible(false); }}
                      title={role}
                      titleStyle={[styles.roleMenuItemText, formData.role === role && { color: colors.primary, fontWeight: 'bold' }]}
                      trailingIcon={formData.role === role ? 'check' : undefined}
                    />
                    {idx < 2 && <Divider />}
                  </React.Fragment>
                ))}
              </Menu>

              <Text variant="labelLarge" style={[styles.inputLabel, { marginTop: 24, marginBottom: 8 }]}>Individual Permission Overrides</Text>
              <Text variant="bodySmall" style={{ color: colors.slate500, marginBottom: 16 }}>
                These permissions will be granted to this user in addition to their role permissions.
              </Text>
              
              <View style={styles.permissionsGrid}>
                {Object.keys(PERMISSIONS).map((key) => {
                  const perm = PERMISSIONS[key];
                  const label = perm.replace(/_/g, ' ').toUpperCase();
                  const isChecked = formData.customPermissions?.includes(perm);
                  
                  return (
                    <TouchableOpacity 
                      key={key} 
                      style={styles.permissionItem}
                      onPress={() => togglePermission(perm)}
                      activeOpacity={0.7}
                    >
                      <Checkbox.Android
                        status={isChecked ? 'checked' : 'unchecked'}
                        onPress={() => togglePermission(perm)}
                        color={colors.primary}
                      />
                      <Text variant="labelMedium" style={styles.permissionLabel}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <Card.Actions style={styles.modalActions}>
              <Button onPress={closeModal} mode="text">Cancel</Button>
              <Button 
                onPress={handleSaveUser} 
                mode="contained" 
                loading={isSubmitting}
                disabled={isSubmitting}
                style={{ borderRadius: 8, overflow: 'hidden' }}
                contentStyle={{ paddingHorizontal: 16 }}
              >
                {isEditing ? 'Save Changes' : 'Create Account'}
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '800',
    color: colors.slate900,
  },
  subtitle: {
    color: colors.slate500,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  segmentedButtons: {
    minWidth: 300,
    backgroundColor: colors.slate100,
    borderRadius: 14,
    padding: 3,
    borderWidth: 0,
    minHeight: 46,
  },
  searchBar: {
    flex: 1,
    minWidth: 300,
    height: 44,
    backgroundColor: 'white',
  },
  tableCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    elevation: 2,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 64,
    alignItems: 'center',
  },
  emptyState: {
    padding: 64,
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  avatarLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.slate50,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  adminBadge: {
    backgroundColor: colors.indigo50,
    borderColor: colors.indigo100,
  },
  roleText: {
    color: colors.slate600,
    fontWeight: 'bold',
  },
  adminText: {
    color: colors.primary,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  modalContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  modalBody: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  inputLabel: {
    marginBottom: 8,
    marginTop: 8,
  },
  modalActions: {
    padding: 16,
    gap: 8,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: colors.slate50,
    borderRadius: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  permissionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.slate700,
    flex: 1,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  roleSelectorText: {
    color: colors.slate800,
    fontWeight: '600',
    flex: 1,
  },
  roleMenuContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    minWidth: 220,
  },
  roleMenuItemText: {
    color: colors.slate700,
    fontSize: 14,
  },
});

