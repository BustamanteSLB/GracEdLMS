import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
}

interface Subject {
  _id: string;
  subjectId: string;
  subjectName: string;
  subjectDescription?: string;
  teacher: User;
  section: string;
  gradeLevel: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'archived';
}

interface Grade {
  _id: string;
  student: User;
  activity: string;
  subject: string;
  quarter: string; // Add the required quarter field
  score: number;
  bonusPoints?: number;
  gradedBy: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  quarter: string; // Add the required quarter field
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

interface ViewActivityModalWebProps {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  onViewSubmissions: (activity: Activity) => void;
  canModifyActivity: (activity: Activity) => boolean;
  getActivityStatus: (activity: Activity) => { status: string; color: string; text: string };
  getSubmissionCount: (activity: Activity) => number;
  formatDate: (dateString: string) => string;
  getUserFullName: (user: User) => string;
}

const ViewActivityModalWeb: React.FC<ViewActivityModalWebProps> = ({
  visible,
  onClose,
  activity,
  onViewSubmissions,
  canModifyActivity,
  getActivityStatus,
  getSubmissionCount,
  formatDate,
  getUserFullName,
}) => {
  const { isDarkMode } = useDarkMode();

  if (!activity) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#23272F' : '#fff',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            maxHeight: '80%',
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              className={`font-pbold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              {activity.title}
            </Text>

            {/* Subject Information */}
            <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Subject: {activity.subject.subjectName}
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Section: {activity.subject.section} • {activity.subject.gradeLevel} {activity.subject.schoolYear}
              </Text>
            </View>

            {/* Quarter Information */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Quarter:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activity.quarter}
              </Text>
            </View>

            {/* Grading Information */}
            {activity.grades && activity.grades.length > 0 && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Grading Summary:
                </Text>
                <View className='p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    {activity.grades.length} student{activity.grades.length !== 1 ? 's' : ''} graded
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                    Average Score: {(activity.grades.reduce((sum, grade) => sum + grade.score, 0) / activity.grades.length).toFixed(1)}
                    {activity.points && ` / ${activity.points}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Creator Information */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Created by:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {getUserFullName(activity.createdBy)}
                {canModifyActivity(activity) && (
                  <Text className={`font-inter_semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {' '}(You)
                  </Text>
                )}
              </Text>
            </View>

            {/* Description */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Description:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activity.description || 'No description provided.'}
              </Text>
            </View>

            {/* Dates */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Start Date:
              </Text>
              <Text className={`font-inter_regular text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatDate(activity.visibleDate)}
              </Text>
              
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Deadline:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatDate(activity.deadline)}
              </Text>
            </View>

            {/* Points */}
            {activity.points !== null && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Points:
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activity.points}
                </Text>
              </View>
            )}

            {/* Attachment */}
            {activity.attachmentPath && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Attachment:
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const url = `http://192.168.100.5:5000/${activity.attachmentPath}`;
                    if (Platform.OS === 'web') {
                      window.open(url, '_blank');
                    }
                  }}
                  className='flex-row items-center'
                >
                  <Image
                    className="w-[16] h-[16] mr-2"
                    contentFit="contain"
                    source={require('@/assets/icons/import_file.png')}
                    tintColor={isDarkMode ? '#A78BFA' : '#6D28D9'}
                  />
                  <Text className={`font-inter_regular text-sm underline ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {activity.attachmentPath.split('/').pop()}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Status */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Status:
              </Text>
              <View
                style={{
                  backgroundColor: getActivityStatus(activity).color,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  alignSelf: 'flex-start',
                }}
              >
                <Text className='text-white font-inter_semibold text-sm'>
                  {getActivityStatus(activity).text}
                </Text>
              </View>
            </View>

            {/* View Submissions Button */}
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-purple-600' : 'bg-purple-700'}`}
              onPress={() => {
                onClose();
                onViewSubmissions(activity);
              }}
              style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 16 }}
            >
              <Text className={`font-pbold text-sm text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                View All Submissions ({getSubmissionCount(activity)})
                {activity.grades && activity.grades.length > 0 && ` • ${activity.grades.length} Graded`}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Close Button */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
              onPress={onClose}
              style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}
            >
              <Text className={`font-pbold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ViewActivityModalWeb;