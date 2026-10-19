import { Text, TouchableOpacity, useColorScheme, View, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/app/services/apiClient';
import NetworkBanner from '@/components/NetworkBanner.android';

// Icons for analytics
import AttachIcon from '@/assets/icons/attach.svg';
import StudentsIcon from '@/assets/icons/account.svg';
import SubjectsIcon from '@/assets/icons/course_book.svg';
import ActivitiesIcon from '@/assets/icons/activity.svg';
import GradesIcon from '@/assets/icons/grades.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';

cssInterop(Image, { className: "style" });

interface AnalyticsData {
  totalSubjects: number;
  totalStudents: number;
  totalActivities: number;
  totalQuizzes: number;
  pendingSubmissions: number;
  recentGrades: number;
  upcomingDeadlines: number;
  subjectBreakdown: Array<{
    subjectName: string;
    studentCount: number;
    activityCount: number;
    pendingCount: number;
  }>;
  recentActivity: Array<{
    type: 'submission' | 'grade' | 'quiz';
    title: string;
    student?: string;
    subject: string;
    date: string;
  }>;
  gradeDistribution: {
    excellent: number; // 90-100
    good: number;      // 80-89
    satisfactory: number; // 70-79
    needsImprovement: number; // below 70
  };
}

const DBAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user } = useAuth();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const horizontalPadding = 32;
  const columnGap = 12;
  const feedCardWidth = isLandscape ? (width - horizontalPadding - columnGap) / 2 : undefined;

  const isNetworkError = (err: any) =>
    err?.message?.toLowerCase?.().includes('network') ||
    err?.status === 0 ||
    !err?.response;

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNetworkError(false);

      // Use the new analytics endpoint
      const analyticsResponse = await apiClient.get('/analytics/teacher-dashboard');
      setAnalyticsData(analyticsResponse.data.data);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      if (isNetworkError(error)) setNetworkError(true);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  // Move these component functions INSIDE the main component so they can access isDarkMode
  
  // Facebook-style card component
  const FeedCard = ({ children, className = "", style, ...props }: { 
    children: React.ReactNode; 
    className?: string;
    style?: object;
    [key: string]: any;
  }) => (
    <View 
      className={`${isDarkMode ? 'bg-[#242526]' : 'bg-white'} rounded-lg shadow-sm border ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} mb-4 ${className}`}
      style={style}
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
      className={`p-4 rounded-lg ${isLandscape ? '' : 'mr-3'} ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-50'} hover:opacity-80`}
      style={isLandscape
        ? { flex: 1 }
        : { minWidth: 130, width: Math.max(130, width * 0.25) }
      }
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

  // Action item component
  const ActionItem = ({ icon: Icon, title, value, subtitle, color, onPress }: {
    icon: any;
    title: string;
    value: number;
    subtitle: string;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-3 rounded-lg ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-50'} ${onPress ? 'hover:opacity-80' : ''}`}
      disabled={!onPress}
    >
      <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: color + '20' }}>
        <Icon width={20} height={20} fill={color} />
      </View>
      <View className="flex-1">
        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
          {title}
        </Text>
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
          {subtitle}
        </Text>
      </View>
      <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  // Grade distribution item component
  const GradeDistributionItem = ({ label, value, color }: {
    label: string;
    value: number;
    color: string;
  }) => (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: color }} />
        <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
          {label}
        </Text>
      </View>
      <Text className={`font-inter_bold text-lg`} style={{ color }}>
        {value}
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text>Loading...</Text>
        <NetworkBanner
          forceVisible={networkError}
          onRetry={() => {
            setNetworkError(false);
            fetchAnalytics();
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading analytics...
        </Text>
        <NetworkBanner
          forceVisible={networkError}
          onRetry={() => {
            setNetworkError(false);
            fetchAnalytics();
          }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-red-500 mb-4`}>{error}</Text>
        <TouchableOpacity
          onPress={fetchAnalytics}
          className="bg-blue-500 px-4 py-2 rounded-md"
        >
          <Text className="text-white font-inter_medium">Retry</Text>
        </TouchableOpacity>
        <NetworkBanner
          forceVisible={networkError}
          onRetry={() => {
            setNetworkError(false);
            fetchAnalytics();
          }}
        />
      </View>
    );
  }

  // Update the main return section with Facebook-inspired design
  const quickStats = [
    {
      icon: SubjectsIcon,
      label: 'Subjects',
      value: analyticsData?.totalSubjects || 0,
      color: '#1877F2',
      onPress: () => router.push('/(teachers)/subjects'),
    },
    {
      icon: StudentsIcon,
      label: 'Students',
      value: analyticsData?.totalStudents || 0,
      color: '#42B883',
    },
    {
      icon: ActivitiesIcon,
      label: 'Activities',
      value: analyticsData?.totalActivities || 0,
      color: '#8B5CF6',
      onPress: () => router.push('/(teachers)/activity'),
    },
    {
      icon: () => <Image source={require('@/assets/icons/quizzes.png')} style={{ width: 24, height: 24 }} tintColor="#F59E0B" />,
      label: 'Quizzes',
      value: analyticsData?.totalQuizzes || 0,
      color: '#F59E0B',
      onPress: () => router.push('/(teachers)/quizzes'),
    },
  ];

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
      {/* Facebook-style header */}
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
                  {user?.firstName?.charAt(0) || 'T'}
                </Text>
              </View>
            )}
            <View>
              <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                Welcome back, {user.firstName}!
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                Teacher dashboard overview
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Quick Stats Row */}
        <View className="py-4 px-4">
          {isLandscape ? (
            <View className="flex-row" style={{ gap: columnGap }}>
              {quickStats.map((stat) => (
                <QuickStat key={stat.label} {...stat} />
              ))}
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              className="flex-row"
            >
              {quickStats.map((stat) => (
                <QuickStat key={stat.label} {...stat} />
              ))}
            </ScrollView>
          )}
        </View>

        <View
          className={`px-4 ${isLandscape ? 'flex-row flex-wrap' : ''}`}
          style={isLandscape ? { gap: columnGap } : undefined}
        >
          {/* Action Items Feed Card */}
          <FeedCard style={feedCardWidth ? { width: feedCardWidth } : undefined}>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 items-center justify-center mr-3">
                  <AttachIcon width={16} height={16} fill="#EF4444" />
                </View>
                <View>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    Action Items
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    Items requiring your attention
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="p-4 space-y-4">
              <ActionItem
                icon={AttachIcon}
                title="Pending Submissions"
                value={analyticsData?.pendingSubmissions || 0}
                subtitle="Need to be reviewed"
                color="#EF4444"
              />
              <ActionItem
                icon={GradesIcon}
                title="Recent Grades"
                value={analyticsData?.recentGrades || 0}
                subtitle="Grades given this week"
                color="#06B6D4"
                onPress={() => router.push('/(teachers)/grades')}
              />
              <ActionItem
                icon={CalendarIcon}
                title="Upcoming Deadlines"
                value={analyticsData?.upcomingDeadlines || 0}
                subtitle="In the next 7 days"
                color="#F97316"
                onPress={() => router.push('/(teachers)/calendar-screen')}
              />
            </View>
          </FeedCard>

          {/* Subject Overview Feed Card */}
          <FeedCard style={feedCardWidth ? { width: feedCardWidth } : undefined}>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                    <SubjectsIcon width={16} height={16} fill="#1877F2" />
                  </View>
                  <View>
                    <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Subject Overview
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      Your teaching assignments
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/(teachers)/subjects')}
                  className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-gray-100'}`}
                >
                  <Text className={`text-sm font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View>
              {analyticsData?.subjectBreakdown.map((subject, index) => (
                <View key={index} className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} last:border-b-0`}>
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                        {subject.subjectName}
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        {subject.studentCount} students • {subject.activityCount} activities
                      </Text>
                    </View>
                    {subject.pendingCount > 0 && (
                      <View className="bg-red-100 dark:bg-red-900 px-3 py-1 rounded-full">
                        <Text className="text-red-700 dark:text-red-200 text-xs font-inter_semibold">
                          {subject.pendingCount} pending
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </FeedCard>

          {/* Grade Distribution Feed Card */}
          {analyticsData?.gradeDistribution && (
            <FeedCard style={feedCardWidth ? { width: feedCardWidth } : undefined}>
              <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center mr-3">
                    <GradesIcon width={16} height={16} fill="#42B883" />
                  </View>
                  <View>
                    <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      Grade Distribution
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      Student performance overview
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className={`p-4 space-y-4`}>
                <View>
                  <GradeDistributionItem
                    label="Excellent (90-100%)"
                    value={analyticsData.gradeDistribution.excellent}
                    color="#42B883"
                  />
                </View>
                <View>
                  <GradeDistributionItem
                    label="Good (80-89%)"
                    value={analyticsData.gradeDistribution.good}
                    color="#1877F2"
                  />
                </View>
                <View>
                  <GradeDistributionItem
                    label="Satisfactory (70-79%)"
                    value={analyticsData.gradeDistribution.satisfactory}
                    color="#F59E0B"
                  />
                </View>
                <View>
                  <GradeDistributionItem
                    label="Needs Improvement (<70%)"
                    value={analyticsData.gradeDistribution.needsImprovement}
                    color="#EF4444"
                  />
                </View>
              </View>
            </FeedCard>
          )}

          {/* Recent Activity Feed Card */}
          <FeedCard style={feedCardWidth ? { width: feedCardWidth } : undefined}>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
                <Image 
                source={require('@/assets/icons/activity.png')} 
                style={{ width: 16, height: 16 }}
                tintColor="#8B5CF6"
                />
              </View>
              <View>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                Recent Activity
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                Latest classroom updates
                </Text>
              </View>
              </View>
            </View>
            
            <View>
              {analyticsData?.recentActivity.slice(0, 5).map((activity, index) => (
              <View key={index} className={`flex-row items-center p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} last:border-b-0`}>
                <View className={`w-10 h-10 rounded-full mr-3 items-center justify-center ${
                activity.type === 'submission' ? 'bg-blue-500' :
                activity.type === 'grade' ? 'bg-green-500' : 'bg-purple-500'
                }`}>
                {activity.type === 'submission' ? (
                  <AttachIcon width={16} height={16} fill="white" />
                ) : activity.type === 'grade' ? (
                  <GradesIcon width={16} height={16} fill="white" />
                ) : (
                  <Image 
                  source={require('@/assets/icons/quizzes.png')} 
                  style={{ width: 16, height: 16 }} 
                  tintColor="white"
                  />
                )}
                </View>
                <View className="flex-1">
                <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
                  {activity.title}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                {new Date(activity.date).toLocaleDateString()}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                  {activity.student ? `${activity.student} • ` : ''}{activity.subject}
                </Text>
                </View>
              </View>
              ))}
            </View>
          </FeedCard>
        </View>
      </ScrollView>

      {/* Animated network banner overlay */}
      <NetworkBanner
        forceVisible={networkError}
        onRetry={() => {
          setNetworkError(false);
          fetchAnalytics();
        }}
      />

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
}

export default DBAndroid;