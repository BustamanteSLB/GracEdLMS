import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, { useState, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '../contexts/DarkModeContext';
import EmailIcon from '@/assets/icons/email.svg'
import LoginIcon from '@/assets/icons/login.svg'
import PasswordIcon from '@/assets/icons/password.svg'
import { useAuth } from '@/contexts/AuthContext';

// Memoize expensive components
const MemoizedEmailIcon = React.memo(EmailIcon);
const MemoizedPasswordIcon = React.memo(PasswordIcon);
const MemoizedLoginIcon = React.memo(LoginIcon);

cssInterop(Image, { className: "style" });

const SignInIOS = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSecure, setSecure] = useState(true);

  // Memoize toggle function to prevent re-renders
  const toggleSecure = useCallback(() => {
    setSecure(prev => !prev);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
  
    setIsLoggingIn(true);
    try {
      await login(email, password);
      Alert.alert('Success', 'Login successful!');
    } catch (error: any) {
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
      if (backendErrorMessage === 'Incorrect email or password') {
        Alert.alert('Login Failed', 'The email or password you entered is incorrect.');
      } else {
        Alert.alert('Login Failed', backendErrorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-ios">
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
            
            <View className={`flex-row items-center border rounded-xl mt-2 mb-4 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <MemoizedEmailIcon height={24} width={24} className="mr-2" fill={isDarkMode ? '#E0E0E0' : 'black'}/>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter email here"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
                onChangeText={setEmail} // Directly pass setter (already memoized)
                value={email}
              />
            </View>
            <View className={`flex-row items-center border rounded-xl mb-2 px-3 py-2 
              ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
              <MemoizedPasswordIcon width={24} height={24} className="mr-2" fill={isDarkMode ? '#E0E0E0' : 'black'}/>
              <TextInput
                className={`flex-1 font-inter_regular text-base ${isDarkMode ? 'text-white' : 'text-black'}`}
                placeholder="Enter password here"
                placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}
                secureTextEntry={isSecure}
                selectionColor="#3B82F6"
                selectionHandleColor="#3B82F6"
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
              containerStyles='bg-secondary-ios h-[55px] mb-4'
              handlePress={handleLogin}
              iconVector={<MemoizedLoginIcon height={24} width={24}/>}
              title={isLoggingIn || isLoading ? 'Logging In...' : 'Login'}
              tintColor='black'
              isLoading={isLoggingIn || isLoading}
            />
            <TouchableOpacity
              className='bg-gray-400 rounded-xl h-[55px] w-full justify-center items-center p-2'
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
            >
              <Text className='text-black font-psemibold text-lg'>
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default React.memo(SignInIOS)
