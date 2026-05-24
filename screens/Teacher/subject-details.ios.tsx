import React from 'react'
import { Subject } from '@/app/types/index';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';

cssInterop(Image, { className: 'style' });

const SubjectDetailsIOS = () => {

  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  // Get the subject data from the route parameters
  const params = useLocalSearchParams();
  const viewingSubject: Subject | null = params.subject
    ? JSON.parse(params.subject as string)
    : null;
  
  if (!viewingSubject) {
    // Handle case where no subject data is passed (shouldn't happen with the new flow)
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} justify-center items-center`}>
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'}`}>Subject not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-2 bg-blue-500 rounded">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Calculate the adviser name here, as it was in the original component
  const adviserName = viewingSubject.teacher
    ? `${viewingSubject.teacher.firstName} ${viewingSubject.teacher.middleName ? viewingSubject.teacher.middleName + ' ' : ''}${viewingSubject.teacher.lastName}`
    : 'Not assigned';
  
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SubjectDetailsTabs 
          subject={viewingSubject} 
          isDarkMode={isDarkMode} 
          isAdminOrTeacher={true}
        />
      </ScrollView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default SubjectDetailsIOS