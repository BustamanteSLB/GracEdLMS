import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, ScrollView, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '@/components/CustomButton';
import { useDarkMode } from '@/contexts/DarkModeContext';
import apiClient from '@/app/services/apiClient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

function showAlert(title: string, message?: string) {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

const EditAdminWeb = () => {
  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const inputClass = `border p-3 mb-3 rounded ${
    isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'
  }`;

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    sex: '',
    gender: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch existing admin on mount
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiClient.get(`/users/${id}`);
        if (res.data.success) {
          const u = res.data.data;
          setFormData({
            username: u.username || '',
            firstName: u.firstName || '',
            middleName: u.middleName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phoneNumber: u.phoneNumber || '',
            address: u.address || '',
            sex: u.sex || '',
            gender: u.gender || '',
            bio: u.bio || '',
          });
        } else {
          showAlert('Error', res.data.message || 'Failed to load admin');
          router.back();
        }
      } catch (err: any) {
        console.error(err);
        showAlert('Error', err.response?.data?.message || err.message);
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async () => {
    // Debug
    console.log('🔔 update fired', formData);
    showAlert('Debug', 'update called');

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔑 Stored token:', token);
      showAlert('Token', token?.substr(0, 10) + '…');

      const res = await apiClient.put(
        `/users/${id}`,
        formData,
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
      );
      console.log('📨 update response:', res);

      if (res.data.success) {
        showAlert('Success', 'Admin updated successfully');
        router.push('/admin-list');
      } else {
        showAlert('Error', res.data.message || 'Update failed');
      }
    } catch (err: any) {
      console.error('🚨 Update error:', err);
      showAlert('Error', err.response?.data?.message || err.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  cssInterop(Image, { className: 'style' });

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'}`}>Loading...</Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-web">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View
          className={`w-full max-w-xl self-center p-4 rounded-xl ${
            isDarkMode ? 'bg-[#121212]' : 'bg-white'
          } shadow-lg`}
        >
          <Text
            className={`text-center text-2xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-black'
            }`}
          >
            Edit Admin
          </Text>

          <TextInput
            placeholder="Username"
            value={formData.username}
            onChangeText={(t) => handleChange('username', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(t) => handleChange('firstName', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="Middle Name"
            value={formData.middleName}
            onChangeText={(t) => handleChange('middleName', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(t) => handleChange('lastName', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(t) => handleChange('email', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(t) => handleChange('phoneNumber', t)}
            className={inputClass}
          />
          <TextInput
            placeholder="Address"
            value={formData.address}
            onChangeText={(t) => handleChange('address', t)}
            className={inputClass}
          />

          {/* Sex */}
          <View className={`border rounded mb-3 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <Picker
              selectedValue={formData.sex}
              onValueChange={(v) => handleChange('sex', v)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              style={{
                color: isDarkMode ? '#E0E0E0' : 'black',
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              }}
            >
              <Picker.Item label="Select Sex" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Don't want to say" value="Don't want to say" />
            </Picker>
          </View>

          {/* Gender */}
          <View className={`border rounded mb-3 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(v) => handleChange('gender', v)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              style={{
                color: isDarkMode ? '#E0E0E0' : 'black',
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              }}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Don't want to say" value="Don't want to say" />
            </Picker>
          </View>

          <TextInput
            placeholder="Bio"
            value={formData.bio}
            onChangeText={(t) => handleChange('bio', t)}
            className={inputClass}
            multiline
          />

          <CustomButton
            title={isSubmitting ? 'Updating…' : 'Update Admin'}
            handlePress={handleSubmit}
            isLoading={isSubmitting}
            containerStyles="bg-secondary-web h-[55px] mt-4"
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default EditAdminWeb;
