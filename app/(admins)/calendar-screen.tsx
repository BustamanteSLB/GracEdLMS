import { Platform } from 'react-native'
import React from 'react'
import CalendarAndroid from '@/screens/Admin/calendar-screen.android'
import CalendarIOS from '@/screens/Admin/calendar-screen.ios'
import CalendarWeb from '@/screens/Admin/calendar-screen.web'

const CalendarScreen = () => {
  if (Platform.OS === 'ios'){
    return <CalendarIOS/>
  }
  if (Platform.OS === 'web'){
    return <CalendarWeb/>
  }
  else{
    return <CalendarAndroid/>
  }
}

export default CalendarScreen