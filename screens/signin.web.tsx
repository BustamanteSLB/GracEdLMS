import { ActivityIndicator, Text, TextInput, TouchableOpacity, useColorScheme, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useCallback, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useRouter } from 'expo-router'
import { useDarkMode } from '../contexts/DarkModeContext';
import AccountIcon from '@/assets/icons/account.svg'
import PasswordIcon from '@/assets/icons/password.svg'
import LoginIcon from '@/assets/icons/login.svg'
import { useAuth } from '@/contexts/AuthContext';

cssInterop(Image, { className: 'style' });

// Memoize expensive components
const MemoizedAccountIcon = React.memo(AccountIcon);
const MemoizedPasswordIcon = React.memo(PasswordIcon);
const MemoizedLoginIcon = React.memo(LoginIcon);

// Memoize show/hide password icons
const ShowPasswordIcon = React.memo(() => {
  const { isDarkMode } = useDarkMode();
  return (
    <Image
      tintColor={isDarkMode ? '#E0E0E0' : 'black'}
      style={{width: 20, height: 20}}
      source={require('@/assets/icons/show_password.png')}
      contentFit="contain"
      cachePolicy="memory-disk"
      priority="low"
      alt="Show password icon"
    />
  );
});
ShowPasswordIcon.displayName = 'ShowPasswordIcon';

const HidePasswordIcon = React.memo(() => {
  const { isDarkMode } = useDarkMode();
  return (
    <Image
      tintColor={isDarkMode ? '#E0E0E0' : 'black'}
      style={{width: 20, height: 20}}
      source={require('@/assets/icons/hide_password.png')}
      contentFit="contain"
      cachePolicy="memory-disk"
      priority="low"
      alt="Hide password icon"
    />
  );
});
HidePasswordIcon.displayName = 'HidePasswordIcon';

// Memoize logo component
const LogoSection = React.memo(({ isDarkMode, width }: { isDarkMode: boolean, width: number }) => {
  if (width < 768) return null;
  
  return (
    <View className="w-1/2 bg-[#204080] items-center justify-center px-8">
      <Image
        source={require('../assets/images/GCCS-logo.png')}
        style={{ width: 128, height: 128, marginBottom: 24 }}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
        alt="GCCS Logo"
      />
      <Text className={`text-2xl font-pbold mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
        GracEdLMS
      </Text>
      <Text className={`text-center text-sm font-pregular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
        Welcome to <Text style={{ fontWeight: 'bold' }}>GracEdLMS!</Text> Please enter your account credentials to login and continue your learning journey with us.
      </Text>
    </View>
  );
});
LogoSection.displayName = 'LogoSection';

// Deferred background image component
const DeferredBackgroundImage = React.memo(() => {
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    // Defer background image loading until after main content is painted
    const timer = setTimeout(() => {
      setShowImage(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!showImage) return null;

  return (
    <Image
      source={require('../assets/images/poster.jpg')}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.15,
      }}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority="low"
      alt="Background decorative image"
    />
  );
});
DeferredBackgroundImage.displayName = 'DeferredBackgroundImage';

const SignInWeb = () => {
  document.title = 'Sign In';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { isDarkMode } = useDarkMode();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [isSecure, setSecure] = useState(true);

  const handleLogin = useCallback(async () => {
    if (!identifier || !password) {
      window.alert('Error: Please enter both username/userID and password.');
      return;
    }

    try {
      await login(identifier, password);
      window.alert('Success: Login successful!');
    } catch (error: any) {
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';

      if (backendErrorMessage === 'Incorrect username/userId or password') {
        window.alert(
          'Login Failed: The username/userId or password you entered is incorrect. Please check your credentials and try again.'
        );
      } else {
        window.alert('Login Failed: ' + backendErrorMessage);
      }
    }
  }, [identifier, password, login]);

  const togglePasswordVisibility = useCallback(() => {
    setSecure(prev => !prev);
  }, []);

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-web">
      <View className="flex-1 items-center justify-center min-h-screen bg-[#f5f7fa]" style={{position: 'relative', overflow: 'hidden'}}>
        {/* Deferred Background Image - loads after main content paints */}
        <DeferredBackgroundImage />
        
        {/* Foreground Content */}
        <View className="flex-row w-full max-w-4xl h-[520px] p-2" style={{position: 'relative', zIndex: 1}}>
          {/* Left Side - Logo Section */}
          <LogoSection isDarkMode={isDarkMode} width={width} />
          
          {/* Right Side - Login Form */}
          <View className={`flex-1 flex-col w-full md:w-1/2 items-center justify-center px-8 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
            <Text className={`text-2xl font-pbold text-center mb-8 tracking-wider ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              WELCOME
            </Text>
            
            <View className="w-full max-w-xs">
              {/* Username/User ID Field */}
              <View className='flex-row'>
                <MemoizedAccountIcon width={20} height={20} className="mr-1" fill={isDarkMode ? '#E0E0E0' : 'black'} aria-label="Username icon"/>
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
                onSubmitEditing={handleLogin}
                autoCapitalize="none"
                autoComplete="username"
                accessibilityLabel="Username or User ID input"
                accessibilityHint="Enter your username or user ID to sign in"
              />
              
              {/* Password Field */}
              <View className='flex-row'>
                <MemoizedPasswordIcon width={20} height={20} className="mr-1" fill={isDarkMode ? '#E0E0E0' : 'black'} aria-label="Password icon"/>
                <Text className={`text-sm font-inter_bold mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Password
                </Text>
              </View>
              <View className={`flex-row mb-4 items-center border rounded-md ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E]' : 'border-gray-300'}`}>
                <TextInput
                  className={`flex-1 px-3 py-2 font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  placeholder="Enter your password"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  secureTextEntry={isSecure}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your password to sign in"
                />
                <TouchableOpacity 
                  onPress={togglePasswordVisibility}
                  className='px-2'
                  accessibilityLabel={isSecure ? "Show password" : "Hide password"}
                  accessibilityRole="button"
                >
                  {isSecure ? <ShowPasswordIcon /> : <HidePasswordIcon />}
                </TouchableOpacity>
              </View>
              
              {/* Sign In Button */}
              <TouchableOpacity
                className={`w-full flex-row py-2 mb-2 rounded-md items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
                onPress={handleLogin}
                disabled={isLoading}
                accessibilityLabel="Sign in button"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : 'white'} />
                ) : (
                  <>
                    <MemoizedLoginIcon height={24} width={24} fill={isDarkMode ? '#E0E0E0' : 'white'} style={{marginRight: 8}}/>
                    <Text className={`font-pbold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                      Sign In
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default React.memo(SignInWeb);