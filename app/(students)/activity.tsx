import { Platform } from 'react-native'
import React from 'react'
import ActivityAndroid from '@/screens/activity.android'
import ActivityIOS from '@/screens/activity.ios'
import ActivityWeb from '@/screens/activity.web'

const Activity = () => {
  if (Platform.OS === 'ios'){
    return <ActivityIOS/>
  }
  if (Platform.OS === 'web'){
    return <ActivityWeb/>
  }
  else{
    return <ActivityAndroid/>
  }
}

export default Activity