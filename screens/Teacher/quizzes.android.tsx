// quizzes.android.tsx
import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Modal,
  useColorScheme,
  useWindowDimensions,
  Pressable,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import DeleteIcon from '@/assets/icons/delete.svg';
import { useDarkMode } from '@/contexts/DarkModeContext'; 
import { StatusBar } from 'expo-status-bar';
import { FlashList } from "@shopify/flash-list";
import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';
import { RadioButton } from '@/components/RadioButton';
import Checkbox from 'expo-checkbox';
import DropdownMobile from '@/components/DropdownMobile';
import DownIcon from '@/assets/icons/down.svg';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import NetworkBanner from '@/components/NetworkBanner.android';

cssInterop(ExpoImage, { className: "style" });

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
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Question {
  _id: string;
  text: string;
  type: 'multiple_choice' | 'multiple_answers' | 'true_false' | 'short_answer' | 'essay';
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  images?: string[];
  itemPoints: number;
  isRequired: boolean;
  answer: string | string[] | boolean;
  correctAnswers?: string[];
  caseSensitive?: boolean;
}

interface Quiz {
  _id: string;
  subject: Subject;
  createdBy: User;
  title: string;
  sectionHeader?: string;
  sectionDescription?: string;
  questions: Question[];
  timeLimit?: number;
  term: string;
  quizPoints: number;
  status: 'draft' | 'published' | 'archived' | 'graded' | 'closed';
  shuffleQuestions?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pagination constant
const ITEMS_PER_PAGE = 10;

// Memoized Quiz Item Component
const QuizItem = memo<{
  item: Quiz;
  isDarkMode: boolean;
  onPress: (quiz: Quiz) => void;
  onMenuPress: (quiz: Quiz) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  getConsistentColor: (str: string) => string;
}>(({ item, isDarkMode, onPress, onMenuPress, getStatusColor, getStatusText, getConsistentColor }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleMenuPress = useCallback(() => {
    onMenuPress(item);
  }, [item, onMenuPress]);

  const initials = item.subject?.subjectName ? item.subject.subjectName.slice(0, 2).toUpperCase() : 'QZ';
  const bgColor = getConsistentColor(item.subject?.subjectName || 'Quiz');

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
          {item.subject?.subjectImage ? (
            <ExpoImage
              source={{ uri: item.subject.subjectImage }}
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
              {item.subject?.subjectName || 'No Subject'} • {item.term === '1' ? '1st Term' : item.term === '2' ? '2nd Term' : '3rd Term'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <View
                style={{
                  backgroundColor: getStatusColor(item.status),
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginRight: 12,
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontSize: 12, 
                  fontFamily: 'Inter-Medium' 
                }}>
                  {getStatusText(item.status)}
                </Text>
              </View>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280' 
              }}>
                {item.questions.length} questions • {item.quizPoints} points
                {item.shuffleQuestions ? ' • Shuffled' : ''}
              </Text>
            </View>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280' 
            }}>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Menu Icon */}
        <Pressable
          onPress={handleMenuPress}
          style={{ padding: 8 }}
        >
          <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
        </Pressable>
      </View>
    </TouchableOpacity>
  );
});

QuizItem.displayName = 'QuizItem';

