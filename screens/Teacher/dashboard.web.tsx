import { Text, TouchableOpacity, useColorScheme, View, VirtualizedList, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDarkMode } from '@/contexts/DarkModeContext';
import ActivityIcon from '@/assets/icons/activity.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import CoursesIcon from '@/assets/icons/course_book.svg'
import GradesIcon from '@/assets/icons/grades.svg'
import InstitutionIcon from '@/assets/icons/institution.svg'
import ProfileIcon from '@/assets/icons/account.svg'

cssInterop(VirtualizedList, { className: "style" });
cssInterop(Image, { className: "style" });

const DBWeb: React.FC = () => {
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
      description: 'Access your enrolled courses, explore new subjects, and track your learning progress in one place.',
      Icon: CoursesIcon,
      title: 'Courses',
      onPress: () => router.replace('/(students)/courses')
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

  const getItem = (data: { [x: string]: any; }, index: string | number) => data[index];
  const getItemCount = (data: string | any[]) => data.length;

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
  
  // Add a mock preview of courses for the dashboard
  const mockCourses = [
    { _id: '1', name: 'Mathematics', section: 'G1 - Section 1', schoolYear: '2024-2025', adviser: 'Mr. Smith' },
    { _id: '2', name: 'Science', section: 'G1 - Section 1', schoolYear: '2024-2025', adviser: 'Ms. Johnson' },
    { _id: '3', name: 'English', section: 'G1 - Section 1', schoolYear: '2024-2025', adviser: 'Mr. Lee' },
  ];

  return (
    <SafeAreaView className={`flex-1 justify-center ${isPortrait ? 'items-center' : 'items-start'} ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-left self-start font-inter_bold ml-[12px] mt-[12px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} sm:text-sm md:text-base lg:text-lg`}>Welcome, teacher.</Text>
      <VirtualizedList
        data={data}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className={
              `min-h-[125px] rounded-[10px] flex-row m-[12px] p-[12px]
              ${isPortrait ? 'w-auto' : 'w-[300px]'}
              ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-md'}`
            } 
            onPress={item.onPress}>
            <View>
              <item.Icon width={50} height={50} fill={`${isDarkMode ? '#E0E0E0' : 'black'}`} />
            </View>
            <View className="ml-[10px] mb-[10px] flex-shrink">
              <Text className={
                  `text-[24px] font-inter_bold mb-[3px] 
                  ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`
                }>
                  {item.title}
              </Text>
              <Text className={`text-[14px] font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => index.toString()}
        getItem={getItem}
        getItemCount={getItemCount}
        contentContainerStyle={{ 
          flexDirection: isPortrait ? 'column' : 'row',
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
        }}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  );
}

export default DBWeb;
