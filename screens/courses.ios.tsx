import { View, Text, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React from 'react'

const CoursesIOS: React.FC = () => {

  const colorScheme = useColorScheme();

  return (
    <View>
      <Text>Courses - IOS</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </View>
  )
}

export default CoursesIOS