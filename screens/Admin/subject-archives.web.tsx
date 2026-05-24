import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import ContextMenu from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import Dropdown, { DropdownItem } from '@/components/Dropdown';

cssInterop(Image, { className: 'style' });

const SubjectArchivesWeb: React.FC = () => {
  document.title = 'Subject Archives - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  // State
  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Context menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

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

  const itemsPerPageOptions: DropdownItem[] = useMemo(() => [
    { label: '5', value: '5' },
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' },
  ], []);

  // Fetch archived subjects
  const fetchArchivedSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>('/subjects?archived=true');
      setArchivedSubjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch archived subjects:', error);
      window.alert('Error: Failed to load archived subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedSubjects();
  }, [fetchArchivedSubjects]);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return archivedSubjects.filter((subject) => {
      const matchesSearch = subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           subject.section?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel = !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear = !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      
      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [archivedSubjects, searchQuery, selectedGradeLevel, selectedSchoolYear]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear, itemsPerPage]);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Handlers
  const handleRestoreSubject = async (subjectId: string) => {
    const confirmRestore = window.confirm(
      'Are you sure you want to restore this subject? It will be moved back to active subjects.'
    );
    if (confirmRestore) {
      try {
        await apiClient.put(`/subjects/${subjectId}/restore`);
        window.alert('Success: Subject restored successfully.');
        handleCloseMenu();
        fetchArchivedSubjects();
      } catch (error) {
        console.error('Failed to restore subject:', error);
        window.alert('Error: Failed to restore subject.');
      }
    } else {
      handleCloseMenu();
    }
  };

  const handlePermanentDelete = async (subjectId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to permanently delete this subject? This action cannot be undone and will delete all related activities, grades, and data.'
    );
    if (confirmDelete) {
      const finalConfirm = window.confirm(
        'FINAL WARNING: This will permanently delete all data associated with this subject. Are you absolutely sure?'
      );
      if (finalConfirm) {
        try {
          await apiClient.delete(`/subjects/${subjectId}/permanent`);
          window.alert('Success: Subject permanently deleted.');
          handleCloseMenu();
          fetchArchivedSubjects();
        } catch (error) {
          console.error('Failed to permanently delete subject:', error);
          window.alert('Error: Failed to permanently delete subject.');
        }
      } else {
        handleCloseMenu();
      }
    } else {
      handleCloseMenu();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Menu items
  const menuItems = [
    {
      label: 'Restore Subject',
      onPress: () => {
        if (selectedSubject) {
          handleRestoreSubject(selectedSubject._id);
        }
      },
      icon: (
        <Image
          className="w-[20] h-[20] mr-2"
          contentFit="contain"
          source={require('@/assets/icons/restore.png')}
          cachePolicy="memory-disk"
          tintColor="#10B981"
        />
      ),
    },
    {
      label: 'Permanent Delete',
      onPress: () => {
        if (selectedSubject) {
          handlePermanentDelete(selectedSubject._id);
        }
      },
      icon: (
        <Image
          className="w-[20] h-[20] mr-2"
          contentFit="contain"
          source={require('@/assets/icons/delete.png')}
          cachePolicy="memory-disk"
          tintColor="#EF4444"
        />
      ),
    },
  ];

  // Get consistent color (muted for archived)
  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#6B7280', '#9CA3AF', '#D1D5DB', '#6B7280', '#9CA3AF', '#D1D5DB'];
    return colors[Math.abs(hash) % colors.length];
  };

  // Loading state
  if (isLoading || loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`mt-4 text-sm font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          Loading archived subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Render subject item
  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);
    
    // Get adviser names with quarter info from teachers array
    const adviserInfo = item.teachers?.map((ta: any) => {
      const teacher = ta.teacher as any;
      const fullName = teacher?.middleName
        ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
        : `${teacher.firstName} ${teacher.lastName}`;
      
      // If assigned to all quarters, just show name
      if (ta.isAssignedToAllQuarters) {
        return fullName;
      }
      
      // Otherwise, show name with quarters
      const quarters = [];
      if (ta.quarters.firstQuarter) quarters.push("1st");
      if (ta.quarters.secondQuarter) quarters.push("2nd");
      if (ta.quarters.thirdQuarter) quarters.push("3rd");
      if (ta.quarters.fourthQuarter) quarters.push("4th");
      
      if (quarters.length > 0) {
        return `${fullName} (${quarters.join(", ")} Quarter${quarters.length > 1 ? "s" : ""})`;
      }
      return fullName;
    }).join(", ") || "Not assigned";

    const archivedByName = item.archivedBy
      ? item.archivedBy.middleName
        ? `${item.archivedBy.firstName} ${item.archivedBy.middleName} ${item.archivedBy.lastName}`
        : `${item.archivedBy.firstName} ${item.archivedBy.lastName}`
      : 'Unknown';

    return (
      <View
        className={`rounded-xl p-4 mb-3 border opacity-75 ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-row flex-1">
            {/* Icon or Image */}
            {item.subjectImage ? (
              <Image
                source={{ uri: item.subjectImage }}
                className="w-[50px] h-[50px] rounded-lg opacity-60"
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
              <View className="flex-row items-center mb-1">
                <Text
                  className={`text-lg font-inter_bold ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}
                  numberOfLines={1}
                >
                  {item.subjectName}
                </Text>
                <View className="bg-red-500 px-2 py-0.5 rounded ml-2">
                  <Text className="text-white font-inter_semibold text-xs">ARCHIVED</Text>
                </View>
              </View>
              <Text className={`text-sm font-inter_semibold mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                {item.gradeLevel} - {item.section}
              </Text>
              <Text className={`text-sm font-inter_semibold mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                S.Y {item.schoolYear}
              </Text>
              <Text 
                className={`text-sm font-inter_regular mb-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}
                numberOfLines={2}
              >
                Adviser: {adviserInfo}
              </Text>
              <Text className={`text-xs font-inter_regular ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                Archived by {archivedByName} • {item.archivedAt ? formatDate(item.archivedAt) : 'Unknown date'}
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
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
      {/* Header */}
      <View className={`px-5 pt-5 pb-4 border-b ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}>
        <View className="flex-row justify-between items-center">
          <View>
            <Text className={`text-2xl font-inter_bold ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>
              Archived Subjects
            </Text>
            <Text className={`text-sm font-inter_regular mt-1 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSubjects.length)} of {filteredSubjects.length} archived subjects
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchArchivedSubjects}
            className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
            disabled={loading}
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

        {/* Filters */}
        <View className="mt-4">
          <View className="flex-row mb-3">
            <View className="flex-1 mr-2">
              <TextInput
                placeholder="Search archived subjects..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`px-3 py-2.5 h-[45px] rounded-lg font-inter_regular ${
                  isDarkMode ? 'bg-[#2A2A2A] text-[#E0E0E0]' : 'bg-[#F3F4F6] text-[#111827]'
                }`}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
            </View>
            <TouchableOpacity
              onPress={fetchArchivedSubjects}
              className="bg-[#10B981] px-4 py-2 rounded-lg mr-2 justify-center items-center h-[45px]"
            >
              <Text className="text-white font-inter_semibold">Search</Text>
            </TouchableOpacity>
            <View style={{ width: 100 }}>
              <Dropdown
                data={itemsPerPageOptions}
                selectedValue={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
                placeholder="Items per page"
              />
            </View>
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

      {/* Content */}
      <View className="flex-1">
        {paginatedSubjects.length > 0 ? (
          <FlatList
            data={paginatedSubjects}
            renderItem={renderSubjectItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-5">
            <Image
              source={require('@/assets/images/online-course.png')}
              className="w-[64] h-[64] mb-4 opacity-45"
            />
            <Text className={`text-lg font-inter_semibold mb-2 ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
              No archived subjects found
            </Text>
            <Text className={`text-sm font-inter_regular text-center ${isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
              {searchQuery || selectedGradeLevel || selectedSchoolYear
                ? 'Try adjusting your filters'
                : 'No subjects have been archived yet'}
            </Text>
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View className={`px-5 py-4 border-t ${isDarkMode ? 'bg-[#1E1E1E] border-[#333333]' : 'bg-white border-[#E5E7EB]'}`}>
            <View className="flex-row justify-between items-center">
              {/* Previous Button */}
              <TouchableOpacity
                onPress={goToPreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === 1
                    ? isDarkMode ? 'bg-[#2A2A2A]' : 'bg-[#F3F4F6]'
                    : 'bg-[#3B82F6]'
                }`}
              >
                <Text className={`font-inter_semibold ${
                  currentPage === 1
                    ? isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
                    : 'text-white'
                }`}>
                  Previous
                </Text>
              </TouchableOpacity>

              {/* Page Numbers */}
              <View className="flex-row gap-2">
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <View key={`ellipsis-${index}`} className="px-3 py-2">
                        <Text className={`font-inter_regular ${isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          ...
                        </Text>
                      </View>
                    );
                  }
                  
                  const isCurrentPage = page === currentPage;
                  
                  return (
                    <TouchableOpacity
                      key={page}
                      onPress={() => goToPage(page as number)}
                      className={`px-3 py-2 rounded-lg min-w-[40px] items-center ${
                        isCurrentPage
                          ? 'bg-[#3B82F6]'
                          : isDarkMode ? 'bg-[#2A2A2A]' : 'bg-[#F3F4F6]'
                      }`}
                    >
                      <Text className={`font-inter_semibold ${
                        isCurrentPage
                          ? 'text-white'
                          : isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'
                      }`}>
                        {page}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Next Button */}
              <TouchableOpacity
                onPress={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg ${
                  currentPage === totalPages
                    ? isDarkMode ? 'bg-[#2A2A2A]' : 'bg-[#F3F4F6]'
                    : 'bg-[#3B82F6]'
                }`}
              >
                <Text className={`font-inter_semibold ${
                  currentPage === totalPages
                    ? isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
                    : 'text-white'
                }`}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

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
    </View>
  );
};

export default SubjectArchivesWeb;