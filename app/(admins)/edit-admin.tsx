import { Platform } from 'react-native'
import React from 'react'
import EditAdminAndroid from '@/screens/Admin/edit-admin.android'
import EditAdminIOS from '@/screens/Admin/edit-admin.ios'
import EditAdminWeb from '@/screens/Admin/edit-admin.web'

const EditAdmin = () => {
  if (Platform.OS === 'ios') {
    return <EditAdminIOS />
  }
  if (Platform.OS === 'web') {
    return <EditAdminWeb />
  } 
  if (Platform.OS === 'android') {
    return <EditAdminAndroid />
  }
}

export default EditAdmin