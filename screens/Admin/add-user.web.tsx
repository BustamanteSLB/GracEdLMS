import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';
import apiClient from '@/app/services/apiClient'
import * as ImagePicker from 'expo-image-picker';

cssInterop(Image, { className: "style" }); // Keep this if Image is still used

const AddUserWeb = () => {

  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  // User data states, initialized to empty strings or null
  const [profilePicture, setProfilePicture] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [role, setRole] = useState<'Admin' | 'Student' | 'Teacher' | null>(null);
  // Removed status state since it will be set automatically

  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  // Function to handle registration
  const handleAddUser = async () => {
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      window.alert('Error: Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    // Removed status from validation check since it's set automatically
    if (!username || !firstName || !lastName || !email || !password || !phoneNumber || !address || !sex || !role) {
      window.alert('Error: Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/register', {
        username,
        firstName,
        middleName,
        lastName,
        email,
        password,
        phoneNumber,
        address,
        sex,
        role,
        status: 'active', // Automatically set status to 'active' when admin creates user
        profilePicture: profilePicture // Use the provided URL or null if empty
      });

      if (response.data.success) {
        window.alert('Success: User account created successfully with active status!');
        router.replace('/(admins)/user-management');
      } else {
        window.alert(`Registration Failed: ${response.data.message || 'Something went wrong.'}`);
      }
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      window.alert(`Registration Failed: ${error.response?.data?.message || 'An unexpected error occurred during registration.'}`);
    } finally {
      setProfilePicture('');
      setUsername('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhoneNumber('');
      setAddress('');
      setSex(null);
      setRole(null);
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setProfilePicture('');
    setUsername('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
    setAddress('');
    setSex(null);
    setRole(null);
    setIsSubmitting(false);
    router.push('/(admins)/user-management');
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
            Add User Account
          </Text>

          <View className='flex-row items-center mt-2'>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Profile Picture URL
            </Text>
            <Text className={`ml-1 font-inter_bold text-base italic ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              - Optional
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Image Url (e.g. https://example.com/image.jpg)"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            selectionColor="#6D28D9"
            value={profilePicture}
            onChangeText={setProfilePicture}
          />
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Username
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter username"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#6D28D9"
            value={username}
            onChangeText={setUsername}
            maxLength={30}  
          />
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              First Name
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter first name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="words"
            selectionColor="#6D28D9"
            value={firstName}
            onChangeText={setFirstName}
            maxLength={50} 
          />
          <View className='flex-row items-center'>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Middle Name
            </Text>
            <Text className={`ml-1 font-inter_bold text-base italic ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              - Optional
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter middle name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="words"
            selectionColor="#6D28D9"
            value={middleName}
            onChangeText={setMiddleName}
          />
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Last Name
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter last name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="words"
            selectionColor="#6D28D9"
            value={lastName}
            onChangeText={setLastName}
            maxLength={50}
          />
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Sex
            </Text>
          </View>
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
            <Picker.Item label="Select Sex" value={null} />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Role
            </Text>
          </View>
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
            <Picker.Item label="Select Role" value={null} />
            <Picker.Item label="Admin" value="Admin" />
            <Picker.Item label="Student" value="Student" />
            <Picker.Item label="Teacher" value="Teacher" />
          </Picker>
          
          {/* Status picker removed - status is automatically set to 'active' */}
          
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Email
            </Text>
          </View>
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
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Password
            </Text>
          </View>
          <View className={`flex-row items-center border rounded-md mb-2 px-4 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              secureTextEntry={isSecure}
              value={password}
              onChangeText={setPassword}
              maxLength={25}
            />
            <TouchableOpacity onPress={toggleSecure}>
              <Image
                tintColor={isDarkMode ? '#E0E0E0' : 'black'}
                style={{ width: 24, height: 24 }}
                source={
                  isSecure
                    ? require('@/assets/icons/show_password.png')
                    : require('@/assets/icons/hide_password.png')
                }
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          </View>
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Confirm Password
            </Text>
          </View>
          <View className={`flex-row items-center border rounded-xl mb-2 px-4 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Confirm new password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#6D28D9"
              secureTextEntry={isConfirmSecure}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              maxLength={25}
            />
            <TouchableOpacity onPress={toggleConfirmSecure}>
              <Image
                tintColor={isDarkMode ? '#E0E0E0' : 'black'}
                style={{ width: 24, height: 24 }}
                source={
                  isConfirmSecure
                    ? require('@/assets/icons/show_password.png')
                    : require('@/assets/icons/hide_password.png')
                }
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          </View>
          <View className='flex-row items-center mt-2'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Phone Number
            </Text>
          </View>
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
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Address
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter address"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="words"
            multiline={true}
            selectionColor="#6D28D9"
            value={address}
            onChangeText={setAddress}
            maxLength={150}
          />
          
          {/* Add info message about automatic active status */}
          <View className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-green-900' : 'bg-green-100'}`}>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
              ℹ️ User accounts created by admins are automatically set to "Active" status.
            </Text>
          </View>
          
          <CustomButton
            containerStyles='bg-secondary-web mt-2'
            handlePress={handleAddUser}
            title={isSubmitting ? 'Adding User...' : 'Add User'}
            isLoading={isSubmitting}
          />
          <TouchableOpacity
            className='bg-gray-400 rounded-xl h-[50px] w-full justify-center items-center p-2 mt-4'
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text className='text-black font-psemibold text-lg'>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default AddUserWeb;