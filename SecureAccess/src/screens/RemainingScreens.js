import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Animated, Easing } from 'react-native';
import * as Print from 'expo-print';
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
  Divider,
  Dialog,
  SegmentedButtons, 
  ActivityIndicator, 
  useTheme,
  Surface,
  ProgressBar,
  Switch
} from 'react-native-paper';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import QRCodeLib from 'qrcode';
import { colors } from '../theme/colors';
import { Table } from '../components/Table';
import { CircleCheckbox } from '../components/CircleCheckbox';
import { BiometricTerminal } from './BiometricTerminal';
import { usePermissions } from '../context/PermissionContext';
import { useSnackbar } from '../context/SnackbarContext';
import { BiometricService } from '../utils/biometric';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '../utils/permissions';

import { API_BASE_URL, BRIDGE_BASE_URL } from '../utils/api';
import { createAuditLog } from '../utils/audit';

const API_URL = `${API_BASE_URL}/registrations`; 

const SkeletonScreen = ({ title, subtitle }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{title}</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>
      <Surface style={styles.placeholder} elevation={1}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.placeholderText}>
          Implementation of {title} in progress...
        </Text>
      </Surface>
    </View>
  );
};

const MOCK_REGISTRATIONS = [
  { id: '1', name: 'Alex Rivera', email: 'alex.r@enterprise.com', unit: 'Unit 402', level: 'VIP', time: '10:42 AM', initials: 'AR', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA69nSUmovo6-HW6dCUTtgmjT955EF1cXEPjDvODJBTmuElCi4btf4JIawfcLiO60LJwQ0QF92DgHhOxP2nDpAgo9MZTCs04vPN2vsIDMvS4Fn0hsNIm__8XsYmjDNINGmh4xR1ZL8wXw6U7cGebUbA2Q_32Sh8BRjZWbi8Jc27Nr4NIyiqwLFKbn7u0oQzdKyHQ8cZsdAgReR3h12DQzMHA-rJwfjo8HO-UukNhk3KKYSb9DfLu8HeH5wpCs8ccKRN0t_URWii8tC5', status: 'Pending', date: '2023-11-24', hasFingerprint: true },
  { id: '2', name: 'Jordan Smith', email: 'jsmith_42@gmail.com', unit: 'Suite 12', level: 'Standard', time: '09:15 AM', initials: 'JS', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhI39moDeXEs1CgHm0O-UKdU4VjiJN2PVU2osp5r9qpw9EHS_SR6I8w1XMVz7z98QEgh0QzehYabUNmafUr6XA2dGGSU5BssSRIcVXkh4lMtlbje4VArfaCHuMYHZQzs7mcnKPQNilMirZhCJOU5yb_O5Ezk8XO_TbbQVKU00C4rwZwuGYKC0qhqUy_Z2TPMChmLRWrmBj1d2EDzo30y7XYmDXSULxZZqhOwX16SZ1ZYgnxC5JJExnP8TgdOwEerFkKyjwIF6tZin2', status: 'Approved', date: '2023-11-23', hasFingerprint: false },
  { id: '3', name: 'Casey Chen', email: 'labs.maintenance@facility.io', unit: 'Main Lab', level: 'Maintenance', time: '08:30 AM', initials: 'CC', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgK36s7ERHb11ZUBUbz1_AjVAQNRiJHVEbW_d6ei0U3fLTJqHgFtLhxlzfBQrdm8ytl1b6j5gzhKJsxagktA5qeqzCfP5d2gqwt1VwiBGZY9YVdKVeJ5UPxDUYxFEkxOm17D_qQgN_TUJ8lAIhTpofRCGbKBvsGAgfQDY5HXJn3T7dXb7Pr4sB5VPimw9VdiqaOo4HLM-h1CYN98XQYoqZ_CnKp-c2vJhJMa3EStwjQSd9y8hMCvz7kgWWL3A5s2GcVQ4A1ZTZ2-t5', status: 'Pending', date: '2023-11-22', hasFingerprint: true },
  { id: '4', name: 'Morgan Taylor', email: 'm.taylor@skyline.res', unit: 'Unit 105', level: 'Standard', time: '11:15 PM', initials: 'MT', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8qQJdZdNSeDomXBHD5rwpPiw-2iAMY2cHskcop4mWcDg6eD4NzUS0mE4TpkvYFLv5musEKiouslfVrEKEDahBMzla0G4sF4SXCabRMWvqltj_I1zzyuYJdZJGTpV0Yo98iaxAJcsAh77LEIxCCu-Is6l4BI65AdomUDGe2iSgc1DUGRhhqSMBQSUfUQsRM5XKxOluH4oK0j5SI0ue6nEmF7lq2MDyh8zvKrUIFpJVbB7xbh8G5kO035gmFWLqeSNjpmMG7BaMCRRY', status: 'Approved', date: '2023-11-21', hasFingerprint: false },
  { id: '5', name: 'Riley Webb', email: 'r.webb@proton.me', unit: 'Unit 303', level: 'VIP', time: '2 days ago', initials: 'RW', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvBdtRA8ab0zLqdNfFNRUvlEmu0WzYUbrL8DqTiLXwYJMtvDrPycctiBj-rm56p_J7bagR4NF0maaZovc2yP5a92sYkpdh8fEP2TUHtkXPAlHH7Y3EZvpXdo2Sh8QEZhuOA2wGFk_qnN7COx219C227-lg2a-O5Detw7GL-Gt5ex43Twa_lGOvrPLkIiAF7ZMNQV0nAOAKG6O3wEXaXghVjIfNhGNs6ar4Dj6DKT0m_pjXkcjhZVflCEc-uZsN_wP0PKexuwzbCFPV2', status: 'Rejected', date: '2023-11-20', hasFingerprint: true },
];

const MOCK_ACTIVE_RENTERS = [
  { id: '1', name: 'Alex Rivera', email: 'alex.r@enterprise.com', unit: 'Unit 402', level: 'VIP', time: '10:42 AM', initials: 'AR', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA69nSUmovo6-HW6dCUTtgmjT955EF1cXEPjDvODJBTmuElCi4btf4JIawfcLiO60LJwQ0QF92DgHhOxP2nDpAgo9MZTCs04vPN2vsIDMvS4Fn0hsNIm__8XsYmjDNINGmh4xR1ZL8wXw6U7cGebUbA2Q_32Sh8BRjZWbi8Jc27Nr4NIyiqwLFKbn7u0oQzdKyHQ8cZsdAgReR3h12DQzMHA-rJwfjo8HO-UukNhk3KKYSb9DfLu8HeH5wpCs8ccKRN0t_URWii8tC5' },
  { id: '2', name: 'Jordan Smith', email: 'jsmith_42@gmail.com', unit: 'Suite 12', level: 'Standard', time: '09:15 AM', initials: 'JS', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhI39moDeXEs1CgHm0O-UKdU4VjiJN2PVU2osp5r9qpw9EHS_SR6I8w1XMVz7z98QEgh0QzehYabUNmafUr6XA2dGGSU5BssSRIcVXkh4lMtlbje4VArfaCHuMYHZQzs7mcnKPQNilMirZhCJOU5yb_O5Ezk8XO_TbbQVKU00C4rwZwuGYKC0qhqUy_Z2TPMChmLRWrmBj1d2EDzo30y7XYmDXSULxZZqhOwX16SZ1ZYgnxC5JJExnP8TgdOwEerFkKyjwIF6tZin2' },
  { id: '3', name: 'Casey Chen', email: 'labs.maintenance@facility.io', unit: 'Main Lab', level: 'Maintenance', time: '08:30 AM', initials: 'CC', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgK36s7ERHb11ZUBUbz1_AjVAQNRiJHVEbW_d6ei0U3fLTJqHgFtLhxlzfBQrdm8ytl1b6j5gzhKJsxagktA5qeqzCfP5d2gqwt1VwiBGZY9YVdKVeJ5UPxDUYxFEkxOm17D_qQgN_TUJ8lAIhTpofRCGbKBvsGAgfQDY5HXJn3T7dXb7Pr4sB5VPimw9VdiqaOo4HLM-h1CYN98XQYoqZ_CnKp-c2vJhJMa3EStwjQSd9y8hMCvz7kgWWL3A5s2GcVQ4A1ZTZ2-t5' },
  { id: '4', name: 'Morgan Taylor', email: 'm.taylor@skyline.res', unit: 'Unit 105', level: 'Standard', time: '11:15 PM', initials: 'MT', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8qQJdZdNSeDomXBHD5rwpPiw-2iAMY2cHskcop4mWcDg6eD4NzUS0mE4TpkvYFLv5musEKiouslfVrEKEDahBMzla0G4sF4SXCabRMWvqltj_I1zzyuYJdZJGTpV0Yo98iaxAJcsAh77LEIxCCu-Is6l4BI65AdomUDGe2iSgc1DUGRhhqSMBQSUfUQsRM5XKxOluH4oK0j5SI0ue6nEmF7lq2MDyh8zvKrUIFpJVbB7xbh8G5kO035gmFWLqeSNjpmMG7BaMCRRY' },
  { id: '5', name: 'Riley Webb', email: 'r.webb@proton.me', unit: 'Unit 303', level: 'VIP', time: '2 days ago', initials: 'RW', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvBdtRA8ab0zLqdXFNRUvlEmu0WzYUbrL8DqTiLXwYJMtvDrPycctiBj-rm56p_J7bagR4NF0maaZovc2yP5a92sYkpdh8fEP2TUHtkXPAlHH7Y3EZvpXdo2Sh8QEZhuOA2wGFk_qnN7COx219C227-lg2a-O5Detw7GL-Gt5ex43Twa_lGOvrPLkIiAF7ZMNQV0nAOAKG6O3wEXaXghVjIfNhGNs6ar4Dj6DKT0m_pjXkcjhZVflCEc-uZsN_wP0PKexuwzbCFPV2' },
];



const MOCK_PERMISSIONS = [
  { id: '1', role: 'Super Admin', users: 3, level: 'Full Access', lastUpdated: '2 days ago', status: 'Critical' },
  { id: '2', role: 'Security Officer', users: 12, level: 'Restricted', lastUpdated: '1 week ago', status: 'Active' },
  { id: '3', role: 'Facility Manager', users: 5, level: 'View Only', lastUpdated: '3 weeks ago', status: 'Active' },
  { id: '4', role: 'External Auditor', users: 2, level: 'Audit Only', lastUpdated: '1 month ago', status: 'Temporary' },
];




export const Registrations = () => {
  const [data, setData] = useState([]);
  const [emailingQr, setEmailingQr] = useState(false);
  const [emailConfirmVisible, setEmailConfirmVisible] = useState(false);
  const [emailResult, setEmailResult] = useState(null); // { sent, skipped, failed, errors } or { error }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState('table');
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [transactionError, setTransactionError] = useState(false);
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const theme = useTheme();

  
  // Modal & Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    studentPhone: '', 
    parentPhone: '', 
    roomNo: '', 
    floorNo: '', 
    imd: '',
    hasFingerprint: false,
    biometricTemplate: null,
    mealType: 'Non-Veggie'
  });
  const { userRole, user, isAuthenticated } = usePermissions();
  const { showSnackbar } = useSnackbar();
  const [isFingerprinting, setIsFingerprinting] = useState(false);
  const scanActiveRef = useRef(false); // true while an enrollment capture loop is running
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated, userRole]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, {
        headers: {
          'x-user-role': userRole
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      Alert.alert('Error', 'Failed to fetch registrations from server.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter(r => r.status === 'Approved').length,
  }), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const name = item.name || `${item.first_name} ${item.last_name}`;
      return name.toLowerCase().includes(search.toLowerCase()) || 
             item.email.toLowerCase().includes(search.toLowerCase());
    });
  }, [data, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [filteredData, page, itemsPerPage]);



  const handleEditPress = (item) => {
    setEditId(item.id);
    setIsEditing(true);
    setIsViewing(false);
    setFormData({
      firstName: item.firstName || item.first_name || '',
      lastName: item.lastName || item.last_name || '',
      email: item.email || '',
      studentPhone: item.studentPhone || item.student_phone || '',
      parentPhone: item.parentPhone || item.parent_phone || '',
      roomNo: item.roomNo || item.room_no || '',
      floorNo: item.floorNo || item.floor_no || '',
      imd: item.imd || '',
      hasFingerprint: item.hasFingerprint || item.has_fingerprint || false,
      biometricTemplate: item.biometricTemplate || item.biometric_template || null,
      mealType: item.mealType || item.meal_type || 'Non-Veggie',
      registrationNumber: item.registrationNumber || item.registration_number || ''
    });
    setIsModalVisible(true);
  };

  const handleDeleteRegistration = (item) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const renterToDelete = data.find(r => r.id === deleteTarget.id);
      const response = await axios.delete(`${API_URL}/${deleteTarget.id}`);
      
      if (response.data && response.data.success === false && response.data.code === 'HAS_TRANSACTIONS') {
        setTransactionError(true);
        setDeleteTarget(null);
        return;
      }

      setData(prev => prev.filter(r => r.id !== deleteTarget.id));
      
      await createAuditLog({
        admin: user?.name || userRole,
        adminId: user?.username || userRole,
        type: 'Renter Deletion',
        details: `Deleted renter: ${renterToDelete?.firstName} ${renterToDelete?.lastName}`,
        subDetails: `Unit: ${renterToDelete?.unit || `Room ${renterToDelete?.roomNo}`}`,
        status: 'Success'
      });
      showSnackbar(`Deleted ${renterToDelete?.firstName || 'renter'} ${renterToDelete?.lastName || ''}.`.trim(), 'success');
    } catch (error) {
      console.error('Error deleting registration:', error);
      showSnackbar('Failed to delete registration.', 'error');
    } finally {
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (item) => {
    setEditId(item.id);
    setIsEditing(false);
    setIsViewing(true);
    setFormData({
      firstName: item.firstName || item.first_name || '',
      lastName: item.lastName || item.last_name || '',
      email: item.email || '',
      studentPhone: item.studentPhone || item.student_phone || '',
      parentPhone: item.parentPhone || item.parent_phone || '',
      roomNo: item.roomNo || item.room_no || '',
      floorNo: item.floorNo || item.floor_no || '',
      imd: item.imd || '',
      hasFingerprint: item.hasFingerprint || item.has_fingerprint || false,
      biometricTemplate: item.biometricTemplate || item.biometric_template || null,
      mealType: item.mealType || item.meal_type || 'Non-Veggie',
      registrationNumber: item.registrationNumber || item.registration_number || ''
    });
    setIsModalVisible(true);
  };

  const handleSaveRegistration = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.roomNo) {
      showSnackbar('Please fill in First Name, Last Name, Email, and Room No.', 'error');
      return;
    }
    setIsSaving(true);

    const fullName = `${formData.firstName} ${formData.lastName}`;
    const initials = (formData.firstName[0] || '') + (formData.lastName[0] || '');

    const entryData = {
      ...formData,
      name: fullName,
      unit: `Room ${formData.roomNo}`,
      initials: initials.toUpperCase()
    };
    
    console.log('Final entryData being sent:', JSON.stringify(entryData, null, 2));
    console.log(`Saving registration. isEditing: ${isEditing}, editId: ${editId}`, entryData);
    console.log('Meal Type:', formData.mealType);

    try {
      if (isEditing) {
        console.log(`Sending PUT request to ${API_URL}/${editId}`);
        const response = await axios.put(`${API_URL}/${editId}`, entryData);
        console.log('Update response data:', JSON.stringify(response.data, null, 2));
        console.log('State updated successfully');
        
        // Final fallback: re-fetch EVERYTHING to ensure sync
        await fetchRegistrations();
        
        await createAuditLog({
          admin: user?.name || userRole,
          adminId: user?.username || userRole,
          type: 'Renter Update',
          details: `Updated renter: ${formData.firstName} ${formData.lastName}`,
          subDetails: `Unit: ${entryData.unit}`,
          status: 'Success'
        });
      } else {
        console.log(`Sending POST request to ${API_URL}`);
        const response = await axios.post(API_URL, { ...entryData, status: 'Approved' });
        console.log('Create response:', response.data);
        await fetchRegistrations();

        // Log registration approval dynamically
        try {
          await axios.post(`${API_BASE_URL}/access-logs`, {
            name: entryData.name,
            dept: 'New Registration',
            point: 'Admin Console',
            location: 'Front Desk',
            type: 'System Enrollment',
            status: 'Granted',
            avatar: null
          });
        } catch (logErr) {
          console.error('Failed to log registration approval', logErr);
        }

        await createAuditLog({
          admin: user?.name || userRole,
          adminId: user?.username || userRole,
          type: 'Renter Registration',
          details: `Registered new renter: ${formData.firstName} ${formData.lastName}`,
          subDetails: `Unit: ${entryData.unit}`,
          status: 'Success'
        });
      }
      
      showSnackbar(`Renter ${isEditing ? 'updated' : 'registered'} successfully.`, 'success');
      resetForm();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving registration:', error);
      showSnackbar(`Failed to ${isEditing ? 'update' : 'save'} registration.`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      studentPhone: '', 
      parentPhone: '', 
      roomNo: '', 
      floorNo: '', 
      imd: '',
      floorNo: '', 
      imd: '',
      hasFingerprint: false,
      biometricTemplate: null,
      mealType: 'Non-Veggie',
      registrationNumber: ''
    });
    setIsEditing(false);
    setIsViewing(false);
    setEditId(null);
  };

  const startFingerprintScan = async () => {
    setIsFingerprinting(true);
    setFingerprintProgress(0);
    setScanCount(1);
    scanActiveRef.current = true;

    try {
      // 1. Check if the Biometric Service is running
      const isRunning = await BiometricService.isServiceRunning();
      if (!isRunning) {
        throw new Error('SYSTEM ERROR: BIOMETRIC SERVICE NOT DETECTED. PLEASE ENSURE DIGITAL PERSONA WEB COMPONENTS ARE INSTALLED AND RUNNING.');
      }

      // 2. Start visual feedback
      runScan(1);

      // 3. Trigger real hardware capture. The .NET bridge captures for ~5s per
      // call and returns a timeout if no finger is presented; retry across a few
      // attempts so the admin has a comfortable window to place their finger.
      // (capture() is bridge-authoritative now, so a timeout no longer falls
      // through to the Web SDK — we drive the retries here instead.)
      console.log('Initiating SDK enrollment capture...');
      let captureResult = null;
      const maxAttempts = 6; // ~30s total
      for (let attempt = 0; attempt < maxAttempts && scanActiveRef.current; attempt++) {
        try {
          const r = await BiometricService.capture();
          if (r && r.status === 'SUCCESS') { captureResult = r; break; }
        } catch (capErr) {
          const m = capErr.message || '';
          if (/timed out|no data received/i.test(m)) {
            // No finger yet — give the reader a moment to fully release, then retry.
            await new Promise((res) => setTimeout(res, 300));
            continue;
          }
          throw capErr; // a real hardware/connection error
        }
      }

      if (!scanActiveRef.current) return; // admin cancelled / closed the modal

      if (!captureResult || captureResult.status !== 'SUCCESS') {
        throw new Error('No fingerprint detected. Please place your finger firmly on the reader and try again.');
      }

      {
        console.log('SDK Enrollment Capture Success');

        // One renter = one biometric: make sure this fingerprint isn't already
        // enrolled to someone else before accepting the capture. excludeId lets a
        // renter re-enroll their OWN print without being flagged as a duplicate.
        //
        // FMD matching runs on the LOCAL bridge (the cloud backend can't reach
        // it). The registration list already carries each template, so we match
        // client-side and only the result touches the cloud.
        const exclude = String(editId || '');
        const candidates = (data || []).filter((r) => {
          const tpl = r.biometricTemplate || r.biometric_template;
          const hasFp = r.hasFingerprint || r.has_fingerprint;
          return hasFp && tpl && tpl.length > 50 && String(r.id) !== exclude;
        });

        if (candidates.length > 0) {
          let matched = null;
          try {
            const idRes = await fetch(`${BRIDGE_BASE_URL}/identify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                probe: captureResult.template,
                candidates: candidates.map((c) => c.biometricTemplate || c.biometric_template),
              }),
            });
            if (idRes.ok) {
              const d = await idRes.json();
              if (d.status === 'SUCCESS' && d.matchedIndex !== undefined && d.matchedIndex !== -1) {
                matched = candidates[d.matchedIndex];
              }
            }
          } catch (idErr) {
            console.warn('Local biometric identify failed:', idErr.message);
          }

          if (matched) {
            const who = matched.name
              || `${matched.firstName || matched.first_name || ''} ${matched.lastName || matched.last_name || ''}`.trim()
              || `Renter #${matched.id}`;
            showSnackbar(`This biometric is already registered to ${who}. One renter can only have one biometric.`, 'error');
            setFingerprintProgress(0);
            setScanCount(0);
            setIsFingerprinting(false);
            return; // do NOT accept the capture
          }
        }

        setFingerprintProgress(100);
        setFormData(prev => ({
          ...prev,
          hasFingerprint: true,
          biometricTemplate: captureResult.template
        }));
        setScanCount(0);
        showSnackbar('Fingerprint captured successfully.', 'success');
        setTimeout(() => setIsFingerprinting(false), 800);
      }
    } catch (err) {
      console.error('Biometric Enrollment Failed:', err);
      let errorMsg = err.response?.data?.error || err.message || 'Capture failed';

      if (errorMsg.includes('DETECTED') || errorMsg.includes('unreachable') || errorMsg.includes('refused')) {
        errorMsg = 'BIOMETRIC BRIDGE IS UNREACHABLE. PLEASE ENSURE THE .NET BRIDGE IS RUNNING (dotnet run --project BiometricBridge) OR THE HID WEB SDK IS ACTIVE (VISIT HTTPS://127.0.0.1:52181/GET_CONNECTION).';
      }
      
      showSnackbar(errorMsg, 'error');
      setIsFingerprinting(false);
      setScanCount(0);
    }
  };

  const runScan = (currentScan) => {
    setScanCount(currentScan);
    setFingerprintProgress(0);
    
    // Progress bar visual only
    if (isFingerprinting && currentScan < 3) {
      setTimeout(() => runScan(currentScan + 1), 1000);
    }
  };

  // Builds a printable PDF of QR cards (one per registration in the current view).
  // Each renter scans their card in the Renter Notify app to set up alerts.
  const handlePrintQrCards = async () => {
    try {
      const rows = (filteredData || []).map((r) => ({
        reg: r.registration_number || r.registrationNumber || '',
        phone: r.parent_phone || r.parentPhone || r.student_phone || r.studentPhone || '',
        name: r.name || `${r.first_name || r.firstName || ''} ${r.last_name || r.lastName || ''}`.trim(),
      })).filter((r) => r.reg && r.phone);

      if (rows.length === 0) {
        Alert.alert('No QR cards', 'No registrations with a registration number and phone in the current view.');
        return;
      }

      const cards = await Promise.all(rows.map(async (r) => {
        const svg = await QRCodeLib.toString(
          JSON.stringify({ registrationNumber: r.reg, phone: r.phone }),
          { type: 'svg', margin: 1, color: { dark: '#0F766E', light: '#ffffff' } }
        );
        return `<div class="card">
          <div class="brand">Renter Notify</div>
          <div class="qr">${svg}</div>
          <div class="name">${r.name || 'Renter'}</div>
          <div class="reg">Reg #${r.reg}</div>
          <div class="hint">Open the Renter Notify app &rarr; tap "Scan QR Code"</div>
        </div>`;
      }));

      // Print-robust layout: a fixed A4 page with a 2-column CSS grid of
      // fixed-size cards. We avoid percentage widths + flex `gap` (browsers
      // reflow those differently between the on-screen preview and the actual
      // print engine) and force color printing so the teal QR/brand survive.
      const html = `<html><head><meta charset="utf-8"/><style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; font-family: -apple-system, Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; padding: 0; }
        .grid {
          display: grid;
          grid-template-columns: 90mm 90mm;
          justify-content: center;
          gap: 6mm;
        }
        .card {
          width: 90mm;
          height: 75mm;
          border: 1px dashed #94a3b8;
          border-radius: 4mm;
          padding: 5mm;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .brand { color: #0F766E; font-weight: 700; font-size: 12pt; margin-bottom: 2mm; }
        .qr { line-height: 0; }
        .qr svg { width: 35mm; height: 35mm; display: block; }
        .name { font-weight: 700; font-size: 12pt; margin-top: 2mm; color: #0F172A; }
        .reg { color: #0F766E; font-weight: 700; font-size: 11pt; }
        .hint { color: #64748b; font-size: 8pt; margin-top: 2mm; }
      </style></head><body><div class="grid">${cards.join('')}</div></body></html>`;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => { printWindow.print(); }, 500);
        }
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      Alert.alert('Print failed', e?.message || 'Could not generate QR cards.');
    }
  };

  // How many renters in the current view are eligible (have an email).
  const emailEligibleCount = (filteredData || []).filter(
    (r) => (r.email || '').trim().length > 0
  ).length;

  // Emails every renter (with an email + phone) their Renter Notify QR code.
  // Opens a styled confirmation dialog first, then a result dialog.
  const handleEmailQrToAll = () => setEmailConfirmVisible(true);

  const confirmEmailQrToAll = async () => {
    setEmailConfirmVisible(false);
    try {
      setEmailingQr(true);
      const res = await axios.post(`${API_BASE_URL}/registrations/send-qr-bulk`, {}, {
        headers: { 'x-user-role': userRole },
      });
      const { sent = 0, skipped = 0, failed = 0, errors = [] } = res.data || {};
      setEmailResult({ sent, skipped, failed, errors });
      showSnackbar(
        `QR emails — Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`,
        failed > 0 ? 'error' : 'success'
      );
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to send emails.';
      const friendly = /not configured/i.test(msg)
        ? 'Email is not set up yet. Configure SMTP on the backend.'
        : msg;
      setEmailResult({ error: friendly });
      showSnackbar(friendly, 'error');
    } finally {
      setEmailingQr(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Registrations</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Review and approve new registration requests.</Text>
        </View>
        <Button
          mode="outlined"
          icon="email-fast"
          onPress={handleEmailQrToAll}
          loading={emailingQr}
          disabled={emailingQr}
          style={[styles.addButton, { marginRight: 8 }]}
        >
          Email QR to All
        </Button>
        <Button
          mode="outlined"
          icon="qrcode"
          onPress={handlePrintQrCards}
          style={[styles.addButton, { marginRight: 8 }]}
        >
          Print QR Cards
        </Button>
        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => { resetForm(); setIsModalVisible(true); }}
          style={styles.addButton}
        >
          Manual Registration
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="account-group" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.total}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Total Registrations</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="check-circle-outline" style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }} color={colors.emerald600} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.active}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Active Renters</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.filtersRow}>

        
        <TextInput
          placeholder="Search by name or email..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={colors.slate400} />}
          style={styles.searchBar}
          outlineStyle={{ borderRadius: 12, borderColor: colors.slate200 }}
          contentStyle={{ fontSize: 14 }}
        />

        <View style={styles.viewToggleGroup}>
          <IconButton 
            icon="view-list" 
            mode={viewType === 'table' ? 'contained' : 'standard'}
            containerColor={viewType === 'table' ? colors.primary : 'transparent'}
            iconColor={viewType === 'table' ? colors.white : colors.slate500}
            onPress={() => setViewType('table')}
            size={20}
          />
          <IconButton 
            icon="view-grid" 
            mode={viewType === 'grid' ? 'contained' : 'standard'}
            containerColor={viewType === 'grid' ? colors.primary : 'transparent'}
            iconColor={viewType === 'grid' ? colors.white : colors.slate500}
            onPress={() => setViewType('grid')}
            size={20}
          />
        </View>
      </View>


      <Card style={[styles.tableCard, viewType === 'grid' && { backgroundColor: 'transparent', elevation: 0, borderWidth: 0 }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 16, color: colors.slate500 }}>Loading registrations...</Text>
          </View>
        ) : viewType === 'table' ? (
          <>
            <Table 
              headers={['ID', 'Applicant', 'Student Phone', 'Room', 'Meal Type', 'IMD', 'Date', 'Actions']}
              columnFlex={[0.8, 2, 1.5, 1, 1.2, 1, 1.2, 1]}
              data={paginatedData}
              renderRow={(item) => (
                <>
                  <DataTable.Cell style={{ flex: 0.8 }}>
                    <Text variant="labelMedium" style={{ color: colors.primary, fontWeight: 'bold' }}>{item.registrationNumber || item.registration_number || '-'}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 2 }}>
                    <View style={styles.userInfo}>
                      <Avatar.Text 
                        size={32} 
                        label={item.initials || (item.name ? item.name.substring(0, 2).toUpperCase() : '??')} 
                        style={styles.avatar}
                        labelStyle={styles.avatarLabel}
                      />
                      <View style={{ marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name || `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`}</Text>
                          {(item.hasFingerprint || item.has_fingerprint) && <IconButton icon="fingerprint" size={14} iconColor={colors.primary} style={{ margin: 0, padding: 0 }} />}
                        </View>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.email}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.5 }}><Text variant="bodySmall">{item.studentPhone || item.student_phone || '-'}</Text></DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}><Text variant="bodySmall">{item.unit || `Room ${item.roomNo}`}</Text></DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.2 }}>
                    <Surface style={[
                      styles.statusBadge, 
                      item.mealType === 'Veggie' || item.meal_type === 'Veggie' ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(244, 63, 94, 0.1)' }
                    ]} elevation={0}>
                      <Text variant="labelSmall" style={[
                        styles.statusBadgeText, 
                        item.mealType === 'Veggie' || item.meal_type === 'Veggie' ? { color: colors.emerald600 } : { color: colors.rose600 }
                      ]}>{item.mealType || item.meal_type || 'Non-Veggie'}</Text>
                    </Surface>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}><Text variant="bodySmall">{item.imd || '-'}</Text></DataTable.Cell>

                  <DataTable.Cell style={{ flex: 1.2 }}><Text variant="bodySmall">{item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</Text></DataTable.Cell>
                  <DataTable.Cell numeric style={{ flex: 1 }}>
                    <Menu
                      visible={openMenuId === item.id}
                      onDismiss={() => setOpenMenuId(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={20}
                          iconColor={colors.slate500}
                          onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        />
                      }
                    >
                      <Menu.Item
                        leadingIcon="eye-outline"
                        onPress={() => { setOpenMenuId(null); handleViewDetails(item); }}
                        title="View Details"
                      />
                      <Menu.Item
                        leadingIcon="pencil-outline"
                        onPress={() => { setOpenMenuId(null); handleEditPress(item); }}
                        title="Edit"
                      />
                      <Divider />
                      <Menu.Item
                        leadingIcon="trash-can-outline"
                        onPress={() => { setOpenMenuId(null); handleDeleteRegistration(item); }}
                        title="Delete"
                        titleStyle={{ color: '#F43F5E' }}
                      />
                    </Menu>
                  </DataTable.Cell>
                </>
              )}
            />
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredData.length / itemsPerPage)}
              onPageChange={(p) => setPage(p)}
              label={`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, filteredData.length)} of ${filteredData.length}`}
              numberOfItemsPerPageList={[10, 20, 50]}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              showFastPaginationControls
              selectPageDropdownLabel={'Rows per page'}
            />
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.cardGrid}>
              {paginatedData.map((item) => (
                <Card key={item.id} style={styles.itemCard}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Avatar.Text 
                        size={40} 
                        label={item.initials || (item.name ? item.name.substring(0, 2).toUpperCase() : '??')} 
                        style={styles.avatar}
                        labelStyle={styles.avatarLabel}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{item.name || `${item.first_name} ${item.last_name}`}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.email}</Text>
                        <Text variant="labelSmall" style={{ color: colors.primary, fontWeight: 'bold', marginTop: 4 }}>ID: {item.registrationNumber || item.registration_number || '-'}</Text>
                      </View>
                      <Menu
                        visible={openMenuId === `card-${item.id}`}
                        onDismiss={() => setOpenMenuId(null)}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={20}
                            iconColor={colors.slate500}
                            onPress={() => setOpenMenuId(openMenuId === `card-${item.id}` ? null : `card-${item.id}`)}
                          />
                        }
                      >
                        <Menu.Item
                          leadingIcon="eye-outline"
                          onPress={() => { setOpenMenuId(null); handleViewDetails(item); }}
                          title="View Details"
                        />
                        <Menu.Item
                          leadingIcon="pencil-outline"
                          onPress={() => { setOpenMenuId(null); handleEditPress(item); }}
                          title="Edit"
                        />
                        <Divider />
                        <Menu.Item
                          leadingIcon="trash-can-outline"
                          onPress={() => { setOpenMenuId(null); handleDeleteRegistration(item); }}
                          title="Delete"
                          titleStyle={{ color: '#F43F5E' }}
                        />
                      </Menu>
                    </View>
                    
                    <View style={styles.cardDivider} />
                    
                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <IconButton icon="phone" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={styles.detailText}>{item.studentPhone || item.student_phone || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="office-building" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={styles.detailText}>Room {item.roomNo || item.room_no || '-'}, Floor {item.floorNo || item.floor_no || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="food-apple" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={[
                          styles.detailText, 
                          { color: (item.mealType === 'Veggie' || item.meal_type === 'Veggie') ? colors.emerald600 : colors.rose600, fontWeight: 'bold' }
                        ]}>{item.mealType || item.meal_type || 'Non-Veggie'}</Text>
                      </View>
                    </View>
                    

                  </Card.Content>
                </Card>
              ))}
            </View>
            <View style={{ paddingVertical: 16 }}>
              <DataTable.Pagination
                page={page}
                numberOfPages={Math.ceil(filteredData.length / itemsPerPage)}
                onPageChange={(p) => setPage(p)}
                label={`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, filteredData.length)} of ${filteredData.length}`}
                showFastPaginationControls
              />
            </View>
          </View>
        )}
        {!loading && filteredData.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: colors.slate400 }}>No registrations found matching your criteria.</Text>
          </View>
        )}
      </Card>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => { setIsModalVisible(false); setIsFingerprinting(false); scanActiveRef.current = false; }}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title={isViewing ? "Registration Details" : isEditing ? "Edit Registration" : "Manual Registration"} 
              subtitle={isViewing ? "View full details for this registration record." : isEditing ? "Update details for this registration record." : "Enter details for a new renter application manually."}
              right={(props) => (
                <IconButton 
                  {...props} 
                  icon="close" 
                  onPress={() => setIsModalVisible(false)} 
                />
              )}
            />
            <ScrollView contentContainerStyle={styles.modalBody}>
              {isFingerprinting ? (
                <View style={styles.scannerContainer}>
                  <Surface style={styles.scannerHexagon} elevation={2}>
                    <Avatar.Icon size={80} icon="fingerprint" style={{ backgroundColor: 'transparent' }} color={colors.primary} />
                    <Animated.View style={[styles.scannerScanline, { backgroundColor: colors.primary, top: `${fingerprintProgress}%` }]} />
                  </Surface>
                  <View style={{ alignItems: 'center', gap: 4, marginTop: 24 }}>
                    <Text variant="titleMedium" style={styles.scannerStatus}>Scanning Fingerprint...</Text>
                    <Text variant="labelLarge" style={{ color: colors.primary, fontWeight: 'bold' }}>
                      SCAN {scanCount} OF 3
                    </Text>
                  </View>
                  
                  <View style={styles.scanIndicatorRow}>
                    {[1, 2, 3].map(i => (
                      <View 
                        key={i} 
                        style={[
                          styles.scanDot, 
                          i < scanCount ? styles.scanDotDone : 
                          i === scanCount ? styles.scanDotActive : {}
                        ]} 
                      />
                    ))}
                  </View>

                  <ProgressBar progress={fingerprintProgress / 100} color={colors.primary} style={styles.scannerProgressBar} />
                  <Text variant="labelSmall" style={styles.progressText}>{fingerprintProgress}% Complete</Text>
                </View>
              ) : (
                <View style={{ gap: 24 }}>
                  <View style={styles.formSection}>
                    <View style={styles.sectionHeader}>
                      <Avatar.Icon size={28} icon="account-details" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                      <Text variant="titleSmall" style={styles.sectionTitle}>Personal Details</Text>
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput
                        label="First Name *"
                        value={formData.firstName}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, firstName: val }))}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="account" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                      <TextInput
                        label="Last Name *"
                        value={formData.lastName}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, lastName: val }))}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="account" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                    </View>
                    {formData.registrationNumber && (
                      <TextInput
                        label="Registration ID"
                        value={formData.registrationNumber}
                        mode="outlined"
                        style={[styles.input, { marginBottom: 16 }]}
                        editable={false}
                        left={<TextInput.Icon icon="card-account-details" color={colors.primary} />}
                        outlineStyle={{ borderRadius: 12, borderColor: colors.primary }}
                      />
                    )}
                    {isViewing && formData.registrationNumber ? (
                      <View style={{ alignItems: 'center', marginBottom: 16, padding: 16, backgroundColor: colors.indigo50, borderRadius: 12 }}>
                        <Text variant="labelMedium" style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}>
                          Renter Notify QR
                        </Text>
                        <Text variant="bodySmall" style={{ color: colors.slate400, textAlign: 'center', marginBottom: 12 }}>
                          The renter scans this in the Renter Notify app to set up meal-ticket alerts — no typing needed.
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
                          {formData.parentPhone ? (
                            <View style={{ alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8 }}>
                                <QRCode value={JSON.stringify({ registrationNumber: formData.registrationNumber, phone: formData.parentPhone })} size={140} />
                              </View>
                              <Text variant="labelSmall" style={{ color: colors.primary, marginTop: 6, fontWeight: 'bold' }}>Parent</Text>
                            </View>
                          ) : null}
                          {formData.studentPhone && formData.studentPhone !== formData.parentPhone ? (
                            <View style={{ alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8 }}>
                                <QRCode value={JSON.stringify({ registrationNumber: formData.registrationNumber, phone: formData.studentPhone })} size={140} />
                              </View>
                              <Text variant="labelSmall" style={{ color: colors.primary, marginTop: 6, fontWeight: 'bold' }}>Student</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                    <TextInput
                      label="Email Address *"
                      value={formData.email}
                      onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))}
                      mode="outlined"
                      keyboardType="email-address"
                      style={styles.input}
                      editable={!isViewing}
                      left={<TextInput.Icon icon="email" color={colors.slate400} />}
                      outlineStyle={{ borderRadius: 12 }}
                    />
                  </View>

                  <View style={styles.formSection}>
                    <View style={styles.sectionHeader}>
                      <Avatar.Icon size={28} icon="phone-outline" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                      <Text variant="titleSmall" style={styles.sectionTitle}>Contact Information</Text>
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput
                        label="Student Phone"
                        value={formData.studentPhone}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, studentPhone: val }))}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="phone" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                      <TextInput
                        label="Parent Phone"
                        value={formData.parentPhone}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, parentPhone: val }))}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="phone-settings" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <View style={styles.sectionHeader}>
                      <Avatar.Icon size={28} icon="office-building-marker" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                      <Text variant="titleSmall" style={styles.sectionTitle}>Room Assignment</Text>
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput
                        label="Room No *"
                        value={formData.roomNo}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, roomNo: val }))}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="door-open" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                      <TextInput
                        label="Floor No"
                        value={formData.floorNo}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, floorNo: val }))}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="layers-outline" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                      />
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput
                        label="IMD ID"
                        value={formData.imd}
                        onChangeText={(val) => setFormData(prev => ({ ...prev, imd: val }))}
                        mode="outlined"
                        style={[styles.input, { flex: 1 }]}
                        editable={!isViewing}
                        left={<TextInput.Icon icon="card-account-details-outline" color={colors.slate400} />}
                        outlineStyle={{ borderRadius: 12 }}
                        placeholder="IMD ID"
                      />
                      <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 8 }}>
                        <Text variant="labelSmall" style={{ color: colors.slate500, marginBottom: 4 }}>MEAL TYPE</Text>
                        <SegmentedButtons
                          value={formData.mealType}
                          onValueChange={(val) => setFormData(prev => ({ ...prev, mealType: val }))}
                          buttons={[
                            { value: 'Non-Veggie', label: 'Non-Veg', disabled: isViewing },
                            { value: 'Veggie', label: 'Veggie', disabled: isViewing },
                          ]}
                          density="compact"
                          style={{ scaleX: 0.9, scaleY: 0.9, marginLeft: -10 }}
                        />
                      </View>
                    </View>
                  </View>

                  <Surface style={[
                    styles.fingerprintSection, 
                    formData.hasFingerprint && { borderColor: colors.emerald500, backgroundColor: 'rgba(16, 185, 129, 0.04)' }
                  ]} elevation={0}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: colors.slate800 }}>Biometric Enrollment</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>
                        {formData.hasFingerprint ? 'Fingerprint successfully captured.' : 'Enrollment required for high-security access.'}
                      </Text>
                    </View>
                    <Button 
                      mode={formData.hasFingerprint ? "contained" : "outlined"} 
                      icon={formData.hasFingerprint ? "check-circle" : "fingerprint"}
                      onPress={isViewing ? null : startFingerprintScan}
                      style={{ borderRadius: 10 }}
                      buttonColor={formData.hasFingerprint ? colors.emerald500 : undefined}
                      disabled={isViewing}
                    >
                      {formData.hasFingerprint ? 'Captured' : 'Register'}
                    </Button>
                  </Surface>
                </View>
              )}
            </ScrollView>
            <Card.Actions style={styles.modalActions}>
              <Button 
                onPress={() => { setIsModalVisible(false); setIsFingerprinting(false); scanActiveRef.current = false; }} 
                mode="text"
                textColor={colors.slate500}
                style={{ borderRadius: 10 }}
              >
                {isViewing ? 'Close' : 'Cancel'}
              </Button>
              {!isViewing && (
                <Button
                  onPress={handleSaveRegistration}
                  mode="contained"
                  loading={isSaving}
                  disabled={isFingerprinting || isSaving}
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  contentStyle={{ paddingHorizontal: 16 }}
                >
                  {isEditing ? 'Update Registration' : 'Add Registration'}
                </Button>
              )}
            </Card.Actions>
          </Card>
        </Modal>

        <Dialog
          visible={!!deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
          style={{ borderRadius: 16, maxWidth: 440, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Icon icon="alert-circle-outline" color="#F43F5E" />
          <Dialog.Title style={{ textAlign: 'center' }}>Delete Registration</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.slate600 }}>
              Are you sure you want to permanently delete the registration for{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {deleteTarget ? (deleteTarget.name || `${deleteTarget.first_name} ${deleteTarget.last_name}`) : ''}
              </Text>
              ? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', gap: 8, paddingBottom: 16 }}>
            <Button
              mode="outlined"
              onPress={() => setDeleteTarget(null)}
              style={{ borderRadius: 10, minWidth: 100 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor="#F43F5E"
              onPress={confirmDelete}
              loading={isDeleting}
              disabled={isDeleting}
              style={{ borderRadius: 10, minWidth: 100 }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={transactionError}
          onDismiss={() => setTransactionError(false)}
          style={{ borderRadius: 16, maxWidth: 440, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Icon icon="alert-circle-outline" color="#F43F5E" />
          <Dialog.Title style={{ textAlign: 'center' }}>Deletion Not Allowed</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.slate600 }}>
              Cant delete this Data have transactions
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 16 }}>
            <Button
              mode="contained"
              buttonColor="#F43F5E"
              onPress={() => setTransactionError(false)}
              style={{ borderRadius: 10, minWidth: 100 }}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Email QR — confirmation */}
        <Dialog
          visible={emailConfirmVisible}
          onDismiss={() => setEmailConfirmVisible(false)}
          style={{ borderRadius: 16, maxWidth: 460, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Icon icon="email-fast-outline" color={colors.primary} />
          <Dialog.Title style={{ textAlign: 'center' }}>Email QR Codes</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.slate600 }}>
              Send the Renter Notify QR code by email to{' '}
              <Text style={{ fontWeight: 'bold', color: colors.primary }}>{emailEligibleCount}</Text>
              {' '}renter{emailEligibleCount === 1 ? '' : 's'} who have an email address in the current view.
            </Text>
            <Text variant="bodySmall" style={{ textAlign: 'center', color: colors.slate500, marginTop: 8 }}>
              Renters without an email are skipped automatically.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', gap: 8, paddingBottom: 16 }}>
            <Button
              mode="outlined"
              onPress={() => setEmailConfirmVisible(false)}
              style={{ borderRadius: 10, minWidth: 100 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="email-fast"
              buttonColor={colors.primary}
              onPress={confirmEmailQrToAll}
              style={{ borderRadius: 10, minWidth: 120 }}
            >
              Send Emails
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Email QR — result */}
        <Dialog
          visible={!!emailResult}
          onDismiss={() => setEmailResult(null)}
          style={{ borderRadius: 16, maxWidth: 480, alignSelf: 'center', width: '100%' }}
        >
          <Dialog.Icon
            icon={emailResult?.error ? 'alert-circle-outline' : (emailResult?.failed > 0 ? 'alert-outline' : 'check-circle-outline')}
            color={emailResult?.error || emailResult?.failed > 0 ? '#F43F5E' : '#10B981'}
          />
          <Dialog.Title style={{ textAlign: 'center' }}>
            {emailResult?.error ? 'Email Failed' : 'QR Emails Sent'}
          </Dialog.Title>
          <Dialog.Content>
            {emailResult?.error ? (
              <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.slate600 }}>
                {emailResult.error}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, minWidth: 96 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#059669' }}>{emailResult?.sent ?? 0}</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500 }}>Sent</Text>
                  </View>
                  <View style={{ alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, minWidth: 96 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#D97706' }}>{emailResult?.skipped ?? 0}</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500 }}>Skipped</Text>
                  </View>
                  <View style={{ alignItems: 'center', backgroundColor: emailResult?.failed > 0 ? '#FEF2F2' : '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, minWidth: 96 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: emailResult?.failed > 0 ? '#DC2626' : colors.slate400 }}>{emailResult?.failed ?? 0}</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500 }}>Failed</Text>
                  </View>
                </View>
                <Text variant="bodySmall" style={{ textAlign: 'center', color: colors.slate500 }}>
                  Skipped = no email address on file.
                </Text>
                {emailResult?.errors && emailResult.errors.length > 0 ? (
                  <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 4 }}>
                    <Text style={{ fontWeight: '700', color: '#DC2626', marginBottom: 4, fontSize: 13 }}>Failed addresses</Text>
                    {emailResult.errors.map((er, i) => (
                      <Text key={i} style={{ color: colors.slate600, fontSize: 12 }}>
                        • {er.email}: {er.error}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 16 }}>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              onPress={() => setEmailResult(null)}
              style={{ borderRadius: 10, minWidth: 100 }}
            >
              Done
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};
export const ActiveRenters = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState('table');
  const [selectedRenter, setSelectedRenter] = useState(null);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [viewingRenter, setViewingRenter] = useState(null);
  const [isExpirationModalVisible, setIsExpirationModalVisible] = useState(false);
  const [expirationTargetId, setExpirationTargetId] = useState(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationDays, setExpirationDays] = useState('');
  const [isSavingExpiration, setIsSavingExpiration] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { userRole, isAuthenticated } = usePermissions();
  const { showSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchActiveRenters();
    }
  }, [isAuthenticated, userRole]);

  const isExpired = (item) => {
    if (!item.mealTicketExpirationDate) return false;
    const now = new Date();
    const expiration = new Date(item.mealTicketExpirationDate);
    expiration.setHours(23, 59, 59, 999);
    return now > expiration;
  };

  const applyDays = (days) => {
    const daysNum = parseInt(days);
    if (isNaN(daysNum)) {
      setExpirationDate('');
      setExpirationDays('');
      return;
    }
    
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + daysNum);
    
    setExpirationDate(expiration.toISOString().split('T')[0]);
    setExpirationDays(daysNum.toString());
  };

  const handleExpirationSubmit = async () => {
    try {
      if (!expirationTargetId) return;
      setIsSavingExpiration(true);

      const payload = {
        expirationDate: expirationDate || null
      };
      
      const response = await axios.patch(`${API_URL}/${expirationTargetId}/meal-ticket-expiration`, payload);
      if (response.status === 200) {
        setData(prev => prev.map(item => item.id === expirationTargetId ? { ...item, mealTicketExpirationDate: response.data.mealTicketExpirationDate } : item));
        
        // If an expiration date is set, automatically enable meal ticket allowance
        if (expirationDate) {
          try {
            await axios.patch(`${API_BASE_URL}/registrations/${expirationTargetId}/meal-ticket-allowance`, {
              allowed: true
            });
            setData(prev => prev.map(item => item.id === expirationTargetId ? { ...item, canGenerateMealTicket: true } : item));
          } catch (allowanceErr) {
            console.error('Error automatically enabling allowance:', allowanceErr);
          }
        }

        setIsExpirationModalVisible(false);
        
        const renter = data.find(r => r.id === expirationTargetId);
        await createAuditLog({
          admin: userRole,
          adminId: userRole,
          type: 'Expiration Set',
          details: `Set expiration date for ${renter?.firstName} ${renter?.lastName} to ${expirationDate || 'Never'}`,
          subDetails: `Unit: ${renter?.unit || `Room ${renter?.roomNo}`}`,
          status: 'Success'
        });
        showSnackbar(`Expiration ${expirationDate ? `set to ${expirationDate}` : 'cleared'}.`, 'success');
      }
    } catch (error) {
      console.error('Error setting expiration:', error);
      showSnackbar('Failed to update expiration.', 'error');
    } finally {
      setExpirationDays('');
      setExpirationTargetId(null);
      setIsSavingExpiration(false);
    }
  };

  const fetchActiveRenters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL, {
        headers: {
          'x-user-role': userRole
        }
      });
      // Filter for active renters (those with Approved status)
      const approved = response.data.filter(r => r.status === 'Approved');
      setData(approved);
    } catch (error) {
      console.error('Error fetching active renters:', error);
      Alert.alert('Error', 'Failed to fetch active renters from server.');
    } finally {
      setLoading(false);
    }
  };
  
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const name = item.name || `${item.firstName} ${item.lastName}`;
      const unit = item.unit || `Room ${item.roomNo}`;
      return name.toLowerCase().includes(search.toLowerCase()) ||
             unit.toLowerCase().includes(search.toLowerCase());
    });
  }, [data, search]);

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [search]);

  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredData.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkAllowance = async (allowed) => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      const ids = [...selectedIds];
      const results = await Promise.allSettled(
        ids.map(id => axios.patch(`${API_BASE_URL}/registrations/${id}/meal-ticket-allowance`, { allowed }))
      );
      const successIds = ids.filter((id, i) => results[i].status === 'fulfilled');
      const failCount = ids.length - successIds.length;

      if (successIds.length > 0) {
        setData(prev => prev.map(item => successIds.includes(item.id) ? { ...item, canGenerateMealTicket: allowed } : item));
        await createAuditLog({
          admin: userRole,
          adminId: userRole,
          type: 'Bulk Allowance Toggle',
          details: `${allowed ? 'Enabled' : 'Disabled'} meal ticket for ${successIds.length} renter(s)`,
          subDetails: failCount ? `${failCount} failed` : 'All succeeded',
          status: failCount ? 'Partial' : 'Success'
        });
      }

      showSnackbar(
        `Meal ticket ${allowed ? 'enabled' : 'disabled'} for ${successIds.length} renter(s)${failCount ? `, ${failCount} failed` : ''}.`,
        failCount ? 'warning' : 'success'
      );
      setSelectedIds([]);
    } catch (error) {
      console.error('Error bulk toggling allowance:', error);
      showSnackbar('Failed to update meal ticket allowance.', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [filteredData, page, itemsPerPage]);

  const stats = useMemo(() => ({
    total: data.length,
    onSite: Math.floor(data.length * 0.4), // Mocking on-site for now as it's not in DB
    expiring: data.filter(r => {
      // Logic for expiring soon (e.g., created more than 30 days ago)
      const createdDate = new Date(r.date || r.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 25; // Expiring if more than 25 days old (just as an example)
    }).length
  }), [data]);

  const handleToggleAllowance = async (id, currentAllowed) => {
    try {
      setTogglingId(id);
      const newAllowed = !currentAllowed;
      const renter = data.find(r => r.id === id);
      const response = await axios.patch(`${API_BASE_URL}/registrations/${id}/meal-ticket-allowance`, {
        allowed: newAllowed
      });
      
      if (response.status === 200) {
        setData(prev => prev.map(item => item.id === id ? { ...item, canGenerateMealTicket: newAllowed } : item));
        
        await createAuditLog({
          admin: userRole,
          adminId: userRole,
          type: 'Allowance Toggle',
          details: `${newAllowed ? 'Enabled' : 'Disabled'} meal ticket for: ${renter?.firstName} ${renter?.lastName}`,
          subDetails: `Unit: ${renter?.unit || `Room ${renter?.roomNo}`}`,
          status: 'Success'
        });
        showSnackbar(`Meal ticket ${newAllowed ? 'enabled' : 'disabled'} for ${renter?.firstName || 'renter'}.`, 'success');
      }
    } catch (error) {
      console.error('Error toggling allowance:', error);
      showSnackbar('Failed to update meal ticket allowance.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewDetails = (item) => {
    setViewingRenter(item);
    setIsDetailsVisible(true);
  };

  const handleTerminalDone = () => {
    setIsTerminalVisible(false);
    // User requested not to disable the toggle automatically after terminal use
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Active Renters</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Real-time oversight of all authorized personnel currently on-site.</Text>
        </View>
        <Button mode="contained" icon="download" onPress={() => {}} style={styles.addButton}>
          Export Data
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="account-group" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.total}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Total Active Renters</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="clock-outline" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }} color={colors.amber600} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.onSite}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Currently On-site</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="check-circle-outline" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }} color="#10B981" />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.expiring}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Expiring Soon</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.filtersRow}>
        <TextInput
          placeholder="Search active renters..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={colors.slate400} />}
          style={styles.searchBar}
          outlineStyle={{ borderRadius: 12, borderColor: colors.slate200 }}
        />
        {viewType === 'grid' && (
          <View style={styles.toolbarSelectAll}>
            <CircleCheckbox
              status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
              onPress={toggleSelectAll}
              uncheckedColor={colors.slate500}
              style={{ marginRight: 8 }}
            />
            <Text variant="labelMedium" style={{ color: colors.slate600, fontWeight: '700' }}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </Text>
          </View>
        )}
        <View style={styles.viewToggleGroup}>
          <IconButton 
            icon="view-list" 
            mode={viewType === 'table' ? 'contained' : 'standard'}
            containerColor={viewType === 'table' ? colors.primary : 'transparent'}
            iconColor={viewType === 'table' ? colors.white : colors.slate500}
            onPress={() => setViewType('table')}
            size={20}
          />
          <IconButton 
            icon="view-grid" 
            mode={viewType === 'grid' ? 'contained' : 'standard'}
            containerColor={viewType === 'grid' ? colors.primary : 'transparent'}
            iconColor={viewType === 'grid' ? colors.white : colors.slate500}
            onPress={() => setViewType('grid')}
            size={20}
          />
        </View>
      </View>

      {selectedIds.length > 0 && (
        <Surface style={styles.bulkActionBar} elevation={2}>
          <View style={styles.bulkAccent} />
          <Avatar.Icon
            size={40}
            icon="checkbox-multiple-marked-circle"
            style={{ backgroundColor: colors.indigo100 }}
            color={colors.primary}
          />
          <View style={{ marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="titleSmall" style={{ fontWeight: '800', color: colors.slate800 }}>
                {selectedIds.length} selected
              </Text>
              <Surface style={styles.bulkCountBadge} elevation={0}>
                <Text variant="labelSmall" style={{ color: colors.primary, fontWeight: '800' }}>
                  {selectedIds.length}/{filteredData.length}
                </Text>
              </Surface>
            </View>
            <Text variant="bodySmall" style={{ color: colors.slate500 }}>
              Apply meal ticket access in bulk
            </Text>
          </View>

          <View style={styles.bulkRight}>
            <Button mode="text" onPress={toggleSelectAll} disabled={isBulkProcessing} compact textColor={colors.slate600}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
            <View style={styles.bulkVDivider} />
            <Button
              mode="contained"
              icon="check-circle"
              onPress={() => handleBulkAllowance(true)}
              loading={isBulkProcessing}
              disabled={isBulkProcessing}
              buttonColor={colors.emerald600}
              style={styles.bulkBtn}
              compact
            >
              Allow
            </Button>
            <Button
              mode="contained"
              icon="cancel"
              onPress={() => handleBulkAllowance(false)}
              disabled={isBulkProcessing}
              buttonColor={colors.rose600}
              style={styles.bulkBtn}
              compact
            >
              Restrict
            </Button>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setSelectedIds([])}
              disabled={isBulkProcessing}
              iconColor={colors.slate500}
              style={{ margin: 0 }}
            />
          </View>
        </Surface>
      )}

      <View style={[viewType === 'grid' && { flex: 1 }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 16, color: colors.slate500 }}>Loading active renters...</Text>
          </View>
        ) : viewType === 'table' ? (
          <Card style={styles.tableCard}>
            <Table
              headers={[
                <CircleCheckbox
                  key="select-all"
                  status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                  onPress={toggleSelectAll}
                  uncheckedColor={colors.slate500}
                />,
                'Renter', 'Unit', 'Meal Type', 'Expires On', 'Allow Meal Ticket', 'Actions'
              ]}
              columnFlex={[0.5, 1.5, 0.8, 1, 1, 1.2, 0.8]}
              data={paginatedData}
              renderRow={(item) => (
                <>
                  <DataTable.Cell style={{ flex: 0.5 }}>
                    <CircleCheckbox
                      status={selectedIds.includes(item.id) ? 'checked' : 'unchecked'}
                      onPress={() => toggleSelectOne(item.id)}
                    />
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.5 }}>
                    <View style={styles.userInfo}>
                      <Avatar.Text 
                        size={32} 
                        label={item.initials || (item.name ? item.name.substring(0, 2).toUpperCase() : '??')} 
                        style={[styles.avatar, { backgroundColor: colors.slate800 }]} 
                        labelStyle={styles.avatarLabel} 
                      />
                      <View style={{ marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name || `${item.firstName} ${item.lastName}`}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.email}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 0.8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton icon="office-building" size={14} iconColor={colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall">{item.unit || `Room ${item.roomNo}`}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <Surface style={[
                      styles.statusBadge, 
                      item.mealType === 'Veggie' || item.meal_type === 'Veggie' ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(244, 63, 94, 0.1)' }
                    ]} elevation={0}>
                      <Text variant="labelSmall" style={[
                        styles.statusBadgeText, 
                        item.mealType === 'Veggie' || item.meal_type === 'Veggie' ? { color: colors.emerald600 } : { color: colors.rose600 }
                      ]}>{item.mealType || item.meal_type || 'Non-Veggie'}</Text>
                    </Surface>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    {item.mealTicketExpirationDate ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="calendar-clock" size={14} iconColor={isExpired(item) ? colors.amber600 : colors.slate500} style={{ margin: 0, marginRight: -4 }} />
                        <Text variant="bodySmall" style={{ color: isExpired(item) ? colors.amber600 : colors.slate700 }}>
                          {new Date(item.mealTicketExpirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="bodySmall" style={{ color: colors.slate400, fontStyle: 'italic', paddingLeft: 12 }}>Never</Text>
                    )}
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={{ flex: 1.2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                      <Switch
                        value={item.canGenerateMealTicket}
                        onValueChange={() => handleToggleAllowance(item.id, item.canGenerateMealTicket)}
                        disabled={togglingId === item.id}
                        color={colors.primary}
                      />
                      <Text variant="labelSmall" style={{ color: item.canGenerateMealTicket ? (isExpired(item) ? colors.amber600 : colors.primary) : colors.slate400, minWidth: 80, textAlign: 'left' }}>
                        {item.canGenerateMealTicket ? (isExpired(item) ? 'ALLOWED (EXPIRED)' : 'ALLOWED') : 'RESTRICTED'}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={{ flex: 0.8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <IconButton 
                        icon="calendar-remove" 
                        size={20} 
                        iconColor={isExpired(item) ? colors.amber600 : colors.slate400} 
                        onPress={() => {
                          setExpirationTargetId(item.id);
                          setExpirationDate(item.mealTicketExpirationDate ? item.mealTicketExpirationDate.split('T')[0] : '');
                          setExpirationDays('');
                          setIsExpirationModalVisible(true);
                        }} 
                      />
                      <IconButton icon="eye-outline" size={20} iconColor={colors.slate400} onPress={() => handleViewDetails(item)} />
                    </View>
                  </DataTable.Cell>
                </>
              )}
            />
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredData.length / itemsPerPage)}
              onPageChange={(p) => setPage(p)}
              label={`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, filteredData.length)} of ${filteredData.length}`}
              numberOfItemsPerPageList={[10, 20, 50]}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              showFastPaginationControls
              selectPageDropdownLabel={'Rows per page'}
            />
          </Card>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.cardGrid}>
              {paginatedData.map((item) => (
                <Card key={item.id} style={[styles.itemCard, selectedIds.includes(item.id) && styles.itemCardSelected]}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <CircleCheckbox
                        status={selectedIds.includes(item.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleSelectOne(item.id)}
                        style={{ marginRight: 12 }}
                      />
                      <Avatar.Text
                        size={40}
                        label={item.initials || (item.name ? item.name.substring(0, 2).toUpperCase() : '??')}
                        style={[styles.avatar, { backgroundColor: colors.slate800 }]}
                        labelStyle={styles.avatarLabel}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{item.name || `${item.firstName} ${item.lastName}`}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.email}</Text>
                      </View>
                      <Surface style={[
                        styles.statusBadge, 
                        styles.standardBadge
                      ]} elevation={0}>
                        <Text variant="labelSmall" style={[
                          styles.statusBadgeText, 
                          styles.standardText
                        ]}>Standard</Text>
                      </Surface>
                    </View>
                    
                    <View style={styles.cardDivider} />
                    
                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <IconButton icon="office-building" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={styles.detailText}>{item.unit || `Room ${item.roomNo}`}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="calendar" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={styles.detailText}>Registered: {item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="food-apple" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                        <Text variant="bodySmall" style={[
                          styles.detailText, 
                          { color: (item.mealType === 'Veggie' || item.meal_type === 'Veggie') ? colors.emerald600 : colors.rose600, fontWeight: 'bold' }
                        ]}>{item.mealType || item.meal_type || 'Non-Veggie'}</Text>
                      </View>
                      {item.mealTicketExpirationDate && (
                        <View style={styles.detailRow}>
                          <IconButton icon="calendar-clock" size={16} iconColor={isExpired(item) ? colors.amber600 : colors.slate400} style={{ margin: 0 }} />
                          <Text variant="bodySmall" style={[styles.detailText, isExpired(item) && { color: colors.amber600, fontWeight: 'bold' }]}>
                            Expires: {new Date(item.mealTicketExpirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      )}
                    </View>
                                      <View style={styles.cardActions}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                          <Switch
                            value={item.canGenerateMealTicket}
                            onValueChange={() => handleToggleAllowance(item.id, item.canGenerateMealTicket)}
                            disabled={togglingId === item.id}
                            color={colors.primary}
                          />
                          <Text variant="labelSmall" style={{ color: item.canGenerateMealTicket ? (isExpired(item) ? colors.amber600 : '#10B981') : colors.slate500, fontWeight: 'bold' }}>
                            {item.canGenerateMealTicket ? (isExpired(item) ? 'ALLOWED (EXPIRED)' : 'ALLOWED') : 'RESTRICTED'}
                          </Text>
                        </View>
                        <IconButton
                          icon="calendar-remove"
                          size={20} 
                          iconColor={isExpired(item) ? colors.amber600 : colors.slate400} 
                          onPress={() => {
                            setExpirationTargetId(item.id);
                            setExpirationDate(item.mealTicketExpirationDate ? item.mealTicketExpirationDate.split('T')[0] : '');
                            setExpirationDays('');
                            setIsExpirationModalVisible(true);
                          }} 
                        />
                        <IconButton icon="chevron-right" size={20} iconColor={colors.slate400} onPress={() => handleViewDetails(item)} />
                      </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
            <View style={{ paddingVertical: 16 }}>
              <DataTable.Pagination
                page={page}
                numberOfPages={Math.ceil(filteredData.length / itemsPerPage)}
                onPageChange={(p) => setPage(p)}
                label={`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, filteredData.length)} of ${filteredData.length}`}
                showFastPaginationControls
              />
            </View>
          </View>
        )}
      </View>

      <Portal>
        <Modal
          visible={isTerminalVisible}
          onDismiss={handleTerminalDone}
          contentContainerStyle={styles.terminalModalContainer}
        >
          <BiometricTerminal 
            registrationId={selectedRenter?.id} 
            onExit={handleTerminalDone} 
          />
        </Modal>

        <Modal
          visible={isDetailsVisible}
          onDismiss={() => setIsDetailsVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title="Renter Details" 
              subtitle="Comprehensive information for authorized personnel."
              right={(props) => {
                const { pointerEvents, ...rest } = props;
                return (
                  <IconButton 
                    {...rest} 
                    style={[rest.style, { pointerEvents }]} 
                    icon="close" 
                    onPress={() => setIsDetailsVisible(false)} 
                  />
                );
              }}
            />
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={{ gap: 24 }}>
                <View style={styles.userInfoLarge}>
                  <Avatar.Text 
                    size={80} 
                    label={viewingRenter?.initials || (viewingRenter?.name ? viewingRenter.name.substring(0, 2).toUpperCase() : '??')} 
                    style={[styles.avatar, { backgroundColor: colors.primary }]}
                    labelStyle={{ fontSize: 32 }}
                  />
                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{viewingRenter?.name || `${viewingRenter?.firstName} ${viewingRenter?.lastName}`}</Text>
                    <Text variant="bodyLarge" style={{ color: colors.slate500 }}>{viewingRenter?.email}</Text>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <Avatar.Icon size={24} icon="card-account-details-outline" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                    <Text variant="titleSmall" style={styles.sectionTitle}>Identification & Unit</Text>
                  </View>
                  <View style={styles.detailRowLarge}>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>UNIT / ROOM</Text>
                      <Text variant="bodyMedium">{viewingRenter?.unit || `Room ${viewingRenter?.roomNo}`}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>IMD ID</Text>
                      <Text variant="bodyMedium">{viewingRenter?.imd || '-'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <Avatar.Icon size={24} icon="phone-outline" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                    <Text variant="titleSmall" style={styles.sectionTitle}>Contact Details</Text>
                  </View>
                  <View style={styles.detailRowLarge}>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>STUDENT PHONE</Text>
                      <Text variant="bodyMedium">{viewingRenter?.studentPhone || viewingRenter?.student_phone || '-'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>PARENT PHONE</Text>
                      <Text variant="bodyMedium">{viewingRenter?.parentPhone || viewingRenter?.parent_phone || '-'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <Avatar.Icon size={24} icon="shield-check-outline" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                    <Text variant="titleSmall" style={styles.sectionTitle}>System Status</Text>
                  </View>
                  <View style={styles.detailRowLarge}>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>BIOMETRICS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="fingerprint" size={16} iconColor={viewingRenter?.hasFingerprint ? colors.emerald500 : colors.slate300} style={{ margin: 0 }} />
                        <Text variant="bodyMedium">{viewingRenter?.hasFingerprint ? 'Enrolled' : 'Not Enrolled'}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>MEAL TICKET</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton 
                          icon={viewingRenter?.canGenerateMealTicket ? "check-circle" : "cancel"} 
                          size={16} 
                          iconColor={viewingRenter?.canGenerateMealTicket ? (isExpired(viewingRenter) ? colors.amber500 : colors.emerald500) : colors.slate300} 
                          style={{ margin: 0 }} 
                        />
                        <Text variant="bodyMedium" style={{ fontWeight: viewingRenter?.canGenerateMealTicket && isExpired(viewingRenter) ? 'bold' : 'normal', color: viewingRenter?.canGenerateMealTicket && isExpired(viewingRenter) ? colors.amber600 : 'inherit' }}>
                          {viewingRenter?.canGenerateMealTicket ? (isExpired(viewingRenter) ? `Allowed (Expired: ${viewingRenter.mealTicketExpirationDate.split('T')[0]})` : 'Allowed') : 'Restricted'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.detailRowLarge, { marginTop: 16 }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.detailLabel}>MEAL TYPE</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton icon="food-apple" size={16} iconColor={(viewingRenter?.mealType === 'Veggie' || viewingRenter?.meal_type === 'Veggie') ? colors.emerald500 : colors.rose500} style={{ margin: 0 }} />
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: (viewingRenter?.mealType === 'Veggie' || viewingRenter?.meal_type === 'Veggie') ? colors.emerald600 : colors.rose600 }}>
                          {viewingRenter?.mealType || viewingRenter?.meal_type || 'Non-Veggie'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <Card.Actions style={styles.modalActions}>
              <Button onPress={() => setIsDetailsVisible(false)} mode="contained" style={{ borderRadius: 10 }}>Close</Button>
            </Card.Actions>
          </Card>
        </Modal>

        <Modal
          visible={isExpirationModalVisible}
          onDismiss={() => setIsExpirationModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { maxWidth: 400 }]}
        >
          <Card style={styles.modalCard}>
            <Card.Title 
              title="Set Meal Ticket Expiration" 
              subtitle="Set an expiration date to disable allowance."
              left={(props) => <Avatar.Icon {...props} icon="calendar-remove" style={{ backgroundColor: colors.amber50 }} color={colors.amber600} />}
            />
            <Card.Content style={{ gap: 16 }}>
              <Text variant="bodyMedium" style={{ color: colors.slate600 }}>
                Choose an exact expiration date or quick select a duration for this renter's meal ticket privileges. Leave blank to remove expiration.
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
                <Button mode={expirationDays === '1' ? 'contained' : 'outlined'} onPress={() => applyDays(1)} style={{ flex: 1, minWidth: 80, borderRadius: 8 }} compact>1 Day</Button>
                <Button mode={expirationDays === '3' ? 'contained' : 'outlined'} onPress={() => applyDays(3)} style={{ flex: 1, minWidth: 80, borderRadius: 8 }} compact>3 Days</Button>
                <Button mode={expirationDays === '7' ? 'contained' : 'outlined'} onPress={() => applyDays(7)} style={{ flex: 1, minWidth: 80, borderRadius: 8 }} compact>7 Days</Button>
                <TextInput
                  label="Custom Days"
                  value={expirationDays}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    applyDays(cleaned);
                  }}
                  mode="outlined"
                  keyboardType="numeric"
                  style={{ flex: 1.5, minWidth: 120, height: 40 }}
                  outlineStyle={{ borderRadius: 8 }}
                  dense
                />
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSmall" style={{ color: colors.slate500, marginBottom: 8, marginLeft: 4, fontWeight: 'bold' }}>EXPIRATION DATE</Text>
                    {React.createElement('input', {
                      type: 'date',
                      value: expirationDate,
                      onChange: (e) => {
                        setExpirationDate(e.target.value);
                        setExpirationDays('');
                      },
                      style: {
                        width: '100%',
                        padding: '14px 16px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '12px',
                        fontSize: '16px',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }
                    })}
                  </View>
                ) : (
                  <TextInput
                    label="Expiration Date"
                    value={expirationDate}
                    onChangeText={(val) => {
                      setExpirationDate(val);
                      setExpirationDays('');
                    }}
                    mode="outlined"
                    placeholder="YYYY-MM-DD"
                    style={{ flex: 1 }}
                    outlineStyle={{ borderRadius: 12 }}
                  />
                )}
              </View>
            </Card.Content>
            <Card.Actions style={styles.modalActions}>
              <Button onPress={() => setIsExpirationModalVisible(false)} mode="text" textColor={colors.slate500}>Cancel</Button>
              <Button onPress={handleExpirationSubmit} mode="contained" buttonColor={colors.amber600} loading={isSavingExpiration} disabled={isSavingExpiration}>Save</Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

export const AccessLogs = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState('table');
  const theme = useTheme();

  const { userRole, isAuthenticated } = usePermissions();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccessLogs();
    }
  }, [isAuthenticated, userRole]);

  const fetchAccessLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/access-logs`, {
        headers: {
          'x-user-role': userRole
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      Alert.alert('Error', 'Failed to fetch access logs from server.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    denied: data.filter(r => r.status === 'Denied').length,
    activeEndpoints: new Set(data.filter(r => r.point).map(r => r.point)).size
  }), [data]);
  
  const filteredData = useMemo(() => {
    return data.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.point && item.point.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, data]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Access Logs</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Real-time monitoring of entry points and security credentials.</Text>
        </View>
        <Button mode="contained" icon="refresh" onPress={fetchAccessLogs} style={styles.addButton} loading={loading} disabled={loading}>
          Refetch Data
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="clock-outline" style={{ backgroundColor: 'rgba(17, 50, 212, 0.1)' }} color={colors.primary} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.total}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Access Requests</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="close-circle-outline" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }} color={colors.rose500} />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.denied}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Denied Attempts</Text>
            </View>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={44} icon="check-circle-outline" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }} color="#10B981" />
            <View style={{ marginLeft: 16 }}>
              <Text variant="headlineSmall" style={styles.statValue}>{stats.activeEndpoints}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Active Endpoints</Text>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.filtersRow}>
        <TextInput
          placeholder="Search access logs..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={colors.slate400} />}
          style={styles.searchBar}
          outlineStyle={{ borderRadius: 12, borderColor: colors.slate200 }}
        />
        <View style={styles.viewToggleGroup}>
          <IconButton 
            icon="view-list" 
            mode={viewType === 'table' ? 'contained' : 'standard'}
            containerColor={viewType === 'table' ? colors.primary : 'transparent'}
            iconColor={viewType === 'table' ? colors.white : colors.slate500}
            onPress={() => setViewType('table')}
            size={20}
          />
          <IconButton 
            icon="view-grid" 
            mode={viewType === 'grid' ? 'contained' : 'standard'}
            containerColor={viewType === 'grid' ? colors.primary : 'transparent'}
            iconColor={viewType === 'grid' ? colors.white : colors.slate500}
            onPress={() => setViewType('grid')}
            size={20}
          />
        </View>
      </View>

      <View style={[viewType === 'grid' && { flex: 1 }]}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 16, color: colors.slate500 }}>Loading access logs...</Text>
          </View>
        ) : viewType === 'table' ? (
          <Card style={styles.tableCard}>
            <Table 
              headers={['Timestamp', 'User', 'Access Point', 'Method', 'Status']}
              columnFlex={[1, 1.2, 1.6, 1.2, 1]}
              data={filteredData}
              renderRow={(item) => (
                <>
                  <DataTable.Cell style={{ flex: 1 }}><Text variant="bodySmall">{item.time}</Text></DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.2 }}>
                    <View style={styles.userInfo}>
                      {item.avatar ? (
                        <Avatar.Image size={32} source={{ uri: item.avatar }} style={styles.avatar} />
                      ) : (
                        <Avatar.Icon size={32} icon="account-off" style={[styles.avatar, { backgroundColor: colors.slate800 }]} color={colors.slate400} />
                      )}
                      <View style={{ marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.dept}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.6 }}><Text variant="bodySmall">{item.point}</Text></DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton icon={item.type === 'Biometric Scan' ? "fingerprint" : "cellphone"} size={14} iconColor={item.type === 'Biometric Scan' ? colors.primary : colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall">{item.type}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <Surface style={[styles.statusBadge, item.status === 'Granted' ? styles.approvedBadge : styles.rejectedBadge]} elevation={0}>
                      <Text variant="labelSmall" style={[styles.statusBadgeText, item.status === 'Granted' ? styles.approvedText : styles.rejectedText]}>{item.status}</Text>
                    </Surface>
                  </DataTable.Cell>
                </>
              )}
            />
          </Card>
        ) : (
          <View style={styles.cardGrid}>
            {filteredData.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    {item.avatar ? (
                      <Avatar.Image size={40} source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                      <Avatar.Icon size={40} icon="account-off" style={[styles.avatar, { backgroundColor: colors.slate800 }]} color={colors.slate400} />
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.dept}</Text>
                    </View>
                    <Surface style={[styles.statusBadge, item.status === 'Granted' ? styles.approvedBadge : styles.rejectedBadge]} elevation={0}>
                      <Text variant="labelSmall" style={[styles.statusBadgeText, item.status === 'Granted' ? styles.approvedText : styles.rejectedText]}>{item.status}</Text>
                    </Surface>
                  </View>
                  
                  <View style={styles.cardDivider} />
                  
                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <IconButton icon="map-marker" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall" style={styles.detailText}>{item.point}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconButton icon={item.type === 'Biometric Scan' ? "fingerprint" : "cellphone"} size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall" style={styles.detailText}>{item.type}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconButton icon="clock-outline" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall" style={styles.detailText}>{item.time}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
        {!loading && filteredData.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ color: colors.slate400 }}>No access logs found matching your criteria.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const AuditLogs = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState('table');
  const [isExporting, setIsExporting] = useState(false);
  const theme = useTheme();

  const { userRole, isAuthenticated } = usePermissions();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAuditLogs();
    }
  }, [isAuthenticated, userRole]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/audit-logs`, {
        headers: {
          'x-user-role': userRole
        }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      Alert.alert('Error', 'Failed to fetch audit logs from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (data.length === 0) {
      showSnackbar('There are no audit logs to export.', 'info');
      return;
    }
    setIsExporting(true);

    const reportId = `AL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const generatedAt = new Date().toLocaleString();
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px; }
            .branding h1 { margin: 0; font-size: 24px; color: #ef4444; font-weight: 800; }
            .metadata { text-align: right; font-size: 11px; color: #64748b; }
            .classification { display: inline-block; padding: 3px 10px; background: #fef2f2; border-radius: 4px; font-size: 10px; font-weight: 800; margin-bottom: 15px; color: #ef4444; border: 1px solid #fee2e2; }
            .section-title { font-size: 15px; font-weight: 800; margin: 25px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .status-success { color: #10b981; font-weight: 700; }
            .status-fail { color: #ef4444; font-weight: 700; }
            .timestamp { color: #64748b; font-size: 9px; }
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="branding"><h1>ServeQueue</h1><p style="margin:0;font-size:12px;color:#64748b;">Enterprise Security Audit</p></div>
            <div class="metadata">REPORT_ID: ${reportId}<br>GENERATED: ${generatedAt}</div>
          </div>
          <div class="classification">OFFICIAL SYSTEM AUDIT TRAIL</div>
          
          <div class="section-title">ADMINISTRATIVE ACTION LOG</div>
          <table>
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ADMINISTRATOR</th>
                <th>ACTION TYPE</th>
                <th>DETAILS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td class="timestamp">${item.date}<br>${item.time}</td>
                  <td><strong>${item.admin}</strong><br><span style="color:#64748b;font-size:9px;">ID: ${item.adminId}</span></td>
                  <td>${item.type}</td>
                  <td>
                    <div style="font-weight:600;">${item.details}</div>
                    <div style="color:#64748b;font-size:9px;">${item.subDetails}</div>
                  </td>
                  <td class="${item.status === 'Success' ? 'status-success' : 'status-fail'}">${item.status.toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated by SecureAccess System Administrator Console<br>
            © ${currentYear} BHAGOH PROJECT - Renter Systems. All rights reserved.
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => { printWindow.print(); }, 500);
        }
      } else {
        await Print.printAsync({ html });
      }
      showSnackbar('Audit report generated.', 'success');
    } catch (error) {
      console.error('Error exporting audit log:', error);
      showSnackbar('Failed to generate PDF report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item =>
      (item.admin && item.admin.toLowerCase().includes(search.toLowerCase())) ||
      (item.details && item.details.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, data]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Audit Logs</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Comprehensive trail of administrative actions.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="outlined" icon="refresh" onPress={fetchAuditLogs} loading={loading} disabled={loading} style={{ borderColor: colors.slate200 }}>
            Refresh
          </Button>
          <Button mode="contained" icon="database-download" onPress={handleDownloadReport} loading={isExporting} disabled={isExporting} style={styles.addButton}>
            Download Report
          </Button>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <TextInput
          placeholder="Search audit trail..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={colors.slate400} />}
          style={styles.searchBar}
          outlineStyle={{ borderRadius: 12, borderColor: colors.slate200 }}
        />
        <View style={styles.viewToggleGroup}>
          <IconButton 
            icon="view-list" 
            mode={viewType === 'table' ? 'contained' : 'standard'}
            containerColor={viewType === 'table' ? colors.primary : 'transparent'}
            iconColor={viewType === 'table' ? colors.white : colors.slate500}
            onPress={() => setViewType('table')}
            size={20}
          />
          <IconButton 
            icon="view-grid" 
            mode={viewType === 'grid' ? 'contained' : 'standard'}
            containerColor={viewType === 'grid' ? colors.primary : 'transparent'}
            iconColor={viewType === 'grid' ? colors.white : colors.slate500}
            onPress={() => setViewType('grid')}
            size={20}
          />
        </View>
      </View>

      <View style={[viewType === 'grid' && { flex: 1 }]}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 16, color: colors.slate500 }}>Loading audit logs...</Text>
          </View>
        ) : viewType === 'table' ? (
          <Card style={styles.tableCard}>
            <Table 
              headers={['Administrator', 'Action Type', 'Details', 'Timestamp', 'Status']}
              columnFlex={[1.2, 1.2, 1.6, 1, 1]}
              data={filteredData}
              renderRow={(item) => (
                <>
                  <DataTable.Cell style={{ flex: 1.2 }}>
                    <View style={styles.userInfo}>
                      <Avatar.Text size={32} label={item.initials} style={[styles.avatar, { backgroundColor: colors.slate800 }]} labelStyle={styles.avatarLabel} />
                      <View style={{ marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.admin}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.adminId}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.2 }}><Text variant="bodySmall">{item.type}</Text></DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1.6 }}>
                    <View>
                      <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{item.details}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.subDetails}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <View>
                      <Text variant="bodySmall">{item.time}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.date}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 1 }}>
                    <Surface style={[styles.statusBadge, item.status === 'Success' ? styles.approvedBadge : styles.rejectedBadge]} elevation={0}>
                      <Text variant="labelSmall" style={[styles.statusBadgeText, item.status === 'Success' ? styles.approvedText : styles.rejectedText]}>{item.status}</Text>
                    </Surface>
                  </DataTable.Cell>
                </>
              )}
            />
          </Card>
        ) : (
          <View style={styles.cardGrid}>
            {filteredData.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Avatar.Text size={40} label={item.initials} style={[styles.avatar, { backgroundColor: colors.slate800 }]} labelStyle={styles.avatarLabel} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{item.admin}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.adminId}</Text>
                    </View>
                    <Surface style={[styles.statusBadge, item.status === 'Success' ? styles.approvedBadge : styles.rejectedBadge]} elevation={0}>
                      <Text variant="labelSmall" style={[styles.statusBadgeText, item.status === 'Success' ? styles.approvedText : styles.rejectedText]}>{item.status}</Text>
                    </Surface>
                  </View>
                  
                  <View style={styles.cardDivider} />
                  
                  <View style={styles.cardDetails}>
                    <Text variant="labelMedium" style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}>{item.type}</Text>
                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{item.details}</Text>
                    <Text variant="bodySmall" style={{ color: colors.slate500, marginBottom: 8 }}>{item.subDetails}</Text>
                    <View style={styles.detailRow}>
                      <IconButton icon="calendar-clock" size={16} iconColor={colors.slate400} style={{ margin: 0 }} />
                      <Text variant="bodySmall" style={styles.detailText}>{item.date} at {item.time}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
        {!loading && filteredData.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ color: colors.slate400 }}>No audit logs found matching your criteria.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const Permissions = () => {
  const [viewType, setViewType] = useState('table');
  const theme = useTheme();

  const permissionList = Object.keys(PERMISSIONS);
  const roleList = Object.values(ROLES);

  const permissionData = permissionList.map(permKey => {
    const permission = PERMISSIONS[permKey];
    const row = { permission: permission.replace(/_/g, ' ').toUpperCase(), id: permKey };
    roleList.forEach(role => {
      row[role] = ROLE_PERMISSIONS[role].includes(permission);
    });
    return row;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Role Permissions</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Matrix of system capabilities assigned to each user role.</Text>
        </View>
        <View style={styles.viewToggleGroup}>
          <IconButton 
            icon="view-list" 
            mode={viewType === 'table' ? 'contained' : 'standard'}
            containerColor={viewType === 'table' ? colors.primary : 'transparent'}
            iconColor={viewType === 'table' ? colors.white : colors.slate500}
            onPress={() => setViewType('table')}
            size={20}
          />
          <IconButton 
            icon="view-grid" 
            mode={viewType === 'grid' ? 'contained' : 'standard'}
            containerColor={viewType === 'grid' ? colors.primary : 'transparent'}
            iconColor={viewType === 'grid' ? colors.white : colors.slate500}
            onPress={() => setViewType('grid')}
            size={20}
          />
        </View>
      </View>

      <Card style={styles.tableCard}>
        {viewType === 'table' ? (
          <Table 
            headers={['Permission', ...roleList]}
            columnFlex={[1.5, 1, 1, 1, 1]}
            data={permissionData}
            renderRow={(item) => (
              <>
                <DataTable.Cell style={{ flex: 1.5 }}>
                  <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>{item.permission}</Text>
                </DataTable.Cell>
                {roleList.map(role => (
                  <DataTable.Cell key={role} style={{ flex: 1, justifyContent: 'center' }}>
                    <IconButton 
                      icon={item[role] ? "check-circle" : "close-circle-outline"} 
                      iconColor={item[role] ? colors.emerald500 : colors.slate200} 
                      size={20}
                    />
                  </DataTable.Cell>
                ))}
              </>
            )}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', padding: 8, gap: 16 }}>
              {roleList.map(role => (
                <Card key={role} style={[styles.itemCard, { width: 300 }]}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Avatar.Icon size={40} icon="security" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{role}</Text>
                        <Text variant="bodySmall" style={{ color: colors.slate500 }}>
                          {ROLE_PERMISSIONS[role].length} Permissions
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={{ gap: 8 }}>
                      {permissionList.map(permKey => {
                        const hasPerm = ROLE_PERMISSIONS[role].includes(PERMISSIONS[permKey]);
                        return (
                          <View key={permKey} style={{ flexDirection: 'row', alignItems: 'center', opacity: hasPerm ? 1 : 0.4 }}>
                            <IconButton 
                              icon={hasPerm ? "check-circle" : "close-circle-outline"} 
                              iconColor={hasPerm ? colors.emerald500 : colors.slate300} 
                              size={16}
                              style={{ margin: 0 }}
                            />
                            <Text variant="bodySmall" style={{ 
                              color: hasPerm ? colors.slate700 : colors.slate400,
                              textDecorationLine: hasPerm ? 'none' : 'line-through'
                            }}>
                              {PERMISSIONS[permKey].replace(/_/g, ' ').toUpperCase()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </View>
  );
};

// --- Meal-window time helpers (12h display, tolerant of 24h input) ---
const parseTimeToMinutes = (token) => {
  if (!token) return null;
  const m = String(token).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (min > 59) return null;
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = ap === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
};

const minutesTo12h = (mins) => {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h24 < 12 ? 'AM' : 'PM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

// Normalize "05:00-10:00" or "5:00 AM-10:00 AM" -> "5:00 AM-10:00 AM"; null if invalid.
const normalizeRangeTo12h = (value) => {
  if (!value) return null;
  const parts = String(value).split('-');
  if (parts.length !== 2) return null;
  const a = parseTimeToMinutes(parts[0]);
  const b = parseTimeToMinutes(parts[1]);
  if (a == null || b == null) return null;
  return `${minutesTo12h(a)}-${minutesTo12h(b)}`;
};

export const Configuration = () => {
  const theme = useTheme();

  const { userRole } = usePermissions();
  const { showSnackbar } = useSnackbar();
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isBridgeTesting, setIsBridgeTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hardwarePrinters, setHardwarePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [printerMenuVisible, setPrinterMenuVisible] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  // Push notification (Expo) configuration
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushNotificationTitle, setPushNotificationTitle] = useState('Meal Ticket Used');
  const [pushNotificationBody, setPushNotificationBody] = useState('Hi! {name} used their {mealType} meal ticket at {time}.');
  const [notifyParentEnabled, setNotifyParentEnabled] = useState(true);
  const [notifyStudentEnabled, setNotifyStudentEnabled] = useState(true);
  const [isSavingNotify, setIsSavingNotify] = useState(false);
  const [isFetchingSettings, setIsFetchingSettings] = useState(false);
  // Meal service settings
  const [mealRestrictionEnabled, setMealRestrictionEnabled] = useState(false);
  const [mealWindowBreakfast, setMealWindowBreakfast] = useState('5:00 AM-10:00 AM');
  const [mealWindowLunch, setMealWindowLunch] = useState('11:00 AM-2:00 PM');
  const [mealWindowDinner, setMealWindowDinner] = useState('5:00 PM-9:00 PM');
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedUrl = localStorage.getItem('BACKEND_URL');
      setBackendUrl(savedUrl || 'https://rentersystem-production.up.railway.app/api');
      const savedKey = localStorage.getItem('API_KEY');
      if (savedKey) setApiKey(savedKey);
      const savedBridge = localStorage.getItem('BRIDGE_URL');
      // Force IPv4 loopback: "localhost" can resolve to IPv6 (::1) in Electron and
      // fail, since the bridge only listens on 127.0.0.1.
      setBridgeUrl((savedBridge || 'http://127.0.0.1:5003').replace(/\/\/localhost(:|\/|$)/i, '//127.0.0.1$1'));
      const savedPrinter = localStorage.getItem('SELECTED_PRINTER');
      if (savedPrinter) setSelectedPrinter(savedPrinter);
    }
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setIsFetchingSettings(true);
      const response = await axios.get(`${API_BASE_URL}/system/settings`);
      if (response.data) {
        const s = response.data;
        if (s.push_notification_title) setPushNotificationTitle(s.push_notification_title);
        if (s.push_notification_body) setPushNotificationBody(s.push_notification_body);
        // Default ON unless explicitly 'false'
        setPushEnabled(s.push_enabled !== 'false');
        setNotifyParentEnabled(s.notify_parent_enabled !== 'false');
        setNotifyStudentEnabled(s.notify_student_enabled !== 'false');
        setMealRestrictionEnabled(s.meal_restriction_enabled === 'true');
        if (s.meal_window_breakfast) setMealWindowBreakfast(normalizeRangeTo12h(s.meal_window_breakfast) || s.meal_window_breakfast);
        if (s.meal_window_lunch) setMealWindowLunch(normalizeRangeTo12h(s.meal_window_lunch) || s.meal_window_lunch);
        if (s.meal_window_dinner) setMealWindowDinner(normalizeRangeTo12h(s.meal_window_dinner) || s.meal_window_dinner);
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setIsFetchingSettings(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      setIsSavingNotify(true);
      const updates = [
        { key: 'push_enabled', value: pushEnabled ? 'true' : 'false' },
        { key: 'push_notification_title', value: pushNotificationTitle },
        { key: 'push_notification_body', value: pushNotificationBody },
        { key: 'notify_parent_enabled', value: notifyParentEnabled ? 'true' : 'false' },
        { key: 'notify_student_enabled', value: notifyStudentEnabled ? 'true' : 'false' }
      ];
      for (const u of updates) {
        await axios.post(`${API_BASE_URL}/system/settings`, u);
      }
      showSnackbar('Notification settings saved.', 'success');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      showSnackbar('Could not update notification settings.', 'error');
    } finally {
      setIsSavingNotify(false);
    }
  };

  const handleSaveMealSettings = async () => {
    // Validate + normalize to 12h "h:MM AM/PM-h:MM AM/PM"
    const bf = normalizeRangeTo12h(mealWindowBreakfast);
    const ln = normalizeRangeTo12h(mealWindowLunch);
    const dn = normalizeRangeTo12h(mealWindowDinner);
    if (!bf || !ln || !dn) {
      showSnackbar('Use 12h format like "5:00 AM-10:00 AM".', 'error');
      return;
    }
    // Reflect the normalized values back into the inputs
    setMealWindowBreakfast(bf);
    setMealWindowLunch(ln);
    setMealWindowDinner(dn);
    try {
      setIsSavingMeal(true);
      const updates = [
        { key: 'meal_restriction_enabled', value: mealRestrictionEnabled ? 'true' : 'false' },
        { key: 'meal_window_breakfast', value: bf },
        { key: 'meal_window_lunch', value: ln },
        { key: 'meal_window_dinner', value: dn }
      ];
      for (const u of updates) {
        await axios.post(`${API_BASE_URL}/system/settings`, u);
      }
      showSnackbar('Meal service settings saved.', 'success');
    } catch (error) {
      console.error('Failed to save meal settings:', error);
      showSnackbar('Could not update meal service settings.', 'error');
    } finally {
      setIsSavingMeal(false);
    }
  };

  const handleSaveConfig = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('BACKEND_URL', backendUrl);
      // Normalize localhost -> 127.0.0.1 so the bridge stays reachable in Electron.
      localStorage.setItem('BRIDGE_URL', (bridgeUrl || '').replace(/\/\/localhost(:|\/|$)/i, '//127.0.0.1$1'));
      if (apiKey && apiKey.trim().length > 0) {
        localStorage.setItem('API_KEY', apiKey.trim());
      } else {
        localStorage.removeItem('API_KEY');
      }
      showSnackbar('Network settings saved. Restart the app to apply everywhere.', 'success');
    }
  };

  const handleTestBridgeConnection = async () => {
    setIsBridgeTesting(true);
    try {
      const response = await axios.get(`${bridgeUrl}/health`, { timeout: 5000 });
      if (response.status === 200) {
        const { HardwareReady, ReaderCount } = response.data;
        showSnackbar(`Bridge connected. Hardware: ${HardwareReady ? 'Ready' : 'Not ready'}, Readers: ${ReaderCount ?? 'N/A'}.`, 'success');
      } else {
        throw new Error(`Bridge returned status: ${response.status}`);
      }
    } catch (error) {
      showSnackbar(`Bridge unreachable at ${bridgeUrl}.`, 'error');
    } finally {
      setIsBridgeTesting(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const rootUrl = backendUrl.split('/api')[0];
      const response = await axios.get(`${rootUrl}/health`, { timeout: 5000 });
      if (response.status === 200) {
        showSnackbar('Connected to the backend server.', 'success');
      } else {
        throw new Error(`Server returned status: ${response.status}`);
      }
    } catch (error) {
      showSnackbar(`Could not reach the backend. ${error.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveHardware = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('SELECTED_PRINTER', selectedPrinter);
      showSnackbar(`Printer saved: ${selectedPrinter || 'None (Default)'}.`, 'success');
    }
  };

  const handleScanPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const response = await axios.get(`${bridgeUrl}/status`, { timeout: 3000 });
      let printersData = response.data?.printers || response.data?.Printers;
      if (printersData) {
        let printers = printersData;
        if (typeof printers === 'string') {
          printers = printers.split(',').map(p => p.trim()).filter(p => p && p !== 'UnknownPrinter');
        }
        if (Array.isArray(printers)) {
          setHardwarePrinters(printers);
          if (printers.length > 0 && !selectedPrinter) {
             setSelectedPrinter(printers[0]);
          }
          showSnackbar(`Scan complete. Found ${printers.length} printer(s).`, 'success');
        }
      } else {
        showSnackbar('Scan complete. No printers found.', 'info');
      }
    } catch (error) {
      showSnackbar(`Could not reach the Biometric Bridge at ${bridgeUrl}.`, 'error');
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/registrations/bulk`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-role': userRole
        }
      });
      
      const successCount = response.data.success?.length || 0;
      const errorCount = response.data.errors?.length || 0;

      showSnackbar(`Import done: ${successCount} imported, ${errorCount} skipped.`, errorCount > 0 ? 'info' : 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      showSnackbar('Upload failed. Check the Excel file format.', 'error');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFilePicker = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      Alert.alert('Not Supported', 'Bulk upload is currently only supported on the Web/Desktop version.');
    }
  };

  const handleDownloadTemplate = () => {
    if (Platform.OS === 'web') {
      const headers = ['First Name', 'Last Name', 'Email', 'Student Phone', 'Parent Phone', 'Room No', 'Floor No', 'IMD', 'Meal Type'];
      const sampleRow = ['John', 'Doe', 'john.doe@example.com', '09123456789', '09987654321', '101', '1', 'IMD-12345', 'Non-Veggie'];
      const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'Renter_Bulk_Upload_Template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Not Supported', 'Template download is currently only supported on the Web/Desktop version.');
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await axios.post(`${API_BASE_URL}/system/reset`);
      setResetDialogVisible(false);
      showSnackbar('System reset. All transaction and registration data cleared.', 'success');
    } catch (error) {
      showSnackbar(`Reset failed: ${error.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleBackupSQL = () => {
    if (Platform.OS === 'web') {
      window.open(`${API_BASE_URL}/system/backup/sql`, '_blank');
    } else {
      Alert.alert('Not Supported', 'SQL backup is currently only supported on the Web/Desktop version.');
    }
  };

  const handleBackupExcel = () => {
    if (Platform.OS === 'web') {
      window.open(`${API_BASE_URL}/system/backup/excel`, '_blank');
    } else {
      Alert.alert('Not Supported', 'Excel backup is currently only supported on the Web/Desktop version.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>System Configuration</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Fine-tune security protocols and global application settings.</Text>
        </View>
        <Button mode="contained" icon="cpu" onPress={() => {}} style={styles.addButton}>
          Export Config
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Network Configuration Section */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title 
            title="Network Configuration" 
            subtitle="Configure backend and biometric bridge connectivity for all terminal nodes"
            left={(props) => <Avatar.Icon {...props} icon="lan" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 20 }}>

              {/* Backend Server URL */}
              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Backend Server URL</Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TextInput
                    value={backendUrl}
                    onChangeText={setBackendUrl}
                    mode="outlined"
                    placeholder="http://192.168.1.100:5005/api"
                    outlineStyle={{ borderRadius: 12 }}
                    left={<TextInput.Icon icon="server-network" color={colors.slate400} />}
                    style={{ backgroundColor: colors.white, flex: 1 }}
                  />
                  <Button
                    mode="outlined"
                    icon="connection"
                    onPress={handleTestConnection}
                    loading={isTesting}
                    disabled={isTesting}
                    style={{ borderRadius: 12, borderColor: colors.slate200 }}
                  >
                    Test
                  </Button>
                </View>
                <Text variant="bodySmall" style={{ color: colors.slate500, marginTop: 4 }}>
                  Central server IP for all terminals. For LAN deployments, use the main server's IP (e.g. http://192.168.1.100:5005/api).
                  For cloud, use the Railway URL (e.g. https://rentersystem-production.up.railway.app/api).
                </Text>
              </View>

              <Divider />

              {/* Backend API Key (required for cloud/public deployments) */}
              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Backend API Key</Text>
                <TextInput
                  value={apiKey}
                  onChangeText={setApiKey}
                  mode="outlined"
                  placeholder="Required when the backend is on the cloud (Railway)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  outlineStyle={{ borderRadius: 12 }}
                  left={<TextInput.Icon icon="key-variant" color={colors.slate400} />}
                  style={{ backgroundColor: colors.white }}
                />
                <Text variant="bodySmall" style={{ color: colors.slate500, marginTop: 4 }}>
                  The backend's API_KEY. Sent as the x-api-key header. Leave blank for local LAN deployments (auth is off there).
                </Text>
              </View>

              <Divider />

              {/* Biometric Bridge URL */}
              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Biometric Bridge URL (Local to this Terminal)</Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TextInput
                    value={bridgeUrl}
                    onChangeText={setBridgeUrl}
                    mode="outlined"
                    placeholder="http://localhost:5003"
                    outlineStyle={{ borderRadius: 12 }}
                    left={<TextInput.Icon icon="usb" color={colors.slate400} />}
                    style={{ backgroundColor: colors.white, flex: 1 }}
                  />
                  <Button
                    mode="outlined"
                    icon="fingerprint"
                    onPress={handleTestBridgeConnection}
                    loading={isBridgeTesting}
                    disabled={isBridgeTesting}
                    style={{ borderRadius: 12, borderColor: colors.slate200 }}
                  >
                    Test
                  </Button>
                </View>
                <Text variant="bodySmall" style={{ color: colors.slate500, marginTop: 4 }}>
                  The .NET Biometric Bridge running locally on this terminal. Should always point to localhost unless advanced configuration is needed.
                </Text>
              </View>

              <View style={{ backgroundColor: colors.indigo50, borderRadius: 12, padding: 12 }}>
                <Text variant="labelSmall" style={{ color: colors.primary, fontWeight: '800', marginBottom: 4 }}>DISTRIBUTED TERMINAL SETUP</Text>
                <Text variant="bodySmall" style={{ color: colors.slate600 }}>
                  For multi-terminal deployments: set Backend Server URL to the central server IP on each terminal node, while keeping the Bridge URL as localhost. The biometric hardware is local; all data is centralized.
                </Text>
              </View>

              <Button 
                mode="contained" 
                icon="content-save" 
                onPress={handleSaveConfig}
                style={[styles.addButton]}
              >
                Save All Network Settings
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Hardware Configuration Section */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title 
            title="Hardware Configuration" 
            subtitle="Configure connected peripherals like POS Printers"
            left={(props) => <Avatar.Icon {...props} icon="printer-pos" style={{ backgroundColor: colors.slate50 }} color={colors.slate700} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 16 }}>
              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Selected Meal Ticket Printer</Text>
                
                <Menu
                  visible={printerMenuVisible}
                  onDismiss={() => setPrinterMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setPrinterMenuVisible(true)}
                      style={{ borderRadius: 12, borderColor: colors.slate200, justifyContent: 'flex-start' }}
                      icon="printer"
                      contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 4 }}
                      labelStyle={{ flex: 1, textAlign: 'left', color: selectedPrinter ? colors.slate800 : colors.slate400 }}
                    >
                      {selectedPrinter || 'Select a printer'}
                    </Button>
                  }
                >
                  <Menu.Item onPress={() => { setSelectedPrinter(''); setPrinterMenuVisible(false); }} title="None (Default)" />
                  {hardwarePrinters.map((p, idx) => (
                    <Menu.Item key={idx} onPress={() => { setSelectedPrinter(p); setPrinterMenuVisible(false); }} title={p} />
                  ))}
                </Menu>

                <Text variant="bodySmall" style={{ color: colors.slate500, marginTop: 4 }}>
                  Ensure the printer is connected and the Biometric Bridge is running.
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Button 
                  mode="contained" 
                  icon="content-save" 
                  onPress={handleSaveHardware}
                  style={[styles.addButton, { flex: 1 }]}
                  buttonColor={colors.slate700}
                >
                  Save Hardware Settings
                </Button>
                <Button 
                  mode="outlined" 
                  icon="line-scan" 
                  onPress={handleScanPrinters}
                  loading={isScanningPrinters}
                  disabled={isScanningPrinters}
                  style={{ borderRadius: 12, flex: 0.8, borderColor: colors.slate200 }}
                  textColor={colors.slate700}
                >
                  Scan Printers
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
 
        {/* Push Notification Configuration */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title
            title="Push Notifications"
            subtitle="Alerts sent to the RenterNotify mobile app"
            left={(props) => <Avatar.Icon {...props} icon="bell-ring" style={{ backgroundColor: colors.emerald50 }} color={colors.emerald600} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 16 }}>
              {/* Master enable */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.slate700 }}>Enable Push Notifications</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate500 }}>
                    When on, biometric scans and manual tickets push to registered devices.
                  </Text>
                </View>
                <Switch value={pushEnabled} onValueChange={setPushEnabled} color={colors.emerald600} />
              </View>

              <Divider />

              {/* Recipient toggles */}
              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Recipients</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.slate700 }}>Notify Parent</Text>
                    <Text variant="bodySmall" style={{ color: colors.slate500 }}>Send to the parent's registered device.</Text>
                  </View>
                  <Switch value={notifyParentEnabled} onValueChange={setNotifyParentEnabled} color={colors.emerald600} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.slate700 }}>Notify Student</Text>
                    <Text variant="bodySmall" style={{ color: colors.slate500 }}>Send to the student's own device.</Text>
                  </View>
                  <Switch value={notifyStudentEnabled} onValueChange={setNotifyStudentEnabled} color={colors.emerald600} />
                </View>
              </View>

              <Divider />

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Notification Title</Text>
                <TextInput
                  value={pushNotificationTitle}
                  onChangeText={setPushNotificationTitle}
                  mode="outlined"
                  placeholder="e.g. Meal Ticket Used"
                  outlineStyle={{ borderRadius: 12 }}
                  style={{ backgroundColor: colors.white }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Notification Message</Text>
                <TextInput
                  value={pushNotificationBody}
                  onChangeText={setPushNotificationBody}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  placeholder="Enter the notification body..."
                  outlineStyle={{ borderRadius: 12 }}
                  style={{ backgroundColor: colors.white }}
                />
                <View style={{ backgroundColor: colors.slate50, borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <Text variant="labelSmall" style={{ color: colors.slate700, fontWeight: '800', marginBottom: 4 }}>AVAILABLE PLACEHOLDERS</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate600 }}>
                    <Text style={{ fontWeight: 'bold' }}>{'{name}'}</Text> - Renter's Full Name{'\n'}
                    <Text style={{ fontWeight: 'bold' }}>{'{mealType}'}</Text> - Assigned Meal (e.g. Veggie){'\n'}
                    <Text style={{ fontWeight: 'bold' }}>{'{time}'}</Text> - Time of the scan
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                icon="bell-check"
                onPress={handleSaveNotificationSettings}
                loading={isSavingNotify}
                disabled={isSavingNotify || isFetchingSettings}
                style={[styles.addButton, { backgroundColor: colors.emerald600 }]}
              >
                Save Notification Settings
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Meal Service Configuration */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title
            title="Meal Service Rules"
            subtitle="Control meal-ticket limits and meal time windows"
            left={(props) => <Avatar.Icon {...props} icon="food-fork-drink" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)' }} color={colors.amber600} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.slate700 }}>Limit 1 meal per student</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate500 }}>
                    When on, each student may claim only one Breakfast, one Lunch, and one Dinner per day.
                  </Text>
                </View>
                <Switch value={mealRestrictionEnabled} onValueChange={setMealRestrictionEnabled} color={colors.amber600} />
              </View>

              <Divider />

              <View style={styles.inputGroup}>
                <Text variant="labelMedium" style={styles.inputLabel}>Meal Time Windows (12h, e.g. 5:00 AM-10:00 AM)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <Text variant="bodyMedium" style={{ width: 80, color: colors.slate600, fontWeight: '700' }}>Breakfast</Text>
                  <TextInput
                    value={mealWindowBreakfast}
                    onChangeText={setMealWindowBreakfast}
                    mode="outlined"
                    placeholder="5:00 AM-10:00 AM"
                    outlineStyle={{ borderRadius: 12 }}
                    style={{ backgroundColor: colors.white, flex: 1 }}
                    dense
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <Text variant="bodyMedium" style={{ width: 80, color: colors.slate600, fontWeight: '700' }}>Lunch</Text>
                  <TextInput
                    value={mealWindowLunch}
                    onChangeText={setMealWindowLunch}
                    mode="outlined"
                    placeholder="11:00 AM-2:00 PM"
                    outlineStyle={{ borderRadius: 12 }}
                    style={{ backgroundColor: colors.white, flex: 1 }}
                    dense
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <Text variant="bodyMedium" style={{ width: 80, color: colors.slate600, fontWeight: '700' }}>Dinner</Text>
                  <TextInput
                    value={mealWindowDinner}
                    onChangeText={setMealWindowDinner}
                    mode="outlined"
                    placeholder="5:00 PM-9:00 PM"
                    outlineStyle={{ borderRadius: 12 }}
                    style={{ backgroundColor: colors.white, flex: 1 }}
                    dense
                  />
                </View>
                <Text variant="bodySmall" style={{ color: colors.slate500, marginTop: 8 }}>
                  These windows define which meal a scan counts toward, used by both the 1-meal limit and the meal reports.
                </Text>
              </View>

              <Button
                mode="contained"
                icon="content-save-check"
                onPress={handleSaveMealSettings}
                loading={isSavingMeal}
                disabled={isSavingMeal || isFetchingSettings}
                style={[styles.addButton, { backgroundColor: colors.amber600 }]}
              >
                Save Meal Settings
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Bulk Data Upload Section */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title 
            title="Bulk Data Management" 
            subtitle="Import large volumes of renter data using Excel files"
            left={(props) => <Avatar.Icon {...props} icon="file-excel" style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }} color={colors.emerald600} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 20 }}>
              <View style={styles.placeholder}>
                <Avatar.Icon size={48} icon="upload-outline" style={{ backgroundColor: 'transparent' }} color={colors.slate300} />
                <Text variant="bodyMedium" style={{ color: colors.slate600, fontWeight: 'bold', marginTop: 12 }}>
                  Excel Data Import (Registrations)
                </Text>
                <Text variant="bodySmall" style={{ color: colors.slate400, textAlign: 'center', maxWidth: 400, marginTop: 4 }}>
                  Upload a .xlsx or .xls file. Headers should include: firstName, lastName, email, roomNo, floorNo, imd, mealType.
                </Text>
                
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".xlsx, .xls"
                    onChange={handleFileSelect}
                  />
                )}

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, justifyContent: 'center' }}>
                  <Button 
                    mode="contained" 
                    icon="file-upload" 
                    onPress={triggerFilePicker}
                    loading={uploading}
                    disabled={uploading}
                    style={{ borderRadius: 12, paddingHorizontal: 16 }}
                    buttonColor={colors.emerald600}
                  >
                    {uploading ? 'Processing File...' : 'Select Excel File'}
                  </Button>
                  
                  <Button 
                    mode="outlined" 
                    icon="download" 
                    onPress={handleDownloadTemplate}
                    style={{ borderRadius: 12, paddingHorizontal: 16, borderColor: colors.emerald600 }}
                    textColor={colors.emerald600}
                  >
                    Download Template
                  </Button>
                </View>
              </View>

              <View style={{ backgroundColor: colors.slate50, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.slate200 }}>
                <Text variant="labelSmall" style={{ color: colors.slate500, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>
                  Import Guidelines
                </Text>
                <View style={{ gap: 4 }}>
                  <Text variant="bodySmall" style={{ color: colors.slate600 }}>• First Name, Last Name, and Email are mandatory fields.</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate600 }}>• Room No and Floor No will be used for accommodation details.</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate600 }}>• Meal Type defaults to "Non-Veggie" if not specified.</Text>
                  <Text variant="bodySmall" style={{ color: colors.slate600 }}>• All imported records will be automatically marked as "Approved".</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Data Maintenance Section */}
        <Card style={[styles.tableCard, { marginBottom: 24 }]}>
          <Card.Title 
            title="Data Maintenance" 
            subtitle="Manage database backups and system reset operations"
            left={(props) => <Avatar.Icon {...props} icon="database-cog" style={{ backgroundColor: "rgba(244, 63, 94, 0.08)" }} color={colors.rose600} />}
          />
          <Card.Content style={{ paddingTop: 8 }}>
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button 
                  mode="outlined" 
                  icon="database-export" 
                  onPress={handleBackupSQL}
                  style={{ flex: 1, borderRadius: 12, borderColor: colors.slate200 }}
                  textColor={colors.slate700}
                >
                  Backup to SQL
                </Button>
                <Button 
                  mode="outlined" 
                  icon="file-excel-outline" 
                  onPress={handleBackupExcel}
                  style={{ flex: 1, borderRadius: 12, borderColor: colors.slate200 }}
                  textColor={colors.emerald600}
                >
                  Backup to Excel
                </Button>
              </View>

              <Divider />

              <View style={{ backgroundColor: "rgba(244, 63, 94, 0.05)", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(244, 63, 94, 0.1)" }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <IconButton icon="alert-circle" iconColor={colors.rose600} size={20} style={{ margin: 0 }} />
                  <Text variant="labelMedium" style={{ color: colors.rose600, fontWeight: '800', marginLeft: 4 }}>DANGER ZONE</Text>
                </View>
                <Text variant="bodySmall" style={{ color: colors.slate600, marginBottom: 12 }}>
                  Resetting the system will permanently delete all registrations, meal tickets, and logs. This action cannot be undone. User accounts will be preserved.
                </Text>
                <Button 
                  mode="contained" 
                  icon="delete-forever" 
                  onPress={() => setResetDialogVisible(true)}
                  style={{ borderRadius: 12 }}
                  buttonColor={colors.rose600}
                >
                  Reset All System Data
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Portal>
          <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)} style={{ borderRadius: 24, backgroundColor: 'white' }}>
            <Dialog.Title style={{ color: colors.rose600, fontWeight: '900' }}>Confirm System Reset</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                Are you absolutely sure you want to reset all data? This will clear all registries and logs. This action is irreversible.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setResetDialogVisible(false)} textColor={colors.slate500}>Cancel</Button>
              <Button 
                onPress={handleResetData} 
                loading={isResetting} 
                disabled={isResetting}
                textColor={colors.rose600}
                labelStyle={{ fontWeight: '900' }}
              >
                YES, RESET DATA
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </View>
  );
};


