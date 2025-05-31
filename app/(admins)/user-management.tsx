import { Platform } from 'react-native'
import React from 'react'
import UserManageAndroid from '@/screens/Admin/user-management.android'
import UserManageIOS from '@/screens/Admin/user-management.ios'
import UserManageWeb from '@/screens/Admin/user-management.web'

const UserManage: React.FC = () => {
  if (Platform.OS === 'ios'){
    return <UserManageIOS/>
  }
  if (Platform.OS === 'web'){
    return <UserManageWeb/>
  }
  else{
    return <UserManageAndroid/>
  }
}

export default UserManage