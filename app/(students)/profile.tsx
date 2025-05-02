import { Platform } from 'react-native'
import React from 'react'
import ProfileAndroid from '@/screens/profile.android'
import ProfileIOS from '@/screens/profile.ios'
import ProfileWeb from '@/screens/profile.web'

const Profile = () => {
  if (Platform.OS === 'ios'){
    return <ProfileIOS/>
  }
  if (Platform.OS === 'web'){
    return <ProfileWeb/>
  }
  else{
    return <ProfileAndroid/>
  }
}

export default Profile