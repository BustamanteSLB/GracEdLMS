import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'

const Institution = () => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-inter_bold">Institution</Text>
      <StatusBar style="auto"/>
    </SafeAreaView>
  )
}

export default Institution