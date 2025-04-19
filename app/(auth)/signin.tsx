import { Platform } from 'react-native'
import React from 'react'
import SignInAndroid from '@/screens/signin.android'
import SignInIOS from '@/screens/signin.ios'
import SignInWeb from '@/screens/signin.web'

const SignIn = () => {
  if (Platform.OS === 'ios'){
    return <SignInIOS/>
  }
  if (Platform.OS === 'web'){
    return <SignInWeb/>
  }
  else{
    return <SignInAndroid/>
  }
}

export default SignIn
