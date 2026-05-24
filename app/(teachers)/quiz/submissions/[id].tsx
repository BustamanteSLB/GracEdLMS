import { Platform, View, Text } from 'react-native'
import React from 'react'
import QuizSubmissionsAndroid from '@/screens/Teacher/quiz-submissions.android'
import QuizSubmissionsIOS from '@/screens/Teacher/quiz-submissions.ios'
import QuizSubmissionsWeb from '@/screens/Teacher/quiz-submissions.web'

const QuizSubmissions = () => {
  if (Platform.OS === 'ios') {
    return <QuizSubmissionsIOS/>
  }
  if (Platform.OS === 'web') {
    return <QuizSubmissionsWeb/>
  }
  if (Platform.OS === 'android') {
    return <QuizSubmissionsAndroid/>
  }
}

export default QuizSubmissions