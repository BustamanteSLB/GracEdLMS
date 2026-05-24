import { Text, TouchableOpacity, useColorScheme, View, ScrollView, Platform, useWindowDimensions, ActivityIndicator, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/app/services/apiClient';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';

// Icons
import AccountIcon from '@/assets/icons/account.svg';
import ActivityIcon from '@/assets/icons/activity.svg';
import ArchiveIcon from '@/assets/icons/archive.svg';
import CoursesIcon from '@/assets/icons/course_book.svg';
import CalendarIcon from '@/assets/icons/calendar_month.svg';
import GradesIcon from '@/assets/icons/grades.svg';
import InstitutionIcon from '@/assets/icons/institution.svg';
import StudentsIcon from '@/assets/icons/students.svg';
import TeachersIcon from '@/assets/icons/teacher.svg';
import HonorIcon from '@/assets/icons/award.svg';
import DownIcon from '@/assets/icons/down.svg';

cssInterop(Image, { className: "style" });

interface AdminAnalyticsData {
  schoolYear: string;
  selectedGrade: string;
  enrollmentByGrade: Array<{
    grade: string;
    enrolledStudents: number;
    totalSubjects: number;
  }>;
  teachersByGrade: Array<{
    grade: string;
    teachers: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      userId: string;
      subjectsCount: number;
    }>;
    totalTeachers: number;
  }>;
  selectedGradeStudents: {
    total: number;
    female: Array<any>;
    male: Array<any>;
    femaleCount: number;
    maleCount: number;
  };
  honorStudents: {
    students: Array<{
      profilePicture: any;
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      userId: string;
      sex: string;
      averageGrade: number;
      totalSubjects: number;
    }>;
    count: number;
  };
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalSubjects: number;
    availableSchoolYears: string[];
  };
}

const DBAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { user } = useAuth();
  
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const { width } = useWindowDimensions();

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedSchoolYear) {
        params.schoolYear = selectedSchoolYear;
      }
      if (selectedGrade) {
        params.gradeLevel = selectedGrade;
      }

      const response = await apiClient.get('/analytics/admin-dashboard', { params });
      
      if (response.data.success) {
        setAnalyticsData(response.data.data);
        
        // Set default school year if not selected
        if (!selectedSchoolYear && response.data.data.summary.availableSchoolYears.length > 0) {
          setSelectedSchoolYear(response.data.data.summary.availableSchoolYears[0]);
        }
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSchoolYear, selectedGrade]);

  // Navigation items
  const navigationItems = [
    {
      description: 'Add, update, delete, and store user information.',
      Icon: AccountIcon,
      title: 'User Management',
      onPress: () => router.replace('/(admins)/user-management')
    },
    {
      description: 'Manage subjects, manage subject content, and track student progress in one place.',
      Icon: CoursesIcon,
      title: 'Subjects',
      onPress: () => router.replace('/(admins)/subjects')
    },
    {
      description: 'View archived users and decide whether to restore or delete them.',
      Icon: ArchiveIcon,
      title: 'Archives',
      onPress: () => router.replace('/(admins)/archives')
    },
    {
      description: 'View archived subjects and decide whether to restore or delete them.',
      Icon: ArchiveIcon,
      title: 'Subject Archives',
      onPress: () => router.replace('/(admins)/subject-archives')
    },
    {
      description: 'Check the current date, and manage events for all users.',
      Icon: CalendarIcon,
      title: 'Calendar',
      onPress: () => router.replace('/(admins)/calendar-screen')
    },
  ];

  // Move component functions inside the main component to access isDarkMode
  
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
                {user?.firstName?.charAt(0) || 'A'}
              </Text>
            </View>
          )}
          <View>
            <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`} ellipsizeMode='tail' numberOfLines={1}>
              Welcome back, {user?.firstName}!
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
              Admin dashboard overview
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Filter card component
  const FilterCard = () => (
    <FeedCard>
      <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
            <Image 
              source={require('@/assets/icons/filter.png')} 
              style={{ width: 16, height: 16 }}
              tintColor="#8B5CF6"
            />
          </View>
          <View>
            <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
              Filters
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
              Customize your data view
            </Text>
          </View>
        </View>
      </View>
      
      <View className="p-4">
        <View className="flex-row gap-4">
          {/* School Year Dropdown */}
          <View className="flex-1">
            <Text className={`font-inter_medium text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              School Year
            </Text>
            <DropdownMobile
              label="School Year"
              selectedValue={selectedSchoolYear}
              onValueChange={setSelectedSchoolYear}
              items={analyticsData?.summary.availableSchoolYears.map(year => ({
                label: year,
                value: year,
                leftIcon: CalendarIcon,
                iconSize: 18
              })) || []}
              placeholder="Select..."
              buttonLeftIcon={CalendarIcon}
              buttonRightIcon={DownIcon}
              modalLeftIcon={CalendarIcon}
            />
          </View>

          {/* Grade Level Dropdown */}
          <View className="flex-1">
            <Text className={`font-inter_medium text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Grade Level
            </Text>
            <DropdownMobile
              label="Grade Level"
              selectedValue={selectedGrade}
              onValueChange={setSelectedGrade}
              items={[1, 2, 3, 4, 5, 6].map(grade => ({
                label: `Grade ${grade}`,
                value: `Grade ${grade}`,
                leftIcon: GradesIcon,
                iconSize: 18
              }))}
              placeholder="Select grade..."
              buttonLeftIcon={GradesIcon}
              buttonRightIcon={DownIcon}
              modalLeftIcon={GradesIcon}
            />
          </View>
        </View>
      </View>
    </FeedCard>
  );

  if (!user) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 font-inter_regular ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
          Loading...
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
        <View className="items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className={`mt-4 font-inter_regular ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
            Loading analytics...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-[#18191A]' : 'bg-[#F0F2F5]'}`}>
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
      </View>
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
        {/* Quick Stats Row - Horizontally scrollable */}
        <View className="py-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            className="flex-row"
          >
            <QuickStat
              icon={StudentsIcon}
              label="Total Students"
              value={analyticsData?.summary.totalStudents || 0}
              color="#10B981"
            />
            <QuickStat
              icon={TeachersIcon}
              label="Total Teachers"
              value={analyticsData?.summary.totalTeachers || 0}
              color="#3B82F6"
            />
            <QuickStat
              icon={CoursesIcon}
              label="Total Subjects"
              value={analyticsData?.summary.totalSubjects || 0}
              color="#8B5CF6"
            />
            <QuickStat
              icon={HonorIcon}
              label="Honor Students"
              value={analyticsData?.honorStudents.count || 0}
              color="#F59E0B"
            />
          </ScrollView>
        </View>

        <View className="px-4">
          {/* Filters */}
          <FilterCard />

          {/* Enrollment by Grade */}
          <FeedCard>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                  <StudentsIcon width={16} height={16} fill="#1877F2" />
                </View>
                <View>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    Student Enrollment by Grade
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    {selectedSchoolYear} academic year
                  </Text>
                </View>
              </View>
            </View>
            
            <View>
              {analyticsData?.enrollmentByGrade.map((enrollment, index) => (
                <View key={index} className={`flex-row justify-between items-center p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} last:border-b-0`}>
                  <View className="flex-1">
                    <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {enrollment.grade}
                    </Text>
                    <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                      {enrollment.totalSubjects} subjects
                    </Text>
                  </View>
                  <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    {enrollment.enrolledStudents}
                  </Text>
                </View>
              ))}
            </View>
          </FeedCard>

          {/* Teachers by Grade */}
          <FeedCard>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center mr-3">
                  <TeachersIcon width={16} height={16} fill="#10B981" />
                </View>
                <View>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    Teachers by Grade Level
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    Teaching staff distribution
                  </Text>
                </View>
              </View>
            </View>
            
            <View>
              {analyticsData?.teachersByGrade.map((gradeTeachers, index) => (
                <View key={index} className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} last:border-b-0`}>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {gradeTeachers.grade}
                    </Text>
                    <Text className={`font-inter_bold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                      {gradeTeachers.totalTeachers} teachers
                    </Text>
                  </View>
                  {gradeTeachers.teachers.map((teacher, teacherIndex) => (
                    <View key={teacherIndex} className={`ml-4 py-2 pl-3 border-l-2 ${teacherIndex < gradeTeachers.teachers.length - 1 ? 'mb-2' : ''}`} style={{ borderLeftColor: '#1877F2' }}>
                      <Text className={`font-inter_medium ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                        {teacher.firstName} {teacher.lastName}
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        {teacher.email} • {teacher.subjectsCount} subjects
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </FeedCard>

          {/* Students by Gender */}
          <FeedCard>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
                  <StudentsIcon width={16} height={16} fill="#8B5CF6" />
                </View>
                <View>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    {selectedGrade} Students by Gender
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    Gender distribution analysis
                  </Text>
                </View>
              </View>
            </View>
            
            <View className="p-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <View style={{
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? 'rgba(190, 24, 93, 0.2)' : '#FCE7F3'
                  }}>
                    <Text style={{
                      fontFamily: 'Inter-24pt-Bold',
                      fontSize: 24,
                      lineHeight: 32,
                      marginBottom: 4,
                      color: isDarkMode ? '#FBCFE8' : '#BE185D'
                    }}>
                      {analyticsData?.selectedGradeStudents.femaleCount || 0}
                    </Text>
                    <Text style={{
                      fontFamily: 'Inter-18pt-Medium',
                      color: isDarkMode ? '#F9A8D4' : '#BE1E6B'
                    }}>
                      Female Students
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <View style={{
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : '#DBEAFE'
                  }}>
                    <Text style={{
                      fontFamily: 'Inter-24pt-Bold',
                      fontSize: 24,
                      lineHeight: 32,
                      marginBottom: 4,
                      color: isDarkMode ? '#BFDBFE' : '#1E3A8A'
                    }}>
                      {analyticsData?.selectedGradeStudents.maleCount || 0}
                    </Text>
                    <Text style={{
                      fontFamily: 'Inter-18pt-Medium',
                      color: isDarkMode ? '#93C5FD' : '#1D4ED8'
                    }}>
                      Male Students
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </FeedCard>

          {/* Honor Students */}
          <FeedCard>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 items-center justify-center mr-3">
                <HonorIcon width={16} height={16} fill="#F59E0B" />
              </View>
              <View>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                Honor Students - {selectedGrade}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                Students with 90% average or above
                </Text>
              </View>
              </View>
            </View>
            
            <View>
              {analyticsData?.honorStudents.students.length === 0 ? (
                <View className="p-6 items-center">
                  <Text className={`font-inter_regular ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    No honor students found for {selectedGrade}
                  </Text>
                </View>
              ) : (
                analyticsData?.honorStudents.students.map((student, index) => (
                  <View key={index} className={`flex-row items-center p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'} last:border-b-0`}>
                    {student.profilePicture ? (
                      <Image
                        source={{ uri: student.profilePicture }}
                        className="w-12 h-12 rounded-full mr-3"
                        contentFit="cover"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-3">
                        <Text className="text-white font-inter_bold text-lg">
                          {student.firstName?.charAt(0) || 'S'}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                        {student.firstName} {student.lastName}
                      </Text>
                      <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        ID: {student.userId}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-green-500 font-inter_bold text-xl">
                        {student.averageGrade}%
                      </Text>
                      <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                        Average
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </FeedCard>

          {/* Quick Actions */}
          <FeedCard>
            <View className={`p-4 border-b ${isDarkMode ? 'border-[#3A3B3C]' : 'border-gray-200'}`}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
                  <AccountIcon width={16} height={16} fill="#1877F2" />
                </View>
                <View>
                  <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'}`}>
                    Quick Actions
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'}`}>
                    Navigate to admin sections
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

export default DBAndroid;