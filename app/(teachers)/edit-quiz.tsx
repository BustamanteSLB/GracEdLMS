import { Platform, View, Text } from 'react-native'
import React from 'react'
import EditQuizAndroid from '@/screens/Teacher/edit-quiz.android'
import EditQuizIOS from '@/screens/Teacher/edit-quiz.ios'
import EditQuizWeb from '@/screens/Teacher/edit-quiz.web'

const EditQuiz = () => {
  if (Platform.OS === 'ios') {
    return <EditQuizIOS/>
  }
  if (Platform.OS === 'web') {
    return <EditQuizWeb/>
  }
  if (Platform.OS === 'android') {
    return <EditQuizAndroid/>
  }
}

export default EditQuiz