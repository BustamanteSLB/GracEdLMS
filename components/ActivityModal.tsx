import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttachIcon from '@/assets/icons/attach.svg';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import AddEditActivityModal from './AddEditActivityModal';
import { FlashList } from '@shopify/flash-list';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import ContextMenu from './ContextMenu';

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
  createdAt: string;
  updatedAt: string;
}

interface Subject {
  _id: string;
  subjectName: string;
  subjectImage?: string;
  section: string;
  gradeLevel: string;
  schoolYear: string;
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
  allowLateSubmissions: boolean;
  status: 'active' | 'inactive' | 'upcoming' | 'overdue' | 'graded';
  submissions?: Submission[];
  grades?: Grade[];
  myGrade?: Grade;
  createdAt: string;
  updatedAt: string;
}

interface ActivityModalProps {
  subjectId: string;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
  isAuthenticated?: boolean;
}

// Memoized status badge component
const StatusBadge = memo(({ 
  status, 
  color, 
  text 
}: { 
  status: string; 
  color: string; 
  text: string; 
}) => (
  <View
    className="px-3 py-1.5 rounded-full mr-2 mb-1"
    style={{ backgroundColor: color }}
  >
    <Text className="font-inter_semibold text-xs text-white">
      {text}
    </Text>
  </View>
));

StatusBadge.displayName = 'StatusBadge';

// Memoized grade display component
const GradeDisplay = memo(({ 
  score, 
  points, 
  isDarkMode 
}: { 
  score: number; 
  points: number | null; 
  isDarkMode?: boolean; 
}) => (
  <View className={`flex-row items-center mb-1 p-2 rounded-lg ${isDarkMode ? 'bg-[#2D1B69]' : 'bg-[#EDE9FE]'}`}>
    <Image
      className="w-4 h-4 mr-2"
      contentFit="contain"
      source={require('@/assets/icons/star.png')}
      tintColor={isDarkMode ? '#A78BFA' : '#8B5CF6'}
    />
    <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
      Your Grade: {score}
      {points && ` / ${points}`}
    </Text>
  </View>
));

GradeDisplay.displayName = 'GradeDisplay';

// Memoized subject icon component
const SubjectIcon = memo(({ 
  imageUrl, 
  initials, 
  bgColor 
}: { 
  imageUrl?: string; 
  initials: string; 
  bgColor: string; 
}) => (
  imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      className="w-12 h-12 rounded-lg"
      contentFit="cover"
    />
  ) : (
    <View
      className="w-12 h-12 rounded-lg justify-center items-center"
      style={{ backgroundColor: bgColor }}
    >
      <Text className="text-white font-inter_bold text-lg">{initials}</Text>
    </View>
  )
));

SubjectIcon.displayName = 'SubjectIcon';

