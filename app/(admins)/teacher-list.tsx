import { Platform } from 'react-native'
import React from 'react'
import ManageTeachersAndroid from '@/screens/Admin/teacher-list.android'
import ManageTeachersIOS from '@/screens/Admin/teacher-list.ios'
import ManageTeachersWeb from '@/screens/Admin/teacher-list.web'

const ManageTeachers: React.FC = () => {
  if (Platform.OS === 'ios'){
    return <ManageTeachersIOS/>
  }
  if (Platform.OS === 'web'){
    return <ManageTeachersWeb/>
  }
  else{
    return <ManageTeachersAndroid/>
  }
}

export default ManageTeachers