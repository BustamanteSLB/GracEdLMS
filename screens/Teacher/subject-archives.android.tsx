import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  ToastAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropdownMobile from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import NetworkBanner from '@/components/NetworkBanner.android';

cssInterop(Image, { className: 'style' });

/** Teachers may only manage subjects they are assigned to. */
const isOwnSubject = (subject: Subject, userId?: string) => {
  if (!userId || !Array.isArray((subject as any).teachers)) return false;
  return (subject as any).teachers.some((ta: any) => {
    const teacher = ta?.teacher;
    if (!teacher) return false;
    if (typeof teacher === 'string') return teacher === userId;
    return teacher._id === userId || teacher.id === userId;
  });
};

const ARCHIVED_COLORS = ['#6B7280', '#9CA3AF', '#D1D5DB'];

const getConsistentColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ARCHIVED_COLORS[Math.abs(hash) % ARCHIVED_COLORS.length];
};

const getAdviserInfo = (item: Subject): string => {
  const teachers = (item as any).teachers;
  if (!teachers || teachers.length === 0) {
    if (item.teacher) {
      return item.teacher.middleName
        ? `${item.teacher.firstName} ${item.teacher.middleName} ${item.teacher.lastName}`
        : `${item.teacher.firstName} ${item.teacher.lastName}`;
    }
    return 'Not assigned';
  }
  return (
    teachers
      .map((ta: any) => {
        const teacher = ta.teacher;
        if (!teacher || typeof teacher === 'string') return null;
        const fullName = teacher.middleName
          ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
          : `${teacher.firstName} ${teacher.lastName}`;
        if (ta.isAssignedToAllTerms) return fullName;
        const terms: string[] = [];
        if (ta.terms?.['1']) terms.push('1st');
        if (ta.terms?.['2']) terms.push('2nd');
        if (ta.terms?.['3']) terms.push('3rd');
        if (terms.length > 0) {
          return `${fullName} (${terms.join(', ')} Term${terms.length > 1 ? 's' : ''})`;
        }
        return fullName;
      })
      .filter(Boolean)
      .join(', ') || 'Not assigned'
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ------------------------------------------------------------------ */
/*  ArchivedSubjectItem — memoized row (matches web card styling)      */
/* ------------------------------------------------------------------ */
interface ArchivedSubjectItemProps {
  item: Subject;
  isDarkMode: boolean;
  isSelected: boolean;
  anyActionLoading: boolean;
  onToggleSelect: (id: string) => void;
  onMenuPress: (subject: Subject) => void;
}

const ArchivedSubjectItem = React.memo<ArchivedSubjectItemProps>(
  ({
    item,
    isDarkMode,
    isSelected,
    anyActionLoading,
    onToggleSelect,
    onMenuPress,
  }) => {
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);
    const adviserInfo = getAdviserInfo(item);

    const archivedByName = item.archivedBy
      ? item.archivedBy.middleName
        ? `${item.archivedBy.firstName} ${item.archivedBy.middleName} ${item.archivedBy.lastName}`
        : `${item.archivedBy.firstName} ${item.archivedBy.lastName}`
      : 'Unknown';

    return (
      <View
        className={`rounded-xl p-4 mt-3 mx-3 border ${
          isSelected
            ? isDarkMode
              ? 'bg-[#2A3A4A] border-[#1877F2]'
              : 'bg-[#E7F3FF] border-[#1877F2]'
            : isDarkMode
              ? 'bg-[#1E1E1E] border-[#333333] opacity-75'
              : 'bg-white border-[#E5E7EB] opacity-75'
        }`}
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
            <View className="mr-3 pt-1">
              <Checkbox
                value={isSelected}
                onValueChange={() => onToggleSelect(item._id)}
                color={isSelected ? '#1877F2' : undefined}
                disabled={anyActionLoading}
              />
            </View>

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
                <Text className="text-white font-inter_bold text-lg">
                  {initials}
                </Text>
              </View>
            )}

            <View className="flex-1 ml-3">
              <View className="flex-row items-center mb-1 flex-wrap">
                <Text
                  className={`text-lg font-inter_bold ${
                    isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'
                  }`}
                  numberOfLines={1}
                >
                  {item.subjectName}
                </Text>
                <View className="bg-red-500 px-2 py-0.5 rounded ml-2">
                  <Text className="text-white font-inter_semibold text-xs">
                    ARCHIVED
                  </Text>
                </View>
              </View>
              <Text
                className={`text-sm font-inter_semibold mb-1 ${
                  isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                }`}
              >
                {item.gradeLevel} - {item.section}
              </Text>
              <Text
                className={`text-sm font-inter_semibold mb-1 ${
                  isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                }`}
              >
                S.Y {item.schoolYear}
              </Text>
              <Text
                className={`text-sm font-inter_regular mb-1 ${
                  isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                }`}
                numberOfLines={2}
              >
                Adviser: {adviserInfo}
              </Text>
              <Text
                className={`text-xs font-inter_regular ${
                  isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
                }`}
              >
                Archived by {archivedByName} •{' '}
                {item.archivedAt ? formatDate(item.archivedAt) : 'Unknown date'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => onMenuPress(item)}
            className="p-2"
            disabled={anyActionLoading}
          >
            <Image
              className="w-[20px] h-[20px]"
              contentFit="contain"
              source={require('@/assets/icons/more_vert.png')}
              cachePolicy="memory-disk"
              tintColor={isDarkMode ? '#E0E0E0' : '#111827'}
            />
          </Pressable>
        </View>
      </View>
    );
  }
);
ArchivedSubjectItem.displayName = 'ArchivedSubjectItem';

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const SubjectArchivesAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  // Actions modal (replaces bottom sheet)
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('all');

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

  const fetchArchivedSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>('/subjects?archived=true');
      const ownOnly = (response.data.data || []).filter((s) =>
        isOwnSubject(s, user?._id)
      );
      setArchivedSubjects(ownOnly);
      setSelectedIds(new Set());
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.error('Failed to fetch archived subjects:', error);
      ToastAndroid.show('Failed to load archived subjects.', ToastAndroid.SHORT);
      const isNetworkError =
        !error?.response ||
        error?.code === 'ECONNABORTED' ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('timeout');
      if (isNetworkError) setForceNetworkBannerVisible(true);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (selectedSchoolYear === 'all') {
      setFilteredSubjects(archivedSubjects.filter((s) => isOwnSubject(s, user?._id)));
    } else {
      setFilteredSubjects(
        archivedSubjects.filter(
          (subject) =>
            isOwnSubject(subject, user?._id) &&
            subject.schoolYear === selectedSchoolYear
        )
      );
    }
  }, [archivedSubjects, selectedSchoolYear, user?._id]);

  useEffect(() => {
    if (user?._id) fetchArchivedSubjects();
  }, [fetchArchivedSubjects, user?._id]);

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => selectedIds.has(s._id));
  const someFilteredSelected =
    filteredSubjects.some((s) => selectedIds.has(s._id)) && !allFilteredSelected;

  const toggleSelectSubject = useCallback((subjectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        filteredSubjects.length > 0 &&
        filteredSubjects.every((s) => next.has(s._id));
      if (allSelected) filteredSubjects.forEach((s) => next.delete(s._id));
      else filteredSubjects.forEach((s) => next.add(s._id));
      return next;
    });
  }, [filteredSubjects]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const removeSubjectsFromState = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setArchivedSubjects((prev) => prev.filter((s) => !idSet.has(s._id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleRestoreSubject = async (subjectId: string) => {
    const subject =
      archivedSubjects.find((s) => s._id === subjectId) || selectedSubject;
    if (!subject || !isOwnSubject(subject, user?._id)) {
      Alert.alert('Error', 'You can only restore subjects assigned to you.');
      handleCloseActionsModal();
      return;
    }

    Alert.alert(
      'Restore Subject',
      'Are you sure you want to restore this subject? It will be moved back to active subjects.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: handleCloseActionsModal,
        },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            setActionLoading(`${subjectId}_restore`);
            try {
              await apiClient.put(`/subjects/${subjectId}/restore`);
              ToastAndroid.show('Subject restored successfully.', ToastAndroid.SHORT);
              handleCloseActionsModal();
              removeSubjectsFromState([subjectId]);
            } catch (error: any) {
              console.error('Failed to restore subject:', error);
              ToastAndroid.show(error.response?.data?.message || 'Failed to restore subject.', ToastAndroid.SHORT);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handlePermanentDelete = async (subjectId: string) => {
    const subject =
      archivedSubjects.find((s) => s._id === subjectId) || selectedSubject;
    if (!subject || !isOwnSubject(subject, user?._id)) {
      Alert.alert(
        'Error',
        'You can only permanently delete subjects assigned to you.'
      );
      handleCloseActionsModal();
      return;
    }

    Alert.alert(
      'Permanent Delete',
      'Are you sure you want to permanently delete this subject? This action cannot be undone and will delete all related activities, grades, and data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: handleCloseActionsModal,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'FINAL WARNING',
              'This will permanently delete all data associated with this subject. Are you absolutely sure?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: handleCloseActionsModal,
                },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setActionLoading(`${subjectId}_delete`);
                    try {
                      await apiClient.delete(`/subjects/${subjectId}/permanent`);
                      ToastAndroid.show('Subject permanently deleted.', ToastAndroid.SHORT);
                      handleCloseActionsModal();
                      removeSubjectsFromState([subjectId]);
                    } catch (error: any) {
                      console.error('Failed to permanently delete subject:', error);
                      ToastAndroid.show(error.response?.data?.message || 'Failed to permanently delete subject.', ToastAndroid.SHORT);
                    } finally {
                      setActionLoading(null);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleBulkRestore = useCallback(() => {
    const ids = Array.from(selectedIds).filter((id) => {
      const subject = archivedSubjects.find((s) => s._id === id);
      return subject && isOwnSubject(subject, user?._id);
    });
    if (ids.length === 0) {
      Alert.alert('Error', 'You can only restore subjects assigned to you.');
      return;
    }

    Alert.alert(
      'Restore Subjects',
      `Restore ${ids.length} selected subject${ids.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setActionLoading('bulk_restore');
            const succeeded: string[] = [];
            const failed: string[] = [];
            for (const id of ids) {
              try {
                await apiClient.put(`/subjects/${id}/restore`);
                succeeded.push(id);
              } catch {
                failed.push(id);
              }
            }
            if (succeeded.length > 0) removeSubjectsFromState(succeeded);
            setActionLoading(null);
            clearSelection();
            ToastAndroid.show(failed.length === 0 ? 'Subjects restored successfully.' : 'Partial success. Some subjects failed to restore.', ToastAndroid.SHORT);
          },
        },
      ]
    );
  }, [selectedIds, archivedSubjects, user?._id, clearSelection, removeSubjectsFromState]);

  const handleBulkPermanentDelete = useCallback(() => {
    const ids = Array.from(selectedIds).filter((id) => {
      const subject = archivedSubjects.find((s) => s._id === id);
      return subject && isOwnSubject(subject, user?._id);
    });
    if (ids.length === 0) {
      Alert.alert(
        'Error',
        'You can only permanently delete subjects assigned to you.'
      );
      return;
    }

    Alert.alert(
      'Permanent Delete',
      `Permanently delete ${ids.length} selected subject${
        ids.length === 1 ? '' : 's'
      }? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'FINAL WARNING',
              'Delete all related data for the selected subjects?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setActionLoading('bulk_delete');
                    const succeeded: string[] = [];
                    const failed: string[] = [];
                    for (const id of ids) {
                      try {
                        await apiClient.delete(`/subjects/${id}/permanent`);
                        succeeded.push(id);
                      } catch {
                        failed.push(id);
                      }
                    }
                    if (succeeded.length > 0) removeSubjectsFromState(succeeded);
                    setActionLoading(null);
                    clearSelection();
                    ToastAndroid.show(failed.length === 0 ? 'Subjects permanently deleted successfully.' : 'Partial success. Some subjects failed to delete.', ToastAndroid.SHORT);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [selectedIds, archivedSubjects, user?._id, clearSelection, removeSubjectsFromState]);

  const handleOpenActionsModal = useCallback(
    (subject: Subject) => {
      if (!isOwnSubject(subject, user?._id)) {
        Alert.alert(
          'Not Allowed',
          'You can only restore or delete subjects assigned to you.'
        );
        return;
      }
      setSelectedSubject(subject);
      setActionsModalVisible(true);
    },
    [user?._id]
  );

  const handleCloseActionsModal = useCallback(() => {
    setActionsModalVisible(false);
    setSelectedSubject(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Subject }) => (
      <ArchivedSubjectItem
        item={item}
        isDarkMode={isDarkMode}
        isSelected={selectedIds.has(item._id)}
        anyActionLoading={!!actionLoading}
        onToggleSelect={toggleSelectSubject}
        onMenuPress={handleOpenActionsModal}
      />
    ),
    [
      isDarkMode,
      selectedIds,
      actionLoading,
      toggleSelectSubject,
      handleOpenActionsModal,
    ]
  );

  const keyExtractor = useCallback((item: Subject) => item._id, []);

  if (isLoading || loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'
        }`}
      >
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchArchivedSubjects}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text
          className={`mt-4 text-sm font-inter_regular ${
            isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
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
      <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchArchivedSubjects}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />

        <View
          className={`px-5 pt-5 pb-4 border-b ${
            isDarkMode
              ? 'bg-[#1E1E1E] border-[#333333]'
              : 'bg-white border-[#E5E7EB]'
          }`}
        >
          <View className="flex-row justify-between items-center">
            <View style={{ flex: 1 }}>
              <Text
                className={`text-2xl font-inter_bold ${
                  isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'
                }`}
              >
                My Archived Subjects
              </Text>
              <Text
                className={`text-sm font-inter_regular mt-1 ${
                  isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                }`}
              >
                None of your subjects have been archived yet
              </Text>
            </View>
            <TouchableOpacity
              onPress={fetchArchivedSubjects}
              className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
              disabled={loading}
            >
              <Image
                source={require('@/assets/icons/refresh.png')}
                className="w-[24px] h-[24px]"
                tintColor="white"
                style={{
                  transform: loading
                    ? [{ rotate: '180deg' }]
                    : [{ rotate: '0deg' }],
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 justify-center items-center p-10">
          <Image
            source={require('@/assets/images/online-course.png')}
            className="w-[64px] h-[64px] mb-4 opacity-45"
            contentFit="contain"
          />
          <Text
            className={`text-lg font-inter_semibold mb-2 ${
              isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
            }`}
          >
            No archived subjects found
          </Text>
          <Text
            className={`text-sm font-inter_regular text-center ${
              isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
            }`}
          >
            None of your subjects have been archived yet
          </Text>
        </View>

        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchArchivedSubjects}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Header matching web style */}
      <View
        className={`px-5 pt-5 pb-4 border-b ${
          isDarkMode
            ? 'bg-[#1E1E1E] border-[#333333]'
            : 'bg-white border-[#E5E7EB]'
        }`}
      >
        <View className="flex-row justify-between items-center">
          <View style={{ flex: 1 }}>
            <Text
              className={`text-2xl font-inter_bold ${
                isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'
              }`}
            >
              My Archived Subjects
            </Text>
            <Text
              className={`text-sm font-inter_regular mt-1 ${
                isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
              }`}
            >
              Showing {filteredSubjects.length} of your archived subjects
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchArchivedSubjects}
            className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
            disabled={loading || !!actionLoading}
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              className="w-[24px] h-[24px]"
              tintColor="white"
              style={{
                transform: loading
                  ? [{ rotate: '180deg' }]
                  : [{ rotate: '0deg' }],
              }}
            />
          </TouchableOpacity>
        </View>

        {/* School Year Filter */}
        <View className="mt-4">
          <Text
            className={`text-xs font-inter_medium mb-1 ${
              isDarkMode ? 'text-[#E0E0E0]' : 'text-[#6B7280]'
            }`}
          >
            School Year
          </Text>
          <DropdownMobile
            label="School Year"
            selectedValue={selectedSchoolYear}
            onValueChange={(itemValue) => setSelectedSchoolYear(itemValue)}
            items={[
              { label: 'All School Years', value: 'all' },
              ...schoolYearOptions.map((year) => ({
                label: year,
                value: year,
              })),
            ]}
            placeholder="All School Years"
            buttonRightIcon={DownIcon}
            buttonStyle={{
              minHeight: 45,
              marginTop: 0,
            }}
          />
        </View>

        {/* Selection + bulk actions */}
        {filteredSubjects.length > 0 && (
          <View
            className={`mt-4 pt-3 border-t flex-row items-center justify-between flex-wrap ${
              isDarkMode ? 'border-[#333333]' : 'border-[#E5E7EB]'
            }`}
            style={{ gap: 12 }}
          >
            <View
              className="flex-row items-center"
              style={{ opacity: actionLoading ? 0.6 : 1 }}
            >
              <Checkbox
                value={allFilteredSelected}
                onValueChange={toggleSelectAllFiltered}
                color={
                  allFilteredSelected || someFilteredSelected
                    ? '#1877F2'
                    : undefined
                }
                disabled={!!actionLoading}
              />
              <TouchableOpacity
                onPress={toggleSelectAllFiltered}
                disabled={!!actionLoading}
              >
                <Text
                  className={`ml-2.5 text-sm font-inter_semibold ${
                    isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'
                  }`}
                >
                  {allFilteredSelected
                    ? 'Deselect all'
                    : `Select all (${filteredSubjects.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCount > 0 && (
              <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                <Text
                  className={`text-xs font-inter_regular mr-1 ${
                    isDarkMode ? 'text-[#B0B3B8]' : 'text-[#65676B]'
                  }`}
                >
                  {selectedCount} selected
                </Text>

                <TouchableOpacity
                  onPress={clearSelection}
                  disabled={!!actionLoading}
                  className={`rounded-lg px-3 py-2 ${
                    isDarkMode ? 'bg-[#3A3B3C]' : 'bg-[#E4E6EA]'
                  }`}
                  style={{ opacity: actionLoading ? 0.6 : 1 }}
                >
                  <Text
                    className={`text-xs font-inter_semibold ${
                      isDarkMode ? 'text-[#E4E6EA]' : 'text-[#1C1E21]'
                    }`}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBulkRestore}
                  disabled={!!actionLoading}
                  className="bg-[#10B981] rounded-lg px-3 py-2 flex-row items-center"
                  style={{ opacity: actionLoading ? 0.6 : 1 }}
                >
                  {actionLoading === 'bulk_restore' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Image
                        source={require('@/assets/icons/restore.png')}
                        className="w-[16px] h-[16px] mr-1.5"
                        tintColor="#FFFFFF"
                        contentFit="contain"
                      />
                      <Text className="text-xs font-inter_semibold text-white">
                        Restore
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBulkPermanentDelete}
                  disabled={!!actionLoading}
                  className="bg-[#EF4444] rounded-lg px-3 py-2 flex-row items-center"
                  style={{ opacity: actionLoading ? 0.6 : 1 }}
                >
                  {actionLoading === 'bulk_delete' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Image
                        source={require('@/assets/icons/delete.png')}
                        className="w-[16px] h-[16px] mr-1.5"
                        tintColor="#FFFFFF"
                        contentFit="contain"
                      />
                      <Text className="text-xs font-inter_semibold text-white">
                        Delete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Filtered results info */}
      {selectedSchoolYear !== 'all' && (
        <View className="mx-5 mt-2">
          <Text
            className={`font-inter_regular text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Showing {filteredSubjects.length} of your subjects for{' '}
            {selectedSchoolYear}
          </Text>
        </View>
      )}

      {/* Show message if no results found for selected filter */}
      {filteredSubjects.length === 0 && selectedSchoolYear !== 'all' ? (
        <View className="flex-1 justify-center items-center p-10">
          <Image
            className="w-[64px] h-[64px] mb-4 opacity-45"
            contentFit="contain"
            source={require('@/assets/images/online-course.png')}
            cachePolicy="memory-disk"
          />
          <Text
            className={`font-inter_semibold text-lg mb-2 ${
              isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
            }`}
          >
            No archived subjects found
          </Text>
          <Text
            className={`font-inter_regular text-sm text-center mb-4 ${
              isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
            }`}
          >
            Try adjusting your filters
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedSchoolYear('all')}
            className="bg-[#3B82F6] px-4 py-2 rounded-lg"
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
            paddingBottom: 20,
          }}
          extraData={{ isDarkMode, selectedIds, actionLoading }}
        />
      )}

      {/* ─── ACTIONS MODAL (replaces BottomSheet) ──────────────────────── */}
      <Modal
        visible={actionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseActionsModal}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={handleCloseActionsModal}
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
                  marginBottom: 4,
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
                  marginBottom: 8,
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
                    fontFamily: 'Inter-Regular',
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
                  marginBottom: 8,
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
                    fontFamily: 'Inter-Regular',
                    color: '#EF4444',
                  }}
                >
                  Permanent Delete
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={handleCloseActionsModal}
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
                    fontFamily: 'Inter-SemiBold',
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

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
};

export default React.memo(SubjectArchivesAndroid);