import { View, Text, useColorScheme, TextInput, Alert, ActivityIndicator, Keyboard, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '@/components/CustomButton';
import { useRouter } from 'expo-router';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { User } from '@/app/types';

const EditProfileWeb = () => { // Correct function component syntax

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user, fetchCurrentUser, isLoading: authIsLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const sexList = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  const [profilePicture, setProfilePicture] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setSex(user.sex || 'Male');
      setLoading(false);
    } else if (!authIsLoading) {
      setError('User data not available.');
      setLoading(false);
    }
  }, [user, authIsLoading]);

  const handleEditProfile = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    try {
      // Initialize updatedData without middleName initially
      const updatedData: { [key: string]: any } = {
        profilePicture,
        email,
        phoneNumber,
        address,
        sex,
      };
      
      const response = await apiClient.put('/auth/updateme', updatedData);
      successMessages.push('Profile details updated successfully!');
      fetchCurrentUser();
    } catch (err: any) {
      console.error('Error updating profile details:', err.response?.data || err.message);
      errorMessages.push(err.response?.data?.message || 'Failed to update profile details.');
    }

    if (newPassword !== '' || confirmNewPassword !== '') {
      if (newPassword === '') {
        errorMessages.push('New password cannot be empty.');
      } else if (newPassword !== confirmNewPassword) {
        errorMessages.push('New passwords do not match.');
      } else if (newPassword.length < 8) {
        errorMessages.push('New password must be at least 8 characters long.');
      }

      if (errorMessages.length === 0) {
        try {
          await apiClient.put('/auth/updatepassword', { currentPassword: 'users_current_password', newPassword });
          successMessages.push('Password updated successfully!');
          setNewPassword('');
          setConfirmNewPassword('');
        } catch (err: any) {
          console.error('Error updating password:', err.response?.data || err.message);
          errorMessages.push(err.response?.data?.message || 'Failed to update password.');
        }
      }
    }

    setSubmitting(false);

    if (successMessages.length > 0 && errorMessages.length === 0) {
      window.alert('Success: ' + successMessages.join('\n'));
      router.replace('/(students)/profile');
    } else if (errorMessages.length > 0) {
      window.alert('Error: ' + errorMessages.join('\n'));
    } else {
      window.alert('No Changes: No updates were submitted.');
    }
  };

  if (loading || authIsLoading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0}' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading Profile data...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'} />
      </SafeAreaView>
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center text-red-500 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          Error: {error}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className='flex-1 h-full bg-primary-web'>
      <ScrollView contentContainerStyle={{ 
        flexGrow: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 16 
      }}>
        <View className={`w-full max-w-3xl rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
          <Text className={`font-inter_bold text-center text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Edit Your Profile
          </Text>
        
          <Text className={`ml-2 mt-4 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Profile Picture URL:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px] 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Image Url (e.g. https://example.com/image.jpg)"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={profilePicture}
              onChangeText={setProfilePicture}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Email:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter email"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Sex:
          </Text>
          <View className={`overflow-hidden border rounded-xl mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <Picker
              style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 16, padding: 12 }}
              selectedValue={sex}
              onValueChange={(itemValue) => setSex(itemValue)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              mode='dropdown'
            >
              <Picker.Item label="Select Sex" value="" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}} />
                {sexList.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} style={{ fontFamily: 'Inter-18pt-Regular', fontSize: 16 }}  />
              ))}
            </Picker>
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            New Password:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter new password"
              placeholderTextColor={isDarkMode ? '#E0E0E0}' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Confirm Password:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Confirm new password"
              placeholderTextColor={isDarkMode ? '#E0E0E0}' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Phone Number:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              placeholderTextColor={isDarkMode ? '#E0E0E0}' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={16}
            />
          </View>
          <Text className={`ml-2 mb-2 font-inter_regular text-xs ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>
            Format: +639XXXXXXXXX or 09XXXXXXXXX
          </Text>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Address:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter address"
              placeholderTextColor={isDarkMode ? '#E0E0E0}' : 'black'}
              autoCapitalize="none"
              multiline={true}
              selectionColor="#6D28D9"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          
          <CustomButton
            containerStyles='bg-secondary-web h-[55px] mt-2'
            handlePress={handleEditProfile}
            title={submitting ? 'Updating' : 'Save Changes'}
            isLoading={submitting}
          />
          <TouchableOpacity
            className='bg-gray-400 rounded-xl h-[55px] w-full justify-center items-center p-2 mt-4'
            onPress={() => router.push('/(students)/profile')}
            activeOpacity={0.7}
          >
            <Text className='text-black font-psemibold text-lg'>
              Back to Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}/>
    </SafeAreaView>
  )
}

export default EditProfileWeb