import { Platform } from 'react-native'
import React from 'react'
import SubjectDetailsAndroid from '@/screens/subject-details.android'
import SubjectDetailsIOS from '@/screens/subject-details.ios'
import SubjectDetailsWeb from '@/screens/subject-details.web'

const SubjectDetails = () => {
  if (Platform.OS === 'ios'){
    return <SubjectDetailsIOS/>
  }
  if (Platform.OS === 'web'){
    return <SubjectDetailsWeb/>
  }
  else{
    return <SubjectDetailsAndroid/>
  }
}

export default SubjectDetails