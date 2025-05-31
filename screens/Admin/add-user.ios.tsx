import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native'
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

const AddUserIOS = () => {

  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  // User data states, initialized to empty strings or null
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

  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  // Function to handle registration
  const handleAddUser = async () => {
    setIsSubmitting(true);
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!username || !firstName || !lastName || !email || !password || !phoneNumber || !address || !sex) {
      Alert.alert('Error', 'Please fill in all required fields.');
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
        role
        // Removed bio and gender from payload
      });

      if (response.data.success) {
        Alert.alert('Success', 'User registered successfully! Please set their account status to active.', [
          { text: 'OK', onPress: () => router.replace('/(admins)/user-management') }
        ]);
      } else {
        Alert.alert('Registration Failed', response.data.message || 'Something went wrong.');
      }
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      Alert.alert('Registration Failed', error.response?.data?.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 h-full bg-primary-android'>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View className={`w-full rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
            <Text className={`font-inter_black mt-4 text-center text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
              Add User Account
            </Text>
            <Text className={`ml-2 mt-4 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Username:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter username"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              First Name:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter first name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="words" // Changed to words for names
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Middle Name (Optional):
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter middle name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="words" // Changed to words for names
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={middleName}
                onChangeText={setMiddleName}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Last Name:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter last name"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="words" // Changed to words for names
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Phone Number:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter phone number"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                keyboardType='phone-pad'
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={16} // Added max length for phone number
              />
            </View>
            <Text className={`ml-2 mb-2 font-inter_regular text-xs ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>
              Format: +639XXXXXXXXX or 09XXXXXXXXX
            </Text>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Address:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter address"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize='words' // Changed to words for address
                multiline={true}
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={address}
                onChangeText={setAddress}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
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
                <Picker.Item label="Select Sex" value={null} style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Male" value="Male" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Female" value="Female" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Other" value="Other" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
              </Picker>
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Role:
            </Text>
            <View className={`overflow-hidden border rounded-xl mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <Picker
                style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 14, padding: 12 }}
                selectedValue={role}
                onValueChange={(itemValue) => setRole(itemValue)}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode='dropdown'
              >
                <Picker.Item label="Select Role" value={null} style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Admin" value="Admin" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Student" value="Student" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
                <Picker.Item label="Teacher" value="Teacher" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14}}/>
              </Picker>
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Email:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter email"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Password:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-2 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter password"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                secureTextEntry={isSecure}
                value={password}
                onChangeText={setPassword}
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
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Confirm Password:
            </Text>
            <View className={`flex-row items-center border rounded-xl mt-2 mb-4 px-3 py-2
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Confirm password"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                autoCapitalize="none"
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                secureTextEntry={isConfirmSecure}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
            <CustomButton
              containerStyles='bg-secondary-ios h-[55px]'
              handlePress={handleAddUser}
              iconStyles='w-[24px] h-[24px]'
              title={isSubmitting ? 'Adding User...' : 'Add User'}
              tintColor='black'
              isLoading={isSubmitting}
            />
            <TouchableOpacity
              className='bg-gray-400 rounded-xl h-[55px] w-full justify-center items-center mt-4 p-2'
              onPress={() => router.push('/(admins)/user-management')}
              activeOpacity={0.7}
            >
              <Text className='text-black font-psemibold text-lg'>
                Back
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default AddUserIOS