import { Platform } from 'react-native'
import React from 'react'
import SchoolPageAndroid from '@/screens/Teacher/school-page.android'
import SchoolPageIOS from '@/screens/Teacher/school-page.ios'
import SchoolPageWeb from '@/screens/Teacher/school-page.web'

const SchoolPage = () => {
  if (Platform.OS === 'ios'){
    return <SchoolPageIOS/>
  }
  if (Platform.OS === 'web'){
    return <SchoolPageWeb/>
  }
  else{
    return <SchoolPageAndroid/>
  }
}

export default SchoolPage