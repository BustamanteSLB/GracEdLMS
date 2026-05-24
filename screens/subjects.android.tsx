import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropdownMobile from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';

cssInterop(Image, { className: 'style' });

// Memoized Subject Item Component
const SubjectItem = memo<{
  item: Subject;
  isDarkMode: boolean;
  onPress: (subject: Subject) => void;
  getConsistentColor: (str: string) => string;
}>(({ item, isDarkMode, onPress, getConsistentColor }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const initials = item.subjectName.slice(0, 2).toUpperCase();
  const bgColor = getConsistentColor(item.subjectName);
  
  const studentCount = item.students?.length || 0;
  const maleCount = item.students?.filter(s => s.sex === 'Male').length || 0;
  const femaleCount = item.students?.filter(s => s.sex === 'Female').length || 0;
  
  const studentBreakdown = [
    maleCount > 0 ? `${maleCount} boy${maleCount !== 1 ? 's' : ''}` : null,
    femaleCount > 0 ? `${femaleCount} girl${femaleCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  // Get teacher names from teachers array
  const getTeacherNames = (subject: Subject): string => {
    if (!subject.teachers || subject.teachers.length === 0) {
      return 'No teacher assigned';
    }

    return subject.teachers.map((ta) => {
      const teacher = ta.teacher;
      if (!teacher) return 'Unknown';
      
      return teacher.middleName 
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;
    }).join(', ');
  };

  return (
    <TouchableOpacity
      style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333333' : '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {/* Subject Image or Icon */}
          {item.subjectImage ? (
            <Image
              source={{ uri: item.subjectImage }}
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
              <Text style={{ 
                color: 'white', 
                fontSize: 18, 
                fontFamily: 'Inter-Bold' 
              }}>
                {initials}
              </Text>
            </View>
          )}

          {/* Content */}
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
              {item.subjectName}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 4,
              }}
            >
              {item.gradeLevel} - {item.section}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 4,
              }}
            >
              S.Y {item.schoolYear}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 2,
              }}
            >
              Teacher: {getTeacherNames(item)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
            >
              {studentCount} student{studentCount !== 1 ? 's' : ''}
              {studentBreakdown && ` / ${studentBreakdown}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

SubjectItem.displayName = 'SubjectItem';

const SubjectsAndroid: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // State
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');

  // View Details modal
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

  const isStudent = user?.role === 'Student';

  // Memoized dropdown options
  const gradeLevelFilterOptions = useMemo(() => [
    { label: 'All Grade Levels', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const schoolYearFilterOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [{ label: 'All School Years', value: '' }];
    
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

  // Filter enrolled subjects
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

      const isInUserEnrollment = user.enrolledSubjects?.includes(subject._id);

      return isEnrolledById || isEnrolledByEmail || isInUserEnrollment;
    });
  }, [allSubjects, user]);

  // Filter subjects based on search and filters
  const filteredSubjects = useMemo(() => {
    return enrolledSubjects.filter((subject) => {
      const matchesSearch = subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.section?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel = !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear = !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      
      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [enrolledSubjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Fetch student's enrolled subjects
  const fetchStudentSubjects = useCallback(async () => {
    if (!user || !isStudent) return;
    
    setLoading(true);
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
    } catch (error) {
      console.error('Failed to fetch student subjects:', error);
      setAllSubjects([]);
    } finally {
      setLoading(false);
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

  // Handlers
  const handleViewSubject = useCallback((subject: Subject) => {
    router.push(`/(students)/subjects/${subject._id}` as any);
  }, [router]);

  // Memoized color generator
  const getConsistentColor = useCallback((str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Optimized render subject item
  const renderSubjectItem = useCallback(({ item }: { item: Subject }) => (
    <SubjectItem
      item={item}
      isDarkMode={isDarkMode}
      onPress={handleViewSubject}
      getConsistentColor={getConsistentColor}
    />
  ), [isDarkMode, handleViewSubject, getConsistentColor]);

  const keyExtractor = useCallback((item: Subject) => item._id, []);

  // Loading state
  if (isLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB', justifyContent: 'center', alignItems: 'center' }} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ 
          marginTop: 16, 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#9CA3AF' : '#6B7280' 
        }}>
          Loading your subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Unauthorized access
  if (!isStudent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ 
            fontSize: 18, 
            fontFamily: 'Inter-SemiBold',
            color: isDarkMode ? '#9CA3AF' : '#6B7280', 
            marginBottom: 16 
          }}>
            Access Denied
          </Text>
          <Text style={{ 
            fontSize: 14, 
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#6B7280' : '#9CA3AF',
            textAlign: 'center' 
          }}>
            This page is only available for students.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 16,
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontFamily: 'Inter-SemiBold' 
            }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }} edges={['left', 'right']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 16,
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
              My Subjects
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              marginTop: 4 
            }}>
              Showing {filteredSubjects.length} of {enrolledSubjects.length} subjects
            </Text>
          </View>
          
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={fetchStudentSubjects}
            disabled={loading}
            style={{
              backgroundColor: '#EF4444',
              padding: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                placeholder="Search subjects..."
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
              onPress={fetchStudentSubjects}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontFamily: 'Inter-SemiBold' 
              }}>
                Search
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Grade Level Filter */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                Grade Level
              </Text>
              <DropdownMobile
                label="Grade Level"
                selectedValue={selectedGradeLevel}
                onValueChange={setSelectedGradeLevel}
                items={gradeLevelFilterOptions}
                placeholder="All Grade Levels"
                buttonRightIcon={DownIcon}
              />
            </View>

            {/* School Year Filter */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                School Year
              </Text>
              <DropdownMobile
                label="School Year"
                selectedValue={selectedSchoolYear}
                onValueChange={setSelectedSchoolYear}
                items={schoolYearFilterOptions}
                placeholder="All School Years"
                buttonRightIcon={DownIcon}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {filteredSubjects.length > 0 ? (
          <FlashList
            data={filteredSubjects}
            renderItem={renderSubjectItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            extraData={isDarkMode}
            estimatedItemSize={120}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/online-course.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontFamily: 'Inter-SemiBold',
              color: isDarkMode ? '#9CA3AF' : '#6B7280', 
              marginBottom: 8 
            }}>
              No subjects found
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#6B7280' : '#9CA3AF', 
              textAlign: 'center',
              paddingHorizontal: 20,
            }}>
              {searchQuery || selectedGradeLevel || selectedSchoolYear
                ? 'Try adjusting your filters'
                : enrolledSubjects.length === 0 
                  ? 'You are not enrolled in any subjects yet. Contact your teacher to be enrolled.'
                  : 'No subjects match your criteria'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default memo(SubjectsAndroid);