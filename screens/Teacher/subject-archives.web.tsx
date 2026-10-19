// Teacher/subject-archives.web.tsx
import apiClient from '@/app/services/apiClient';
import { Subject } from '@/app/types/index';
import ContextMenu from '@/components/ContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Image } from 'expo-image';
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  memo,
} from 'react';
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
import NetworkBanner from '@/components/NetworkBanner.web';

cssInterop(Image, { className: 'style' });

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const ITEMS_PER_PAGE = 10;

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

const GRADE_LEVEL_FILTER_OPTIONS: DropdownItem[] = [
  { label: 'All Grade Levels', value: '' },
  { label: 'Grade 1', value: 'Grade 1' },
  { label: 'Grade 2', value: 'Grade 2' },
  { label: 'Grade 3', value: 'Grade 3' },
  { label: 'Grade 4', value: 'Grade 4' },
  { label: 'Grade 5', value: 'Grade 5' },
  { label: 'Grade 6', value: 'Grade 6' },
];

const buildSchoolYearFilterOptions = (): DropdownItem[] => {
  const currentYear = new Date().getFullYear();
  const options: DropdownItem[] = [{ label: 'All School Years', value: '' }];

  const previousYear = currentYear - 1;
  options.push({
    label: `${previousYear} - ${currentYear}`,
    value: `${previousYear} - ${currentYear}`,
  });

  for (let i = 0; i < 4; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    options.push({
      label: `${startYear} - ${endYear}`,
      value: `${startYear} - ${endYear}`,
    });
  }

  return options;
};

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */
const ARCHIVED_COLORS = ['#6B7280', '#9CA3AF', '#D1D5DB'];

const getConsistentColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ARCHIVED_COLORS[Math.abs(hash) % ARCHIVED_COLORS.length];
};

