import { Platform } from 'react-native'
import React from 'react'
import SubjectDetailsAndroid from '@/screens/Admin/subject-details.android'
import SubjectDetailsIOS from '@/screens/Admin/subject-details.ios'
import SubjectDetailsWeb from '@/screens/Admin/subject-details.web'

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