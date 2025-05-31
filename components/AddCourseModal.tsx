import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface AddCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (courseData: CourseData) => void;
}

interface CourseData {
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  schedule: string;
}

const AddCourseModal: React.FC<AddCourseModalProps> = ({ visible, onClose, onSubmit }) => {
  const { isDarkMode } = useDarkMode();
  const [courseData, setCourseData] = useState<CourseData>({
    title: '',
    description: '',
    subject: '',
    gradeLevel: '',
    schedule: '',
  });

  const handleSubmit = () => {
    onSubmit(courseData);
    setCourseData({
      title: '',
      description: '',
      subject: '',
      gradeLevel: '',
      schedule: '',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className={`w-[90%] max-w-[600px] rounded-lg p-6 ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
          <Text className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Add New Course
          </Text>
          
          <ScrollView className="max-h-[70vh]">
            <View className="space-y-4">
              <View>
                <Text className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Course Title</Text>
                <TextInput
                  className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#2D2D2D] text-white border-gray-700' : 'bg-gray-50 text-black border-gray-300'}`}
                  value={courseData.title}
                  onChangeText={(text) => setCourseData({ ...courseData, title: text })}
                  placeholder="Enter course title"
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
              </View>

              <View>
                <Text className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</Text>
                <TextInput
                  className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#2D2D2D] text-white border-gray-700' : 'bg-gray-50 text-black border-gray-300'}`}
                  value={courseData.description}
                  onChangeText={(text) => setCourseData({ ...courseData, description: text })}
                  placeholder="Enter course description"
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View>
                <Text className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject</Text>
                <TextInput
                  className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#2D2D2D] text-white border-gray-700' : 'bg-gray-50 text-black border-gray-300'}`}
                  value={courseData.subject}
                  onChangeText={(text) => setCourseData({ ...courseData, subject: text })}
                  placeholder="Enter subject"
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
              </View>

              <View>
                <Text className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Grade Level</Text>
                <TextInput
                  className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#2D2D2D] text-white border-gray-700' : 'bg-gray-50 text-black border-gray-300'}`}
                  value={courseData.gradeLevel}
                  onChangeText={(text) => setCourseData({ ...courseData, gradeLevel: text })}
                  placeholder="Enter grade level"
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
              </View>

              <View>
                <Text className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Schedule</Text>
                <TextInput
                  className={`p-3 rounded-lg border ${isDarkMode ? 'bg-[#2D2D2D] text-white border-gray-700' : 'bg-gray-50 text-black border-gray-300'}`}
                  value={courseData.schedule}
                  onChangeText={(text) => setCourseData({ ...courseData, schedule: text })}
                  placeholder="Enter schedule (e.g., MWF 9:00 AM - 10:30 AM)"
                  placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                />
              </View>
            </View>
          </ScrollView>

          <View className="flex-row justify-end space-x-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
              className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              <Text className={isDarkMode ? 'text-white' : 'text-gray-800'}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600"
            >
              <Text className="text-white">Add Course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddCourseModal; 