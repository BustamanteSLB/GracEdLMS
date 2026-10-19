// activity.web.tsx
import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert, Platform, FlatList, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
import NetworkBanner from '@/components/NetworkBanner.web'

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

// Grading state interface
interface GradingState {
  [submissionId: string]: {
    score: string;
    comments: string;
    isSubmitting: boolean;
  };
}

// Pagination constant
const ITEMS_PER_PAGE = 10;

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
  const [termFilter, setTermFilter] = useState<string>('');

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);

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

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

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

    // Term filter
    if (termFilter) {
      filtered = filtered.filter(activity => activity.term === termFilter);
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
  }, [activities, searchQuery, subjectFilter, statusFilter, termFilter]);

  // Paginated activities for display
  const displayedActivities = useMemo(() => {
    return filteredActivities.slice(0, displayedCount);
  }, [filteredActivities, displayedCount]);

  const hasMore = displayedCount < filteredActivities.length;

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch (e) {
      // ignore
    }
  }, [searchQuery, subjectFilter, statusFilter, termFilter]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredActivities.length));
      setIsLoadingMore(false);
    }, 350);
  }, [isLoadingMore, hasMore, filteredActivities.length]);

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

  const termFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Terms', value: '' },
    { label: '1st Term', value: '1' },
    { label: '2nd Term', value: '2' },
    { label: '3rd Term', value: '3' },
  ], []);

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
        setForceNetworkBannerVisible(false);
        return;
      }

      const allActivities: Activity[] = [];
      
      for (const subject of teacherSubjects) {
        try {
          const activitiesResponse = await apiClient.get<ActivityResponse>(`/subjects/${subject._id}/activities`);
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            const teacherActivities = await Promise.all(
              activitiesResponse.data.data
                .filter((activity) => {
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

                  const activityWithTerm: Activity = {
                    ...activity,
                    subject: subject,
                    grades: grades,
                    term: activity.term || '1',
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

                  return activityWithTerm;
                })
            );
            allActivities.push(...teacherActivities);
          }
        } catch (subjectError: any) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}:`, subjectError);
        }
      }

      setActivities(allActivities);
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (err: any) {
      console.error('Error fetching teacher activities:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch activities');

      const isNetworkError =
        !err.response ||
        err.code === 'ECONNABORTED' ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('timeout');
      if (isNetworkError) {
        setForceNetworkBannerVisible(true);
      }
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
    const activityWithTerm = selectedActivity ? {
      ...selectedActivity,
      term: ["1", "2", "3"].includes(String(selectedActivity.term))
        ? String(selectedActivity.term)
        : "1",
    } : null;

    setSelectedGrade(grade);
    setSelectedSubmissionForUpdate(submission);
    setSelectedActivity(activityWithTerm);
    setUpdateGradeModalVisible(true);
  };

  const handleGradeUpdated = async () => {
    if (!selectedActivity) return;
    
    try {
      await fetchTeacherActivities();
      
      const res = await apiClient.get(`/activities/${selectedActivity._id}/submissions`);
      setActivitySubmissions(res.data.data || []);
      
      const activityRes = await apiClient.get(`/activities/${selectedActivity._id}`);
      if (activityRes.data.success && activityRes.data.data) {
        let grades: Grade[] = [];
        try {
          const gradesResponse = await apiClient.get(`/activities/${selectedActivity._id}/grades`);
          if (gradesResponse.data.success && gradesResponse.data.data) {
            grades = gradesResponse.data.data;
          }
        } catch (gradeError) {
          console.warn('Failed to fetch grades:', gradeError);
        }
        
        setSelectedActivity({
          ...activityRes.data.data,
          subject: selectedActivity.subject,
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
          marginTop: 16,
          marginHorizontal: 16,
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
                {item.subject?.subjectName || 'No Subject'} • {item.term === '1' ? '1st Term' : item.term === '2' ? '2nd Term' : '3rd Term'}
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
            onPress={(e) => openContextMenu(e, item)}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, getActivityStatus, formatDate, openContextMenu, handleViewActivity, getConsistentColor]);

  // ---- List header (scrolls with content) ----
  const listHeader = (
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
              Term
            </Text>
            <Dropdown
              data={termFilterOptions}
              selectedValue={termFilter}
              onValueChange={setTermFilter}
              placeholder="All Terms"
            />
          </View>
        </View>
      </View>
    </View>
  );

  // ---- Empty state ----
  const listEmpty = (
    <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 }}>
      <Image
        source={require('@/assets/images/activity.png')}
        style={{ width: 64, height: 64, marginBottom: 16 }}
      />
      <Text style={{ 
        fontSize: 18, 
        fontFamily: 'Inter-SemiBold',
        color: isDarkMode ? '#9CA3AF' : '#6B7280', 
        marginBottom: 8,
        textAlign: 'center',
      }}>
        No activities found
      </Text>
      <Text style={{ 
        fontSize: 14, 
        fontFamily: 'Inter-Regular',
        color: isDarkMode ? '#6B7280' : '#9CA3AF', 
        textAlign: 'center' 
      }}>
        {searchQuery || subjectFilter || statusFilter || termFilter
          ? 'Try adjusting your filters'
          : 'No activities available in your assigned subjects'}
      </Text>
    </View>
  );

  // ---- Footer ----
  const listFooter = (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      {isLoadingMore ? (
        <>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={{
            marginTop: 8,
            fontSize: 12,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}>
            Loading more activities...
          </Text>
        </>
      ) : !hasMore && filteredActivities.length > ITEMS_PER_PAGE ? (
        <Text style={{
          fontSize: 12,
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#6B7280' : '#9CA3AF',
        }}>
          All {filteredActivities.length} activities loaded
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchTeacherActivities}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
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
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchTeacherActivities}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
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
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchTeacherActivities}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Entire screen is now scrollable via FlatList */}
      <FlatList
        ref={listRef}
        data={displayedActivities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      />

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