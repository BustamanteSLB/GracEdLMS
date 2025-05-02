import { View, Text, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React from 'react'

const GradesAndroid: React.FC = () => {

  const colorScheme = useColorScheme();

  return (
    <View>
      <Text>Grades - Android</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </View>
  )
}

export default GradesAndroid