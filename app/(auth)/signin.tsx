import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { Link} from 'expo-router'

const SignIn = () => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center ios:bg-secondary-ios android:bg-secondary-android web:bg-secondary-web">
      <Text className="text-3xl font-pbold">Sign In</Text>
      <Link href="/(drawer)/dashboard" className="text-pink-600 font-inter_regular">Go to Dashboard</Link>
      <StatusBar style="auto"/>
    </SafeAreaView>
  )
}

export default SignIn