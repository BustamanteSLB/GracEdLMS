import { Platform } from 'react-native'
import React from 'react'
import SchoolPageAndroid from '@/screens/Admin/school-page.android'
import SchoolPageIOS from '@/screens/Admin/school-page.ios'
import SchoolPageWeb from '@/screens/Admin/school-page.web'

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