import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Platform, VirtualizedList, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { Picker } from '@react-native-picker/picker'
import ViewActivityModalWeb from '@/components/ViewActivityModalWeb'
import ViewSubmissionsModalWeb from '@/components/ViewSubmissionsModalWeb'
import UpdateGradeModal from '@/components/UpdateGradeModal'
import AttachIcon  from '@/assets/icons/attach.svg'

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
  submissions?: Submission[];
  grades?: Grade[];
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
type MainItemType = 'loading' | 'empty' | 'activity' | 'submissions';

interface SidebarListItem {
  id: string;
  type: SidebarItemType;
  data?: Activity;
}

interface MainListItem {
  id: string;
  type: MainItemType;
  data?: Activity;
  submissions?: Submission[];
}

// Grading state interface
interface GradingState {
  [submissionId: string]: {
    score: string;
    comments: string;
    isSubmitting: boolean;
  };
}

// Teacher's activity page
const ActivityWeb: React.FC = () => {
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
  const [viewModalVisible, setViewModalVisible] = useState(false);
  
  // Filter states
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // New states for activity selection and submissions
  const [viewSubmissionsModalVisible, setViewSubmissionsModalVisible] = useState(false);
  const [activitySubmissions, setActivitySubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Add new state for update grade modal
  const [updateGradeModalVisible, setUpdateGradeModalVisible] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubmissionForUpdate, setSelectedSubmissionForUpdate] = useState<Submission | null>(null);

  // Grading state
  const [gradingState, setGradingState] = useState<GradingState>({});

  // Derived data for filters
  const subjects = useMemo(() => {
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

    // Status filter (based on deadline and grades)
    if (statusFilter) {
      const now = new Date();
      filtered = filtered.filter(activity => {
        const deadline = new Date(activity.deadline);
        const visible = new Date(activity.visibleDate);
        const hasGrades = activity.grades && activity.grades.length > 0;
        
        switch (statusFilter) {
          case 'active':
            return !hasGrades && visible <= now && deadline > now;
          case 'upcoming':
            return !hasGrades && visible > now;
          case 'overdue':
            return !hasGrades && deadline < now;
          case 'graded':
            return hasGrades;
          default:
            return true;
        }
      });
    }

    // Sort by deadline (soonest first)
    return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activities, searchQuery, subjectFilter, statusFilter]);

  // Fetch activities from teacher's assigned subjects
  const fetchTeacherActivities = async () => {
    if (!user || user.role !== 'Teacher') {
      setError('Unauthorized: Teacher access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get subjects assigned to this teacher
      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
      // Filter subjects where this teacher is assigned
      const teacherSubjects = allSubjects.filter((subject: Subject) => 
        subject.teacher._id === user._id
      );

      if (teacherSubjects.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Then, fetch activities for each assigned subject
      const allActivities: Activity[] = [];
      
      for (const subject of teacherSubjects) {
        try {
          const activitiesResponse = await apiClient.get<ActivityResponse>(`/subjects/${subject._id}/activities`);
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            // Add subject info to each activity and fetch grades
            const activitiesWithSubject = await Promise.all(
              activitiesResponse.data.data.map(async (activity) => {
                // Fetch grades for this activity
                let grades: Grade[] = [];
                try {
                  const gradesResponse = await apiClient.get(`/activities/${activity._id}/grades`);
                  if (gradesResponse.data.success && gradesResponse.data.data) {
                    grades = gradesResponse.data.data;
                  }
                } catch (gradeError) {
                  console.warn(`Failed to fetch grades for activity ${activity.title}:`, gradeError);
                }

                // Ensure quarter field is present and valid
                const activityWithQuarter: Activity = {
                  ...activity,
                  subject: subject,
                  grades: grades,
                  quarter: activity.quarter || 'First Quarter', // Provide default quarter if not set
                  // Ensure all required fields are present
                  title: activity.title || 'Untitled Activity',
                  description: activity.description || undefined,
                  visibleDate: activity.visibleDate || new Date().toISOString(),
                  deadline: activity.deadline || new Date().toISOString(),
                  points: activity.points !== undefined ? activity.points : null,
                  createdBy: activity.createdBy || user, // Use current user as fallback
                  attachmentPath: activity.attachmentPath || null,
                  createdAt: activity.createdAt || new Date().toISOString(),
                  updatedAt: activity.updatedAt || new Date().toISOString()
                };

                return activityWithQuarter;
              })
            );
            allActivities.push(...activitiesWithSubject);
          }
        } catch (subjectError: any) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}:`, subjectError);
          // Continue with other subjects even if one fails
        }
      }

      setActivities(allActivities);
    } catch (err: any) {
      console.error('Error fetching teacher activities:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherActivities();
  }, [user]);

  // Helper functions
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const deadline = new Date(activity.deadline);
    const visible = new Date(activity.visibleDate);

    // Check if any student has been graded for this activity
    const hasGrades = activity.grades && activity.grades.length > 0;

    if (hasGrades) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
    if (visible > now) return { status: 'upcoming', color: '#3B82F6', text: 'Upcoming' };
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

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setViewModalVisible(true);
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
  const handleActivitySelect = async (activity: Activity) => {
    // Ensure the activity has the quarter field
    const activityWithQuarter = {
      ...activity,
      quarter: activity.quarter || 'First Quarter'
    };
    
    setSelectedActivity(activityWithQuarter);
    setSubmissionsLoading(true);
    
    try {
      const res = await apiClient.get(`/activities/${activity._id}/submissions`);
      const submissions = res.data.data || [];
      setActivitySubmissions(submissions);
      
      // Initialize grading state for each submission
      const newGradingState: GradingState = {};
      submissions.forEach((submission: Submission) => {
        // Find existing grade for this submission
        const existingGrade = activity.grades?.find(grade => 
          grade.student._id === submission.student._id
        );
        
        newGradingState[submission._id] = {
          score: existingGrade ? existingGrade.score.toString() : '',
          comments: existingGrade ? existingGrade.comments || '' : '',
          isSubmitting: false
        };
      });
      setGradingState(newGradingState);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      setActivitySubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // New function to handle viewing submissions modal
  const handleViewSubmissions = async (activity: Activity) => {
    if (!user || user.role !== 'Teacher') {
      if (Platform.OS === 'web') {
        window.alert('Not authorized to view submissions.');
      } else {
        Alert.alert('Error', 'Not authorized to view submissions.');
      }
      return;
    }

    try {
      setSubmissionsLoading(true);
      console.log(`➡️ Sending GET /activities/${activity._id}/submissions`);
      
      const res = await apiClient.get(`/activities/${activity._id}/submissions`);
      console.log('✅ Get All Submissions response:', res.data);
      
      setActivitySubmissions(res.data.data || []);
      setSelectedActivity(activity);
      setViewSubmissionsModalVisible(true);
    } catch (error: any) {
      console.error('🚨 Get All Submissions error:', error);
      console.error('🚨 Error response:', error.response?.data);
      
      const msg = error.response?.data?.message || error.message || 'Failed to fetch submissions.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Delete activity function (only for activities created by this teacher)
  const handleDeleteActivity = async (activityId: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this activity? This action cannot be undone.');
      if (!confirmDelete) return;
    } else {
      Alert.alert(
        'Delete Activity',
        'Are you sure you want to delete this activity? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDelete(activityId) }
        ]
      );
      return;
    }

    await performDelete(activityId);
  };

  const performDelete = async (activityId: string) => {
    try {
      await apiClient.delete(`/activities/${activityId}`);
      
      if (Platform.OS === 'web') {
        window.alert('Activity deleted successfully');
      } else {
        Alert.alert('Success', 'Activity deleted successfully');
      }
      
      // Refresh activities and clear selection if deleted activity was selected
      if (selectedActivity && selectedActivity._id === activityId) {
        setSelectedActivity(null);
        setActivitySubmissions([]);
      }
      fetchTeacherActivities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete activity';
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Check if the teacher can delete/edit the activity (only activities they created)
  const canModifyActivity = (activity: Activity) => {
    return user ? activity.createdBy._id === user._id : false;
  };

  // Get submission count for activity
  const getSubmissionCount = (activity: Activity) => {
    return activity.submissions ? activity.submissions.length : 0;
  };

  // Grading functions
  const updateGradingState = (submissionId: string, field: 'score' | 'comments', value: string) => {
    setGradingState(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  // Add function to handle opening update grade modal
  const handleUpdateGrade = (grade: Grade, submission: Submission) => {
    // Ensure the activity has the quarter field
    const activityWithQuarter = selectedActivity ? {
      ...selectedActivity,
      quarter: selectedActivity.quarter || 'First Quarter' // Provide default if missing
    } : null;

    setSelectedGrade(grade);
    setSelectedSubmissionForUpdate(submission);
    setSelectedActivity(activityWithQuarter); // Update the selected activity
    setUpdateGradeModalVisible(true);
  };

  // Add function to handle grade updated callback
  const handleGradeUpdated = async () => {
    // Refresh activities to get updated grades
    await fetchTeacherActivities();
    
    // Re-select the activity to refresh submissions
    if (selectedActivity) {
      await handleActivitySelect(selectedActivity);
    }
  };

  // Update the validation function for whole numbers
  const validateScore = (score: string, maxPoints: number | null): boolean => {
    if (!score.trim()) return false;
    const numScore = parseInt(score, 10);
    if (isNaN(numScore)) return false;
    if (numScore < 0) return false;
    if (maxPoints !== null && numScore > maxPoints) return false;
    return true;
  };

  // Update the handleSubmitGrade function with better logging
  const handleSubmitGrade = async (submission: Submission, activity: Activity) => {
    if (!selectedActivity) return;

    const gradeData = gradingState[submission._id];
    if (!gradeData) return;

    const score = gradeData.score.trim();
    const comments = gradeData.comments.trim();

    console.log('🔍 Frontend grading:', {
      originalScore: score,
      parsedScore: parseInt(score, 10),
      submissionId: submission._id,
      studentId: submission.student._id
    });

    // Validation
    if (!validateScore(score, activity.points)) {
      const errorMsg = activity.points 
        ? `Score must be a whole number between 0 and ${activity.points}`
        : 'Score must be a whole number greater than or equal to 0';
      
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Invalid Score', errorMsg);
      }
      return;
    }

    // Set submitting state
    setGradingState(prev => ({
      ...prev,
      [submission._id]: {
        ...prev[submission._id],
        isSubmitting: true
      }
    }));

    try {
      const submitData = {
        studentId: submission.student._id,
        score: parseInt(score, 10),
        comments: comments || undefined
      };

      console.log('➡️ Submitting grade:', submitData);

      const response = await apiClient.post(`/activities/${activity._id}/grades`, submitData);

      console.log('✅ Grade submitted successfully:', response.data);

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Grade submitted successfully!');
      } else {
        Alert.alert('Success', 'Grade submitted successfully!');
      }

      // Refresh activities to get updated grades
      await fetchTeacherActivities();
      
      // Re-select the activity to refresh submissions
      if (selectedActivity) {
        await handleActivitySelect(selectedActivity);
      }

    } catch (error: any) {
      console.error('🚨 Error submitting grade:', error);
      console.error('🚨 Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit grade';
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      // Reset submitting state
      setGradingState(prev => ({
        ...prev,
        [submission._id]: {
          ...prev[submission._id],
          isSubmitting: false
        }
      }));
    }
  };

  // Get existing grade for a submission
  const getExistingGrade = (submission: Submission): Grade | undefined => {
    if (!selectedActivity?.grades) return undefined;
    return selectedActivity.grades.find(grade => 
      grade.student._id === submission.student._id
    );
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
        id: `${selectedActivity._id}-submissions`, 
        type: 'submissions' as MainItemType, 
        data: selectedActivity,
        submissions: activitySubmissions 
      }
    ];
  }, [error, selectedActivity, activitySubmissions]);

  // VirtualizedList helper functions
  const getSidebarItem = useCallback((data: SidebarListItem[], index: number) => data[index], []);
  const getMainItem = useCallback((data: MainListItem[], index: number) => data[index], []);
  const getSidebarItemCount = useCallback((data: SidebarListItem[]) => data.length, []);
  const getMainItemCount = useCallback((data: MainListItem[]) => data.length, []);
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
              <View>
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
                  className={`font-inter_regular text-xs flex-1 ${
                    isSelected 
                      ? 'text-white' 
                      : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {activity.subject.subjectName}
                </Text>
                {/* Due Date */}
                <Text 
                  className={`font-inter_regular text-xs ${
                    isSelected 
                      ? 'text-blue-100' 
                      : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                  }`}
                >
                  Due: {formatShortDate(activity.deadline)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, selectedActivity, getActivityStatus, getSubjectColor, getSubjectInitials, formatShortDate, handleActivitySelect]);

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
        const canModify = canModifyActivity(activity);
        
        return (
          <View 
            className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 mb-4 rounded-lg`}
            style={{
              borderLeftWidth: 8,
              borderLeftColor: statusInfo.color
            }}
          >
            {/* Header with Status and Actions */}
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
              
              {/* Action Buttons */}
              <View className='flex-row'>
                <TouchableOpacity
                  onPress={() => handleViewSubmissions(activity)}
                  style={{
                    backgroundColor: '#8B5CF6',
                    padding: 6,
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Image
                    className="w-[16] h-[16]"
                    contentFit="contain"
                    source={require('@/assets/icons/import_file.png')}
                    tintColor="white"
                  />
                </TouchableOpacity>
                
                {canModify && (
                  <TouchableOpacity
                    onPress={() => handleDeleteActivity(activity._id)}
                    style={{
                      backgroundColor: '#EF4444',
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Image
                      className="w-[16] h-[16]"
                      contentFit="contain"
                      source={require('@/assets/icons/delete.png')}
                      tintColor="white"
                    />
                  </TouchableOpacity>
                )}
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
                {activity.subject.gradeLevel} • {activity.subject.section} {activity.subject.schoolYear}
              </Text>
            </View>

            {/* Creator Info */}
            <View className='mb-3'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Created by:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {getUserFullName(activity.createdBy)}
                {canModify && (
                  <Text className={`font-inter_semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {' '}(You)
                  </Text>
                )}
              </Text>
            </View>

            {/* Description */}
            {activity.description && (
              <View className='mb-3'>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Description:
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activity.description}
                </Text>
              </View>
            )}

            {/* Dates and Points */}
            <View className='flex-row justify-between items-center mb-3'>
              <View className='flex-1'>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Start: {formatDate(activity.visibleDate)}
                </Text>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Due: {formatDate(activity.deadline)}
                </Text>
              </View>
              
              {activity.points !== null && (
                <View className='items-end'>
                  <Text className={`font-inter_bold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {activity.points}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    points
                  </Text>
                </View>
              )}
            </View>

            {/* Attachment */}
            {activity.attachmentPath && (
              <View className='mb-3'>
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

            {/* Grading Summary */}
            {activity.grades && activity.grades.length > 0 && (
              <View className='mb-3 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Grading Summary:
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                  {activity.grades.length} student{activity.grades.length !== 1 ? 's' : ''} graded
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                  Average Score: {(activity.grades.reduce((sum, grade) => sum + grade.score, 0) / activity.grades.length).toFixed(1)}
                  {activity.points && ` / ${activity.points}`}
                </Text>
              </View>
            )}
          </View>
        );
      
      // Update the submissions section in renderMainItem callback
      case 'submissions':
        if (!item.data || !item.submissions) return null;
        const activityData = item.data;
        
        return (
          <View className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 rounded-lg`}>
            <Text className={`font-inter_bold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Student Submissions ({item.submissions.length})
            </Text>

            {submissionsLoading ? (
              <View className='items-center py-8'>
                <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
                <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Loading submissions...
                </Text>
              </View>
            ) : item.submissions.length > 0 ? (
              item.submissions.map((submission, idx) => {
                const existingGrade = getExistingGrade(submission);
                const gradeState = gradingState[submission._id] || { score: '', comments: '', isSubmitting: false };
                
                return (
                  <View
                    key={submission._id}
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: existingGrade ? '#8B5CF6' : (submission.status === 'submitted' ? '#10B981' : '#6B7280'),
                    }}
                  >
                    {/* Student Info with Star Icon for Graded Submissions */}
                    <View className='flex-row mb-2'>
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
                      <View className='flex-row items-center'>
                        {/* Star Icon for Graded Submissions */}
                        {existingGrade && (
                          <TouchableOpacity
                            onPress={() => handleUpdateGrade(existingGrade, submission)}
                            style={{
                              backgroundColor: '#FFD700',
                              padding: 6,
                              borderRadius: 6,
                              marginLeft: 8,
                              marginRight: 8,
                            }}
                          >
                            <Image
                              className="w-[16] h-[16]"
                              contentFit="contain"
                              source={require('@/assets/icons/star.png')} // You'll need to add this icon
                              tintColor="white"
                            />
                          </TouchableOpacity>
                        )}
                        
                        <View
                          style={{
                            backgroundColor: existingGrade ? '#8B5CF6' : (submission.status === 'submitted' ? '#10B981' : '#6B7280'),
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text className='text-white font-inter_semibold text-xs'>
                            {existingGrade ? 'GRADED' : submission.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Submission Details */}
                    <Text className={`font-inter_regular text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Submitted on: {formatDate(submission.submissionDate)}
                    </Text>

                    {/* Existing Grade Display */}
                    {existingGrade && (
                      <View className='mb-3 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                        <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                          Current Grade: {Number(existingGrade.score)} {/* Ensure it's treated as a number */}
                          {existingGrade.bonusPoints && existingGrade.bonusPoints > 0 && ` + ${Number(existingGrade.bonusPoints)} bonus`}
                          {activityData.points && ` / ${activityData.points}`}
                        </Text>
                        {existingGrade.comments && (
                          <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                            Comments: {existingGrade.comments}
                          </Text>
                        )}
                        <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                          Graded by: {getUserFullName(existingGrade.gradedBy)}
                        </Text>
                      </View>
                    )}

                    {/* Attached Files */}
                    <View style={{ marginTop: 8 }}>
                      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Attached Files:
                      </Text>
                      {submission.attachmentPaths && submission.attachmentPaths.length > 0 ? (
                        submission.attachmentPaths.map((path, fileIdx) => (
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
                        ))
                      ) : (
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} italic`}>
                          No files attached
                        </Text>
                      )}
                      
                      {/* Grading Section - Only show if not already graded */}
                      {!existingGrade && (
                        <View className='mt-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0' }}>
                          <Text className={`font-inter_semibold text-sm mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Grade Submission:
                          </Text>
                          
                          {/* Score Input */}
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Score:
                          </Text>
                          <View className='flex-row items-center mb-3'>
                            <TextInput
                              className={`border rounded-md px-3 py-2 mr-2 font-inter_regular text-sm ${
                                isDarkMode ? 'border-gray-600 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'
                              }`}
                              style={{ width: 80 }}
                              placeholder="0"
                              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                              value={gradeState.score}
                              onChangeText={(text) => {
                                // Only allow whole numbers, no decimals
                                const numericValue = text.replace(/[^0-9]/g, '');
                                updateGradingState(submission._id, 'score', numericValue);
                              }}
                              keyboardType="numeric"
                              editable={!gradeState.isSubmitting}
                            />
                            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                              / {activityData.points || '∞'}
                            </Text>
                            {activityData.points && gradeState.score && (
                              <Text className={`font-inter_regular text-xs ml-2 ${
                                validateScore(gradeState.score, activityData.points) 
                                  ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                                  : (isDarkMode ? 'text-red-400' : 'text-red-600')
                              }`}>
                                {validateScore(gradeState.score, activityData.points) ? '✓' : '✗ Invalid'}
                              </Text>
                            )}
                          </View>
                          
                          {/* Comments Input */}
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Comments (Optional):
                          </Text>
                          <TextInput
                            className={`border rounded-md px-3 py-2 font-inter_regular text-sm mb-3 ${
                              isDarkMode ? 'border-gray-600 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'
                            }`}
                            multiline
                            numberOfLines={3}
                            placeholder="Enter feedback or comments..."
                            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                            value={gradeState.comments}
                            onChangeText={(text) => updateGradingState(submission._id, 'comments', text)}
                            editable={!gradeState.isSubmitting}
                          />
                          
                          {/* Submit Grade Button */}
                          <TouchableOpacity
                            className={`rounded-md h-[40px] justify-center items-center ${
                              gradeState.isSubmitting || !validateScore(gradeState.score, activityData.points)
                                ? 'bg-gray-400'
                                : 'bg-blue-500'
                            }`}
                            activeOpacity={0.7}
                            disabled={gradeState.isSubmitting || !validateScore(gradeState.score, activityData.points)}
                            onPress={() => handleSubmitGrade(submission, activityData)}
                          >
                            {gradeState.isSubmitting ? (
                              <View className='flex-row items-center'>
                                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                <Text className='text-white font-psemibold text-base'>
                                  Submitting...
                                </Text>
                              </View>
                            ) : (
                              <Text className='text-white font-psemibold text-base'>
                                Submit Grade
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
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
          </View>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, error, submissionsLoading, formatDate, getUserFullName, getActivityStatus, canModifyActivity, handleViewSubmissions, handleDeleteActivity, gradingState, updateGradingState, validateScore, handleSubmitGrade, getExistingGrade]);

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
          onPress={fetchTeacherActivities}
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
          No activities found in your assigned subjects.
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchTeacherActivities}
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
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
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
            My Subject Activities
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredActivities.length} of {activities.length} activities
          </Text>
          {/* Role indicator */}
          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`}>
            👨‍🏫 Teacher View
          </Text>
        </View>
        <View className='flex-row items-center'>
          <TouchableOpacity
            className={`rounded-md justify-center items-center p-2 mr-1 ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
            onPress={fetchTeacherActivities}
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

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={{ height: '100%', flexDirection: width < 768 ? 'column' : 'row' }}
      >
        {/* Side Bar - Short Activity Details */}
        <View className={`p-4 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
          style={{
            borderRightWidth: width >= 768 ? 1 : 0,
            borderBottomWidth: width < 768 ? 1 : 0,
            borderRightColor: isDarkMode ? '#333333' : '#E0E0E0',
            borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
            width: width < 768 ? '100%' : '33%',
          }}>
            <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Activities:
            </Text>
            {/* Search Bar */}
            <TextInput
              className={`border rounded-md px-3 py-2 font-inter_regular text-sm ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
              placeholder='Search...'
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {/* Filters */}
            <View className='mt-2 flex-row'>
              <Picker
                selectedValue={subjectFilter}
                onValueChange={setSubjectFilter}
                style={{ 
                  backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
                  borderRadius: 6,
                  color: isDarkMode ? '#E0E0E0' : 'black',
                  fontFamily: 'Inter-18pt-Regular',
                  fontSize: 14, 
                  padding: 8,
                  marginBottom: 8,
                  marginRight: 4,
                  width: width < 768 ? '50%' : '100%',
                }}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode="dropdown"
              >
                <Picker.Item label="All Subjects" value="" />
                {subjects.map(subject => (
                  <Picker.Item 
                    key={subject._id} 
                    label={subject.subjectName} 
                    value={subject._id} 
                  />
                ))}
              </Picker>
              <Picker
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
                style={{ 
                  backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#1E1E1E' : '#d1d5db', 
                  borderRadius: 6,
                  color: isDarkMode ? '#E0E0E0' : 'black',
                  fontFamily: 'Inter-18pt-Regular',
                  fontSize: 14, 
                  padding: 8,
                  marginBottom: 8,
                  width: width < 768 ? '50%' : '100%',
                }}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode="dropdown"
              >
                <Picker.Item label="All Status" value="" />
                <Picker.Item label="Active" value="active" />
                <Picker.Item label="Upcoming" value="upcoming" />
                <Picker.Item label="Overdue" value="overdue" />
                <Picker.Item label="Graded" value="graded" />
              </Picker>
            </View>
            <VirtualizedList
              data={sidebarListData}
              initialNumToRender={10}
              renderItem={renderSidebarItem}
              keyExtractor={sidebarKeyExtractor}
              getItemCount={getSidebarItemCount}
              getItem={getSidebarItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={10}
            />
        </View>
        {/* Main List - Full Activity Details and Submissions */}
        <View
          className='p-4'
          style={{ 
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', 
            width: width < 768 ? '100%' : '67%',
            height: width < 768 ? 'auto' : '100%'
          }}
        >
          <VirtualizedList
            data={mainListData}
            initialNumToRender={3}
            renderItem={renderMainItem}
            keyExtractor={mainKeyExtractor}
            getItemCount={getMainItemCount}
            getItem={getMainItem}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={50}
            windowSize={5}
          />
        </View>
      </ScrollView>

      {/* View Activity Modal */}
      <ViewActivityModalWeb
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        activity={selectedActivity}
        onViewSubmissions={handleViewSubmissions}
        canModifyActivity={canModifyActivity}
        getActivityStatus={getActivityStatus}
        getSubmissionCount={getSubmissionCount}
        formatDate={formatDate}
        getUserFullName={getUserFullName}
      />

      {/* View All Submissions Modal */}
      <ViewSubmissionsModalWeb
        visible={viewSubmissionsModalVisible}
        onClose={() => setViewSubmissionsModalVisible(false)}
        activity={selectedActivity}
        submissions={activitySubmissions}
        loading={submissionsLoading}
        formatDate={formatDate}
        getUserFullName={getUserFullName}
      />

      {/* Update Grade Modal */}
      <UpdateGradeModal
        visible={updateGradeModalVisible}
        onClose={() => setUpdateGradeModalVisible(false)}
        grade={selectedGrade}
        activity={selectedActivity} // This should now have the quarter field
        submission={selectedSubmissionForUpdate}
        onGradeUpdated={handleGradeUpdated}
        getUserFullName={getUserFullName}
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default ActivityWeb;