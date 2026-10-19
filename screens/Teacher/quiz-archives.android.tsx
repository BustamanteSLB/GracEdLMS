// Teacher/quiz-archives.android.tsx — archived quizzes (same look as quizzes.android)
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  useColorScheme,
  Modal,
  Pressable,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage, Image } from 'expo-image';
import { Checkbox } from 'expo-checkbox';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DropdownMobile from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import NetworkBanner from '@/components/NetworkBanner.android';

cssInterop(ExpoImage, { className: 'style' });
cssInterop(Image, { className: 'style' });

const ITEMS_PER_PAGE = 10;

interface Subject {
  _id: string;
  subjectName: string;
  description?: string;
  gradeLevel?: string;
  section?: string;
  schoolYear?: string;
  subjectImage?: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Question {
  _id: string;
  text: string;
  type: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  images?: string[];
  itemPoints: number;
}

interface Quiz {
  _id: string;
  subject: Subject;
  createdBy: User;
  title: string;
  questions: Question[];
  timeLimit?: number;
  term: string;
  quizPoints: number;
  status: 'draft' | 'published' | 'archived' | 'graded' | 'closed';
  shuffleQuestions?: boolean;
  createdAt: string;
  updatedAt: string;
}

const isOwnQuiz = (quiz: Quiz, userId?: string) => {
  if (!userId || !quiz.createdBy) return false;
  const creator =
    typeof quiz.createdBy === 'string' ? quiz.createdBy : quiz.createdBy._id;
  return creator === userId;
};

const getConsistentColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#F97316',
    '#14B8A6',
    '#EC4899',
  ];
  return colors[Math.abs(hash) % colors.length];
};

const ArchivedQuizItem = memo<{
  item: Quiz;
  isDarkMode: boolean;
  isSelected: boolean;
  anyActionLoading: boolean;
  onToggleSelect: (id: string) => void;
  onMenuPress: (quiz: Quiz) => void;
}>(
  ({
    item,
    isDarkMode,
    isSelected,
    anyActionLoading,
    onToggleSelect,
    onMenuPress,
  }) => {
    const initials = item.subject?.subjectName
      ? item.subject.subjectName.slice(0, 2).toUpperCase()
      : 'QZ';
    const bgColor = getConsistentColor(item.subject?.subjectName || 'Quiz');

    return (
      <View
        style={{
          backgroundColor: isSelected
            ? isDarkMode
              ? '#2A3A4A'
              : '#E7F3FF'
            : isDarkMode
              ? '#1E1E1E'
              : '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: isSelected
            ? '#1877F2'
            : isDarkMode
              ? '#333333'
              : '#E5E7EB',
          opacity: isSelected ? 1 : 0.9,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ marginRight: 12, paddingTop: 4 }}>
          <Checkbox
            value={isSelected}
            onValueChange={() => onToggleSelect(item._id)}
            color={isSelected ? '#1877F2' : undefined}
            disabled={anyActionLoading}
          />
        </View>

        <View style={{ flexDirection: 'row', flex: 1 }}>
          {item.subject?.subjectImage ? (
            <ExpoImage
              source={{ uri: item.subject.subjectImage }}
              style={{ width: 50, height: 50, borderRadius: 8, opacity: 0.7 }}
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
              <Text
                style={{ color: 'white', fontSize: 18, fontFamily: 'Inter-Bold' }}
              >
                {initials}
              </Text>
            </View>
          )}

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
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 8,
              }}
            >
              {item.subject?.subjectName || 'No Subject'} •{' '}
              {item.term === '1'
                ? '1st Term'
                : item.term === '2'
                  ? '2nd Term'
                  : '3rd Term'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                flexWrap: 'wrap',
              }}
            >
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 12,
                    fontFamily: 'Inter-Medium',
                  }}
                >
                  Archived
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
              >
                {item.questions?.length || 0} questions • {item.quizPoints}{' '}
                points
                {item.shuffleQuestions ? ' • Shuffled' : ''}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
            >
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => onMenuPress(item)}
          style={{ padding: 8 }}
          disabled={anyActionLoading}
        >
          <MoreVertIcon
            width={20}
            height={20}
            fill={isDarkMode ? '#E0E0E0' : 'black'}
          />
        </Pressable>
      </View>
    );
  }
);
ArchivedQuizItem.displayName = 'ArchivedQuizItem';

const QuizArchivesAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user, isLoading } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] =
    useState(false);

  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalQuiz, setActionsModalQuiz] = useState<Quiz | null>(null);

  const subjectOptions = useMemo(
    () => [
      { label: 'All Subjects', value: '' },
      ...subjects.map((s) => ({
        label: `${s.subjectName}${s.gradeLevel ? ` - ${s.gradeLevel}` : ''}${
          s.section ? ` (${s.section})` : ''
        }`,
        value: s._id,
      })),
    ],
    [subjects]
  );

  const termOptions = useMemo(
    () => [
      { label: 'All Terms', value: '' },
      { label: '1st Term', value: '1' },
      { label: '2nd Term', value: '2' },
      { label: '3rd Term', value: '3' },
    ],
    []
  );

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await apiClient.get('/subjects');
      if (response.data.success) setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  }, []);

  const fetchArchivedQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'archived');
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedTerm) params.append('term', selectedTerm);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      const data: Quiz[] = response.data.data || [];
      setQuizzes(data.filter((q) => isOwnQuiz(q, user?._id)));
      setSelectedIds(new Set());
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.error('Failed to fetch archived quizzes:', error);
      Alert.alert('Error', 'Failed to load archived quizzes.');
      const isNetworkError =
        !error?.response ||
        error?.code === 'ECONNABORTED' ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('timeout');
      if (isNetworkError) setForceNetworkBannerVisible(true);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedTerm, searchQuery, user?._id]);

  useEffect(() => {
    if (user?._id) {
      fetchSubjects();
      fetchArchivedQuizzes();
    }
  }, [user?._id, fetchSubjects, fetchArchivedQuizzes]);

  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [selectedSubject, selectedTerm, searchQuery]);

  const displayedQuizzes = useMemo(
    () => quizzes.slice(0, displayedCount),
    [quizzes, displayedCount]
  );
  const hasMore = displayedCount < quizzes.length;

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    displayedQuizzes.length > 0 &&
    displayedQuizzes.every((q) => selectedIds.has(q._id));

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) =>
        Math.min(prev + ITEMS_PER_PAGE, quizzes.length)
      );
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, quizzes.length]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectQuiz = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        displayedQuizzes.length > 0 &&
        displayedQuizzes.every((q) => next.has(q._id));
      if (allSelected) displayedQuizzes.forEach((q) => next.delete(q._id));
      else displayedQuizzes.forEach((q) => next.add(q._id));
      return next;
    });
  }, [displayedQuizzes]);

  const openActionsModal = useCallback(
    (quiz: Quiz) => {
      if (!isOwnQuiz(quiz, user?._id)) {
        Alert.alert('Not Allowed', 'You can only manage your own quizzes.');
        return;
      }
      setActionsModalQuiz(quiz);
      setActionsModalVisible(true);
    },
    [user?._id]
  );

  const handleRestoreQuiz = useCallback(
    (quizId: string) => {
      setActionsModalVisible(false);
      const quiz =
        quizzes.find((q) => q._id === quizId) || actionsModalQuiz;
      if (!quiz || !isOwnQuiz(quiz, user?._id)) {
        Alert.alert('Error', 'You can only restore your own quizzes.');
        return;
      }

      Alert.alert(
        'Restore Quiz',
        'Restore this quiz? It will be moved back as a draft.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: async () => {
              setActionLoading(`${quizId}_restore`);
              try {
                await apiClient.put(`/quizzes/${quizId}/restore`);
                setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
                ToastAndroid.show('Quiz restored as draft.', ToastAndroid.SHORT);
              } catch (error: any) {
                Alert.alert(
                  'Error',
                  error.response?.data?.message || 'Failed to restore quiz.'
                );
              } finally {
                setActionLoading(null);
              }
            },
          },
        ]
      );
    },
    [quizzes, actionsModalQuiz, user?._id]
  );

  const handlePermanentDelete = useCallback(
    (quizId: string) => {
      setActionsModalVisible(false);
      const quiz =
        quizzes.find((q) => q._id === quizId) || actionsModalQuiz;
      if (!quiz || !isOwnQuiz(quiz, user?._id)) {
        Alert.alert(
          'Error',
          'You can only permanently delete your own quizzes.'
        );
        return;
      }

      Alert.alert(
        'Permanent Delete',
        'Permanently delete this quiz? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'FINAL WARNING',
                'Delete this quiz and all associated data?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                      setActionLoading(`${quizId}_delete`);
                      try {
                        await apiClient.delete(`/quizzes/${quizId}/permanent`);
                        setQuizzes((prev) =>
                          prev.filter((q) => q._id !== quizId)
                        );
                        ToastAndroid.show(
                          'Quiz permanently deleted.',
                          ToastAndroid.SHORT
                        );
                      } catch (error: any) {
                        Alert.alert(
                          'Error',
                          error.response?.data?.message ||
                            'Failed to permanently delete quiz.'
                        );
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
    },
    [quizzes, actionsModalQuiz, user?._id]
  );

  const handleBulkRestore = useCallback(() => {
    const ids = Array.from(selectedIds).filter((id) => {
      const q = quizzes.find((x) => x._id === id);
      return q && isOwnQuiz(q, user?._id);
    });
    if (ids.length === 0) {
      Alert.alert('Error', 'You can only restore your own quizzes.');
      return;
    }

    Alert.alert(
      'Restore Quizzes',
      `Restore ${ids.length} selected quiz${ids.length === 1 ? '' : 'zes'} as drafts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setActionLoading('bulk_restore');
            let succeeded = 0;
            let failed = 0;
            for (const id of ids) {
              try {
                await apiClient.put(`/quizzes/${id}/restore`);
                succeeded++;
              } catch {
                failed++;
              }
            }
            setActionLoading(null);
            clearSelection();
            fetchArchivedQuizzes();
            ToastAndroid.show(
              failed === 0
                ? `Restored ${succeeded} quiz${succeeded === 1 ? '' : 'zes'}.`
                : `Restored ${succeeded}. Failed: ${failed}.`,
              ToastAndroid.LONG
            );
          },
        },
      ]
    );
  }, [selectedIds, quizzes, user?._id, clearSelection, fetchArchivedQuizzes]);

  const handleBulkPermanentDelete = useCallback(() => {
    const ids = Array.from(selectedIds).filter((id) => {
      const q = quizzes.find((x) => x._id === id);
      return q && isOwnQuiz(q, user?._id);
    });
    if (ids.length === 0) {
      Alert.alert('Error', 'You can only permanently delete your own quizzes.');
      return;
    }

    Alert.alert(
      'Permanent Delete',
      `Permanently delete ${ids.length} selected quiz${
        ids.length === 1 ? '' : 'zes'
      }? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'FINAL WARNING',
              'Delete all selected quizzes and related data?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setActionLoading('bulk_delete');
                    let succeeded = 0;
                    let failed = 0;
                    for (const id of ids) {
                      try {
                        await apiClient.delete(`/quizzes/${id}/permanent`);
                        succeeded++;
                      } catch {
                        failed++;
                      }
                    }
                    setActionLoading(null);
                    clearSelection();
                    fetchArchivedQuizzes();
                    ToastAndroid.show(
                      failed === 0
                        ? `Deleted ${succeeded} quiz${succeeded === 1 ? '' : 'zes'}.`
                        : `Deleted ${succeeded}. Failed: ${failed}.`,
                      ToastAndroid.LONG
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [selectedIds, quizzes, user?._id, clearSelection, fetchArchivedQuizzes]);

  const renderItem = useCallback(
    ({ item }: { item: Quiz }) => (
      <ArchivedQuizItem
        item={item}
        isDarkMode={isDarkMode}
        isSelected={selectedIds.has(item._id)}
        anyActionLoading={!!actionLoading}
        onToggleSelect={toggleSelectQuiz}
        onMenuPress={openActionsModal}
      />
    ),
    [
      isDarkMode,
      selectedIds,
      actionLoading,
      toggleSelectQuiz,
      openActionsModal,
    ]
  );

  const listHeader = useMemo(
    () => (
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
              }}
            >
              Quiz Archives
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginTop: 2,
              }}
            >
              {displayedQuizzes.length} of {quizzes.length} of your archived
              quizzes
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchArchivedQuizzes}
            disabled={loading || !!actionLoading}
            style={{
              backgroundColor: '#EF4444',
              padding: 8,
              borderRadius: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <ExpoImage
              source={require('@/assets/icons/refresh.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                placeholder="Search archived quizzes..."
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
              onPress={fetchArchivedQuizzes}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#E0E0E0' : '#FFFFFF',
                }}
              >
                Search
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Medium',
                  color: isDarkMode ? '#E0E0E0' : '#6B7280',
                  marginBottom: 4,
                }}
              >
                Subject
              </Text>
              <DropdownMobile
                label="Subject"
                selectedValue={selectedSubject}
                onValueChange={setSelectedSubject}
                items={subjectOptions}
                placeholder="All Subjects"
                buttonRightIcon={DownIcon}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Medium',
                  color: isDarkMode ? '#E0E0E0' : '#6B7280',
                  marginBottom: 4,
                }}
              >
                Term
              </Text>
              <DropdownMobile
                label="Term"
                selectedValue={selectedTerm}
                onValueChange={setSelectedTerm}
                items={termOptions}
                placeholder="All Terms"
                buttonRightIcon={DownIcon}
              />
            </View>
          </View>
        </View>

        {quizzes.length > 0 && (
          <View
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Checkbox
                value={allVisibleSelected}
                onValueChange={toggleSelectAllVisible}
                color={
                  allVisibleSelected || selectedCount > 0
                    ? '#1877F2'
                    : undefined
                }
                disabled={!!actionLoading}
              />
              <TouchableOpacity
                onPress={toggleSelectAllVisible}
                disabled={!!actionLoading}
              >
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  {allVisibleSelected
                    ? 'Deselect all'
                    : `Select all (${displayedQuizzes.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#B0B3B8' : '#65676B',
                  }}
                >
                  {selectedCount}
                </Text>
                <TouchableOpacity
                  onPress={clearSelection}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: isDarkMode ? '#3A3B3C' : '#E4E6EA',
                    borderRadius: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBulkRestore}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  {actionLoading === 'bulk_restore' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter-SemiBold',
                        color: '#FFF',
                      }}
                    >
                      Restore
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBulkPermanentDelete}
                  disabled={!!actionLoading}
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  {actionLoading === 'bulk_delete' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter-SemiBold',
                        color: '#FFF',
                      }}
                    >
                      Delete
                    </Text>
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
      displayedQuizzes.length,
      quizzes.length,
      loading,
      actionLoading,
      searchQuery,
      selectedSubject,
      selectedTerm,
      subjectOptions,
      termOptions,
      allVisibleSelected,
      selectedCount,
      fetchArchivedQuizzes,
      toggleSelectAllVisible,
      clearSelection,
      handleBulkRestore,
      handleBulkPermanentDelete,
    ]
  );

  const listEmpty = (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 300,
      }}
    >
      <Image
        source={require('@/assets/images/quiz.png')}
        style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.5 }}
      />
      <Text
        style={{
          fontSize: 18,
          fontFamily: 'Inter-SemiBold',
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        No archived quizzes found
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#6B7280' : '#9CA3AF',
          textAlign: 'center',
        }}
      >
        {searchQuery || selectedSubject || selectedTerm
          ? 'Try adjusting your filters'
          : 'Archived quizzes appear here when you archive them from Quizzes'}
      </Text>
    </View>
  );

  const listFooter = (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      {isLoadingMore ? (
        <>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text
            style={{
              marginTop: 8,
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Loading more...
          </Text>
        </>
      ) : !hasMore && quizzes.length > ITEMS_PER_PAGE ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#6B7280' : '#9CA3AF',
          }}
        >
          All {quizzes.length} archived quizzes loaded
        </Text>
      ) : null}
    </View>
  );

  if (isLoading || loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        edges={['left', 'right']}
      >
        <NetworkBanner
          forceVisible={forceNetworkBannerVisible}
          onRetry={fetchArchivedQuizzes}
          onDismiss={() => setForceNetworkBannerVisible(false)}
        />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text
          style={{
            marginTop: 16,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}
        >
          Loading archived quizzes...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}
      edges={['left', 'right']}
    >
      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchArchivedQuizzes}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />

      <FlashList
        data={displayedQuizzes}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        extraData={{ selectedIds, actionLoading, isDarkMode }}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={actionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionsModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setActionsModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDarkMode ? '#242526' : '#FFFFFF',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              paddingBottom: 32,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                marginBottom: 12,
              }}
            >
              Quiz Actions
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 16,
              }}
              numberOfLines={2}
            >
              {actionsModalQuiz?.title}
            </Text>

            <TouchableOpacity
              onPress={() =>
                actionsModalQuiz && handleRestoreQuiz(actionsModalQuiz._id)
              }
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
                source={require('@/assets/icons/restore.png')}
                style={{ width: 24, height: 24, marginRight: 12 }}
                tintColor="#10B981"
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: 'Inter-Regular',
                  color: '#10B981',
                }}
              >
                Restore Quiz
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                actionsModalQuiz && handlePermanentDelete(actionsModalQuiz._id)
              }
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
                style={{ marginRight: 12 }}
                fill="#EF4444"
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

            <TouchableOpacity
              onPress={() => setActionsModalVisible(false)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3A3B3C' : '#F0F2F5',
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
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default memo(QuizArchivesAndroid);
