import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
// Remove ContextMenu import
// import ContextMenu from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
// Remove Picker import
// import { Picker } from '@react-native-picker/picker';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

cssInterop(Image, { className: 'style' });

const SubjectArchivesAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Remove menu state and add bottom sheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '30%'], []);

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
      Alert.alert('Error', 'Failed to load archived subjects.');
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
    Alert.alert(
      'Restore Subject',
      'Are you sure you want to restore this subject? It will be moved back to active subjects.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: handleCloseBottomSheet
        },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            try {
              await apiClient.put(`/subjects/${subjectId}/restore`);
              Alert.alert('Success', 'Subject restored successfully.');
              handleCloseBottomSheet();
              fetchArchivedSubjects();
            } catch (error) {
              console.error('Failed to restore subject:', error);
              Alert.alert('Error', 'Failed to restore subject.');
            }
          }
        }
      ]
    );
  };

  const handlePermanentDelete = async (subjectId: string) => {
    Alert.alert(
      'Permanent Delete',
      'Are you sure you want to permanently delete this subject? This action cannot be undone and will delete all related activities, grades, and data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: handleCloseBottomSheet
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Double confirmation for permanent deletion
            Alert.alert(
              'FINAL WARNING',
              'This will permanently delete all data associated with this subject. Are you absolutely sure?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: handleCloseBottomSheet
                },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiClient.delete(`/subjects/${subjectId}/permanent`);
                      Alert.alert('Success', 'Subject permanently deleted.');
                      handleCloseBottomSheet();
                      fetchArchivedSubjects();
                    } catch (error) {
                      console.error('Failed to permanently delete subject:', error);
                      Alert.alert('Error', 'Failed to permanently delete subject.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // Bottom sheet handlers
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = useCallback(({ item }: { item: Subject }) => {
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
        </View>
      );
    }, [isDarkMode, handleOpenBottomSheet]);

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: Subject) => item._id, []);

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
          Loading archived subjects...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (archivedSubjects.length === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
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
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
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

        {/* School Year Filter with DropdownMobile */}
        <View className="mx-4">
          <DropdownMobile
            label="School Year"
            selectedValue={selectedSchoolYear}
            onValueChange={(itemValue) => setSelectedSchoolYear(itemValue)}
            items={[
              { label: 'All School Years', value: 'all' },
              ...schoolYearOptions.map((year) => ({
                label: year,
                value: year,
              }))
            ]}
            placeholder="Select school year..."
            buttonRightIcon={DownIcon}
            buttonStyle={{
              minHeight: 50,
              marginTop: 4,
            }}
          />
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
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 12
            }}
            extraData={isDarkMode}
          />
        )}

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

            {/* Restore Button */}
            <TouchableOpacity
              onPress={() => {
                if (selectedSubject) {
                  handleRestoreSubject(selectedSubject._id);
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
                source={require('@/assets/icons/restore.png')}
                cachePolicy="memory-disk"
                tintColor="#10B981"
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter-18pt-Regular',
                  color: '#10B981',
                }}
              >
                Restore Subject
              </Text>
            </TouchableOpacity>

            {/* Permanent Delete Button */}
            <TouchableOpacity
              onPress={() => {
                if (selectedSubject) {
                  handlePermanentDelete(selectedSubject._id);
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
                Permanent Delete
              </Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>

        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </GestureHandlerRootView>
  );
};

export default React.memo(SubjectArchivesAndroid);