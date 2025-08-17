import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useDarkMode } from '@/contexts/DarkModeContext';
import AttachIcon from '@/assets/icons/attach.svg';

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

interface Submission {
  _id: string;
  student: User;
  submissionDate: string;
  attachmentPaths?: string[];
  status: 'submitted' | 'graded' | 'pending' | 'unsubmitted';
  grade?: number | null;
  feedback?: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ViewSubmissionsModalWebProps {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  submissions: Submission[];
  loading: boolean;
  formatDate: (dateString: string) => string;
  getUserFullName: (user: User) => string;
}

const ViewSubmissionsModalWeb: React.FC<ViewSubmissionsModalWebProps> = ({
  visible,
  onClose,
  activity,
  submissions,
  loading,
  formatDate,
  getUserFullName,
}) => {
  const { isDarkMode } = useDarkMode();

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
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#23272F' : '#fff',
            borderRadius: 12,
            padding: 24,
            width: '95%',
            maxWidth: 700,
            maxHeight: '90%',
          }}
        >
          {loading ? (
            <View className='items-center justify-center py-8'>
              <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
              <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Loading submissions...
              </Text>
            </View>
          ) : (
            <>
              <Text
                className={`font-pbold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              >
                Submissions for "{activity?.title}"
              </Text>

              {/* Activity Info */}
              {activity && (
                <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Subject: {activity.subject.subjectName} - {activity.subject.section}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Deadline: {formatDate(activity.deadline)}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Submissions: {submissions.length}
                  </Text>
                </View>
              )}

              {submissions.length > 0 ? (
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {submissions.map((submission, idx) => (
                    <View
                      key={submission._id}
                      style={{
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: submission.status === 'submitted' ? '#10B981' : '#6B7280',
                      }}
                    >
                      {/* Student Info */}
                      <View className='flex-row items-center mb-2'>
                        <Image
                          style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
                          source={
                            submission.student.profilePicture
                              ? { uri: submission.student.profilePicture }
                              : require('@/assets/images/sample_profile_picture.png')
                          }
                        />
                        <View style={{ flex: 1 }}>
                          <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            {getUserFullName(submission.student)}
                          </Text>
                          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {submission.student.email}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: submission.status === 'submitted' ? '#10B981' : '#6B7280',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text className='text-white font-inter_semibold text-xs'>
                            {submission.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Submission Details */}
                      <Text className={`font-inter_regular text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Submitted on: {formatDate(submission.submissionDate)}
                      </Text>

                      {/* Grade */}
                      {submission.grade !== null && submission.grade !== undefined && (
                        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Grade: {submission.grade}
                          {activity?.points && ` / ${activity.points}`}
                        </Text>
                      )}

                      {/* Feedback */}
                      {submission.feedback && (
                        <View className='mb-2'>
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Feedback:
                          </Text>
                          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {submission.feedback}
                          </Text>
                        </View>
                      )}

                      {/* Attached Files */}
                      {submission.attachmentPaths && submission.attachmentPaths.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Submitted Files:
                          </Text>
                          {submission.attachmentPaths.map((path, fileIdx) => (
                            <TouchableOpacity
                              key={fileIdx}
                              onPress={() => {
                                const url = `http://192.168.100.5:5000/${path}`;
                                if (Platform.OS === 'web') {
                                  window.open(url, '_blank');
                                }
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 4,
                                padding: 8,
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8',
                                borderRadius: 6,
                              }}
                            >
                              <AttachIcon 
                                width={16} 
                                height={16} 
                                style={{ marginRight: 4 }} 
                                fill={isDarkMode ? '#A78BFA' : '#6D28D9'} 
                              />
                              <Text className={`font-inter_regular text-sm underline ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                {path.split('/').pop()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className='items-center justify-center py-8'>
                  <Image
                    className="w-[80] h-[80] opacity-50"
                    contentFit="contain"
                    source={require('@/assets/images/no_results.png')}
                  />
                  <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    No submissions yet for this activity.
                  </Text>
                </View>
              )}

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
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ViewSubmissionsModalWeb;