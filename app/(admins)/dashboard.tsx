import { Platform } from 'react-native'
import React from 'react'
import DBAndroid from '@/screens/Admin/dashboard.android'
import DBIOS from '@/screens/Admin/dashboard.ios'
import DBWeb from '@/screens/Admin/dashboard.web'

const Dashboard: React.FC = () => {
  if (Platform.OS === 'ios'){
    return <DBIOS/>
  }
  if (Platform.OS === 'web'){
    return <DBWeb/>
  }
  else{
    return <DBAndroid/>
  }
}

export default Dashboard