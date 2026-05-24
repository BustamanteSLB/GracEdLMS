import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Platform, useWindowDimensions, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import MoreVertIcon from '@/assets/icons/more_vert.svg'
import DeleteIcon from '@/assets/icons/delete.svg'
import DropdownMobile from '@/components/DropdownMobile'
import DownIcon from '@/assets/icons/down.svg'
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
  quarter: string;
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
  quarter: string;
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  allowLateSubmissions: boolean;
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
  const [quarterFilter, setQuarterFilter] = useState<string>('');

  // Modal states
  const [viewDetailModalVisible, setViewDetailModalVisible] = useState(false);
  const [viewSubmissionsModalVisible, setViewSubmissionsModalVisible] = useState(false);
  const [activitySubmissions, setActivitySubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuActivity, setContextMenuActivity] = useState<Activity | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  // Grading state
  const [gradingStates, setGradingStates] = useState<{[submissionId: string]: {
    score: string;
    bonusPoints: string;
    comments: string;
    isSubmitting: boolean;
  }}>({});

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

  const subjectFilterOptions = useMemo(() => {
    const options = [{ label: 'All Subjects', value: '' }];
    subjects.forEach((subject) => {
      options.push({
        label: subject.subjectName,
        value: subject._id
      });
    });
    return options;
  }, [subjects]);

  const statusFilterOptions = useMemo(() => [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Graded', value: 'graded' },
  ], []);

  const quarterFilterOptions = useMemo(() => [
    { label: 'All Quarters', value: '' },
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: '3rd Quarter', value: '3rd Quarter' },
    { label: '4th Quarter', value: '4th Quarter' },
  ], []);

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

      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
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
                  let grades: Grade[] = [];
                  try {
                    const gradesResponse = await apiClient.get(`/activities/${activity._id}/grades`);
                    if (gradesResponse.data.success && gradesResponse.data.data) {
                      grades = gradesResponse.data.data;
                    }
                  } catch (gradeError) {
                    console.warn(`Failed to fetch grades for activity ${activity.title}:`, gradeError);
                  }

                  const activityWithQuarter: Activity = {
                    ...activity,
                    subject: subject,
                    grades: grades,
                    quarter: activity.quarter || 'First Quarter',
                    title: activity.title || 'Untitled Activity',
                    description: activity.description || undefined,
                    visibleDate: activity.visibleDate || new Date().toISOString(),
                    deadline: activity.deadline || new Date().toISOString(),
                    points: activity.points !== undefined ? activity.points : null,
                    createdBy: activity.createdBy || user,
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

    const hasGrades = activity.grades && activity.grades.length > 0;

    if (hasGrades) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
    if (visible > now) return { status: 'upcoming', color: '#3B82F6', text: 'Upcoming' };
    
    if (deadline < now && activity.allowLateSubmissions) {
      return { status: 'late-allowed', color: '#F59E0B', text: 'Late Submissions Accepted' };
    }
    
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

  const canModifyActivity = (activity: Activity) => {
    return user ? activity.createdBy._id === user._id : false;
  };

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setViewDetailModalVisible(true);
    setContextMenuVisible(false);
  };

  const handleViewSubmissions = async (activity: Activity) => {
    if (!user || user.role !== 'Teacher') {
      Alert.alert('Error', 'Not authorized to view submissions.');
      return;
    }

    try {
      setSubmissionsLoading(true);
      const res = await apiClient.get(`/activities/${activity._id}/submissions`);
      setActivitySubmissions(res.data.data || []);
      setSelectedActivity(activity);
      setViewSubmissionsModalVisible(true);
      setContextMenuVisible(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch submissions.';
      Alert.alert('Error', msg);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiClient.delete(`/activities/${activityId}`);
              Alert.alert('Success', 'Activity deleted successfully');
              fetchTeacherActivities();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete activity');
            }
          }
        }
      ]
    );
    setContextMenuVisible(false);
  };

  const initializeGradingState = (submissionId: string, existingGrade?: Grade) => {
    if (!gradingStates[submissionId]) {
      setGradingStates(prev => ({
        ...prev,
        [submissionId]: {
          score: existingGrade ? existingGrade.score.toString() : '',
          bonusPoints: existingGrade?.bonusPoints ? existingGrade.bonusPoints.toString() : '',
          comments: existingGrade?.comments || '',
          isSubmitting: false,
        }
      }));
    }
  };

  const updateGradingField = (submissionId: string, field: 'score' | 'bonusPoints' | 'comments', value: string) => {
    setGradingStates(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      }
    }));
  };

  const handleGradeSubmission = async (submission: Submission) => {
    if (!selectedActivity) return;

    const state = gradingStates[submission._id];
    if (!state || !state.score.trim()) {
      Alert.alert('Error', 'Please enter a score');
      return;
    }

    const score = parseInt(state.score, 10);
    if (isNaN(score) || score < 0) {
      Alert.alert('Error', 'Score must be a positive number');
      return;
    }

    if (selectedActivity.points !== null && score > selectedActivity.points) {
      Alert.alert('Error', `Score cannot exceed ${selectedActivity.points} points`);
      return;
    }

    const bonusPoints = state.bonusPoints ? parseInt(state.bonusPoints, 10) : undefined;
    if (state.bonusPoints && (isNaN(bonusPoints!) || bonusPoints! < 0)) {
      Alert.alert('Error', 'Bonus points must be a positive number');
      return;
    }

    const existingGrade = selectedActivity.grades?.find(g => g.student._id === submission.student._id);

    try {
      setGradingStates(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], isSubmitting: true }
      }));

      let gradeResponse;
      if (existingGrade) {
        gradeResponse = await apiClient.put(`/grades/${existingGrade._id}`, {
          score,
          bonusPoints,
          comments: state.comments || undefined,
        });
      } else {
        gradeResponse = await apiClient.post(`/activities/${selectedActivity._id}/grades`, {
          studentId: submission.student._id,
          score,
          bonusPoints,
          comments: state.comments || undefined,
        });
      }

      Alert.alert('Success', 'Grade submitted successfully!');

      // Fetch updated grades immediately
      const gradesData = await apiClient.get(`/activities/${selectedActivity._id}/grades`);
      
      // Update selected activity with new grades IMMEDIATELY
      if (gradesData.data.success && gradesData.data.data) {
        const updatedGrades = gradesData.data.data;
        
        setSelectedActivity(prev => prev ? {
          ...prev,
          grades: updatedGrades
        } : null);

        // Also update the activities list
        setActivities(prevActivities => 
          prevActivities.map(act => 
            act._id === selectedActivity._id 
              ? { ...act, grades: updatedGrades }
              : act
          )
        );
      }

      // Reset grading state for this submission
      setGradingStates(prev => {
        const newState = { ...prev };
        delete newState[submission._id];
        return newState;
      });

      // Also refresh submissions
      const submissionsData = await apiClient.get(`/activities/${selectedActivity._id}/submissions`);
      if (submissionsData.data.data) {
        setActivitySubmissions(submissionsData.data.data);
      }

    } catch (error: any) {
      console.error('Grade submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit grade';
      Alert.alert('Error', errorMessage);
    } finally {
      setGradingStates(prev => ({
        ...prev,
        [submission._id]: prev[submission._id] ? { ...prev[submission._id], isSubmitting: false } : {
          score: '',
          bonusPoints: '',
          comments: '',
          isSubmitting: false
        }
      }));
    }
  };

  const handleDeleteGrade = async (gradeId: string, submissionId: string) => {
    Alert.alert(
      'Delete Grade',
      'Are you sure you want to delete this grade?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting grade:', gradeId);
              await apiClient.delete(`/grades/${gradeId}`);
              
              Alert.alert('Success', 'Grade deleted successfully!');

              // Reset grading state
              setGradingStates(prev => {
                const newState = { ...prev };
                delete newState[submissionId];
                return newState;
              });

              // Fetch updated grades immediately
              if (selectedActivity) {
                const gradesData = await apiClient.get(`/activities/${selectedActivity._id}/grades`);
                
                if (gradesData.data.success && gradesData.data.data) {
                  const updatedGrades = gradesData.data.data;
                  
                  // Update selected activity
                  setSelectedActivity(prev => prev ? {
                    ...prev,
                    grades: updatedGrades
                  } : null);

                  // Update activities list
                  setActivities(prevActivities => 
                    prevActivities.map(act => 
                      act._id === selectedActivity._id 
                        ? { ...act, grades: updatedGrades }
                        : act
                    )
                  );
                }

                // Refresh submissions
                const submissionsData = await apiClient.get(`/activities/${selectedActivity._id}/submissions`);
                if (submissionsData.data.data) {
                  setActivitySubmissions(submissionsData.data.data);
                }
              }

            } catch (error: any) {
              console.error('Delete grade error:', error);
              console.error('Error response:', error.response?.data);
              const errorMessage = error.response?.data?.message || error.message || 'Failed to delete grade';
              Alert.alert('Error', `Failed to delete grade: ${errorMessage}`);
            }
          }
        }
      ]
    );
  };

  const getStudentGrade = (studentId: string): Grade | undefined => {
    return selectedActivity?.grades?.find(g => g.student._id === studentId);
  };

  const openContextMenu = (activity: Activity) => {
    setContextMenuActivity(activity);
    setContextMenuVisible(true);
  };

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
        }}
        onPress={() => handleViewActivity(item)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
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

          <TouchableOpacity
            onPress={() => openContextMenu(item)}
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
            style={{
              backgroundColor: '#EF4444',
              padding: 8,
              borderRadius: 8,
            }}
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
          <View style={{ marginBottom: 12 }}>
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

          {/* Horizontal Dropdowns */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                Subject
              </Text>
              <DropdownMobile
                label="Subject"
                selectedValue={subjectFilter}
                onValueChange={setSubjectFilter}
                items={subjectFilterOptions}
                placeholder="All"
                buttonRightIcon={DownIcon}
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
              <DropdownMobile
                label="Status"
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
                items={statusFilterOptions}
                placeholder="All"
                buttonRightIcon={DownIcon}
              />
            </View>
          </View>

          <View>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280',
              marginBottom: 4 
            }}>
              Quarter
            </Text>
            <DropdownMobile
              label="Quarter"
              selectedValue={quarterFilter}
              onValueChange={setQuarterFilter}
              items={quarterFilterOptions}
              placeholder="All Quarters"
              buttonRightIcon={DownIcon}
            />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        {filteredActivities.length > 0 ? (
          <FlashList
            data={filteredActivities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item._id}
            estimatedItemSize={150}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
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

      {/* Context Menu Modal - LARGER SIZE */}
      <Modal
        visible={contextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setContextMenuVisible(false)}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              borderRadius: 16,
              padding: 12,
              width: '85%',
              maxWidth: 360,
            }}
          >
            <TouchableOpacity
              onPress={() => contextMenuActivity && handleViewActivity(contextMenuActivity)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderRadius: 8,
              }}
            >
              <Image
                source={require('@/assets/icons/show_password.png')}
                style={{ width: 24, height: 24, marginRight: 16 }}
                tintColor={isDarkMode ? '#E0E0E0' : '#333'}
              />
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 15, color: isDarkMode ? '#E0E0E0' : '#111827' }}>
                View Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => contextMenuActivity && handleViewSubmissions(contextMenuActivity)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderRadius: 8,
              }}
            >
              <Image
                source={require('@/assets/icons/import_file.png')}
                style={{ width: 24, height: 24, marginRight: 16 }}
                tintColor={isDarkMode ? '#E0E0E0' : '#333'}
              />
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 15, color: isDarkMode ? '#E0E0E0' : '#111827' }}>
                View Submissions
              </Text>
            </TouchableOpacity>

            {contextMenuActivity && canModifyActivity(contextMenuActivity) && (
              <TouchableOpacity
                onPress={() => contextMenuActivity && handleDeleteActivity(contextMenuActivity._id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 8,
                }}
              >
                <DeleteIcon width={24} height={24} style={{ marginRight: 16 }} fill="#EF4444" />
                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 15, color: '#EF4444' }}>
                  Delete Activity
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* View Activity Detail Modal */}
      <Modal
        visible={viewDetailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewDetailModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#E5E7EB' }}>
            <TouchableOpacity onPress={() => setViewDetailModalVisible(false)} style={{ marginRight: 16 }}>
              <Image source={require('@/assets/icons/back.png')} style={{ width: 24, height: 24 }} tintColor={isDarkMode ? '#E0E0E0' : '#333'} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', flex: 1 }}>
              Activity Details
            </Text>
          </View>

          {selectedActivity && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 8 }}>
                  {selectedActivity.title}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: getActivityStatus(selectedActivity).color, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>
                      {getActivityStatus(selectedActivity).text}
                    </Text>
                  </View>
                  {selectedActivity.points !== null && (
                    <View style={{ backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                      <Text style={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>
                        {selectedActivity.points} pts
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  {selectedActivity.subject.subjectName} • {selectedActivity.subject.section} • {selectedActivity.quarter}
                </Text>
              </View>

              {selectedActivity.description && (
                <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 8 }}>
                    Description
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', lineHeight: 20 }}>
                    {selectedActivity.description}
                  </Text>
                </View>
              )}

              <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 12 }}>
                  Timeline
                </Text>
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#374151', marginBottom: 4 }}>
                    Start Date:
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    {formatDate(selectedActivity.visibleDate)}
                  </Text>
                </View>
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#374151', marginBottom: 4 }}>
                    Deadline:
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    {formatDate(selectedActivity.deadline)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#374151', marginBottom: 4 }}>
                    Late Work:
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Regular', color: selectedActivity.allowLateSubmissions ? '#10B981' : '#EF4444' }}>
                    {selectedActivity.allowLateSubmissions ? 'Accepted' : 'Not Accepted'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setViewDetailModalVisible(false);
                  handleViewSubmissions(selectedActivity);
                }}
                style={{ backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 12, marginBottom: 12 }}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'white', textAlign: 'center' }}>
                  View All Submissions{selectedActivity.grades && selectedActivity.grades.length > 0 && ` (${selectedActivity.grades.length} Graded)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewDetailModalVisible(false)}
                style={{ backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'white', textAlign: 'center' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* View Submissions Modal */}
      <Modal
        visible={viewSubmissionsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setViewSubmissionsModalVisible(false);
          setExpandedSubmission(null);
          setGradingStates({});
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#E5E7EB' }}>
            <TouchableOpacity onPress={() => {
              setViewSubmissionsModalVisible(false);
              setExpandedSubmission(null);
              setGradingStates({});
            }} style={{ marginRight: 16 }}>
              <Image source={require('@/assets/icons/back.png')} style={{ width: 24, height: 24 }} tintColor={isDarkMode ? '#E0E0E0' : '#333'} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827' }}>
                Submissions for "{selectedActivity?.title}"
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                {selectedActivity?.subject.subjectName} • {selectedActivity?.quarter}
              </Text>
            </View>
          </View>

          {submissionsLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ marginTop: 16, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                Loading submissions...
              </Text>
            </View>
          ) : activitySubmissions.length > 0 ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {activitySubmissions.map((submission) => {
                const existingGrade = getStudentGrade(submission.student._id);
                const isExpanded = expandedSubmission === submission._id;
                
                if (isExpanded && !gradingStates[submission._id]) {
                  initializeGradingState(submission._id, existingGrade);
                }

                const state = gradingStates[submission._id];
                const totalScore = state ? 
                  parseInt(state.score || '0', 10) + parseInt(state.bonusPoints || '0', 10) : 
                  existingGrade ? existingGrade.score + (existingGrade.bonusPoints || 0) : 0;

                return (
                  <View
                    key={submission._id}
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                      borderRadius: 12,
                      marginBottom: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: existingGrade ? '#8B5CF6' : '#3B82F6',
                      overflow: 'hidden',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setExpandedSubmission(isExpanded ? null : submission._id)}
                      style={{ padding: 16 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Image
                            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                            source={
                              submission.student.profilePicture
                                ? { uri: submission.student.profilePicture }
                                : require('@/assets/images/sample_profile_picture.png')
                            }
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#111827' }}>
                              {getUserFullName(submission.student)}
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                              {formatDate(submission.submissionDate)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          {existingGrade ? (
                            <View>
                              <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#8B5CF6', textAlign: 'right' }}>
                                {totalScore}{selectedActivity?.points && ` / ${selectedActivity.points}`}
                              </Text>
                              <View style={{ backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4 }}>
                                <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter-SemiBold' }}>GRADED</Text>
                              </View>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ color: 'white', fontSize: 11, fontFamily: 'Inter-SemiBold' }}>SUBMITTED</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ padding: 16, paddingTop: 0 }}>
                        <View style={{ backgroundColor: isDarkMode ? '#121212' : '#F9FAFB', borderRadius: 8, padding: 16, marginTop: 12 }}>
                          <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 16 }}>
                            {existingGrade ? 'Update Grade' : 'Grade Submission'}
                          </Text>

                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 6 }}>
                              Score <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <TextInput
                                value={state?.score || ''}
                                onChangeText={(text) => updateGradingField(submission._id, 'score', text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                style={{
                                  width: 100,
                                  height: 44,
                                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                  borderRadius: 8,
                                  paddingHorizontal: 12,
                                  fontSize: 15,
                                  fontFamily: 'Inter-Regular',
                                  color: isDarkMode ? '#F9FAFB' : '#111827',
                                  marginRight: 12,
                                }}
                              />
                              <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                                / {selectedActivity?.points || '∞'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 6 }}>
                              Bonus Points (Optional)
                            </Text>
                            <TextInput
                              value={state?.bonusPoints || ''}
                              onChangeText={(text) => updateGradingField(submission._id, 'bonusPoints', text.replace(/[^0-9]/g, ''))}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                              style={{
                                width: 100,
                                height: 44,
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                fontSize: 15,
                                fontFamily: 'Inter-Regular',
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                              }}
                            />
                          </View>

                          {state && (state.score || state.bonusPoints) && (
                            <View style={{ backgroundColor: '#8B5CF6', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: 'white' }}>
                                Total Score: {totalScore}
                                {selectedActivity?.points && ` / ${selectedActivity.points}`}
                                {state.bonusPoints && parseInt(state.bonusPoints) > 0 && ` (${state.score || 0} + ${state.bonusPoints} bonus)`}
                              </Text>
                            </View>
                          )}

                          <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#E0E0E0' : '#111827', marginBottom: 6 }}>
                              Comments (Optional)
                            </Text>
                            <TextInput
                              value={state?.comments || ''}
                              onChangeText={(text) => updateGradingField(submission._id, 'comments', text)}
                              multiline
                              numberOfLines={3}
                              placeholder="Enter feedback..."
                              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                              style={{
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                fontSize: 14,
                                fontFamily: 'Inter-Regular',
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                                minHeight: 80,
                                textAlignVertical: 'top',
                              }}
                            />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            {existingGrade && (
                              <TouchableOpacity
                                onPress={() => handleDeleteGrade(existingGrade._id, submission._id)}
                                disabled={state?.isSubmitting}
                                style={{ backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, opacity: state?.isSubmitting ? 0.5 : 1 }}
                              >
                                <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'white' }}>
                                  Delete Grade
                                </Text>
                              </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity
                              onPress={() => handleGradeSubmission(submission)}
                              disabled={state?.isSubmitting || !state?.score}
                              style={{
                                backgroundColor: !state?.score || state?.isSubmitting ? '#9CA3AF' : '#10B981',
                                borderRadius: 8,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginLeft: 'auto',
                              }}
                            >
                              {state?.isSubmitting && (
                                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                              )}
                              <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'white' }}>
                                {state?.isSubmitting ? 'Saving...' : existingGrade ? 'Update Grade' : 'Submit Grade'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Image style={{ width: 80, height: 80, marginBottom: 16, opacity: 0.5 }} source={require('@/assets/images/no_results.png')} />
              <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: isDarkMode ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
                No submissions yet
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
};

export default ActivityAndroid;