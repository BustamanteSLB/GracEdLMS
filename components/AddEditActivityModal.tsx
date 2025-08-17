import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AttachIcon from '@/assets/icons/attach.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Checkbox from 'expo-checkbox';
import { Picker } from '@react-native-picker/picker';

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

  // Form state
  const [title, setTitle] = useState(editActivity?.title || '');
  const [visibleDate, setVisibleDate] = useState(
    editActivity?.visibleDate?.slice(0, 16) || ''
  );
  const [deadline, setDeadline] = useState(
    editActivity?.deadline?.slice(0, 16) || ''
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

  // Date picker states
  const [showVisibleDatePicker, setShowVisibleDatePicker] = useState(false);
  const [showVisibleTimePicker, setShowVisibleTimePicker] = useState(false);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);
  const [showDeadlineTimePicker, setShowDeadlineTimePicker] = useState(false);

  // Checkbox for setting the activity inactive when past deadline
  const [inactiveAfterDeadline, setInactiveAfterDeadline] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible && editActivity && isEditing) {
      setTitle(editActivity.title);
      setVisibleDate(editActivity.visibleDate.slice(0, 16));
      setDeadline(editActivity.deadline.slice(0, 16));
      setQuarter(editActivity.quarter || 'First Quarter');
      setDescription(editActivity.description || '');
      setPoints(editActivity.points !== null ? String(editActivity.points) : '');
      setFile(null);
      setAttachmentPath(editActivity.attachmentPath || null);
    } else if (visible && !isEditing) {
      setTitle('');
      setVisibleDate('');
      setDeadline('');
      setQuarter('First Quarter');
      setDescription('');
      setPoints('');
      setFile(null);
      setAttachmentPath(null);
    }
  }, [visible, editActivity, isEditing]);

  // File picker function
  const pickDocument = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';

        return new Promise<void>((resolve) => {
          input.onchange = (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files) {
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
          setFile(result.assets[0]);
        }
      }
    } catch (err) {
      console.log('Document picking cancelled or failed.', err);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to pick document.');
      } else {
        Alert.alert('Error', 'Failed to pick document.');
      }
    }
  };

  // Current ISO string for "min" on date inputs
  const nowISO = new Date().toISOString().slice(0, 16);

  // Date and Time Picker Handlers
  const onChangeDatePicker = (
    event: any,
    selectedDate: Date | undefined,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setShowTimePicker: React.Dispatch<React.SetStateAction<boolean>>,
    setShowDatePicker: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setter(selectedDate.toISOString().slice(0, 10));
      setShowTimePicker(true);
    }
  };

  const onChangeTimePicker = (
    event: any,
    selectedTime: Date | undefined,
    dateString: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setShowTimePicker: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setter(`${dateString}T${hours}:${minutes}`);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!title.trim() || !visibleDate.trim() || !deadline.trim() || !quarter.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Error: Title, Start Date, Deadline, and Quarter are required.');
      } else {
        Alert.alert('Error', 'Title, Start Date, Deadline, and Quarter are required.');
      }
      return;
    }

    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('Error: You must be logged in to save an activity.');
      } else {
        Alert.alert('Error', 'You must be logged in to save an activity.');
      }
      return;
    }

    // Parse and validate dates
    const visible = new Date(visibleDate);
    const deadlineDate = new Date(deadline);
    const now = new Date();

    if (isNaN(visible.getTime())) {
      if (Platform.OS === 'web') {
        window.alert('Error: Start Date format is invalid.');
      } else {
        Alert.alert('Error', 'Start Date format is invalid.');
      }
      return;
    }

    if (isNaN(deadlineDate.getTime())) {
      if (Platform.OS === 'web') {
        window.alert('Error: Deadline format is invalid.');
      } else {
        Alert.alert('Error', 'Deadline format is invalid.');
      }
      return;
    }

    if (visible.getTime() < now.getTime()) {
      if (Platform.OS === 'web') {
        window.alert('Error: Start Date cannot be before now.');
      } else {
        Alert.alert('Error', 'Start Date cannot be before now.');
      }
      return;
    }

    if (deadlineDate.getTime() <= visible.getTime()) {
      if (Platform.OS === 'web') {
        window.alert('Error: Deadline must be after Start Date.');
      } else {
        Alert.alert('Error', 'Deadline must be after Start Date.');
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('visibleDate', visibleDate);
      formData.append('deadline', deadline);
      formData.append('quarter', quarter.trim());
      formData.append('description', description.trim());
      
      if (points.trim()) {
        formData.append('points', points.trim());
      } else if (isEditing) {
        formData.append('points', '');
      }

      // Handle file upload
      if (file) {
        if (Platform.OS === 'web') {
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
      
      // Show success message
      if (Platform.OS === 'web') {
        window.alert(
          isEditing ? 'Activity updated successfully!' : 'Activity created successfully!'
        );
      } else {
        Alert.alert(
          'Success',
          isEditing ? 'Activity updated successfully!' : 'Activity created successfully!'
        );
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('🚨 Save Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to save activity.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#23272F' : '#fff',
            borderRadius: 12,
            padding: 24,
            minWidth: 300,
            maxWidth: 500,
            width: '90%',
          }}
        >
          <Text
            className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ fontSize: 18, marginBottom: 12 }}
          >
            {isEditing ? 'Edit Activity' : 'Add Activity'}
          </Text>

          {/* Title */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Title:
          </Text>
          <TextInput
            placeholder="Enter title..."
            value={title}
            onChangeText={setTitle}
            className={`font-inter_regular ${
              isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'
            }`}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />

          {/* Start Date */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Start Date:
          </Text>
          {Platform.OS === 'web' ? (
            <input
              type="datetime-local"
              value={visibleDate}
              onChange={(e) => setVisibleDate(e.target.value)}
              min={nowISO}
              className={`font-inter_regular text-sm ${
                isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'
              }`}
              style={{
                width: '100%',
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowVisibleDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CalendarIcon
                  width={20}
                  height={20}
                  fill={isDarkMode ? '#E0E0E0' : '#6b7280'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: visibleDate
                      ? isDarkMode
                        ? '#E0E0E0'
                        : 'black'
                      : isDarkMode
                      ? '#9ca3af'
                      : '#6b7280',
                  }}
                >
                  {visibleDate
                    ? new Date(visibleDate).toLocaleString()
                    : 'Select Start Date & Time'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {showVisibleDatePicker && (
            <DateTimePicker
              value={visibleDate ? new Date(visibleDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, date) =>
                onChangeDatePicker(
                  event,
                  date,
                  setVisibleDate,
                  setShowVisibleTimePicker,
                  setShowVisibleDatePicker
                )
              }
            />
          )}

          {showVisibleTimePicker && (
            <DateTimePicker
              value={visibleDate ? new Date(visibleDate) : new Date()}
              mode="time"
              display="default"
              onChange={(event, time) =>
                onChangeTimePicker(
                  event,
                  time,
                  visibleDate.slice(0, 10),
                  setVisibleDate,
                  setShowVisibleTimePicker
                )
              }
            />
          )}

          {/* Deadline */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Deadline:
          </Text>
          {Platform.OS === 'web' ? (
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={visibleDate || nowISO}
              className={`font-inter_regular text-sm ${
                isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'
              }`}
              style={{
                width: '100%',
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowDeadlineDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CalendarIcon
                  width={20}
                  height={20}
                  fill={isDarkMode ? '#E0E0E0' : '#6b7280'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: deadline
                      ? isDarkMode
                        ? '#E0E0E0'
                        : 'black'
                      : isDarkMode
                      ? '#9ca3af'
                      : '#6b7280',
                  }}
                >
                  {deadline
                    ? new Date(deadline).toLocaleString()
                    : 'Select Deadline Date & Time'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {showDeadlineDatePicker && (
            <DateTimePicker
              value={deadline ? new Date(deadline) : new Date()}
              mode="date"
              display="default"
              onChange={(event, date) =>
                onChangeDatePicker(
                  event,
                  date,
                  setDeadline,
                  setShowDeadlineTimePicker,
                  setShowDeadlineDatePicker
                )
              }
            />
          )}

          {showDeadlineTimePicker && (
            <DateTimePicker
              value={deadline ? new Date(deadline) : new Date()}
              mode="time"
              display="default"
              onChange={(event, time) =>
                onChangeTimePicker(
                  event,
                  time,
                  deadline.slice(0, 10),
                  setDeadline,
                  setShowDeadlineTimePicker
                )
              }
            />
          )}

          {/* Quarter Picker */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Quarter:
          </Text>
          {Platform.OS === 'web' ? (
            <Picker
              selectedValue={quarter}
              onValueChange={(itemValue) => setQuarter(itemValue)}
              style={{
                height: 40,
                width: '100%',
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                color: isDarkMode ? '#E0E0E0' : 'black',
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                paddingHorizontal: 8,
                fontFamily: 'Inter-18pt-Regular',
                fontSize: 14,
                marginBottom: 8,
              }}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              mode='dropdown'
            >
              <Picker.Item label="First Quarter" value="First Quarter" />
              <Picker.Item label="Second Quarter" value="Second Quarter" />
              <Picker.Item label="Third Quarter" value="Third Quarter" />
              <Picker.Item label="Fourth Quarter" value="Fourth Quarter" />
            </Picker>
          ) : (
            <View
              style={{
                height: 55,
                width: '100%',
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                paddingHorizontal: 8,
                marginBottom: 8,
              }}
            >
              <Picker
                selectedValue={quarter}
                onValueChange={(itemValue) => setQuarter(itemValue)}
                style={{
                  color: isDarkMode ? '#E0E0E0' : 'black',
                  fontFamily: 'Inter-18pt-Regular',
                  fontSize: 14,
                }}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode='dropdown'
              >
                <Picker.Item label="First Quarter" value="First Quarter" />
                <Picker.Item label="Second Quarter" value="Second Quarter" />
                <Picker.Item label="Third Quarter" value="Third Quarter" />
                <Picker.Item label="Fourth Quarter" value="Fourth Quarter" />
              </Picker>
            </View>
          )}

          {/* Description */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Description:
          </Text>
          <TextInput
            placeholder="Enter description..."
            value={description}
            onChangeText={setDescription}
            multiline
            className={`font-inter_regular ${
              isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'
            }`}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />

          {/* Points */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Points (optional):
          </Text>
          <TextInput
            placeholder="e.g., 100"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
            className={`font-inter_regular ${
              isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'
            }`}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />

          {/* Attachment */}
          <Text
            className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            style={{ marginBottom: 4 }}
          >
            Attachment (optional):
          </Text>
          
          {attachmentPath && isEditing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text
                className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                style={{ flex: 1 }}
              >
                Current: {attachmentPath.split('/').pop()}
              </Text>
              <TouchableOpacity
                onPress={() => setAttachmentPath(null)}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  marginLeft: 8,
                }}
              >
                <Text
                  className={`text-white font-pbold text-xs ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-white'
                  }`}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickDocument}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <AttachIcon
                width={20}
                height={20}
                fill={isDarkMode ? '#E0E0E0' : '#6b7280'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: file
                    ? isDarkMode
                      ? '#E0E0E0'
                      : 'black'
                    : isDarkMode
                    ? '#9ca3af'
                    : '#6b7280',
                }}
              >
                {file
                  ? Platform.OS === 'web'
                    ? (file as File).name
                    : (file as DocumentPicker.DocumentPickerAsset).name
                  : 'Pick a file'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Checkbox for setting the activity inactive when past deadline */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Checkbox
              value={inactiveAfterDeadline}
              onValueChange={setInactiveAfterDeadline}
              color={inactiveAfterDeadline ? '#A78BFA' : undefined}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              Set inactive after deadline (Not implemented)
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
              onPress={handleSubmit}
              style={{
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                padding: 8
              }}
            >
              <Text
                className={`font-pbold text-sm text-center ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-white'
                }`}
              >
                {isEditing ? 'Save Changes' : 'Add Activity'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
              onPress={onClose}
              style={{
                borderRadius: 8,
                flex: 1,
                padding: 8
              }}
            >
              <Text
                className={`font-pbold text-sm text-center ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-white'
                }`}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddEditActivityModal;