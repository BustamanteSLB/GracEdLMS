import { View, Text, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React from 'react'

const ProfileWeb: React.FC = () => {

  const colorScheme = useColorScheme();

  return (
    <View>
      <Text>Profile - Web</Text>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </View>
  )
}

export default ProfileWeb