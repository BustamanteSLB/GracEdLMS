// subjects.web.tsx
import apiClient from '@/app/services/apiClient'; // Adjust this path if needed
import { Subject } from '@/app/types/index'; // Ensure this type matches your backend payload
import ContextMenu from '@/components/ContextMenu'; // Your context menu component
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

cssInterop(Image, { className: 'style' });

interface SubjectForm {
  subjectName: string;
  description: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  teacherIdentifier?: string;
}

const SubjectsAndroid: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // ─── STATE ────────────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Context‐menu for each row:
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Add/Edit modal:
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  // View Details modal:
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

  // Form fields for Add/Edit:
  const [subjectName, setSubjectName] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [teacherIdentifier, setTeacherIdentifier] = useState('');

  const [isPortrait, setIsPortrait] = useState(true);

  // ─── SCHOOL YEAR GENERATION ──────────────────────────────────────────────────
  const generateSchoolYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const schoolYears = [];
    
    // Add previous school year
    const previousYear = currentYear - 1;
    schoolYears.push(`${previousYear} - ${currentYear}`);
    
    // Add current school year and next 3 years
    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      schoolYears.push(`${startYear} - ${endYear}`);
    }
    
    return schoolYears;
  };

  const schoolYearOptions = generateSchoolYearOptions();

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

  const isTeacher = user?.role === 'Teacher';

  // ─── FETCH TEACHER'S COURSES ─────────────────────────────────────────────────
  const fetchTeacherSubjects = useCallback(async () => {
    if (!user || !isTeacher) return;
    
    setLoading(true);
    try {
      // Fetch all subjects and filter on frontend for subjects assigned to this teacher
      const response = await apiClient.get<{ data: Subject[] }>('/subjects');
      
      // Filter subjects where the current teacher is assigned or created them
      const teacherSubjects = response.data.data.filter(subject => 
        subject.teacher?._id === user._id || 
        subject.teacher?.email === user.email ||
        subject.teacher?.username === user.username
      );
      
      setSubjects(teacherSubjects);
    } catch (error) {
      console.error('Failed to fetch teacher subjects:', error);
      window.alert('Error: Failed to load your subjects.');
    } finally {
      setLoading(false);
    }
  }, [user, isTeacher]);

  useEffect(() => {
    if (isTeacher) {
      fetchTeacherSubjects();
    }
  }, [fetchTeacherSubjects, isTeacher]);

  // ─── HANDLE ADD/EDIT COURSE ───────────────────────────────────────────────────
  const handleAddSubject = () => {
    if (subjects.length >= 10) {
      window.alert('You can only create up to 10 subjects. Please delete an existing subject before adding a new one.');
      return;
    } else {
      setIsEditing(false);
      setCurrentSubject(null);
      setSubjectName('');
      setDescription('');
      setGradeLevel('');
      setSection('');
      setSchoolYear('');
      // Auto-assign the current teacher
      setTeacherIdentifier(user?.email || '');
      setModalVisible(true);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setIsEditing(true);
    setCurrentSubject(subject);
    setSubjectName(subject.subjectName);
    setDescription(subject.description || '');
    setGradeLevel(subject.gradeLevel || '');
    setSection(subject.section || '');
    setSchoolYear(subject.schoolYear || '');
    setTeacherIdentifier(
      subject.teacher?.username || subject.teacher?.email || subject.teacher?._id || ''
    );
    setModalVisible(true);
    handleCloseMenu();
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const confirmArchive = window.confirm(
      'Are you sure you want to delete this subject? This action cannot be undone and will delete related activities, materials, and grades.'
    );
    if (confirmArchive) {
      try {
        await apiClient.delete(`/subjects/${subjectId}`);
        window.alert('Success: Subject deleted successfully.');
        handleCloseMenu();
        fetchTeacherSubjects();
      } catch (error) {
        console.error('Failed to delete subject:', error);
        window.alert('Error: Failed to delete subject.');
      }
    } else {
      handleCloseMenu();
    }
  };

  const handleSubmit = async () => {
    if (!subjectName.trim() || !schoolYear.trim()) {
      window.alert('Error: Subject name and school year are required.');
      return;
    }

    const formData: SubjectForm = {
      subjectName: subjectName.trim(),
      description: description.trim(),
      gradeLevel: gradeLevel.trim(),
      section: section.trim(),
      schoolYear: schoolYear.trim(),
    };

    // Auto-assign current teacher if no teacher specified
    if (teacherIdentifier.trim()) {
      formData.teacherIdentifier = teacherIdentifier.trim();
    } else {
      formData.teacherIdentifier = user?.email || '';
    }

    try {
      if (isEditing && currentSubject) {
        await apiClient.put(`/subjects/${currentSubject._id}`, formData);
        window.alert('Success: Subject updated successfully.');
      } else {
        await apiClient.post('/subjects', formData);
        window.alert('Success: Subject created successfully.');
      }
      setModalVisible(false);
      fetchTeacherSubjects();
    } catch (error: any) {
      console.error('Failed to save subject:', error.response?.data || error.message);
      const backendErrorMessage = error.response?.data?.message;
      if (backendErrorMessage && backendErrorMessage.includes('Duplicate field value entered') && backendErrorMessage.includes('subjectName')) {
        window.alert('Error: Subject name already exists. Please use a different name.');
      } else {
        window.alert('Error: ' + (backendErrorMessage || 'Failed to save subject.'));
      }
    }
  };

  // ─── CONTEXT MENU HELPERS ────────────────────────────────────────────────────
  const handleOpenMenu = (event: any, subject: Subject) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX - 170, y: pageY - 70 });
    setSelectedSubject(subject);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedSubject(null);
  };

  // ─── MENU ITEMS (Teacher can add/edit/delete subjects) ────────────────────────
  const menuItems = [
    {
      label: 'Edit Subject',
      onPress: () => {
        if (selectedSubject) {
          handleEditSubject(selectedSubject);
        }
      },
      icon: (
        <Image
          className="w-[24] h-[24] mr-1"
          contentFit="contain"
          source={require('@/assets/icons/edit.png')}
          cachePolicy="memory-disk"
          tintColor={isDarkMode ? '#E0E0E0' : '#121212'}
        />
      ),
    },
    {
      label: 'Delete Subject',
      onPress: () => {
        if (selectedSubject) {
          handleDeleteSubject(selectedSubject._id);
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
  if (!isTeacher) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="flex-1 justify-center items-center">
          <Text
            className={`font-inter_regular text-center ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            Access Denied. This page is only available for teachers.
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

  // ─── NO COURSES ASSIGNED ──────────────────────────────────────────────────────
  if (subjects.length === 0) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="mt-2 mb-2">
          <Text
            className={`font-inter_bold mx-4 my-2 text-lg ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            My Subjects
          </Text>
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
            No subjects created yet.
          </Text>
          <Text
            className={`font-inter_regular mt-2 text-center text-gray-500 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Start by creating your first subject!
          </Text>
          <TouchableOpacity
            onPress={handleAddSubject}
            className="bg-blue-400 rounded-xl h-[50px] justify-center items-center mt-4 px-6"
            activeOpacity={0.7}
          >
            <Text className="text-white font-psemibold text-lg">Create Subject</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        {/* Add/Edit Subject Modal */}
        {modalVisible && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              className="flex-1 justify-center items-center p-4"
            >
              <View
                className={`rounded-lg p-4 w-full max-w-xl ${
                  isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-lg'
                }`}
              >
                <Text
                  className={`font-inter_bold text-lg text-center ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  {isEditing ? 'Edit Subject' : 'Create New Subject'}
                </Text>

                {/* Subject Name */}
                <Text
                  className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  Subject Name:
                </Text>
                <TextInput
                  className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                    isDarkMode
                      ? 'bg-[#1E1E1E] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}
                  placeholder="Enter subject name"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={subjectName}
                  onChangeText={setSubjectName}
                />

                {/* Grade Level */}
                <Text
                  className={`font-inter_semibold ml-1 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  Grade Level:
                </Text>
                <Picker
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                    borderWidth: 1,
                    borderRadius: 8,
                    color: isDarkMode ? '#E0E0E0' : 'black',
                    width: '100%',
                    fontFamily: 'Inter-18pt-Regular',
                    fontSize: 14,
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 4,
                    marginBottom: 8,
                  }}
                  selectedValue={gradeLevel}
                  onValueChange={(itemValue) => setGradeLevel(itemValue)}
                  dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                  mode="dropdown"
                >
                  <Picker.Item label="Select Grade Level" value="" />
                  <Picker.Item label="Grade 1" value="Grade 1" />
                  <Picker.Item label="Grade 2" value="Grade 2" />
                  <Picker.Item label="Grade 3" value="Grade 3" />
                  <Picker.Item label="Grade 4" value="Grade 4" />
                  <Picker.Item label="Grade 5" value="Grade 5" />
                  <Picker.Item label="Grade 6" value="Grade 6" />
                </Picker>

                {/* Section */}
                <Text
                  className={`font-inter_semibold ml-1 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  Section:
                </Text>
                <TextInput
                  className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                    isDarkMode
                      ? 'bg-[#1E1E1E] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}
                  placeholder="Enter section (e.g., A, B, 1)"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={section}
                  onChangeText={setSection}
                />

                {/* School Year - Replaced TextInput with Picker */}
                <Text
                  className={`font-inter_semibold ml-1 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  School Year:
                </Text>
                <Picker
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                    borderWidth: 1,
                    borderRadius: 8,
                    color: isDarkMode ? '#E0E0E0' : 'black',
                    width: '100%',
                    fontFamily: 'Inter-18pt-Regular',
                    fontSize: 14,
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 4,
                    marginBottom: 8,
                  }}
                  selectedValue={schoolYear}
                  onValueChange={(itemValue) => setSchoolYear(itemValue)}
                  dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                  mode="dropdown"
                >
                  <Picker.Item label="Select School Year" value="" />
                  {schoolYearOptions.map((year) => (
                    <Picker.Item key={year} label={year} value={year} />
                  ))}
                </Picker>

                {/* Description */}
                <Text
                  className={`font-inter_semibold ml-1 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  Description (Optional):
                </Text>
                <TextInput
                  className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                    isDarkMode
                      ? 'bg-[#1E1E1E] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}
                  placeholder="Enter subject description"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />

                {/* Submit / Cancel */}
                <View className="flex-row mt-2">
                  <TouchableOpacity
                    onPress={handleSubmit}
                    className="bg-blue-500 p-3 rounded-xl flex-1 mx-2 items-center"
                  >
                    <Text className="text-white font-psemibold text-base">
                      {isEditing ? 'Update Subject' : 'Create Subject'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="bg-gray-500 p-3 rounded-xl flex-1 mx-2 items-center"
                  >
                    <Text className="text-white font-psemibold text-base">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  // ─── COURSE DETAILS VIEW ──────────────────────────────────────────────────────
  if (viewingSubject) {
    const adviserName = viewingSubject.teacher
      ? `${viewingSubject.teacher.firstName} ${viewingSubject.teacher.middleName ? viewingSubject.teacher.middleName + ' ' : ''}${viewingSubject.teacher.lastName}`
      : 'Not assigned';
    
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ScrollView showsVerticalScrollIndicator={false}>
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
              Adviser: {adviserName}
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
              isAdminOrTeacher={true}
            />
          </View>
        </ScrollView>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <View className='flex-row items-center'>
        <Text className={`font-inter_bold text-lg mx-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Subjects {subjects.length > 0 ? `(${subjects.length})` : ''}
        </Text>
        <TouchableOpacity
          className='bg-blue-400 ml-auto p-2 rounded-md items-center justify-center'
          onPress={handleAddSubject}
        >
          <Image
            className="w-[24] h-[24]"
            contentFit="contain"
            source={require('@/assets/icons/plus.png')}
            cachePolicy="memory-disk"
            tintColor={isDarkMode ? '#E0E0E0' : 'white'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          className='bg-red-600 ml-1 mr-3 p-2 rounded-md items-center justify-center'
          onPress={fetchTeacherSubjects}
        >
          <View className='flex-row'>
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              cachePolicy="memory-disk"
              tintColor={isDarkMode ? '#E0E0E0' : 'white'}
            />
          </View>
        </TouchableOpacity>
      </View>
      <FlashList
        data={subjects}
        estimatedItemSize={80}
        renderItem={({ item }: { item: Subject }) => {
          // Compute initials for the colored square:
          const initials = item.subjectName.slice(0, 2).toUpperCase();
          
          // Generate a consistent color based on subject name
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
          
          // Calculate male and female counts
          const maleCount = item.students?.filter(s => s.sex === 'Male').length || 0;
          const femaleCount = item.students?.filter(s => s.sex === 'Female').length || 0;
          
          const studentBreakdown = [
            maleCount > 0 ? `${maleCount} boy${maleCount !== 1 ? 's' : ''}` : null,
            femaleCount > 0 ? `${femaleCount} girl${femaleCount !== 1 ? 's' : ''}` : null,
          ].filter(Boolean).join(', ');


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

                {/* Grade, Section, and School Year */}
                <Text
                  className={`font-inter_semibold text-base mb-1 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-gray-700'
                  }`}
                >
                  {item.gradeLevel} - {item.section} {item.schoolYear && `(${item.schoolYear})`}
                </Text>

                {/* Student count and View link */}
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`font-inter_regular text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {studentCount} student{studentCount !== 1 ? 's' : ''}
                    {studentBreakdown && ` / ${studentBreakdown}`}
                  </Text>
                </View>
              </View>

              {/* RIGHT: Three-dot menu */}
              <Pressable
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
              </Pressable>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 20
        }}
      />

      {/* ─── CONTEXT MENU ─────────────────────────────────────────────────────────── */}
      <ContextMenu
        visible={menuVisible}
        x={menuPosition.x}
        y={menuPosition.y}
        onClose={handleCloseMenu}
        items={menuItems}
        menuStyle={{ backgroundColor: isDarkMode ? '#333' : 'white', borderRadius: 8 }}
        itemStyle={{ paddingVertical: 10, paddingHorizontal: 15 }}
        labelStyle={{ color: isDarkMode ? '#E0E0E0' : 'black', fontSize: 14, fontFamily: 'Inter-18pt-Regular' }}
      />

      {/* Add/Edit Subject Modal */}
      {modalVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            className="flex-1 justify-center items-center p-4"
          >
            <View
              className={`rounded-lg p-4 w-full max-w-xl ${
                isDarkMode ? 'bg-[#1E1E1E] shadow-none' : 'bg-white shadow-lg'
              }`}
            >
              <Text
                className={`font-inter_bold text-lg text-center ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                {isEditing ? 'Edit Subject' : 'Create New Subject'}
              </Text>

              {/* Subject Name */}
              <Text
                className={`font-inter_semibold ml-1 mt-2 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                Subject Name:
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                  isDarkMode
                    ? 'bg-[#1E1E1E] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="Enter subject name"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={subjectName}
                onChangeText={setSubjectName}
              />

              {/* Grade Level */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                Grade Level:
              </Text>
              <Picker
                style={{
                  backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                  borderWidth: 1,
                  borderRadius: 8,
                  color: isDarkMode ? '#E0E0E0' : 'black',
                  width: '100%',
                  fontFamily: 'Inter-18pt-Regular',
                  fontSize: 14,
                  paddingTop: 8,
                  paddingBottom: 8,
                  paddingLeft: 4,
                  marginBottom: 8,
                }}
                selectedValue={gradeLevel}
                onValueChange={(itemValue) => setGradeLevel(itemValue)}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode="dropdown"
              >
                <Picker.Item label="Select Grade Level" value="" />
                <Picker.Item label="Grade 1" value="Grade 1" />
                <Picker.Item label="Grade 2" value="Grade 2" />
                <Picker.Item label="Grade 3" value="Grade 3" />
                <Picker.Item label="Grade 4" value="Grade 4" />
                <Picker.Item label="Grade 5" value="Grade 5" />
                <Picker.Item label="Grade 6" value="Grade 6" />
              </Picker>

              {/* Section */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                Section:
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                  isDarkMode
                    ? 'bg-[#1E1E1E] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="Enter section (e.g., A, B, 1)"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={section}
                onChangeText={setSection}
              />

              {/* School Year - Replaced TextInput with Picker */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                School Year:
              </Text>
              <Picker
                style={{
                  backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
                  borderWidth: 1,
                  borderRadius: 8,
                  color: isDarkMode ? '#E0E0E0' : 'black',
                  width: '100%',
                  fontFamily: 'Inter-18pt-Regular',
                  fontSize: 14,
                  paddingTop: 8,
                  paddingBottom: 8,
                  paddingLeft: 4,
                  marginBottom: 8,
                }}
                selectedValue={schoolYear}
                onValueChange={(itemValue) => setSchoolYear(itemValue)}
                dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
                mode="dropdown"
              >
                <Picker.Item label="Select School Year" value="" />
                {schoolYearOptions.map((year) => (
                  <Picker.Item key={year} label={year} value={year} />
                ))}
              </Picker>

              {/* Description */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                Description (Optional):
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                  isDarkMode
                    ? 'bg-[#1E1E1E] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="Enter subject description"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Submit / Cancel */}
              <View className="flex-row mt-2">
                <TouchableOpacity
                  onPress={handleSubmit}
                  className="bg-blue-500 p-3 rounded-xl flex-1 mx-2 items-center"
                >
                  <Text className="text-white font-psemibold text-base">
                    {isEditing ? 'Update Subject' : 'Create Subject'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="bg-gray-500 p-3 rounded-xl flex-1 mx-2 items-center"
                >
                  <Text className="text-white font-psemibold text-base">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default SubjectsAndroid;