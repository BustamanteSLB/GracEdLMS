// components/SubjectDetailsTabs.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import CourseMaterialModal from './CourseMaterialModal';
import MembersModal from './MembersModal';
import { useAuth } from '@/contexts/AuthContext';

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
  author: User;
  attachmentPath?: string | null;
  date: string;
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
}) => {
  const { isAuthenticated } = useAuth();

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
    const fetchAll = async () => {
      try {
        setLoading(true);
        // Announcements
        const annRes = await apiClient.get(`/subjects/${subject._id}/announcements`);
        setAnnouncements(
          (annRes.data.data || []).map((a: any) => ({
            _id: a._id,
            title: a.title,
            body: a.content,
            date: a.createdAt,
            author: a.author,
          }))
        );

        // Discussions
        const discRes = await apiClient.get(`/subjects/${subject._id}/discussions`);
        setDiscussions(
          (discRes.data.data || []).map((d: any) => ({
            _id: d._id,
            title: d.title,
            body: d.content,
            date: d.createdAt,
            author: d.author,
          }))
        );

        // Activities
        const actRes = await apiClient.get(`/subjects/${subject._id}/activities`);
        setActivities(
          (actRes.data.data || []).map((act: any) => ({
            _id: act._id,
            title: act.title,
            description: act.description,
            visibleDate: act.visibleDate,
            deadline: act.deadline,
            points: act.points,
            author: act.author,
            attachmentPath: act.attachmentPath,
            date: act.createdAt,
          }))
        );

        // Course Materials
        const cmRes = await apiClient.get(`/subjects/${subject._id}/courseMaterials`);
        setCourseMaterials(
          (cmRes.data.data || []).map((cm: any) => ({
            _id: cm._id,
            fileName: cm.fileName, // Changed from title
            fileType: cm.fileType,
            fileSize: cm.fileSize,
            uploadedBy: cm.uploadedBy,
            createdAt: cm.createdAt,
            updatedAt: cm.updatedAt,
            fileUrl: cm.fileUrl,
            date: cm.createdAt,
          }))
        );
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to load subject details.');
        }

        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert('Error', 'Failed to load subject details.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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
                minWidth: width < 768 ? 100 : 250, // Minimum width for each tab
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
            {announcements.length > 0 && (
              <View style={{ ...cardStyle(isDarkMode), backgroundColor: isDarkMode ? '#1A1A1A' : '#E0E0E0', marginTop: 12 }}>
                <Text 
                  className={`font-pbold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                >
                  Latest Announcement:
                </Text>
                <View className='flex-row items-center mb-3'>
                  <Image
                    style={{ width: 40, height: 40, marginRight: 8 }}
                    source={announcements[0].author.profilePicture ? { uri: announcements[0].author.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                  />
                  <View className='flex-1'>
                    <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {announcements[0].author.middleName 
                        ? `${announcements[0].author.firstName} ${announcements[0].author.middleName} ${announcements[0].author.lastName}`
                        : `${announcements[0].author.firstName} ${announcements[0].author.lastName}`
                      }
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(announcements[0].date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`font-inter_semibold text-base mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                >
                  {announcements[0].title}
                </Text>
                <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                style={{ color: isDarkMode ? '#E0E0E0' : 'black' }}>
                  {announcements[0].body}
                </Text>
              </View>
            )}

            {/* Announcements Section in General Tab */}
            <View style={{ marginTop: 8 }}>
              <Text className='font-pbold' style={sectionHeaderStyle(isDarkMode)}>Announcements:</Text>
              {announcements.length > 0 ? (
                sortedByDate(announcements).map((a: any, idx: number) => idx < 2 && ( // Apply sorting here
                  <View key={a._id} style={{ ...cardStyle(isDarkMode), marginBottom: idx === 1 || announcements.length === 1 ? 0 : 12 }}>
                    <View className='flex-row items-center mb-3'>
                      <Image
                        style={{ width: 40, height: 40, marginRight: 8 }}
                        source={a.author.profilePicture ? { uri: a.author.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                      />
                      <View className='flex-1'>
                        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          {a.author.middleName 
                            ? `${a.author.firstName} ${a.author.middleName} ${a.author.lastName}`
                            : `${a.author.firstName} ${a.author.lastName}`
                          }
                        </Text>
                        <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(a.date).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Text className={`font-inter_bold text-base mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {a.title}
                    </Text>
                    <Text 
                      className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`} 
                      style={{ marginBottom: 4 }}
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
                sortedByDate(discussions).map((d: any, idx: number) => idx < 2 && ( // Apply sorting here
                  <View key={d._id} style={{ ...cardStyle(isDarkMode), backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9', marginBottom: idx === 1 || discussions.length === 1 ? 0 : 12 }}>
                    <Text className={`font-inter_bold text-base mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {d.title}
                    </Text>
                    <Text 
                      className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                      style={{ marginBottom: 4 }}
                    >
                      {d.comments && d.comments.length > 0 ?
                        `${d.comments[0].user?.firstName}: ${d.comments[0].content}` :
                        'No comments yet.'}
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {d.date ? new Date(d.date).toLocaleDateString() : ''}
                    </Text>
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
                sortedByDate(activities).map((act: any, idx: number) => idx < 2 && ( // Apply sorting here
                  <View key={act._id} style={{ ...cardStyle(isDarkMode), marginBottom: idx === 1 || activities.length === 1 ? 0 : 12 }}>
                    <Text className={`font-inter_bold text-base mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {act.title}
                    </Text>
                    <Text 
                      className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                      style={{ marginBottom: 4 }}
                    >
                      {act.description}
                    </Text>
                    <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Due: {act.deadline ? new Date(act.deadline).toLocaleDateString() : ''}
                    </Text>
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
