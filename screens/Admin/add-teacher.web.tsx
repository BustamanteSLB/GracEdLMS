import { View, Text, useColorScheme, KeyboardAvoidingView, Platform, TextInput } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDarkMode } from '../../contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import CustomButton from '@/components/CustomButton';
import { useRouter } from 'expo-router';
import apiClient, { ApiResponse } from '@/app/services/apiClient';

const AddTeacherWeb = () => {

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

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password fields for new user creation
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');

  const handleAddTeacher = async () => {
    // No Keyboard.dismiss() for web as it's not relevant
    setSubmitting(true);
    setError(null);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    // Basic validation for required fields for a new teacher
    if (!username || !firstName || !lastName || !email || !password || !confirmPassword || !phoneNumber || !address || !sex) {
      errorMessages.push('Please fill in all required fields (Username, First Name, Last Name, Email, Password, Confirm Password, Phone Number, Address, Sex).');
    }

    if (password === '') {
      errorMessages.push('Password cannot be empty.');
    } else if (password !== confirmPassword) {
      errorMessages.push('Passwords do not match.');
    } else if (password.length < 8) {
      errorMessages.push('Password must be at least 8 characters long.');
    }

    if (errorMessages.length > 0) {
      setSubmitting(false);
      window.alert('Validation Error:\n' + errorMessages.join('\n')); // Changed to window.alert
      return;
    }

    // Attempt to add new teacher
    try {
      const newTeacherData = {
        username,
        firstName,
        middleName,
        lastName,
        email,
        password, // Include password for creation
        phoneNumber,
        address,
        bio,
        sex,
        gender,
        role: 'Teacher', // Explicitly set role to 'Teacher'
        status: 'active', // Default status for new teacher, adjust if 'pending' is needed
      };

      const response = await apiClient.post('/users', newTeacherData); // Use POST for creation
      successMessages.push('Teacher account added successfully!');
      // Clear form fields after successful submission
      setUsername('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhoneNumber('');
      setAddress('');
      setBio('');
      setSex('Male'); // Reset to default
      setGender('');

    } catch (err: any) {
      console.error('Error adding teacher:', err.response?.data || err.message);
      errorMessages.push(err.response?.data?.message || 'Failed to add teacher.');
    }

    setSubmitting(false);

    if (successMessages.length > 0 && errorMessages.length === 0) {
      window.alert('Success:\n' + successMessages.join('\n')); // Changed to window.alert
      router.replace('/(admins)/teacher-list'); // Navigate back on full success
    } else if (errorMessages.length > 0) {
      window.alert('Error:\n' + errorMessages.join('\n')); // Changed to window.alert
    } else {
      window.alert('No Changes: No data was submitted.'); // Should ideally not happen if validation passes
    }
  };

  // --- Render Logic ---
  // No loading state for initial render as no data is fetched
  if (error) { // Only show error if an error occurred during submission
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
            Add Teacher Account
          </Text>
        
          <Text className={`ml-2 mt-4 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Username:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px] 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter first name"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            First Name:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px] 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter first name"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Middle Name:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter middle name"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={middleName}
              onChangeText={setMiddleName}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Last Name:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter last name"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={lastName}
              onChangeText={setLastName}
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
            Gender:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter gender"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={gender}
              onChangeText={setGender}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Email Address:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter email"
              keyboardType="email-address"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Password:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter password"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={password}
              onChangeText={setPassword}
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
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
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
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter address"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              multiline={true}
              selectionColor="#6D28D9"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Bio:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-4 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>  
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter bio"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="none"
              multiline={true}
              selectionColor="#6D28D9"
              value={bio}
              onChangeText={setBio}
            />
          </View>
          <CustomButton
            containerStyles='bg-secondary-web h-[55px] mb-4'
            handlePress={handleAddTeacher}
            title={submitting ? 'Adding' : 'Add Teacher'}
            isLoading={submitting}
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default AddTeacherWeb