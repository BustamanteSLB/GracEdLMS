import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Platform,
  Modal,
  useColorScheme,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from "@shopify/flash-list";
import { cssInterop } from 'nativewind'

cssInterop(Image, { className: "style" });

interface Subject {
  _id: string;
  subjectName: string;
  description?: string;
  gradeLevel?: string;
  section?: string;
  schoolYear?: string;
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
  type: 'multiple_choice' | 'multiple_answers' | 'true_false';
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
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
  status: 'submitted' | 'graded' | 'pending' | 'unsubmitted';
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
  quarter: string;
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

// Student's Quizzes Page
const QuizzesAndroid = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  
  // Quiz taking states
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter options
  const quarterOptions = useMemo(() => [
    { label: 'All Quarters', value: '' },
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: '3rd Quarter', value: '3rd Quarter' },
    { label: '4th Quarter', value: '4th Quarter' },
  ], []);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'published');
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedQuarter) params.append('quarter', selectedQuarter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      setQuizzes(response.data.data || []);
    } catch (error) {
      console.log('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedQuarter, searchQuery]);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await apiClient.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, [fetchQuizzes, fetchSubjects]);

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

  const getQuizStatus = useCallback((quiz: Quiz) => {
    const submission = quiz.quizSubmissions?.find(sub => sub.student === user?._id);
    if (submission) {
      return submission.status === 'graded' ? 'completed' : 'submitted';
    }
    return 'available';
  }, [user]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'submitted': return '#F59E0B';
      case 'completed': return '#6B7280';
      default: return '#6B7280';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'submitted': return 'Submitted';
      case 'completed': return 'Completed';
      default: return status;
    }
  }, []);

  const handleStartQuiz = useCallback((quiz: Quiz) => {
    setTakingQuiz(quiz);
    setCurrentQuestionIndex(0);
    setStudentAnswers([]);
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResults(null);
    setShowInstructions(true);
    if (quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  }, []);

  const handleBeginQuiz = useCallback(() => {
    setQuizStarted(true);
    setShowInstructions(false);
  }, []);

  const handleAnswerChange = useCallback((questionId: string, answer: any) => {
    setStudentAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
      }
      return [...prev, { questionId, answer }];
    });
  }, []);

  const handleNextQuestion = useCallback(() => {
    if (takingQuiz && currentQuestionIndex < takingQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [takingQuiz, currentQuestionIndex]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleSubmitQuiz = useCallback(async () => {
    if (!takingQuiz) return;

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

      fetchQuizzes();
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      const message = error.response?.data?.message || 'Failed to submit quiz';
      Alert.alert('Error', message);
    }
  }, [takingQuiz, studentAnswers, fetchQuizzes]);

  const handleAutoSubmit = useCallback(() => {
    if (!takingQuiz) return;
    handleSubmitQuiz();
  }, [takingQuiz, handleSubmitQuiz]);

  const closeQuizModal = useCallback(() => {
    setTakingQuiz(null);
    setCurrentQuestionIndex(0);
    setStudentAnswers([]);
    setTimeLeft(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResults(null);
    setShowInstructions(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getCurrentAnswer = useCallback((questionId: string) => {
    return studentAnswers.find(a => a.questionId === questionId)?.answer;
  }, [studentAnswers]);

  const renderQuizItem = useCallback(({ item }: { item: Quiz }) => {
    const status = getQuizStatus(item);
    const submission = item.quizSubmissions?.find(sub => sub.student === user?._id);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => status === 'available' ? handleStartQuiz(item) : null}
        disabled={status !== 'available'}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View className='flex-row items-center mb-1'>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter-24pt-Bold',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginRight: 'auto'
                }}
                numberOfLines={1}
                ellipsizeMode='tail'
              >
                {item.title}
              </Text>
              {submission && submission.status === 'graded' && (
                <Text
                  className='font-inter_medium text-xs'
                  style={{
                    color: isDarkMode ? '#16a34a' : '#22c55e',
                  }}
                >
                  Score: {submission.quizScore} / {item.quizPoints}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 8,
              }}
            >
              {item.subject?.subjectName || 'No Subject'} - {item.subject.gradeLevel ? `${item.subject.gradeLevel}` : ''} {item.subject.section ? `${item.subject.section}` : ''}
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
                  fontFamily: 'Inter-18pt-Medium'
                }}>
                  {getStatusText(status)}
                </Text>
              </View>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-18pt-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280'
              }}>
                {item.questions.length} questions • {item.quizPoints} points
              </Text>
              {item.timeLimit && (
                <Text style={{
                  fontSize: 12,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginLeft: 8
                }}>
                  • {item.timeLimit} min
                </Text>
              )}
            </View>
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280'
            }}>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {status === 'available' && (
            <TouchableOpacity
              onPress={() => handleStartQuiz(item)}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontFamily: 'Inter-18pt-Medium'
              }}>
                Start
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, getQuizStatus, getStatusColor, getStatusText, handleStartQuiz, user]);

  const renderQuestion = useCallback((question: Question, index: number) => {
    const currentAnswer = getCurrentAnswer(question._id);

    return (
      <View
        style={{
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontFamily: 'Inter-24pt-SemiBold',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            marginBottom: 12,
          }}
        >
          {index + 1}. {question.text}
        </Text>

        {question.images && question.images.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {question.images.map((image, imgIndex) => (
              <Image
                key={imgIndex}
                source={{ uri: `http://192.168.100.5:5000${image}` }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                resizeMode="contain"
              />
            ))}
          </View>
        )}

        <View style={{ marginLeft: 8 }}>
          {question.options.map((option, optionIndex) => (
            <TouchableOpacity
              key={optionIndex}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                borderWidth: 2,
                borderColor:
                  (question.type === 'multiple_choice' || question.type === 'true_false')
                    ? (currentAnswer === option.text ? '#3B82F6' : 'transparent')
                    : (Array.isArray(currentAnswer) && currentAnswer.includes(option.text) ? '#3B82F6' : 'transparent')
              }}
              onPress={() => {
                if (question.type === 'multiple_choice' || question.type === 'true_false') {
                  handleAnswerChange(question._id, option.text);
                } else if (question.type === 'multiple_answers') {
                  const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                  const newAnswers = currentAnswers.includes(option.text)
                    ? currentAnswers.filter(a => a !== option.text)
                    : [...currentAnswers, option.text];
                  handleAnswerChange(question._id, newAnswers);
                }
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 10 : 4,
                  borderWidth: 2,
                  borderColor: '#9CA3AF',
                  backgroundColor:
                    (question.type === 'multiple_choice' || question.type === 'true_false')
                      ? (currentAnswer === option.text ? '#3B82F6' : 'transparent')
                      : (Array.isArray(currentAnswer) && currentAnswer.includes(option.text) ? '#3B82F6' : 'transparent'),
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {((question.type === 'multiple_choice' || question.type === 'true_false') && currentAnswer === option.text) ||
                 (question.type === 'multiple_answers' && Array.isArray(currentAnswer) && currentAnswer.includes(option.text)) ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 4 : 2,
                      backgroundColor: 'white',
                    }}
                  />
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-18pt-Regular',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                }}
              >
                {option.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{
            fontSize: 12,
            fontFamily: 'Inter-18pt-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280'
          }}>
            Points: {question.itemPoints}
          </Text>
        </View>
      </View>
    );
  }, [isDarkMode, getCurrentAnswer, handleAnswerChange]);


  const keyExtractor = useCallback((item: Quiz) => item._id, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Inter-24pt-Bold',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            marginBottom: 16,
          }}
        >
          My Quizzes
        </Text>

        {/* Filters */}
        <View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                placeholder="Search quizzes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  fontFamily: 'Inter-18pt-Regular',
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
            {/* Subject Picker */}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-18pt-Medium',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                Subject
              </Text>
              <View style={{
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              }}>
                <Picker
                  selectedValue={selectedSubject}
                  onValueChange={setSelectedSubject}
                  style={{
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    backgroundColor: 'transparent',
                    fontFamily: 'Inter-18pt-Regular',
                  }}
                  dropdownIconColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                >
                  <Picker.Item label="All Subjects" value="" />
                  {subjects.map((subject) => (
                    <Picker.Item
                      key={subject._id}
                      label={`${subject.subjectName}${subject.gradeLevel ? ` - ${subject.gradeLevel}` : ''}${subject.section ? ` (${subject.section})` : ''}`}
                      value={subject._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Quarter Picker */}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 12,
                fontFamily: 'Inter-18pt-Medium',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                Quarter
              </Text>
              <View style={{
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              }}>
                <Picker
                  selectedValue={selectedQuarter}
                  onValueChange={setSelectedQuarter}
                  style={{
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    backgroundColor: 'transparent',
                    fontFamily: 'Inter-18pt-Regular',
                  }}
                  dropdownIconColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                >
                  {quarterOptions.map((quarter) => (
                    <Picker.Item
                      key={quarter.value}
                      label={quarter.label}
                      value={quarter.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={{
              marginTop: 16,
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280'
            }}>
              Loading quizzes...
            </Text>
          </View>
        ) : quizzes.length > 0 ? (
          <FlashList
            data={quizzes}
            renderItem={renderQuizItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            estimatedItemSize={150}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/quiz.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
            />
            <Text style={{
              fontSize: 18,
              fontFamily: 'Inter-24pt-SemiBold',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              marginBottom: 8
            }}>
              No quizzes available
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#6B7280' : '#9CA3AF',
              textAlign: 'center'
            }}>
              Check back later for new quizzes
            </Text>
          </View>
        )}
      </View>

      {/* Quiz Taking Modal */}
      <Modal
        visible={!!takingQuiz}
        animationType="slide"
        transparent={false}
        onRequestClose={closeQuizModal}
      >
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
          {/* Instructions Screen */}
          {showInstructions && takingQuiz && (
            <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: 'Inter-24pt-Bold',
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
                      fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Medium',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginBottom: 8
                  }}>
                    Quiz Information:
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4
                  }}>
                    • Questions: {takingQuiz.questions.length}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4
                  }}>
                    • Total Points: {takingQuiz.quizPoints}
                  </Text>
                  {takingQuiz.timeLimit && (
                    <Text style={{
                      fontSize: 14,
                      fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Medium',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginBottom: 8
                  }}>
                    Instructions:
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4
                  }}>
                    • Read each question carefully
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4
                  }}>
                    • You can navigate between questions using the navigation buttons
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginBottom: 4
                  }}>
                    • Make sure to submit your quiz before time runs out
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontFamily: 'Inter-18pt-Regular',
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
                      fontFamily: 'Inter-18pt-Medium',
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
                      fontFamily: 'Inter-18pt-Medium',
                      fontSize: 16
                    }}>
                      Begin Quiz
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Quiz Taking Screen */}
          {quizStarted && takingQuiz && !quizCompleted && (
            <View style={{ flex: 1 }}>
              {/* Header with timer */}
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: 'Inter-24pt-Bold',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                    }}
                  >
                    {takingQuiz.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'Inter-18pt-Regular',
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
                        fontFamily: 'Inter-24pt-Bold',
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
                      fontFamily: 'Inter-18pt-Medium',
                      fontSize: 12
                    }}>
                      Exit
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Question */}
              <ScrollView style={{ flex: 1, padding: 20 }}>
                {renderQuestion(takingQuiz.questions[currentQuestionIndex], currentQuestionIndex)}
              </ScrollView>

              {/* Navigation */}
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: isDarkMode ? '#374151' : '#E5E7EB',
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
                    fontFamily: 'Inter-18pt-Medium'
                  }}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 12,
                    fontFamily: 'Inter-18pt-Regular',
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
                      fontFamily: 'Inter-18pt-Medium'
                    }}>
                      Next
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleSubmitQuiz}
                    style={{
                      backgroundColor: '#10B981',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{
                      color: 'white',
                      fontFamily: 'Inter-18pt-Medium'
                    }}>
                      Submit Quiz
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Results Screen */}
          {quizCompleted && quizResults && takingQuiz && (
            <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: 'Inter-24pt-Bold',
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
                      fontFamily: 'Inter-24pt-Bold',
                      color: '#10B981',
                      marginBottom: 8,
                    }}
                  >
                    {quizResults.score}/{quizResults.totalPoints}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Medium',
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

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ScrollView>
  );
};

export default QuizzesAndroid;