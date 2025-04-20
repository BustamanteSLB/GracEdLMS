import { Platform } from 'react-native'
import React from 'react'
import DBAndroid from '@/screens/dashboard.android'
import DBIOS from '@/screens/dashboard.ios'
import DBWeb from '@/screens/dashboard.web'

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