import { Dimensions, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect } from 'react';
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router';
import { useDarkMode } from '../contexts/DarkModeContext';
import ActivityIcon from '@/assets/icons/activity.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import CoursesIcon from '@/assets/icons/course_book.svg'
import GradesIcon from '@/assets/icons/grades.svg'
import InstitutionIcon from '@/assets/icons/institution.svg'
import ProfileIcon from '@/assets/icons/account.svg'

cssInterop(FlashList, { className: "style" });
cssInterop(Image, { className: "style" });

const DBIOS: React.FC = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();

  const data = [
    {
      description: 'Stay updated with recent interactions, announcements, and progress summaries in your learning journey.',
      Icon: ActivityIcon,
      title: 'Activity',
      onPress: () => router.replace('/(students)/activity')
    },
    {
      description: 'View and manage your academic calendar, including upcoming classes, deadlines, and events.',
      Icon: CalendarIcon,
      title: 'Calendar',
      onPress: () => router.replace('/(students)/calendar-screen')
    },
    {
      description: 'Access your enrolled subjects, explore new subjects, and track your learning progress in one place.',
      Icon: CoursesIcon,
      title: 'Courses',
      onPress: () => router.replace('/(students)/subjects')
    },
    {
      description: 'Check your grades, monitor academic performance, and review feedback from instructors.',
      Icon: GradesIcon,
      title: 'Grades',
      onPress: () => router.replace('/(students)/grades')
    },
    {
      description: 'Browse institutions, discover new opportunities, and connect with the right place to grow your learning journey.',
      Icon: InstitutionIcon,
      title: 'Institution',
      onPress: () => router.replace('/(students)/institution')
    },
    {
      description: 'Manage your profile, update personal information, and customize your learning preferences.',
      Icon: ProfileIcon,
      title: 'Profile',
      onPress: () => router.replace('/(students)/profile')
    },
  ];

  const [isPortrait, setIsPortrait] = useState(true);

  
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsPortrait(height >= width);
    };
    
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    // Initial check
    updateOrientation();
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-left self-start font-inter_semibold ml-[10px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Welcome, student.</Text>
      <FlashList
        data={data}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className={
              `min-h-[125px] rounded-[10px] flex-row m-[12px] p-[12px]  
              ${isPortrait ? 'w-auto' : 'w-[300px]'}
              ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white elevation-xl shadow-black'}`
            } 
            onPress={item.onPress}>
            <View>
              <item.Icon width={50} height={50} fill={`${isDarkMode ? '#E0E0E0' : 'black'}`} />
            </View>
            <View className="ml-[10px] mb-[10px] flex-shrink">
              <Text className={`text-[24px] font-inter_bold mb-[3px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.title}</Text>
              <Text className={`text-[14px] font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
        estimatedItemSize={10}
        estimatedListSize={{height: 100, width: 400}}
        horizontal={!isPortrait}
        keyExtractor={(item, index) => index.toString()}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default DBIOS;
