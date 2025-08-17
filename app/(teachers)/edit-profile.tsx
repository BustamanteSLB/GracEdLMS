import { Platform } from 'react-native'
import React from 'react'
import EditProfileAndroid from '@/screens/Teacher/edit-profile.android'
import EditProfileIOS from '@/screens/Teacher/edit-profile.ios'
import EditProfileWeb from '@/screens/Teacher/edit-profile.web'

const EditProfile = () => {
  if (Platform.OS === 'ios'){
    return <EditProfileIOS/>
  }
  if (Platform.OS === 'web'){
    return <EditProfileWeb/>
  }
  else{
    return <EditProfileAndroid/>
  }
}

export default EditProfile