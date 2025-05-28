import { Platform } from 'react-native'
import React from 'react'
import EditTeacherAndroid from '@/screens/Admin/edit-teacher.android'
import EditTeacherIOS from '@/screens/Admin/edit-teacher.ios'
import EditTeacherWeb from '@/screens/Admin/edit-teacher.web'

const EditTeacher = () => {
  if (Platform.OS === 'ios') {
    return <EditTeacherIOS />
  }
  if (Platform.OS === 'web') {
    return <EditTeacherWeb />
  } 
  if (Platform.OS === 'android') {
    return <EditTeacherAndroid />
  }
}

export default EditTeacher