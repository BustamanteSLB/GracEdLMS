import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router';
import { useDarkMode } from '../contexts/DarkModeContext';

cssInterop(FlashList, { className: "style" });
cssInterop(Image, { className: "style" });

const DBAndroid: React.FC = () => {

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();

  const data = [
    {
      description: 'Stay updated with recent interactions, announcements, and progress summaries in your learning journey.',
      image: require('../assets/icons/activity.png'),
      title: 'Activity',
      onPress: () => router.replace('/(students)/activity')
    },
    {
      description: 'Access your enrolled courses, explore new subjects, and track your learning progress in one place.',
      image: require('../assets/icons/course_book.png'),
      title: 'Courses',
      onPress: () => router.replace('/(students)/courses')
    },
    {
      description: 'Browse institutions, discover new opportunities, and connect with the right place to grow your learning journey.',
      image: require('../assets/icons/institute.png'),
      title: 'Insitution',
      onPress: () => router.replace('/(students)/institution')
    },
  ];

  return (
    <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-left self-start font-inter_semibold ml-[10px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Welcome, student.</Text>
      <FlashList
        data={data}
        renderItem={({ item }) => (
          <TouchableOpacity className={`min-h-[125px] rounded-[10px] flex-row m-[10px] p-[10px] ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white elevation-xl shadow-black'}`} onPress={item.onPress}>
            <View>
              <Image
                source={item.image}
                className="w-[50px] h-[50px]"
                contentFit='contain'
                transition={200}
                tintColor={isDarkMode ? '#E0E0E0' : 'black'}
              />
            </View>
            <View className="ml-[10px] mb-[10px] flex-shrink">
              <Text className={`text-[24px] font-inter_bold mb-[3px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.title}</Text>
              <Text className={`text-[14px] font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
        estimatedItemSize={10}
        estimatedListSize={{height: 100, width: 400}}
        keyExtractor={(item, index) => index.toString()}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'dark' : 'light'} />
    </SafeAreaView>
  )
}

export default DBAndroid;
