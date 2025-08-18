import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, VirtualizedList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { Picker } from '@react-native-picker/picker'

cssInterop(Image, { className: "style" });

// Re-using interfaces but ensuring they fit the new data structure from backend
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
  semester: string;
  academicYear: string;
  status: 'active' | 'inactive' | 'archived';
  students: string[];
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  createdBy: User;
  subject: Subject; // This will be populated from the backend overview endpoint
  attachmentPath?: string | null;
  createdAt: string;
  updatedAt: string;
  submissions: Submission[]; // This will be the actual submissions array from the Activity model
}

interface Submission {
  _id: string;
  student: User;
  activity: string; // Only activity ID here as activity object is top-level
  submissionDate: string;
  attachmentPaths?: string[];
  status: 'submitted' | 'graded' | 'pending' | 'unsubmitted';
  grade?: number | null;
  feedback?: string;
}

interface Grade {
  _id: string;
  student: User;
  activity: Activity; // Activity object populated in grade
  subject: Subject;
  score: number;
  bonusPoints?: number;
  gradedBy: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

// New interface for the combined data received from the backend overview endpoint
interface StudentActivityOverviewItem {
  activity: Activity;
  submission: Submission | null;
  grade: Grade | null;
  status: 'GRADED' | 'PENDING' | 'UNSUBMITTED'; // This status comes from the backend
  subject: Subject; // Subject is directly included now
}

// Student's grades page
const GradesWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth(); // Current logged-in user (student)

  // State management
  const [studentGradesOverview, setStudentGradesOverview] = useState<StudentActivityOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter states
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // View submission modal states (kept for viewing submission details)
  const [viewSubmissionModalVisible, setViewSubmissionModalVisible] = useState(false);
  const [selectedItemForView, setSelectedItemForView] = useState<StudentActivityOverviewItem | null>(null);


  // Derived data for filters (subjects student is enrolled in)
  const subjects = useMemo(() => {
    const uniqueSubjects = studentGradesOverview.reduce((acc, item) => {
      if (!acc.find(c => c._id === item.subject._id)) {
        acc.push(item.subject);
      }
      return acc;
    }, [] as Subject[]);
    return uniqueSubjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [studentGradesOverview]);

  // Filtered grading data
  const filteredStudentGradesOverview = useMemo(() => {
  let filtered = studentGradesOverview;

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      const activityTitle = item.activity.title.toLowerCase();
      const subjectName = item.subject.subjectName.toLowerCase();
      const teacherName = `${item.activity.createdBy.firstName} ${item.activity.createdBy.lastName}`.toLowerCase();
      
      return activityTitle.includes(query) || 
             subjectName.includes(query) ||
             teacherName.includes(query);
    });
  }

  // Subject filter
  if (subjectFilter) {
    filtered = filtered.filter((item) => item.subject._id === subjectFilter);
  }

  // Status filter
  if (statusFilter) {
    filtered = filtered.filter((item) => {
      const now = new Date();
      const deadline = new Date(item.activity.deadline);
      const isOverdue = deadline < now && item.status !== 'GRADED';
      const isActive = deadline >= now && item.status !== 'GRADED';

      switch (statusFilter) {
        case 'GRADED':
          return item.status === 'GRADED';
        case 'PENDING':
          return item.status === 'PENDING';
        case 'UNSUBMITTED':
          return item.status === 'UNSUBMITTED' && !isOverdue;
        case 'OVERDUE':
          return isOverdue;
        case 'ACTIVE':
          return isActive;
        default:
          return true;
      }
    });
  }

