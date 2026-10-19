// subjects.android.tsx
import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, memo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import DropdownMobile from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import * as DocumentPicker from 'expo-document-picker';
import {
  formatSubjectDisplay,
  normalizeClassCodeInput,
} from '@/app/utils/subjectUtils';
import NetworkBanner from '@/components/NetworkBanner.android';

cssInterop(Image, { className: 'style' });

// Pagination constant
const ITEMS_PER_PAGE = 10;

interface SubjectForm {
  subjectName: string;
  classCode: string;
  description: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  teachers: Array<{
    teacherId: string;
    terms?: {
      1: boolean;
      2: boolean;
      3: boolean;
    };
    isAssignedToAllTerms: boolean;
  }>;
}

interface Section {
  _id: string;
  sectionName: string;
  gradeLevel: string;
  schoolYear: string;
  students: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    userId: string;
  }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Memoized Subject Item Component
const SubjectItem = memo<{
  item: Subject;
  isDarkMode: boolean;
  onPress: (subject: Subject) => void;
  onMenuPress: (subject: Subject) => void;
  getConsistentColor: (str: string) => string;
}>(({ item, isDarkMode, onPress, onMenuPress, getConsistentColor }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleMenuPress = useCallback(() => {
    onMenuPress(item);
  }, [item, onMenuPress]);

  const initials = item.subjectName.slice(0, 2).toUpperCase();
  const bgColor = getConsistentColor(item.subjectName);
  
  const studentCount = item.students?.length || 0;
  const maleCount = item.students?.filter(s => s.sex === 'Male').length || 0;
  const femaleCount = item.students?.filter(s => s.sex === 'Female').length || 0;
  
  const studentBreakdown = [
    maleCount > 0 ? `${maleCount} boy${maleCount !== 1 ? 's' : ''}` : null,
    femaleCount > 0 ? `${femaleCount} girl${femaleCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        marginHorizontal: 16,
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
              {formatSubjectDisplay(item)}
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
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
            >
              {studentCount} student{studentCount !== 1 ? 's' : ''}
              {studentBreakdown && ` / ${studentBreakdown}`}
            </Text>
          </View>
        </View>

        {/* Menu Icon */}
        <Pressable
          onPress={handleMenuPress}
          style={{ padding: 8 }}
        >
          <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : '#111827'} />
        </Pressable>
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);

  // Actions modal states
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalSubject, setActionsModalSubject] = useState<Subject | null>(null);

  // Add/Edit modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

  // Form fields
  const [subjectName, setSubjectName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [activeSchoolYear, setActiveSchoolYear] = useState<string | null>(null);
  const [teacherIdentifier, setTeacherIdentifier] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sections state
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  const isTeacher = user?.role === 'Teacher';

  // Memoized dropdown options
  const gradeLevelOptions = useMemo(() => [
    { label: 'Select Grade Level', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const gradeLevelFilterOptions = useMemo(() => [
    { label: 'All Grade Levels', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const allSchoolYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [{ label: 'Select School Year', value: '' }];
    
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

  const schoolYearFormOptions = useMemo(() => {
    if (!activeSchoolYear) {
      return allSchoolYearOptions;
    }

    const displayYear =
      isEditing && schoolYear ? schoolYear : activeSchoolYear;
    return [{ label: displayYear, value: displayYear }];
  }, [activeSchoolYear, allSchoolYearOptions, isEditing, schoolYear]);

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

  const fetchActiveSchoolYear = useCallback(async () => {
    try {
      const response = await apiClient.get('/subjects/active-school-year');
      setActiveSchoolYear(response.data.data?.activeSchoolYear || null);
    } catch (error) {
      console.error('Failed to fetch active school year:', error);
    }
  }, []);

  // Fetch sections for the selected grade and school year
  const fetchSections = useCallback(async (grade?: string, year?: string) => {
    if (!grade || !year) {
      setSections([]);
      return;
    }

    try {
      setLoadingSections(true);
      const params = new URLSearchParams();
      params.append('gradeLevel', grade);
      params.append('schoolYear', year);

      const response = await apiClient.get(`/sections?${params.toString()}`);
      setSections(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  }, []);

  // Fetch sections when grade level or school year changes
  useEffect(() => {
    if (gradeLevel && schoolYear) {
      fetchSections(gradeLevel, schoolYear);
    }
  }, [gradeLevel, schoolYear, fetchSections]);

  // Section dropdown options
  const sectionOptions = useMemo(() => {
    const options = [{ label: 'Select Section', value: '' }];

    sections.forEach((sec) => {
      options.push({
        label: `${sec.sectionName} (${sec.students.length} students)`,
        value: sec.sectionName,
      });
    });

    return options;
  }, [sections]);

  // Fetch teacher's subjects
  const fetchTeacherSubjects = useCallback(async () => {
    if (!user || !isTeacher) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>('/subjects');
      
      const teacherSubjects = response.data.data.filter(subject => {
        if (!subject.teachers || !Array.isArray(subject.teachers)) {
          return false;
        }
        return subject.teachers.some((ta: any) => 
          ta.teacher?._id === user._id || 
          ta.teacher?.email === user.email ||
          ta.teacher?.username === user.username
        );
      });
      
      setSubjects(teacherSubjects);
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.error('Failed to fetch teacher subjects:', error);
      ToastAndroid.show('Failed to load your subjects.', ToastAndroid.SHORT);

      const isNetworkError =
        !error?.response ||
        error?.code === 'ECONNABORTED' ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('timeout');
      if (isNetworkError) {
        setForceNetworkBannerVisible(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isTeacher]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      if (isTeacher) {
        fetchTeacherSubjects();
        fetchActiveSchoolYear();
      }
    }, [fetchTeacherSubjects, fetchActiveSchoolYear, isTeacher])
  );

  useEffect(() => {
    if (modalVisible && activeSchoolYear && !isEditing) {
      setSchoolYear(activeSchoolYear);
    }
  }, [modalVisible, activeSchoolYear, isEditing]);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesSearch = subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.classCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.section?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel = !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear = !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      
      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [subjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Paginated subjects for display
  const displayedSubjects = useMemo(() => {
    return filteredSubjects.slice(0, displayedCount);
  }, [filteredSubjects, displayedCount]);

  const hasMore = displayedCount < filteredSubjects.length;

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch (e) {
      // ignore
    }
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredSubjects.length));
      setIsLoadingMore(false);
    }, 350);
  }, [isLoadingMore, hasMore, filteredSubjects.length]);

  // Handlers
  const handleAddSubject = useCallback(() => {
    if (subjects.length >= 10) {
      Alert.alert(
        'Subject Limit Reached',
        'You can only create up to 10 subjects. Please delete an existing subject before adding a new one.'
      );
      return;
    }
    setIsEditing(false);
    setCurrentSubject(null);
    setSubjectName('');
    setClassCode('');
    setDescription('');
    setGradeLevel('');
    setSection('');
    setSchoolYear(activeSchoolYear || '');
    setTeacherIdentifier(user?.email || '');
    setSelectedImage(null);
    setSections([]);
    setModalVisible(true);
  }, [subjects.length, user?.email, activeSchoolYear]);

  const handleEditSubject = useCallback((subject: Subject) => {
    setIsEditing(true);
    setCurrentSubject(subject);
    setSubjectName(subject.subjectName);
    setClassCode(subject.classCode || '');
    setDescription(subject.description || '');
    setGradeLevel(subject.gradeLevel || '');
    setSection(subject.section || '');
    setSchoolYear(subject.schoolYear || '');
    setTeacherIdentifier(subject.teacher?.username || subject.teacher?.email || subject.teacher?._id || '');
    setSelectedImage(null);
    setModalVisible(true);
    setActionsModalVisible(false);
    if (subject.gradeLevel && subject.schoolYear) {
      fetchSections(subject.gradeLevel, subject.schoolYear);
    }
  }, [fetchSections]);

  const handleDeleteSubject = useCallback(async (subjectId: string) => {
    setActionsModalVisible(false);
    Alert.alert(
      'Delete Subject',
      'Are you sure you want to delete this subject? This action cannot be undone and will delete related activities, materials, and grades.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiClient.delete(`/subjects/${subjectId}`);
              await fetchTeacherSubjects();
              ToastAndroid.show('Subject deleted successfully.', ToastAndroid.SHORT);
            } catch (error) {
              console.error('Failed to delete subject:', error);
              ToastAndroid.show('Failed to delete subject.', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  }, [fetchTeacherSubjects]);

  const handleSubmit = useCallback(async () => {
    if (!subjectName.trim() || !schoolYear.trim()) {
      Alert.alert('Validation Error', 'Subject name and school year are required.');
      return;
    }

    if (!section.trim()) {
      Alert.alert('Validation Error', 'Section is required.');
      return;
    }

    if (!classCode.trim()) {
      Alert.alert('Validation Error', 'Class code is required.');
      return;
    }

    if (classCode.trim().length > 12) {
      Alert.alert('Validation Error', 'Class code must be at most 12 characters.');
      return;
    }

    const formData: SubjectForm = {
      subjectName: subjectName.trim(),
      classCode: classCode.trim().toUpperCase(),
      description: description.trim(),
      gradeLevel: gradeLevel.trim(),
      section: section.trim(),
      schoolYear: schoolYear.trim(),
      teachers: [
        {
          teacherId: teacherIdentifier.trim() || user?.email || user?._id || '',
          isAssignedToAllTerms: true,
          terms: {
            1: true,
            2: true,
            3: true,
          }
        }
      ],
    };

    try {
      if (isEditing && currentSubject) {
        const response = await apiClient.put(`/subjects/${currentSubject._id}`, formData);
        if (selectedImage) {
          await handleUploadImage(currentSubject._id);
        }
        const updated = response.data.data;
        ToastAndroid.show(`${formatSubjectDisplay(updated || { classCode: formData.classCode, subjectName: formData.subjectName })} successfully updated.`, ToastAndroid.SHORT);
      } else {
        const response = await apiClient.post('/subjects', formData);
        if (selectedImage && response.data.data?._id) {
          await handleUploadImage(response.data.data._id);
        }
        const created = response.data.data;
        ToastAndroid.show(`${formatSubjectDisplay(created)} successfully created.`, ToastAndroid.SHORT);
      }
      setModalVisible(false);
      setSelectedImage(null);
      setSections([]);
      await fetchTeacherSubjects();
    } catch (error: any) {
      console.error('Failed to save subject:', error.response?.data || error.message);
      const backendErrorMessage = error.response?.data?.message;
      if (
        backendErrorMessage?.includes('Class code already exists') ||
        (backendErrorMessage?.includes('Duplicate field value entered') &&
          backendErrorMessage?.includes('classCode'))
      ) {
        Alert.alert('Error', 'Class code already exists. Please use a different code.');
      } else if (backendErrorMessage && backendErrorMessage.includes('Duplicate field value entered') && backendErrorMessage.includes('subjectName')) {
        Alert.alert('Error', 'Subject name already exists. Please use a different name.');
      } else {
        ToastAndroid.show(backendErrorMessage || 'Failed to save subject.', ToastAndroid.SHORT);
      }
    }
  }, [subjectName, classCode, schoolYear, section, description, gradeLevel, teacherIdentifier, user?.email, user?._id, isEditing, currentSubject, selectedImage, fetchTeacherSubjects]);

  // Image handlers
  const handlePickImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      ToastAndroid.show('Failed to pick image.', ToastAndroid.SHORT);
    }
  }, []);

  const handleUploadImage = async (subjectId: string) => {
    if (!selectedImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      const asset = { uri: selectedImage, name: 'subject-image.jpg', type: 'image/jpeg' };
      formData.append('subjectImage', asset as any);

      await apiClient.put(`/subjects/${subjectId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      ToastAndroid.show(error.response?.data?.message || 'Failed to upload image.', ToastAndroid.SHORT);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = useCallback(async (subjectId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this subject image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/subjects/${subjectId}/delete-image`);
              ToastAndroid.show('Subject image deleted successfully.', ToastAndroid.SHORT);
              await fetchTeacherSubjects();
            } catch (error: any) {
              console.error('Error deleting image:', error);
              ToastAndroid.show(error.response?.data?.message || 'Failed to delete image.', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  }, [fetchTeacherSubjects]);

  const handleViewSubject = useCallback((subject: Subject) => {
    router.push(`/(teachers)/subjects/${subject._id}` as any);
  }, [router]);

  const openActionsModal = useCallback((subject: Subject) => {
    setActionsModalSubject(subject);
    setActionsModalVisible(true);
  }, []);

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
      onMenuPress={openActionsModal}
      getConsistentColor={getConsistentColor}
    />
  ), [isDarkMode, handleViewSubject, openActionsModal, getConsistentColor]);

  const keyExtractor = useCallback((item: Subject) => item._id, []);

  // ---- List header (scrolls with content now) ----
  const listHeader = (
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
            Showing {displayedSubjects.length} of {filteredSubjects.length} subjects
          </Text>
        </View>
        
        {/* Buttons Container */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {/* Add Subject Button */}
          <TouchableOpacity
            onPress={handleAddSubject}
            style={{
              backgroundColor: '#3B82F6',
              padding: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('@/assets/icons/plus.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={fetchTeacherSubjects}
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
            onPress={fetchTeacherSubjects}
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
  );

  // ---- Empty state ----
  const listEmpty = (
    <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 }}>
      <Image
        source={require('@/assets/images/online-course.png')}
        style={{ width: 64, height: 64, marginBottom: 16 }}
      />
      <Text style={{ 
        fontSize: 18, 
        fontFamily: 'Inter-SemiBold',
        color: isDarkMode ? '#9CA3AF' : '#6B7280', 
        marginBottom: 8,
        textAlign: 'center',
      }}>
        No subjects found
      </Text>
      <Text style={{ 
        fontSize: 14, 
        fontFamily: 'Inter-Regular',
        color: isDarkMode ? '#6B7280' : '#9CA3AF', 
        textAlign: 'center' 
      }}>
        {searchQuery || selectedGradeLevel || selectedSchoolYear
          ? 'Try adjusting your filters'
          : 'Create your first subject to get started'}
      </Text>
    </View>
  );

  // ---- Footer (loading more / end of list) ----
  const listFooter = (
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
  );

  // Loading state
  if (isLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB', justifyContent: 'center', alignItems: 'center' }} edges={['top', 'bottom']}>
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchTeacherSubjects}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
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
  if (!isTeacher) {
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
            This page is only available for teachers.
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

      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchTeacherSubjects}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />
      
      {/* Entire screen is now scrollable via FlashList */}
      <FlashList
        ref={listRef}
        data={displayedSubjects}
        renderItem={renderSubjectItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        extraData={isDarkMode}
        keyboardShouldPersistTaps="handled"
      />

      {/* Actions Modal */}
      <Modal
        visible={actionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionsModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Pressable
            style={{ 
              flex: 1, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
            onPress={() => setActionsModalVisible(false)}
          >
            <Pressable
              style={{
                backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                width: '80%',
                maxWidth: 400,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  marginBottom: 16,
                }}
              >
                Subject Actions
              </Text>

              {/* View Details Button */}
              <TouchableOpacity
                onPress={() => {
                  if (actionsModalSubject) {
                    handleViewSubject(actionsModalSubject);
                    setActionsModalVisible(false);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  marginBottom: 8,
                }}
              >
                <Image
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  source={require('@/assets/icons/show_password.png')}
                  tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  View Details
                </Text>
              </TouchableOpacity>

              {/* Edit Button */}
              <TouchableOpacity
                onPress={() => {
                  if (actionsModalSubject) {
                    handleEditSubject(actionsModalSubject);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  marginBottom: 8,
                }}
              >
                <Image
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  source={require('@/assets/icons/edit.png')}
                  tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  Edit Subject
                </Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => {
                  if (actionsModalSubject) {
                    handleDeleteSubject(actionsModalSubject._id);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  marginBottom: 8,
                }}
              >
                <DeleteIcon
                  width={24}
                  height={24}
                  fill="#EF4444"
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: '#EF4444',
                  }}
                >
                  Delete Subject
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setActionsModalVisible(false)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Semibold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Subject Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)' 
          }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
              borderRadius: 12,
              width: '90%',
              maxWidth: 600,
              maxHeight: '90%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}>
              <Text style={{
                fontSize: 20,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                textAlign: 'center',
              }}>
                {isEditing ? 'Edit Subject' : 'Create New Subject'}
              </Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={{ 
                maxHeight: '75%',
                paddingHorizontal: 16,
              }}
              contentContainerStyle={{ paddingVertical: 16 }}
            >
              {/* Subject Image */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Subject Image (Optional):
              </Text>

              {(selectedImage || (isEditing && currentSubject?.subjectImage)) && (
                <View style={{ marginBottom: 12 }}>
                  <Image
                    source={{ uri: selectedImage || currentSubject?.subjectImage }}
                    style={{ width: '100%', height: 200, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  {isEditing && currentSubject?.subjectImage && !selectedImage && (
                    <TouchableOpacity
                      onPress={() => currentSubject && handleDeleteImage(currentSubject._id)}
                      style={{
                        backgroundColor: '#EF4444',
                        padding: 12,
                        borderRadius: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-SemiBold',
                        textAlign: 'center' 
                      }}>
                        Delete Current Image
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedImage && (
                    <TouchableOpacity
                      onPress={() => setSelectedImage(null)}
                      style={{
                        backgroundColor: '#6B7280',
                        padding: 12,
                        borderRadius: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-SemiBold',
                        textAlign: 'center' 
                      }}>
                        Remove Selected Image
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={handlePickImage}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  borderWidth: 1,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                }}
              >
                <Text style={{
                  fontFamily: 'Inter-Regular',
                  textAlign: 'center',
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                }}>
                  {selectedImage || (isEditing && currentSubject?.subjectImage) ? 'Change Image' : 'Upload Image'}
                </Text>
              </TouchableOpacity>

              {/* Class Code */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Class Code: <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={{
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 4,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                }}
                placeholder="e.g. SCIBIOG06"
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={classCode}
                onChangeText={(text) => setClassCode(normalizeClassCodeInput(text))}
                maxLength={12}
                autoCapitalize="characters"
              />
              <Text style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                marginBottom: 16,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                Max 12 characters. Letters and numbers only.
              </Text>

              {/* Subject Name */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Subject Name: <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={{
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                }}
                placeholder="Enter subject name"
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={subjectName}
                onChangeText={setSubjectName}
              />

              {/* Grade Level */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Grade Level: <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{ marginBottom: 16 }}>
                <DropdownMobile
                  label="Grade Level"
                  selectedValue={gradeLevel}
                  onValueChange={setGradeLevel}
                  items={gradeLevelOptions}
                  placeholder="Select Grade Level"
                  buttonRightIcon={DownIcon}
                />
              </View>

              {/* School Year */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                School Year: <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{ marginBottom: 4 }}>
                <DropdownMobile
                  label="School Year"
                  selectedValue={schoolYear}
                  onValueChange={setSchoolYear}
                  items={schoolYearFormOptions}
                  placeholder="Select School Year"
                  buttonRightIcon={DownIcon}
                  disabled={!!activeSchoolYear}
                />
              </View>
              {activeSchoolYear && (
                <Text style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 12,
                  marginBottom: 16,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  School year is set by the administrator to {activeSchoolYear}.
                </Text>
              )}

              {/* Section */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Section: <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              {!gradeLevel || !schoolYear ? (
                <View style={{
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                  marginBottom: 16,
                }}>
                  <Text style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 14,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  }}>
                    Please select grade level and school year first
                  </Text>
                </View>
              ) : loadingSections ? (
                <View style={{
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                  marginBottom: 16,
                  alignItems: 'center',
                }}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    marginTop: 8,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  }}>
                    Loading sections...
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  <DropdownMobile
                    label="Section"
                    selectedValue={section}
                    onValueChange={setSection}
                    items={sectionOptions}
                    placeholder="Select Section"
                    buttonRightIcon={DownIcon}
                  />
                  {sections.length === 0 && (
                    <Text style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 12,
                      marginTop: 8,
                      color: isDarkMode ? '#FBBF24' : '#F59E0B',
                    }}>
                      No sections available for {gradeLevel} - {schoolYear}. Please contact your administrator.
                    </Text>
                  )}
                </View>
              )}

              {/* Description */}
              <Text style={{
                fontSize: 14,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E0E0E0' : '#111827',
                marginBottom: 8,
              }}>
                Description (Optional):
              </Text>
              <TextInput
                style={{
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                  borderColor: isDarkMode ? '#6B7280' : '#D1D5DB',
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
                placeholder="Enter subject description"
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            {/* Fixed Bottom Buttons */}
            <View style={{ 
              flexDirection: 'row', 
              padding: 16, 
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={uploadingImage || !section || !subjectName.trim() || !schoolYear.trim() || !classCode.trim()}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: (!section || !subjectName.trim() || !schoolYear.trim() || !classCode.trim()) ? '#9CA3AF' : '#3B82F6',
                }}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ 
                    color: 'white', 
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 16 
                  }}>
                    {isEditing ? 'Update Subject' : 'Create Subject'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedImage(null);
                  setSections([]);
                }}
                disabled={uploadingImage}
                style={{
                  flex: 1,
                  backgroundColor: '#6B7280',
                  padding: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 16 
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default memo(SubjectsAndroid);