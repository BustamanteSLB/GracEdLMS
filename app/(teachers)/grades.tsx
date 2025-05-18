import { Platform } from 'react-native'
import React from 'react'
import GradesAndroid from '@/screens/Teacher/grades.android'
import GradesIOS from '@/screens/Teacher/grades.ios'
import GradesWeb from '@/screens/Teacher/grades.web'

const Grades = () => {
  if (Platform.OS === 'ios'){
    return <GradesIOS/>
  }
  if (Platform.OS === 'web'){
    return <GradesWeb/>
  }
  else{
    return <GradesAndroid/>
  }
}

export default Grades