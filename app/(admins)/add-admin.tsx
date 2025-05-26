import { Platform } from 'react-native'
import React from 'react'
import AddAdminAndroid from '@/screens/Admin/add-admin.android'
import AddAdminIOS from '@/screens/Admin/add-admin.ios'
import AddAdminWeb from '@/screens/Admin/add-admin.web'

const AddAdmin = () => {
  if (Platform.OS === 'ios') {
    return <AddAdminIOS />
  }
  if (Platform.OS === 'web') {
    return <AddAdminWeb />
  } 
  if (Platform.OS === 'android') {
    return <AddAdminAndroid />
  }
}

export default AddAdmin