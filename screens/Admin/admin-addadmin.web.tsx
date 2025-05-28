import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '@/components/CustomButton';
import { useDarkMode } from '@/contexts/DarkModeContext';
import apiClient from '@/app/services/apiClient';
import { useRouter } from 'expo-router';
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

const AddAdminWeb = () => {
  const { isDarkMode } = useDarkMode();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const inputClass = `border p-3 mb-3 rounded ${
    isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-black'
  }`;

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    sex: '',      // required
    gender: '',   // optional
    bio: '',      // optional
    role: 'Admin', // fixed
    profilePicture: null,
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    const required: (keyof typeof formData)[] = [
      'username',
      'firstName',
      'lastName',
      'email',
      'password',
      'phoneNumber',
      'address',
      'sex',
    ];
    for (let key of required) {
      if (!formData[key] || formData[key].toString().trim() === '') {
        showAlert('Missing Field', `${key} is required.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    console.log('🔔 handleSubmit fired', formData);
    showAlert('Debug', 'handleSubmit called');

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔑 Stored token:', token);

      const response = await apiClient.post(
        '/users',
        formData,
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
      );
      console.log('📨 API response:', response);

      if (response.data.success) {
        showAlert('Success', 'Admin created successfully');
        router.push('/admin-list');
      } else {
        showAlert('Error', response.data.message || 'Unexpected response');
      }
    } catch (err: any) {
      console.error('🚨 Submit error:', err);
      showAlert(
        'Error',
        err.response?.data?.message || err.message || 'Unknown error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  cssInterop(Image, { className: 'style' });

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
            Add New Admin
          </Text>

          {/* Username */}
          <TextInput
            placeholder="Username"
            value={formData.username}
            onChangeText={(t) => handleChange('username', t)}
            className={inputClass}
          />

          {/* First Name */}
          <TextInput
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(t) => handleChange('firstName', t)}
            className={inputClass}
          />

          {/* Middle Name */}
          <TextInput
            placeholder="Middle Name"
            value={formData.middleName}
            onChangeText={(t) => handleChange('middleName', t)}
            className={inputClass}
          />

          {/* Last Name */}
          <TextInput
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(t) => handleChange('lastName', t)}
            className={inputClass}
          />

          {/* Email */}
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(t) => handleChange('email', t)}
            className={inputClass}
          />

          {/* Password */}
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={formData.password}
            onChangeText={(t) => handleChange('password', t)}
            className={inputClass}
          />

          {/* Phone Number */}
          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(t) => handleChange('phoneNumber', t)}
            className={inputClass}
          />

          {/* Address */}
          <TextInput
            placeholder="Address"
            value={formData.address}
            onChangeText={(t) => handleChange('address', t)}
            className={inputClass}
          />

          {/* Sex Picker */}
          <View
            className={`border rounded mb-3 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}
          >
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

          {/* Gender Picker */}
          <View
            className={`border rounded mb-3 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}
          >
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

          {/* Bio */}
          <TextInput
            placeholder="Bio"
            value={formData.bio}
            onChangeText={(t) => handleChange('bio', t)}
            className={inputClass}
            multiline
          />

          {/* Submit */}
          <CustomButton
            title={isSubmitting ? 'Submitting…' : 'Add Admin'}
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

export default AddAdminWeb;
