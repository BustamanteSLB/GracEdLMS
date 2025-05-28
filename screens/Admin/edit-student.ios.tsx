import { View, Text, useColorScheme, Keyboard, KeyboardAvoidingView, Platform, TextInput, Alert, ActivityIndicator } from 'react-native'
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

const EditStudentIOS = () => {

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
    bio?: string;
    sex: 'Male' | 'Female' | 'Other';
    gender?: string;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [student, setStudent] = useState<User | null>(null);
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

  //Form states
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');

  // Fetch student data on component mount or ID change
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/users/${id}`);
        const fetchedData: UserData = response.data.data;
        setUserData(fetchedData);

        // Populate form fields with fetched data
        setUsername(fetchedData.username || '');
        setFirstName(fetchedData.firstName || '');
        setMiddleName(fetchedData.middleName || '');
        setLastName(fetchedData.lastName || '');
        setEmail(fetchedData.email || '');
        setPhoneNumber(fetchedData.phoneNumber || '');
        setAddress(fetchedData.address || '');
        setBio(fetchedData.bio || '');
        setSex(fetchedData.sex || 'Male');
        setGender(fetchedData.gender || '');
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

  const handleEditStudent = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    // 1. Update user details
    try {
      const updatedData = {
        username,
        firstName,
        middleName,
        lastName,
        email,
        phoneNumber,
        address,
        bio,
        sex,
        gender,
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
      Alert.alert('Success', successMessages.join('\n'));
      router.replace('/(admins)/student-list'); // Navigate back on full success
    } else if (errorMessages.length > 0) {
      Alert.alert('Error', errorMessages.join('\n'));
    } else {
      Alert.alert('No Changes', 'No updates were submitted.'); // Case where nothing was entered and no error
    }
  };

    // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading Student data...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'} />
      </SafeAreaView>
    );
  }

  if (error && !student) { // Show error if initial data fetch failed and no student data is available
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center text-red-500 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          Error: {error}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'} />
      </SafeAreaView>
    );
  }

  cssInterop(Picker, { className: "style" });

  return (
    <SafeAreaView className='flex-1 h-full bg-primary-android'>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView contentContainerStyle={{ 
            flexGrow: 1, 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16 
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <View className={`w-full rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
            <Text className={`font-inter_bold text-center text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Edit Student Account
            </Text>

            <Text className={`ml-2 mt-4 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Username:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter first name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              First Name:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter first name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Middle Name:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter middle name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={middleName}
                onChangeText={setMiddleName}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Last Name:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter last name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Sex:
            </Text>
            <View className={`overflow-hidden border rounded-xl mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <Picker
                style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 14, padding: 12 }}
                selectedValue={sex}
                onValueChange={(itemValue) => setSex(itemValue)}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode='dropdown'
              >
                <Picker.Item label="Select Sex" value="" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}} />
                {sexList.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} style={{ fontFamily: 'Inter-18pt-Regular', fontSize: 14 }}  />
                ))}
              </Picker>
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Gender:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter gender"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={gender}
                onChangeText={setGender}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Email Address:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter email"
                keyboardType="email-address"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              New Password:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter new password"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Confirm Password:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Confirm new password"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Phone Number:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={16}
              />
            </View>
            <Text className={`ml-2 mb-2 font-inter_regular text-xs ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>
              Phone number should be in this format: +63 XXX XXX XXXX
            </Text>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Address:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter address"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                multiline={true}
                selectionColor="#3B82F6"
                value={address}
                onChangeText={setAddress}
              />
            </View>
            <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Bio:
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-4 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter bio"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                multiline={true}
                selectionColor="#3B82F6"
                value={bio}
                onChangeText={setBio}
              />
            </View>
            <CustomButton
              containerStyles='bg-secondary-ios h-[55px] mb-4'
              handlePress={handleEditStudent}
              title={submitting ? 'Editing' : 'Edit Student'}
              isLoading={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default EditStudentIOS