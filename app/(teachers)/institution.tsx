import { Platform } from 'react-native'
import React from 'react'
import InstitutionAndroid from '@/screens/Teacher/institution.android'
import InstitutionIOS from '@/screens/Teacher/institution.ios'
import InstitutionWeb from '@/screens/Teacher/institution.web'

const Institution = () => {
  if (Platform.OS === 'ios'){
    return <InstitutionIOS/>
  }
  if (Platform.OS === 'web'){
    return <InstitutionWeb/>
  }
  else{
    return <InstitutionAndroid/>
  }
}

export default Institution