// SubjectAndroid.tsx

import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
// Removed ContextMenu import
// import ContextMenu from '@/components/ContextMenu';
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from "@shopify/flash-list";
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

cssInterop(Image, { className: 'style' });

interface SubjectForm {
  subjectName: string;
  description: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  teacherIdentifier?: string;
}

const SubjectAndroid: React.FC = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // ─── STATE ────────────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Bottom sheet ref and state
  const bottomSheetRef = useRef<BottomSheet>(null);
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

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '30%'], []);

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

  const isAdmin = user?.role === 'Admin';
  const isAdminOrTeacher = user?.role === 'Admin' || user?.role === 'Teacher';

  // ─── FETCH COURSES ───────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>('/subjects');
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      Alert.alert('Error', 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ─── HANDLE ADD/EDIT COURSE ───────────────────────────────────────────────────
  const handleAddSubject = () => {
    setIsEditing(false);
    setCurrentSubject(null);
    setSubjectName('');
    setDescription('');
    setGradeLevel('');
    setSection('');
    setSchoolYear('');
    setTeacherIdentifier('');
    setModalVisible(true);
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
    handleCloseBottomSheet();
  };

  const handleDeleteSubject = async (subjectId: string) => {
    Alert.alert(
      'Archive Subject',
      'Are you sure you want to archive this subject? This will remove it from active subjects but can be restored later.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => handleCloseBottomSheet(),
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/subjects/${subjectId}`);
              Alert.alert('Success', 'Subject archived successfully.');
              handleCloseBottomSheet();
              fetchSubjects();
            } catch (error) {
              console.error('Failed to archive subject:', error);
              Alert.alert('Error', 'Failed to archive subject.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const formData: SubjectForm = {
      subjectName,
      description,
      gradeLevel,
      section,
      schoolYear,
    };
    if (teacherIdentifier.trim()) {
      formData.teacherIdentifier = teacherIdentifier.trim();
    }
    try {
      if (isEditing && currentSubject) {
        await apiClient.put(`/subjects/${currentSubject._id}`, formData);
        Alert.alert('Success', 'Subject updated successfully.');
      } else {
        await apiClient.post('/subjects', formData);
        Alert.alert('Success', 'Subject added successfully.');
      }
      setModalVisible(false);
      fetchSubjects();
    } catch (error: any) {
      console.error('Failed to save subject:', error.response?.data || error.message);
      const backendErrorMessage = error.response?.data?.message;
      if (backendErrorMessage && backendErrorMessage.includes('Duplicate field value entered') && backendErrorMessage.includes('subjectName')) {
        Alert.alert('Error', 'Subject name already exists. Please use a different name.');
      } else {
        Alert.alert('Error', backendErrorMessage || 'Failed to save subject.');
      }
    }
  };

  // ─── BOTTOM SHEET HELPERS ────────────────────────────────────────────────────
  const handleOpenBottomSheet = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setSelectedSubject(null);
  }, []);

  // Render backdrop for bottom sheet
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Generate school year options
  const generateSchoolYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const schoolYears = [];
    
    const previousYear = currentYear - 1;
    schoolYears.push(`${previousYear} - ${currentYear}`);
    
    for (let i = 0; i < 4; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      schoolYears.push(`${startYear} - ${endYear}`);
    }
    
    return schoolYears;
  };

  const schoolYearOptions = generateSchoolYearOptions();

  // ─── LOADING STATES ───────────────────────────────────────────────────────────
  if (isLoading || loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#121212]' : 'bg-white'
        }`}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text
          className={`mt-4 text-sm font-inter_regular ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          Loading subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  // ─── NO COURSES AVAILABLE ─────────────────────────────────────────────────────
  if (subjects.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
          <View className="mt-2 mb-2">
            <Text
              className={`font-inter_bold mx-4 my-2 text-lg ${
                isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
              }`}
            >
              Subjects
            </Text>
            <TouchableOpacity
              onPress={() => {
                fetchSubjects();
                console.log('Refreshing subjects...');
              }}
              className={`rounded-md justify-center items-center ml-auto mr-3 p-2 ${
                loading ? 'bg-gray-400' : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/refresh.png')}
                cachePolicy="memory-disk"
                tintColor={loading ? '#999' : isDarkMode ? '#E0E0E0' : '#666'}
                style={{
                  transform: loading ? [{ rotate: '180deg' }] : [{ rotate: '0deg' }]
                }}
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
              className={`font-inter_regular mt-4 ${
                isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
              }`}
            >
              No subjects available.
            </Text>
            {isAdminOrTeacher && (
              <TouchableOpacity
                onPress={handleAddSubject}
                className="bg-blue-400 rounded-xl h-[50px] justify-center items-center mt-4 p-2"
                activeOpacity={0.7}
              >
                <Text className="text-black font-psemibold text-lg">Add Subject</Text>
              </TouchableOpacity>
            )}
          </View>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          {/* Add/Edit Subject Modal */}
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
                  {isEditing ? 'Edit Subject' : 'Add Subject'}
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
                  Grade Level (e.g., Grade 10):
                </Text>
                <DropdownMobile
                  label="Grade Level"
                  selectedValue={gradeLevel}
                  onValueChange={setGradeLevel}
                  items={[
                    { label: 'Select Grade Level', value: '' },
                    { label: 'Grade 1', value: 'Grade 1' },
                    { label: 'Grade 2', value: 'Grade 2' },
                    { label: 'Grade 3', value: 'Grade 3' },
                    { label: 'Grade 4', value: 'Grade 4' },
                    { label: 'Grade 5', value: 'Grade 5' },
                    { label: 'Grade 6', value: 'Grade 6' },
                  ]}
                  placeholder="Select Grade Level"
                  buttonRightIcon={DownIcon}
                  buttonStyle={{
                    marginBottom: 8,
                  }}
                />

                {/* Section */}
                <Text
                  className={`font-inter_semibold ml-1 mb-2 ${
                    isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                  }`}
                >
                  Section (e.g., Section A):
                </Text>
                <TextInput
                  className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                    isDarkMode
                      ? 'bg-[#1E1E1E] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}
                  placeholder="Enter section"
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
                <DropdownMobile
                  label="School Year"
                  selectedValue={schoolYear}
                  onValueChange={setSchoolYear}
                  items={[
                    { label: 'Select School Year', value: '' },
                    ...schoolYearOptions.map((year) => ({
                      label: year,
                      value: year,
                    })),
                  ]}
                  placeholder="Select School Year"
                  buttonRightIcon={DownIcon}
                  buttonStyle={{
                    marginBottom: 8,
                  }}
                />

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
                  placeholder="Enter description"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                {/* Teacher Email (Admin only) */}
                {user?.role === 'Admin' && (
                  <>
                    <Text
                      className={`font-inter_semibold ml-1 mb-2 ${
                        isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                      }`}
                    >
                      Teacher Email (Optional):
                    </Text>
                    <TextInput
                      className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                        isDarkMode
                          ? 'bg-[#1E1E1E] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-black'
                      }`}
                      placeholder="Enter teacher email"
                      placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                      value={teacherIdentifier}
                      onChangeText={setTeacherIdentifier}
                    />
                  </>
                )}

                {/* Submit / Cancel */}
                <View className="flex-row mt-2">
                  <TouchableOpacity
                    onPress={handleSubmit}
                    className="bg-blue-500 p-3 rounded-xl flex-1 mx-2 items-center"
                  >
                    <Text className="text-white font-psemibold text-base">
                      {isEditing ? 'Update Subject' : 'Add Subject'}
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
        </View>
      </GestureHandlerRootView>
    );
  }

  // ─── RENDER LIST OF COURSES ───────────────────────────────────────────────────
  if (viewingSubject) {
    const adviserName = viewingSubject.teacher
      ? `${viewingSubject.teacher.firstName} ${viewingSubject.teacher.middleName ? viewingSubject.teacher.middleName + ' ' : ''}${viewingSubject.teacher.lastName} `
      : 'Not assigned';
    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
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
        </View>
        <View className="flex-1 px-4 pb-4">
          <SubjectDetailsTabs subject={viewingSubject} isDarkMode={isDarkMode} isAdminOrTeacher={isAdminOrTeacher} />
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        {/* Header: "Subjects" + Add button */}
        <View className="flex-row mt-2">
          <Text
            className={`font-inter_bold mx-4 text-lg self-center ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            Subjects:
          </Text>
          
          {isAdminOrTeacher && (
            <TouchableOpacity
              onPress={handleAddSubject}
              className="bg-blue-400 rounded-md justify-center items-center ml-auto mr-1 p-2"
              activeOpacity={0.7}
            >
              <Image
                className="w-[24] h-[24]"
                contentFit="contain"
                source={require('@/assets/icons/plus.png')}
                cachePolicy="memory-disk"
                tintColor={isDarkMode ? '#E0E0E0' : 'white'}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              fetchSubjects();
              console.log('Refreshing subjects...');
            }}
            className={`rounded-md justify-center items-center mr-3 p-2 ${
              loading ? 'bg-red-400' : isDarkMode ? 'bg-red-600' : 'bg-red-500'
            }`}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              cachePolicy="memory-disk"
              tintColor={loading ? '#999' : isDarkMode ? '#E0E0E0' : 'white'}
              style={{
                transform: loading ? [{ rotate: '180deg' }] : [{ rotate: '0deg' }]
              }}
            />
          </TouchableOpacity>
        </View>

        <FlashList
          data={subjects}
          renderItem={({ item }: { item: Subject }) => {
            const initials = item.subjectName.slice(0, 2).toUpperCase();
            const getConsistentColor = (str: string) => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
              }
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
              return colors[Math.abs(hash) % colors.length];
            };
            const bgColor = getConsistentColor(item.subjectName);

            const teacherName = item.teacher
              ? item.teacher.middleName
                ? `${item.teacher.firstName} ${item.teacher.middleName} ${item.teacher.lastName}`
                : `${item.teacher.firstName} ${item.teacher.lastName}`
              : 'Not assigned';

            return (
              <TouchableOpacity
                className='flex-row p-3 mb-2'
                style={{
                  borderLeftWidth: 12,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  borderBottomWidth: 2,
                  borderColor: bgColor,
                }}
                onPress={() => setViewingSubject(item)}
              >
                <View
                  className="w-[50px] h-[50px] rounded-md justify-center items-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <Text className="text-white font-inter_bold text-lg">{initials}</Text>
                </View>

                <View className="flex-1 ml-3">
                  <Text
                    className={`font-inter_bold text-lg ${
                      isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                    }`}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                  >
                    {item.subjectName}
                  </Text>

                  <Text
                    className={`font-inter_semibold text-base ${
                      isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                    }`}
                  >
                    {item.gradeLevel} - {item.section} ({item.schoolYear})
                  </Text>

                  <View className="flex-row mt-1 items-center">
                    <Text
                      className={`font-inter_regular text-sm ${
                        isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                      }`}
                    >
                      Adviser: {teacherName}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleOpenBottomSheet(item)}
                  className="p-2 ml-2 self-center"
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
            padding: 12
          }}
        />

        {/* ─── BOTTOM SHEET ─────────────────────────────────────────────────────────── */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={{
            backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
          }}
          handleIndicatorStyle={{
            backgroundColor: isDarkMode ? '#E0E0E0' : '#121212',
          }}
        >
          <BottomSheetView style={{ flex: 1, padding: 16 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-24pt-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 8,
              }}
            >
              Subject Actions
            </Text>

            {/* Edit Button */}
            <TouchableOpacity
              onPress={() => {
                if (selectedSubject) {
                  handleEditSubject(selectedSubject);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                marginBottom: 4,
              }}
            >
              <Image
                style={{ width: 24, height: 24, marginRight: 12 }}
                contentFit="contain"
                source={require('@/assets/icons/edit.png')}
                cachePolicy="memory-disk"
                tintColor={isDarkMode ? '#E0E0E0' : '#121212'}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                }}
              >
                Edit Subject
              </Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={() => {
                if (selectedSubject) {
                  handleDeleteSubject(selectedSubject._id);
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
              }}
            >
              <Image
                style={{ width: 24, height: 24, marginRight: 12 }}
                contentFit="contain"
                source={require('@/assets/icons/delete.png')}
                cachePolicy="memory-disk"
                tintColor="#EF4444"
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: '#EF4444',
                }}
              >
                Delete Subject
              </Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>

        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        {/* Add/Edit Subject Modal */}
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
                {isEditing ? 'Edit Subject' : 'Add Subject'}
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
                Grade Level (e.g., Grade 10):
              </Text>
              <DropdownMobile
                label="Grade Level"
                selectedValue={gradeLevel}
                onValueChange={setGradeLevel}
                items={[
                  { label: 'Select Grade Level', value: '' },
                  { label: 'Grade 1', value: 'Grade 1' },
                  { label: 'Grade 2', value: 'Grade 2' },
                  { label: 'Grade 3', value: 'Grade 3' },
                  { label: 'Grade 4', value: 'Grade 4' },
                  { label: 'Grade 5', value: 'Grade 5' },
                  { label: 'Grade 6', value: 'Grade 6' },
                ]}
                placeholder="Select Grade Level"
                buttonRightIcon={DownIcon}
                buttonStyle={{
                  marginBottom: 8,
                }}
              />

              {/* Section */}
              <Text
                className={`font-inter_semibold ml-1 mb-2 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                }`}
              >
                Section (e.g., Section A):
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                  isDarkMode
                    ? 'bg-[#1E1E1E] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="Enter section"
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
              <DropdownMobile
                label="School Year"
                selectedValue={schoolYear}
                onValueChange={setSchoolYear}
                items={[
                  { label: 'Select School Year', value: '' },
                  ...schoolYearOptions.map((year) => ({
                    label: year,
                    value: year,
                  })),
                ]}
                placeholder="Select School Year"
                buttonRightIcon={DownIcon}
                buttonStyle={{
                  marginBottom: 8,
                }}
              />

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
                placeholder="Enter description"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Teacher Email (Admin only) */}
              {user?.role === 'Admin' && (
                <>
                  <Text
                    className={`font-inter_semibold ml-1 mb-2 ${
                      isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
                    }`}
                  >
                    Teacher Email (Optional):
                  </Text>
                  <TextInput
                    className={`font-inter_regular border rounded-lg p-2 mb-2 ${
                      isDarkMode
                        ? 'bg-[#1E1E1E] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-black'
                    }`}
                    placeholder="Enter teacher email"
                    placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                    value={teacherIdentifier}
                    onChangeText={setTeacherIdentifier}
                  />
                </>
              )}

              {/* Submit / Cancel */}
              <View className="flex-row mt-2">
                <TouchableOpacity
                  onPress={handleSubmit}
                  className="bg-blue-500 p-3 rounded-xl flex-1 mx-2 items-center"
                >
                  <Text className="text-white font-psemibold text-base">
                    {isEditing ? 'Update Subject' : 'Add Subject'}
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
      </View>
    </GestureHandlerRootView>
  );
}

export default SubjectAndroid;