export const FingerprintUI = () => <SkeletonScreen title="Fingerprint Recognition" subtitle="Visual interface for multi-spectral biometric scanning operations." />;

export const AdminInteractive = () => {
  const [logs, setLogs] = useState([
    { id: 1, time: '07:42:15', type: 'INFO', msg: 'System initialized. All terminals online.' },
    { id: 2, time: '07:45:02', type: 'SEC', msg: 'Secondary auth bypass detected in Sector B.' },
    { id: 3, time: '07:50:33', type: 'WARN', msg: 'Database latency exceeding 200ms threshold.' },
    { id: 4, time: '07:56:44', type: 'INFO', msg: 'Admin session started from 192.168.1.42' },
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium" style={styles.title}>Admin Interactive</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Execute system-level overrides and monitor real-time security events.</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Card style={styles.tableCard}>
            <Card.Title title="System Overrides" titleVariant="titleLarge" subtitle="Emergency and maintenance controls" divider />
            <Card.Content style={{ padding: 16 }}>
              {[
                { label: 'Panic Mode', desc: 'Lock all entry points immediately', color: colors.rose500, icon: 'alert-octagon' },
                { label: 'Maintenance Window', desc: 'Disable biometric scanners for 30m', color: colors.primary, icon: 'tools' },
                { label: 'Auth Bypass', desc: 'Enable emergency bypass codes', color: colors.amber500, icon: 'key-alert' },
              ].map((item, idx) => (
                <Surface key={idx} style={styles.overrideItem} elevation={1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Avatar.Icon size={36} icon={item.icon} color={colors.white} style={{ backgroundColor: item.color }} />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.label}</Text>
                      <Text variant="bodySmall" style={{ color: colors.slate500 }}>{item.desc}</Text>
                    </View>
                    <Switch value={false} onValueChange={() => {}} color={item.color} />
                  </View>
                </Surface>
              ))}
            </Card.Content>
          </Card>
        </View>

        <View style={{ flex: 1.5 }}>
          <Card style={[styles.tableCard, { backgroundColor: '#0F172A', flex: 1 }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="labelLarge" style={{ color: colors.slate400, letterSpacing: 1 }}>SYSTEM_LOGS_V4.0</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rose500 }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber500 }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.emerald500 }} />
              </View>
            </View>
            <View style={{ padding: 16 }}>
              {logs.map(log => (
                <View key={log.id} style={{ marginBottom: 12, flexDirection: 'row', gap: 12 }}>
                  <Text style={styles.consoleTime}>[{log.time}]</Text>
                  <Text style={[styles.consoleType, { color: log.type === 'SEC' ? colors.rose400 : log.type === 'WARN' ? colors.amber400 : colors.emerald400 }]}>{log.type}:</Text>
                  <Text style={styles.consoleMsg}>{log.msg}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: '900' }}>{'>'}</Text>
                <TextInput 
                  placeholder="Execute command..." 
                  placeholderTextColor="#475569" 
                  style={styles.consoleInput}
                  textColor={colors.white}
                  mode="flat"
                  dense
                  contentStyle={{ paddingHorizontal: 0, height: 32 }}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.backgroundLight, 
    padding: 24 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 32 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: colors.slate800, 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 14, 
    color: colors.slate500, 
    marginTop: 4, 
    lineHeight: 20 
  },
  addButton: { 
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 24 
  },
  statCard: { 
    flex: 1, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: colors.slate100,
    backgroundColor: colors.white,
  },
  statContent: {
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 16
  },
  statValue: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: colors.slate800 
  },
  statLabel: { 
    fontSize: 12, 
    color: colors.slate500, 
    marginTop: 2 
  },
  filtersRow: { 
    marginBottom: 20, 
    flexDirection: 'row', 
    gap: 12, 
    alignItems: 'center' 
  },
  searchBar: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  segmentedButtons: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 48,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  bulkActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.indigo100,
    overflow: 'hidden',
  },
  bulkAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: colors.primary,
  },
  bulkCountBadge: {
    backgroundColor: colors.indigo50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bulkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  bulkBtn: {
    borderRadius: 10,
  },
  bulkVDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.slate200,
    marginHorizontal: 4,
  },
  userInfo: {
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: { 
    borderRadius: 10 
  },
  avatarLabel: { 
    fontWeight: '800' 
  },

  overrideItem: { 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 12, 
    backgroundColor: colors.slate50, 
    borderWidth: 1, 
    borderColor: colors.slate100 
  },
  consoleTime: { 
    color: colors.slate500, 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    fontSize: 12 
  },
  consoleType: { 
    fontWeight: '800', 
    fontSize: 12, 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' 
  },
  consoleMsg: { 
    color: colors.slate200, 
    flex: 1, 
    fontSize: 12, 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' 
  },
  consoleInput: { 
    fontSize: 12, 
    flex: 1, 
    height: 32,
    color: colors.white
  },
  tinyText: { 
    fontSize: 10, 
    color: colors.slate500 
  },
  placeholder: { 
    flex: 1, 
    backgroundColor: colors.slate50, 
    borderRadius: 16, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: colors.slate200, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20 
  },
  placeholderText: { 
    color: colors.slate400, 
    fontSize: 14 
  },
  modalContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 550,
    borderRadius: 24,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  modalContent: { 
    backgroundColor: colors.white, 
    width: '100%', 
    maxWidth: 680, 
    borderRadius: 24,
  },
  modalHeader: { 
    padding: 24, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.slate100 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: colors.slate800 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: colors.slate500, 
    marginTop: 4 
  },
  modalBody: { 
    padding: 24, 
    maxHeight: 500 
  },
  inputRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 16 
  },
  inputGroup: { 
    gap: 8, 
    marginBottom: 16 
  },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: colors.slate700 
  },
  modalActions: { 
    padding: 24, 
    borderTopWidth: 1, 
    borderTopColor: colors.slate100, 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 12 
  },
  fingerprintSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    backgroundColor: colors.slate50, 
    borderWidth: 1, 
    borderColor: colors.slate200, 
    borderRadius: 16, 
    padding: 16, 
    borderStyle: 'dashed' 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formSection: {
    marginBottom: 8,
  },
  scannerContainer: { 
    alignItems: 'center', 
    paddingVertical: 32, 
    gap: 20 
  },
  scannerHexagon: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    backgroundColor: colors.indigo50, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: colors.primary, 
    position: 'relative', 
    overflow: 'hidden' 
  },
  scannerScanline: { 
    position: 'absolute', 
    width: '100%', 
    height: 2, 
    backgroundColor: colors.primary 
  },
  scannerStatus: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: colors.slate800, 
    marginTop: 8 
  },
  progressContainer: { 
    width: '80%', 
    height: 6, 
    backgroundColor: colors.slate100, 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  progressBar: { 
    height: '100%', 
    backgroundColor: colors.primary 
  },
  progressText: { 
    fontSize: 13, 
    color: colors.slate500, 
    fontWeight: '800' 
  },
  scanIndicatorRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
  scanDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: colors.slate200 
  },
  scanDotActive: { 
    backgroundColor: colors.primary, 
    transform: [{ scale: 1.2 }] 
  },
  scanDotDone: { 
    backgroundColor: colors.emerald500 
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: 12,
    padding: 2,
    marginLeft: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 8,
  },
  itemCard: {
    width: Platform.OS === 'web' ? '31%' : '100%',
    minWidth: 300,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.indigo50,
  },
  toolbarSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 10,
    paddingLeft: 4,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.slate100,
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 16,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: colors.slate600,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 'auto',
  },
  terminalModalContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  detailRowLarge: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 24,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});



// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMenuVisible, setPrintMenuVisible] = useState(false);
  const [reportDate, setReportDate] = useState(localDateStr());
  const theme = useTheme();

  const { userRole, isAuthenticated } = usePermissions();
  const { showSnackbar } = useSnackbar();

  const today = localDateStr();

  useEffect(() => {
    if (isAuthenticated) {
      fetchReportData();
    }
  }, [isAuthenticated, userRole, activeTab, reportDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/reports/summary`, {
        headers: {
          'x-user-role': userRole
        },
        params: { date: reportDate }
      });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      showSnackbar('Failed to fetch reporting data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build a single report section as HTML. scope: 'summary' | 'meals' | 'active' | 'biometric'
  const buildSection = (scope) => {
    if (scope === 'summary') {
      return `
        <div class="section-title">EXECUTIVE SUMMARY</div>
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-label">TOTAL RESIDENTS</div><div class="stat-value">${data.summary.totalRenters}</div></div>
          <div class="stat-box"><div class="stat-label">ACTIVE MEAL</div><div class="stat-value">${data.summary.activeRenters}</div></div>
          <div class="stat-box"><div class="stat-label">BIOMETRIC ENROLLED</div><div class="stat-value">${data.biometricUsersList.length}</div></div>
          <div class="stat-box"><div class="stat-label">DENIED RATE</div><div class="stat-value">${Math.round((data.summary.deniedAccessToday / (data.summary.successfulAccessToday + data.summary.deniedAccessToday || 1)) * 100)}%</div></div>
        </div>`;
    }
    if (scope === 'meals') {
      return `
        <div class="section-title">MEALS CLAIMED — ${data.summary.reportDate || reportDate}</div>
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stat-box"><div class="stat-label">BREAKFAST</div><div class="stat-value">${data.summary.mealsToday?.breakfast ?? 0}</div></div>
          <div class="stat-box"><div class="stat-label">LUNCH</div><div class="stat-value">${data.summary.mealsToday?.lunch ?? 0}</div></div>
          <div class="stat-box"><div class="stat-label">DINNER</div><div class="stat-value">${data.summary.mealsToday?.dinner ?? 0}</div></div>
        </div>
        ${[['Breakfast', 'breakfast'], ['Lunch', 'lunch'], ['Dinner', 'dinner']].map(([label, key]) => {
          const list = (data.mealAttendance && data.mealAttendance[key]) || [];
          return `
            <div class="section-title">${label.toUpperCase()} ATTENDEES (${list.length})</div>
            <table>
              <thead><tr><th>NAME</th><th>FLOOR</th><th>ROOM</th><th>MEAL TYPE</th><th>TIME</th></tr></thead>
              <tbody>${list.length === 0
                ? `<tr><td colspan="5" style="color:#94a3b8;">No ${label.toLowerCase()} claimed on this date.</td></tr>`
                : list.map(r => `<tr><td>${r.name}</td><td>${r.floorNo || 'N/A'}</td><td>${r.roomNo || 'N/A'}</td><td>${r.mealType || 'N/A'}</td><td>${r.time || ''}</td></tr>`).join('')}</tbody>
            </table>`;
        }).join('')}`;
    }
    if (scope === 'active') {
      return `
        <div class="section-title">ACTIVE RENTERS (MEAL PRIVILEGES)</div>
        <table>
          <thead><tr><th>NAME</th><th>ROOM</th><th>CONTACT</th><th>DATE REG.</th></tr></thead>
          <tbody>${data.activeRentersList.map(r => `<tr><td>${r.name}</td><td>${r.roomNo || r.room_no || 'N/A'}</td><td>${r.studentPhone || r.student_phone || 'N/A'}</td><td>${r.date || 'N/A'}</td></tr>`).join('')}</tbody>
        </table>`;
    }
    if (scope === 'biometric') {
      return `
        <div class="section-title">BIOMETRIC ENROLLED USERS</div>
        <table>
          <thead><tr><th>NAME</th><th>INITIALS</th><th>ROOM</th><th>HAS FINGERPRINT</th></tr></thead>
          <tbody>${data.biometricUsersList.map(r => `<tr><td>${r.name}</td><td>${r.initials || 'N/A'}</td><td>${r.roomNo || r.room_no || 'N/A'}</td><td>YES</td></tr>`).join('')}</tbody>
        </table>`;
    }
    return '';
  };

  // scope: 'full' (everything) or one of the section keys
  const handlePrint = async (scope = 'full') => {
    if (!data) return;
    setIsPrinting(true);
    setPrintMenuVisible(false);

    const reportId = `SA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const generatedAt = new Date().toLocaleString();
    const currentYear = new Date().getFullYear();

    const TITLES = {
      full: 'CONFIDENTIAL OFFICIAL REPORT',
      summary: 'EXECUTIVE SUMMARY',
      meals: `MEAL ATTENDANCE — ${data.summary.reportDate || reportDate}`,
      active: 'ACTIVE RENTERS REPORT',
      biometric: 'BIOMETRIC ENROLLMENT REPORT',
    };

    const sections = scope === 'full'
      ? ['summary', 'meals', 'active', 'biometric']
      : [scope];
    const body = sections.map((s, i) => (i > 0 ? '<div class="page-break"></div>' : '') + buildSection(s)).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
            .branding h1 { margin: 0; font-size: 24px; color: #6366f1; font-weight: 800; }
            .metadata { text-align: right; font-size: 11px; color: #64748b; }
            .classification { display: inline-block; padding: 3px 10px; background: #f1f5f9; border-radius: 4px; font-size: 10px; font-weight: 800; margin-bottom: 15px; color: #475569; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
            .stat-box { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .stat-value { font-size: 18px; font-weight: 800; }
            .section-title { font-size: 15px; font-weight: 800; margin: 25px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #f8fafc; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
            .sig-box { width: 200px; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; text-align: center; }
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="branding"><h1>ServeQueue</h1><p style="margin:0;font-size:12px;color:#64748b;">Enterprise System</p></div>
            <div class="metadata">ID: ${reportId}<br>Date: ${generatedAt}</div>
          </div>
          <div class="classification">${TITLES[scope] || TITLES.full}</div>

          ${body}

          <div class="signatures"><div class="sig-box">Operations Manager</div><div class="sig-box">Security Supervisor</div></div>
          <div class="footer">© ${currentYear} Renter Systems International. Generated by System Administrator.</div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => { printWindow.print(); }, 500);
        }
      } else {
        await Print.printAsync({ html });
      }
      showSnackbar('Report generated.', 'success');
    } catch (error) {
      console.error('Printing error:', error);
      showSnackbar('Failed to generate report.', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>System Reports</Text>
          <Text style={styles.subtitle}>Enterprise analytics and audit summary</Text>
        </View>
        <Menu
          visible={printMenuVisible}
          onDismiss={() => setPrintMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              icon="printer"
              onPress={() => setPrintMenuVisible(true)}
              loading={isPrinting}
              disabled={isPrinting}
              style={styles.addButton}
            >
              Print
            </Button>
          }
        >
          <Menu.Item leadingIcon="file-document-multiple" onPress={() => handlePrint('full')} title="Full Report" />
          <Divider />
          <Menu.Item leadingIcon="account-group" onPress={() => handlePrint('active')} title="Active Renters" />
          <Menu.Item leadingIcon="fingerprint" onPress={() => handlePrint('biometric')} title="Biometric Status" />
          <Menu.Item leadingIcon="food-fork-drink" onPress={() => handlePrint('meals')} title={`Meals (${data?.summary?.reportDate || reportDate})`} />
          <Menu.Item leadingIcon="chart-box" onPress={() => handlePrint('summary')} title="Executive Summary" />
        </Menu>
      </View>

      <View style={styles.filtersRow}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { 
              value: 'summary', 
              label: 'General Summary', 
              icon: 'chart-timeline-variant',
              showSelectedCheck: true 
            },
            { 
              value: 'active', 
              label: `Active Renters (${data?.activeRentersList?.length || 0})`, 
              icon: 'account-group',
              showSelectedCheck: true 
            },
            {
              value: 'biometric',
              label: `Biometric Status (${data?.biometricUsersList?.length || 0})`,
              icon: 'fingerprint',
              showSelectedCheck: true
            },
            {
              value: 'meals',
              label: `Meals Today (${(data?.summary?.mealsToday?.breakfast || 0) + (data?.summary?.mealsToday?.lunch || 0) + (data?.summary?.mealsToday?.dinner || 0)})`,
              icon: 'food-fork-drink',
              showSelectedCheck: true
            },
          ]}
          style={styles.segmentedButtons}
          theme={{ 
            colors: { 
              secondaryContainer: `${colors.primary}15`, 
              onSecondaryContainer: colors.primary,
              outline: 'transparent'
            } 
          }}
        />
      </View>

      {activeTab === 'summary' && (
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Avatar.Icon size={40} icon="account-group" backgroundColor={colors.indigo50} color={colors.primary} />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.statValue}>{data?.summary?.totalRenters}</Text>
                  <Text style={styles.statLabel}>Total Renters</Text>
                </View>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Avatar.Icon size={40} icon="fingerprint" backgroundColor={colors.emerald50} color={colors.emerald600} />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.statValue}>{data?.biometricUsersList?.length}</Text>
                  <Text style={styles.statLabel}>Biometric Enrolled</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Meals claimed today, per period */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Avatar.Icon size={40} icon="coffee" backgroundColor={colors.indigo50} color={colors.secondary} />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.statValue}>{data?.summary?.mealsToday?.breakfast ?? 0}</Text>
                  <Text style={styles.statLabel}>Breakfast Today</Text>
                </View>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Avatar.Icon size={40} icon="food" backgroundColor={colors.indigo50} color={colors.amber600} />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.statValue}>{data?.summary?.mealsToday?.lunch ?? 0}</Text>
                  <Text style={styles.statLabel}>Lunch Today</Text>
                </View>
              </View>
            </Card>
            <Card style={styles.statCard}>
              <View style={styles.statContent}>
                <Avatar.Icon size={40} icon="silverware-fork-knife" backgroundColor={colors.indigo50} color={colors.rose600} />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.statValue}>{data?.summary?.mealsToday?.dinner ?? 0}</Text>
                  <Text style={styles.statLabel}>Dinner Today</Text>
                </View>
              </View>
            </Card>
          </View>

          <Card style={styles.tableCard}>
            <Text style={{ padding: 16, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.slate100 }}>
              Recent Access Activity
            </Text>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Name</DataTable.Title>
                <DataTable.Title>Point</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>
              {data?.recentActivity?.map((item, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{item.name}</DataTable.Cell>
                  <DataTable.Cell>{item.point}</DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={{ color: item.status === 'Success' ? colors.emerald600 : colors.amber600 }}>
                      {item.status}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        </>
      )}

      {activeTab === 'active' && (
        <Card style={styles.tableCard}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Name</DataTable.Title>
              <DataTable.Title>Room</DataTable.Title>
              <DataTable.Title>Meal Benefit</DataTable.Title>
            </DataTable.Header>
            {data?.activeRentersList?.map((item, index) => (
              <DataTable.Row key={index}>
                <DataTable.Cell>{item.name}</DataTable.Cell>
                <DataTable.Cell>{item.roomNo || item.room_no || 'N/A'}</DataTable.Cell>
                <DataTable.Cell><Text style={{color: colors.emerald600}}>ENABLED</Text></DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card>
      )}

      {activeTab === 'biometric' && (
        <Card style={styles.tableCard}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Name</DataTable.Title>
              <DataTable.Title>Initials</DataTable.Title>
              <DataTable.Title>Fingerprint Status</DataTable.Title>
            </DataTable.Header>
            {data?.biometricUsersList?.map((item, index) => (
              <DataTable.Row key={index}>
                <DataTable.Cell>{item.name}</DataTable.Cell>
                <DataTable.Cell>{item.initials || 'N/A'}</DataTable.Cell>
                <DataTable.Cell><Text style={{color: colors.primary}}>ENROLLED</Text></DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card>
      )}

      {activeTab === 'meals' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={[styles.tableCard, { marginBottom: 16 }]}>
            <Card.Content style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 16 }}>
              <Avatar.Icon size={36} icon="calendar" style={{ backgroundColor: colors.indigo50 }} color={colors.primary} />
              <Text variant="titleSmall" style={{ fontWeight: '800', color: colors.slate700 }}>Showing meals for</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={reportDate}
                  max={today}
                  onChange={(e) => setReportDate(e.target.value || today)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 14,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.slate200}`,
                    color: colors.slate800,
                    background: colors.white,
                  }}
                />
              ) : (
                <TextInput
                  value={reportDate}
                  onChangeText={setReportDate}
                  mode="outlined"
                  placeholder="YYYY-MM-DD"
                  dense
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ backgroundColor: colors.white, minWidth: 160 }}
                />
              )}
              {reportDate !== today && (
                <Button mode="text" compact icon="calendar-today" onPress={() => setReportDate(today)} textColor={colors.primary}>
                  Today
                </Button>
              )}
              {loading && <ActivityIndicator size="small" color={colors.primary} />}
            </Card.Content>
          </Card>
          {[
            { key: 'breakfast', label: 'Breakfast', icon: 'coffee', color: colors.secondary },
            { key: 'lunch', label: 'Lunch', icon: 'food', color: colors.amber600 },
            { key: 'dinner', label: 'Dinner', icon: 'silverware-fork-knife', color: colors.rose600 },
          ].map(({ key, label, icon, color }) => {
            const list = data?.mealAttendance?.[key] || [];
            return (
              <Card key={key} style={[styles.tableCard, { marginBottom: 16 }]}>
                <Card.Title
                  title={`${label} — ${list.length} student${list.length === 1 ? '' : 's'}`}
                  left={(props) => <Avatar.Icon {...props} icon={icon} style={{ backgroundColor: colors.indigo50 }} color={color} />}
                />
                {list.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.slate400 }}>No {label.toLowerCase()} claimed yet today.</Text>
                  </View>
                ) : (
                  <DataTable>
                    <DataTable.Header>
                      <DataTable.Title>Name</DataTable.Title>
                      <DataTable.Title>Floor</DataTable.Title>
                      <DataTable.Title>Room</DataTable.Title>
                      <DataTable.Title>Meal Type</DataTable.Title>
                      <DataTable.Title numeric>Time</DataTable.Title>
                    </DataTable.Header>
                    {list.map((item, index) => (
                      <DataTable.Row key={index}>
                        <DataTable.Cell>{item.name}</DataTable.Cell>
                        <DataTable.Cell>{item.floorNo || 'N/A'}</DataTable.Cell>
                        <DataTable.Cell>{item.roomNo || 'N/A'}</DataTable.Cell>
                        <DataTable.Cell>{item.mealType || 'N/A'}</DataTable.Cell>
                        <DataTable.Cell numeric>{item.time}</DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};
