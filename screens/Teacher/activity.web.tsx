import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Platform, FlatList, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import ViewActivityModalWeb from '@/components/ViewActivityModalWeb'
import ViewSubmissionsModalWeb from '@/components/ViewSubmissionsModalWeb'
import UpdateGradeModal from '@/components/UpdateGradeModal'
import AttachIcon  from '@/assets/icons/attach.svg'
import MoreVertIcon from '@/assets/icons/more_vert.svg'
import DeleteIcon from '@/assets/icons/delete.svg'
import Dropdown, { DropdownItem } from '@/components/Dropdown'
import ContextMenu from '@/components/ContextMenu'

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
  teachers: Array<{
    teacher: User;
    quarters: {
      firstQuarter: boolean;
      secondQuarter: boolean;
      thirdQuarter: boolean;
      fourthQuarter: boolean;
    };
    isAssignedToAllQuarters: boolean;
  }>;
  section: string;
  gradeLevel: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'archived';
  subjectImage?: string;
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
  allowLateSubmissions: boolean; // Add this field
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
  document.title = 'Activities - GracEdLMS';
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
  const [quarterFilter, setQuarterFilter] = useState<string>('');

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

  // File loading error state
  const [fileLoadError, setFileLoadError] = useState<{[key: string]: boolean}>({});

  // Context menu states
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [contextMenuActivity, setContextMenuActivity] = useState<Activity | null>(null);

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

    // Quarter filter
    if (quarterFilter) {
      filtered = filtered.filter(activity => activity.quarter === quarterFilter);
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
  }, [activities, searchQuery, subjectFilter, statusFilter, quarterFilter]);

  const subjectFilterOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [
      { label: 'All Subjects', value: '' }
    ];
    
    subjects.forEach((subject) => {
      options.push({
        label: subject.subjectName,
        value: subject._id
      });
    });
    
    return options;
  }, [subjects]);

  const statusFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Graded', value: 'graded' },
  ], []);

  const quarterFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Quarters', value: '' },
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: '3rd Quarter', value: '3rd Quarter' },
    { label: '4th Quarter', value: '4th Quarter' },
  ], []);

  // Fetch activities from teacher's assigned subjects
  // Update the fetchTeacherActivities function
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
      
      // Filter subjects where this teacher is assigned in the teachers array
      const teacherSubjects = allSubjects.filter((subject: Subject) => {
        if (!subject.teachers || !Array.isArray(subject.teachers)) {
          return false;
        }
        return subject.teachers.some((ta: any) => 
          ta.teacher?._id === user._id || 
          ta.teacher?.email === user.email ||
          ta.teacher?.username === user.username
        );
      });

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
            // Filter activities created by the current teacher and add subject info
            const teacherActivities = await Promise.all(
              activitiesResponse.data.data
                .filter((activity) => {
                  // Only include activities created by the current teacher
                  return activity.createdBy._id === user._id || 
                         activity.createdBy.email === user.email ||
                         activity.createdBy.username === user.username;
                })
                .map(async (activity) => {
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
                    quarter: activity.quarter || 'First Quarter',
                    // Ensure all required fields are present
                    title: activity.title || 'Untitled Activity',
                    description: activity.description || undefined,
                    visibleDate: activity.visibleDate || new Date().toISOString(),
                    deadline: activity.deadline || new Date().toISOString(),
                    points: activity.points !== undefined ? activity.points : null,
                    createdBy: activity.createdBy || user, // Use current user as fallback
                    attachmentPath: activity.attachmentPath || null,
                    allowLateSubmissions: activity.allowLateSubmissions || false,
                    createdAt: activity.createdAt || new Date().toISOString(),
                    updatedAt: activity.updatedAt || new Date().toISOString()
                  };

                  return activityWithQuarter;
                })
            );
            allActivities.push(...teacherActivities);
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
    
    // If deadline passed but late submissions allowed, show as "Late Submissions Accepted"
    if (deadline < now && activity.allowLateSubmissions) {
      return { status: 'late-allowed', color: '#F59E0B', text: 'Late Submissions Accepted' };
    }
    
    // If deadline passed and late submissions NOT allowed, show as overdue
    if (deadline < now && !activity.allowLateSubmissions) {
      return { status: 'overdue', color: '#EF4444', text: 'Overdue' };
    }
    
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

  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.firstName} ${user.middleName} ${user.lastName}`
      : `${user.firstName} ${user.lastName}`;
  };

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setViewModalVisible(true);
  };

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
      const res = await apiClient.get(`/activities/${activity._id}/submissions`);
      setActivitySubmissions(res.data.data || []);
      setSelectedActivity(activity);
      setViewSubmissionsModalVisible(true);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch submissions.';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmissionsLoading(false);
    }
    setContextMenuVisible(false);
  };

  const handleDeleteActivity = async (activityId: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Activity',
            'Are you sure you want to delete this activity? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (confirmDelete) {
      try {
        await apiClient.delete(`/activities/${activityId}`);
        
        if (Platform.OS === 'web') {
          window.alert('Activity deleted successfully');
        } else {
          Alert.alert('Success', 'Activity deleted successfully');
        }
        
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
    }
    setContextMenuVisible(false);
  };

  const canModifyActivity = (activity: Activity) => {
    return user ? activity.createdBy._id === user._id : false;
  };

  const handleUpdateGrade = (grade: Grade, submission: Submission) => {
    const activityWithQuarter = selectedActivity ? {
      ...selectedActivity,
      quarter: selectedActivity.quarter || 'First Quarter'
    } : null;

    setSelectedGrade(grade);
    setSelectedSubmissionForUpdate(submission);
    setSelectedActivity(activityWithQuarter);
    setUpdateGradeModalVisible(true);
  };

  const handleGradeUpdated = async () => {
    if (!selectedActivity) return;
    
    try {
      // Refresh the activities list to get updated grades
      await fetchTeacherActivities();
      
      // Refresh submissions for the current activity
      const res = await apiClient.get(`/activities/${selectedActivity._id}/submissions`);
      setActivitySubmissions(res.data.data || []);
      
      // Also refresh the selected activity to get updated grades array
      const activityRes = await apiClient.get(`/activities/${selectedActivity._id}`);
      if (activityRes.data.success && activityRes.data.data) {
        // Fetch grades for this activity
        let grades: Grade[] = [];
        try {
          const gradesResponse = await apiClient.get(`/activities/${selectedActivity._id}/grades`);
          if (gradesResponse.data.success && gradesResponse.data.data) {
            grades = gradesResponse.data.data;
          }
        } catch (gradeError) {
          console.warn('Failed to fetch grades:', gradeError);
        }
        
        // Update the selected activity with new grades
        setSelectedActivity({
          ...activityRes.data.data,
          subject: selectedActivity.subject, // Preserve subject info
          grades: grades,
        });
      }
    } catch (error) {
      console.error('Error refreshing after grade update:', error);
    }
  };

  const openContextMenu = (e: any, activity: Activity) => {
    const { pageX, pageY } = e.nativeEvent;
    setContextMenuCoords({ x: pageX, y: pageY });
    setContextMenuActivity(activity);
    setContextMenuVisible(true);
  };

  const contextMenuItems = useMemo(() => [
    {
      label: 'View Details',
      icon: (
        <Image
          source={require('@/assets/icons/show_password.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuActivity && handleViewActivity(contextMenuActivity),
    },
    {
      label: 'View Submissions',
      icon: (
        <Image
          source={require('@/assets/icons/import_file.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuActivity && handleViewSubmissions(contextMenuActivity),
    },
    ...(contextMenuActivity && canModifyActivity(contextMenuActivity) ? [{
      label: 'Delete',
      icon: (
        <DeleteIcon
          width={20}
          height={20}
          style={{ marginRight: 8 }}
          fill="#EF4444"
        />
      ),
      onPress: () => contextMenuActivity && handleDeleteActivity(contextMenuActivity._id),
    }] : []),
  ], [contextMenuActivity, canModifyActivity, isDarkMode]);

  // Add this helper function after the other helper functions
  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };

  const renderActivityItem = useCallback(({ item }: { item: Activity }) => {
    const statusInfo = getActivityStatus(item);
    const initials = item.subject.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subject.subjectName);
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => handleViewActivity(item)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left side with icon and content */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Subject Icon or Image */}
            {item.subject.subjectImage ? (
              <Image
                source={{ uri: item.subject.subjectImage }}
                style={{ width: 50, height: 50, borderRadius: 8 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  backgroundColor: bgColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontFamily: 'Inter-Bold', fontSize: 18 }}>
                  {initials}
                </Text>
              </View>
            )}

            {/* Activity Details */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: 8,
                }}
              >
                {item.subject?.subjectName || 'No Subject'} • {item.quarter}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    backgroundColor: statusInfo.color,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 12,
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 12, 
                    fontFamily: 'Inter-Medium' 
                  }}>
                    {statusInfo.text}
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 12, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                }}>
                  {item.points !== null ? `${item.points} points` : 'No points'}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280' 
              }}>
                Due: {formatDate(item.deadline)}
              </Text>
              {item.grades && item.grades.length > 0 && (
                <Text style={{ 
                  fontSize: 12, 
                  fontFamily: 'Inter-Regular',
                  color: '#8B5CF6',
                  marginTop: 4
                }}>
                  {item.grades.length} student{item.grades.length !== 1 ? 's' : ''} graded
                </Text>
              )}
            </View>
          </View>

          {/* More Icon */}
          <TouchableOpacity
            onPress={(e) => openContextMenu(e, item)}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, getActivityStatus, formatDate, openContextMenu, handleViewActivity, getConsistentColor]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ 
          marginTop: 16, 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#9CA3AF' : '#6B7280' 
        }}>
          Loading activities...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#EF4444' : '#DC2626',
          textAlign: 'center',
          marginBottom: 16
        }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchTeacherActivities}
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>
            Retry
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
              }}
            >
              Activities
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginTop: 4,
              }}
            >
              {filteredActivities.length} of {activities.length} activities
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchTeacherActivities}
            className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              style={{ width: 24, height: 24}}
              tintColor="white"
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                placeholder="Search activities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  fontFamily: 'Inter-Regular',
                }}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
            </View>
            <TouchableOpacity
              onPress={fetchTeacherActivities}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>
                Search
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                Subject
              </Text>
              <Dropdown
                data={subjectFilterOptions}
                selectedValue={subjectFilter}
                onValueChange={setSubjectFilter}
                placeholder="All Subjects"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280',
                marginBottom: 4 
              }}>
                Status
              </Text>
              <Dropdown
                data={statusFilterOptions}
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="All Status"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280',
                marginBottom: 4 
              }}>
                Quarter
              </Text>
              <Dropdown
                data={quarterFilterOptions}
                selectedValue={quarterFilter}
                onValueChange={setQuarterFilter}
                placeholder="All Quarters"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {filteredActivities.length > 0 ? (
          <FlatList
            data={filteredActivities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/activity.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontFamily: 'Inter-SemiBold',
              color: isDarkMode ? '#9CA3AF' : '#6B7280', 
              marginBottom: 8 
            }}>
              No activities found
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#6B7280' : '#9CA3AF', 
              textAlign: 'center' 
            }}>
              {searchQuery || subjectFilter || statusFilter || quarterFilter
                ? 'Try adjusting your filters'
                : 'No activities available in your assigned subjects'}
            </Text>
          </View>
        )}
      </View>

      {/* Context Menu */}
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuCoords.x}
        y={contextMenuCoords.y}
        onClose={() => setContextMenuVisible(false)}
        items={contextMenuItems}
        menuStyle={{ 
          backgroundColor: isDarkMode ? '#333333' : 'white', 
          borderRadius: 8,
          minWidth: 150,
        }}
        itemStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
        labelStyle={{ 
          color: isDarkMode ? '#F9FAFB' : '#111827', 
          fontSize: 14,
          fontFamily: 'Inter-Medium',
        }}
      />

      {/* View Activity Modal */}
      <ViewActivityModalWeb
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        activity={selectedActivity}
        onViewSubmissions={handleViewSubmissions}
        canModifyActivity={canModifyActivity}
        getActivityStatus={getActivityStatus}
        getSubmissionCount={(activity) => activity.submissions?.length || 0}
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
        onGradeUpdated={handleGradeUpdated}
      />

      {/* Update Grade Modal */}
      <UpdateGradeModal
        visible={updateGradeModalVisible}
        onClose={() => setUpdateGradeModalVisible(false)}
        grade={selectedGrade}
        activity={selectedActivity}
        submission={selectedSubmissionForUpdate}
        onGradeUpdated={handleGradeUpdated}
        getUserFullName={getUserFullName}
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
};

export default ActivityWeb;