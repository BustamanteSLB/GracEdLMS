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

cssInterop(Image, { className: "style" });

const RegisterWeb = () => {

  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  //User data
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
  const handleRegister = async () => {
    setIsSubmitting(true);
    if (password !== confirmPassword) {
      window.alert('Error: Passwords do not match.'); // Replaced Alert.alert
      setIsSubmitting(false);
      return;
    }

    if (!username || !firstName || !lastName || !email || !password || !phoneNumber || !address || !sex) {
      window.alert('Error: Please fill in all required fields.'); // Replaced Alert.alert
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
        window.alert('Success: Account registered successfully! Please wait for your account to be active then sign in.'); // Replaced Alert.alert
        router.replace({ pathname: '/signin' }); // Moved navigation here
      } else {
        window.alert('Registration Failed: ' + (response.data.message || 'Something went wrong.')); // Replaced Alert.alert
      }
    } catch (error: any) {
      console.error('Registration error: ', error.response?.data || error.message);
      window.alert('Registration Failed: ' + (error.response?.data?.message || 'An unexpected error occurred during registration.')); // Replaced Alert.alert
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 h-full bg-primary-web'>
      <ScrollView contentContainerStyle={{ flexGrow:1, alignItems: 'center', justifyContent:'center', padding:16 }}>
        <View className={`w-full max-w-3xl rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
          <Text className={`font-inter_black mt-4 text-center text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
            Register Account
          </Text>
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
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={handleRegister}
            maxLength={30}        
          />
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              First Name
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter first name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={firstName}
            onChangeText={setFirstName}   
            onSubmitEditing={handleRegister}
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
            autoCapitalize="none"
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={middleName}
            onChangeText={setMiddleName}   
            onSubmitEditing={handleRegister}
            maxLength={50}  
          />
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Last Name
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter last name"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize="none"
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={lastName}
            onChangeText={setLastName}   
            onSubmitEditing={handleRegister}
            maxLength={50}  
          />
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Phone Number
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter phone number"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            keyboardType='phone-pad'
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={phoneNumber}
            onChangeText={setPhoneNumber}   
            onSubmitEditing={handleRegister}  
            maxLength={13}
          />
          <Text className={`ml-2 mb-2 font-inter_regular text-xs ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>
            Format: +639XXXXXXXXX or 09XXXXXXXXX
          </Text>
          <View className='flex-row items-center'>
            <Text className={`ml-2 font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Address
            </Text>
            <Text className={`ml-1 font-inter_bold text-base italic ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              - Optional
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter address"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            autoCapitalize='words'
            multiline={true}
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={address}
            onChangeText={setAddress}   
            onSubmitEditing={handleRegister}
            maxLength={150}  
          />
          <View className='flex-row items-center'>
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
            <Picker.Item label="Select Sex" value={null} style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>
            <Picker.Item label="Male" value="Male" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>
            <Picker.Item label="Female" value="Female" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>
            <Picker.Item label="Other" value="Other" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>          
          </Picker>
          <View className='flex-row items-center'>
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
            <Picker.Item label="Select Role" value={null} style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>
            <Picker.Item label="Student" value="Student" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>
            <Picker.Item label="Teacher" value="Teacher" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 16}}/>          
          </Picker>
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Email
            </Text>
          </View>
          <TextInput
            className={`border rounded-md my-2 px-4 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder="Enter email"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor="#22C55E"
            selectionHandleColor="#22C55E"     
            value={email}
            onChangeText={setEmail}   
            onSubmitEditing={handleRegister}  
            maxLength={50}
          />
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Password
            </Text>
          </View>
          <View className={`flex-row items-center border rounded-md mt-2 mb-2 px-4 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#22C55E"
              selectionHandleColor="#22C55E"
              secureTextEntry={isSecure}
              value={password}    
              onChangeText={setPassword}
              onSubmitEditing={handleRegister}
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
          <View className='flex-row items-center'>
            <Text className={`font-inter_bold mr-1 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`}>*</Text>
            <Text className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Confirm Password
            </Text>
          </View>
          <View className={`flex-row items-center border rounded-md mt-2 mb-4 px-4 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <TextInput
              className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Confirm password"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              autoCapitalize="none"
              selectionColor="#22C55E"
              selectionHandleColor="#22C55E"    
              secureTextEntry={isConfirmSecure}
              value={confirmPassword}
              onChangeText={setConfirmPassword}   
              onSubmitEditing={handleRegister}
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
          <CustomButton
            containerStyles='bg-secondary-web rounded-md'
            handlePress={handleRegister}
            iconStyles='w-[24px] h-[24px]'
            title='Register'
            tintColor='black'
          />
          <TouchableOpacity 
            className='mt-2 justify-center items-center'
            onPress={() => router.replace('/(auth)/signin')}
          >
            <View className='flex-row'>
              <Text className={`mr-1 font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Already have an account?
              </Text>
              <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Sign In
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default RegisterWeb