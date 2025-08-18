import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '../contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';
import AccountIcon from '@/assets/icons/account.svg'
import EmailIcon from '@/assets/icons/email.svg'
import LoginIcon from '@/assets/icons/login.svg'
import PasswordIcon from '@/assets/icons/password.svg'
import { useAuth } from '@/contexts/AuthContext';
import CloseIcon from '@/assets/icons/close.svg'

// Memoize expensive components
const MemoizedAccountIcon = React.memo(AccountIcon);
const MemoizedEmailIcon = React.memo(EmailIcon);
const MemoizedPasswordIcon = React.memo(PasswordIcon);
const MemoizedLoginIcon = React.memo(LoginIcon);
const MemoizedCloseIcon = React.memo(CloseIcon);

const SignInWeb = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { isDarkMode } = useDarkMode();
  const { login, isLoading, forgotPassword } = useAuth();

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPasswordModalVisible, setIsForgotPasswordModalVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  /* const [accountType, setAccountType] = useState('');
  const accountTypeOptions = [
    { label: 'Admin', value: 'Admin' },
    { label: 'Student', value: 'Student' },
    { label: 'Teacher', value: 'Teacher' },
  ]; */

  const handleLogin = async () => {
    if (!identifier || !password) {
      // Use window.alert for web
      window.alert('Error: Please enter both username/userID and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(identifier, password);
      // Use window.alert for web success message
      window.alert('Success: Login successful!');
      // Navigation is handled by _layout.tsx upon successful login
    } catch (error: any) {
      // Get the error message from the backend response or a default
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';

      // Check if the specific 'Incorrect email or password' message was returned
      if (backendErrorMessage === 'Incorrect username/userId or password') {
        // Use window.alert for specific login failed message
        window.alert(
          'Login Failed: The username/userId or password you entered is incorrect. Please check your credentials and try again.'
        );
      } else {
        // Use window.alert for other error messages
        window.alert('Login Failed: ' + backendErrorMessage); // Concatenate message
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [isSecure, setSecure] = useState(true)

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-web">
      <View className="flex-1 items-center justify-center min-h-screen bg-[#f5f7fa]" style={{position: 'relative', overflow: 'hidden'}}>
        {/* Background Image */}
        <Image
          source={require('../assets/images/poster.jpg')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            opacity: 0.25,
          }}
          contentFit="cover"
          blurRadius={2}
        />
        {/* Foreground Content */}
        <View className="flex-row w-full max-w-4xl h-[520px] p-2" style={{position: 'relative', zIndex: 1}}>
          {/* Left Side */}
          <View className="w-1/2 bg-[#204080] items-center justify-center px-8" style={{ display: width < 768 ? 'none' : 'flex', flexDirection: 'column' }}>
            <Image
              source={require('../assets/images/GCCS-logo.png')}
              style={{ width: 128, height: 128, marginBottom: 24 }}
              contentFit="contain"
            />
            <Text className={`text-2xl font-pbold mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>GracEdLMS</Text>
            <Text className={`text-center text-sm font-pregular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
              For reset or reactivation concern on your account, send an e-mail to <Text style={{ fontWeight: 'bold' }}>your-email@domain.com</Text> with your ID number & full name from 8-5pm Monday - Friday only.
            </Text>
          </View>
          {/* Right Side */}
          <View className={`flex-1 flex-col w-full md:w-1/2 items-center justify-center px-8 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            <Text className={`text-2xl font-pbold text-center mb-8 tracking-wider ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              WELCOME
            </Text>
            <View className="w-full max-w-xs">
              <View className='flex-row'>
                <MemoizedAccountIcon width={20} height={20} className="mr-1" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
                <Text className={`text-sm font-inter_bold mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Username/User ID
                </Text>
              </View>
              <TextInput
                className={`w-full mb-4 px-3 py-2 font-inter_regular border rounded-md ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-[#E0E0E0]' : 'border-gray-300 text-black'}`}
                placeholder="Enter your username/user ID"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
              <View className='flex-row'>
                <MemoizedPasswordIcon width={20} height={20} className="mr-1" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
                <Text className={`text-sm font-inter_bold mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Password
                </Text>
              </View>
              <View className={`flex-row mb-4 items-center border rounded-md ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
                <TextInput
                  className={`w-full px-3 py-2 font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  placeholder="Enter your password"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={isSecure}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={()=>setSecure(!isSecure)}
                  className='px-2'
                >
                  {isSecure ? (
                    <Image
                      tintColor={`${isDarkMode ? '#E0E0E0' : 'black'}`}
                      style={{width: 20, height: 20}}
                      source={require('@/assets/icons/show_password.png')}
                      contentFit="contain"
                      transition={500}
                    />
                  ) : (
                    <Image
                      tintColor={`${isDarkMode ? '#E0E0E0' : 'black'}`}
                      style={{width: 20, height: 20}}
                      source={require('@/assets/icons/hide_password.png')}
                      contentFit="contain"
                      transition={500}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className={`w-full flex-row py-2 mb-2 rounded-md items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : 'white'} />
                ) : (
                  <>
                    <MemoizedLoginIcon height={24} width={24} fill={isDarkMode ? '#E0E0E0' : 'white'} style={{paddingRight: 8}}/>
                    <Text className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                      Sign In
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity
                  onPress={() => {
                    setIsForgotPasswordModalVisible(true);
                    setForgotPasswordEmail(''); // Clear email when opening modal
                  }}
                >
                  <Text className={`text-xs font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
      {isForgotPasswordModalVisible && (
        <View className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <View className={`w-full max-w-md rounded-xl p-6 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
            <TouchableOpacity
              onPress={() => setIsForgotPasswordModalVisible(false)}
              className="absolute top-4 right-4"
            >
              <MemoizedCloseIcon width={24} height={24} fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
            </TouchableOpacity>
            <Text className={`font-inter_black text-2xl text-center mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Forgot Password
            </Text>
            <Text className={`font-inter_regular text-base text-center mb-6 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Enter your email address
            </Text>
            <View className={`flex-row items-center border rounded-xl mb-6 px-3 py-2 h-[55px]
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <MemoizedEmailIcon height={24} width={24} className="mr-2" fill={`${isDarkMode ? '#E0E0E0' : 'black'}`}/>
              <TextInput
                className={`h-full flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter email address"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor="#22C55E"
                selectionHandleColor="#22C55E"
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                onSubmitEditing={async () => {
                  if (!forgotPasswordEmail) {
                    window.alert('Error: Please enter your email address.');
                    return;
                  }
                  setIsResettingPassword(true);
                  try {
                    await forgotPassword(forgotPasswordEmail);
                    window.alert('Success: If an account with that email exists, a password reset link has been sent.');
                    setIsForgotPasswordModalVisible(false);
                  } catch (error: any) {
                    const errorMessage = error.alertMessage || error.message || 'Failed to send password reset email. Please try again.';
                    window.alert('Error: ' + errorMessage);
                  } finally {
                    setIsResettingPassword(false);
                  }
                }}
              />
            </View>
            <CustomButton
              containerStyles='bg-secondary-web h-[55px]'
              handlePress={async () => {
                if (!forgotPasswordEmail) {
                  window.alert('Error: Please enter your email address.');
                  return;
                }
                setIsResettingPassword(true);
                try {
                  await forgotPassword(forgotPasswordEmail);
                  window.alert('Success: If an account with that email exists, a password reset link has been sent.');
                  setIsForgotPasswordModalVisible(false);
                } catch (error: any) {
                  const errorMessage = error.alertMessage || error.message || 'Failed to send password reset email. Please try again.';
                  window.alert('Error: ' + errorMessage);
                } finally {
                  setIsResettingPassword(false);
                }
              }}
              title={isResettingPassword ? 'Sending...' : 'Continue'}
              tintColor='black'
              isLoading={isResettingPassword}
            />
          </View>
        </View>
      )}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default React.memo(SignInWeb)