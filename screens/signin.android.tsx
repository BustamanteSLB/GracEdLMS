import { Alert, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '../contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';
import EmailIcon from '@/assets/icons/email.svg'
import LoginIcon from '@/assets/icons/login.svg'
import PasswordIcon from '@/assets/icons/password.svg'
import { useAuth } from '@/contexts/AuthContext';

const SignInAndroid = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // const [accountType, setAccountType] = useState('');
  // const accountTypeOptions = [
  //   { label: 'Admin', value: 'Admin' },
  //   { label: 'Student', value: 'Student' },
  //   { label: 'Teacher', value: 'Teacher' },
  // ];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
  
    setIsLoggingIn(true);
    try {
      await login(email, password);
      Alert.alert('Success', 'Login successful!');
      // Navigation is handled by _layout.tsx upon successful login
    } catch (error: any) {
      // Get the error message from the backend response or a default
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
  
      // Check if the specific 'Incorrect email or password' message was returned
      if (backendErrorMessage === 'Incorrect email or password') {
        Alert.alert(
          'Login Failed',
          'The email or password you entered is incorrect. Please check your credentials and try again.' // More user-friendly message
        );
      } else {
        // For other types of errors (e.g., server error, account status error)
        Alert.alert('Login Failed', backendErrorMessage); // Show the message from the backend
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [isSecure, setSecure] = useState(true)
  cssInterop(Image, { className: "style" });

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-android">
      <ScrollView contentContainerStyle={{ flexGrow:1, alignItems: 'center', justifyContent:'center', padding:16 }}>
        <View className={`w-full rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
          <Image
            className="w-72 h-72 self-center"
            source={require('../assets/images/GCCS-logo.png')}
            contentFit="contain"
            transition={200}
          />
          <Text className={`font-inter_black mt-4 text-center text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>Welcome to GracEdLMS!</Text>
          <Text className={`font-inter_bold mt-2 text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Please login to continue.</Text>
          {/* <View className={`overflow-hidden border rounded-xl mt-4 mb-2 ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <Picker
              style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', color: isDarkMode ? '#E0E0E0' : 'black', height: 55, width: '100%', fontFamily: 'Inter-18pt-Regular', fontSize: 14, padding: 12 }}
              selectedValue={accountType}
              onValueChange={(itemValue) => setAccountType(itemValue)}
              dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
            >
              <Picker.Item label="Select Account Type" value="" style={{ fontFamily:'Inter-18pt-Regular', fontSize: 14,}} />
              {accountTypeOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} style={{ fontFamily: 'Inter-18pt-Regular', fontSize: 14, }}  />
              ))}
            </Picker>
          </View> */}
          <View className={`flex-row items-center border rounded-xl mt-2 mb-4 px-3 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <EmailIcon height={24} width={24} className="mr-2" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter email here"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor="#22C55E"
              selectionHandleColor="#22C55E"
              onChangeText={(text) => {
                setEmail(text);
              }}
            />
          </View>
          <View className={`flex-row items-center border rounded-xl mb-4 px-3 py-2 
            ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
            <PasswordIcon width={24} height={24} className="mr-2" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
            <TextInput
              className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
              placeholder="Enter password here"
              placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
              secureTextEntry={isSecure}
              selectionColor="#22C55E"
              selectionHandleColor="#22C55E"
              onChangeText={(text) => {
                setPassword(text);
              }}
            />
            <TouchableOpacity onPress={()=>setSecure(!isSecure)}>
              {isSecure ? (
                <Image
                  tintColor={`${isDarkMode ? '#E0E0E0' : 'black'}`}
                  style={{width: 24, height: 24}}
                  source={require('@/assets/icons/show_password.png')}
                  contentFit="contain"
                  transition={500}
                />
              ) : (
                <Image
                  tintColor={`${isDarkMode ? '#E0E0E0' : 'black'}`}
                  style={{width: 24, height: 24}}
                  source={require('@/assets/icons/hide_password.png')}
                  contentFit="contain"
                  transition={500}
                />
              )}
            </TouchableOpacity>
          </View>
          <CustomButton
            containerStyles='bg-secondary-android h-[55px]'
            handlePress={handleLogin}
            iconVector={<LoginIcon height={24} width={24}/>}
            title={isLoggingIn || isLoading ? 'Logging In...' : 'Login'}
            tintColor='black'
            isLoading={isLoggingIn || isLoading}
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default SignInAndroid