const ActivityModal: React.FC<ActivityModalProps> = ({
  subjectId,
  isDarkMode,
  isAdminOrTeacher,
  isAuthenticated,
}) => {
  const { user } = useAuth();
  const isWeb = useMemo(() => Platform.OS === 'web', []);
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissionFiles, setSubmissionFiles] = useState<
    (DocumentPicker.DocumentPickerAsset | File)[]
  >([]);

  // Add/Edit modal states
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // View modal states
  const [viewActModalVisible, setViewActModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoingSubmission, setIsUndoingSubmission] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // File error handling
  const [fileLoadError, setFileLoadError] = useState<{[key: string]: boolean}>({});

  // Context menu for web
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [selectedContextMenuActivity, setSelectedContextMenuActivity] = useState<Activity | null>(null);

  // Actions modal for mobile
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalActivity, setActionsModalActivity] = useState<Activity | null>(null);

  const isTeacher = useMemo(() => user?.role === 'Teacher', [user?.role]);

  // Memoized helper functions
  const getFileUrl = useCallback((fileUrl: string) => {
    if (fileUrl.startsWith('https://storage.googleapis.com/') || 
        fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return fileUrl;
    }
    
    if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      console.warn('Legacy file path detected:', fileUrl);
      return null;
    }
    
    return fileUrl;
  }, []);

  const handleFileError = useCallback((fileUrl: string) => {
    console.warn('Failed to load file:', fileUrl);
    setFileLoadError(prev => ({ ...prev, [fileUrl]: true }));
  }, []);

  // Optimized fetch activities with minimal re-fetches
  const fetchActivities = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const res = await apiClient.get(`/subjects/${subjectId}/activities`);
      let activitiesData = res.data.data || [];
      
      // For teachers, filter to only show activities they created
      if (user?.role === 'Teacher' && user) {
        activitiesData = activitiesData.filter((activity: Activity) => 
          activity.createdBy._id === user._id || 
          activity.createdBy.email === user.email ||
          activity.createdBy.username === user.username
        );
      }
      
      // Batch subject fetch instead of individual calls
      const subjectPromise = apiClient.get(`/subjects/${subjectId}`);
      
      const activitiesWithDetails = await Promise.all(
        activitiesData.map(async (activity: Activity) => {
          try {
            const subjectRes = await subjectPromise;
            const subjectData = subjectRes.data.data;
            
            let myGrade = undefined;
            if (user?.role === 'Student') {
              try {
                const gradeRes = await apiClient.get(`/activities/${activity._id}/student-grade`);
                if (gradeRes.data.success && gradeRes.data.data) {
                  myGrade = gradeRes.data.data;
                }
              } catch (error) {
                // Silently fail - grade might not exist yet
              }
            }

            let allGrades: Grade[] = [];
            if (user?.role === 'Teacher' || user?.role === 'Admin') {
              try {
                const gradesRes = await apiClient.get(`/activities/${activity._id}/grades`);
                if (gradesRes.data.success && gradesRes.data.data) {
                  allGrades = gradesRes.data.data;
                }
              } catch (error) {
                // Silently fail - grades might not exist yet
              }
            }

            return {
              ...activity,
              subject: subjectData,
              myGrade,
              grades: allGrades
            };
          } catch (error) {
            console.warn('Failed to fetch activity details:', error);
            return activity;
          }
        })
      );
      
      setActivities(activitiesWithDetails);
    } catch (err) {
      console.error('Error fetching activities:', err);
      Alert.alert('Error', 'Failed to load activities.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [subjectId, user?.role, user?._id, user?.email, user?.username]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Memoized filtered activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (user?.role === 'Student') {
      const now = new Date();
      filtered = filtered.filter(activity => {
        const visibleDate = new Date(activity.visibleDate);
        return visibleDate <= now;
      });
    }

    return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activities, user?.role]);

  // Memoized helper functions
  const getActivityStatus = useCallback((activity: Activity) => {
    const now = new Date();
    const deadline = new Date(activity.deadline);
    const visible = new Date(activity.visibleDate);

    if (user?.role === 'Student') {
      const isGraded = activity.myGrade !== undefined && activity.myGrade !== null;
      const mySubmission = activity.submissions?.find(
        (sub) => sub.student._id === user?._id
      );
      const submissionGraded = mySubmission && mySubmission.grade !== undefined && mySubmission.grade !== null;
      
      if (isGraded || submissionGraded) {
        return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
      }
    }

    if (user?.role === 'Teacher' || user?.role === 'Admin') {
      const hasAnyGrades = activity.grades && activity.grades.length > 0;
      if (hasAnyGrades) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
    }

    if (visible > now) return { status: 'upcoming', color: '#3B82F6', text: 'Upcoming' };
    if (deadline < now) return { status: 'overdue', color: '#EF4444', text: 'Overdue' };
    return { status: 'active', color: '#10B981', text: 'Active' };
  }, [user?.role, user?._id]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const getUserFullName = useCallback((user: User) => {
    return user.middleName 
      ? `${user.firstName} ${user.middleName} ${user.lastName}`
      : `${user.firstName} ${user.lastName}`;
  }, []);

  const getTimeRemaining = useCallback((deadline: string) => {
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
  }, []);

  const getMySubmission = useCallback((activity: Activity) => {
    return activity.submissions?.find(sub => sub.student._id === user?._id);
  }, [user?._id]);

  const isDeadlinePassed = useCallback((activity: Activity) => {
    return new Date() > new Date(activity.deadline);
  }, []);

  // Memoized color generator
  const getConsistentColor = useCallback((str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Handle add activity
  const handleAddActivity = useCallback(() => {
    setEditActivity(null);
    setIsEditing(false);
    setAddEditModalVisible(true);
  }, []);

  // Handle edit activity
  const handleEditActivity = useCallback((activity: Activity) => {
    setEditActivity(activity);
    setIsEditing(true);
    setAddEditModalVisible(true);
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  }, [isWeb]);

  // Handle delete activity
  const handleDeleteActivity = useCallback(async (activity: Activity) => {
    if (!user || user.role !== 'Teacher') {
      Alert.alert('Error', 'Only teachers can delete activities.');
      return;
    }

    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${activity.title}"?`)) {
        try {
          await apiClient.delete(`/activities/${activity._id}`);
          fetchActivities();
          window.alert('Activity deleted successfully.');
        } catch (err) {
          console.error('Delete Activity error:', err);
          window.alert('Failed to delete activity.');
        }
      }
        } else {
      Alert.alert(
        'Delete Activity',
        `Are you sure you want to delete "${activity.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await apiClient.delete(`/activities/${activity._id}`);
            fetchActivities();
            Alert.alert('Success', 'Activity deleted successfully.');
          } catch (err) {
            console.error('Delete Activity error:', err);
            Alert.alert('Error', 'Failed to delete activity.');
          }
        }
          },
        ]
      );
        }
  }, [user, isWeb, fetchActivities]);

  // Open view activity modal
  const openViewActivityModal = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
    setSubmissionFiles([]);
    setViewActModalVisible(true);
    setFileLoadError({});
  }, []);

  // File picker for submissions
  const pickDocuments = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp';
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
          'image/webp',
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
      Alert.alert('Error', 'Failed to pick documents.');
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSubmissionFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  const renderAttachmentLink = useCallback((attachmentPath: string, fileName?: string) => {
    const fileUrl = getFileUrl(attachmentPath);
    
    if (!fileUrl || fileLoadError[fileUrl]) {
      return (
        <View className="flex-row items-center mt-2">
          <AttachIcon 
            width={16} 
            height={16} 
            style={{ marginRight: 4 }} 
            fill={isDarkMode ? '#6B7280' : '#9CA3AF'} 
          />
          <Text className={`text-xs font-inter_regular ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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
            } else {
              Linking.openURL(fileUrl);
            }
          } catch (error) {
            console.error('Failed to open file:', error);
            handleFileError(fileUrl);
          }
        }}
        className="flex-row items-center mt-2"
      >
        <AttachIcon 
          width={16} 
          height={16} 
          style={{ marginRight: 4 }} 
          fill="#3B82F6"
        />
        <Text className="text-xs font-inter_regular text-blue-500 underline">
          {fileName || fileUrl.split('/').pop() || 'Download attachment'}
        </Text>
      </TouchableOpacity>
    );
  }, [isDarkMode, getFileUrl, fileLoadError, handleFileError]);

  const handleTurnInActivity = useCallback(async () => {
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

      await apiClient.post(
        `/activities/${selectedActivity._id}/turn-in`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        }
      );

      fetchActivities();
      setViewActModalVisible(false);
      setSubmissionFiles([]);
      Alert.alert('Success', 'Activity turned in successfully!');
    } catch (error: any) {
      console.error('Turn In Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to turn in activity.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedActivity, user, submissionFiles, fetchActivities]);

  const handleUndoTurnInActivity = useCallback(async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsUndoingSubmission(true);
      await apiClient.post(`/activities/${selectedActivity._id}/undo-turn-in`);
      fetchActivities();
      setViewActModalVisible(false);
      setSubmissionFiles([]);
      Alert.alert('Success', 'Activity turn-in undone successfully!');
    } catch (error: any) {
      console.error('Undo Turn In Activity error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to undo turn-in.';
      Alert.alert('Error', msg);
    } finally {
      setIsUndoingSubmission(false);
    }
  }, [selectedActivity, user, fetchActivities]);

  const canModifyActivity = useCallback((activity: Activity) => {
    return user ? activity.createdBy._id === user._id : false;
  }, [user]);

  const handleRefresh = useCallback(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  // Context menu / Actions modal handlers
  const openContextMenu = useCallback((e: any, activity: Activity) => {
    if (isWeb) {
      setSelectedContextMenuActivity(activity);
      const { pageX, pageY } = e.nativeEvent;
      setContextMenuCoords({ x: pageX, y: pageY });
      setContextMenuVisible(true);
    } else {
      setActionsModalActivity(activity);
      setActionsModalVisible(true);
    }
  }, [isWeb]);

  // Context menu items
  const contextMenuItems = useMemo(() => [
    {
      label: 'Edit Activity',
      icon: (
        <Image
          style={{ width: 24, height: 24, marginRight: 4 }}
          source={require('@/assets/icons/edit.png')}
          tintColor={isDarkMode ? '#E0E0E0' : 'black'}
        />
      ),
      onPress: () => {
        if (selectedContextMenuActivity) {
          handleEditActivity(selectedContextMenuActivity);
        }
      },
    },
    {
      label: 'Delete Activity',
      icon: (
        <DeleteIcon
          width={24}
          height={24}
          style={{ marginRight: 4 }}
          fill="#EF4444"
        />
      ),
      onPress: () => {
        if (selectedContextMenuActivity) {
          handleDeleteActivity(selectedContextMenuActivity);
        }
      },
    },
  ], [selectedContextMenuActivity, isDarkMode, handleEditActivity, handleDeleteActivity]);

  // Optimized render activity item
  const renderActivityItem = useCallback(({ item: activity }: { item: Activity }) => {
    const statusInfo = getActivityStatus(activity);
    const canModify = canModifyActivity(activity);
    const mySubmission = getMySubmission(activity);
    const isSubmitted = mySubmission && mySubmission.status === 'submitted';
    const deadlinePassed = isDeadlinePassed(activity);
    const initials = activity.subject.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(activity.subject.subjectName);
    const creatorName = getUserFullName(activity.createdBy);

    return (
      <TouchableOpacity
        onPress={() => openViewActivityModal(activity)}
        className={`rounded-xl p-4 mb-3 ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}
        style={{
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
        activeOpacity={0.8}
      >
        {/* Header with Subject Icon and Actions */}
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-row items-start flex-1">
            {/* Subject Icon */}
            <SubjectIcon
              imageUrl={activity.subject.subjectImage}
              initials={initials}
              bgColor={bgColor}
            />

            {/* Activity Info */}
            <View className="flex-1 ml-3">
              <View className='flex-row'>
                <Text
                  className={`font-inter_bold text-lg mr-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  ellipsizeMode='tail'
                  numberOfLines={2}
                >
                  {activity.title}
                </Text>
              </View>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-gray-700'}`}>
                {activity.subject.gradeLevel} • {activity.quarter}
              </Text>
              <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#6B7280]' : 'text-gray-500'}`}>
                By {creatorName}
              </Text>
              {/* Status Badges */}
              <View className="flex-row items-center justif flex-wrap">
                <StatusBadge
                  status={statusInfo.status}
                  color={statusInfo.color}
                  text={statusInfo.text}
                />
                                {deadlinePassed && activity.allowLateSubmissions && user?.role === 'Student' && !activity.myGrade && (
                  <StatusBadge status="late_ok" color="#F59E0B" text="LATE OK" />
                )}

                {user?.role === 'Student' && isSubmitted && statusInfo.status !== 'graded' && (
                  <StatusBadge status="submitted" color="#10B981" text="SUBMITTED" />
                )}

                {(user?.role === 'Teacher' || user?.role === 'Admin') && statusInfo.status === 'graded' && (
                  <StatusBadge 
                    status="graded_count" 
                    color="#F59E0B" 
                    text={`${activity.grades?.length || 0} GRADED`} 
                  />
                )}
                {activity.points !== null && (
                  <>
                    <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      {activity.points} point{activity.points !== 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* More Icon (Teachers Only) */}
          {isTeacher && canModify && (
            <Pressable
              onPress={(e) => openContextMenu(e, activity)}
              style={{ padding: 8 }}
            >
              <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
            </Pressable>
          )}
        </View>

        {/* Description */}
        {activity.description && (
          <Text
            className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {activity.description}
          </Text>
        )}

        {/* Grade Info (if graded) */}
        {(activity.myGrade || (mySubmission && mySubmission.grade !== undefined && mySubmission.grade !== null)) && (
          <GradeDisplay
            score={activity.myGrade?.score || mySubmission?.grade || 0}
            points={activity.points}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Deadline and Points */}
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Due: {formatDate(activity.deadline)}
            </Text>
            {!activity.myGrade && (
              <Text className={`font-inter_regular text-xs ${statusInfo.status === 'overdue' ? 'text-red-500' : 'text-orange-500'}`}>
                {getTimeRemaining(activity.deadline)}
              </Text>
            )}
          </View>
        </View>

        {/* Attachment */}
        {activity.attachmentPath && (
          <View className="flex-row items-center mt-1">
            <AttachIcon 
              width={16} 
              height={16} 
              style={{ marginRight: 4 }} 
              fill={isDarkMode ? '#A78BFA' : '#6D28D9'} 
            />
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              {getFileUrl(activity.attachmentPath) ? 'Attachment available' : 'Attachment unavailable'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [
    isDarkMode,
    user,
    isTeacher,
    getActivityStatus,
    canModifyActivity,
    getMySubmission,
    isDeadlinePassed,
    getConsistentColor,
    getUserFullName,
    openViewActivityModal,
    openContextMenu,
    formatDate,
    getTimeRemaining,
    getFileUrl,
  ]);

  const keyExtractor = useCallback((item: Activity) => item._id, []);

  // Memoized empty states
  const EmptyListComponent = useMemo(() => {
    return (
      <View className="flex-1 justify-center items-center">
        <Image
          className="w-30 h-30 opacity-50"
          contentFit="contain"
          source={require('@/assets/images/online-course.png')}
        />
        {user?.role === 'Student' ? (
          <>
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No activities are currently available.
            </Text>
            <Text className={`font-inter_regular text-center text-sm mt-2 px-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Activities will appear here when they become visible.
            </Text>
          </>
        ) : (
          <>
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No activities available.
            </Text>
            {isTeacher && (
              <TouchableOpacity
                onPress={handleAddActivity}
                className="bg-[#A78BFA] rounded-lg p-3 mt-4"
              >
                <Text className="text-white font-inter_semibold">
                  Create Your First Activity
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }, [user?.role, isDarkMode, isTeacher, handleAddActivity]);

  return (
    <View style={{ flex: 1 }}>
      <View className="p-2 flex-1">
        {/* Header + "Add Activity" Button (Teachers Only) */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`font-pbold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Activities ({filteredActivities.length})
          </Text>

          <View className="flex-row items-center">
            {isTeacher && isAuthenticated && (
              <TouchableOpacity
                className="bg-[#A78BFA] rounded-lg p-2 mr-1"
                onPress={handleAddActivity}
              >
                <Image
                  className="w-6 h-6"
                  contentFit="contain"
                  source={require('@/assets/icons/plus.png')}
                  cachePolicy="memory-disk"
                  tintColor="white"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-red-600' : 'bg-red-500'} rounded-lg p-2`}
              style={{ opacity: isRefreshing ? 0.6 : 1 }}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Image
                  className="w-6 h-6"
                  contentFit="contain"
                  source={require('@/assets/icons/refresh.png')}
                  tintColor="white"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-10">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading activities...
            </Text>
          </View>
        ) : (
          /* Activities List */
          activities.length > 0 ? (
            filteredActivities.length > 0 ? (
              <FlashList
                data={filteredActivities}
                renderItem={renderActivityItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                estimatedItemSize={200}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={5}
              />
            ) : EmptyListComponent
          ) : EmptyListComponent
        )}

        {/* Context Menu (Web Only) */}
        {isWeb && (
          <ContextMenu
            visible={contextMenuVisible}
            x={contextMenuCoords.x}
            y={contextMenuCoords.y}
            onClose={() => setContextMenuVisible(false)}
            items={contextMenuItems}
            menuStyle={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderRadius: 8,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5,
            }}
            itemStyle={{
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
            labelStyle={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#E4E6EA' : '#1C1E21',
            }}
          />
        )}

        {/* Actions Modal (Mobile Only) - keeping existing implementation */}
        {!isWeb && (
          <Modal
            visible={actionsModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setActionsModalVisible(false)}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setActionsModalVisible(false)}
              >
                <Pressable
                  style={{
                    backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    width: '80%',
                    maxWidth: 400,
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontFamily: 'Inter-Bold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      marginBottom: 16,
                    }}
                  >
                    Activity Actions
                  </Text>

                  {/* Edit Button */}
                  {actionsModalActivity && canModifyActivity(actionsModalActivity) && (
                    <TouchableOpacity
                      onPress={() => {
                        if (actionsModalActivity) {
                          handleEditActivity(actionsModalActivity);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                        marginBottom: 8,
                      }}
                    >
                      <Image
                        style={{ width: 24, height: 24, marginRight: 12 }}
                        source={require('@/assets/icons/edit.png')}
                        tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                      />
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: 'Inter-Regular',
                          color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                        }}
                      >
                        Edit Activity
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Delete Button */}
                  {actionsModalActivity && canModifyActivity(actionsModalActivity) && (
                    <TouchableOpacity
                      onPress={() => {
                        if (actionsModalActivity) {
                          handleDeleteActivity(actionsModalActivity);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                        marginBottom: 8,
                      }}
                    >
                      <DeleteIcon
                        width={24}
                        height={24}
                        fill="#EF4444"
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: 'Inter-Regular',
                          color: '#EF4444',
                        }}
                      >
                        Delete Activity
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={() => setActionsModalVisible(false)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: 'Inter-Semibold',
                        color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </SafeAreaView>
          </Modal>
        )}

        {/* Add/Edit Activity Modal */}
        <AddEditActivityModal
          visible={addEditModalVisible}
          onClose={() => setAddEditModalVisible(false)}
          onSuccess={fetchActivities}
          subjectId={subjectId}
          isDarkMode={isDarkMode}
          editActivity={editActivity}
          isEditing={isEditing}
        />

        {/* View Activity Modal - keeping existing implementation */}
        <Modal
          visible={viewActModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setViewActModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
              <View className={`${isDarkMode ? 'bg-[#23272F]' : 'bg-white'} rounded-xl p-6 w-full max-w-[600px] max-h-[90%]`}>
                {selectedActivity && (
                  <>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text className={`font-pbold text-xl mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        {selectedActivity.title}
                      </Text>

                      {/* Creator Information */}
                      <View className={`mb-4 p-3 rounded-lg flex-row items-center ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-[#F3F4F6]'}`}>
                        <Image
                          source={selectedActivity.createdBy.profilePicture
                            ? { uri: selectedActivity.createdBy.profilePicture }
                            : require('@/assets/images/sample_profile_picture.png')}
                          className="w-10 h-10 rounded-full mr-3"
                          contentFit="cover"
                        />
                        <View className="flex-1">
                          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Created by
                          </Text>
                          <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            {getUserFullName(selectedActivity.createdBy)}
                          </Text>
                        </View>
                      </View>

                      {/* Subject Information */}
                      {selectedActivity.subject && (
                        <View className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-[#F3F4F6]'}`}>
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Subject: {selectedActivity.subject.subjectName}
                          </Text>
                          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {selectedActivity.subject.gradeLevel} - {selectedActivity.subject.section} ({selectedActivity.subject.schoolYear})
                          </Text>
                        </View>
                      )}

                      {/* Grade Information */}
                      {selectedActivity.myGrade && (
                        <View className="mb-4">
                          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Your Grade:
                          </Text>
                          <View className={`p-3 rounded-lg ${isDarkMode ? 'bg-[#2D1B69]' : 'bg-[#EDE9FE]'}`}>
                            <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                              {selectedActivity.myGrade.score}
                              {selectedActivity.myGrade.bonusPoints && selectedActivity.myGrade.bonusPoints > 0 && ` + ${selectedActivity.myGrade.bonusPoints} bonus`}
                              {selectedActivity.points && ` / ${selectedActivity.points}`}
                            </Text>
                            {selectedActivity.myGrade.comments && (
                              <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                                Feedback: "{selectedActivity.myGrade.comments}"
                              </Text>
                            )}
                            <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                              Graded by: {getUserFullName(selectedActivity.myGrade.gradedBy)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Description */}
                      <View className="mb-4">
                        <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Description:
                        </Text>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {selectedActivity.description || 'No description provided.'}
                        </Text>
                      </View>

                      {/* Deadline */}
                      <View className="mb-4">
                        <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Deadline:
                        </Text>
                        <Text className={`font-inter_regular text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(selectedActivity.deadline)}
                        </Text>
                        {!selectedActivity.myGrade && (
                          <Text className={`font-inter_semibold text-sm ${getActivityStatus(selectedActivity).status === 'overdue' ? 'text-red-500' : 'text-orange-500'}`}>
                            {getTimeRemaining(selectedActivity.deadline)}
                          </Text>
                        )}
                        {selectedActivity.allowLateSubmissions && (
                          <View className={`flex-row items-center mt-2 p-2 rounded-md ${isDarkMode ? 'bg-[#2D1B69]' : 'bg-[#FEF3C7]'}`}>
                            <Image
                              className="w-4 h-4 mr-2"
                              contentFit="contain"
                              source={require('@/assets/icons/info.png')}
                              tintColor={isDarkMode ? '#FCD34D' : '#F59E0B'}
                            />
                            <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                              Late submissions are allowed for this activity
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Points */}
                      {selectedActivity.points !== null && (
                        <View className="mb-4">
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Points:
                          </Text>
                          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {selectedActivity.points}
                          </Text>
                        </View>
                      )}

                      {/* Attachment */}
                      {selectedActivity.attachmentPath && (
                        <View className="mb-4">
                          <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Attachment:
                          </Text>
                          {renderAttachmentLink(selectedActivity.attachmentPath)}
                        </View>
                      )}

                      {/* Status */}
                      <View className="mb-4">
                        <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          Status:
                        </Text>
                        <View
                          className="px-3 py-1.5 rounded-full self-start"
                          style={{ backgroundColor: getActivityStatus(selectedActivity).color }}
                        >
                          <Text className="text-white font-inter_semibold text-sm">
                            {getActivityStatus(selectedActivity).text}
                          </Text>
                        </View>
                      </View>

                      {/* Submission Section */}
                      {user?.role === 'Student' && !selectedActivity.myGrade && (
                        <View className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-[#F3F4F6]'}`} style={{ borderTopWidth: 2, borderTopColor: isDarkMode ? '#374151' : '#D1D5DB' }}>
                          <Text className={`font-inter_bold text-base mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Your Submission
                          </Text>

                          {(() => {
                            const mySubmission = getMySubmission(selectedActivity);
                            const isSubmitted = mySubmission && mySubmission.status === 'submitted';
                            const deadlinePassed = isDeadlinePassed(selectedActivity);
                            const canStillSubmit = !deadlinePassed || selectedActivity.allowLateSubmissions;

                            return isSubmitted && mySubmission ? (
                              // Show submitted work
                              <View>
                                <View className="flex-row items-center mb-2">
                                  <View className="px-2 py-1 rounded-xl mr-2 bg-[#10B981]">
                                    <Text className="text-white font-inter_semibold text-xs">
                                      SUBMITTED
                                    </Text>
                                  </View>
                                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    on {formatDate(mySubmission.submissionDate)}
                                  </Text>
                                </View>

                                {/* Show submitted files - Updated for Firebase URLs */}
                                {mySubmission.attachmentPaths && mySubmission.attachmentPaths.length > 0 && (
                                  <View className="mb-3">
                                    <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                                      Submitted Files:
                                    </Text>
                                    {mySubmission.attachmentPaths.map((path, idx) => (
                                      <View key={idx} style={{ marginBottom: 4 }}>
                                        {renderAttachmentLink(path)}
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Undo submission button (only if can still submit) */}
                                {canStillSubmit && (
                                  <TouchableOpacity
                                    onPress={handleUndoTurnInActivity}
                                    disabled={isUndoingSubmission}
                                    className="bg-[#EF4444] rounded-lg py-2.5 px-4"
                                    style={{ opacity: isUndoingSubmission ? 0.6 : 1 }}
                                  >
                                    {isUndoingSubmission ? (
                                      <ActivityIndicator size="small" color="white" />
                                    ) : (
                                      <Text className="text-white font-inter_semibold text-sm text-center">
                                        Undo Submission
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                )}
                              </View>
                            ) : (
                              // Show submission interface
                              <View>
                                {!canStillSubmit ? (
                                  <View>
                                    <View className="px-2 py-1 rounded-xl self-start mb-2 bg-[#EF4444]">
                                      <Text className="text-white font-inter_semibold text-xs">
                                        SUBMISSIONS CLOSED
                                      </Text>
                                    </View>
                                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                      The deadline has passed and late submissions are not allowed.
                                    </Text>
                                  </View>
                                ) : (
                                  <View>
                                    <View
                                      className="px-2 py-1 rounded-xl self-start mb-2"
                                      style={{ backgroundColor: deadlinePassed ? '#F59E0B' : '#6B7280' }}
                                    >
                                      <Text className="text-white font-inter_semibold text-xs">
                                        {deadlinePassed ? 'LATE SUBMISSION' : 'NOT SUBMITTED'}
                                      </Text>
                                    </View>

                                    {deadlinePassed && (
                                      <View className={`p-2 rounded-md mb-3 ${isDarkMode ? 'bg-[#2D1B69]' : 'bg-[#FEF3C7]'}`}>
                                        <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                                          ⚠️ The deadline has passed. This will be marked as a late submission.
                                        </Text>
                                      </View>
                                    )}

                                    <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                                      Attach Files (Optional):
                                    </Text>
                                    
                                    <TouchableOpacity
                                      onPress={pickDocuments}
                                      className={`border-2 border-dashed rounded-lg p-4 mb-3 ${isDarkMode ? 'border-[#4B5563] bg-[#374151]' : 'border-[#D1D5DB] bg-[#F9FAFB]'}`}
                                    >
                                      <View className="flex-row items-center justify-center">
                                        <Image
                                          className="w-5 h-5 mr-1"
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

                                    {submissionFiles.length > 0 && (
                                      <View className="mb-3">
                                        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                                          Selected Files:
                                        </Text>
                                        {submissionFiles.map((file, idx) => (
                                          <View
                                            key={idx}
                                            className={`flex-row items-center justify-between p-2 rounded-md mb-1 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-[#E8E8E8]'}`}
                                          >
                                            <View className="flex-row items-center flex-1">
                                              <Image
                                                className="w-4 h-4 mr-2"
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
                                              className="bg-[#EF4444] rounded px-2 py-1"
                                            >
                                              <Text className="text-white font-inter_semibold text-xs">
                                                Remove
                                              </Text>
                                            </TouchableOpacity>
                                          </View>
                                        ))}
                                      </View>
                                    )}

                                    <TouchableOpacity
                                      onPress={handleTurnInActivity}
                                      disabled={isSubmitting}
                                      className="bg-[#10B981] rounded-lg py-3 px-4"
                                      style={{ opacity: isSubmitting ? 0.6 : 1 }}
                                    >
                                      {isSubmitting ? (
                                        <View className="flex-row items-center justify-center">
                                          <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                          <Text className="text-white font-inter_semibold text-sm">
                                            Submitting...
                                          </Text>
                                        </View>
                                      ) : (
                                        <Text className="text-white font-inter_semibold text-sm text-center">
                                          Turn In Activity
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            );
                          })()}
                        </View>
                      )}
                    </ScrollView>

                    {/* Close Button */}
                    <View className="flex-row justify-end mt-4">
                      <TouchableOpacity
                        className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'} rounded-lg py-2 px-4`}
                        onPress={() => {
                          setViewActModalVisible(false);
                          setSubmissionFiles([]);
                          setFileLoadError({});
                        }}
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
          </SafeAreaView>
        </Modal>
      </View>
    </View>
  );
};

export default memo(ActivityModal);