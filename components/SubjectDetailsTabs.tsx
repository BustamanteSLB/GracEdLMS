// components/SubjectDetailsTabs.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import apiClient from '@/app/services/apiClient';
import ContextMenu from './ContextMenu';
import AnnouncementModal from './AnnouncementModal';
import DiscussionModal from './DiscussionModal';
import ActivityModal from './ActivityModal';
import QuizTabModal from './QuizTabModal'
import CourseMaterialModal from './CourseMaterialModal';
import MembersModal from './MembersModal';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import AttachIcon from '@/assets/icons/attach.svg';

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string; // Optional middle name
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string; // Optional profile picture
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  enrolledSubjects?: string[];
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  author: User;
  date: string;
  body: string;
}

interface Comment {
  _id: string;
  content: string;
  author: User;
  createdAt: string;
}

interface Discussion {
  _id: string;
  title: string;
  content: string;
  comments: Comment[];
  createdAt: string;
  author: User;
  date: string;
  body: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string; // ISO
  deadline: string;    // ISO
  points: number | null;
  author?: User; // Make it optional and ensure it's properly mapped
  createdBy?: User; // Add this as fallback since API might use createdBy
  attachmentPath?: string | null;
  date: string;
  grades?: any[]; // Add grades array
  myGrade?: any; // Add student's grade
}

interface CourseMaterial {
  _id: string;
  fileName: string; // Changed from title
  fileType: string;
  fileSize?: number;
  uploadedBy: User;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  date: string;
}

interface SubjectDetailsTabsProps {
  subject: any;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
  isStudentOrTeacher?: boolean;
}

const cardStyle = (isDarkMode?: boolean): any => ({
  backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
  borderRadius: 10,
  padding: 16,
  marginBottom: 14,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
});

const sectionHeaderStyle = (isDarkMode?: boolean): any => ({
  fontSize: 18,
  marginBottom: 8,
  color: isDarkMode ? '#E0E0E0' : 'black',
});

