import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import ContextMenu from './ContextMenu';
import DeleteIcon from '@/assets/icons/delete.svg';
import { FlashList } from '@shopify/flash-list';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import { Image } from 'expo-image';
import { RadioButton, RadioButtonGroup } from './RadioButton';
import Checkbox from 'expo-checkbox';
import Dropdown, { DropdownItem } from './Dropdown';
import DropdownMobile, { DropdownMobileItem } from './DropdownMobile';

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
  correctAnswers?: string[];
  caseSensitive?: boolean;
  images?: string[];
  itemPoints: number;
  isRequired: boolean;
  answer: string | string[] | boolean;
}

interface QuizSubmission {
  _id: string;
  student: string;
  submissionDate: string;
  submittedAnswers: Array<{
    questionId: string;
    answer: any;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
  status: 'submitted' | 'graded' | 'pending' | 'unsubmitted' | 'partial';
  quizScore: number;
  feedback?: string;
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
  quizSubmissions: QuizSubmission[];
  createdAt: string;
  updatedAt: string;
}

interface StudentAnswer {
  questionId: string;
  answer: any;
}

interface QuizTabModalProps {
  subjectId: string;
  isDarkMode?: boolean;
  isStudentOrTeacher?: boolean;
}

const QuizTabModal: React.FC<QuizTabModalProps> = ({
  subjectId,
  isDarkMode,
  isStudentOrTeacher,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const isTeacher = user?.role === 'Teacher';
  const isStudent = user?.role === 'Student';
  const isWeb = useMemo(() => Platform.OS === 'web', []);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  
  // Quiz taking states (for students)
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Teacher states
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
  // Context menu states (Web only)
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [contextMenuQuiz, setContextMenuQuiz] = useState<Quiz | null>(null);

  // Actions modal states (Mobile only)
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalQuiz, setActionsModalQuiz] = useState<Quiz | null>(null);

  // Image Preview states
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<{[key: string]: boolean}>({});

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Memoized dropdown options
  const statusFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Graded', value: 'graded' },
    { label: 'Closed', value: 'closed' },
  ], []);

  const termFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Terms', value: '' },
    { label: '1st Term', value: '1' },
    { label: '2nd Term', value: '2' },
    { label: '3rd Term', value: '3' },
  ], []);

  // Mobile dropdown options
  const statusFilterMobileOptions: DropdownMobileItem[] = useMemo(() => [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Graded', value: 'graded' },
    { label: 'Closed', value: 'closed' },
  ], []);

  const termFilterMobileOptions: DropdownMobileItem[] = useMemo(() => [
    { label: 'All Terms', value: '' },
    { label: '1st Term', value: '1' },
    { label: '2nd Term', value: '2' },
    { label: '3rd Term', value: '3' },
  ], []);

  useEffect(() => {
    fetchQuizzes();
  }, [subjectId, selectedStatus, selectedTerm]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && quizStarted && !quizCompleted) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizStarted && !quizCompleted) {
      handleAutoSubmit();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, quizStarted, quizCompleted]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('subject', subjectId);
      if (isStudent) params.append('status', 'published');
      if (selectedStatus && isTeacher) params.append('status', selectedStatus);
      if (selectedTerm) params.append('term', selectedTerm);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      setQuizzes(response.data.data || []);
    } catch (error) {
      console.log('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Student quiz functions
  const getQuizStatus = (quiz: Quiz) => {
    const submission = quiz.quizSubmissions?.find(sub => sub.student === user?._id);
    if (submission) {
      return submission.status === 'graded' || submission.status === 'partial' ? 'completed' : 'submitted';
    }
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'submitted': return '#F59E0B';
      case 'completed': return '#6B7280';
      case 'draft': return '#6B7280';
      case 'published': return '#10B981';
      case 'archived': return '#F59E0B';
      case 'closed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'submitted': return 'Submitted';
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'archived': return 'Archived';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setTakingQuiz(quiz);
    setCurrentQuestionIndex(0);
    setStudentAnswers([]);
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResults(null);
    setShowInstructions(true);
    setImageLoadError({});
    if (quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  };

  const handleBeginQuiz = () => {
    setQuizStarted(true);
    setShowInstructions(false);
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setStudentAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer }];
    });
  };

  const handleNextQuestion = () => {
    if (takingQuiz && currentQuestionIndex < takingQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async (isAutoSubmit = false) => {
    if (!takingQuiz) return;

    if (!isAutoSubmit) {
      const confirmSubmit = Platform.OS === 'web' 
        ? window.confirm('Are you sure you want to submit your quiz? This action cannot be undone.')
        : await new Promise(resolve => {
            Alert.alert(
              'Submit Quiz',
              'Are you sure you want to submit your quiz? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Submit', style: 'default', onPress: () => resolve(true) }
              ]
            );
          });

      if (!confirmSubmit) return;
    }

    try {
      const response = await apiClient.post(`/quizzes/${takingQuiz._id}/submit`, {
        submittedAnswers: studentAnswers
      });

      setQuizResults(response.data.data);
      setQuizCompleted(true);
      setQuizStarted(false);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      await fetchQuizzes();

      if (isAutoSubmit) {
        const message = 'Your quiz has been submitted.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Time Up', message);
        }
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      const message = error.response?.data?.message || 'Failed to submit quiz';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleAutoSubmit = () => {
    if (!takingQuiz) return;
    handleSubmitQuiz(true);
  };

  const closeQuizModal = () => {
    setTakingQuiz(null);
    setCurrentQuestionIndex(0);
    setStudentAnswers([]);
    setTimeLeft(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResults(null);
    setShowInstructions(false);
    setImagePreviewModal(false);
    setSelectedPreviewImage(null);
    setImageLoadError({});
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    fetchQuizzes();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentAnswer = (questionId: string) => {
    return studentAnswers.find(a => a.questionId === questionId)?.answer;
  };

  const canModifyQuiz = (quiz: Quiz) => {
    if (!isTeacher || !user) return false;
    return quiz.createdBy._id === user._id || 
           quiz.createdBy.email === user.email ||
           quiz.createdBy.username === user.username;
  };

  // Teacher functions
  const handleCreateQuiz = () => {
    router.push({
      pathname: '/(teachers)/add-quiz',
      params: { subjectId }
    });
  };

  const handleEditQuiz = (quiz: Quiz) => {
    if (!canModifyQuiz(quiz)) {
      const message = 'You can only edit quizzes you created';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Access Denied', message);
      }
      return;
    }
    
    router.push({
      pathname: '/(teachers)/edit-quiz',
      params: { id: quiz._id }
    });
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const quiz = quizzes.find(q => q._id === quizId);
    if (!quiz || !canModifyQuiz(quiz)) {
      const message = 'You can only delete quizzes you created';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Access Denied', message);
      }
      
      if (isWeb) {
        setContextMenuVisible(false);
      } else {
        setActionsModalVisible(false);
      }
      return;
    }

    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')
      : await new Promise(resolve => {
          Alert.alert(
            'Delete Quiz',
            'Are you sure you want to delete this quiz? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (confirmDelete) {
      try {
        await apiClient.delete(`/quizzes/${quizId}`);
        fetchQuizzes();
        const message = 'Quiz deleted successfully';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Success', message);
        }
      } catch (error) {
        console.error('Error deleting quiz:', error);
        const message = 'Failed to delete quiz';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      }
    }
  };

  const handlePublishQuiz = async (quizId: string) => {
    const quiz = quizzes.find(q => q._id === quizId);
    if (!quiz || !canModifyQuiz(quiz)) {
      const message = 'You can only publish quizzes you created';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Access Denied', message);
      }
      
      if (isWeb) {
        setContextMenuVisible(false);
      } else {
        setActionsModalVisible(false);
      }
      return;
    }

    try {
      await apiClient.put(`/quizzes/${quizId}/publish`);
      fetchQuizzes();
      const message = 'Quiz published successfully';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error) {
      console.error('Error publishing quiz:', error);
      const message = 'Failed to publish quiz';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  };

  const handleDuplicateQuiz = async (quizId: string) => {
    try {
      await apiClient.post(`/quizzes/${quizId}/duplicate`);
      fetchQuizzes();
      const message = 'Quiz duplicated successfully';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      const message = 'Failed to duplicate quiz';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  };

  const handlePreviewQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setPreviewModalVisible(true);
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  };

  const handleViewSubmissions = (quiz: Quiz) => {
    router.push({
      pathname: '/(teachers)/quiz/submissions/[id]',
      params: { id: quiz._id }
    });
    
    if (isWeb) {
      setContextMenuVisible(false);
    } else {
      setActionsModalVisible(false);
    }
  };

  const openContextMenu = useCallback((e: any, quiz: Quiz) => {
    if (isWeb) {
      const { pageX, pageY } = e.nativeEvent;
      setContextMenuCoords({ x: pageX, y: pageY });
      setContextMenuQuiz(quiz);
      setContextMenuVisible(true);
    } else {
      setActionsModalQuiz(quiz);
      setActionsModalVisible(true);
    }
  }, [isWeb]);

  const handleImagePress = (imageUri: string) => {
    setSelectedPreviewImage(imageUri);
    setImagePreviewModal(true);
  };

  // Dynamic context menu items based on quiz ownership (Web only)
  const getContextMenuItems = () => {
    if (!contextMenuQuiz) return [];

    const canModify = canModifyQuiz(contextMenuQuiz);
    
    const items = [
      {
        label: 'Preview',
        icon: (
          <Image
            source={require('@/assets/icons/show_password.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            tintColor={isDarkMode ? '#E0E0E0' : '#333'}
          />
        ),
        onPress: () => contextMenuQuiz && handlePreviewQuiz(contextMenuQuiz),
      },
    ];

    if (canModify) {
      items.unshift({
        label: 'Edit',
        icon: (
          <Image
            source={require('@/assets/icons/edit.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            tintColor={isDarkMode ? '#E0E0E0' : '#333'}
          />
        ),
        onPress: () => contextMenuQuiz && handleEditQuiz(contextMenuQuiz),
      });
    }

    if (contextMenuQuiz.status === 'published' || contextMenuQuiz.status === 'closed') {
      items.push({
        label: 'View Submissions',
        icon: (
          <Image
            source={require('@/assets/icons/attach.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            tintColor={isDarkMode ? '#E0E0E0' : '#333'}
          />
        ),
        onPress: () => contextMenuQuiz && handleViewSubmissions(contextMenuQuiz),
      });
    }

    items.push({
      label: 'Duplicate',
      icon: (
        <Image
          source={require('@/assets/icons/copy.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuQuiz && handleDuplicateQuiz(contextMenuQuiz._id),
    });

    if (canModify && contextMenuQuiz.status === 'draft') {
      items.push({
        label: 'Publish',
        icon: (
          <Image
            source={require('@/assets/icons/plus.png')}
            style={{ width: 20, height: 20, marginRight: 8 }}
            tintColor='#10B981'
          />
        ),
        onPress: () => contextMenuQuiz && handlePublishQuiz(contextMenuQuiz._id),
      });
    }

    if (canModify) {
      items.push({
        label: 'Delete',
        icon: (
          <DeleteIcon
            width={20}
            height={20}
            style={{ marginRight: 8 }}
            fill="#EF4444"
          />
        ),
        onPress: () => contextMenuQuiz && handleDeleteQuiz(contextMenuQuiz._id),
      });
    }

    return items;
  };

  const renderQuestionImages = (images: string[]) => {
    if (!images || images.length === 0) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        {images.map((image, imgIndex) => {
          const imageUrl = image;
          if (imageLoadError[imageUrl]) {
            return (
              <View
                key={imgIndex}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  borderStyle: 'dashed',
                }}
              >
                <Image
                  source={require('@/assets/icons/image.png')}
                  style={{ width: 48, height: 48, marginBottom: 8 }}
                  tintColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#6B7280' : '#9CA3AF',
                    textAlign: 'center',
                  }}
                >
                  Image unavailable
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={imgIndex}
              onPress={() => handleImagePress(image)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: isDarkMode ? '#1C1C1C' : '#F3F4F6',
                }}
                contentFit="contain"
                onError={() => setImageLoadError(prev => ({ ...prev, [imageUrl]: true }))}
                onLoad={() => {
                  setImageLoadError(prev => {
                    const newState = { ...prev };
                    delete newState[imageUrl];
                    return newState;
                  });
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderQuestion = (question: Question, index: number) => {
    const currentAnswer = getCurrentAnswer(question._id);
    
    return (
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
            fontSize: 18,
            fontFamily: 'Inter-SemiBold',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            marginBottom: 12,
          }}
        >
          {index + 1}. {question.text}
        </Text>

        {renderQuestionImages(question.images || [])}

        <View style={{ marginLeft: 8 }}>
          {question.type === 'essay' ? (
            <View>
              <TextInput
                value={currentAnswer || ''}
                onChangeText={(text) => handleAnswerChange(question._id, text)}
                placeholder="Type your essay answer here..."
                multiline
                numberOfLines={8}
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  minHeight: 200,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderColor: currentAnswer ? '#3B82F6' : (isDarkMode ? '#333333' : '#E5E7EB'),
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
                Note: This question will be graded manually by your teacher
              </Text>
            </View>
          ) : question.type === 'short_answer' ? (
            <View>
              <TextInput
                value={currentAnswer || ''}
                onChangeText={(text) => handleAnswerChange(question._id, text)}
                placeholder="Type your answer here..."
                multiline
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderColor: currentAnswer ? '#3B82F6' : (isDarkMode ? '#333333' : '#E5E7EB'),
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
              {question.caseSensitive && (
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginTop: 8,
                  fontStyle: 'italic',
                }}>
                  Note: Answer is case sensitive
                </Text>
              )}
            </View>
          ) : question.type === 'multiple_answers' ? (
            <View>
              {question.options.map((option, optionIndex) => (
                <TouchableOpacity
                  key={optionIndex}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? '#333333' : '#F3F4F6',
                    borderWidth: 2,
                    borderColor: Array.isArray(currentAnswer) && currentAnswer.includes(option.text) 
                      ? '#3B82F6' 
                      : 'transparent'
                  }}
                  onPress={() => {
                    const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                    const newAnswers = currentAnswers.includes(option.text)
                      ? currentAnswers.filter(a => a !== option.text)
                      : [...currentAnswers, option.text];
                    handleAnswerChange(question._id, newAnswers);
                  }}
                >
                  <Checkbox
                    value={Array.isArray(currentAnswer) && currentAnswer.includes(option.text)}
                    onValueChange={(checked) => {
                      const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                      const newAnswers = checked
                        ? [...currentAnswers, option.text]
                        : currentAnswers.filter(a => a !== option.text);
                      handleAnswerChange(question._id, newAnswers);
                    }}
                    style={{
                      marginRight: 12,
                      borderRadius: 4,
                      width: 20,
                      height: 20,
                    }}
                    color={Array.isArray(currentAnswer) && currentAnswer.includes(option.text) ? '#3B82F6' : undefined}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      flex: 1,
                    }}
                  >
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <RadioButtonGroup
              value={currentAnswer}
              onChange={(value) => handleAnswerChange(question._id, value)}
              activeColor="#3B82F6"
              inactiveColor={isDarkMode ? '#6B7280' : '#D1D5DB'}
              width={20}
              height={20}
              style={{ marginLeft: 0 }}
            >
              {question.options.map((option, optionIndex) => (
                <RadioButton
                  key={optionIndex}
                  value={option.text}
                  label={option.text}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: isDarkMode ? '#333333' : '#F3F4F6',
                    borderWidth: 2,
                    borderColor: currentAnswer === option.text ? '#3B82F6' : 'transparent'
                  }}
                  labelStyle={{
                    fontSize: 14,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    flex: 1,
                  }}
                  labelClassName={isDarkMode ? 'text-gray-200' : 'text-gray-700'}
                />
              ))}
            </RadioButtonGroup>
          )}
        </View>

        <View style={{ marginTop: 16, alignItems: 'center' }}>
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
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    const status = isStudent ? getQuizStatus(item) : item.status;
    const submission = item.quizSubmissions?.find(sub => sub.student === user?._id);
    const isOwnQuiz = canModifyQuiz(item);
    
    const initials = item.subject?.subjectName ? item.subject.subjectName.slice(0, 2).toUpperCase() : 'QZ';
    const getConsistentColor = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
      return colors[Math.abs(hash) % colors.length];
    };
    const bgColor = getConsistentColor(item.subject?.subjectName || 'Quiz');
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => {
          if (isStudent && status === 'available') {
            handleStartQuiz(item);
          } else if (isTeacher) {
            handlePreviewQuiz(item);
          }
        }}
        disabled={isStudent && status !== 'available'}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {item.subject?.subjectImage ? (
              <Image
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

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View className='flex-row items-center mb-1'>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginRight: 'auto',
                    flex: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {item.title}
                </Text>
                {isStudent && submission && submission.status === 'graded' && (
                  <Text 
                    className='font-inter_medium text-xs'
                    style={{ 
                      color: isDarkMode ? '#16a34a' : '#22c55e',
                      marginLeft: 8,
                    }}
                  >
                    Score: {submission.quizScore} / {item.quizPoints}
                  </Text>
                )}
              </View>
              
              {isTeacher && (
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4,
                  }}
                >
                  By: {item.createdBy.firstName} {item.createdBy.lastName}
                  {isOwnQuiz && ' (You)'}
                </Text>
              )}
              
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    backgroundColor: getStatusColor(status),
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
                    {getStatusText(status)}
                  </Text>
                </View>
                <Text style={{ 
                  fontSize: 12, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                }}>
                  {item.questions.length} questions • {item.quizPoints} points
                </Text>
                {item.timeLimit && (
                  <Text style={{ 
                    fontSize: 12, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginLeft: 8
                  }}>
                    • {item.timeLimit} min
                  </Text>
                )}
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

          {isStudent && status === 'available' && (
            <TouchableOpacity
              onPress={() => handleStartQuiz(item)}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                marginLeft: 8,
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 12,
                fontFamily: 'Inter-Medium' 
              }}>
                Start
              </Text>
            </TouchableOpacity>
          )}

          {isTeacher && (
            <Pressable
              onPress={(e) => openContextMenu(e, item)}
              style={{ padding: 8 }}
            >
              <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
            </Pressable>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ 
          marginTop: 16, 
          fontFamily: 'Inter-Regular',
          color: isDarkMode ? '#9CA3AF' : '#6B7280' 
        }}>
          Loading quizzes...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 8 }}>
      <View className='flex-row justify-between items-center mb-4'>
        <Text className={`font-pbold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Quizzes ({quizzes.length})
        </Text>
        {isTeacher && (
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
            <Image
              source={require('@/assets/icons/plus.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={{ marginBottom: 16 }}>
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
              className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}
            >
              Search
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isTeacher && (
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280',
                marginBottom: 4 
              }}>
                Status
              </Text>
              {isWeb ? (
                <Dropdown
                  data={statusFilterOptions}
                  selectedValue={selectedStatus}
                  onValueChange={setSelectedStatus}
                  placeholder="All Statuses"
                />
              ) : (
                <DropdownMobile
                  label="Status"
                  selectedValue={selectedStatus}
                  onValueChange={setSelectedStatus}
                  items={statusFilterMobileOptions}
                  placeholder="All Statuses"
                />
              )}
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280',
              marginBottom: 4 
            }}>
              Term
            </Text>
            {isWeb ? (
              <Dropdown
                data={termFilterOptions}
                selectedValue={selectedTerm}
                onValueChange={setSelectedTerm}
                placeholder="All Terms"
              />
            ) : (
              <DropdownMobile
                label="Term"
                selectedValue={selectedTerm}
                onValueChange={setSelectedTerm}
                items={termFilterMobileOptions}
                placeholder="All Terms"
              />
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {quizzes.length > 0 ? (
        <FlashList
          data={quizzes}
          renderItem={renderQuizItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          extraData={isDarkMode}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <Image
            source={require('@/assets/images/quiz.png')}
            style={{ width: 64, height: 64, marginBottom: 16 }}
          />
          <Text style={{ 
            fontSize: 18, 
            fontFamily: 'Inter-SemiBold',
            color: isDarkMode ? '#9CA3AF' : '#6B7280', 
            marginBottom: 8 
          }}>
            {isTeacher ? 'No quizzes found' : 'No quizzes available'}
          </Text>
          <Text style={{ 
            fontSize: 14, 
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#6B7280' : '#9CA3AF', 
            textAlign: 'center' 
          }}>
            {isTeacher ? 'Create your first quiz to get started' : 'Check back later for new quizzes'}
          </Text>
        </View>
      )}

      {/* Context Menu (Web Only) */}
      {isWeb && isTeacher && (
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          onClose={() => setContextMenuVisible(false)}
          items={getContextMenuItems()}
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
      )}

      {/* Actions Modal (Mobile Only) */}
      {!isWeb && isTeacher && (
        <Modal
          visible={actionsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActionsModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
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
                    Preview Quiz
                  </Text>
                </TouchableOpacity>

                {/* Edit Button (only if user can modify) */}
                {actionsModalQuiz && canModifyQuiz(actionsModalQuiz) && (
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
                      Edit Quiz
                    </Text>
                  </TouchableOpacity>
                )}

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
                    <Image
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
                  <Image
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
                    Duplicate Quiz
                  </Text>
                </TouchableOpacity>

                {/* Publish Button (only if user can modify and is draft) */}
                {actionsModalQuiz && canModifyQuiz(actionsModalQuiz) && actionsModalQuiz.status === 'draft' && (
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
                    <Image
                      style={{ width: 24, height: 24, marginRight: 12 }}
                      source={require('@/assets/icons/plus.png')}
                      tintColor='#10B981'
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        color: '#10B981',
                      }}
                    >
                      Publish Quiz
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Delete Button (only if user can modify) */}
                {actionsModalQuiz && canModifyQuiz(actionsModalQuiz) && (
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
                      Delete Quiz
                    </Text>
                  </TouchableOpacity>
                )}

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
      )}

      {/* Student Quiz Taking Modal */}
      {isStudent && (
        <Modal
          visible={!!takingQuiz}
          animationType="slide"
          transparent={false}
          onRequestClose={closeQuizModal}
        >
          <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
            {showInstructions && takingQuiz && (
              <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
                <View
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#333333' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: 'Inter-Bold',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      marginBottom: 16,
                      textAlign: 'center',
                    }}
                  >
                    {takingQuiz.title}
                  </Text>

                  {takingQuiz.sectionDescription && (
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        marginBottom: 20,
                        textAlign: 'center',
                      }}
                    >
                      {takingQuiz.sectionDescription}
                    </Text>
                  )}

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontFamily: 'Inter-Medium',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      marginBottom: 8 
                    }}>
                      Quiz Information:
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • Questions: {takingQuiz.questions.length}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • Total Points: {takingQuiz.quizPoints}
                    </Text>
                    {takingQuiz.timeLimit && (
                      <Text style={{ 
                        fontSize: 14, 
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        marginBottom: 4 
                      }}>
                        • Time Limit: {takingQuiz.timeLimit} minutes
                      </Text>
                    )}
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontFamily: 'Inter-Medium',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      marginBottom: 8 
                    }}>
                      Instructions:
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • Read each question carefully
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • You can navigate between questions using the navigation buttons
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • Make sure to submit your quiz before time runs out
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4 
                    }}>
                      • Your answers will be automatically saved as you progress
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={closeQuizModal}
                      style={{
                        flex: 1,
                        backgroundColor: '#EF4444',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-Medium',
                        fontSize: 16 
                      }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleBeginQuiz}
                      style={{
                        flex: 1,
                        backgroundColor: '#10B981',
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-Medium',
                        fontSize: 16 
                      }}>
                        Begin Quiz
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {quizStarted && takingQuiz && !quizCompleted && (
              <View style={{ flex: 1 }}>
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
                  <View>
                    <Text
                      style={{
                        fontSize: 20,
                        fontFamily: 'Inter-Bold',
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                      }}
                    >
                      {takingQuiz.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      }}
                    >
                      Question {currentQuestionIndex + 1} of {takingQuiz.questions.length}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {timeLeft !== null && (
                      <Text
                        style={{
                          fontSize: 18,
                          fontFamily: 'Inter-Bold',
                          color: timeLeft <= 300 ? '#EF4444' : '#10B981',
                        }}
                      >
                        {formatTime(timeLeft)}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={closeQuizModal}
                      style={{
                        backgroundColor: '#EF4444',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-Medium',
                        fontSize: 12 
                      }}>
                        Exit
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={{ flex: 1, padding: 20 }}>
                  {renderQuestion(takingQuiz.questions[currentQuestionIndex], currentQuestionIndex)}
                </ScrollView>

                <View
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    padding: 20,
                    borderTopWidth: 1,
                    borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    style={{
                      backgroundColor: currentQuestionIndex === 0 ? '#6B7280' : '#3B82F6',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontFamily: 'Inter-Medium' 
                    }}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                    }}>
                      Answered: {studentAnswers.length} / {takingQuiz.questions.length}
                    </Text>
                  </View>

                  {currentQuestionIndex < takingQuiz.questions.length - 1 ? (
                    <TouchableOpacity
                      onPress={handleNextQuestion}
                      style={{
                        backgroundColor: '#3B82F6',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-Medium' 
                      }}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSubmitQuiz()}
                      style={{
                        backgroundColor: '#10B981',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontFamily: 'Inter-Medium' 
                      }}>
                        Submit Quiz
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {quizCompleted && quizResults && takingQuiz && (
              <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
                <View
                  style={{
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#333333' : '#E5E7EB',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: 'Inter-Bold',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      marginBottom: 16,
                      textAlign: 'center',
                    }}
                  >
                    Quiz Completed!
                  </Text>

                  <View
                    style={{
                      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 20,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 36,
                        fontFamily: 'Inter-Bold',
                        color: '#10B981',
                        marginBottom: 8,
                      }}
                    >
                      {quizResults.score}/{quizResults.totalPoints}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: 'Inter-Regular',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      }}
                    >
                      {Math.round((quizResults.score / quizResults.totalPoints) * 100)}% Score
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={closeQuizModal}
                    style={{
                      backgroundColor: '#3B82F6',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ 
                      color: 'white', 
                      fontFamily: 'Inter-Medium',
                      fontSize: 16 
                    }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* Teacher Preview Modal */}
      {isTeacher && (
        <Modal
          visible={previewModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setPreviewModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
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
                onPress={() => setPreviewModalVisible(false)}
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
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                    }}>
                      Term: {selectedQuiz.term === '1' ? '1st Term' : selectedQuiz.term === '2' ? '2nd Term' : '3rd Term'}
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
                  <View
                    key={question._id}
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
                            <Image
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
                            placeholder="Type your essay answer here..."
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
                          <View style={{
                            backgroundColor: isDarkMode ? '#7C2D12' : '#FEF3C7',
                            borderRadius: 8,
                            padding: 12,
                            marginTop: 12,
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontFamily: 'Inter-SemiBold',
                              color: isDarkMode ? '#FB923C' : '#C2410C',
                            }}>
                              📝 Manual grading required
                            </Text>
                          </View>
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
                                padding: 8,
                                borderRadius: 8,
                                backgroundColor: option.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : 'transparent',
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
                                padding: 8,
                                borderRadius: 8,
                                backgroundColor: option.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : 'transparent',
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
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setImagePreviewModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
              padding: 8,
            }}
            onPress={() => setImagePreviewModal(false)}
          >
            <Image
              source={require('@/assets/icons/close.png')}
              style={{ width: 24, height: 24 }}
              tintColor="white"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
            onPress={() => setImagePreviewModal(false)}
            activeOpacity={1}
          >
            {selectedPreviewImage && (
              <Image
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
        </View>
      </Modal>
    </View>
  );
};

export default QuizTabModal;