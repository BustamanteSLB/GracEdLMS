import { Platform, View, Text } from 'react-native'
import React from 'react'
import SubjectArchivesAndroid from '@/screens/Teacher/subject-archives.android';
import SubjectArchivesWeb from '@/screens/Teacher/subject-archives.web';

const SubjectArchives = () => {
  if (Platform.OS === 'web') {
    return <SubjectArchivesWeb />
  } 
  if (Platform.OS === 'android') {
    return <SubjectArchivesAndroid />
  }
}

export default SubjectArchives