// Memoized Question Preview Component
const QuestionPreview = memo<{
  question: Question;
  index: number;
  isDarkMode: boolean;
  width: number;
  onImagePress: (image: string) => void;
}>(({ question, index, isDarkMode, width, onImagePress }) => {
  const handleImagePress = useCallback((image: string) => {
    onImagePress(image);
  }, [onImagePress]);

  return (
    <View
      style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontFamily: 'Inter-SemiBold',
          color: isDarkMode ? '#F9FAFB' : '#111827',
          marginBottom: 12,
        }}
      >
        {index + 1}. {question.text}
      </Text>

      {question.images && question.images.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {question.images.map((image, imgIndex) => (
            <TouchableOpacity
              key={imgIndex}
              onPress={() => handleImagePress(image)}
              activeOpacity={0.8}
            >
              <ExpoImage
                source={{ uri: image }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                contentFit="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ marginLeft: 8 }}>
        {question.type === 'essay' ? (
          <View>
            <TextInput
              placeholder="Essay answer (will be graded manually)"
              editable={false}
              multiline
              numberOfLines={6}
              style={{
                backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#E0E0E0' : '#111827',
                fontFamily: 'Inter-Regular',
                minHeight: 150,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
            />
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              marginTop: 8,
              fontStyle: 'italic',
            }}>
              This question will be graded manually by the teacher
            </Text>
          </View>
        ) : question.type === 'short_answer' ? (
          <View>
            <TextInput
              placeholder="Your answer"
              editable={false}
              style={{
                backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#E0E0E0' : '#111827',
                fontFamily: 'Inter-Regular',
                marginBottom: 12,
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
            />
            {question.correctAnswers && question.correctAnswers.length > 0 && (
              <View style={{
                backgroundColor: isDarkMode ? '#065F46' : '#ECFDF5',
                borderRadius: 8,
                padding: 12,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-SemiBold',
                  color: isDarkMode ? '#34D399' : '#059669',
                  marginBottom: 8,
                }}>
                  Correct answer(s):
                </Text>
                {question.correctAnswers.map((ans, idx) => (
                  <Text key={idx} style={{
                    fontSize: 14,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#6EE7B7' : '#047857',
                    marginBottom: 4,
                  }}>
                    • {ans}
                  </Text>
                ))}
                {question.caseSensitive && (
                  <Text style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#34D399' : '#059669',
                    marginTop: 8,
                    fontStyle: 'italic',
                  }}>
                    (Case sensitive)
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : question.type === 'multiple_answers' ? (
          <View>
            {question.options.map((option, optionIndex) => (
              <View
                key={optionIndex}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: option.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : (isDarkMode ? '#333333' : '#F3F4F6'),
                }}
              >
                <Checkbox
                  value={option.isCorrect}
                  disabled={true}
                  style={{
                    marginRight: 12,
                    borderRadius: 4,
                    width: 20,
                    height: 20,
                  }}
                  color={option.isCorrect ? '#10B981' : undefined}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: option.isCorrect ? 'Inter-SemiBold' : 'Inter-Regular',
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    flex: 1,
                  }}
                >
                  {option.text}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {question.options.map((option, optionIndex) => (
              <RadioButton
                key={optionIndex}
                value={option.text}
                label={option.text}
                selected={option.isCorrect}
                disabled={true}
                activeColor="#10B981"
                inactiveColor={isDarkMode ? '#6B7280' : '#D1D5DB'}
                width={20}
                height={20}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: option.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : (isDarkMode ? '#333333' : '#F3F4F6'),
                }}
                labelStyle={{
                  fontSize: 14,
                  fontFamily: option.isCorrect ? 'Inter-SemiBold' : 'Inter-Regular',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  flex: 1,
                }}
                labelClassName={isDarkMode ? 'text-gray-200' : 'text-gray-700'}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ 
          fontSize: 12, 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#9CA3AF' : '#6B7280' 
        }}>
          Type: {question.type.replace('_', ' ')}
        </Text>
        <Text style={{ 
          fontSize: 12, 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#9CA3AF' : '#6B7280' 
        }}>
          Points: {question.itemPoints}
        </Text>
      </View>
    </View>
  );
});

QuestionPreview.displayName = 'QuestionPreview';

// Main Component
const QuizzesAndroid = () => {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { isDarkMode } = useDarkMode();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);
  
  // Modal states
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  // Actions modal states
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalQuiz, setActionsModalQuiz] = useState<Quiz | null>(null);
  
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

  // Memoized filter options
  const statusOptions = useMemo(() => [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Graded', value: 'graded' },
    { label: 'Closed', value: 'closed' },
  ], []);

  const termOptions = useMemo(() => [
    { label: 'All Terms', value: '' },
    { label: '1st Term', value: '1' },
    { label: '2nd Term', value: '2' },
    { label: '3rd Term', value: '3' },
  ], []);

  // Memoized subject options
  const subjectOptions = useMemo(() => [
    { label: 'All Subjects', value: '' },
    ...subjects.map((subject) => ({
      label: `${subject.subjectName}${subject.gradeLevel ? ` - ${subject.gradeLevel}` : ''}${subject.section ? ` (${subject.section})` : ''}`,
      value: subject._id,
    })),
  ], [subjects]);

  // Paginated quizzes for display
  const displayedQuizzes = useMemo(() => {
    return quizzes.slice(0, displayedCount);
  }, [quizzes, displayedCount]);

  const hasMore = displayedCount < quizzes.length;

  // Reset pagination when filters/search change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
    try {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    } catch (e) {
      // ignore
    }
  }, [selectedSubject, selectedStatus, selectedTerm, searchQuery]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, quizzes.length));
      setIsLoadingMore(false);
    }, 350);
  }, [isLoadingMore, hasMore, quizzes.length]);

  // Fetch functions
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedTerm) params.append('term', selectedTerm);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      let quizzesData = response.data.data || [];
      
      // Filter to only show quizzes created by the current teacher
      if (user) {
        quizzesData = quizzesData.filter((quiz: Quiz) => 
          quiz.createdBy._id === user._id || 
          quiz.createdBy.email === user.email ||
          quiz.createdBy.username === user.username
        );
      }
      
      setQuizzes(quizzesData);
      setDisplayedCount(ITEMS_PER_PAGE);
      setForceNetworkBannerVisible(false);
    } catch (error: any) {
      console.log('Error fetching quizzes:', error);
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
  }, [selectedSubject, selectedStatus, selectedTerm, searchQuery, user]);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await apiClient.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  // Refresh on screen focus and when filters/search change
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
      fetchSubjects();
    }, [fetchQuizzes, fetchSubjects])
  );

  // Also refetch when filters change (already covered by fetchQuizzes dependencies)
  useEffect(() => {
    fetchQuizzes();
  }, [selectedSubject, selectedStatus, selectedTerm, searchQuery]);

  // Memoized handlers
  const handleCreateQuiz = useCallback(() => {
    router.push('/(teachers)/add-quiz');
  }, [router]);

  const handleEditQuiz = useCallback((quiz: Quiz) => {
    setActionsModalVisible(false);
    router.push({
      pathname: '/(teachers)/edit-quiz',
      params: { id: quiz._id }
    });
  }, [router]);

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    setActionsModalVisible(false);
    Alert.alert(
      'Delete Quiz',
      'Do you want to delete this quiz? You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiClient.delete(`/quizzes/${quizId}`);
              await fetchQuizzes();
              ToastAndroid.show('Quiz deleted successfully.', ToastAndroid.SHORT);
            } catch (error) {
              console.error('Error deleting quiz:', error);
              ToastAndroid.show('Failed to delete quiz.', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  }, [fetchQuizzes]);

  const handlePublishQuiz = useCallback(async (quizId: string) => {
    setActionsModalVisible(false);
    try {
      await apiClient.put(`/quizzes/${quizId}/publish`);
      await fetchQuizzes();
      ToastAndroid.show('Quiz published successfully.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error publishing quiz:', error);
      ToastAndroid.show('Failed to publish quiz.', ToastAndroid.SHORT);
    }
  }, [fetchQuizzes]);

  const handleDuplicateQuiz = useCallback(async (quizId: string) => {
    setActionsModalVisible(false);
    try {
      await apiClient.post(`/quizzes/${quizId}/duplicate`);
      await fetchQuizzes();
      ToastAndroid.show('Quiz duplicated successfully.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      ToastAndroid.show('Failed to duplicate quiz.', ToastAndroid.SHORT);
    }
  }, [fetchQuizzes]);

  const handlePreviewQuiz = useCallback((quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setPreviewModalVisible(true);
    setActionsModalVisible(false);
  }, []);

  const handleViewSubmissions = useCallback((quiz: Quiz) => {
    router.push({
      pathname: '/(teachers)/quiz/submissions/[id]',
      params: { id: quiz._id }
    });
    setActionsModalVisible(false);
  }, [router]);

  // PDF download – only available on web, shows alert on mobile
  const handleDownloadQuizPdf = useCallback(async (quiz: Quiz) => {
    setActionsModalVisible(false);
    if (Platform.OS !== 'web') {
      Alert.alert('Not Available', 'PDF download is currently available only on web browsers.');
      return;
    }
    try {
      const response = await apiClient.get(`/quizzes/${quiz._id}/download-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeFileName = (quiz.title || 'quiz')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      link.href = url;
      link.download = `${safeFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      ToastAndroid.show('Quiz PDF downloaded successfully.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error downloading quiz PDF:', error);
      ToastAndroid.show('Failed to download quiz PDF.', ToastAndroid.SHORT);
    }
  }, []);

  const openActionsModal = useCallback((quiz: Quiz) => {
    setActionsModalQuiz(quiz);
    setActionsModalVisible(true);
  }, []);

  const handleImagePress = useCallback((image: string) => {
    setSelectedPreviewImage(image);
    setImagePreviewModal(true);
  }, []);

  const handleClosePreviewModal = useCallback(() => {
    setPreviewModalVisible(false);
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewModal(false);
  }, []);

  // Memoized utility functions
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'draft': return '#6B7280';
      case 'published': return '#10B981';
      case 'archived': return '#F59E0B';
      case 'closed': return '#EF4444';
      default: return '#6B7280';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'archived': return 'Archived';
      case 'closed': return 'Closed';
      default: return status;
    }
  }, []);

  const getConsistentColor = useCallback((str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Memoized render functions
  const renderQuizItem = useCallback(({ item }: { item: Quiz }) => (
    <QuizItem
      item={item}
      isDarkMode={isDarkMode}
      onPress={handlePreviewQuiz}
      onMenuPress={openActionsModal}
      getStatusColor={getStatusColor}
      getStatusText={getStatusText}
      getConsistentColor={getConsistentColor}
    />
  ), [isDarkMode, handlePreviewQuiz, openActionsModal, getStatusColor, getStatusText, getConsistentColor]);

  const keyExtractor = useCallback((item: Quiz) => item._id, []);

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
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Inter-Bold',
            color: isDarkMode ? '#F9FAFB' : '#111827',
          }}
        >
          Quizzes
        </Text>
        <TouchableOpacity
          onPress={handleCreateQuiz}
          style={{
            backgroundColor: '#3B82F6',
            padding: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ExpoImage
            source={require('@/assets/icons/plus.png')}
            style={{ width: 24, height: 24 }}
            tintColor="white"
          />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TextInput
              placeholder="Search quizzes..."
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
            onPress={fetchQuizzes}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text 
              className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Subject DropdownMobile */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280', 
              marginBottom: 4 
            }}>
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

          {/* Status DropdownMobile */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280', 
              marginBottom: 4 
            }}>
              Status
            </Text>
            <DropdownMobile
              label="Status"
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              items={statusOptions}
              placeholder="All Statuses"
              buttonRightIcon={DownIcon}
            />
          </View>

          {/* Term DropdownMobile */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280', 
              marginBottom: 4 
            }}>
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
    </View>
  );

  // ---- Empty state ----
  const listEmpty = (
    <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 }}>
      <ExpoImage
        source={require('@/assets/images/quiz.png')}
        style={{ width: 64, height: 64, marginBottom: 16 }}
      />
      <Text style={{ 
        fontSize: 18, 
        fontFamily: 'Inter-SemiBold',
        color: isDarkMode ? '#9CA3AF' : '#6B7280', 
        marginBottom: 8,
        textAlign: 'center',
      }}>
        No quizzes found
      </Text>
      <Text style={{ 
        fontSize: 14, 
        fontFamily: 'Inter-Regular',
        color: isDarkMode ? '#6B7280' : '#9CA3AF', 
        textAlign: 'center' 
      }}>
        Create your first quiz to get started
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
            Loading more quizzes...
          </Text>
        </>
      ) : !hasMore && quizzes.length > ITEMS_PER_PAGE ? (
        <Text style={{
          fontSize: 12,
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#6B7280' : '#9CA3AF',
        }}>
          All {quizzes.length} quizzes loaded
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }} edges={['left', 'right']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <NetworkBanner
        forceVisible={forceNetworkBannerVisible}
        onRetry={fetchQuizzes}
        onDismiss={() => setForceNetworkBannerVisible(false)}
      />
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ 
            marginTop: 16, 
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280' 
          }}>
            Loading quizzes...
          </Text>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={displayedQuizzes}
          renderItem={renderQuizItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={{ paddingBottom: 20 }}
          extraData={isDarkMode}
        />
      )}

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
                Quiz Actions
              </Text>

              {/* Edit Button */}
              <TouchableOpacity
                onPress={() => actionsModalQuiz && handleEditQuiz(actionsModalQuiz)}
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
                <ExpoImage
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
                  Edit
                </Text>
              </TouchableOpacity>

              {/* Download PDF Button */}
              <TouchableOpacity
                onPress={() => actionsModalQuiz && handleDownloadQuizPdf(actionsModalQuiz)}
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
                <ExpoImage
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  source={require('@/assets/icons/download.png')}
                  tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  Download PDF
                </Text>
              </TouchableOpacity>

              {/* Preview Button */}
              <TouchableOpacity
                onPress={() => actionsModalQuiz && handlePreviewQuiz(actionsModalQuiz)}
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
                <ExpoImage
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
                  Preview
                </Text>
              </TouchableOpacity>

              {/* View Submissions Button */}
              {actionsModalQuiz && (actionsModalQuiz.status === 'published' || actionsModalQuiz.status === 'closed') && (
                <TouchableOpacity
                  onPress={() => actionsModalQuiz && handleViewSubmissions(actionsModalQuiz)}
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
                  <ExpoImage
                    style={{ width: 24, height: 24, marginRight: 12 }}
                    source={require('@/assets/icons/attach.png')}
                    tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                    }}
                  >
                    View Submissions
                  </Text>
                </TouchableOpacity>
              )}

              {/* Duplicate Button */}
              <TouchableOpacity
                onPress={() => actionsModalQuiz && handleDuplicateQuiz(actionsModalQuiz._id)}
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
                <ExpoImage
                  style={{ width: 24, height: 24, marginRight: 12 }}
                  source={require('@/assets/icons/copy.png')}
                  tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E4E6EA' : '#1C1E21',
                  }}
                >
                  Duplicate
                </Text>
              </TouchableOpacity>

              {/* Publish Button (only for draft quizzes) */}
              {actionsModalQuiz?.status === 'draft' && (
                <TouchableOpacity
                  onPress={() => actionsModalQuiz && handlePublishQuiz(actionsModalQuiz._id)}
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
                  <ExpoImage
                    style={{ width: 24, height: 24, marginRight: 12 }}
                    source={require('@/assets/icons/plus.png')}
                    tintColor="#10B981"
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: 'Inter-Regular',
                      color: '#10B981',
                    }}
                  >
                    Publish
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => actionsModalQuiz && handleDeleteQuiz(actionsModalQuiz._id)}
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
                  Delete
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

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClosePreviewModal}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }} edges={['top', 'bottom']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <View
            style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontFamily: 'Inter-Bold',
                color: isDarkMode ? '#F9FAFB' : '#111827',
              }}
            >
              Quiz Preview
            </Text>
            <TouchableOpacity
              onPress={handleClosePreviewModal}
              style={{
                backgroundColor: '#EF4444',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontFamily: 'Inter-Medium' 
              }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          
          {selectedQuiz && (
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#333333' : '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginBottom: 8,
                  }}
                >
                  {selectedQuiz.title}
                </Text>
                {selectedQuiz.sectionHeader && (
                  <Text
                    style={{
                      fontSize: 18,
                      fontFamily: 'Inter-SemiBold',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      marginBottom: 8,
                    }}
                  >
                    {selectedQuiz.sectionHeader}
                  </Text>
                )}
                {selectedQuiz.sectionDescription && (
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 16,
                    }}
                  >
                    {selectedQuiz.sectionDescription}
                  </Text>
                )}
                <View style={{ flexDirection: width > 768 ? 'row' : 'column', gap: width > 768 ? 16 : 4 }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280', 
                  }}>
                    Subject: {selectedQuiz.subject?.subjectName || 'No Subject'}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Term: {selectedQuiz.term}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Points: {selectedQuiz.quizPoints}
                  </Text>
                  {selectedQuiz.timeLimit && (
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                    }}>
                      Time: {selectedQuiz.timeLimit} minutes
                    </Text>
                  )}
                </View>
              </View>

              {selectedQuiz.questions.map((question, index) => (
                <QuestionPreview
                  key={question._id}
                  question={question}
                  index={index}
                  isDarkMode={isDarkMode}
                  width={width}
                  onImagePress={handleImagePress}
                />
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseImagePreview}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
        }} edges={['top']}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 65,
              right: 20,
              zIndex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 8,
            }}
            onPress={handleCloseImagePreview}
          >
            <ExpoImage
              source={require('@/assets/icons/close.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
            onPress={handleCloseImagePreview}
            activeOpacity={1}
          >
            {selectedPreviewImage && (
              <ExpoImage
                source={{ uri: selectedPreviewImage }}
                style={{
                  width: '90%',
                  height: '80%',
                  borderRadius: 12,
                }}
                contentFit="contain"
              />
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default memo(QuizzesAndroid);