import { Platform, View, Text } from 'react-native'
import React from 'react'
import SubjectArchivesAndroid from '@/screens/Admin/subject-archives.android';
import SubjectArchivesIOS from '@/screens/Admin/subject-archives.ios';
import SubjectArchivesWeb from '@/screens/Admin/subject-archives.web';

const SubjectArchives = () => {
  if (Platform.OS === 'ios') {
    return <SubjectArchivesIOS />
  }
  if (Platform.OS === 'web') {
    return <SubjectArchivesWeb />
  } 
  if (Platform.OS === 'android') {
    return <SubjectArchivesAndroid />
  }
}

export default SubjectArchives