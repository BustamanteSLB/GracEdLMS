import { Platform } from 'react-native'
import React from 'react'
import ManageAdminsAndroid from '@/screens/Admin/admin-list.android'
import ManageAdminsIOS from '@/screens/Admin/admin-list.ios'
import ManageAdminsWeb from '@/screens/Admin/admin-list.web'

const ManageAdmins: React.FC = () => {
  if (Platform.OS === 'ios'){
    return <ManageAdminsIOS/>
  }
  if (Platform.OS === 'web'){
    return <ManageAdminsWeb/>
  }
  else{
    return <ManageAdminsAndroid/>
  }
}

export default ManageAdmins