import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
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
  teachers: Array<{
    teacher: User;
    terms: {
      1: boolean;
      2: boolean;
      3: boolean;
    };
    isAssignedToAllTerms: boolean;
  }>;
  section: string;
  gradeLevel: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'archived';
  subjectImage?: string;
}

interface Grade {
  _id: string;
  student: User;
  activity: string;
  subject: string;
  term: string;
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
  term: string;
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  allowLateSubmissions: boolean;
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

interface ViewActivityModalWebProps {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  onViewSubmissions: (activity: Activity) => void | Promise<void>;
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
  const [fileLoadError, setFileLoadError] = useState<{[key: string]: boolean}>({});

  // Helper function to validate and get file URL
  const getFileUrl = (fileUrl: string) => {
    // If it's already a full Firebase URL, return as is
    if (fileUrl.startsWith('https://storage.googleapis.com/') || 
        fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return fileUrl;
    }
    
    // If it's a legacy local path, handle backward compatibility
    if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      console.warn('Legacy file path detected:', fileUrl);
      return null; // or return a placeholder/migration notice
    }
    
    // If it's already a relative path that might be a Firebase URL
    return fileUrl;
  };

  const handleFileError = (fileUrl: string) => {
    console.warn('Failed to load file:', fileUrl);
    setFileLoadError(prev => ({ ...prev, [fileUrl]: true }));
  };

  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (!activity) return null;

