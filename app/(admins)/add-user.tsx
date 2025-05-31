import { Platform } from 'react-native'
import React from 'react'
import AddUserAndroid from '@/screens/Admin/add-user.android'
import AddUserIOS from '@/screens/Admin/add-user.ios'
import AddUserWeb from '@/screens/Admin/add-user.web'

const AddUser = () => {
  if (Platform.OS === 'ios') {
    return <AddUserIOS />
  }
  if (Platform.OS === 'web') {
    return <AddUserWeb />
  } 
  if (Platform.OS === 'android') {
    return <AddUserAndroid />
  }
}

export default AddUser