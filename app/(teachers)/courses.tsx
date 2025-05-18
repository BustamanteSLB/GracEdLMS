import { Platform } from 'react-native'
import React from 'react'
import CoursesAndroid from '@/screens/Teacher/courses.android'
import CoursesIOS from '@/screens/Teacher/courses.ios'
import CoursesWeb from '@/screens/Teacher/courses.web'

const Courses = () => {
  if (Platform.OS === 'ios'){
    return <CoursesIOS/>
  }
  if (Platform.OS === 'web'){
    return <CoursesWeb/>
  }
  else{
    return <CoursesAndroid/>
  }
}

export default Courses