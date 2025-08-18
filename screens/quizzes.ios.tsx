import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'

const QuizzesIOS = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  return (
    <View>
      <Text>QuizzesIOS</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  )
}

export default QuizzesIOS