const SubjectDetailsTabs: React.FC<SubjectDetailsTabsProps> = ({
  subject,
  isDarkMode,
  isAdminOrTeacher,
  isStudentOrTeacher
}) => {
  const { isAuthenticated, user } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('general');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'discussions', label: 'Discussions' },
    { key: 'activities', label: 'Activities' },
    ...(isStudentOrTeacher ? [{ key: 'quizzes', label: 'Quizzes' }] : []), // Only show Quizzes tab for students and teachers
    { key: 'course_materials', label: 'Files' },
    // Only show Members tab for admins and teachers
    ...(isAdminOrTeacher ? [{ key: 'members', label: 'Members' }] : []),
  ];

  const { width } = useWindowDimensions();

  // Add getFileIcon function
  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return require('@/assets/icons/pdf.png');
      case 'doc':
        return require('@/assets/icons/word_file.png');
      case 'docx':
        return require('@/assets/icons/word_file.png');
      case 'ppt':
        return require('@/assets/icons/powerpoint.png');
      case 'pptx':
        return require('@/assets/icons/powerpoint.png');
      case 'xls':
        return require('@/assets/icons/excel_file.png');
      case 'xlsx':
        return require('@/assets/icons/excel_file.png');
      case 'jpg':
        return require('@/assets/icons/image-document.png');
      case 'jpeg':
        return require('@/assets/icons/image-document.png');
      case 'png':
        return require('@/assets/icons/image-document.png');
      case 'gif':
        return require('@/assets/icons/image-document.png');
      case 'txt':
        return require('@/assets/icons/text_file.png');
      case 'csv':
        return require('@/assets/icons/csv_file.png');
      case 'json':
        return require('@/assets/icons/json_file.png');
      case 'html':
        return require('@/assets/icons/html_file.png');
      case 'css':
        return require('@/assets/icons/css_file.png');
      case 'js':
        return require('@/assets/icons/javascript.png');
      case 'md':
        return require('@/assets/icons/md_file.png');
      case 'xml':
        return require('@/assets/icons/xml_file.png');
      default:
        return require('@/assets/icons/file.png');
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchAll = async () => {
      try {
        setLoading(true);
        
        // Announcements with populate
        const annRes = await apiClient.get(`/subjects/${subject._id}/announcements`, {
          signal: abortController.signal,
          params: { populate: 'author' } // Add populate parameter
        });
        setAnnouncements(
          (annRes.data.data || []).map((a: any) => {
            console.log('Announcement author:', a.author); // Debug log
            return {
              _id: a._id,
              title: a.title,
              body: a.content,
              date: a.createdAt,
              author: a.author || a.createdBy, // Fallback to createdBy
            };
          })
        );

        // Discussions with populate
        const discRes = await apiClient.get(`/subjects/${subject._id}/discussions`, {
          signal: abortController.signal,
          params: { populate: 'author' } // Add populate parameter
        });
        setDiscussions(
          (discRes.data.data || []).map((d: any) => {
            console.log('Discussion author:', d.author); // Debug log
            return {
              _id: d._id,
              title: d.title,
              body: d.content,
              date: d.createdAt,
              author: d.author || d.createdBy, // Fallback to createdBy
              comments: d.comments || [],
            };
          })
        );

        // Activities with populate
        const actRes = await apiClient.get(`/subjects/${subject._id}/activities`, {
          signal: abortController.signal,
          params: { populate: 'createdBy' } // Activities use createdBy
        });
        setActivities(
          (actRes.data.data || []).map((act: any) => {
            console.log('Activity createdBy:', act.createdBy); // Debug log
            return {
              _id: act._id,
              title: act.title,
              description: act.description,
              visibleDate: act.visibleDate,
              deadline: act.deadline,
              points: act.points,
              author: act.createdBy || act.author, // Activities use createdBy
              createdBy: act.createdBy,
              attachmentPath: act.attachmentPath,
              date: act.createdAt,
              grades: act.grades,
              myGrade: act.myGrade,
            };
          })
        );

        // Course Materials with populate
        const cmRes = await apiClient.get(`/subjects/${subject._id}/courseMaterials`, {
          signal: abortController.signal,
          params: { populate: 'uploadedBy' } // Add populate parameter
        });
        setCourseMaterials(
          (cmRes.data.data || []).map((cm: any) => {
            console.log('Course Material uploadedBy:', cm.uploadedBy); // Debug log
            return {
              _id: cm._id,
              fileName: cm.fileName,
              fileType: cm.fileType,
              fileSize: cm.fileSize,
              uploadedBy: cm.uploadedBy,
              createdAt: cm.createdAt,
              updatedAt: cm.updatedAt,
              fileUrl: cm.fileUrl,
              date: cm.createdAt,
            };
          })
        );
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          console.log('Fetch aborted');
          return;
        }
        
        console.error('Error fetching subject details:', error);
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to load subject details.');
        } else {
          Alert.alert('Error', 'Failed to load subject details.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAll();

    return () => {
      abortController.abort();
    };
  }, [subject._id]);

  const sortedByDate = <T extends { date: string }>(list: T[]): T[] =>
    [...list].sort((a, b) =>
      sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* TAB BAR - Made scrollable horizontally */}
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: isDarkMode ? '#333' : '#ccc',
          marginBottom: 12,
          backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
        }}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            flexDirection: 'row',
            paddingHorizontal: 4,
          }}
          style={{ flexGrow: 0 }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                borderBottomWidth: 4,
                borderBottomColor:
                  activeTab === tab.key ? '#6D28D9' : 'transparent',
                minWidth: width < 768 ? 100 : 200, // Minimum width for each tab
              }}
            >
              <Text
                className='font-pbold'
                style={{
                  color:
                    activeTab === tab.key
                      ? '#6D28D9'
                      : isDarkMode
                      ? '#E0E0E0'
                      : 'black',
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <View style={{ padding: 8 }}>
            {/* Sort toggle */}
            <TouchableOpacity
              onPress={() => setSortAsc(!sortAsc)}
              style={{
                alignSelf: 'flex-end',
                marginBottom: 12,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: isDarkMode ? '#444' : '#DDD',
                borderRadius: 6,
              }}
            >
              <Text className={`font-inter_semibold text-sm`}
              style={{ color: isDarkMode ? '#EEE' : '#333' }}>
                Date: {sortAsc ? 'Oldest first' : 'Newest first'}
              </Text>
            </TouchableOpacity>

            {/* Latest Announcement */}
            {announcements.length > 0 && announcements[0] && (
              <View style={{ ...cardStyle(isDarkMode), backgroundColor: isDarkMode ? '#1A1A1A' : '#E0E0E0', marginTop: 12 }}>
                <Text 
                  className={`font-pbold text-lg mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                >
                  Latest Announcement:
                </Text>
                
                {/* Profile circle + name/date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 8,
                      overflow: 'hidden',
                      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                    }}
                  >
                    {announcements[0].author?.profilePicture ? (
                      <Image
                        style={{ 
                          width: 40, 
                          height: 40,
                          borderRadius: 20,
                        }}
                        source={{ 
                          uri: announcements[0].author.profilePicture.startsWith('http') 
                            ? announcements[0].author.profilePicture 
                            : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}${announcements[0].author.profilePicture}`
                        }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        onError={() => console.warn('Failed to load profile picture for announcement author')}
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: getProfileBackgroundColor(announcements[0].author?.firstName || 'Unknown'),
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 16,
                            fontWeight: 'bold',
                            fontFamily: 'Inter-SemiBold',
                          }}
                        >
                          {getInitials(
                            announcements[0].author?.firstName || 'U', 
                            announcements[0].author?.lastName || 'U'
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    >
                      {getUserFullName(announcements[0].author)}
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(announcements[0].date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                >
                  {announcements[0].title}
                </Text>
                <Text 
                  className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  {announcements[0].body}
                </Text>
              </View>
            )}

            {/* Announcements Section in General Tab */}
            <View style={{ marginTop: 8 }}>
              <Text className='font-pbold' style={sectionHeaderStyle(isDarkMode)}>Announcements:</Text>
              {announcements.length > 0 ? (
                sortedByDate(announcements).map((a: any, idx: number) => idx < 2 && (
                  <View 
                    key={a._id} 
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: idx === 1 || announcements.length === 1 ? 0 : 12,
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                    }}
                  >
                    {/* Profile circle + name/date */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          marginRight: 8,
                          overflow: 'hidden',
                          backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        }}
                      >
                        {a.author?.profilePicture ? (
                          <Image
                            style={{ 
                              width: 40, 
                              height: 40,
                              borderRadius: 20,
                            }}
                            source={{ 
                              uri: a.author.profilePicture.startsWith('http') 
                                ? a.author.profilePicture 
                                : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}${a.author.profilePicture}`
                            }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            onError={() => console.warn('Failed to load profile picture for announcement author')}
                          />
                        ) : (
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: getProfileBackgroundColor(a.author?.firstName || 'Unknown'),
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 16,
                                fontWeight: 'bold',
                                fontFamily: 'Inter-SemiBold',
                              }}
                            >
                              {getInitials(
                                a.author?.firstName || 'U',
                                a.author?.lastName || 'U'
                              )}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                        >
                          {getUserFullName(a.author)}
                        </Text>
                        <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          {new Date(a.date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true,
                          })}
                        </Text>
                      </View>
                    </View>
                    
                    <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {a.title}
                    </Text>
                    <Text 
                      className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {a.body}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No announcements.
                </Text>
              )}
            </View>

            {/* Discussions Section in General Tab */}
            <View style={{ marginTop: 18 }}>
              <Text className='font-pbold' style={sectionHeaderStyle(isDarkMode)}>Discussions:</Text>
              {discussions.length > 0 ? (
                sortedByDate(discussions).map((d: any, idx: number) => idx < 2 && (
                  <View 
                    key={d._id} 
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: idx === 1 || discussions.length === 1 ? 0 : 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    {/* Post Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Image
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                        source={
                          d.author?.profilePicture 
                            ? { uri: d.author.profilePicture } 
                            : require('@/assets/images/sample_profile_picture.png')
                        }
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          {getUserFullName(d.author)}
                        </Text>
                        <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {d.date ? formatTimeAgo(d.date) : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Post Content */}
                    <View>
                      <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} mb-2`}>
                        {d.title}
                      </Text>
                      <Text className={`font-inter_regular ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={2}>
                        {d.body}
                      </Text>
                    </View>

                    {/* Comments indicator */}
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: isDarkMode ? '#2A2A2A' : '#E5E5E5',
                        marginTop: 12,
                        paddingTop: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                          source={require('@/assets/icons/comment.png')}
                          style={{ width: 16, height: 16, marginRight: 6 }}
                          tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                        />
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {d.comments?.length || 0} comment{(d.comments?.length || 0) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No discussions.
                </Text>
              )}
            </View>

            {/* Activities Section in General Tab */}
            <View style={{ marginTop: 18 }}>
              <Text className='font-pbold' style={sectionHeaderStyle(isDarkMode)}>Activities:</Text>
              {activities.length > 0 ? (
                sortedByDate(activities).map((act: any, idx: number) => idx < 2 && (
                  <View 
                    key={act._id} 
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: idx === 1 || activities.length === 1 ? 0 : 12,
                      borderLeftWidth: 8,
                      borderLeftColor: getActivityStatusColor(act, user?.role),
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 3,
                    }}
                    >
                    {/* Activity Header with Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <View
                          style={{
                            backgroundColor: getActivityStatusColor(act),
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            marginRight: 8,
                            marginBottom: 4,
                          }}
                        >
                          <Text className="font-inter_semibold text-xs text-white">
                            {getActivityStatusText(act, user?.role)}
                          </Text>
                        </View>

                        {/* Additional status badges */}
                        {user?.role === 'Student' && act.myGrade && (
                          <View
                            style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 16,
                              marginBottom: 4,
                            }}
                          >
                            <Text className="font-inter_semibold text-xs text-white">
                              YOUR GRADE: {act.myGrade.score}
                              {act.points && ` / ${act.points}`}
                            </Text>
                          </View>
                        )}

                        {/* For teachers/admins: Show total students graded if any */}
                        {(user?.role === 'Teacher' || user?.role === 'Admin') && 
                         act.grades && act.grades.length > 0 && (
                          <View
                            style={{
                              backgroundColor: '#F59E0B',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 16,
                              marginBottom: 4,
                            }}
                          >
                            <Text className="font-inter_semibold text-xs text-white">
                              {act.grades.length} STUDENT{act.grades.length !== 1 ? 'S' : ''} GRADED
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {act.points !== null && (
                        <View className='items-end'>
                          <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            {act.points}
                          </Text>
                          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            points
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Activity Title */}
                    <Text
                      className={`font-inter_bold text-xl mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    >
                      {act.title}
                    </Text>

                    {/* Creator Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      {/* Profile Picture */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          marginRight: 8,
                          overflow: 'hidden',
                          backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        }}
                      >
                        {(act.author?.profilePicture || act.createdBy?.profilePicture) ? (
                          <Image
                            style={{ width: 32, height: 32, borderRadius: 16 }}
                            source={{ 
                              uri: (act.author?.profilePicture || act.createdBy?.profilePicture)?.startsWith('http') 
                                ? (act.author?.profilePicture || act.createdBy?.profilePicture)
                                : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}${act.author?.profilePicture || act.createdBy?.profilePicture}`
                            }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: getProfileBackgroundColor((act.author || act.createdBy)?.firstName),
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              style={{
                                color: 'white',
                                fontSize: 14,
                                fontWeight: 'bold',
                                fontFamily: 'Inter-SemiBold',
                              }}
                            >
                              {getInitials((act.author || act.createdBy)?.firstName, (act.author || act.createdBy)?.lastName)}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* User Info */}
                      <View>
                        <Text
                          className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                        >
                          {getUserFullName(act.author || act.createdBy)}
                        </Text>
                        <Text
                          className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {formatDate(act.visibleDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Grade Display for Students */}
                    {user?.role === 'Student' && act.myGrade && (
                      <View className='flex-row items-center mb-3 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                        <Image
                          className="w-[16] h-[16] mr-2"
                          contentFit="contain"
                          source={require('@/assets/icons/star.png')}
                          tintColor={isDarkMode ? '#A78BFA' : '#8B5CF6'}
                        />
                        <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                          Your Grade: {act.myGrade.score}
                          {act.myGrade.bonusPoints && act.myGrade.bonusPoints > 0 && ` + ${act.myGrade.bonusPoints} bonus`}
                          {act.points && ` / ${act.points}`}
                        </Text>
                      </View>
                    )}

                    {/* Description */}
                    {act.description && (
                      <Text
                        className={`font-inter_regular text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {act.description}
                      </Text>
                    )}

                    {/* Deadline */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text
                          className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                        >
                          Due: {formatDate(act.deadline)}
                        </Text>
                        {/* Only show time remaining if not graded */}
                        {!(act.myGrade || (act.grades && act.grades.length > 0)) && (
                          <Text
                            className={`font-inter_regular text-xs ${
                              getActivityStatusText(act) === 'Overdue' ? 'text-red-500' : 'text-orange-500'
                            }`}
                          >
                            {getTimeRemaining(act.deadline)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Attachment indicator */}
                    {act.attachmentPath && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Image
                          source={require('@/assets/icons/attach.png')}
                          style={{ width: 16, height: 16, marginRight: 4 }}
                          tintColor={isDarkMode ? '#A78BFA' : '#6D28D9'}
                        />
                        <Text
                          className={`font-inter_regular text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}
                        >
                          Attachment available
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No activities.
                </Text>
              )}
            </View>

            {/* Course Materials in General Tab */}
            <View style={{ marginTop: 18 }}>
              <Text className='font-pbold' style={sectionHeaderStyle(isDarkMode)}>Course Materials:</Text>
              {courseMaterials.length > 0 ? (
                sortedByDate(courseMaterials).map((cm: any, idx: number) => idx < 2 && (
                  <TouchableOpacity
                    key={cm._id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 8,
                      backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F7F9',
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? '#333' : '#ccc',
                      marginBottom: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Image
                      style={{ width: 30, height: 30, marginRight: 8 }}
                      source={getFileIcon(cm.fileType)}
                      tintColor={isDarkMode ? '#E0E0E0' : '#666'}
                    />
                    <View className='ml-2 mr-auto flex-shrink'>
                      <Text
                        className={`font-inter_medium text-base underline ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                      >
                        {cm.fileName}
                      </Text>
                      <Text
                        className={`font-inter_regular text-xs mr-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        ellipsizeMode='tail'
                        numberOfLines={2}
                      >
                        {cm.fileType?.toUpperCase()} • {cm.fileSize && cm.fileSize > 0 ? `${formatFileSize(cm.fileSize)}, ` : 'Size: Unknown, '}
                        {cm.uploadedBy ? 
                          `Added by ${cm.uploadedBy.firstName} ${cm.uploadedBy.lastName} on ${new Date(cm.createdAt).toLocaleDateString()}` :
                          `Added on ${new Date(cm.createdAt).toLocaleDateString()}`
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>  
                ))
              ) : (
                <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No course materials added.
                </Text>
              )}
            </View>
          </View>
        )}

        

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <AnnouncementModal
            subjectId={subject._id}
            isDarkMode={isDarkMode}
            isAdminOrTeacher={isAdminOrTeacher}
            isAuthenticated={isAuthenticated}
          />
        )}

        {/* DISCUSSIONS TAB */}
        {activeTab === 'discussions' && (
          <DiscussionModal
            subjectId={subject._id}
            isDarkMode={isDarkMode}
            isAdminOrTeacher={isAdminOrTeacher}
            isAuthenticated={isAuthenticated}
          />
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <ActivityModal
            subjectId={subject._id}
            isDarkMode={isDarkMode}
            isAdminOrTeacher={isAdminOrTeacher}
            isAuthenticated={isAuthenticated}
          />
        )}

        {/* QUIZZES TAB */}
        {activeTab === 'quizzes' && (
          <QuizTabModal
            subjectId={subject._id}
            isDarkMode={isDarkMode}
            teacher={subject.teacher}
            isStudentOrTeacher={isStudentOrTeacher}
          />
        )}

        {/* COURSE MATERIALS TAB */}
        {activeTab === 'course_materials' && (
          <CourseMaterialModal
            subjectId={subject._id}
            teacher={subject.teacher}
            isDarkMode={isDarkMode}
            isAdminOrTeacher={isAdminOrTeacher}
          />
        )}

        {/* MEMBERS TAB (ADMIN and TEACHER ONLY) */}
        {isAdminOrTeacher && activeTab === 'members' && (
          <MembersModal
            subjectId={subject._id}
            teacher={subject.teacher}
            isDarkMode={isDarkMode}
            isAdminOrTeacher={isAdminOrTeacher}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default SubjectDetailsTabs;

// Add these helper functions before the return statement in SubjectDetailsTabs component:

const getInitials = (firstName?: string, lastName?: string): string => {
  if (!firstName || !lastName) return 'U'; // Default fallback
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
};

const getProfileBackgroundColor = (name?: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ];
  
  if (!name) return colors[0]; // Default to first color
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  
  return date.toLocaleDateString();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Update the getUserFullName helper to be safer
const getUserFullName = (user?: User) => {
  if (!user) {
    console.warn('getUserFullName called with undefined user');
    return 'Unknown User';
  }
  if (!user.firstName || !user.lastName) {
    console.warn('getUserFullName called with incomplete user data:', user);
    return user.email || user.username || 'Unknown User';
  }
  return user.middleName 
    ? `${user.firstName} ${user.middleName} ${user.lastName}`
    : `${user.firstName} ${user.lastName}`;
};

const getActivityStatusColor = (activity: Activity, userRole?: string) => {
  const now = new Date();
  const deadline = new Date(activity.deadline);
  const visible = new Date(activity.visibleDate);

  // Check if activity has been graded (at least one student)
  const hasGrades = activity.grades && activity.grades.length > 0;
  const studentIsGraded = activity.myGrade !== undefined && activity.myGrade !== null;
  
  // For students, prioritize their grading status
  if (userRole === 'Student' && studentIsGraded) {
    return '#8B5CF6'; // Purple for graded
  }
  
  // For teachers/admins, check if any students are graded
  if ((userRole === 'Teacher' || userRole === 'Admin') && hasGrades) {
    return '#8B5CF6'; // Purple for graded
  }

  // Standard status logic for ungraded activities
  if (visible > now) return '#3B82F6'; // Blue for upcoming
  if (deadline < now) return '#EF4444'; // Red for overdue
  return '#10B981'; // Green for active
};

const getActivityStatusText = (activity: Activity, userRole?: string) => {
  const now = new Date();
  const deadline = new Date(activity.deadline);
  const visible = new Date(activity.visibleDate);

  // Check if activity has been graded (at least one student)
  const hasGrades = activity.grades && activity.grades.length > 0;
  const studentIsGraded = activity.myGrade !== undefined && activity.myGrade !== null;
  
  // For students, prioritize their grading status
  if (userRole === 'Student' && studentIsGraded) {
    return 'Graded';
  }
  
  // For teachers/admins, check if any students are graded
  if ((userRole === 'Teacher' || userRole === 'Admin') && hasGrades) {
    return `${activity.grades?.length || 0} Graded`;
  }

  // Standard status logic for ungraded activities
  if (visible > now) return 'Upcoming';
  if (deadline < now) return 'Overdue';
  return 'Active';
};

const getTimeRemaining = (deadline: string) => {
  const now = new Date();
  const due = new Date(deadline);
  const timeDiff = due.getTime() - now.getTime();

  if (timeDiff <= 0) return 'Overdue';

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
};
