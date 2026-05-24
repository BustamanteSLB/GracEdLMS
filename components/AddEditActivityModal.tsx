import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import AttachIcon from '@/assets/icons/attach.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import dayjs from 'dayjs';
import { Checkbox } from 'expo-checkbox';

cssInterop(Image, { className: 'style' });

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  quarter: string;
  points: number | null;
  createdBy: User;
  attachmentPath?: string | null;
  allowLateSubmissions: boolean;
  status: 'active' | 'inactive' | 'upcoming' | 'overdue' | 'graded';
  createdAt: string;
  updatedAt: string;
}

interface AddEditActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjectId: string;
  isDarkMode?: boolean;
  editActivity?: Activity | null;
  isEditing?: boolean;
}

const AddEditActivityModal: React.FC<AddEditActivityModalProps> = ({
  visible,
  onClose,
  onSuccess,
  subjectId,
  isDarkMode,
  editActivity,
  isEditing = false,
}) => {
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  // Form state
  const [title, setTitle] = useState(editActivity?.title || '');
  const [visibleDate, setVisibleDate] = useState<Date>(
    editActivity?.visibleDate ? new Date(editActivity.visibleDate) : new Date()
  );
  const [deadline, setDeadline] = useState<Date>(
    editActivity?.deadline ? new Date(editActivity.deadline) : new Date()
  );
  const [quarter, setQuarter] = useState(editActivity?.quarter || 'First Quarter');
  const [description, setDescription] = useState(editActivity?.description || '');
  const [points, setPoints] = useState(
    editActivity && editActivity.points !== null ? String(editActivity.points) : ''
  );
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | File | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(
    editActivity?.attachmentPath || null
  );
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(
    editActivity?.allowLateSubmissions !== undefined ? editActivity.allowLateSubmissions : true
  );

  // Mobile DateTimePicker states
  const [showVisibleDatePicker, setShowVisibleDatePicker] = useState(false);
  const [showVisibleTimePicker, setShowVisibleTimePicker] = useState(false);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);
  const [showDeadlineTimePicker, setShowDeadlineTimePicker] = useState(false);

  // Quarter dropdown items
  const quarterItemsWeb: DropdownItem[] = [
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: 'Third Quarter', value: '3rd Quarter' },
    { label: 'Fourth Quarter', value: '4th Quarter' },
  ];

  const quarterItemsMobile: DropdownMobileItem[] = [
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: 'Third Quarter', value: '3rd Quarter' },
    { label: 'Fourth Quarter', value: '4th Quarter' },
  ];

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible && editActivity && isEditing) {
      setTitle(editActivity.title);
      setVisibleDate(new Date(editActivity.visibleDate));
      setDeadline(new Date(editActivity.deadline));
      setQuarter(editActivity.quarter || 'First Quarter');
      setDescription(editActivity.description || '');
      setPoints(editActivity.points !== null ? String(editActivity.points) : '');
      setFile(null);
      setAttachmentPath(editActivity.attachmentPath || null);
      setAllowLateSubmissions(
        editActivity.allowLateSubmissions !== undefined ? editActivity.allowLateSubmissions : true
      );
    } else if (visible && !isEditing) {
      setTitle('');
      setVisibleDate(new Date());
      setDeadline(new Date());
      setQuarter('First Quarter');
      setDescription('');
      setPoints('');
      setFile(null);
      setAttachmentPath(null);
      setAllowLateSubmissions(true);
    }
  }, [visible, editActivity, isEditing]);

  // File picker
  const pickDocument = async () => {
    try {
      if (isWeb) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';

        return new Promise<void>((resolve) => {
          input.onchange = (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files && files[0]) {
              if (files[0].size > 10 * 1024 * 1024) {
                window.alert('Error: File size must be less than 10MB');
                resolve();
                return;
              }
              setFile(files[0]);
            }
            resolve();
          };
          input.click();
        });
      } else {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];

        const result = await DocumentPicker.getDocumentAsync({
          type: allowedMimeTypes,
          multiple: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          
          if (asset.size && asset.size > 10 * 1024 * 1024) {
            Alert.alert('Error', 'File size must be less than 10MB');
            return;
          }
          
          setFile(asset);
        }
      }
    } catch (err) {
      console.log('Document picking cancelled or failed.', err);
      showAlert('Error', 'Failed to pick document.');
    }
  };

  const showAlert = (title: string, message: string) => {
    if (isWeb) {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const nowISO = new Date().toISOString().slice(0, 16);

  // Mobile Date Picker Handlers
  const handleVisibleDateChange = (event: any, selectedDate?: Date) => {
    setShowVisibleDatePicker(false);
    if (selectedDate) {
      setVisibleDate(selectedDate);
      setShowVisibleTimePicker(true);
    }
  };

  const handleVisibleTimeChange = (event: any, selectedTime?: Date) => {
    setShowVisibleTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(visibleDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setVisibleDate(newDate);
    }
  };

  const handleDeadlineDateChange = (event: any, selectedDate?: Date) => {
    setShowDeadlineDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
      setShowDeadlineTimePicker(true);
    }
  };

  const handleDeadlineTimeChange = (event: any, selectedTime?: Date) => {
    setShowDeadlineTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(deadline);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDeadline(newDate);
    }
  };

  const formatDateTime = (date: Date) => {
    return dayjs(date).format('MMM DD, YYYY hh:mm A');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      showAlert('Validation Error', 'Title is required.');
      return;
    }

    if (!quarter.trim()) {
      showAlert('Validation Error', 'Quarter is required.');
      return;
    }

    if (!user) {
      showAlert('Error', 'You must be logged in to save an activity.');
      return;
    }

    const now = new Date();

    if (visibleDate.getTime() < now.getTime()) {
      showAlert('Validation Error', 'Start Date cannot be before now.');
      return;
    }

    if (deadline.getTime() <= visibleDate.getTime()) {
      showAlert('Validation Error', 'Deadline must be after Start Date.');
      return;
    }

    if (points.trim() && (isNaN(Number(points)) || Number(points) < 0)) {
      showAlert('Validation Error', 'Points must be a valid positive number.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('visibleDate', visibleDate.toISOString());
      formData.append('deadline', deadline.toISOString());
      formData.append('quarter', quarter.trim());
      formData.append('description', description.trim());
      formData.append('allowLateSubmissions', String(allowLateSubmissions));
      
      if (points.trim()) {
        formData.append('points', points.trim());
      } else if (isEditing) {
        formData.append('points', '');
      }

      if (file) {
        if (isWeb) {
          formData.append('attachment', file as File);
        } else {
          const mobileFile = file as DocumentPicker.DocumentPickerAsset;
          const fileToUpload = {
            uri: mobileFile.uri,
            type: mobileFile.mimeType || 'application/octet-stream',
            name: mobileFile.name || 'attachment',
          };
          formData.append('attachment', fileToUpload as any);
        }
      }

      let response;
      if (isEditing && editActivity) {
        response = await apiClient.put(`/activities/${editActivity._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
      } else {
        response = await apiClient.post(`/subjects/${subjectId}/activities`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
      }

      console.log('✅ Activity saved successfully:', response.data);
      
      showAlert(
        'Success',
        isEditing ? 'Activity updated successfully!' : 'Activity created successfully!'
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('🚨 Save Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to save activity.';
      showAlert('Error', msg);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: '100%',
            maxWidth: 600,
            maxHeight: '90%',
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView
            style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  {isEditing ? 'Edit Activity' : 'Create Activity'}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#B0B3B8' : '#65676B',
                    marginTop: 2,
                  }}
                >
                  {isEditing ? 'Update activity details' : 'Share an activity with your students'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/close.png')}
                  style={{ width: 20, height: 20 }}
                  tintColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    marginBottom: 8,
                  }}
                >
                  Title <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="What's this activity about?"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 15,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#3A3B3C' : 'transparent',
                  }}
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#65676B'}
                />
              </View>

              {/* Date Section */}
              <View
                style={{
                  marginBottom: 16,
                }}
              >
                {/* Start Date */}
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      marginBottom: 8,
                    }}
                  >
                    Start Date <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  {isWeb ? (
                    <input
                      type="datetime-local"
                      value={dayjs(visibleDate).format('YYYY-MM-DDTHH:mm')}
                      onChange={(e) => setVisibleDate(new Date(e.target.value))}
                      min={nowISO}
                      style={{
                        width: '100%',
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#FFFFFF',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        border: `1px solid ${isDarkMode ? '#3A3B3C' : '#CED0D4'}`,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 15,
                        fontFamily: 'Inter-Regular',
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowVisibleDatePicker(true)}
                      style={{
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#FFFFFF',
                        borderRadius: 8,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <CalendarIcon
                        width={20}
                        height={20}
                        fill={isDarkMode ? '#1877F2' : '#1877F2'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        {formatDateTime(visibleDate)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Deadline */}
                <View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      marginBottom: 8,
                    }}
                  >
                    Deadline <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  {isWeb ? (
                    <input
                      type="datetime-local"
                      value={dayjs(deadline).format('YYYY-MM-DDTHH:mm')}
                      onChange={(e) => setDeadline(new Date(e.target.value))}
                      min={dayjs(visibleDate).format('YYYY-MM-DDTHH:mm') || nowISO}
                      style={{
                        width: '100%',
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#FFFFFF',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        border: `1px solid ${isDarkMode ? '#3A3B3C' : '#CED0D4'}`,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 15,
                        fontFamily: 'Inter-Regular',
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDeadlineDatePicker(true)}
                      style={{
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#FFFFFF',
                        borderRadius: 8,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <CalendarIcon
                        width={20}
                        height={20}
                        fill={isDarkMode ? '#1877F2' : '#1877F2'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        {formatDateTime(deadline)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Quarter Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    marginBottom: 8,
                  }}
                >
                  Quarter <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                {isWeb ? (
                  <Dropdown
                    selectedValue={quarter}
                    onValueChange={(value) => setQuarter(value)}
                    data={quarterItemsWeb}
                    placeholder="Select Quarter"
                    style={{
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                    textStyle={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 15,
                    }}
                    dropdownIconColor={isDarkMode ? '#E4E6EA' : '#1C1E21'}
                  />
                ) : (
                  <DropdownMobile
                    selectedValue={quarter}
                    onValueChange={(value) => setQuarter(value)}
                    items={quarterItemsMobile}
                    placeholder="Select Quarter"
                    buttonStyle={{
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      minHeight: 48,
                    }}
                  />
                )}
              </View>

              {/* Description */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    marginBottom: 8,
                  }}
                >
                  Description
                </Text>
                <TextInput
                  placeholder="Add more details about this activity..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={500}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 15,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#65676B'}
                />
              </View>

              {/* Points */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    marginBottom: 8,
                  }}
                >
                  Points <Text style={{ fontSize: 13, color: isDarkMode ? '#B0B3B8' : '#65676B' }}>(optional)</Text>
                </Text>
                <TextInput
                  placeholder="e.g., 100"
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="numeric"
                  maxLength={5}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 15,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                  placeholderTextColor={isDarkMode ? '#8A8D91' : '#65676B'}
                />
              </View>

              {/* Allow Late Submissions */}
              <TouchableOpacity
                onPress={() => setAllowLateSubmissions(!allowLateSubmissions)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: allowLateSubmissions 
                    ? (isDarkMode ? '#1E3A2E' : '#E7F5EF')
                    : (isDarkMode ? '#3A3B3C' : '#F0F2F5'),
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: allowLateSubmissions ? '#10B981' : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <Checkbox
                  value={allowLateSubmissions}
                  onValueChange={setAllowLateSubmissions}
                  color={allowLateSubmissions ? '#10B981' : undefined}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      marginBottom: 2,
                    }}
                  >
                    Allow Late Submissions
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#B0B3B8' : '#65676B',
                    }}
                  >
                    Students can submit after the deadline
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Attachment */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    marginBottom: 8,
                  }}
                >
                  Attachment <Text style={{ fontSize: 13, color: isDarkMode ? '#B0B3B8' : '#65676B' }}>(optional)</Text>
                </Text>
                
                {attachmentPath && isEditing ? (
                  <View
                    style={{
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <Image
                        source={require('@/assets/icons/attach.png')}
                        style={{ width: 20, height: 20, marginRight: 10 }}
                        tintColor={isDarkMode ? '#1877F2' : '#1877F2'}
                        contentFit="contain"
                      />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        {attachmentPath.split('/').pop()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setAttachmentPath(null)}
                      style={{
                        backgroundColor: '#EF4444',
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter-Bold' }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickDocument}
                    style={{
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: file ? '#1877F2' : 'transparent',
                      borderStyle: 'dashed',
                    }}
                    activeOpacity={0.7}
                  >
                    <AttachIcon
                      width={20}
                      height={20}
                      fill={isDarkMode ? '#1877F2' : '#1877F2'}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: 'Inter-Regular',
                        color: file
                          ? (isDarkMode ? '#E4E6EA' : '#1C1E21')
                          : (isDarkMode ? '#8A8D91' : '#65676B'),
                      }}
                    >
                      {file
                        ? isWeb
                          ? (file as File).name
                          : (file as DocumentPicker.DocumentPickerAsset).name
                        : 'Choose file (PDF, DOC, PPT, TXT, Images)'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Info Box */}
              <View
                style={{
                  backgroundColor: isDarkMode ? '#263A52' : '#E3F2FD',
                  borderRadius: 8,
                  padding: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: '#1877F2',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9BD1FF' : '#1565C0',
                  }}
                >
                  💡 File size limit: 10MB. Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, and common image formats.
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: 'row',
                padding: 16,
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={{
                  flex: 1,
                  backgroundColor: '#1877F2',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: 'Inter-Bold',
                    color: '#FFFFFF',
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Create Activity'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Pressable>

        {/* Mobile DateTimePickers */}
        {showVisibleDatePicker && (
          <DateTimePicker
            value={visibleDate}
            mode="date"
            display="default"
            onChange={handleVisibleDateChange}
            minimumDate={new Date()}
          />
        )}

        {showVisibleTimePicker && (
          <DateTimePicker
            value={visibleDate}
            mode="time"
            display="default"
            onChange={handleVisibleTimeChange}
          />
        )}

        {showDeadlineDatePicker && (
          <DateTimePicker
            value={deadline}
            mode="date"
            display="default"
            onChange={handleDeadlineDateChange}
            minimumDate={visibleDate}
          />
        )}

        {showDeadlineTimePicker && (
          <DateTimePicker
            value={deadline}
            mode="time"
            display="default"
            onChange={handleDeadlineTimeChange}
          />
        )}
      </Pressable>
    </Modal>
  );
};

export default AddEditActivityModal;