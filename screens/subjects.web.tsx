import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import { formatSubjectDisplay } from '@/app/utils/subjectUtils';
import NetworkBanner from '@/components/NetworkBanner.web';

cssInterop(Image, { className: 'style' });

const ITEMS_PER_PAGE = 10;

const SubjectsWeb: React.FC = () => {
  document.title = 'My Subjects - GracEdLMS';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // State
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [networkError, setNetworkError] = useState(false);

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);

  const isStudent = user?.role === 'Student';

  const isNetworkError = (err: any) =>
    err?.message?.toLowerCase?.().includes('network') ||
    err?.status === 0 ||
    !err?.response;

  // Memoized dropdown options
  const gradeLevelFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Grade Levels', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const schoolYearFilterOptions: DropdownItem[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: DropdownItem[] = [{ label: 'All School Years', value: '' }];

    const previousYear = currentYear - 1;
    options.push({ label: `${previousYear} - ${currentYear}`, value: `${previousYear} - ${currentYear}` });

    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      options.push({
        label: `${startYear} - ${endYear}`,
        value: `${startYear} - ${endYear}`
      });
    }

    return options;
  }, []);

  // Filter enrolled courses
  const enrolledSubjects = useMemo(() => {
    return allSubjects.filter(subject => {
      if (!user || !subject.students) {
        return false;
      }

      const isEnrolledById = subject.students.some(student =>
        typeof student === 'string' ? student === user._id : student._id === user._id
      );

      const isEnrolledByEmail = subject.students.some(student =>
        typeof student === 'object' && student.email === user.email
      );

      const isInUserEnrollment = user.enrolledSubjects?.includes(subject);

      return isEnrolledById || isEnrolledByEmail || isInUserEnrollment;
    });
  }, [allSubjects, user]);

  // Filter subjects based on search and filters
  const filteredSubjects = useMemo(() => {
    return enrolledSubjects.filter((subject) => {
      const matchesSearch = subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.classCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.section?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel = !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear = !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;

      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [enrolledSubjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Displayed (paginated) subjects
  const displayedSubjects = useMemo(
    () => filteredSubjects.slice(0, displayedCount),
    [filteredSubjects, displayedCount]
  );
  const hasMore = displayedCount < filteredSubjects.length;

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch {}
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredSubjects.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredSubjects.length]);

  // Fetch student's enrolled courses
  const fetchStudentSubjects = useCallback(async () => {
    if (!user || !isStudent) return;

    setLoading(true);
    setNetworkError(false);
    try {
      console.log('Fetching subjects for student:', user._id, user.email);

      if (user.enrolledSubjects && user.enrolledSubjects.length > 0) {
        console.log('Fetching subjects from user enrolledSubjects:', user.enrolledSubjects);
        const subjectPromises = user.enrolledSubjects.map(subjectId =>
          apiClient.get(`/subjects/${subjectId}`)
        );

        const subjectResponses = await Promise.all(subjectPromises);
        const studentSubjects = subjectResponses
          .filter(response => response.data.success)
          .map(response => response.data.data);

        console.log('Student subjects from enrolledSubjects:', studentSubjects);
        setAllSubjects(studentSubjects);
      } else {
        console.log('Fallback: fetching all subjects and filtering');
        const response = await apiClient.get<{ data: Subject[] }>('/subjects');

        if (response.data) {
          const subjectsData = response.data.data || [];
          console.log('All subjects received:', subjectsData.length);
          setAllSubjects(subjectsData);
        }
      }
      setDisplayedCount(ITEMS_PER_PAGE);
    } catch (error: any) {
      console.error('Failed to fetch student subjects:', error);
      if (isNetworkError(error)) setNetworkError(true);
      window.alert('Error: Failed to load your subjects.');
      setAllSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isStudent]);

  useEffect(() => {
    if (isStudent) {
      fetchStudentSubjects();
    }
  }, [fetchStudentSubjects, isStudent]);

  useFocusEffect(
    useCallback(() => {
      if (isStudent) {
        fetchStudentSubjects();
      }
    }, [fetchStudentSubjects, isStudent])
  );

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudentSubjects();
  };

  // Get consistent color
  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };

  // Render subject item
  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);

    // Get adviser names with term info from teachers array
    const adviserInfo = item.teachers?.map((ta: any) => {
      const teacher = ta.teacher as any;
      const fullName = teacher?.middleName
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;

      // If assigned to all terms, just show name
      if (ta.isAssignedToAllTerms) {
        return fullName;
      }

      // Otherwise, show name with terms
      const terms = [];
      if (ta.terms?.[1]) terms.push("1st");
      if (ta.terms?.[2]) terms.push("2nd");
      if (ta.terms?.[3]) terms.push("3rd");

      if (terms.length > 0) {
        return `${fullName} (${terms.join(", ")} Term${terms.length > 1 ? "s" : ""})`;
      }
      return fullName;
    }).join(", ") || "Not assigned";

    return (
      <TouchableOpacity
        className={`rounded-xl p-4 mb-3 mx-3 border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => router.push(`/(students)/subjects/${item._id}` as any)}
      >
        <View className="flex-row items-start">
          <View className="flex-row flex-1">
            {/* Icon or Image */}
            {item.subjectImage ? (
              <Image
                source={{ uri: item.subjectImage }}
                className="w-[50px] h-[50px] rounded-lg"
                contentFit="cover"
              />
            ) : (
              <View
                className="w-[50px] h-[50px] rounded-lg justify-center items-center"
                style={{ backgroundColor: bgColor }}
              >
                <Text className="text-white font-inter_bold text-lg">{initials}</Text>
              </View>
            )}

            {/* Content */}
            <View className="flex-1 ml-3">
              <Text
                className={`text-lg font-inter_bold mb-1 ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}
                numberOfLines={1}
              >
                {formatSubjectDisplay(item)}
              </Text>
              <Text className={`text-sm font-inter_semibold mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                {item.gradeLevel} - {item.section}
              </Text>
              <Text className={`text-sm font-inter_semibold mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                S.Y {item.schoolYear}
              </Text>
              <Text
                className={`text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}
                numberOfLines={2}
              >
                Adviser: {adviserInfo}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ---- List header (scrolls with the list now) ----
  const listHeader = useMemo(() => (
    <View className={`px-5 pt-5 pb-4 mb-3 border-b ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}>
      <View className="flex-row justify-between items-center">
        <View style={{ flex: 1 }}>
          <Text className={`text-2xl font-inter_bold ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>
            My Subjects
          </Text>
          <Text className={`text-sm font-inter_regular mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Showing {displayedSubjects.length} of {filteredSubjects.length} enrolled subjects
          </Text>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={loading || refreshing}
          className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
        >
          <Image
            source={require('@/assets/icons/refresh.png')}
            className="w-[24] h-[24]"
            tintColor="white"
            style={{
              transform: loading || refreshing ? [{ rotate: '180deg' }] : [{ rotate: '0deg' }]
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View className="mt-4">
        <View className="flex-row mb-3">
          <View className="flex-1 mr-2">
            <TextInput
              placeholder="Search subjects..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`px-3 py-2.5 h-[45px] rounded-lg font-inter_regular ${
                isDarkMode ? 'bg-[#2A2A2A] text-[#E0E0E0]' : 'bg-[#F3F4F6] text-[#111827]'
              }`}
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            />
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-[#10B981] px-4 py-2 rounded-lg justify-center items-center h-[45px]"
          >
            <Text className="text-white font-inter_semibold">Search</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2">
          {/* Grade Level Filter */}
          <View className="flex-1">
            <Text className={`text-xs font-inter_medium mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#6B7280]'}`}>
              Grade Level
            </Text>
            <Dropdown
              data={gradeLevelFilterOptions}
              selectedValue={selectedGradeLevel}
              onValueChange={setSelectedGradeLevel}
              placeholder="All Grade Levels"
            />
          </View>

          {/* School Year Filter */}
          <View className="flex-1">
            <Text className={`text-xs font-inter_medium mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#6B7280]'}`}>
              School Year
            </Text>
            <Dropdown
              data={schoolYearFilterOptions}
              selectedValue={selectedSchoolYear}
              onValueChange={setSelectedSchoolYear}
              placeholder="All School Years"
            />
          </View>
        </View>
      </View>
    </View>
  ), [isDarkMode, searchQuery, selectedGradeLevel, selectedSchoolYear, displayedSubjects.length, filteredSubjects.length, gradeLevelFilterOptions, schoolYearFilterOptions, handleRefresh, loading, refreshing]);

  // ---- List empty ----
  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View className="py-10 items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className={`mt-4 text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Loading your subjects...
          </Text>
        </View>
      );
    }
    return (
      <View className="justify-center items-center p-5" style={{ minHeight: 300 }}>
        <Image
          source={require('@/assets/images/online-course.png')}
          className="w-[64] h-[64] mb-4"
        />
        <Text className={`text-lg font-inter_semibold mb-2 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          No subjects found
        </Text>
        <Text className={`text-sm font-inter_regular text-center ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
          {searchQuery || selectedGradeLevel || selectedSchoolYear
            ? 'Try adjusting your filters'
            : 'Contact your teacher or administrator to be enrolled in subjects'}
        </Text>
      </View>
    );
  }, [loading, isDarkMode, searchQuery, selectedGradeLevel, selectedSchoolYear]);

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
            Loading more subjects...
          </Text>
        </>
      ) : !hasMore && filteredSubjects.length > ITEMS_PER_PAGE ? (
        <Text style={{
          fontSize: 12,
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#6B7280' : '#9CA3AF',
        }}>
          All {filteredSubjects.length} subjects loaded
        </Text>
      ) : null}
    </View>
  ), [isLoadingMore, isDarkMode, hasMore, filteredSubjects.length]);

  // Loading states
  if (isLoading || (loading && allSubjects.length === 0)) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          Loading your subjects...
        </Text>
        <NetworkBanner
          forceVisible={networkError}
          onRetry={() => {
            setNetworkError(false);
            fetchStudentSubjects();
          }}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Unauthorized access
  if (!isStudent) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <View className="flex-1 justify-center items-center p-5">
          <Text className={`text-lg font-inter_semibold mb-4 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Access Denied
          </Text>
          <Text className={`text-sm font-inter_regular text-center ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
            This page is only available for students.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-[#3B82F6] rounded-lg px-6 py-3 mt-4"
          >
            <Text className="text-white font-inter_semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
      {/* Entire screen scrolls as one unit via FlatList */}
      <FlatList
        ref={listRef}
        data={displayedSubjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        initialNumToRender={ITEMS_PER_PAGE}
        maxToRenderPerBatch={ITEMS_PER_PAGE}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />

      {/* Animated network banner overlay */}
      <NetworkBanner
        forceVisible={networkError}
        onRetry={() => {
          setNetworkError(false);
          fetchStudentSubjects();
        }}
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
};

export default SubjectsWeb;