const getAdviserInfo = (item: Subject): string => {
  if (!item.teachers || item.teachers.length === 0) return 'Not assigned';
  return (
    item.teachers
      .map((ta: any) => {
        const teacher = ta.teacher as any;
        if (!teacher) return null;
        const fullName = teacher.middleName
          ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
          : `${teacher.firstName} ${teacher.lastName}`;
        if (ta.isAssignedToAllTerms) return fullName;
        const terms: string[] = [];
        if (ta.terms?.['1']) terms.push('1st');
        if (ta.terms?.['2']) terms.push('2nd');
        if (ta.terms?.['3']) terms.push('3rd');
        if (terms.length > 0) {
          return `${fullName} (${terms.join(', ')} Term${
            terms.length > 1 ? 's' : ''
          })`;
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
/*  ArchivedSubjectItem — memoized row                                 */
/* ------------------------------------------------------------------ */
interface ArchivedSubjectItemProps {
  item: Subject;
  isDarkMode: boolean;
  isSelected: boolean;
  anyActionLoading: boolean;
  onToggleSelect: (id: string) => void;
  onMenuPress: (event: any, subject: Subject) => void;
}

const ArchivedSubjectItem = memo<ArchivedSubjectItemProps>(
  ({
    item,
    isDarkMode,
    isSelected,
    anyActionLoading,
    onToggleSelect,
    onMenuPress,
  }) => {
    const handleMenuPress = useCallback(
      (event: any) => onMenuPress(event, item),
      [item, onMenuPress]
    );

    const handleToggleSelect = useCallback(() => {
      onToggleSelect(item._id);
    }, [item._id, onToggleSelect]);

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
                onValueChange={handleToggleSelect}
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
              <View className="flex-row items-center mb-1">
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

          <Pressable onPress={handleMenuPress} className="p-2">
            <MoreVertIcon
              width={20}
              height={20}
              fill={isDarkMode ? '#E0E0E0' : '#111827'}
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
const SubjectArchivesWeb: React.FC = () => {
  document.title = 'My Subject Archives - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  /* ------------------------- data state ------------------------- */
  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ------------------------- pagination state ------------------- */
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<FlatList<Subject>>(null);

  /* ------------------------- network banner --------------------- */
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  /* ------------------------- context menu ----------------------- */
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  /* ------------------------- memoized options ------------------- */
  const schoolYearFilterOptions = useMemo(
    () => buildSchoolYearFilterOptions(),
    []
  );

  /* ------------------------- fetch ------------------------------ */
  const fetchArchivedSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Subject[] }>(
        '/subjects?archived=true'
      );
      // Defense-in-depth: only keep subjects assigned to this teacher
      const ownOnly = (response.data.data || []).filter((s) =>
        isOwnSubject(s, user?._id)
      );
      setArchivedSubjects(ownOnly);
      setSelectedIds(new Set());
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.error('Failed to fetch archived subjects:', error);
      window.alert('Error: Failed to load archived subjects.');

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
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) fetchArchivedSubjects();
  }, [fetchArchivedSubjects, user?._id]);

  /* ------------------------- derived data ----------------------- */
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return archivedSubjects.filter((subject) => {
      if (!isOwnSubject(subject, user?._id)) return false;
      const matchesSearch =
        subject.subjectName.toLowerCase().includes(q) ||
        subject.description?.toLowerCase().includes(q) ||
        subject.section?.toLowerCase().includes(q);
      const matchesGradeLevel =
        !selectedGradeLevel || subject.gradeLevel === selectedGradeLevel;
      const matchesSchoolYear =
        !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      return matchesSearch && matchesGradeLevel && matchesSchoolYear;
    });
  }, [archivedSubjects, searchQuery, selectedGradeLevel, selectedSchoolYear, user?._id]);

  const displayedSubjects = useMemo(
    () => filteredSubjects.slice(0, displayedCount),
    [filteredSubjects, displayedCount]
  );

  const hasMore = displayedCount < filteredSubjects.length;

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => selectedIds.has(s._id));
  const someFilteredSelected =
    filteredSubjects.some((s) => selectedIds.has(s._id)) && !allFilteredSelected;

  /* ------------------------- reset pagination on filter change --- */
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch {}
  }, [searchQuery, selectedGradeLevel, selectedSchoolYear]);

  /* ------------------------- infinite scroll --------------------- */
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Small delay so the footer spinner is perceivable
    setTimeout(() => {
      setDisplayedCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, filteredSubjects.length)
      );
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredSubjects.length]);

  /* ------------------------- handlers ---------------------------- */
  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
    setSelectedSubject(null);
  }, []);

  const handleOpenMenu = useCallback(
    (event: any, subject: Subject) => {
      if (!isOwnSubject(subject, user?._id)) {
        window.alert(
          'You can only restore or delete subjects assigned to you.'
        );
        return;
      }
      const { pageX, pageY } = event.nativeEvent;
      setMenuPosition({ x: pageX, y: pageY });
      setSelectedSubject(subject);
      setMenuVisible(true);
    },
    [user?._id]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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
      if (allSelected) {
        filteredSubjects.forEach((s) => next.delete(s._id));
      } else {
        filteredSubjects.forEach((s) => next.add(s._id));
      }
      return next;
    });
  }, [filteredSubjects]);

  const removeSubjectsFromState = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setArchivedSubjects((prev) => prev.filter((s) => !idSet.has(s._id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleRestoreSubject = useCallback(
    async (subjectId: string) => {
      const subject =
        archivedSubjects.find((s) => s._id === subjectId) || selectedSubject;
      if (!subject || !isOwnSubject(subject, user?._id)) {
        window.alert('Error: You can only restore subjects assigned to you.');
        handleCloseMenu();
        return;
      }

      const confirmRestore = window.confirm(
        'Are you sure you want to restore this subject? It will be moved back to active subjects.'
      );
      if (!confirmRestore) {
        handleCloseMenu();
        return;
      }

      setActionLoading(`${subjectId}_restore`);
      try {
        await apiClient.put(`/subjects/${subjectId}/restore`);
        window.alert('Success: Subject restored successfully.');
        handleCloseMenu();
        removeSubjectsFromState([subjectId]);
      } catch (error: any) {
        console.error('Failed to restore subject:', error);
        window.alert(
          `Error: ${error.response?.data?.message || 'Failed to restore subject.'}`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [archivedSubjects, selectedSubject, user?._id, handleCloseMenu, removeSubjectsFromState]
  );

  const handlePermanentDelete = useCallback(
    async (subjectId: string) => {
      const subject =
        archivedSubjects.find((s) => s._id === subjectId) || selectedSubject;
      if (!subject || !isOwnSubject(subject, user?._id)) {
        window.alert(
          'Error: You can only permanently delete subjects assigned to you.'
        );
        handleCloseMenu();
        return;
      }

      const confirmDelete = window.confirm(
        'Are you sure you want to permanently delete this subject? This action cannot be undone and will delete all related activities, grades, and data.'
      );
      if (!confirmDelete) {
        handleCloseMenu();
        return;
      }

      const finalConfirm = window.confirm(
        'FINAL WARNING: This will permanently delete all data associated with this subject. Are you absolutely sure?'
      );
      if (!finalConfirm) {
        handleCloseMenu();
        return;
      }

      setActionLoading(`${subjectId}_delete`);
      try {
        await apiClient.delete(`/subjects/${subjectId}/permanent`);
        window.alert('Success: Subject permanently deleted.');
        handleCloseMenu();
        removeSubjectsFromState([subjectId]);
      } catch (error: any) {
        console.error('Failed to permanently delete subject:', error);
        window.alert(
          `Error: ${
            error.response?.data?.message ||
            'Failed to permanently delete subject.'
          }`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [archivedSubjects, selectedSubject, user?._id, handleCloseMenu, removeSubjectsFromState]
  );

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const subject = archivedSubjects.find((s) => s._id === id);
      return subject && isOwnSubject(subject, user?._id);
    });
    if (ids.length === 0) {
      window.alert('Error: You can only restore subjects assigned to you.');
      return;
    }

    const confirmRestore = window.confirm(
      `Are you sure you want to restore ${ids.length} selected subject${
        ids.length === 1 ? '' : 's'
      }? They will be moved back to active subjects.`
    );
    if (!confirmRestore) return;

    setActionLoading('bulk_restore');
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      for (const subjectId of ids) {
        try {
          await apiClient.put(`/subjects/${subjectId}/restore`);
          succeeded.push(subjectId);
        } catch {
          failed.push(subjectId);
        }
      }

      if (succeeded.length > 0) removeSubjectsFromState(succeeded);

      if (failed.length === 0) {
        window.alert(
          `Success: Restored ${succeeded.length} subject${
            succeeded.length === 1 ? '' : 's'
          }.`
        );
      } else {
        window.alert(
          `Restored ${succeeded.length} subject${
            succeeded.length === 1 ? '' : 's'
          }. Failed: ${failed.length}.`
        );
      }
    } finally {
      setActionLoading(null);
    }
  }, [selectedIds, archivedSubjects, user?._id, removeSubjectsFromState]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const subject = archivedSubjects.find((s) => s._id === id);
      return subject && isOwnSubject(subject, user?._id);
    });
    if (ids.length === 0) {
      window.alert(
        'Error: You can only permanently delete subjects assigned to you.'
      );
      return;
    }

    const confirmDelete = window.confirm(
      `DANGER: Permanently delete ${ids.length} selected subject${
        ids.length === 1 ? '' : 's'
      }? This cannot be undone and will delete all related activities, grades, and data.`
    );
    if (!confirmDelete) return;

    const finalConfirm = window.confirm(
      'FINAL WARNING: This will permanently delete all data associated with the selected subjects. Are you absolutely sure?'
    );
    if (!finalConfirm) return;

    setActionLoading('bulk_delete');
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      for (const subjectId of ids) {
        try {
          await apiClient.delete(`/subjects/${subjectId}/permanent`);
          succeeded.push(subjectId);
        } catch {
          failed.push(subjectId);
        }
      }

      if (succeeded.length > 0) removeSubjectsFromState(succeeded);

      if (failed.length === 0) {
        window.alert(
          `Success: Permanently deleted ${succeeded.length} subject${
            succeeded.length === 1 ? '' : 's'
          }.`
        );
      } else {
        window.alert(
          `Deleted ${succeeded.length} subject${
            succeeded.length === 1 ? '' : 's'
          }. Failed: ${failed.length}.`
        );
      }
    } finally {
      setActionLoading(null);
    }
  }, [selectedIds, archivedSubjects, user?._id, removeSubjectsFromState]);

  /* ------------------------- renderers --------------------------- */
  const renderSubjectItem = useCallback(
    ({ item }: { item: Subject }) => (
      <ArchivedSubjectItem
        item={item}
        isDarkMode={isDarkMode}
        isSelected={selectedIds.has(item._id)}
        anyActionLoading={!!actionLoading}
        onToggleSelect={toggleSelectSubject}
        onMenuPress={handleOpenMenu}
      />
    ),
    [
      isDarkMode,
      selectedIds,
      actionLoading,
      toggleSelectSubject,
      handleOpenMenu,
    ]
  );

  const menuItems = useMemo(
    () => [
      {
        label: 'Restore Subject',
        onPress: () =>
          selectedSubject && handleRestoreSubject(selectedSubject._id),
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
        onPress: () =>
          selectedSubject && handlePermanentDelete(selectedSubject._id),
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
    ],
    [selectedSubject, handleRestoreSubject, handlePermanentDelete]
  );

  /* ------------------------- list header ------------------------- */
  const listHeader = useMemo(
    () => (
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
              Showing {displayedSubjects.length} of {filteredSubjects.length}{' '}
              of your archived subjects
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
                transform: loading
                  ? [{ rotate: '180deg' }]
                  : [{ rotate: '0deg' }],
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
                  isDarkMode
                    ? 'bg-[#2A2A2A] text-[#E0E0E0]'
                    : 'bg-[#F3F4F6] text-[#111827]'
                }`}
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
            </View>
            <TouchableOpacity
              onPress={fetchArchivedSubjects}
              className="bg-[#10B981] px-4 py-2 rounded-lg justify-center items-center h-[45px]"
            >
              <Text className="text-white font-inter_semibold">Search</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            {/* Grade Level Filter */}
            <View className="flex-1">
              <Text
                className={`text-xs font-inter_medium mb-1 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-[#6B7280]'
                }`}
              >
                Grade Level
              </Text>
              <Dropdown
                data={GRADE_LEVEL_FILTER_OPTIONS}
                selectedValue={selectedGradeLevel}
                onValueChange={setSelectedGradeLevel}
                placeholder="All Grade Levels"
              />
            </View>

            {/* School Year Filter */}
            <View className="flex-1">
              <Text
                className={`text-xs font-inter_medium mb-1 ${
                  isDarkMode ? 'text-[#E0E0E0]' : 'text-[#6B7280]'
                }`}
              >
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
                        className="w-[16] h-[16] mr-1.5"
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
                        className="w-[16] h-[16] mr-1.5"
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
    ),
    [
      isDarkMode,
      displayedSubjects.length,
      filteredSubjects.length,
      loading,
      searchQuery,
      selectedGradeLevel,
      selectedSchoolYear,
      schoolYearFilterOptions,
      fetchArchivedSubjects,
      allFilteredSelected,
      someFilteredSelected,
      selectedCount,
      actionLoading,
      toggleSelectAllFiltered,
      clearSelection,
      handleBulkRestore,
      handleBulkPermanentDelete,
    ]
  );

  /* ------------------------- list empty -------------------------- */
  const listEmpty = useMemo(
    () => (
      <View
        className="justify-center items-center p-10"
        style={{ minHeight: 300 }}
      >
        <Image
          source={require('@/assets/images/online-course.png')}
          className="w-[64] h-[64] mb-4 opacity-45"
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
          {searchQuery || selectedGradeLevel || selectedSchoolYear
            ? 'Try adjusting your filters'
            : 'None of your subjects have been archived yet'}
        </Text>
      </View>
    ),
    [isDarkMode, searchQuery, selectedGradeLevel, selectedSchoolYear]
  );

  /* ------------------------- list footer ------------------------- */
  const listFooter = useMemo(
    () => (
      <View className="py-5 items-center">
        {isLoadingMore ? (
          <>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text
              className={`mt-2 text-xs font-inter_regular ${
                isDarkMode ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
              }`}
            >
              Loading more archived subjects...
            </Text>
          </>
        ) : !hasMore && filteredSubjects.length > ITEMS_PER_PAGE ? (
          <Text
            className={`text-xs font-inter_regular ${
              isDarkMode ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
            }`}
          >
            All {filteredSubjects.length} archived subjects loaded
          </Text>
        ) : null}
      </View>
    ),
    [isLoadingMore, isDarkMode, hasMore, filteredSubjects.length]
  );

  /* ------------------------- early return: loading -------------- */
  if (isLoading || (loading && archivedSubjects.length === 0)) {
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

  /* ------------------------- main render ------------------------- */
  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchArchivedSubjects}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      {/* Entire screen is now scrollable via FlatList */}
      <FlatList
        ref={listRef}
        data={displayedSubjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={ITEMS_PER_PAGE}
        maxToRenderPerBatch={ITEMS_PER_PAGE}
        windowSize={7}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        extraData={{ selectedIds, actionLoading, isDarkMode }}
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
    </View>
  );
};

export default memo(SubjectArchivesWeb);