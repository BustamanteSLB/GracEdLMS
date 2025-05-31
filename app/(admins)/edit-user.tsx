import { Platform } from 'react-native'
import React from 'react'
import EditUserAndroid from '@/screens/Admin/edit-user.android'
import EditUserIOS from '@/screens/Admin/edit-user.ios'
import EditUserWeb from '@/screens/Admin/edit-user.web'

const EditUser = () => {
  if (Platform.OS === 'ios') {
    return <EditUserIOS />
  }
  if (Platform.OS === 'web') {
    return <EditUserWeb />
  } 
  if (Platform.OS === 'android') {
    return <EditUserAndroid />
  }
}

export default EditUser