  const statusInfo = getActivityStatus(activity);
  const initials = activity.subject.subjectName.slice(0, 2).toUpperCase();
  const bgColor = getConsistentColor(activity.subject.subjectName);
  const submissionCount = getSubmissionCount(activity);
  const gradedCount = activity.grades?.length || 0;
  const averageScore = activity.grades && activity.grades.length > 0
    ? (activity.grades.reduce((sum, grade) => sum + grade.score + (grade.bonusPoints || 0), 0) / activity.grades.length).toFixed(1)
    : null;

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
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 12,
            width: '95%',
            maxWidth: 700,
            maxHeight: '90%',
            overflow: 'hidden',
          }}
        >
          {/* Header with Subject Icon */}
          <View
            style={{
              backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Subject Icon */}
              {activity.subject.subjectImage ? (
                <Image
                  source={{ uri: activity.subject.subjectImage }}
                  style={{ width: 60, height: 60, borderRadius: 8, marginRight: 16 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    backgroundColor: bgColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontFamily: 'Inter-Bold', 
                    fontSize: 22 
                  }}>
                    {initials}
                  </Text>
                </View>
              )}

              {/* Title and Status */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginBottom: 8,
                  }}
                >
                  {activity.title}
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: statusInfo.color,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 12, 
                      fontFamily: 'Inter-SemiBold' 
                    }}>
                      {statusInfo.text}
                    </Text>
                  </View>
                  
                  {activity.points !== null && (
                    <View
                      style={{
                        backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ 
                        color: isDarkMode ? '#E0E0E0' : '#374151', 
                        fontSize: 12, 
                        fontFamily: 'Inter-SemiBold' 
                      }}>
                        {activity.points} pts
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Subject Info Card */}
            <View 
              style={{
                backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 8,
              }}>
                Course Information
              </Text>
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 4,
              }}>
                {activity.subject.subjectName}
              </Text>
              <Text style={{ 
                fontSize: 13, 
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#6B7280' : '#9CA3AF',
              }}>
                {activity.subject.section} • {activity.subject.gradeLevel} • {activity.term === '1' ? '1st Term' : activity.term === '2' ? '2nd Term': '3rd Term'}
              </Text>
            </View>

            {/* Grading Summary Card (if graded) */}
            {gradedCount > 0 && (
              <View 
                style={{
                  backgroundColor: '#8B5CF6',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Bold',
                      color: 'white',
                      marginBottom: 4,
                    }}>
                      Grading Summary
                    </Text>
                    <Text style={{ 
                      fontSize: 13, 
                      fontFamily: 'Inter-Regular',
                      color: 'rgba(255,255,255,0.9)',
                    }}>
                      {gradedCount} student{gradedCount !== 1 ? 's' : ''} graded
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ 
                      fontSize: 24, 
                      fontFamily: 'Inter-Bold',
                      color: 'white',
                    }}>
                      {averageScore}
                    </Text>
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'Inter-Regular',
                      color: 'rgba(255,255,255,0.8)',
                    }}>
                      avg score{activity.points && ` / ${activity.points}`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Description */}
            {activity.description && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 8,
                }}>
                  Description
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  lineHeight: 20,
                }}>
                  {activity.description}
                </Text>
              </View>
            )}

            {/* Timeline */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 8,
              }}>
                Timeline
              </Text>
              
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ width: 100 }}>
                  <Text style={{ 
                    fontSize: 13, 
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E0E0E0' : '#374151',
                  }}>
                    Start Date:
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 13, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  flex: 1,
                }}>
                  {formatDate(activity.visibleDate)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ width: 100 }}>
                  <Text style={{ 
                    fontSize: 13, 
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E0E0E0' : '#374151',
                  }}>
                    Deadline:
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 13, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  flex: 1,
                }}>
                  {formatDate(activity.deadline)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 100 }}>
                  <Text style={{ 
                    fontSize: 13, 
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E0E0E0' : '#374151',
                  }}>
                    Late Work:
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 13, 
                  fontFamily: 'Inter-Regular',
                  color: activity.allowLateSubmissions ? '#10B981' : '#EF4444',
                }}>
                  {activity.allowLateSubmissions ? 'Accepted' : 'Not Accepted'}
                </Text>
              </View>
            </View>

            {/* Attachment */}
            {activity.attachmentPath && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 8,
                }}>
                  Attachment
                </Text>
                {(() => {
                  const fileUrl = getFileUrl(activity.attachmentPath);
                  
                  if (!fileUrl || fileLoadError[fileUrl]) {
                    return (
                      <View 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                          borderRadius: 8,
                        }}
                      >
                        <AttachIcon 
                          width={20} 
                          height={20} 
                          style={{ marginRight: 10 }} 
                          fill={isDarkMode ? '#6B7280' : '#9CA3AF'} 
                        />
                        <Text style={{ 
                          fontSize: 13, 
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#6B7280' : '#9CA3AF',
                        }}>
                          Attachment unavailable
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        try {
                          if (Platform.OS === 'web') {
                            window.open(fileUrl, '_blank');
                          }
                        } catch (error) {
                          console.error('Failed to open file:', error);
                          handleFileError(fileUrl);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                        borderRadius: 8,
                      }}
                    >
                      <AttachIcon 
                        width={20} 
                        height={20} 
                        style={{ marginRight: 10 }} 
                        fill="#3B82F6"
                      />
                      <Text style={{ 
                        fontSize: 13, 
                        fontFamily: 'Inter-Regular',
                        color: '#3B82F6',
                        textDecorationLine: 'underline',
                        flex: 1,
                      }}>
                        {fileUrl.split('/').pop() || 'Download attachment'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}

            {/* Creator Info */}
            <View 
              style={{
                backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 8,
              }}>
                Created By
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                  source={
                    activity.createdBy.profilePicture
                      ? { uri: activity.createdBy.profilePicture }
                      : require('@/assets/images/sample_profile_picture.png')
                  }
                />
                <View>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                  }}>
                    {getUserFullName(activity.createdBy)}
                    {canModifyActivity(activity) && (
                      <Text style={{ 
                        fontSize: 12, 
                        fontFamily: 'Inter-SemiBold',
                        color: '#10B981',
                      }}>
                        {' '}(You)
                      </Text>
                    )}
                  </Text>
                  <Text style={{ 
                    fontSize: 12, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#6B7280' : '#9CA3AF',
                  }}>
                    {formatDate(activity.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
              backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                onClose();
                onViewSubmissions(activity);
              }}
              style={{
                backgroundColor: '#8B5CF6',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                marginBottom: 12,
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-SemiBold',
                color: 'white',
                textAlign: 'center',
              }}>
                View All Submissions ({submissionCount}){gradedCount > 0 && ` • ${gradedCount} Graded`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontFamily: 'Inter-SemiBold',
                color: 'white',
                textAlign: 'center',
              }}>
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