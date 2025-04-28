import { ScrollView, Text, TextInput, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import CustomButton from '@/components/CustomButton'
import { useDarkMode } from '../contexts/DarkModeContext';

const SignInIOS = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  const handleLogin = () => {
    console.log('Logging in...')
    router.replace('/(students)/dashboard');
  }
  cssInterop(Image, { className: "style" });

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-ios">
      <ScrollView contentContainerStyle={{ flexGrow:1, alignItems: 'center', justifyContent:'center', padding:16 }}>
        <View className={`w-full rounded-xl p-4 ${isDarkMode ? 'bg-[#121212] shadow-none' : 'bg-white shadow-lg'}`}>
          <Image
            className="w-72 h-72 self-center"
            source={require('../assets/images/GCCS-logo.png')}
            contentFit="contain"
            transition={200}
          />
          <Text className={`font-inter_black mt-4 text-center text-3xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>Welcome to GracEdLMS!</Text>
          <Text className={`font-inter_bold mt-2 text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Please sign in to continue.</Text>
          <TextInput
            className={`w-full p-4 mt-4 mb-4 border rounded-xl font-inter_regular ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300'}`}
            placeholder="Enter email here"
            placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}     
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className={`w-full p-4 mb-4 border rounded-xl font-inter_regular ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300'}`}
            placeholder="Enter password here"
            placeholderTextColor={isDarkMode ? '#E0E0E0' : 'black'}  
            secureTextEntry
          />
          <CustomButton
            containerStyles='bg-secondary-ios'
            handlePress={handleLogin}
            iconImage={require('../assets/icons/login.png')}
            title='Login'
            tintColor='black'
          />
        </View>
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'dark' : 'light'} />
    </SafeAreaView>
  )
}

export default SignInIOS
