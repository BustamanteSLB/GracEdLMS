import { Text, TouchableOpacity, useColorScheme, View, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/app/services/apiClient';

// Icons
import ActivityIcon from '@/assets/icons/activity.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import CoursesIcon from '@/assets/icons/course_book.svg';
import GradesIcon from '@/assets/icons/grades.svg';
import InstitutionIcon from '@/assets/icons/institution.svg';
import ProfileIcon from '@/assets/icons/account.svg';
import QuizIcon from '@/assets/icons/quizzes.svg';
import AnnouncementIcon from '@/assets/icons/announcement.svg';
import EventIcon from '@/assets/icons/calendar_month.svg';
import CompletedIcon from '@/assets/icons/grades.svg';

cssInterop(Image, { className: "style" });

interface StudentAnalyticsData {
  enrolledSubjects: {
    count: number;
    subjects: Array<{
      _id: string;
      subjectName: string;
      teacher: {
        firstName: string;
        lastName: string;
        email: string;
      } | null;
      gradeLevel: string;
      section: string;
    }>;
  };
  duesToday: {
    totalCount: number;
    pendingCount: number;
    completedCount: number;
    gradedCount: number;
    activities: {
      all: Array<{
        _id: string;
        title: string;
        deadline: string;
        subject: string;
        points: number;
        status: 'pending' | 'completed' | 'graded';
        submissionDate?: string;
        grade?: {
          score: number;
          bonusPoints: number;
          totalScore: number;
          feedback?: string;
        };
      }>;
      pending: Array<any>;
      completed: Array<any>;
      graded: Array<any>;
    };
    quizzes: {
      all: Array<{
        _id: string;
        title: string;
        subject: string;
        timeLimit: number;
        questionCount: number;
        status: 'pending' | 'completed' | 'graded';
        submissionDate?: string;
        score?: {
          quizScore: number;
          maxScore: number;
          feedback?: string;
        };
      }>;
      pending: Array<any>;
      completed: Array<any>;
      graded: Array<any>;
    };
  };
  completed: {
    activitiesCount: number;
    quizzesCount: number;
    totalActivities: number;
    totalQuizzes: number;
    activitiesCompletionRate: number;
    quizzesCompletionRate: number;
  };
  announcements: Array<{
    _id: string;
    title: string;
    content: string;
    createdAt: string;
    subject: string;
    author: {
      firstName: string;
      lastName: string;
      profilePicture?: string; // Added profilePicture as optional
    };
  }>;
  events: Array<{
    _id: string;
    title: string;
    header: string;
    body: string;
    startDate: string;
    endDate: string;
    priority: string;
    eventType: string;
    status: string;
  }>;
  recentGrades: Array<{
    _id: string;
    score: number;
    bonusPoints: number;
    totalScore: number;
    activity: string;
    subject: string;
    gradedAt: string;
  }>;
  summary: {
    totalSubjects: number;
    totalDuesToday: number;
    totalCompleted: number;
    totalPending: number;
    eventsToday: number;
    newAnnouncements: number;
  };
}

const DBAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user } = useAuth();
  
  const [analyticsData, setAnalyticsData] = useState<StudentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState(true);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortrait(height >= width);
    };
    
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    updateOrientation();
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/analytics/student-dashboard');
      
      if (response.data.success) {
        setAnalyticsData(response.data.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Student') {
      fetchAnalytics();
    }
  }, [user]);

  // Navigation items
  const navigationItems = [
    {
      description: 'View and complete activities tasked by your teacher.',
      Icon: ActivityIcon,
      title: 'Activity',
      onPress: () => router.replace('/(students)/activity')
    },
    {
      description: 'See the current date and view events managed by your institution.',
      Icon: CalendarIcon,
      title: 'Calendar',
      onPress: () => router.replace('/(students)/calendar-screen')
    },
    {
      description: 'Access your enrolled subjects and track your learning progress in one place.',
      Icon: CoursesIcon,
      title: 'Subjects',
      onPress: () => router.replace('/(students)/subjects')
    },
    {
      description: 'Check and monitor your grades, and review feedback from instructors.',
      Icon: GradesIcon,
      title: 'Grades',
      onPress: () => router.replace('/(students)/grades')
    },
    {
      description: 'View your school details, including their vision and mission, websites, and contact information.',
      Icon: InstitutionIcon,
      title: 'School Page',
      onPress: () => router.replace('/(students)/school-page')
    },
    {
      description: 'Manage your profile, update personal information, and customize your learning preferences.',
      Icon: ProfileIcon,
      title: 'Profile',
      onPress: () => router.replace('/(students)/profile')
    },
  ];

  // Analytics card component
  const AnalyticsCard = ({ title, value, subtitle, icon: Icon, color, onPress }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: any;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      className={`rounded-lg p-4 m-2 flex-1 min-w-[150px] ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white shadow-md'}`}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Icon width={24} height={24} fill={color} />
      </View>
      <Text className={`text-2xl font-inter_bold mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
        {value}
      </Text>
      <Text className={`text-sm font-inter_medium ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
        {title}
      </Text>
      {subtitle && (
        <Text className={`text-xs font-inter_regular ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Facebook-style card component
  const FeedCard = ({ children, className = "", ...props }: { 
    children: React.ReactNode; 
    className?: string;
    [key: string]: any;
  }) => (
    <View 
      className={`${isDarkMode ? 'bg-[#242526]' : 'bg-white'} rounded-lg shadow-sm border ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} mb-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  );

  // Facebook-style quick stats component
  const QuickStat = ({ icon: Icon, label, value, color, onPress }: {
    icon: any;
    label: string;
    value: number | string;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`p-4 rounded-lg mr-3 ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-50'} hover:opacity-80`}
      style={{ 
        minWidth: 130, // Increased minimum width
        width: Math.max(130, width * 0.25), // Increased percentage and ensure minimum
      }}
    >
      <View className="items-center">
        <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: color + '20' }}>
          <Icon width={24} height={24} fill={color} />
        </View>
        <Text className={`text-2xl font-inter_bold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
          {value}
        </Text>
        <Text className={`text-sm font-inter_medium text-center ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Facebook-style header
  const DashboardHeader = () => (
    <View className={`${isDarkMode ? 'bg-[#242526]' : 'bg-white'} border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} px-4 py-3`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              className="w-10 h-10 rounded-full mr-3"
              contentFit="cover"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-3">
              <Text className="text-white font-inter_bold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
          <View>
            <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
              Welcome back, {user?.firstName}!
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
              Your academic dashboard
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Facebook-style activity item
  const ActivityItem = ({ item, type }: { item: any; type: 'activity' | 'quiz' }) => (
    <View className={`flex-row items-center py-3 px-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'} last:border-b-0`}>
      <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{
        backgroundColor: item.status === 'graded' ? '#42B883' : 
                       item.status === 'completed' ? '#4A90E2' : 
                       type === 'quiz' ? '#8B5CF6' : '#F5A623'
      }}>
        {type === 'activity' ? 
          <ActivityIcon width={16} height={16} fill="white" /> :
          <QuizIcon width={16} height={16} fill="white" />
        }
      </View>
      <View className="flex-1">
        <Text className={`font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
          {item.title}
        </Text>
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} ellipsizeMode='tail' numberOfLines={1}>
          {item.subject} • {type === 'activity' ? `${item.points || 0} points` : `${item.questionCount || 0} questions`}
        </Text>
        {(item.grade || item.score) && (
          <Text className="text-green-500 font-inter_medium text-sm mt-1">
            {type === 'activity' ? 
              `Score: ${item.grade?.totalScore}/${item.points || 'N/A'}` :
              `Score: ${item.score?.quizScore}/${item.score?.maxScore}`
            }
          </Text>
        )}
      </View>
      <View className="items-end">
        <View className={`px-3 py-1 rounded-full ${
          item.status === 'graded' ? 'bg-green-100 dark:bg-green-900' :
          item.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900' :
          type === 'quiz' ? 'bg-purple-100 dark:bg-purple-900' :
          'bg-orange-100 dark:bg-orange-900'
        }`}>
          <Text className={`text-xs font-inter_semibold ${
            item.status === 'graded' ? 'text-green-700 dark:text-green-200' :
            item.status === 'completed' ? 'text-blue-700 dark:text-blue-200' :
            type === 'quiz' ? 'text-purple-700 dark:text-purple-200' :
            'text-orange-700 dark:text-orange-200'
          }`}>
            {item.status === 'graded' ? 'Graded' :
             item.status === 'completed' ? 'Completed' : 
             type === 'quiz' ? 'Available' : 'Pending'}
          </Text>
        </View>
        {item.status === 'pending' && item.deadline && (
          <Text className="text-red-500 font-inter_medium text-xs mt-1">
            Due: {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 font-inter_regular ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  // Show analytics dashboard for students
  if (user.role === 'Student') {
    if (loading) {
      return (
        <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
          <View className="items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className={`mt-4 font-inter_regular ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
              Loading your dashboard...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    if (error) {
      return (
        <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
          <FeedCard className="mx-4 p-6">
            <View className="items-center">
              <Text className="text-red-500 font-inter_medium text-center mb-4">{error}</Text>
              <TouchableOpacity
                onPress={fetchAnalytics}
                className="bg-[#1877F2] px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-inter_semibold">Try Again</Text>
              </TouchableOpacity>
            </View>
          </FeedCard>
        </SafeAreaView>
      );
    }

    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
        <DashboardHeader />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Quick Stats Row */}
          <View className="py-4">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingHorizontal: 16,
                paddingRight: 32 // Extra padding at the end to ensure last item is fully visible
              }}
              className="flex-row"
            >
              <QuickStat
                icon={CoursesIcon}
                label="Subjects"
                value={analyticsData?.enrolledSubjects.count || 0}
                color="#1877F2"
                onPress={() => router.push('/(students)/subjects')}
              />
              <QuickStat
                icon={CalendarIcon}
                label="Due Today"
                value={analyticsData?.summary.totalDuesToday || 0}
                color="#F5A623"
                onPress={() => router.push('/(students)/activity')}
              />
              <QuickStat
                icon={CompletedIcon}
                label="Completed"
                value={analyticsData?.summary.totalCompleted || 0}
                color="#42B883"
                onPress={() => router.push('/(students)/grades')}
              />
              <QuickStat
                icon={EventIcon}
                label="Events"
                value={analyticsData?.summary.eventsToday || 0}
                color="#8B5CF6"
                onPress={() => router.push('/(students)/calendar-screen')}
              />
            </ScrollView>
          </View>

          <View className="px-4">
            {/* Due Today Feed Card */}
            {analyticsData?.duesToday?.totalCount && analyticsData.duesToday.totalCount > 0 ? (
              <FeedCard>
                <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 items-center justify-center mr-3">
                        <CalendarIcon width={16} height={16} fill="#EF4444" />
                      </View>
                      <View className='flex-col'>
                        <View className='flex-row'>
                          <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
                            Due Today
                          </Text>
                          <TouchableOpacity 
                            onPress={() => router.push('/(students)/activity')}
                            className={`px-3 py-1 ml-auto rounded-full ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-100'}`}
                          >
                            <Text className={`text-sm font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                              View All
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} ellipsizeMode='tail' numberOfLines={1}>
                          {analyticsData.duesToday.totalCount} items require your attention
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Status Summary */}
                <View className={`px-4 py-3 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-red-500 font-inter_bold text-xl">
                        {analyticsData.duesToday.pendingCount}
                      </Text>
                      <Text className={`text-xs font-inter_medium ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        Pending
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-blue-500 font-inter_bold text-xl">
                        {analyticsData.duesToday.completedCount}
                      </Text>
                      <Text className={`text-xs font-inter_medium ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        Submitted
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-green-500 font-inter_bold text-xl">
                        {analyticsData.duesToday.gradedCount}
                      </Text>
                      <Text className={`text-xs font-inter_medium ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        Graded
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Activities and Quizzes List */}
                <View>
                  {analyticsData.duesToday.activities.all.slice(0, 3).map((activity, index) => (
                    <ActivityItem key={`activity-${index}`} item={activity} type="activity" />
                  ))}
                  {analyticsData.duesToday.quizzes.all.slice(0, 3).map((quiz, index) => (
                    <ActivityItem key={`quiz-${index}`} item={quiz} type="quiz" />
                  ))}
                  
                  {(analyticsData.duesToday.activities.all.length + analyticsData.duesToday.quizzes.all.length) > 6 && (
                    <View className="px-4 py-3">
                      <TouchableOpacity 
                        onPress={() => router.push('/(students)/activity')}
                        className="w-full py-2 items-center"
                      >
                        <Text className="text-[#1877F2] font-inter_semibold">
                          See {(analyticsData.duesToday.activities.all.length + analyticsData.duesToday.quizzes.all.length) - 6} more items
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </FeedCard>
            ) : (
              <FeedCard>
                <View className="p-6 items-center">
                  <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center mb-4">
                    <CompletedIcon width={32} height={32} fill="#42B883" />
                  </View>
                  <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    All caught up! 🎉
                  </Text>
                  <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    No activities or quizzes due today. Great job staying on top of your work!
                  </Text>
                </View>
              </FeedCard>
            )}

            {/* Progress Overview */}
            <FeedCard>
              <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                    <GradesIcon width={16} height={16} fill="#1877F2" />
                  </View>
                  <View>
                    <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Your Progress
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      Academic performance overview
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="p-4 space-y-6">
                <View>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className={`font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Activities
                    </Text>
                    <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {analyticsData?.completed.activitiesCount || 0} / {analyticsData?.completed.totalActivities || 0}
                    </Text>
                  </View>
                  <View className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-200'}`}>
                    <View 
                      className="bg-[#1877F2] h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${analyticsData?.completed.activitiesCompletionRate || 0}%` }}
                    />
                  </View>
                  <Text className={`font-inter_medium text-right text-sm mt-2 ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    {analyticsData?.completed.activitiesCompletionRate || 0}% Complete
                  </Text>
                </View>
                
                <View>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className={`font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Quizzes
                    </Text>
                    <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {analyticsData?.completed.quizzesCount || 0} / {analyticsData?.completed.totalQuizzes || 0}
                    </Text>
                  </View>
                  <View className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-200'}`}>
                    <View 
                      className="bg-[#8B5CF6] h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${analyticsData?.completed.quizzesCompletionRate || 0}%` }}
                    />
                  </View>
                  <Text className={`font-inter_medium text-right text-sm mt-2 ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    {analyticsData?.completed.quizzesCompletionRate || 0}% Complete
                  </Text>
                </View>
              </View>
            </FeedCard>

            {/* Latest Announcements */}
            {analyticsData?.announcements && analyticsData.announcements.length > 0 && (
              <FeedCard>
                <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 items-center justify-center mr-3">
                        <AnnouncementIcon width={16} height={16} fill="#F59E0B" />
                      </View>
                      <View>
                        <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                          Latest Announcements
                        </Text>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                          Stay updated with important news
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View>
                  {analyticsData.announcements.slice(0, 3).map((announcement, index) => (
                    <View key={index} className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'} last:border-b-0`}>
                      <View className="flex-row items-start">
                        {/* Author Profile Picture */}
                        {announcement.author.profilePicture ? (
                          <Image
                            source={{ uri: announcement.author.profilePicture }}
                            className="w-10 h-10 rounded-full mr-3 flex-shrink-0"
                            contentFit="cover"
                          />
                        ) : (
                          <View className="w-10 h-10 rounded-full bg-orange-500 items-center justify-center mr-3 flex-shrink-0">
                            <Text className="text-white font-inter_bold text-sm">
                              {announcement.author.firstName.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                              {announcement.author.firstName} {announcement.author.lastName}
                            </Text>
                            <Text className={`font-inter_regular text-sm ml-2 ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                              • {new Date(announcement.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text className={`font-inter_medium mb-2 ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                            {announcement.title}
                          </Text>
                          <Text className={`font-inter_regular ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                            {announcement.content.length > 150 
                              ? `${announcement.content.substring(0, 150)}...` 
                              : announcement.content
                            }
                          </Text>
                          <View className="flex-row items-center mt-2">
                            <View className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                              <Text className="text-blue-700 dark:text-blue-200 font-inter_medium text-xs">
                                {announcement.subject}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </FeedCard>
            )}

            {/* Today's Events */}
            {analyticsData?.events && analyticsData.events.length > 0 && (
              <FeedCard>
                <View className="p-4 border-b border-gray-100 dark:border-[#3A3B3C]">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
                      <EventIcon width={16} height={16} fill="#8B5CF6" />
                    </View>
                    <View>
                      <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                        Today's Events
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        Don't miss what's happening
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View>
                  {analyticsData.events.map((event, index) => (
                    <View key={index} className="p-4 border-b border-gray-100 dark:border-[#3A3B3C] last:border-b-0">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className={`font-inter_semibold mb-1 ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                            {event.title}
                          </Text>
                          <Text className={`font-inter_regular text-sm mb-2 ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                            {event.header}
                          </Text>
                          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                            {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View className={`px-2 py-1 rounded-full ml-3 ${
                          event.priority === 'high' ? 'bg-red-100 dark:bg-red-900' :
                          event.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900' :
                          'bg-green-100 dark:bg-green-900'
                        }`}>
                          <Text className={`text-xs font-inter_semibold ${
                            event.priority === 'high' ? 'text-red-700 dark:text-red-200' :
                            event.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-200' :
                            'text-green-700 dark:text-green-200'
                          }`}>
                            {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </FeedCard>
            )}

            {/* Recent Grades */}
            {analyticsData?.recentGrades && analyticsData.recentGrades.length > 0 && (
              <FeedCard>
                <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center mr-3">
                        <GradesIcon width={16} height={16} fill="#42B883" />
                      </View>
                      <View className='flex-col'>
                        <View className='flex-row'>
                          <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
                            Recent Grades
                          </Text>
                          <TouchableOpacity 
                            onPress={() => router.push('/(students)/grades')}
                            className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-100'}`}
                          >
                            <Text className={`text-sm font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                              View All
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} ellipsizeMode='tail' numberOfLines={1}>
                          Your latest academic achievements
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View>
                  {analyticsData.recentGrades.slice(0, 5).map((grade, index) => (
                    <View key={index} className={`flex-row justify-between items-center p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'} last:border-b-0`}>
                      <View className="flex-1">
                        <Text className={`font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
                          {grade.activity}
                        </Text>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} ellipsizeMode='tail' numberOfLines={1}>
                          {grade.subject} • {new Date(grade.gradedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-green-500 font-inter_bold text-lg">
                          {grade.totalScore}
                        </Text>
                        {grade.bonusPoints > 0 && (
                          <Text className="text-green-400 font-inter_medium text-xs">
                            +{grade.bonusPoints} bonus
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </FeedCard>
            )}

            {/* Quick Actions */}
            <FeedCard>
              <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-300'}`}>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                    <ProfileIcon width={16} height={16} fill="#1877F2" />
                  </View>
                  <View>
                    <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Quick Actions
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      Navigate to important sections
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="p-2">
                {navigationItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center p-3 m-1 rounded-lg ${isDarkMode ? 'bg-[#3A3B3C] hover:bg-[#4E4F50]' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                    onPress={item.onPress}
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                      <item.Icon width={20} height={20} fill="#1877F2" />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                        {item.title}
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </FeedCard>
          </View>
        </ScrollView>
        
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  // Original dashboard for non-students
  return (
    <SafeAreaView className={`flex-1 justify-center ${isPortrait ? 'items-center' : 'items-start'} ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <Text className={`text-left self-start font-inter_bold ml-[12px] mt-[12px] ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} sm:text-sm md:text-base lg:text-lg`} ellipsizeMode='tail' numberOfLines={1}>
        Welcome, {user.firstName}! Your role is: {user.role}
      </Text>
      <View className="flex-1 w-full">
        {navigationItems.map((item, index) => (
          <TouchableOpacity 
            key={index}
            className={
              `min-h-[125px] rounded-[10px] flex-row m-[12px] p-[12px]
              ${isPortrait ? 'w-auto' : 'w-[300px]'}
              ${isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-md'}`
            } 
            onPress={item.onPress}
          >
            <View>
              <item.Icon width={50} height={50} fill={`${isDarkMode ? '#E0E0E0' : 'black'}`} />
            </View>
            <View className="ml-[10px] mb-[10px] flex-shrink">
              <Text className={
                  `text-[24px] font-inter_bold mb-[3px] 
                  ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`
                }>
                  {item.title}
              </Text>
              <Text className={`text-[14px] font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default DBAndroid;
