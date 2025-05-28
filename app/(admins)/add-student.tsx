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
=======
import { Platform } from 'react-native'
import React from 'react'
import AddStudentAndroid from '@/screens/Admin/add-student.android'
import AddStudentIOS from '@/screens/Admin/add-student.ios'
import AddStudentWeb from '@/screens/Admin/add-student.web'

const AddStudent = () => {
  if (Platform.OS === 'ios') {
    return <AddStudentIOS />
  }
  if (Platform.OS === 'web') {
    return <AddStudentWeb />
  } 
  if (Platform.OS === 'android') {
    return <AddStudentAndroid />
  }
}

export default AddStudent
