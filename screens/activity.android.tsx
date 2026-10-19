import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, useWindowDimensions, ToastAndroid } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import * as DocumentPicker from 'expo-document-picker'
import AttachIcon from '@/assets/icons/attach.svg'
import { FlashList } from '@shopify/flash-list'
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import NetworkBanner from '@/components/NetworkBanner.android';

cssInterop(Image, { className: "style" });

const ITEMS_PER_PAGE = 10;

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
  subjectImage?: string;
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
  allowLateSubmissions: boolean;
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  term: string;
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

const ActivityAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [networkError, setNetworkError] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [submissionFiles, setSubmissionFiles] = useState<(DocumentPicker.DocumentPickerAsset | File)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoingSubmission, setIsUndoingSubmission] = useState(false);

  const [fileLoadError, setFileLoadError] = useState<{[key: string]: boolean}>({});
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);

  const isNetworkError = (err: any) =>
    err?.message?.toLowerCase?.().includes('network') ||
    err?.status === 0 ||
    !err?.response;

  // Helper function to get teacher names from teachers array
  const getTeacherNames = (subject: Subject): string => {
    if (!subject.teachers || subject.teachers.length === 0) {
      return 'No teacher assigned';
    }

    return subject.teachers.map((ta) => {
      const teacher = ta.teacher;
      if (!teacher) return 'Unknown';

      return getUserFullName(teacher);
    }).join(', ');
  };

  const enrolledSubjects = useMemo(() => {
    const uniqueSubjects = activities.reduce((acc, activity) => {
      if (!acc.find(c => c._id === activity.subject._id)) {
        acc.push(activity.subject);
      }
      return acc;
    }, [] as Subject[]);
    return uniqueSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [activities]);

  const subjectOptions = useMemo(() => [
    { label: 'All Subjects', value: '' },
    ...enrolledSubjects.map(subject => ({
      label: subject.subjectName,
      value: subject._id,
    })),
  ], [enrolledSubjects]);

  const statusOptions = useMemo(() => [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Graded', value: 'graded' },
  ], []);

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    const now = new Date();

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

    if (subjectFilter) {
      filtered = filtered.filter(activity => activity.subject._id === subjectFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(activity => {
        const deadline = new Date(activity.deadline);
        const isGraded = activity.myGrade !== undefined;

        switch (statusFilter) {
          case 'graded':
            return isGraded;
          case 'active':
            return !isGraded && (deadline > now || activity.allowLateSubmissions);
          case 'overdue':
            return !isGraded && deadline < now && !activity.allowLateSubmissions;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activities, searchQuery, subjectFilter, statusFilter]);

  // Displayed (paginated) activities
  const displayedActivities = useMemo(
    () => filteredActivities.slice(0, displayedCount),
    [filteredActivities, displayedCount]
  );
  const hasMore = displayedCount < filteredActivities.length;

  const getFileUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('https://storage.googleapis.com/') ||
        fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return fileUrl;
    }

    if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      console.warn('Legacy file path detected:', fileUrl);
      return null;
    }

    return fileUrl;
  };

  const fetchStudentActivities = async () => {
    if (!user || user.role !== 'Student') {
      setError('Unauthorized: Student access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNetworkError(false);

      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];

      const studentSubjects = allSubjects.filter((subject: Subject) => {
        const isEnrolled = subject.students && subject.students.some((studentId: any) => {
          const id = typeof studentId === 'string' ? studentId : studentId._id;
          return id === user._id;
        });
        return isEnrolled;
      });

      if (studentSubjects.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const allActivities: Activity[] = [];

      for (const subject of studentSubjects) {
        try {
          const activitiesResponse = await apiClient.get<ActivityResponse>(`/subjects/${subject._id}/activities`);

          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            const activitiesWithSubject = activitiesResponse.data.data.map((activity: Activity) => ({
              ...activity,
              subject: subject,
              term: activity.term || '1',
              myGrade: undefined
            }));

            try {
              const gradesResponse = await apiClient.get(`/subjects/${subject._id}/students/${user._id}/grades`);
              const subjectGrades = gradesResponse.data.data || [];

              const activitiesWithGrades = activitiesWithSubject.map((activity: Activity) => {
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
              allActivities.push(...activitiesWithSubject);
            }
          }
        } catch (subjectError: any) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}:`, subjectError);
        }
      }

      setActivities(allActivities);
      setDisplayedCount(ITEMS_PER_PAGE);
    } catch (err: any) {
      console.error('Error fetching student activities:', err);
      if (isNetworkError(err)) setNetworkError(true);
      setError(err.response?.data?.message || err.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentActivities();
  }, [user]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch {}
  }, [searchQuery, subjectFilter, statusFilter]);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredActivities.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredActivities.length]);

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
      ToastAndroid.show('Failed to pick documents.', ToastAndroid.SHORT);
    }
  };

  const removeFile = (index: number) => {
    setSubmissionFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleTurnInActivity = async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsSubmitting(true);

      if (submissionFiles.length > 0) {
        const formData = new FormData();

        submissionFiles.forEach((file, index) => {
          const mobileFile = file as DocumentPicker.DocumentPickerAsset;
          const fileToUpload = {
            uri: mobileFile.uri,
            type: mobileFile.mimeType || 'application/octet-stream',
            name: mobileFile.name || `submission_${index}`,
          };
          formData.append(`submissionAttachments`, fileToUpload as any);
        });

        await apiClient.post(
          `/activities/${selectedActivity._id}/turn-in`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );
      } else {
        await apiClient.post(
          `/activities/${selectedActivity._id}/turn-in`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        );
      }

      setSubmissionFiles([]);

      const activityResponse = await apiClient.get(`/activities/${selectedActivity._id}`);
      const updatedActivity = activityResponse.data.data;

      setActivities(prevActivities =>
        prevActivities.map(act => {
          if (act._id === selectedActivity._id) {
            return {
              ...act,
              ...updatedActivity,
              subject: act.subject,
              myGrade: act.myGrade,
            };
          }
          return act;
        })
      );

      setSelectedActivity(prevActivity => {
        if (!prevActivity || prevActivity._id !== selectedActivity._id) return prevActivity;

        return {
          ...prevActivity,
          ...updatedActivity,
          subject: prevActivity.subject,
          myGrade: prevActivity.myGrade,
        };
      });

      setShowActivityModal(false);

      ToastAndroid.show('Activity turned in successfully!', ToastAndroid.SHORT);
    } catch (error: any) {
      console.error('🚨 Turn In Activity error:', error);
      if (isNetworkError(error)) setNetworkError(true);
      const msg = error.response?.data?.message || error.message || 'Failed to turn in activity.';
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoTurnInActivity = async () => {
    if (!selectedActivity || !user) return;

    try {
      setIsUndoingSubmission(true);
      await apiClient.post(`/activities/${selectedActivity._id}/undo-turn-in`);

      setActivities(prevActivities =>
        prevActivities.map(act => {
          if (act._id === selectedActivity._id) {
            const updatedSubmissions = act.submissions
              ? act.submissions.filter(sub => sub.student._id !== user._id)
              : [];

            return { ...act, submissions: updatedSubmissions };
          }
          return act;
        })
      );

      setSelectedActivity(prevActivity => {
        if (!prevActivity || prevActivity._id !== selectedActivity._id) return prevActivity;

        const updatedSubmissions = prevActivity.submissions
          ? prevActivity.submissions.filter(sub => sub.student._id !== user._id)
          : [];

        return { ...prevActivity, submissions: updatedSubmissions };
      });

      setSubmissionFiles([]);

      ToastAndroid.show('Activity turn-in undone successfully!', ToastAndroid.SHORT);
    } catch (error: any) {
      console.error('🚨 Undo Turn In Activity error:', error);
      if (isNetworkError(error)) setNetworkError(true);
      const msg = error.response?.data?.message || error.message || 'Failed to undo turn-in.';
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } finally {
      setIsUndoingSubmission(false);
    }
  };

  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const deadline = new Date(activity.deadline);
    const isGraded = activity.myGrade !== undefined;

    if (isGraded) return { status: 'graded', color: '#8B5CF6', text: 'Graded' };

    if (deadline < now && activity.allowLateSubmissions) {
      return { status: 'late-allowed', color: '#F59E0B', text: 'Late OK' };
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

  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
    setSubmissionFiles([]);
    setShowActivityModal(true);
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

  const renderAttachmentLink = (attachmentPath: string) => {
    const fileUrl = getFileUrl(attachmentPath);

    if (!fileUrl || fileLoadError[fileUrl]) {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8',
            borderRadius: 6,
          }}
        >
          <Image
            className="w-[16] h-[16] mr-2"
            contentFit="contain"
            source={require('@/assets/icons/attach.png')}
            tintColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            File unavailable
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={async () => {
          try {
            if (Platform.OS === 'web') {
              window.open(fileUrl, '_blank');
            } else {
              const result = await WebBrowser.openBrowserAsync(fileUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                controlsColor: '#1877F2',
              });

              if (result.type === 'cancel') {
                await Linking.openURL(fileUrl);
              }
            }
          } catch (error) {
            console.error('Failed to open file:', error);
            setFileLoadError(prev => ({ ...prev, [fileUrl]: true }));
            Alert.alert(
              'File Error',
              'Unable to open file. The file may not be available or you may not have an app installed to view this file type.',
              [{ text: 'OK' }]
            );
          }
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
          backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8',
          borderRadius: 6,
        }}
      >
        <Image
          className="w-[16] h-[16] mr-2"
          contentFit="contain"
          source={require('@/assets/icons/attach.png')}
          tintColor={isDarkMode ? '#A78BFA' : '#6D28D9'}
        />
        <Text className={`font-inter_regular text-sm underline ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
          {fileUrl.split('/').pop() || 'Download attachment'}
        </Text>
      </TouchableOpacity>
    );
  };

  const getMySubmission = (activity: Activity) => {
    return activity.submissions?.find(sub => sub.student._id === user?._id);
  };

  const isDeadlinePassed = (activity: Activity) => {
    return new Date() > new Date(activity.deadline);
  };

  const canSubmit = (activity: Activity) => {
    const deadlinePassed = isDeadlinePassed(activity);
    const isGraded = activity.myGrade !== undefined;

    if (isGraded) return false;
    if (!deadlinePassed) return true;

    return activity.allowLateSubmissions;
  };

  // ---- List header (scrolls with the list now) ----
  const listHeader = useMemo(() => (
    <View className={isDarkMode ? 'bg-[#121212]' : 'bg-white'}>
      <View className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
        <Text className={`font-inter_bold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          My Activities
        </Text>
        <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {displayedActivities.length} of {filteredActivities.length} activities
        </Text>
      </View>

      <View className={`px-4 py-3 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className='mb-3'>
          <TextInput
            className={`border rounded-lg px-3 py-2 font-inter_regular ${
              isDarkMode
                ? 'border-gray-600 bg-[#1E1E1E] text-[#E0E0E0]'
                : 'border-gray-300 bg-white text-black'
            }`}
            placeholder="Search activities..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className='flex-row mb-2' style={{ gap: 8 }}>
          <View className='flex-1'>
            <DropdownMobile
              label="Subject"
              selectedValue={subjectFilter}
              onValueChange={setSubjectFilter}
              items={subjectOptions}
              placeholder="All Subjects"
              buttonRightIcon={DownIcon}
            />
          </View>

          <View className='flex-1'>
            <DropdownMobile
              label="Status"
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              items={statusOptions}
              placeholder="All Status"
              buttonRightIcon={DownIcon}
            />
          </View>
        </View>

        {(searchQuery || subjectFilter || statusFilter) && (
          <TouchableOpacity
            onPress={clearFilters}
            className='self-end'
          >
            <Text className='font-inter_medium text-sm text-blue-600'>
              Clear Filters
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [isDarkMode, searchQuery, subjectFilter, statusFilter, subjectOptions, statusOptions, displayedActivities.length, filteredActivities.length]);

  // ---- Sidebar item renderer ----
  const renderSidebarItem = useCallback(({ item }: { item: SidebarListItem }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View
            className='items-center rounded-lg p-3 mb-2 mx-4'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text className={`font-inter_regular text-sm mt-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Loading...
            </Text>
          </View>
        );

      case 'empty':
        return (
          <View
            className='items-center rounded-lg p-3 mb-2 mx-4'
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
        const mySubmission = getMySubmission(activity);
        const isSubmitted = mySubmission && mySubmission.status === 'submitted';

        return (
          <TouchableOpacity
            onPress={() => handleActivitySelect(activity)}
            className='rounded-md p-3 mb-2 mx-4'
            style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5',
              borderWidth: 2,
              borderColor: statusInfo.color,
            }}
            activeOpacity={0.7}
          >
            <View className='flex-row'>
              {activity.subject.subjectImage ? (
                <Image
                  source={{ uri: activity.subject.subjectImage }}
                  className='w-[36px] h-[36px] rounded-md mr-2'
                  contentFit="cover"
                />
              ) : (
                <View
                  className='w-[36px] h-[36px] rounded-md items-center justify-center mr-2'
                  style={{ backgroundColor: subjectColor }}
                >
                  <Text className='font-inter_bold text-xs text-white'>
                    {subjectInitials}
                  </Text>
                </View>
              )}

              <View className='flex-1'>
                <Text
                  className={`font-inter_bold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {activity.title}
                </Text>
                <Text
                  className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {activity.subject.subjectName}
                </Text>
                <View className='flex-row items-center justify-between mt-1'>
                  <Text
                    className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
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
  }, [isDarkMode, getActivityStatus, getSubjectColor, getSubjectInitials, formatShortDate, handleActivitySelect, getMySubmission]);

  const sidebarListData = useMemo((): SidebarListItem[] => {
    if (loading) {
      return [{ id: 'loading', type: 'loading' }];
    }

    if (filteredActivities.length === 0) {
      return [{ id: 'empty', type: 'empty' }];
    }

    return displayedActivities.map(activity => ({
      id: activity._id,
      type: 'activity' as SidebarItemType,
      data: activity
    }));
  }, [loading, filteredActivities.length, displayedActivities]);

  const sidebarKeyExtractor = useCallback((item: SidebarListItem) => item.id, []);

  // ---- List footer ----
  const listFooter = useMemo(() => (
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
  ), [isLoadingMore, isDarkMode, hasMore, filteredActivities.length]);

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

  const mainKeyExtractor = useCallback((item: MainListItem) => item.id, []);

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
              Select an activity to view details
            </Text>
          </View>
        );

      case 'activity':
        if (!item.data) return null;
        const activity = item.data;
        const statusInfo = getActivityStatus(activity);
        const subjectColor = getSubjectColor(activity.subject._id);
        const subjectInitials = getSubjectInitials(activity.subject.subjectName);

        return (
          <View
            className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 mb-4 rounded-lg`}
            style={{
              borderLeftWidth: 8,
              borderLeftColor: statusInfo.color
            }}
          >
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

            <Text className={`font-inter_bold text-xl mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {activity.title}
            </Text>

            <View className='mb-3 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
              <View className='flex-row items-center mb-2'>
                {activity.subject.subjectImage ? (
                  <Image
                    source={{ uri: activity.subject.subjectImage }}
                    className='w-12 h-12 rounded-lg mr-3'
                    contentFit="cover"
                  />
                ) : (
                  <View
                    className='w-12 h-12 rounded-lg items-center justify-center mr-3'
                    style={{ backgroundColor: subjectColor }}
                  >
                    <Text className='font-inter_bold text-lg text-white'>
                      {subjectInitials}
                    </Text>
                  </View>
                )}

                <View className='flex-1'>
                  <Text className={`font-inter_semibold text-base mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {activity.subject.subjectName}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activity.subject.gradeLevel} - {activity.subject.section}
                  </Text>
                </View>
              </View>

              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Term: {activity.term} ({activity.subject.schoolYear})
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Teacher: {getTeacherNames(activity.subject)}
              </Text>
            </View>

            {activity.myGrade && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Your Grade:
                </Text>
                <View className='p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    {activity.myGrade.score}
                    {activity.myGrade.bonusPoints && activity.myGrade.bonusPoints > 0 && ` + ${activity.myGrade.bonusPoints} bonus`}
                    {activity.points && ` / ${activity.points}`}
                  </Text>
                  {activity.myGrade.comments && (
                    <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                      Feedback: "{activity.myGrade.comments}"
                    </Text>
                  )}
                  <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                    Graded by: {getUserFullName(activity.myGrade.gradedBy)} on {formatDate(activity.myGrade.updatedAt)}
                  </Text>
                </View>
              </View>
            )}

            <View className='mb-4'>
              <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Description:
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activity.description || 'No description provided.'}
              </Text>
            </View>

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
              {activity.allowLateSubmissions && (
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

            {activity.attachmentPath && (
              <View className='mb-4'>
                <Text className={`font-inter_semibold text-sm mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Attachment:
                </Text>
                {renderAttachmentLink(activity.attachmentPath)}
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
        const canStillSubmit = canSubmit(activityData);

        return (
          <View className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 rounded-lg`}>
            <Text className={`font-inter_bold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Your Submission
            </Text>

            <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6', borderTopWidth: 2, borderTopColor: isDarkMode ? '#374151' : '#D1D5DB' }}>
              {isSubmitted && mySubmission ? (
                <View>
                  <View className='flex-row items-center mb-2'>
                    <View
                      style={{
                        backgroundColor: isGraded ? '#8B5CF6' : '#10B981',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginRight: 8,
                      }}
                    >
                      <Text className='text-white font-inter_semibold text-xs'>
                        {isGraded ? 'GRADED' : 'SUBMITTED'}
                      </Text>
                    </View>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      on {formatDate(mySubmission.submissionDate)}
                    </Text>
                  </View>

                  {mySubmission.attachmentPaths && mySubmission.attachmentPaths.length > 0 && (
                    <View className='mb-3'>
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

                  {!isGraded && canStillSubmit && (
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

                  {isGraded && (
                    <View className='mt-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#065F46' : '#ECFDF5' }}>
                      <Text className={`font-inter_regular text-xs text-center ${isDarkMode ? 'text-green-200' : 'text-green-700'}`}>
                        This activity has been graded. Your submission is shown above for reference.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                !isGraded && (
                  <View>
                    {!canStillSubmit ? (
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
                          style={{
                            backgroundColor: deadlinePassed ? '#F59E0B' : '#6B7280',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            alignSelf: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <Text className='text-white font-inter_semibold text-xs'>
                            {deadlinePassed ? 'LATE SUBMISSION' : 'NOT SUBMITTED'}
                          </Text>
                        </View>

                        {deadlinePassed && (
                          <View
                            style={{
                              backgroundColor: isDarkMode ? '#2D1B69' : '#FEF3C7',
                              padding: 8,
                              borderRadius: 6,
                              marginBottom: 12,
                            }}
                          >
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
                                    source={require('@/assets/icons/attach.png')}
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
                )
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  }, [isDarkMode, error, formatDate, getUserFullName, getActivityStatus, getMySubmission, isDeadlinePassed, submissionFiles, pickDocuments, removeFile, handleTurnInActivity, handleUndoTurnInActivity, isSubmitting, isUndoingSubmission, getTimeRemaining, getSubjectColor, getSubjectInitials, getTeacherNames]);

  if (loading && activities.length === 0) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading activities...
        </Text>
        <NetworkBanner
          forceVisible={networkError}
          onRetry={() => {
            setNetworkError(false);
            fetchStudentActivities();
          }}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDarkMode ? '#0A0A0A' : '#F9FAFB' }}
      edges={['left', 'right']}
    >
      {/* Entire screen scrolls as one unit */}
      <FlashList
        ref={listRef}
        data={sidebarListData}
        renderItem={renderSidebarItem}
        keyExtractor={sidebarKeyExtractor}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        extraData={isDarkMode}
        keyboardShouldPersistTaps="handled"
      />

      {/* Activity details modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View className={`flex-1 ${isDarkMode ? 'bg-[#0A0A0A]' : 'bg-gray-50'}`}>
          <SafeAreaView className='flex-1'>
            <View className={`px-4 py-3 border-b flex-row justify-between items-center ${isDarkMode ? 'border-gray-700 bg-[#121212]' : 'border-gray-200 bg-white'}`}>
              <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Activity Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowActivityModal(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
              >
                <Text className={`font-inter_semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <FlashList
              data={mainListData}
              renderItem={renderMainItem}
              keyExtractor={mainKeyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              extraData={isDarkMode}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Animated network banner overlay */}
      <NetworkBanner
        forceVisible={networkError}
        onRetry={() => {
          setNetworkError(false);
          fetchStudentActivities();
        }}
      />

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default ActivityAndroid;