// subjects.web.tsx
import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import ContextMenu from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  ScrollView,
  FlatList,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import * as DocumentPicker from 'expo-document-picker';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import {
  formatSubjectDisplay,
  normalizeClassCodeInput,
} from '@/app/utils/subjectUtils';
import NetworkBanner from '@/components/NetworkBanner.web';

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

const SubjectsWeb: React.FC = () => {
  document.title = 'My Subjects - GracEdLMS';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();
  const { width } = useWindowDimensions();

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

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
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

  // New state for sections
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  const isTeacher = user?.role === 'Teacher';

  // Memoized dropdown options
  const gradeLevelOptions: DropdownItem[] = useMemo(() => [
    { label: 'Select Grade Level', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const gradeLevelFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Grade Levels', value: '' },
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
    { label: 'Grade 5', value: 'Grade 5' },
    { label: 'Grade 6', value: 'Grade 6' },
  ], []);

  const allSchoolYearOptions: DropdownItem[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: DropdownItem[] = [{ label: 'Select School Year', value: '' }];
    
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

  const schoolYearFormOptions: DropdownItem[] = useMemo(() => {
    if (!activeSchoolYear) {
      return allSchoolYearOptions;
    }

    const displayYear =
      isEditing && schoolYear ? schoolYear : activeSchoolYear;
    return [{ label: displayYear, value: displayYear }];
  }, [activeSchoolYear, allSchoolYearOptions, isEditing, schoolYear]);

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

  // Section dropdown options - only show sections for selected grade and school year
  const sectionOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [{ label: 'Select Section', value: '' }];

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
      
      // Filter subjects where this teacher is assigned in the teachers array
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
      window.alert('Error: Failed to load your subjects.');

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

  useEffect(() => {
    if (isTeacher) {
      fetchTeacherSubjects();
      fetchActiveSchoolYear();
    }
  }, [fetchTeacherSubjects, fetchActiveSchoolYear, isTeacher]);

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
  const handleAddSubject = () => {
    if (subjects.length >= 10) {
      window.alert('You can only create up to 10 subjects. Please delete an existing subject before adding a new one.');
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
  };

  const handleEditSubject = (subject: Subject) => {
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
    handleCloseMenu();
    // Fetch sections for the subject's grade and school year
    if (subject.gradeLevel && subject.schoolYear) {
      fetchSections(subject.gradeLevel, subject.schoolYear);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this subject? This action cannot be undone and will delete related activities, materials, and grades.'
    );
    if (confirmDelete) {
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

    if (!section.trim()) {
      window.alert('Error: Section is required.');
      return;
    }

    if (!classCode.trim()) {
      window.alert('Error: Class code is required.');
      return;
    }

    if (classCode.trim().length > 12) {
      window.alert('Error: Class code must be at most 12 characters.');
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
        window.alert(
          `Success: ${formatSubjectDisplay(updated || { classCode: formData.classCode, subjectName: formData.subjectName })}`,
        );
      } else {
        const response = await apiClient.post('/subjects', formData);
        if (selectedImage && response.data.data?._id) {
          await handleUploadImage(response.data.data._id);
        }
        const created = response.data.data;
        window.alert(`Success: ${formatSubjectDisplay(created)}`);
      }
      setModalVisible(false);
      setSelectedImage(null);
      setSections([]);
      fetchTeacherSubjects();
    } catch (error: any) {
      console.error('Failed to save subject:', error.response?.data || error.message);
      const backendErrorMessage = error.response?.data?.message;
      if (
        backendErrorMessage?.includes('Class code already exists') ||
        (backendErrorMessage?.includes('Duplicate field value entered') &&
          backendErrorMessage?.includes('classCode'))
      ) {
        window.alert('Error: Class code already exists. Please use a different code.');
      } else if (backendErrorMessage && backendErrorMessage.includes('Duplicate field value entered') && backendErrorMessage.includes('subjectName')) {
        window.alert('Error: Subject name already exists. Please use a different name.');
      } else {
        window.alert('Error: ' + (backendErrorMessage || 'Failed to save subject.'));
      }
    }
  };

  // Image handlers
  const handlePickImage = async () => {
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
      window.alert('Error: Failed to pick image');
    }
  };

  const handleUploadImage = async (subjectId: string) => {
    if (!selectedImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      formData.append('subjectImage', blob, 'subject-image.jpg');

      await apiClient.put(`/subjects/${subjectId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      window.alert('Error: ' + (error.response?.data?.message || 'Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (subjectId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this subject image?');
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/subjects/${subjectId}/delete-image`);
      window.alert('Success: Subject image deleted successfully');
      fetchTeacherSubjects();
    } catch (error: any) {
      console.error('Error deleting image:', error);
      window.alert('Error: ' + (error.response?.data?.message || 'Failed to delete image'));
    }
  };

  const handleOpenMenu = (event: any, subject: Subject) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setSelectedSubject(subject);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedSubject(null);
  };

  const handleViewSubject = (subject: Subject) => {
    router.push(`/(teachers)/subjects/${subject._id}` as any);
  };

  // Menu items
  const menuItems = [
    {
      label: 'View Details',
      onPress: () => {
        if (selectedSubject) {
          handleViewSubject(selectedSubject);
        }
      },
      icon: (
        <Image
          className="w-[20] h-[20] mr-2"
          contentFit="contain"
          source={require('@/assets/icons/show_password.png')}
          cachePolicy="memory-disk"
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
    },
    {
      label: 'Edit Subject',
      onPress: () => {
        if (selectedSubject) {
          handleEditSubject(selectedSubject);
        }
      },
      icon: (
        <Image
          className="w-[20] h-[20] mr-2"
          contentFit="contain"
          source={require('@/assets/icons/edit.png')}
          cachePolicy="memory-disk"
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
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
        <DeleteIcon
          width={20}
          height={20}
          style={{ marginRight: 8 }}
          fill="#EF4444"
        />
      ),
    },
  ];

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
    
    const studentCount = item.students?.length || 0;
    const maleCount = item.students?.filter(s => s.sex === 'Male').length || 0;
    const femaleCount = item.students?.filter(s => s.sex === 'Female').length || 0;
    
    const studentBreakdown = [
      maleCount > 0 ? `${maleCount} boy${maleCount !== 1 ? 's' : ''}` : null,
      femaleCount > 0 ? `${femaleCount} girl${femaleCount !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(', ');

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
        onPress={() => handleViewSubject(item)}
      >
        <View className="flex-row justify-between items-start">
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
              <Text className={`text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                {studentCount} student{studentCount !== 1 ? 's' : ''}
                {studentBreakdown && ` / ${studentBreakdown}`}
              </Text>
            </View>
          </View>

          {/* Menu Icon */}
          <Pressable
            onPress={(event) => handleOpenMenu(event, item)}
            className="p-2"
          >
            <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : '#111827'} />
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  };

  // ---- List header (scrolls with content now) ----
  const listHeader = (
    <View className={`px-5 pt-5 pb-4 mb-3 border-b ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}>
      <View className="flex-row justify-between items-center">
        <View>
          <Text className={`text-2xl font-inter_bold ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>
            My Subjects
          </Text>
          <Text className={`text-sm font-inter_regular mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Showing {displayedSubjects.length} of {filteredSubjects.length} subjects
          </Text>
        </View>
        
        {/* Buttons Container */}
        <View className="flex-row gap-1">
          {/* Add Subject Button */}
          <TouchableOpacity
            onPress={handleAddSubject}
            className="bg-[#3B82F6] px-2 py-2 rounded-lg flex-row items-center"
          >
            <Image
              source={require('@/assets/icons/plus.png')}
              className="w-[24] h-[24]"
              tintColor="white"
            />
            {width >=768 && (
              <Text className="text-white font-inter_semibold mx-2">
                Add Subject
              </Text>
            )}
          </TouchableOpacity>
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={fetchTeacherSubjects}
            disabled={loading}
            className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              className="w-[24] h-[24]"
              tintColor="white"
              style={{
                transform: loading ? [{ rotate: '180deg' }] : [{ rotate: '0deg' }]
              }}
            />
          </TouchableOpacity>
        </View>
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
            onPress={fetchTeacherSubjects}
            className="bg-[#10B981] px-4 py-2 rounded-lg mr-2 justify-center items-center h-[45px]"
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
  );

  // ---- Empty state ----
  const listEmpty = (
    <View className="flex-1 justify-center items-center p-5" style={{ minHeight: 300 }}>
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
          : 'Create your first subject to get started'}
      </Text>
    </View>
  );

  // ---- Footer (loading more / end of list) ----
  const listFooter = (
    <View className="py-5 items-center">
      {isLoadingMore ? (
        <>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text className={`mt-2 text-xs font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Loading more subjects...
          </Text>
        </>
      ) : !hasMore && filteredSubjects.length > ITEMS_PER_PAGE ? (
        <Text className={`text-xs font-inter_regular ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
          All {filteredSubjects.length} subjects loaded
        </Text>
      ) : null}
    </View>
  );

  // Loading state
  if (isLoading || loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchTeacherSubjects}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          Loading your subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Unauthorized access
  if (!isTeacher) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <View className="flex-1 justify-center items-center p-5">
          <Text className={`text-lg font-inter_semibold mb-4 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
            Access Denied
          </Text>
          <Text className={`text-sm font-inter_regular text-center ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
            This page is only available for teachers.
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
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchTeacherSubjects}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Entire screen is now scrollable via FlatList */}
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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      />

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Context Menu */}
      <ContextMenu
        visible={menuVisible}
        x={menuPosition.x}
        y={menuPosition.y}
        onClose={handleCloseMenu}
        items={menuItems}
        menuStyle={{
          backgroundColor: isDarkMode ? '#333333' : 'white',
          borderRadius: 8,
          minWidth: 150,
        }}
        itemStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
        labelStyle={{
          color: isDarkMode ? '#F9FAFB' : '#111827',
          fontSize: 14,
          fontFamily: 'Inter-Medium',
        }}
      />

      {/* Add/Edit Subject Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center p-4 bg-black/50">
          <View className={`rounded-xl p-6 w-full max-w-xl max-h-[85vh] ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
            <Text className={`font-inter_bold text-xl text-center mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {isEditing ? 'Edit Subject' : 'Create New Subject'} <Text className="text-red-500">*</Text>
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Subject Image */}
              <Text className={`font-inter_semibold ml-1 mt-2 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Subject Image (Optional):
              </Text>

              {(selectedImage || (isEditing && currentSubject?.subjectImage)) && (
                <View className="mb-3">
                  <Image
                    source={{ uri: selectedImage || currentSubject?.subjectImage }}
                    className="w-full h-[200px] rounded-lg"
                    contentFit="cover"
                  />
                  {isEditing && currentSubject?.subjectImage && !selectedImage && (
                    <TouchableOpacity
                      onPress={() => currentSubject && handleDeleteImage(currentSubject._id)}
                      className="bg-red-500 p-2 rounded-lg mt-2"
                    >
                      <Text className="text-white font-inter_semibold text-center">Delete Current Image</Text>
                    </TouchableOpacity>
                  )}
                  {selectedImage && (
                    <TouchableOpacity
                      onPress={() => setSelectedImage(null)}
                      className="bg-gray-500 p-2 rounded-lg mt-2"
                    >
                      <Text className="text-white font-inter_semibold text-center">Remove Selected Image</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={handlePickImage}
                className={`p-3 rounded-lg mb-3 border ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {selectedImage || (isEditing && currentSubject?.subjectImage) ? 'Change Image' : 'Upload Image'}
                </Text>
              </TouchableOpacity>

              {/* Class Code */}
              <Text className={`font-inter_semibold ml-1 mt-2 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Class Code <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-3 mb-2 ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600 text-white' : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="e.g. SCIBIOG06"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={classCode}
                onChangeText={(text) => setClassCode(normalizeClassCodeInput(text))}
                maxLength={12}
                autoCapitalize="characters"
              />
              <Text className={`font-inter_regular text-xs mb-2 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Max 12 characters. Letters and numbers only.
              </Text>

              {/* Subject Name */}
              <Text className={`font-inter_semibold ml-1 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Subject Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-3 mb-2 ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600 text-white' : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="e.g. Science Biology 6"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={subjectName}
                onChangeText={setSubjectName}
              />

              {/* Grade Level */}
              <Text className={`font-inter_semibold ml-1 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Grade Level <Text className="text-red-500">*</Text>
              </Text>
              <View className="mb-2">
                <Dropdown
                  data={gradeLevelOptions}
                  selectedValue={gradeLevel}
                  onValueChange={setGradeLevel}
                  placeholder="Select Grade Level"
                />
              </View>

              {/* School Year */}
              <Text className={`font-inter_semibold ml-1 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                School Year <Text className="text-red-500">*</Text>
              </Text>
              <View className="mb-2">
                <Dropdown
                  data={schoolYearFormOptions}
                  selectedValue={schoolYear}
                  onValueChange={setSchoolYear}
                  placeholder="Select School Year"
                  enabled={!activeSchoolYear}
                />
              </View>
              {activeSchoolYear && (
                <Text className={`font-inter_regular text-xs mb-2 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  School year is set by the administrator to {activeSchoolYear}.
                </Text>
              )}

              {/* Section - Now shows admin-created sections */}
              <Text className={`font-inter_semibold ml-1 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Section <Text className="text-red-500">*</Text>
              </Text>
              {!gradeLevel || !schoolYear ? (
                <View className={`p-3 rounded-lg border ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600' : 'bg-gray-100 border-gray-300'
                } mb-2`}>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Please select grade level and school year first
                  </Text>
                </View>
              ) : loadingSections ? (
                <View className={`p-3 rounded-lg border ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600' : 'bg-white border-gray-300'
                }`}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading sections...
                  </Text>
                </View>
              ) : (
                <View className="mb-2">
                  <Dropdown
                    data={sectionOptions}
                    selectedValue={section}
                    onValueChange={setSection}
                    placeholder="Select Section"
                  />
                  {sections.length === 0 && (
                    <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      No sections available for {gradeLevel} - {schoolYear}. Please contact your administrator.
                    </Text>
                  )}
                </View>
              )}

              {/* Description */}
              <Text className={`font-inter_semibold ml-1 mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Description (Optional):
              </Text>
              <TextInput
                className={`font-inter_regular border rounded-lg p-3 mb-2 ${
                  isDarkMode ? 'bg-[#2A2A2A] border-gray-600 text-white' : 'bg-white border-gray-300 text-black'
                }`}
                placeholder="Enter subject description"
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            {/* Buttons */}
            <View className="flex-row mt-4 gap-2">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={uploadingImage || !section}
                className={`p-3 rounded-xl flex-1 items-center ${!section ? 'bg-gray-400' : 'bg-[#3B82F6]'}`}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-inter_semibold text-base">
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
                className="bg-gray-500 p-3 rounded-xl flex-1 items-center"
              >
                <Text className="text-white font-inter_semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SubjectsWeb;