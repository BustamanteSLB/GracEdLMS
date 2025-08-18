import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, { useState, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '../contexts/DarkModeContext';
import AccountIcon from '@/assets/icons/account.svg'
import EmailIcon from '@/assets/icons/email.svg'
import LoginIcon from '@/assets/icons/login.svg'
import PasswordIcon from '@/assets/icons/password.svg'
import { useAuth } from '@/contexts/AuthContext';

// Memoize expensive components
const MemoizedAccountIcon = React.memo(AccountIcon);
const MemoizedEmailIcon = React.memo(EmailIcon);
const MemoizedPasswordIcon = React.memo(PasswordIcon);
const MemoizedLoginIcon = React.memo(LoginIcon);

cssInterop(Image, { className: "style" });

const SignInAndroid = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSecure, setSecure] = useState(true);

  // Memoize toggle function to prevent re-renders
  const toggleSecure = useCallback(() => {
    setSecure(prev => !prev);
  }, []);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both username/userId and password.');
      return;
    }
  
    setIsLoggingIn(true);
    try {
      await login(identifier, password);
      Alert.alert('Success', 'Login successful!');
    } catch (error: any) {
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
      if (backendErrorMessage === 'Incorrect username/userId or password') {
        Alert.alert('Login Failed', 'The username/userId you entered is incorrect.');
      } else {
        Alert.alert('Login Failed', backendErrorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-android">
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
            <Image
              className="w-72 h-72 self-center"
              source={require('@/assets/images/GCCS-logo.png')}
              contentFit="contain"
              placeholder={require('@/assets/images/GCCS-logo.png')}
              placeholderContentFit='contain'
              cachePolicy="memory-disk" // Optimize image caching
            />
            <Text className={`font-inter_black mt-4 text-center text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
              Welcome to GracEdLMS!
            </Text>
            <Text className={`font-inter_bold mt-2 text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Please login to continue.
            </Text>
            
            {/* Username/UserID Input */}
            <View className={`flex-row items-center border rounded-xl mt-2 mb-4 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <MemoizedAccountIcon height={24} width={24} className="mr-2" fill={isDarkMode ? '#E0E0E0' : 'black'}/>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter your username/user ID"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                selectionColor="#22C55E"
                onChangeText={setIdentifier} // Directly pass setter (already memoized)
                value={identifier}
              />
            </View>
            
            {/* Password Input */}
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <MemoizedPasswordIcon width={24} height={24} className="mr-2" fill={isDarkMode ? '#E0E0E0' : 'black'}/>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter password here"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                secureTextEntry={isSecure}
                selectionColor="#22C55E"
                onChangeText={setPassword} // Directly pass setter
                value={password}
              />
              <TouchableOpacity onPress={toggleSecure}>
                <Image
                  tintColor={isDarkMode ? '#E0E0E0' : 'black'}
                  style={{width: 24, height: 24}}
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
            <TouchableOpacity className='mb-2 justify-center items-end'>
              <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
            <CustomButton
              containerStyles='bg-secondary-android h-[55px] mb-4'
              handlePress={handleLogin}
              iconVector={<MemoizedLoginIcon height={24} width={24}/>}
              title={isLoggingIn || isLoading ? 'Logging In...' : 'Login'}
              tintColor='black'
              isLoading={isLoggingIn || isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default React.memo(SignInAndroid); // Memoize the entire component