import { Platform } from 'react-native'
import React from 'react'
import InstitutionAndroid from '@/screens/institution.android'
import InstitutionIOS from '@/screens/institution.ios'
import InstitutionWeb from '@/screens/institution.web'

const Insitution = () => {
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

export default Insitution