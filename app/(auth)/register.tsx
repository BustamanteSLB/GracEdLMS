import { Platform } from 'react-native'
import React from 'react'
import RegisterAndroid from '@/screens/register.android'
import RegisterIOS from '@/screens/register.ios'
import RegisterWeb from '@/screens/register.web'

const Register = () => {
  if (Platform.OS === 'ios'){
    return <RegisterIOS/>
  }
  if (Platform.OS === 'web'){
    return <RegisterWeb/>
  }
  else{
    return <RegisterAndroid/>
  }
}

export default Register
