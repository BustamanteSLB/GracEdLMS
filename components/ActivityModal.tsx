import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  VirtualizedList,
  ActivityIndicator,
} from 'react-native';
import AttachIcon from '@/assets/icons/attach.svg';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import AddEditActivityModal from './AddEditActivityModal';
import { FlashList } from '@shopify/flash-list';

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

const ActivityModal: React.FC<ActivityModalProps> = ({
  subjectId,
  isDarkMode,
  isAdminOrTeacher,
  isAuthenticated,
}) => {
  const { user } = useAuth();
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

  // Add loading state for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is a teacher (exclude admin)
  const isTeacher = user?.role === 'Teacher';

  // Fetch activities
  const fetchActivities = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await apiClient.get(`/subjects/${subjectId}/activities`);
      const activitiesData = res.data.data || [];
      
      // For each activity, also fetch the subject details and grades
      const activitiesWithDetails = await Promise.all(
        activitiesData.map(async (activity: Activity) => {
          try {
            // Fetch subject details
            const subjectRes = await apiClient.get(`/subjects/${subjectId}`);
            const subjectData = subjectRes.data.data;
            
            // For students, fetch their grade for this activity
            let myGrade = undefined;
            if (user?.role === 'Student') {
              try {
                // Try to get grade directly for this activity
                const gradeRes = await apiClient.get(`/activities/${activity._id}/student-grade`);
                if (gradeRes.data.success && gradeRes.data.data) {
                  myGrade = gradeRes.data.data;
                }
              } catch (error) {
                // If direct endpoint doesn't exist, try the original approach
                try {
                  const gradesRes = await apiClient.get(`/subjects/${subjectId}/students/${user._id}/grades`);
                  const grades = gradesRes.data.data || [];
                  myGrade = grades.find((grade: Grade) => grade.activity === activity._id);
                } catch (error2) {
                  console.warn('Failed to fetch student grades:', error2);
                }
              }
            }

            // For teachers/admins, fetch all grades for this activity
            let allGrades: Grade[] = [];
            if (user?.role === 'Teacher' || user?.role === 'Admin') {
              try {
                const gradesRes = await apiClient.get(`/activities/${activity._id}/grades`);
                if (gradesRes.data.success && gradesRes.data.data) {
                  allGrades = gradesRes.data.data;
                }
              } catch (error) {
                console.warn('Failed to fetch activity grades:', error);
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
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to load activities.');
      } else {
        Alert.alert('Error', 'Failed to load activities.');
      }
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [subjectId]);

  // Update the filteredActivities to hide upcoming activities from students
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // For students, filter out upcoming activities (where visibleDate > now)
    if (user?.role === 'Student') {
      const now = new Date();
      filtered = filtered.filter(activity => {
        const visibleDate = new Date(activity.visibleDate);
        return visibleDate <= now; // Only show activities that are visible now
      });
    }

    // Sort by deadline (soonest first)
    return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activities, user?.role]);

  // Helper functions
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const deadline = new Date(activity.deadline);
    const visible = new Date(activity.visibleDate);

    // For students, check if their submission is graded
    if (user?.role === 'Student') {
      // Check multiple ways to find if graded
      const isGraded = activity.myGrade !== undefined && activity.myGrade !== null;
      
      // Also check if there's a submission with a grade
      const mySubmission = activity.submissions?.find(
        (sub) => sub.student._id === user?._id
      );
      const submissionGraded = mySubmission && mySubmission.grade !== undefined && mySubmission.grade !== null;
      
      // Debug logging
      console.log('Student grade check:', {
        activityId: activity._id,
        activityTitle: activity.title,
        myGrade: activity.myGrade,
        isGraded,
        submissionGraded,
        mySubmission
      });
      
      if (isGraded || submissionGraded) {
        return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
      }
    }

    // For teachers/admins, check if any student submission is graded
    if (user?.role === 'Teacher' || user?.role === 'Admin') {
      const hasAnyGrades = activity.grades && activity.grades.length > 0;
      if (hasAnyGrades) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };
    }

    // Standard status logic for ungraded activities
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

  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.firstName} ${user.middleName} ${user.lastName}`
      : `${user.firstName} ${user.lastName}`;
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

  // Handle add activity
  const handleAddActivity = () => {
    setEditActivity(null);
    setIsEditing(false);
    setAddEditModalVisible(true);
  };

  // Handle edit activity
  const handleEditActivity = (activity: Activity) => {
    setEditActivity(activity);
    setIsEditing(true);
    setAddEditModalVisible(true);
  };

  // Handle delete activity
  const handleDeleteActivity = async (activity: Activity) => {
    if (!user || user.role !== 'Teacher') {
      if (Platform.OS === 'web') {
        window.alert('Error: Only teachers can delete activities.');
      } else {
        Alert.alert('Error', 'Only teachers can delete activities.');
      }
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${activity.title}"?`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Delete Activity',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDelete() },
        ]
      );
      return;
    }

    const performDelete = async () => {
      try {
        await apiClient.delete(`/activities/${activity._id}`);
        fetchActivities();
        if (Platform.OS === 'web') {
          window.alert('Activity deleted successfully.');
        } else {
          Alert.alert('Success', 'Activity deleted successfully.');
        }
      } catch (err) {
        console.error('Delete Activity error:', err);
        if (Platform.OS === 'web') {
          window.alert('Error: Failed to delete activity.');
        } else {
          Alert.alert('Error', 'Failed to delete activity.');
        }
      }
    };

    if (Platform.OS === 'web') {
      performDelete();
    }
  };

  // Open view activity modal
  const openViewActivityModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setSubmissionFiles([]);
    setViewActModalVisible(true);
  };

  // File picker for submissions
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

  // Handle turn in activity
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
      
      if (Platform.OS === 'web') {
        window.alert('Activity turned in successfully!');
      } else {
        Alert.alert('Success', 'Activity turned in successfully!');
      }
    } catch (error: any) {
      console.error('Turn In Activity error:', error);
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

  // Handle undo turn in
  const handleUndoTurnInActivity = async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsUndoingSubmission(true);
      await apiClient.post(`/activities/${selectedActivity._id}/undo-turn-in`);
      fetchActivities();
      setViewActModalVisible(false);
      setSubmissionFiles([]);
      
      if (Platform.OS === 'web') {
        window.alert('Activity turn-in undone successfully!');
      } else {
        Alert.alert('Success', 'Activity turn-in undone successfully!');
      }
    } catch (error: any) {
      console.error('Undo Turn In Activity error:', error);
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

  // Check if the teacher can delete/edit the activity
  const canModifyActivity = (activity: Activity) => {
    return user ? activity.createdBy._id === user._id : false;
  };

  // VirtualizedList helper functions for web
  const getItem = (data: Activity[], index: number) => data[index];
  const getItemCount = (data: Activity[]) => data.length;
  const keyExtractor = (item: Activity) => item._id;

  // Add refresh handler
  const handleRefresh = () => {
    fetchActivities(true);
  };

  // Render activity item
  const renderActivityItem = ({ item: activity }: { item: Activity }) => {
    const statusInfo = getActivityStatus(activity);
    const canModify = canModifyActivity(activity);
    const mySubmission = activity.submissions?.find(
      (sub) => sub.student._id === user?._id
    );
    const isSubmitted = mySubmission && mySubmission.status === 'submitted';

    // Use statusInfo.color for border (this now includes grading status)
    const borderColor = statusInfo.color;

    return (
      <TouchableOpacity
        onPress={() => openViewActivityModal(activity)}
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 8,
          borderLeftColor: borderColor, // Now properly reflects grading status
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
        activeOpacity={0.8}
      >
        {/* Header with Status and Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <View
              style={{
                backgroundColor: statusInfo.color,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                marginBottom: 4,
              }}
            >
              <Text className={`font-inter_semibold text-xs ${isDarkMode ? 'text-white' : 'text-white'}`}>
                {statusInfo.text}
              </Text>
            </View>
            
            {/* Student Submission Status - Only show if not graded */}
            {user?.role === 'Student' && isSubmitted && statusInfo.status !== 'graded' && (
              <View
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginBottom: 4,
                }}
              >
                <Text 
                  className={`font-inter_semibold text-xs ${isDarkMode ? 'text-white' : 'text-white'}`}
                >
                  SUBMITTED
                </Text>
              </View>
            )}

            {/* Teacher/Admin: Show grading progress */}
            {(user?.role === 'Teacher' || user?.role === 'Admin') && statusInfo.status === 'graded' && (
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginBottom: 4,
                }}
              >
                <Text 
                  className={`font-inter_semibold text-xs ${isDarkMode ? 'text-white' : 'text-white'}`}>
                  {activity.grades?.length || 0} GRADED
                </Text>
              </View>
            )}
          </View>
          
          {/* Action Buttons (Teachers Only) */}
          {isTeacher && (
            <View style={{ flexDirection: 'row' }}>
              {/* Edit Button */}
              {canModify && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEditActivity(activity);
                  }}
                  style={{
                    backgroundColor: '#3B82F6',
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                >
                  <Image
                    className="w-[18] h-[18]"
                    contentFit="contain"
                    source={require('@/assets/icons/edit.png')}
                    tintColor="white"
                  />
                </TouchableOpacity>
              )}

              {/* Delete Button */}
              {canModify && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteActivity(activity);
                  }}
                  style={{
                    backgroundColor: '#EF4444',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Image
                    className="w-[18] h-[18]"
                    contentFit="contain"
                    source={require('@/assets/icons/delete.png')}
                    tintColor="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Activity Title */}
        <Text
          className={`font-inter_bold text-xl mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
        >
          {activity.title}
        </Text>

        {/* Creator Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Image
            style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
            source={
              activity.createdBy?.profilePicture
                ? { uri: activity.createdBy.profilePicture }
                : require('@/assets/images/sample_profile_picture.png')
            }
          />
          <View>
            <Text
              className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              {getUserFullName(activity.createdBy)}
              {canModify && (
                <Text className={`font-inter_semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {' '}(You)
                </Text>
              )}
            </Text>
            <Text
              className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {formatDate(activity.visibleDate)}
            </Text>
          </View>
        </View>

        {/* Description */}
        {activity.description && (
          <Text
            className={`font-inter_regular text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {activity.description}
          </Text>
        )}

        {/* Grade Info (if graded) - Enhanced display */}
        {(activity.myGrade || (mySubmission && mySubmission.grade !== undefined && mySubmission.grade !== null)) && (
          <View className='flex-row items-center mb-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
            <Image
              className="w-[16] h-[16] mr-2"
              contentFit="contain"
              source={require('@/assets/icons/star.png')}
              tintColor={isDarkMode ? '#A78BFA' : '#8B5CF6'}
            />
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
              Your Grade: {activity.myGrade?.score || mySubmission?.grade}
              {activity.points && ` / ${activity.points}`}
            </Text>
          </View>
        )}

        {/* Time remaining and deadline */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text
              className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              Due: {formatDate(activity.deadline)}
            </Text>
            {!activity.myGrade && (
              <Text
                className={`font-inter_regular text-xs ${
                  statusInfo.status === 'overdue' ? 'text-red-500' : 'text-orange-500'
                }`}
              >
                {getTimeRemaining(activity.deadline)}
              </Text>
            )}
          </View>
          
          {activity.points !== null && (
            <View className='items-end'>
              <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                {activity.points}
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                points
              </Text>
            </View>
          )}
        </View>

        {/* Attachment */}
        {activity.attachmentPath && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <AttachIcon 
              width={16} 
              height={16} 
              style={{ marginRight: 4 }} 
              fill={isDarkMode ? '#A78BFA' : '#6D28D9'} 
            />
            <Text
              className={`font-inter_regular text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}
            >
              Attachment available
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ padding: 8, flex: 1 }}>
      {/* Header + "Add Activity" Button (Teachers Only) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text
          className={`font-pbold mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
          style={{ fontSize: 20 }}
        >
          Activities ({filteredActivities.length})
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Add Activity Button - Only teachers can add activities */}
          {isTeacher && isAuthenticated && (
            <TouchableOpacity
              style={{
                backgroundColor: '#A78BFA',
                borderRadius: 8,
                padding: 8,
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 4,
              }}
              onPress={handleAddActivity}
            >
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/plus.png')}
                cachePolicy="memory-disk"
                tintColor="white"
              />
            </TouchableOpacity>
          )}
          {/* Refresh Button */}
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
            style={{
              borderRadius: 8,
              padding: 8,
              opacity: isRefreshing ? 0.6 : 1,
            }}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/refresh.png')}
                tintColor="white"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Activities List */}
      {activities.length > 0 ? (
        filteredActivities.length > 0 ? (
          Platform.OS === 'web' ? (
            <VirtualizedList
              data={filteredActivities}
              initialNumToRender={5}
              renderItem={renderActivityItem}
              keyExtractor={keyExtractor}
              getItemCount={getItemCount}
              getItem={getItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={3}
              updateCellsBatchingPeriod={50}
              windowSize={8}
            />
          ) : (
            <FlashList
              data={filteredActivities}
              renderItem={renderActivityItem}
              keyExtractor={keyExtractor}
              estimatedItemSize={200}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )
        ) : (
          // Different empty states for different roles
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              className="w-[120] h-[120] opacity-50"
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
                    style={{
                      backgroundColor: '#A78BFA',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 16,
                    }}
                  >
                    <Text className="text-white font-inter_semibold">
                      Create Your First Activity
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            className="w-[120] h-[120] opacity-50"
            contentFit="contain"
            source={require('@/assets/images/online-course.png')}
          />
          <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            No activities available.
          </Text>
          {isTeacher && (
            <TouchableOpacity
              onPress={handleAddActivity}
              style={{
                backgroundColor: '#A78BFA',
                borderRadius: 8,
                padding: 12,
                marginTop: 16,
              }}
            >
              <Text className="text-white font-inter_semibold">
                Create Your First Activity
              </Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* View Activity Modal - Updated to match student's activity page */}
      <Modal
        visible={viewActModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewActModalVisible(false)}
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
              maxWidth: 600,
              maxHeight: '90%',
            }}
          >
            {selectedActivity && (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text
                    className={`font-pbold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  >
                    {selectedActivity.title}
                  </Text>

                  {/* Subject Information */}
                  {selectedActivity.subject && (
                    <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
                      <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Subject: {selectedActivity.subject.subjectName}
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedActivity.subject.gradeLevel} - {selectedActivity.subject.section} ({selectedActivity.subject.schoolYear})
                      </Text>
                    </View>
                  )}

                  {/* Grade Information (if graded) */}
                  {selectedActivity.myGrade && (
                    <View className='mb-4'>
                      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Your Grade:
                      </Text>
                      <View className='p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
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
                  <View className='mb-4'>
                    <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      Description:
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedActivity.description || 'No description provided.'}
                    </Text>
                  </View>

                  {/* Deadline and Time Remaining */}
                  <View className='mb-4'>
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
                  </View>

                  {/* Points */}
                  {selectedActivity.points !== null && (
                    <View className='mb-4'>
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
                    <View className='mb-4'>
                      <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Attachment:
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const url = `http://10.171.62.172:5000/${selectedActivity.attachmentPath}`;
                          if (Platform.OS === 'web') {
                            window.open(url, '_blank');
                          } else {
                            Linking.openURL(url);
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
                          {selectedActivity.attachmentPath.split('/').pop()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Status */}
                  <View className='mb-4'>
                    <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      Status:
                    </Text>
                    <View
                      style={{
                        backgroundColor: getActivityStatus(selectedActivity).color,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text className='text-white font-inter_semibold text-sm'>
                        {getActivityStatus(selectedActivity).text}
                      </Text>
                    </View>
                  </View>

                  {/* Submission Section - Only show for students and if not graded */}
                  {user?.role === 'Student' && !selectedActivity.myGrade && (
                    <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6', borderTopWidth: 2, borderTopColor: isDarkMode ? '#374151' : '#D1D5DB' }}>
                      <Text className={`font-inter_bold text-base mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Your Submission
                      </Text>

                      {(() => {
                        const mySubmission = getMySubmission(selectedActivity);
                        const isSubmitted = mySubmission && mySubmission.status === 'submitted';
                        const deadlinePassed = isDeadlinePassed(selectedActivity);

                        return isSubmitted && mySubmission ? (
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
                                      const url = `http://10.171.62.172:5000/${path}`;
                                      if (Platform.OS === 'web') {
                                        window.open(url, '_blank');
                                      } else {
                                        Linking.openURL(url);
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
                        );
                      })()}
                    </View>
                  )}
                </ScrollView>

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
                    onPress={() => {
                      setViewActModalVisible(false);
                      setSubmissionFiles([]); // Clear files when closing
                    }}
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
    </View>
  );
};

export default ActivityModal;