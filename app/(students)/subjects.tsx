import { Platform } from 'react-native'
import React from 'react'
import SubjectsAndroid from '@/screens/subjects.android'
import SubjectsIOS from '@/screens/subjects.ios'
import SubjectsWeb from '@/screens/subjects.web'

const Subjects = () => {
  if (Platform.OS === 'ios'){
    return <SubjectsIOS/>
  }
  if (Platform.OS === 'web'){
    return <SubjectsWeb/>
  }
  else{
    return <SubjectsAndroid/>
  }
}

export default Subjects