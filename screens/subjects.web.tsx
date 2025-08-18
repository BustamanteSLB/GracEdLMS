import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import ContextMenu from '@/components/ContextMenu';
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  VirtualizedList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

cssInterop(Image, { className: 'style' });

const SubjectsWeb: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // ─── STATE ────────────────────────────────────────────────────────────────────
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Context‐menu for each row:
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // View Details modal:
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

  const [isPortrait, setIsPortrait] = useState(true);

  // ─── ORIENTATION LISTENER ────────────────────────────────────────────────────
  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsPortrait(height >= width);
    };
    const subscription = Dimensions.addEventListener('change', updateOrientation);
    updateOrientation();
    return () => subscription.remove();
  }, []);

  const isStudent = user?.role === 'Student';

  // ─── FILTER ENROLLED COURSES ─────────────────────────────────────────────────
  const enrolledSubjects = allSubjects.filter(subject => {
    if (!user || !subject.students) {
      return false;
    }

    // Check if student is enrolled by multiple criteria
    const isEnrolledById = subject.students.some(student => 
      typeof student === 'string' ? student === user._id : student._id === user._id
    );
    
    const isEnrolledByEmail = subject.students.some(student => 
      typeof student === 'object' && student.email === user.email
    );

    // Also check the user's enrolledSubjects array if it exists
    const isInUserEnrollment = user.enrolledSubjects?.includes(subject);

    return isEnrolledById || isEnrolledByEmail || isInUserEnrollment;
  });

  // ─── FETCH STUDENT'S ENROLLED COURSES ────────────────────────────────────────
  const fetchStudentSubjects = useCallback(async () => {
    if (!user || !isStudent) return;
    
    setLoading(true);
    try {
      console.log('Fetching subjects for student:', user._id, user.email);
      
      // First try to get subjects from the user's enrolledSubjects array
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
        // Fallback: fetch all subjects and filter on frontend
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

  // ─── HANDLE DROP COURSE ───────────────────────────────────────────────────────
  const handleDropSubject = async (subjectId: string, subjectName: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to drop "${subjectName}"? This action cannot be undone.`
    );

    if (isConfirmed) {
      try {
        await apiClient.put(`/subjects/${subjectId}/unenroll-student/${user?._id}`);
        window.alert('Success: You have been unenrolled from the subject.');
        
        // Refresh the subjects list
        fetchStudentSubjects();
        handleCloseMenu();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to drop subject';
        window.alert(`Error: ${errorMessage}`);
        console.error('Error dropping subject:', error);
      }
    } else {
      handleCloseMenu();
    }
  };

  // ─── CONTEXT MENU HELPERS ────────────────────────────────────────────────────
  const handleOpenMenu = (event: any, subject: Subject) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX - 150, y: pageY - 40 });
    setSelectedSubject(subject);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedSubject(null);
  };

  // ─── MENU ITEMS (Student can view details and drop subjects) ──────────────────
  const menuItems = [
    {
      label: 'Drop Subject',
      onPress: () => {
        if (selectedSubject) {
          handleDropSubject(selectedSubject._id, selectedSubject.subjectName);
        }
      },
      icon: (
        <Image
          className="w-[24] h-[24] mr-1"
          contentFit="contain"
          source={require('@/assets/icons/delete.png')}
          cachePolicy="memory-disk"
          tintColor="red"
        />
      ),
    },
  ];

  // ─── REFRESH HANDLER ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudentSubjects();
  };

  // ─── VIRTUALIZED LIST HELPERS ────────────────────────────────────────────────
  const getItemCount = (_data: Subject[]) => _data.length;
  const getItem = (_data: Subject[], index: number) => _data[index];

  // ─── LOADING STATES ───────────────────────────────────────────────────────────
  if (isLoading || loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#121212]' : 'bg-white'
        }`}
      >
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#121212'} />
        <Text
          className={`mt-4 text-lg font-inter_semibold ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          Loading your subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // ─── UNAUTHORIZED ACCESS ──────────────────────────────────────────────────────
  if (!isStudent) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="flex-1 justify-center items-center">
          <Text
            className={`font-inter_regular text-center ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            Access Denied. This page is only available for students.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-400 rounded-xl h-[50px] justify-center items-center mt-4 px-6"
            activeOpacity={0.7}
          >
            <Text className="text-white font-psemibold text-lg">Go Back</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // ─── NO COURSES ENROLLED ──────────────────────────────────────────────────────
  if (enrolledSubjects.length === 0) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="flex-row items-center mt-2 mx-2">
          <Text className={`font-inter_bold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            My Subjects
          </Text>
          <TouchableOpacity
            className='bg-blue-400 ml-auto p-2 h-[50px] w-[50px] rounded-xl items-center justify-center'
            onPress={handleRefresh}
          >
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              cachePolicy="memory-disk"
              tintColor='black'
            />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center items-center">
          <Image
            className="w-[150] h-[150]"
            contentFit="contain"
            source={require('@/assets/images/online-course.png')}
            cachePolicy="memory-disk"
          />
          <Text
            className={`font-inter_regular mt-4 text-center ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            {loading ? 'Loading your subjects...' : 'No subjects enrolled yet.'}
          </Text>
          {!loading && (
            <Text
              className={`font-inter_regular mt-2 text-center text-gray-500 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Contact your teacher or administrator to be enrolled in subjects.
            </Text>
          )}
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // ─── COURSE DETAILS VIEW ──────────────────────────────────────────────────────
  if (viewingSubject) {
    const teacherName = viewingSubject.teacher
      ? `${viewingSubject.teacher.firstName} ${viewingSubject.teacher.middleName ? viewingSubject.teacher.middleName + ' ' : ''}${viewingSubject.teacher.lastName}`
      : 'Not assigned';
    
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="flex-row items-center mt-2 mb-2">
          <TouchableOpacity
            onPress={() => setViewingSubject(null)}
            style={{backgroundColor: isDarkMode ? '#22c55e' : '#4ade80'}} 
            className='rounded-md px-4 py-2 ml-4 bg-green'
          >
            <View className="flex-row items-center">
              <Image
                style={{ width: 24, height: 24, marginRight: 8 }}
                source={require('@/assets/icons/left_arrow.png')}
                tintColor={isDarkMode ? '#E0E0E0' : 'white'}
              />
              <Text className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                Back
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Subject Header */}
        <View className="px-6 pt-2 pb-4">
          <Text className="font-pbold text-2xl mb-1" style={{ color: isDarkMode ? '#E0E0E0' : '#121212' }}>
            {viewingSubject.subjectName}
          </Text>
          <Text className="font-pregular text-base mb-1" style={{ color: isDarkMode ? '#E0E0E0' : '#333' }}>
            Teacher: {teacherName}
          </Text>
          <Text className="font-pregular text-base" style={{ color: isDarkMode ? '#E0E0E0' : '#333' }}>
            {viewingSubject.gradeLevel} - {viewingSubject.section} {viewingSubject.schoolYear && `(${viewingSubject.schoolYear})`}
          </Text>
          {viewingSubject.description && (
            <Text className="font-pregular text-sm mt-2" style={{ color: isDarkMode ? '#BBB' : '#666' }}>
              {viewingSubject.description}
            </Text>
          )}
        </View>
        
        <View className="flex-1 px-4 pb-4">
          <SubjectDetailsTabs 
            subject={viewingSubject} 
            isDarkMode={isDarkMode} 
            isAdminOrTeacher={false} // Students are not admin/teacher
          />
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <View className='flex-row items-center mt-2'>
        <Text className={`font-inter_bold text-lg mx-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          My Subjects
        </Text>
        <TouchableOpacity
          className={`ml-auto p-2 mr-3 rounded-md items-center justify-center ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
          onPress={handleRefresh}
        >
          <Image
            className="w-[24] h-[24]"
            contentFit="contain"
            source={require('@/assets/icons/refresh.png')}
            cachePolicy="memory-disk"
            tintColor={isDarkMode ? '#E0E0E0' : 'white'}
          />
        </TouchableOpacity>
      </View>
      
      <VirtualizedList
        data={enrolledSubjects} // Use filtered enrolled subjects
        initialNumToRender={10}
        renderItem={({ item }: { item: Subject }) => {
          // Compute initials for the colored square:
          const initials = item.subjectName.slice(0, 2).toUpperCase();
          
          // Generate a consistent color based on subject code
          const getConsistentColor = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
            return colors[Math.abs(hash) % colors.length];
          };
          const bgColor = getConsistentColor(item.subjectName);

          // Student count
          const studentCount = item.students?.length || 0;

          return (
            <TouchableOpacity
              className='flex-row p-3 mt-2 mb-2 mx-3'
              style={{
                borderLeftWidth: 8,
                borderRightWidth: 2,
                borderTopWidth: 2,
                borderBottomWidth: 2,
                borderColor: bgColor,
                backgroundColor: isDarkMode ? '#1E1E1E' : '#F9FAFB',
              }}
              onPress={() => setViewingSubject(item)}
            >
              {/* LEFT: Colored square with initials */}
              <View
                className="w-[48px] h-[48px] rounded-lg justify-center items-center"
                style={{ backgroundColor: bgColor }}
              >
                <Text className="text-white font-inter_bold text-lg">{initials}</Text>
              </View>

              {/* MIDDLE: Subject information */}
              <View className="flex-1 ml-4">
                {/* Subject Name */}
                <Text
                  className={`font-inter_bold text-lg mb-1 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                  ellipsizeMode='tail'
                  numberOfLines={1}
                >
                  {item.subjectName}
                </Text>

                {/* Grade, Section, and Grade Level */}
                <Text
                  className={`font-inter_semibold text-base mb-1 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-gray-700'
                  }`}
                >
                  {item.gradeLevel} - {item.section} {item.schoolYear && `(${item.schoolYear})`}
                </Text>

                {/* Teacher Name */}
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`font-inter_regular text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Adviser: {item.teacher ? `${item.teacher.firstName} ${item.teacher.middleName ? item.teacher.middleName + ' ' : ''}${item.teacher.lastName}` : 'Not assigned'}
                  </Text>
                </View>
              </View>

              
              {/* <Pressable
                onPress={(event) => handleOpenMenu(event, item)}
                className="p-2 ml-2 self-start"
              >
                <Image
                  className="w-[24] h-[24]"
                  contentFit="contain"
                  source={require('@/assets/icons/more_vert.png')}
                  cachePolicy="memory-disk"
                  tintColor={isDarkMode ? '#E0E0E0' : '#121212'}
                />
              </Pressable> */}
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item._id}
        getItemCount={getItemCount}
        getItem={getItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 20
        }}
      />

      {/* ─── CONTEXT MENU ─────────────────────────────────────────────────────────── */}
      {/* <ContextMenu
        visible={menuVisible}
        x={menuPosition.x}
        y={menuPosition.y}
        onClose={handleCloseMenu}
        items={menuItems}
        menuStyle={{ backgroundColor: isDarkMode ? '#333' : 'white', borderRadius: 8 }}
        itemStyle={{ paddingVertical: 10, paddingHorizontal: 15 }}
        labelStyle={{ color: isDarkMode ? '#E0E0E0' : 'black', fontSize: 14, fontFamily: 'Inter-18pt-Regular' }}
      /> */}

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default SubjectsWeb;