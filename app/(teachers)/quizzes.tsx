import { Platform, View, Text } from 'react-native'
import React from 'react'
import QuizzesAndroid from '@/screens/Teacher/quizzes.android'
import QuizzesIOS from '@/screens/Teacher/quizzes.ios'
import QuizzesWeb from '@/screens/Teacher/quizzes.web'

const Quizzes = () => {
  if (Platform.OS === 'ios') {
    return <QuizzesIOS/>
  }
  if (Platform.OS === 'web') {
    return <QuizzesWeb/>
  }
  if (Platform.OS === 'android') {
    return <QuizzesAndroid/>
  }
}

export default Quizzes