import { Platform } from 'react-native'
import React from 'react'
import SubjectsAndroid from '@/screens/Admin/subjects.android'
import SubjectsIOS from '@/screens/Admin/subjects.ios'
import SubjectsWeb from '@/screens/Admin/subjects.web'

const Subjects = () => {
  if (Platform.OS === 'ios') {
    return <SubjectsIOS/>
  }
  if (Platform.OS === 'web') {
    return <SubjectsWeb/>
  }
  if (Platform.OS === 'android') {
    return <SubjectsAndroid/>
  }
}

export default Subjects