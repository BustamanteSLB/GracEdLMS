import { Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'

const ManageStudentsAndroid = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  cssInterop(Image, { className: "style" });

  return (
    <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <Image
        className="w-[150] h-[150]"
        contentFit="contain"
        source={require('@/assets/images/student_background.png')}
        transition={200}
      />
      <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>Students will appear here once you start adding students.</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default ManageStudentsAndroid