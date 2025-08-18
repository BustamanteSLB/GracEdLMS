import { View, Text, useColorScheme, TextInput, Alert, ActivityIndicator, Keyboard, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDarkMode } from '../../contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '@/components/CustomButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types';

const EditUserWeb = () => {

  interface UserData {
    _id: string;
    userId: string;
    username: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address: string;
    role: 'Admin' | 'Teacher' | 'Student';
    profilePicture?: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
    sex: 'Male' | 'Female' | 'Other';
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const sexList = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  // Form states
  const [profilePicture, setProfilePicture] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  // New state variables for status and role
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended' | 'pending' | 'archived'>('active');
  const [role, setRole] = useState<'Admin' | 'Teacher' | 'Student'>('Student');

  // Fetch user data on component mount or ID change
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/users/${id}`);
        const fetchedData: UserData = response.data.data;
        setUserData(fetchedData);

        // Populate form fields with fetched data
        setProfilePicture(fetchedData.profilePicture || '');
        setUserId(fetchedData.userId || '');
        setUsername(fetchedData.username || '');
        setFirstName(fetchedData.firstName || '');
        setMiddleName(fetchedData.middleName || '');
        setLastName(fetchedData.lastName || '');
        setEmail(fetchedData.email || '');
        setPhoneNumber(fetchedData.phoneNumber || '');
        setAddress(fetchedData.address || '');
        setSex(fetchedData.sex || 'Male');
        setStatus(fetchedData.status || 'active'); // Initialize status
        setRole(fetchedData.role || 'Student');   // Initialize role
      } catch (err: any) {
        console.error('Error fetching user data:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch user data.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    } else {
      setError('No user ID provided.');
      setLoading(false);
    }
  }, [id]);

  const handleEditUser = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    // 1. Update user details including status and role
    try {
      const updatedData = {
        userId, // Allow userId to be updated by admin
        username,
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        address,
        sex,
        status, // Added status
        role,   // Added role
        profilePicture: profilePicture, // Use provided URL or null if empty
      };

      const response = await apiClient.put(`/users/${id}`, updatedData);
      successMessages.push('User details updated successfully!');
      setUserData(response.data.data); // Update local state with fresh data
    } catch (err: any) {
      console.error('Error updating user details:', err.response?.data || err.message);
      errorMessages.push(err.response?.data?.message || 'Failed to update user details.');
    }

    // 2. Conditionally update password
    if (newPassword !== '' || confirmNewPassword !== '') {
      if (newPassword === '') {
        errorMessages.push('New password cannot be empty.');
      } else if (newPassword !== confirmNewPassword) {
        errorMessages.push('New passwords do not match.');
      } else if (newPassword.length < 8) {
        errorMessages.push('New password must be at least 8 characters long.');
      }

      if (errorMessages.length === 0) { // Only proceed with password update if no validation errors so far
        try {
          await apiClient.put(`/users/${id}/password`, { newPassword });
          successMessages.push('User password updated successfully!');
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
      router.replace('/(admins)/user-management'); // Navigate back on full success
    } else if (errorMessages.length > 0) {
      window.alert('Error: ' + errorMessages.join('\n'));
    } else {
      window.alert('No Changes: No updates were submitted.');
    }
  };

    // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading User data...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'} />
      </SafeAreaView>
    );
  }

  if (error && !userData) { // Show error if initial data fetch failed and no user data is available
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
            Edit User Account
          </Text>
          {/* Profile Picture URL */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Profile Picture URL:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Image Url (e.g. https://example.com/image.jpg)"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            selectionColor="#6D28D9"
            value={profilePicture}
            onChangeText={setProfilePicture}
          />
          {/* User ID */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            User ID:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter user ID"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={userId}
            onChangeText={setUserId}
            maxLength={20} 
          />
          {/* Username */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Username:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter first name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={username}
            onChangeText={setUsername}
            maxLength={30} 
          />
          {/* First Name */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            First Name:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter first name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={firstName}
            onChangeText={setFirstName}
            maxLength={50} 
          />
          {/* Middle Name */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Middle Name:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter middle name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={middleName}
            onChangeText={setMiddleName}
          />
           {/* Last Name */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Last Name:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter last name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={lastName}
            onChangeText={setLastName}
            maxLength={50} 
          />
          {/* Sex */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Sex:
          </Text>
          <Picker
            style={{ 
              backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              borderWidth: 1,
              borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
              borderRadius: 6,
              color: isDarkMode ? '#E0E0E0' : 'black', 
              overflow: 'hidden',
              width: '100%', 
              fontFamily: 'Inter-18pt-Regular', 
              fontSize: 16, 
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,  
            }}
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
          {/* Role */}
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Role:
          </Text>
          <Picker
            style={{ 
              backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              borderWidth: 1,
              borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
              borderRadius: 6,
              color: isDarkMode ? '#E0E0E0' : 'black', 
              overflow: 'hidden',
              width: '100%', 
              fontFamily: 'Inter-18pt-Regular', 
              fontSize: 16, 
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,  
            }}
            selectedValue={role}
            onValueChange={(itemValue) => setRole(itemValue)}
            dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
            mode='dropdown'
          >
            <Picker.Item label="Admin" value="Admin" />
            <Picker.Item label="Student" value="Student" />
            <Picker.Item label="Teacher" value="Teacher" />
          </Picker>
          {/* Status */}
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Status:
          </Text>
          <Picker
            style={{ 
              backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              borderWidth: 1,
              borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
              borderRadius: 6,
              color: isDarkMode ? '#E0E0E0' : 'black', 
              overflow: 'hidden',
              width: '100%', 
              fontFamily: 'Inter-18pt-Regular', 
              fontSize: 16, 
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,  
            }}
            selectedValue={status}
            onValueChange={(itemValue) => setStatus(itemValue)}
            dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
            mode='dropdown'
          >
            <Picker.Item label="Active" value="active" />
            <Picker.Item label="Inactive" value="inactive" />
            <Picker.Item label="Suspended" value="suspended" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Archived" value="archived" />
          </Picker>
          {/* Email */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Email:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter email"
            keyboardType="email-address"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={email}
            onChangeText={setEmail}
            maxLength={50} 
          />
          {/* New Password */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            New Password:
          </Text>
          <View className={`flex-row items-center border rounded-md mb-2 px-4 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter new password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={newPassword}
              onChangeText={setNewPassword}
              maxLength={25} 
            />
          </View>
          {/* Confirm New Password */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Confirm Password:
          </Text>
          <View className={`flex-row items-center border rounded-md mb-2 px-3 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Confirm new password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              maxLength={25} 
            />
          </View>
          {/* Phone Number */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Phone Number:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={13}
          />
          <Text className={`ml-2 mb-2 font-inter_regular text-xs ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>
            Format: +639XXXXXXXXX or 09XXXXXXXXX
          </Text>
          {/* Address */}
          <Text className={`ml-2 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Address:
          </Text>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter address"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            multiline={true}
            selectionColor="#6D28D9"
            value={address}
            onChangeText={setAddress}
            maxLength={150} 
          />
          
          <CustomButton
            containerStyles='bg-secondary-web mt-2'
            handlePress={handleEditUser}
            title={submitting ? 'Editing...' : 'Edit User'}
            isLoading={submitting}
          />
          <TouchableOpacity
            className='bg-gray-400 rounded-xl h-[50px] w-full justify-center items-center p-2 mt-4'
            onPress={() => router.push('/(admins)/user-management')}
            activeOpacity={0.7}
          >
            <Text className='text-black font-psemibold text-lg'>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default EditUserWeb