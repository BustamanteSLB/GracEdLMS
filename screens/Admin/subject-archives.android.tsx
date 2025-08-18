import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import ContextMenu from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Picker } from '@react-native-picker/picker';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  VirtualizedList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

cssInterop(Image, { className: 'style' });

const SubjectArchivesWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');

  // Generate school year options
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

  // Filter subjects based on selected school year
  useEffect(() => {
    if (selectedSchoolYear === 'all') {
      setFilteredSubjects(archivedSubjects);
    } else {
      const filtered = archivedSubjects.filter(subject => 
        subject.schoolYear === selectedSchoolYear
      );
      setFilteredSubjects(filtered);
    }
  }, [archivedSubjects, selectedSchoolYear]);

  useEffect(() => {
    fetchArchivedSubjects();
  }, [fetchArchivedSubjects]);

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
      // Double confirmation for permanent deletion
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
    setMenuPosition({ x: pageX - 150, y: pageY - 40 });
    setSelectedSubject(subject);
    setMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setMenuVisible(false);
    setSelectedSubject(null);
  };

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
          className="w-[24] h-[24] mr-1"
          contentFit="contain"
          source={require('@/assets/icons/restore.png')}
          cachePolicy="memory-disk"
          tintColor="green"
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
          className="w-[24] h-[24] mr-1"
          contentFit="contain"
          source={require('@/assets/icons/delete.png')}
          cachePolicy="memory-disk"
          tintColor="red"
        />
      ),
    },
  ];

  const getItemCount = (_data: Subject[]) => _data.length;
  const getItem = (_data: Subject[], index: number) => _data[index];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          Loading archived subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (archivedSubjects.length === 0) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <View className="flex-row mt-2 mb-2">
          <Text
            className={`font-inter_bold mx-4 my-2 text-lg ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            Archived Subjects
          </Text>

          {/* Refresh Button in empty state */}
          <TouchableOpacity
            onPress={() => {
              fetchArchivedSubjects();
              console.log('Refreshing archived subjects...');
            }}
            className={`rounded-md justify-center items-center ml-auto mr-3 p-2 ${
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
        <View className="flex-1 justify-center items-center">
          <Image
            className="w-[150] h-[150]"
            contentFit="contain"
            source={require('@/assets/images/online-course.png')}
            cachePolicy="memory-disk"
          />
          <Text
            className={`font-inter_regular mt-4 text-center px-4 ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            No archived subjects found.
          </Text>
        </View>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <View className="flex-row mt-2 mb-2">
        <Text
          className={`font-inter_bold mx-4 mt-2 text-lg ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          Archived Subjects ({filteredSubjects.length})
        </Text>

        {/* Refresh Button */}
        <TouchableOpacity
          onPress={() => {
            fetchArchivedSubjects();
            console.log('Refreshing archived subjects...');
          }}
          className={`rounded-md justify-center items-center ml-auto mr-3 p-2 ${
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

      {/* School Year Filter */}
      <View className="mx-4 mb-4">
        <Text
          className={`font-inter_semibold mb-2 ${
            isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
          }`}
        >
          Filter by School Year:
        </Text>
        <View
          className={`rounded-lg border ${
            isDarkMode ? 'bg-[#1E1E1E] border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <Picker
            selectedValue={selectedSchoolYear}
            onValueChange={(itemValue) => setSelectedSchoolYear(itemValue)}
            style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
              color: isDarkMode ? '#E0E0E0' : 'black',
              fontFamily: 'Inter-18pt-Regular',
              fontSize: 14,
              padding: 8,
            }}
            dropdownIconColor={isDarkMode ? '#E0E0E0' : 'black'}
            mode="dropdown"
          >
            <Picker.Item label="All School Years" value="all" />
            {schoolYearOptions.map((year) => (
              <Picker.Item key={year} label={year} value={year} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Show filtered results count */}
      {selectedSchoolYear !== 'all' && (
        <View className="mx-4 mb-2">
          <Text
            className={`font-inter_regular text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Showing {filteredSubjects.length} subjects for {selectedSchoolYear}
          </Text>
        </View>
      )}

      {/* Show message if no results found for selected filter */}
      {filteredSubjects.length === 0 && selectedSchoolYear !== 'all' ? (
        <View className="flex-1 justify-center items-center">
          <Image
            className="w-[150] h-[150]"
            contentFit="contain"
            source={require('@/assets/images/online-course.png')}
            cachePolicy="memory-disk"
          />
          <Text
            className={`font-inter_regular mt-4 text-center px-4 ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-black'
            }`}
          >
            No archived subjects found for {selectedSchoolYear}.
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedSchoolYear('all')}
            className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-inter_semibold">
              Show All School Years
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filteredSubjects}
          estimatedItemSize={100}
          renderItem={({ item }: { item: Subject }) => {
            const initials = item.subjectName.slice(0, 2).toUpperCase();
            const getConsistentColor = (str: string) => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
              }
              const colors = ['#6B7280', '#9CA3AF', '#D1D5DB']; // Muted colors for archived items
              return colors[Math.abs(hash) % colors.length];
            };
            const bgColor = getConsistentColor(item.subjectName);

            const teacherName = item.teacher
              ? item.teacher.middleName
                ? `${item.teacher.firstName} ${item.teacher.middleName} ${item.teacher.lastName}`
                : `${item.teacher.firstName} ${item.teacher.lastName}`
              : 'Not assigned';

            const archivedByName = item.archivedBy
              ? item.archivedBy.middleName
                ? `${item.archivedBy.firstName} ${item.archivedBy.middleName} ${item.archivedBy.lastName}`
                : `${item.archivedBy.firstName} ${item.archivedBy.lastName}`
              : 'Unknown';

            return (
              <View
                className='flex-row p-3 mb-2 opacity-75'
                style={{
                  borderLeftWidth: 12,
                  borderRightWidth: 2,
                  borderTopWidth: 2,
                  borderBottomWidth: 2,
                  borderColor: bgColor,
                  backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9',
                }}
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

                  <Text
                    className={`font-inter_regular text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Adviser: {teacherName}
                  </Text>

                  <Text
                    className={`font-inter_regular text-xs mt-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    Archived by {archivedByName} on {item.archivedAt ? formatDate(item.archivedAt) : 'Unknown date'}
                  </Text>
                </View>

                <Pressable
                  onPress={(event) => handleOpenMenu(event, item)}
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
              </View>
            );
          }}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 12
          }}
        />
      )}

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
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default SubjectArchivesWeb;