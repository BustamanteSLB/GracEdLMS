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

cssInterop(Image, { className: "style" }); // Keep this if Image is still used

const AddUserWeb = () => {

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
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended' | 'pending' | 'archived' | null>(null);

  const [isSecure, setSecure] = useState(true);
  const [isConfirmSecure, setConfirmSecure] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSecure = () => setSecure(prev => !prev);
  const toggleConfirmSecure = () => setConfirmSecure(prev => !prev);

  // Function to handle registration
  const handleAddUser = async () => {
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      window.alert('Error: Passwords do not match.'); // Replaced Alert.alert with window.alert
      setIsSubmitting(false);
      return;
    }

    // Include role and status in validation for completeness
    if (!username || !firstName || !lastName || !email || !password || !phoneNumber || !address || !sex || !role || !status) {
      window.alert('Error: Please fill in all required fields.'); // Replaced Alert.alert with window.alert
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
        status
        // Removed bio and gender from payload
      });

      if (response.data.success) {
        window.alert('Success: User registered successfully! Please set their account status to active.'); // Replaced Alert.alert with window.alert
        router.replace('/(admins)/user-management');
      } else {
        window.alert(`Registration Failed: ${response.data.message || 'Something went wrong.'}`); // Replaced Alert.alert with window.alert
      }
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      window.alert(`Registration Failed: ${error.response?.data?.message || 'An unexpected error occurred during registration.'}`); // Replaced Alert.alert with window.alert
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Add Admin Account
          </Text>

          <Text className={`ml-2 mt-4 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Username:
          </Text>
          <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 h-[55px]
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter username"
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
              autoCapitalize="words" // Changed to words for names
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
              autoCapitalize="words" // Changed to words for names
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
              autoCapitalize="words" // Changed to words for names
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
              <Picker.Item label="Select Sex" value={null} /> {/* Added null option for Picker */}
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Role:
          </Text>
          <View className={`overflow-hidden border rounded-xl mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <Picker
              style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 16, padding: 12 }}
              selectedValue={role}
              onValueChange={(itemValue) => setRole(itemValue)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              mode='dropdown'
            >
              <Picker.Item label="Select Role" value={null} /> {/* Added null option for Picker */}
              <Picker.Item label="Admin" value="Admin" />
              <Picker.Item label="Student" value="Student" />
              <Picker.Item label="Teacher" value="Teacher" />
            </Picker>
          </View>
          <Text className={`ml-2 mb-1 font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Status:
          </Text>
          <View className={`overflow-hidden border rounded-xl mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <Picker
              style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 16, padding: 12 }}
              selectedValue={status}
              onValueChange={(itemValue) => setStatus(itemValue)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
              mode='dropdown'
            >
              <Picker.Item label="Select Status" value={null} /> {/* Added null option for Picker */}
              <Picker.Item label="Active" value="active" />
              <Picker.Item label="Inactive" value="inactive" />
              <Picker.Item label="Suspended" value="suspended" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Archived" value="archived" />
            </Picker>
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
              secureTextEntry={isSecure} // Added secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {/* Password visibility toggle for web */}
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
              secureTextEntry={isConfirmSecure} // Added secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {/* Confirm Password visibility toggle for web */}
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
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              autoCapitalize="words" // Changed to words for address
              multiline={true}
              selectionColor="#6D28D9"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          <CustomButton
            containerStyles='bg-secondary-web h-[55px] mt-2'
            handlePress={handleAddUser}
            title={isSubmitting ? 'Adding' : 'Add Admin'}
            isLoading={isSubmitting}
          />
          <TouchableOpacity
            className='bg-gray-400 rounded-xl h-[55px] w-full justify-center items-center p-2 mt-4'
            onPress={() => router.push('/(admins)/user-management')}
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