  return filtered;
}, [studentGradesOverview, searchQuery, subjectFilter, statusFilter]);

  // VirtualizedList helper functions
  const getItemCount = useCallback((_data: StudentActivityOverviewItem[] | null | undefined) => _data ? _data.length : 0, []);
  
  const getItem = useCallback((_data: StudentActivityOverviewItem[] | null | undefined, index: number): StudentActivityOverviewItem => {
    return (_data as StudentActivityOverviewItem[])[index];
  }, []);

  // Fetch student's activity overview
  const fetchStudentActivityOverview = async () => {
    if (!user || user.role !== 'Student') {
      setError('Unauthorized: Student access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching student activity overview for:', user.firstName, user.lastName);

      // First, get all subjects where student is enrolled
      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
      console.log('📚 Total subjects found:', allSubjects.length);
      
      // Filter subjects where this student is enrolled (more robust checking)
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
        setStudentGradesOverview([]);
        setLoading(false);
        return;
      }

      const allStudentActivities: StudentActivityOverviewItem[] = [];

      // For each enrolled subject, get all activities
      for (const subject of studentSubjects) {
        try {
          console.log(`🔍 Fetching activities for subject: ${subject.subjectName}`);
          
          // Get activities for this subject
          const activitiesResponse = await apiClient.get(`/subjects/${subject._id}/activities`);
          
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            const subjectActivities = activitiesResponse.data.data;
            console.log(`📝 Found ${subjectActivities.length} activities for ${subject.subjectName}`);

            // Get student's grades for this subject
            let studentGrades: Grade[] = [];
            try {
              const gradesResponse = await apiClient.get(`/subjects/${subject._id}/students/${user._id}/grades`);
              studentGrades = gradesResponse.data.data || [];
              console.log(`📊 Found ${studentGrades.length} grades for ${subject.subjectName}`);
            } catch (gradeError) {
              console.warn(`Failed to fetch grades for subject ${subject.subjectName}:`, gradeError);
            }

            // Process each activity
            for (const activity of subjectActivities) {
              console.log(`Processing activity: ${activity.title}`);
              
              // REMOVE the visibleDate filter for now to see if activities appear
              // const now = new Date();
              // if (new Date(activity.visibleDate) > now) {
              //   console.log(`Skipping activity ${activity.title} - not visible yet`);
              //   continue; // Skip activities that aren't visible yet
              // }

              // Find student's submission for this activity
              let submission: Submission | null = null;
              if (activity.submissions && activity.submissions.length > 0) {
                submission = activity.submissions.find((sub: Submission) => {
                  // Handle both string and object references
                  const studentId = typeof sub.student === 'string' ? sub.student : sub.student._id;
                  return studentId === user._id;
                }) || null;
              }

              // Find student's grade for this activity
              const grade = studentGrades.find((g: Grade) => {
                // Handle both string and object references
                const activityId = typeof g.activity === 'string' ? g.activity : g.activity._id;
                return activityId === activity._id;
              }) || null;

              // Determine status
              let status: 'GRADED' | 'PENDING' | 'UNSUBMITTED' = 'UNSUBMITTED';
              
              if (grade) {
                status = 'GRADED';
              } else if (submission && submission.status === 'submitted') {
                status = 'PENDING';
              } else {
                status = 'UNSUBMITTED';
              }

              // Create the overview item
              const overviewItem: StudentActivityOverviewItem = {
                activity: {
                  ...activity,
                  subject: subject
                },
                submission: submission,
                grade: grade,
                status: status,
                subject: subject
              };

              allStudentActivities.push(overviewItem);
              console.log(`✅ Added activity: ${activity.title} with status: ${status}`);
            }
          } else {
            console.log(`📝 No activities found for ${subject.subjectName}`);
          }
        } catch (subjectError: any) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}:`, subjectError);
        }
      }

      console.log('📋 Total student activities processed:', allStudentActivities.length);

      // Sort by deadline (soonest first), then by creation date
      allStudentActivities.sort((a, b) => {
        const deadlineA = new Date(a.activity.deadline).getTime();
        const deadlineB = new Date(b.activity.deadline).getTime();
        
        if (deadlineA !== deadlineB) {
          return deadlineA - deadlineB;
        }
        
        return new Date(b.activity.createdAt).getTime() - new Date(a.activity.createdAt).getTime();
      });

      setStudentGradesOverview(allStudentActivities);
      console.log('✅ Successfully set student grades overview with', allStudentActivities.length, 'items');
    } catch (err: any) {
      console.error('Error fetching student grades overview:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch your grades overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentActivityOverview();
  }, [user]);

  // Helper functions
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

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('');
    setStatusFilter('');
  };

  // Handle view submission
  const handleViewSubmission = (item: StudentActivityOverviewItem) => {
    setSelectedItemForView(item);
    setViewSubmissionModalVisible(true);
  };

  // Render grading item (now student overview item)
  const renderStudentOverviewItem = useCallback(({ item }: { item: StudentActivityOverviewItem }) => {
    const { activity, submission, grade, status, subject } = item;
    
    const isGraded = status === 'GRADED';
    const isPending = status === 'PENDING';
    const isUnsubmitted = status === 'UNSUBMITTED';

    // Determine if activity is overdue
    const now = new Date();
    const deadline = new Date(activity.deadline);
    const isOverdue = deadline < now && !isGraded;

    let statusColor = '';
    let statusText = '';

    if (isGraded) {
      statusColor = '#10B981'; // Green
      statusText = 'GRADED';
    } else if (isPending) {
      statusColor = '#F59E0B'; // Amber
      statusText = 'PENDING';
    } else if (isOverdue) {
      statusColor = '#EF4444'; // Red
      statusText = 'OVERDUE';
    } else {
      statusColor = '#6B7280'; // Gray
      statusText = 'NOT SUBMITTED';
    }
    
    return (
      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#F6F7F9',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          marginHorizontal: 16,
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
        }}
      >
        {/* Status Badge and View Button */}
        <View className='flex-row justify-between items-start mb-3'>
          <View className='flex-row'>
            <View
              style={{
                backgroundColor: statusColor,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginRight: 8,
              }}
            >
              <Text className='text-white font-inter_semibold text-xs'>
                {statusText}
              </Text>
            </View>

            {/* Time remaining indicator for active/overdue activities */}
            {!isGraded && (
              <View
                style={{
                  backgroundColor: isOverdue ? '#DC2626' : '#059669',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text className='text-white font-inter_semibold text-xs'>
                  {isOverdue ? 'PAST DUE' : 'ACTIVE'}
                </Text>
              </View>
            )}
          </View>
          
          {/* View Details Button (conditionally visible) */}
          {(submission && submission.attachmentPaths && submission.attachmentPaths.length > 0) || (isGraded && grade) ? (
            <TouchableOpacity
                onPress={() => handleViewSubmission(item)}
                style={{
                    backgroundColor: isDarkMode ? '#3B82F6' : '#6366F1', // Blue/Indigo
                    padding: 6,
                    borderRadius: 6,
                }}
            >
                <Image
                    className="w-[16] h-[16]"
                    contentFit="contain"
                    source={require('@/assets/icons/import_file.png')}
                    tintColor="white"
                />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Activity Info */}
        <View className='mb-2'>
          <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            {activity.title}
          </Text>
          <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {subject.subjectName} - {subject.section}
          </Text>
          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Created by: {getUserFullName(activity.createdBy)}
          </Text>
        </View>

        {/* Grade Info (only if graded) */}
        {isGraded && grade && (
          <View className='mb-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#134E4A' : '#D1FAE5' }}>
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
              Your Score: {grade.score}
              {activity.points !== null && ` / ${activity.points}`}
            </Text>
            {grade.comments && (
              <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-700'}`}>
                Feedback: "{grade.comments}"
              </Text>
            )}
            <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              Graded on: {formatDate(grade.updatedAt)} by {getUserFullName(grade.gradedBy)}
            </Text>
          </View>
        )}

        {/* Time remaining for active activities */}
        {!isGraded && !isOverdue && (
          <View className='mb-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#134E4A' : '#DCFCE7' }}>
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
              {getTimeRemaining(activity.deadline)}
            </Text>
          </View>
        )}

        {/* Overdue warning */}
        {isOverdue && !isGraded && (
          <View className='mb-2 p-2 rounded-lg' style={{ backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2' }}>
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
              This activity is overdue!
            </Text>
          </View>
        )}

        {/* Submission Details */}
        <View className='flex-row justify-between items-center mb-2'>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Deadline: {formatDate(activity.deadline)}
          </Text>
          
          {activity.points !== null && (
            <View className='items-end'>
              <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                {activity.points}
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                max points
              </Text>
            </View>
          )}
        </View>

        {/* Submitted Files Count (if submitted) */}
        {submission && submission.attachmentPaths && submission.attachmentPaths.length > 0 && (
          <View className='flex-row items-center'>
            <Image
              className="w-[14] h-[14] mr-1"
              contentFit="contain"
              source={require('@/assets/icons/import_file.png')}
              tintColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            />
            <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Submitted {submission.attachmentPaths.length} file{submission.attachmentPaths.length !== 1 ? 's' : ''} on {formatDate(submission.submissionDate)}
            </Text>
          </View>
        )}
        {submission && submission.attachmentPaths && submission.attachmentPaths.length === 0 && (
            <View className='flex-row items-center'>
                <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Submitted (No files attached) on {formatDate(submission.submissionDate)}
                </Text>
            </View>
        )}
      </View>
    );
  }, [isDarkMode, handleViewSubmission, formatDate, getUserFullName]);

  // Add helper function for time remaining
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

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading your grades...
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
          onPress={fetchStudentActivityOverview}
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

  if (studentGradesOverview.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/score.png')}
          transition={200}
        />
        <Text className={`font-inter_regular text-center mt-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No activities or grades found yet for your subjects.
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchStudentActivityOverview}
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
      <View className='flex-row items-center justify-between mx-4 mt-2 mb-4'>
        <Text className={`font-pbold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          My Grades
        </Text>
        <View className='flex-row'>
          <TouchableOpacity
            className='bg-blue-500 rounded-md justify-center items-center p-2 mr-1'
            onPress={fetchStudentActivityOverview}
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
            <Text className='text-white font-psemibold text-sm'>
              Clear Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className='mx-4 mb-4'>
        <TextInput
          className={`border rounded-md px-4 py-3 font-inter_regular text-base ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
          placeholder='Search activities or subjects...'
          placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View className='mx-4 mb-4'>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
          <View className='flex-row space-x-3'>
            {/* Subject Filter */}
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
                fontSize: 16, 
                padding: 12,
                width: 200, 
              }}
            >
              <Picker.Item label="All My Subjects" value="" />
              {subjects.map(subject => (
                <Picker.Item 
                  key={subject._id} 
                  label={subject.subjectName} 
                  value={subject._id} 
                />
              ))}
            </Picker>
            
            {/* Status Filter */}
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
                fontSize: 16, 
                padding: 12,
                width: 150, 
              }}
            >
              <Picker.Item label="All Status" value="" />
              <Picker.Item label="GRADED" value="GRADED" />
              <Picker.Item label="PENDING" value="PENDING" />
              <Picker.Item label="UNSUBMITTED" value="UNSUBMITTED" />
              <Picker.Item label="OVERDUE" value="OVERDUE" />
              <Picker.Item label="ACTIVE" value="ACTIVE" />
            </Picker>
          </View>
        </ScrollView>
      </View>

      {/* Results Count */}
      <View className='mx-4 mb-2'>
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing {filteredStudentGradesOverview.length} of {studentGradesOverview.length} activities
        </Text>
      </View>

      {/* Activities List */}
      {filteredStudentGradesOverview.length === 0 && searchQuery ? (
        <View className='flex-1 items-center justify-center'>
          <Image
            className="w-[100] h-[100] opacity-50"
            contentFit="contain"
            source={require('@/assets/images/no_results.png')}
          />
          <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            No activities found matching your search or filters.
          </Text>
        </View>
      ) : (
        <VirtualizedList
          data={filteredStudentGradesOverview}
          renderItem={renderStudentOverviewItem}
          keyExtractor={(item) => item.activity._id} // Key by activity ID as it's unique per item
          getItem={getItem}
          getItemCount={getItemCount}
          showsVerticalScrollIndicator={false}
          extraData={[isDarkMode, searchQuery, subjectFilter, statusFilter]}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* View Submission Modal */}
      <Modal
        visible={viewSubmissionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewSubmissionModalVisible(false)}
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
              maxHeight: '80%',
            }}
          >
            {selectedItemForView && (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text className={`font-pbold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    Activity Details
                  </Text>

                  {/* Activity Info */}
                  <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
                    <Text className={`font-inter_semibold text-base mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      Activity: {selectedItemForView.activity.title}
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Subject: {selectedItemForView.subject.subjectName} - {selectedItemForView.subject.section}
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Max Points: {selectedItemForView.activity.points || 'No limit'}
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Deadline: {formatDate(selectedItemForView.activity.deadline)}
                    </Text>
                    <Text className={`font-inter_regular text-sm mt-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      Description: {selectedItemForView.activity.description || 'No description provided.'}
                    </Text>
                  </View>

                  {/* Your Submission Details (if submitted) */}
                  {selectedItemForView.submission && (
                    <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
                      <Text className={`font-inter_semibold text-base mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                        Your Submission:
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Submitted on: {formatDate(selectedItemForView.submission.submissionDate)}
                      </Text>
                      {selectedItemForView.submission.attachmentPaths && selectedItemForView.submission.attachmentPaths.length > 0 && (
                        <View className='mt-2'>
                          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                            Attached Files:
                          </Text>
                          {selectedItemForView.submission.attachmentPaths.map((path, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                const url = `http://192.168.100.5:5000/${path}`; // Assuming backend serves files from here
                                if (Platform.OS === 'web') {
                                  window.open(url, '_blank');
                                } else {
                                  // For native, you'd typically use Linking.openURL or a file viewer
                                  Alert.alert("File Download", `Attempting to open: ${url}`);
                                }
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: 8,
                                padding: 12,
                                backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8',
                                borderRadius: 8,
                              }}
                            >
                              <Image
                                className="w-[20] h-[20] mr-3"
                                contentFit="contain"
                                source={require('@/assets/icons/import_file.png')}
                                tintColor={isDarkMode ? '#A78BFA' : '#6D28D9'}
                              />
                              <Text className={`font-inter_regular text-sm underline flex-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                {path.split('/').pop()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                       {selectedItemForView.submission.attachmentPaths && selectedItemForView.submission.attachmentPaths.length === 0 && (
                            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                No files attached to this submission.
                            </Text>
                        )}
                    </View>
                  )}

                  {/* Your Grade and Feedback (if graded) */}
                  {selectedItemForView.grade && (
                    <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#134E4A' : '#D1FAE5' }}>
                      <Text className={`font-inter_semibold text-base mb-1 ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                        Your Score: {selectedItemForView.grade.score}
                        {selectedItemForView.activity.points !== null && ` / ${selectedItemForView.activity.points}`}
                      </Text>
                      {selectedItemForView.grade.comments && (
                        <Text className={`font-inter_regular text-sm mt-1 ${isDarkMode ? 'text-green-200' : 'text-green-700'}`}>
                          Feedback: "{selectedItemForView.grade.comments}"
                        </Text>
                      )}
                      <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Graded on: {formatDate(selectedItemForView.grade.updatedAt)} by {getUserFullName(selectedItemForView.grade.gradedBy)}
                      </Text>
                    </View>
                  )}

                  {/* Status */}
                  <View className='mb-4'>
                    <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                      Current Status: 
                      <Text style={{ color: selectedItemForView.status === 'GRADED' ? '#10B981' : (selectedItemForView.status === 'PENDING' ? '#F59E0B' : '#EF4444') }}>
                        {` ${selectedItemForView.status}`}
                      </Text>
                    </Text>
                  </View>

                </ScrollView>

                {/* Action Buttons */}
                <View className='flex-row justify-end mt-4'>
                  <TouchableOpacity
                    onPress={() => setViewSubmissionModalVisible(false)}
                    style={{
                      backgroundColor: isDarkMode ? '#374151' : '#9CA3AF',
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text className='text-white font-inter_semibold text-sm'>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default GradesWeb;
