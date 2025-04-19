import { Image, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { Link, useRouter} from 'expo-router'
import CustomButton from '@/components/CustomButton'

const SignInWeb = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();

  const handleLogin = () => {
    console.log('Logging in...')
    router.replace('/(drawer)/dashboard');
  }

  const isDarkMode = colorScheme === 'dark';

  return (
    <SafeAreaView className="flex-1 h-full bg-primary-web">
      <ScrollView contentContainerStyle={{ flexGrow:1, alignItems: 'center', justifyContent:'center', padding:16 }}>
        <View className="w-full max-w-xl bg-white rounded-xl shadow-lg p-4">
          <Image
            source={require('../assets/images/GCCS-logo.png')}
            style={{ alignSelf:'center', height:250, width:250 }}
            resizeMode="contain"
          />
          <Text className="font-inter_black mt-4 text-center text-2xl text-black">Welcome to GracEdLMS!</Text>
          <Text className="font-inter_bold mt-2 text-center">Please sign in to continue.</Text>
          <TextInput
            className="w-full p-4 mt-4 mb-4 border border-gray-300 rounded-xl font-inter_regular"
            placeholder="Enter email here"     
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="w-full p-4 mb-4 border border-gray-300 rounded-xl font-inter_regular"
            placeholder="Enter password here"
            secureTextEntry
          />
          <CustomButton
            containerStyles='bg-secondary-web'
            handlePress={handleLogin}
            iconImage={require('../assets/icons/login.png')}
            title='Login'
            tintColor='black'
          />
        </View>
      </ScrollView>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? 'black' : 'white'} />
    </SafeAreaView>
  )
}

export default SignInWeb