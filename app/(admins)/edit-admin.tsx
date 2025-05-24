import { Platform } from 'react-native'
import React from 'react'
import EditAdminWeb from '@/screens/Admin/admin-editadmin.web'

const EditAdmin: React.FC = () => {
  // if (Platform.OS === 'ios') {
  //   return <AddAdminIOS />
  // }
  if (Platform.OS === 'web') {
    return <EditAdminWeb />
  }
  // return <AddAdminAndroid />
}

export default EditAdmin
