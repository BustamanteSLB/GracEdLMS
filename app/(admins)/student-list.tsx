import { Platform } from 'react-native'
import React from 'react'
import ManageStudentsAndroid from '@/screens/Admin/student-list.android'
import ManageStudentsIOS from '@/screens/Admin/student-list.ios'
import ManageStudentsWeb from '@/screens/Admin/student-list.web'

const ManageStudents: React.FC = () => {
  if (Platform.OS === 'ios'){
    return <ManageStudentsIOS/>
  }
  if (Platform.OS === 'web'){
    return <ManageStudentsWeb/>
  }
  else{
    return <ManageStudentsAndroid/>
  }
}

export default ManageStudents