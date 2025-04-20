import { Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'

const ActivityAndroid: React.FC = () => {

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return(
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-inter_bold">Activity - Android</Text>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? 'black' : 'white'} />
    </SafeAreaView>
  )
}

export default ActivityAndroid;