import { Platform } from 'react-native'
import React from 'react'
import ArchivesAndroid from '@/screens/Admin/archives.android'
import ArchivesIOS from '@/screens/Admin/archives.ios'
import ArchivesWeb from '@/screens/Admin/archives.web'

const Archives = () => {
  if (Platform.OS === 'ios') {
    return <ArchivesIOS />
  }
  if (Platform.OS === 'web') {
    return <ArchivesWeb />
  } 
  if (Platform.OS === 'android') {
    return <ArchivesAndroid />
  }
}

export default Archives