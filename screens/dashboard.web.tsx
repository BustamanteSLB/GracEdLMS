import { Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '../contexts/DarkModeContext';

const DBWeb: React.FC = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  return(
    <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-3xl font-inter_bold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Dashboard - Web</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'dark' : 'light'} />
    </SafeAreaView>
  )
}

export default DBWeb;
