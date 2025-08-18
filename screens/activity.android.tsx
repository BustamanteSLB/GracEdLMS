import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { Picker } from '@react-native-picker/picker'
import * as DocumentPicker from 'expo-document-picker'
import AttachIcon from '@/assets/icons/attach.svg'
import { FlashList } from '@shopify/flash-list'

cssInterop(Image, { className: "style" });

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
  students: string[];
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

interface Grade {
  _id: string;
  student: User;
  activity: Activity;
  subject: Subject;
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
  quarter: string;
  points: number | null;
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  submissions?: Submission[];
  myGrade?: Grade;
  createdAt: string;
  updatedAt: string;
}

interface ActivityResponse {
  success: boolean;
  count: number;
  data: Activity[];
}

// VirtualizedList item types
type SidebarItemType = 'loading' | 'empty' | 'activity';
type MainItemType = 'loading' | 'empty' | 'activity' | 'submission';

interface SidebarListItem {
  id: string;
  type: SidebarItemType;
  data?: Activity;
}

interface MainListItem {
  id: string;
  type: MainItemType;
  data?: Activity;
}

// Student's activity page
const ActivityAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  // State management
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // Filter states
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Submission functionality states
  const [submissionFiles, setSubmissionFiles] = useState<(DocumentPicker.DocumentPickerAsset | File)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoingSubmission, setIsUndoingSubmission] = useState(false);

  // Derived data for filters
  const enrolledSubjects = useMemo(() => {
    const uniqueSubjects = activities.reduce((acc, activity) => {
      if (!acc.find(c => c._id === activity.subject._id)) {
        acc.push(activity.subject);
      }
      return acc;
    }, [] as Subject[]);
    return uniqueSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    const now = new Date();

    // Only show visible activities (visibleDate <= now) - REMOVE THIS RESTRICTION FOR NOW
    // filtered = filtered.filter(activity => new Date(activity.visibleDate) <= now);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(activity => {
        const title = activity.title.toLowerCase();
        const description = activity.description?.toLowerCase() || '';
        const subjectName = activity.subject.subjectName.toLowerCase();
        
        return title.includes(query) || 
               description.includes(query) || 
               subjectName.includes(query);
      });
    }

    // Subject filter
    if (subjectFilter) {
      filtered = filtered.filter(activity => activity.subject._id === subjectFilter);
    }

    // Status filter (based on deadline and grading status)
    if (statusFilter) {
      filtered = filtered.filter(activity => {
        const deadline = new Date(activity.deadline);
        const isGraded = activity.myGrade !== undefined;
        
        switch (statusFilter) {
          case 'graded':
            return isGraded;
          case 'active':
            return !isGraded && deadline > now;
          case 'overdue':
            return !isGraded && deadline < now;
          default:
            return true;
        }
      });
    }

    // Sort by deadline (soonest first)
    return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activities, searchQuery, subjectFilter, statusFilter]);

  // Fetch activities from student's enrolled subjects
  const fetchStudentActivities = async () => {
    if (!user || user.role !== 'Student') {
      setError('Unauthorized: Student access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching activities for student:', user.firstName, user.lastName);

      // First, get all subjects
      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
      console.log('📚 Total subjects found:', allSubjects.length);
      
      // Filter subjects where this student is enrolled
      const studentSubjects = allSubjects.filter((subject: Subject) => {
        const isEnrolled = subject.students && subject.students.some((studentId: any) => {
          // Handle both string IDs and populated objects
          const id = typeof studentId === 'string' ? studentId : studentId._id;
          return id === user._id;
        });
        return isEnrolled;
      });

      console.log('📖 Student enrolled subjects:', studentSubjects.length, studentSubjects.map((s: { subjectName: any }) => s.subjectName));

      if (studentSubjects.length === 0) {
        console.log('⚠️ No enrolled subjects found for student');
        setActivities([]);
        setLoading(false);
        return;
      }

      // Then, fetch activities for each enrolled subject
      const allActivities: Activity[] = [];
      
      for (const subject of studentSubjects) {
        try {
          console.log(`🔍 Fetching activities for subject: ${subject.subjectName}`);
          const activitiesResponse = await apiClient.get<ActivityResponse>(`/subjects/${subject._id}/activities`);
          
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            console.log(`📝 Found ${activitiesResponse.data.data.length} activities for ${subject.subjectName}`);
            
            // Add subject info to each activity first
            const activitiesWithSubject = activitiesResponse.data.data.map((activity: Activity) => ({
              ...activity,
              subject: subject,
              myGrade: undefined // Initialize as undefined
            }));

            // Then, fetch student's grades for this subject
            try {
              const gradesResponse = await apiClient.get(`/subjects/${subject._id}/students/${user._id}/grades`);
              const subjectGrades = gradesResponse.data.data || [];

              console.log(`📊 Found ${subjectGrades.length} grades for ${subject.subjectName}`);

              // Map grades to activities, with null checking
              const activitiesWithGrades = activitiesWithSubject.map((activity: Activity) => {
                // Find the grade for this specific activity with null checking
                const myGrade = subjectGrades.find((grade: Grade) => 
                  grade && grade.activity && grade.activity._id === activity._id
                );

                return {
                  ...activity,
                  myGrade: myGrade || undefined
                };
              });

              allActivities.push(...activitiesWithGrades);
            } catch (gradesError: any) {
              console.warn(`Failed to fetch grades for subject ${subject.subjectName}:`, gradesError);
              // Continue with activities without grades
              allActivities.push(...activitiesWithSubject);
            }
          } else {
            console.log(`📝 No activities found for ${subject.subjectName}`);
          }
        } catch (subjectError: any) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}:`, subjectError);
          // Continue with other subjects even if one fails
        }
      }

      console.log('✅ Total activities fetched:', allActivities.length);
      setActivities(allActivities);
    } catch (err: any) {
      console.error('Error fetching student activities:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentActivities();
  }, [user]);

  // File picker function
  const pickDocuments = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif';
        input.multiple = true;

        return new Promise<void>((resolve) => {
          input.onchange = (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files) {
              setSubmissionFiles(prevFiles => [...prevFiles, ...Array.from(files)]);
            }
            resolve();
          };
          input.click();
        });
      } else {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];

        const result = await DocumentPicker.getDocumentAsync({
          type: allowedMimeTypes,
          multiple: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSubmissionFiles(prevFiles => [...prevFiles, ...result.assets]);
        }
      }
    } catch (err) {
      console.log('Document picking cancelled or failed.', err);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to pick documents.');
      } else {
        Alert.alert('Error', 'Failed to pick documents.');
      }
    }
  };

  // Remove file from submission
  const removeFile = (index: number) => {
    setSubmissionFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Handle Turn In Activity
  const handleTurnInActivity = async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      submissionFiles.forEach((file, index) => {
        if (Platform.OS === 'web') {
          formData.append(`submissionAttachments`, file as File);
        } else {
          const mobileFile = file as DocumentPicker.DocumentPickerAsset;
          const fileToUpload = {
            uri: mobileFile.uri,
            type: mobileFile.mimeType || 'application/octet-stream',
            name: mobileFile.name || `submission_${index}`,
          };
          formData.append(`submissionAttachments`, fileToUpload as any);
        }
      });

      console.log(`➡️ Sending POST /activities/${selectedActivity._id}/turn-in`);
      const res = await apiClient.post(
        `/activities/${selectedActivity._id}/turn-in`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );
      console.log('✅ Turn In Activity response:', res.data);
      
      // Refresh activities to show updated submission status
      await fetchStudentActivities();
      
      // Re-select the activity to refresh the view
      const updatedActivity = activities.find(act => act._id === selectedActivity._id);
      if (updatedActivity) {
        setSelectedActivity(updatedActivity);
      }
      
      // Clear submission files
      setSubmissionFiles([]);
      
      if (Platform.OS === 'web') {
        window.alert('Activity turned in successfully!');
      } else {
        Alert.alert('Success', 'Activity turned in successfully!');
      }
    } catch (error: any) {
      console.error('🚨 Turn In Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to turn in activity.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Undo Turn In Activity
  const handleUndoTurnInActivity = async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsUndoingSubmission(true);
      console.log(`➡️ Sending POST /activities/${selectedActivity._id}/undo-turn-in`);
      const res = await apiClient.post(`/activities/${selectedActivity._id}/undo-turn-in`);
      console.log('✅ Undo Turn In Activity response:', res.data);
      
      // Refresh activities to show updated submission status
      await fetchStudentActivities();
      
      // Re-select the activity to refresh the view
      const updatedActivity = activities.find(act => act._id === selectedActivity._id);
      if (updatedActivity) {
        setSelectedActivity(updatedActivity);
      }
      
      // Clear submission files
      setSubmissionFiles([]);
      
      if (Platform.OS === 'web') {
        window.alert('Activity turn-in undone successfully!');
      } else {
        Alert.alert('Success', 'Activity turn-in undone successfully!');
      }
    } catch (error: any) {
      console.error('🚨 Undo Turn In Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to undo turn-in.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsUndoingSubmission(false);
    }
  };

  // Helper functions
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const deadline = new Date(activity.deadline);

    // Check if student has been graded for this activity
    const isGraded = activity.myGrade !== undefined;

    if (isGraded) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
    if (deadline < now) return { status: 'overdue', color: '#EF4444', text: 'Overdue' };
    return { status: 'active', color: '#10B981', text: 'Active' };
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.firstName} ${user.middleName} ${user.lastName}`
      : `${user.firstName} ${user.lastName}`;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('');
    setStatusFilter('');
  };

  // Generate subject initials and color
  const getSubjectInitials = (subjectName: string) => {
    const words = subjectName.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return subjectName.substring(0, 2).toUpperCase();
  };

  const getSubjectColor = (subjectId: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Function to handle activity selection from sidebar
  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
    setSubmissionFiles([]); // Clear any previous submission files
  };

  // Get time remaining until deadline
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

  // Check if student has submitted this activity
  const getMySubmission = (activity: Activity) => {
    return activity.submissions?.find(sub => sub.student._id === user?._id);
  };

  // Check if deadline has passed
  const isDeadlinePassed = (activity: Activity) => {
    return new Date() > new Date(activity.deadline);
  };

  // Prepare sidebar virtualized list data
  const sidebarListData = useMemo((): SidebarListItem[] => {
    if (loading) {
      return [{ id: 'loading', type: 'loading' }];
    }
    
    if (filteredActivities.length === 0) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return filteredActivities.map(activity => ({
      id: activity._id,
      type: 'activity' as SidebarItemType,
      data: activity
    }));
  }, [loading, filteredActivities]);

  // Prepare main virtualized list data
  const mainListData = useMemo((): MainListItem[] => {
    if (error) {
      return [{ id: 'error', type: 'empty' }];
    }
    
    if (!selectedActivity) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return [
      { 
        id: selectedActivity._id, 
        type: 'activity' as MainItemType, 
        data: selectedActivity 
      },
      { 
        id: `${selectedActivity._id}-submission`, 
        type: 'submission' as MainItemType, 
        data: selectedActivity
      }
    ];
  }, [error, selectedActivity]);

  // Helper functions
  const sidebarKeyExtractor = useCallback((item: SidebarListItem) => item.id, []);
  const mainKeyExtractor = useCallback((item: MainListItem) => item.id, []);

  // Sidebar item renderer
  const renderSidebarItem = useCallback(({ item }: { item: SidebarListItem }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View 
            className='w-full items-center rounded-lg p-3 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : '#000'} />
            <Text className={`font-inter_regular text-sm mt-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Loading...
            </Text>
          </View>
        );
      
      case 'empty':
        return (
          <View 
            className='w-full items-center rounded-lg p-3 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No activities found.
            </Text>
          </View>
        );
      
      case 'activity':
        if (!item.data) return null;
        const activity = item.data;
        const statusInfo = getActivityStatus(activity);
        const subjectColor = getSubjectColor(activity.subject._id);
        const subjectInitials = getSubjectInitials(activity.subject.subjectName);
        const isSelected = selectedActivity?._id === activity._id;
        const mySubmission = getMySubmission(activity);
        const isSubmitted = mySubmission && mySubmission.status === 'submitted';
        
        return (
          <TouchableOpacity
            onPress={() => handleActivitySelect(activity)}
            className='w-full rounded-md p-3 mb-2'
            style={{ 
              backgroundColor: isSelected 
                ? (isDarkMode ? '#2563EB' : '#3B82F6') 
                : (isDarkMode ? '#1E1E1E' : '#F5F5F5'),
              borderWidth: 2,
              borderColor: statusInfo.color
            }}
            activeOpacity={0.7}
          >
            {/* Subject Badge */}
            <View className='flex-row'>
              <View
                className='w-[36px] h-[36px] rounded-md items-center justify-center mr-2'
                style={{ backgroundColor: subjectColor }}
              >
                <Text className='font-inter_bold text-xs text-white'>
                  {subjectInitials}
                </Text>
              </View>
              <View className='flex-1'>
                {/* Activity Title */}
                <Text 
                  className={`font-inter_bold text-base ${
                    isSelected 
                      ? 'text-white' 
                      : (isDarkMode ? 'text-[#E0E0E0]' : 'text-black')
                  }`}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {activity.title}
                </Text>
                {/* Subject Name */}
                <Text 
                  className={`font-inter_regular text-xs ${
                    isSelected 
                      ? 'text-white' 
                      : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {activity.subject.subjectName}
                </Text>
                {/* Due Date and Status */}
                <View className='flex-row items-center justify-between mt-1'>
                  <Text 
                    className={`font-inter_regular text-xs ${
                      isSelected 
                        ? 'text-blue-100' 
                        : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                    }`}
                  >
                    Due: {formatShortDate(activity.deadline)}
                  </Text>
                  {isSubmitted && !activity.myGrade && (
                    <View
                      style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text className='text-white font-inter_semibold text-xs'>
                        SUBMITTED
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, selectedActivity, getActivityStatus, getSubjectColor, getSubjectInitials, formatShortDate, handleActivitySelect, getMySubmission]);

  // Main item renderer
  const renderMainItem = useCallback(({ item }: { item: MainListItem }) => {
    switch (item.type) {
      case 'empty':
        if (error) {
          return (
            <View className='w-full items-center bg-red-100 rounded-lg p-4 mt-2 mb-2'>
              <Text className='font-inter_regular text-red-800'>
                {error}
              </Text>
            </View>
          );
        }
        
        return (
          <View className={`w-full items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-8 mt-2`}>
            <Image
              className="w-[120] h-[120] opacity-50"
              contentFit="contain"
              source={require('@/assets/images/activity.png')}
            />
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Select an activity from the sidebar to view details
            </Text>
          </View>
        );
      
      case 'activity':
        if (!item.data) return null;
        const activity = item.data;
        const statusInfo = getActivityStatus(activity);
        
        return (
          <View 
            className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 mb-4 rounded-lg`}
            style={{
              borderLeftWidth: 8,
              borderLeftColor: statusInfo.color
            }}
          >
            {/* Header with Status */}
            <View className='flex-row justify-between items-start mb-3'>
              <View
                style={{
                  backgroundColor: statusInfo.color,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text className='text-white font-inter_semibold text-xs'>
                  {statusInfo.text}
                </Text>
              </View>
            </View>

            {/* Activity Title */}
            <Text className={`font-inter_bold text-xl mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {activity.title}
            </Text>

            {/* Subject Information */}
            <View className='mb-3 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Subject: {activity.subject.subjectName}
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activity.subject.gradeLevel} - {activity.subject.section} ({activity.subject.schoolYear})
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Teacher: {getUserFullName(activity.subject.teacher)}
              </Text>
            </View>

            {/* Grade Information (if graded) */}
            {activity.myGrade && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Your Grade:
                </Text>
                <View className='p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    {activity.myGrade.score}
                    {activity.points && ` / ${activity.points}`}
                  </Text>
                  {activity.myGrade.comments && (
                    <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                      Feedback: "{activity.myGrade.comments}"
                    </Text>
                  )}
                  <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    Graded on: {formatDate(activity.myGrade.updatedAt)} by {getUserFullName(activity.myGrade.gradedBy)}
                  </Text>
                </View>
              </View>
            )}

            {/* Description */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Description:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activity.description || 'No description provided.'}
              </Text>
            </View>

            {/* Deadline and Time Remaining */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Deadline:
              </Text>
              <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatDate(activity.deadline)}
              </Text>
              {!activity.myGrade && (
                <Text className={`font-inter_semibold text-sm ${getActivityStatus(activity).status === 'overdue' ? 'text-red-500' : 'text-orange-500'}`}>
                  {getTimeRemaining(activity.deadline)}
                </Text>
              )}
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
                  <AttachIcon 
                    width={16} 
                    height={16} 
                    style={{ marginRight: 4 }} 
                    fill={isDarkMode ? '#A78BFA' : '#6D28D9'} 
                  />
                  <Text className={`font-inter_regular text-sm underline ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {activity.attachmentPath.split('/').pop()}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      
      case 'submission':
        if (!item.data) return null;
        const activityData = item.data;
        const mySubmission = getMySubmission(activityData);
        const isSubmitted = mySubmission && mySubmission.status === 'submitted';
        const deadlinePassed = isDeadlinePassed(activityData);
        const isGraded = activityData.myGrade !== undefined;
        
        return (
          <View className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 rounded-lg`}>
            <Text className={`font-inter_bold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Your Submission
            </Text>
            
            {/* Only show submission section if not graded */}
            {!isGraded && (
              <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6', borderTopWidth: 2, borderTopColor: isDarkMode ? '#374151' : '#D1D5DB' }}>
                {isSubmitted && mySubmission ? (
                  // Show submitted work
                  <View>
                    <View className='flex-row items-center mb-2'>
                      <View
                        style={{
                          backgroundColor: '#10B981',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          marginRight: 8,
                        }}
                      >
                        <Text className='text-white font-inter_semibold text-xs'>
                          SUBMITTED
                        </Text>
                      </View>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        on {formatDate(mySubmission.submissionDate)}
                      </Text>
                    </View>

                    {/* Show submitted files */}
                    {mySubmission.attachmentPaths && mySubmission.attachmentPaths.length > 0 && (
                      <View className='mb-3'>
                        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Submitted Files:
                        </Text>
                        {mySubmission.attachmentPaths.map((path, idx) => (
                          <TouchableOpacity
                            key={idx}
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
                            <Image
                              className="w-[16] h-[16] mr-2"
                              contentFit="contain"
                              source={require('@/assets/icons/import_file.png')}
                              tintColor={isDarkMode ? '#A78BFA' : '#6D28D9'}
                            />
                            <Text className={`font-inter_regular text-sm underline ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                              {path.split('/').pop()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Undo submission button (only if deadline not passed) */}
                    {!deadlinePassed && (
                      <TouchableOpacity
                        onPress={handleUndoTurnInActivity}
                        disabled={isUndoingSubmission}
                        style={{
                          backgroundColor: '#EF4444',
                          borderRadius: 8,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          opacity: isUndoingSubmission ? 0.6 : 1,
                        }}
                      >
                        {isUndoingSubmission ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className='text-white font-inter_semibold text-sm text-center'>
                            Undo Submission
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  // Show submission interface
                  <View>
                    {deadlinePassed ? (
                      <View>
                        <View
                          style={{
                            backgroundColor: '#EF4444',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            alignSelf: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <Text className='text-white font-inter_semibold text-xs'>
                            DEADLINE PASSED
                          </Text>
                        </View>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                          You can no longer submit this activity.
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <View
                          style={{
                            backgroundColor: '#6B7280',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            alignSelf: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <Text className='text-white font-inter_semibold text-xs'>
                            NOT SUBMITTED
                          </Text>
                        </View>

                        {/* File attachment section */}
                        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Attach Files (Optional):
                        </Text>
                        
                        <TouchableOpacity
                          onPress={pickDocuments}
                          style={{
                            borderWidth: 2,
                            borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                            borderStyle: 'dashed',
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 12,
                            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                          }}
                        >
                          <View className='flex-row items-center justify-center'>
                            <Image
                              className="w-[20] h-[20] mr-1"
                              contentFit="contain"
                              source={require('@/assets/icons/add_file.png')}
                              tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                            />
                            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {submissionFiles.length > 0
                                ? `${submissionFiles.length} file(s) selected`
                                : 'Tap to select files'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Show selected files */}
                        {submissionFiles.length > 0 && (
                          <View className='mb-3'>
                            <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                              Selected Files:
                            </Text>
                            {submissionFiles.map((file, idx) => (
                              <View
                                key={idx}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: 8,
                                  backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8',
                                  borderRadius: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <View className='flex-row items-center flex-1'>
                                  <Image
                                    className="w-[16] h-[16] mr-2"
                                    contentFit="contain"
                                    source={require('@/assets/icons/import_file.png')}
                                    tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                                  />
                                  <Text className={`font-inter_regular text-sm flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={1}>
                                    {Platform.OS === 'web' ? (file as File).name : (file as DocumentPicker.DocumentPickerAsset).name}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => removeFile(idx)}
                                  style={{
                                    backgroundColor: '#EF4444',
                                    borderRadius: 4,
                                    paddingVertical: 4,
                                    paddingHorizontal: 8,
                                  }}
                                >
                                  <Text className='text-white font-inter_semibold text-xs'>
                                    Remove
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Submit button */}
                        <TouchableOpacity
                          onPress={handleTurnInActivity}
                          disabled={isSubmitting}
                          style={{
                            backgroundColor: '#10B981',
                            borderRadius: 8,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            opacity: isSubmitting ? 0.6 : 1,
                          }}
                        >
                          {isSubmitting ? (
                            <View className='flex-row items-center justify-center'>
                              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                              <Text className='text-white font-inter_semibold text-sm'>
                                Submitting...
                              </Text>
                            </View>
                          ) : (
                            <Text className='text-white font-inter_semibold text-sm text-center'>
                              Turn In Activity
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, error, formatDate, getUserFullName, getActivityStatus, getMySubmission, isDeadlinePassed, submissionFiles, pickDocuments, removeFile, handleTurnInActivity, handleUndoTurnInActivity, isSubmitting, isUndoingSubmission, getTimeRemaining]);

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading your activities...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchStudentActivities}
          activeOpacity={0.7}
        >
          <Text className='text-white font-psemibold text-base'>
            Retry
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (activities.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/activity.png')}
          transition={200}
        />
        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No activities found in your enrolled subjects.
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchStudentActivities}
          activeOpacity={0.7}
        >
          <Text className='text-white font-psemibold text-base'>
            Refresh
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      {/* Header */}
      <View 
        className='flex-row items-center p-4' 
        style={{
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0'
        }}
      >
        <View className='flex-col mr-auto'>
          <Text className={`font-inter_semibold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            My Activities
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredActivities.length} of {activities.length} activities
          </Text>
          {/* Role indicator */}
          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>
            🎓 Student View
          </Text>
        </View>
        <View className='flex-row items-center'>
          <TouchableOpacity
            className={`rounded-md justify-center items-center p-2 mr-1 ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
            onPress={fetchStudentActivities}
            activeOpacity={0.7}
          >
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              tintColor="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            className='bg-gray-500 rounded-md justify-center items-center p-2'
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <Text className='text-white font-psemibold text-base'>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content - Remove ScrollView wrapper */}
      <View style={{ flex: 1, flexDirection: width < 768 ? 'column' : 'row' }}>
        {/* Side Bar - Short Activity Details */}
        <View 
          style={{
            backgroundColor: isDarkMode ? '#121212' : 'white',
            borderRightWidth: width >= 768 ? 1 : 0,
            borderBottomWidth: width < 768 ? 1 : 0,
            borderRightColor: isDarkMode ? '#333333' : '#E0E0E0',
            borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
            width: width < 768 ? '100%' : '33%',
            height: width < 768 ? '50%' : '100%',
            padding: 16,
          }}
        >
          <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Activities:
          </Text>
          {/* Search Bar */}
          <TextInput
            className={`border rounded-md px-3 py-2 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
            placeholder='Search...'
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Filters */}
          <View className='my-1'>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              <View className='flex-row my-2'>
                <View
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Picker
                    selectedValue={subjectFilter}
                    onValueChange={setSubjectFilter}
                    style={{ 
                      color: isDarkMode ? '#E0E0E0' : 'black',
                      fontFamily: 'Inter-18pt-Regular',
                      fontSize: 14, 
                      padding: 12,
                      width: width < 768 ? 200 : '100%',
                      height: 55,
                    }}
                    dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                    mode="dropdown"
                  >
                    <Picker.Item label="All Subjects" value="" />
                    {enrolledSubjects.map(subject => (
                      <Picker.Item 
                        key={subject._id} 
                        label={subject.subjectName} 
                        value={subject._id} 
                      />
                    ))}
                  </Picker>
                </View>
                <View
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    style={{ 
                      color: isDarkMode ? '#E0E0E0' : 'black',
                      fontFamily: 'Inter-18pt-Regular',
                      fontSize: 14, 
                      padding: 12,
                      width: width < 768 ? 150 : '100%',
                      height: 55,
                    }}
                    dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                    mode="dropdown"
                  >
                    <Picker.Item label="All Status" value="" />
                    <Picker.Item label="Active" value="active" />
                    <Picker.Item label="Overdue" value="overdue" />
                    <Picker.Item label="Graded" value="graded" />
                  </Picker>
                </View>
              </View>
            </ScrollView>
          </View>
          
          {/* FlashList with proper container */}
          <View style={{ flex: 1}}>
            <FlashList
              data={sidebarListData}
              renderItem={renderSidebarItem}
              keyExtractor={sidebarKeyExtractor}
              estimatedItemSize={100}
              getItemType={() => 'activity'}
            />
          </View>
        </View>

        {/* Main List - Full Activity Details and Submission */}
        <View
          style={{ 
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', 
            width: width < 768 ? '100%' : '67%',
            height: width < 768 ? '50%' : '100%',
            padding: 16,
          }}
        >
          <FlashList
            data={mainListData}
            renderItem={renderMainItem}
            keyExtractor={mainKeyExtractor}
            estimatedItemSize={200}
            getItemType={() => 'content'}
          />
        </View>
      </View>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
};

export default ActivityAndroid;