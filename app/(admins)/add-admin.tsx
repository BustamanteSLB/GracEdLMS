import { Platform } from 'react-native'
import React from 'react'
import AddAdminWeb from '@/screens/Admin/admin-addadmin.web'

const AddAdmin: React.FC = () => {
  // if (Platform.OS === 'ios') {
  //   return <AddAdminIOS />
  // }
  if (Platform.OS === 'web') {
    return <AddAdminWeb />
  }
  // return <AddAdminAndroid />
}

export default AddAdmin
