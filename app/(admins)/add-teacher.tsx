import { Platform } from 'react-native'
import React from 'react'
import AddTeacherAndroid from '@/screens/Admin/add-teacher.android'
import AddTeacherIOS from '@/screens/Admin/add-teacher.ios'
import AddTeacherWeb from '@/screens/Admin/add-teacher.web'

const AddTeacher = () => {
  if (Platform.OS === 'ios') {
    return <AddTeacherIOS />
  }
  if (Platform.OS === 'web') {
    return <AddTeacherWeb />
  } 
  if (Platform.OS === 'android') {
    return <AddTeacherAndroid />
  }
}

export default AddTeacher