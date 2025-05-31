import React from 'react';
import { useState } from 'react';
import { Text, View, useColorScheme, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import AddCourseModal from '@/components/AddCourseModal'
import apiClient from '@/app/services/apiClient'

const CoursesWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [isModalVisible, setIsModalVisible] = useState(false);
  cssInterop(Image, { className: "style" });

  const handleAddCourse = async (courseData: any) => {
    try {
      const response = await apiClient.post('/courses', courseData);
      console.log('Course added successfully:', response.data);
      // TODO: Update the courses list or show success message
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error adding course:', error);
      // TODO: Show error message to user
    }
  };

  return (
    <View>
      <Text style={{ color: 'magenta', fontWeight: 'bold', fontSize: 48, marginBottom: 40, textAlign: 'center' }}>
        HELLO FROM screens/Teacher/courses.web.tsx
      </Text>
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="p-6">
          <Text style={{color: 'red', fontWeight: 'bold', fontSize: 18, marginBottom: 10}}>DEBUG: This is the courses.web.tsx file</Text>
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            style={{backgroundColor: 'orange', padding: 12, borderRadius: 8, marginBottom: 20, alignSelf: 'flex-start'}}
          >
            <Text style={{color: 'white', fontWeight: 'bold'}}>DEBUG: Add Course</Text>
          </TouchableOpacity>
          <Text className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>My Courses</Text>
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            className="self-end mb-6 px-4 py-2 rounded-lg bg-blue-600"
          >
            <Text className="text-white">+ Add Course</Text>
          </TouchableOpacity>
          <View className="flex-1 items-center justify-center">
            <Image
              className="w-[150] h-[150]"
              contentFit="contain"
              source={require('@/assets/images/online-course.png')}
              transition={200}
            />
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Courses will appear here once they are assigned by your teachers.
            </Text>
          </View>
        </View>
        <AddCourseModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onSubmit={handleAddCourse}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    </View>
  )
}

export default CoursesWeb