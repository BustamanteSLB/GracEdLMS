import { Platform } from 'react-native'
import React from 'react'
import CalendarAndroid from '@/screens/Teacher/calendar-screen.android'
import CalendarIOS from '@/screens/Teacher/calendar-screen.ios'
import CalendarWeb from '@/screens/Teacher/calendar-screen.web'

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