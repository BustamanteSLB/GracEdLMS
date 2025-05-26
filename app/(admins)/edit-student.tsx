import { Platform } from 'react-native'
import React from 'react'
import EditStudentAndroid from '@/screens/Admin/edit-student.android'
import EditStudentIOS from '@/screens/Admin/edit-student.ios'
import EditStudentWeb from '@/screens/Admin/edit-student.web'

const EditStudent = () => {
  if (Platform.OS === 'ios') {
    return <EditStudentIOS />
  }
  if (Platform.OS === 'web') {
    return <EditStudentWeb />
  } 
  if (Platform.OS === 'android') {
    return <EditStudentAndroid />
  }
}

export default EditStudent