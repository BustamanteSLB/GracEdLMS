import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import apiClient from '@/app/services/apiClient';

interface SchoolData {
  _id?: string;
  name: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  stats: {
    studentsEnrolled: string;
    yearsOfExcellence: string;
    dedicatedTeachers: string;
    graduates: string;
  };
  mission: string;
  vision: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
}

interface EditSchoolInfoModalProps {
  visible: boolean;
  onClose: () => void;
  schoolData: SchoolData;
  onSave: () => void;
  isDarkMode: boolean;
}

const EditSchoolInfoModal: React.FC<EditSchoolInfoModalProps> = ({
  visible,
  onClose,
  schoolData,
  onSave,
  isDarkMode,
}) => {
  const [formData, setFormData] = useState<SchoolData>(schoolData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(schoolData);
  }, [schoolData]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const response = await apiClient.put('/school', formData);

      if (response.data.success) {
        if (Platform.OS === 'web') {
          alert('School information updated successfully!');
        } else {
          Alert.alert('Success', 'School information updated successfully!');
        }
        onSave();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating school info:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update school information';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F9FAFB' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            Edit School Information
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
              }}
            >
              Basic Information
            </Text>

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              School Name
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter school name"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
            />

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Tagline
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.tagline}
              onChangeText={(text) => setFormData({ ...formData, tagline: text })}
              placeholder="Enter tagline"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
            />
          </View>

          {/* Hero Section */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
              }}
            >
              Hero Section
            </Text>

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Hero Title
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.heroTitle}
              onChangeText={(text) => setFormData({ ...formData, heroTitle: text })}
              placeholder="Enter hero title"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
            />

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Hero Subtitle
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.heroSubtitle}
              onChangeText={(text) => setFormData({ ...formData, heroSubtitle: text })}
              placeholder="Enter hero subtitle"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              multiline
            />
          </View>

          {/* Statistics */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
              }}
            >
              Statistics
            </Text>

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 8, fontFamily: 'Inter-Medium', fontSize: 12 }}>
              Note: Students Enrolled and Dedicated Teachers are automatically calculated from active accounts and cannot be edited here.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
                  Years of Excellence
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                    borderRadius: 8,
                    padding: 12,
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    fontFamily: 'Inter-Regular',
                  }}
                  value={formData.stats.yearsOfExcellence}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      stats: { ...formData.stats, yearsOfExcellence: text },
                    })
                  }
                  placeholder="30+"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
                  Graduates
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                    borderRadius: 8,
                    padding: 12,
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    fontFamily: 'Inter-Regular',
                  }}
                  value={formData.stats.graduates}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      stats: { ...formData.stats, graduates: text },
                    })
                  }
                  placeholder="2000+"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>
            </View>
          </View>

          {/* Mission & Vision */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
              }}
            >
              Mission & Vision
            </Text>

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Mission
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                height: 100,
                textAlignVertical: 'top',
                fontFamily: 'Inter-Regular',
              }}
              value={formData.mission}
              onChangeText={(text) => setFormData({ ...formData, mission: text })}
              placeholder="Enter school mission"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              multiline
            />

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Vision
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                height: 100,
                textAlignVertical: 'top',
                fontFamily: 'Inter-Regular',
              }}
              value={formData.vision}
              onChangeText={(text) => setFormData({ ...formData, vision: text })}
              placeholder="Enter school vision"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              multiline
            />
          </View>

          {/* Contact Information */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
              }}
            >
              Contact Information
            </Text>

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Email
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.contact.email}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: text },
                })
              }
              placeholder="school@example.com"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              keyboardType="email-address"
            />

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Phone
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                fontFamily: 'Inter-Regular',
              }}
              value={formData.contact.phone}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, phone: text },
                })
              }
              placeholder="+639288516764"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              keyboardType="phone-pad"
            />

            <Text style={{ color: isDarkMode ? '#D1D5DB' : '#6B7280', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
              Address
            </Text>
            <TextInput
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 12,
                height: 80,
                textAlignVertical: 'top',
                fontFamily: 'Inter-Regular',
              }}
              value={formData.contact.address}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, address: text },
                })
              }
              placeholder="Enter school address"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              multiline
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9CA3AF' : '#10B981',
              padding: 14,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontFamily: 'Inter-Bold' }}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EditSchoolInfoModal;