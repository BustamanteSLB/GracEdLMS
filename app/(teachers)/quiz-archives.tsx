import { Platform, View, Text } from 'react-native'
import React from 'react'
import QuizArchivesAndroid from '@/screens/Teacher/quiz-archives.android';
import QuizArchivesWeb from '@/screens/Teacher/quiz-archives.web';

const QuizArchives = () => {
  if (Platform.OS === 'web') {
    return <QuizArchivesWeb />
  } 
  if (Platform.OS === 'android') {
    return <QuizArchivesAndroid />
  }
}

export default QuizArchives