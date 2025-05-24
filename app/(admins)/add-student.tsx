import { Platform } from 'react-native'
import React from 'react'
import AddStudentWeb from '@/screens/Admin/admin-addstudent.web'

const AddStudent: React.FC = () => {
//   if (Platform.OS === 'ios') {
//     return <AddStudentIOS />
//   }
  if (Platform.OS === 'web') {
    return <AddStudentWeb />
  }
//   return <AddStudentAndroid />
}

export default AddStudent
