import { Platform } from 'react-native'
import React from 'react'
import GradesAndroid from '@/screens/grades.android'
import GradesIOS from '@/screens/grades.ios'
import GradesWeb from '@/screens/grades.web'

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