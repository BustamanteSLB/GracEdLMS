import { Platform, View, Text } from 'react-native'
import React from 'react'
import AddQuizAndroid from '@/screens/Teacher/add-quiz.android'
import AddQuizIOS from '@/screens/Teacher/add-quiz.ios'
import AddQuizWeb from '@/screens/Teacher/add-quiz.web'

const AddQuiz = () => {
  if (Platform.OS === 'ios') {
    return <AddQuizIOS/>
  }
  if (Platform.OS === 'web') {
    return <AddQuizWeb/>
  }
  if (Platform.OS === 'android') {
    return <AddQuizAndroid/>
  }
}

export default AddQuiz