import { Platform } from 'react-native'
import React from 'react'
import EditProfileAndroid from '@/screens/edit-profile.android'
import EditProfileIOS from '@/screens/edit-profile.ios'
import EditProfileWeb from '@/screens/edit-profile.web'

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