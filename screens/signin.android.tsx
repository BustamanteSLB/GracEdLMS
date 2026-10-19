import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, ToastAndroid, TouchableOpacity, useColorScheme, View } from 'react-native'
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
      ToastAndroid.show('Login successful!', ToastAndroid.SHORT);
    } catch (error: any) {
      const backendErrorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
      
      // Show specific error for admin login attempts on mobile
      if (backendErrorMessage.includes('Admin access is not available on mobile devices')) {
        Alert.alert(
          'Access Restricted', 
          'Admin access is only available through a web browser. Please use a desktop or laptop computer to access the admin panel.',
          [{ text: 'OK' }]
        );
      } else if (backendErrorMessage === 'Incorrect username/userId or password') {
        Alert.alert('Login Failed', 'The username/userId or password you entered is incorrect.');
      } else {
        Alert.alert('Login Failed', backendErrorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView 
      style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? '#18191A' : '#F0F2F5' 
      }}
    >
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
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={{ 
            alignItems: 'center', 
            marginBottom: 32 
          }}>
            <Image
              style={{ 
                width: 180, 
                height: 180,
              }}
              source={require('@/assets/images/GCCS-logo.png')}
              contentFit="contain"
              placeholder={require('@/assets/images/GCCS-logo.png')}
              placeholderContentFit='contain'
              cachePolicy="memory-disk"
            />
            <Text 
              style={{
                fontSize: 32,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              GracEdLMS
            </Text>
            <Text 
              style={{
                fontSize: 16,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#606770',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Excellence in Christian Education Since 1994
            </Text>
          </View>

          {/* Login Card */}
          <View 
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0 : 0.1,
              shadowRadius: 8,
              elevation: isDarkMode ? 0 : 4,
            }}
          >
            {/* Mobile Admin Notice */}
            <View 
              style={{
                backgroundColor: isDarkMode ? 'rgba(46, 137, 255, 0.1)' : 'rgba(24, 119, 242, 0.1)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: isDarkMode ? '#2E89FF' : '#1877F2',
              }}
            >
              <Text 
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter-Medium',
                  color: isDarkMode ? '#2E89FF' : '#1877F2',
                  marginBottom: 4,
                }}
              >
                Note for Administrators
              </Text>
              <Text 
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#B0B3B8' : '#606770',
                  lineHeight: 18,
                }}
              >
                Admin access is only available on web browsers. Please use a desktop or laptop computer to access the admin panel.
              </Text>
            </View>

            {/* Username/UserID Input */}
            <View 
              style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MemoizedAccountIcon 
                height={20} 
                width={20} 
                fill={isDarkMode ? '#B0B3B8' : '#65676B'}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
                placeholder="Username or User ID"
                placeholderTextColor={isDarkMode ? '#B0B3B8' : '#8A8D91'}
                selectionColor={isDarkMode ? '#2E89FF' : '#1877F2'}
                onChangeText={setIdentifier}
                value={identifier}
                autoCapitalize="none"
              />
            </View>
            
            {/* Password Input */}
            <View 
              style={{
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MemoizedPasswordIcon 
                width={20} 
                height={20} 
                fill={isDarkMode ? '#B0B3B8' : '#65676B'}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
                placeholder="Password"
                placeholderTextColor={isDarkMode ? '#B0B3B8' : '#8A8D91'}
                secureTextEntry={isSecure}
                selectionColor={isDarkMode ? '#2E89FF' : '#1877F2'}
                onChangeText={setPassword}
                value={password}
              />
              <TouchableOpacity onPress={toggleSecure} style={{ padding: 4 }}>
                <Image
                  tintColor={isDarkMode ? '#B0B3B8' : '#65676B'}
                  style={{ width: 20, height: 20 }}
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

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoggingIn || isLoading}
              style={{
                backgroundColor: isDarkMode ? '#2E89FF' : '#1877F2',
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (isLoggingIn || isLoading) ? 0.6 : 1,
              }}
              activeOpacity={0.8}
            >
              <Text 
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter-SemiBold',
                  color: '#FFFFFF',
                }}
              >
                {isLoggingIn || isLoading ? 'Logging In...' : 'Log In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View 
            style={{
              marginTop: 32,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#B0B3B8' : '#8A8D91',
                textAlign: 'center',
              }}
            >
              Made by TeamZ © 2024-2025
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

export default React.memo(SignInAndroid);