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
  VirtualizedList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { RadioButton, RadioButtonGroup } from '@/components/RadioButton';
import Checkbox from 'expo-checkbox';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import { useRouter, useFocusEffect } from 'expo-router'; // Add useFocusEffect (ensure useRouter is imported from expo-router if not already)

interface Subject {
  _id: string;
  subjectName: string;
  description?: string;
  gradeLevel?: string;
  section?: string;
  schoolYear?: string;
  subjectImage?: string; // Add this line
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
const QuizzesWeb = () => {
  document.title = 'Quizzes - GracEdLMS'
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
  
  // Image preview states
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<{[key: string]: boolean}>({});
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized dropdown options
  const subjectFilterOptions: DropdownItem[] = useMemo(() => {
    const options: DropdownItem[] = [
      { label: 'All Subjects', value: '' }
    ];
    
    subjects.forEach((subject) => {
      const label = `${subject.subjectName}${subject.gradeLevel ? ` - ${subject.gradeLevel}` : ''}${subject.section ? ` (${subject.section})` : ''}`;
      options.push({
        label,
        value: subject._id
      });
    });
    
    return options;
  }, [subjects]);

  const quarterFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Quarters', value: '' },
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: '3rd Quarter', value: '3rd Quarter' },
    { label: '4th Quarter', value: '4th Quarter' },
  ], []);

  // Replace initial useEffect with useFocusEffect to refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
      fetchSubjects();
    }, [selectedSubject, selectedQuarter, searchQuery])
  );
  
  // Keep the specific filter effect for immediate UI updates when dropdowns change
  useEffect(() => {
    fetchQuizzes();
  }, [selectedSubject, selectedQuarter]);

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
      params.append('status', 'published'); // Only get published quizzes for students
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
  };

  const fetchSubjects = async () => {
    try {
      const response = await apiClient.get('/subjects');
      // Response already filtered by backend for enrolled subjects only
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Helper function to validate and get image URL
  const getImageUrl = (imageUrl: string) => {
    // If it's already a full Firebase URL, return as is
    if (imageUrl.startsWith('https://storage.googleapis.com/') || 
        imageUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return imageUrl;
    }
    
    // If it's a legacy local path, try to construct Firebase URL
    // This is for backward compatibility
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      console.warn('Legacy image path detected:', imageUrl);
      // You might want to handle this case differently based on your migration strategy
      return null; // or return a placeholder image
    }
    
    // If it's already a relative path that might be a Firebase URL
    return imageUrl;
  };

  const handleImageError = (imageUrl: string) => {
    console.warn('Failed to load image:', imageUrl);
    setImageLoadError(prev => ({ ...prev, [imageUrl]: true }));
  };

  const handleImagePress = (imageUri: string) => {
    const validUrl = getImageUrl(imageUri);
    if (validUrl && !imageLoadError[validUrl]) {
      setSelectedPreviewImage(validUrl);
      setImagePreviewModal(true);
    }
  };

  const getQuizStatus = (quiz: Quiz) => {
    const submission = quiz.quizSubmissions?.find(sub => sub.student === user?._id);
    if (submission) {
      return submission.status === 'graded' ? 'completed' : 'submitted';
    }
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'submitted': return '#F59E0B';
      case 'completed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'submitted': return 'Submitted';
      case 'completed': return 'Completed';
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
    setImageLoadError({}); // Reset image error state
    if (quiz.timeLimit) {
      setTimeLeft(quiz.timeLimit * 60); // Convert minutes to seconds
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

    // Skip confirmation if auto-submitting (time ran out)
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

      await fetchQuizzes(); // Ensure we await this to update the list immediately after submission

      // Show notification ONLY if auto-submitted (not manual submission)
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
    
    // Auto-submit when time runs out (pass true to skip confirmation)
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
    fetchQuizzes(); // Trigger a refresh when closing the modal to ensure statuses are up to date
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentAnswer = (questionId: string) => {
    return studentAnswers.find(a => a.questionId === questionId)?.answer;
  };

  const renderQuizItem = ({ item }: { item: Quiz }) => {
    const status = getQuizStatus(item);
    const submission = item.quizSubmissions?.find(sub => sub.student === user?._id);
    
    // Add these for subject image display
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
        onPress={() => status === 'available' ? handleStartQuiz(item) : null}
        disabled={status !== 'available'}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Subject Image or Icon */}
            {item.subject?.subjectImage ? (
              <Image
                source={{ uri: item.subject.subjectImage }}
                style={{ width: 50, height: 50, borderRadius: 8 }}
                resizeMode="cover"
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
                {submission && submission.status === 'graded' && (
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
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: 8,
                }}
              >
                {item.subject?.subjectName || 'No Subject'} - {item.subject?.gradeLevel || ''} {item.subject?.section || ''}
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

          {status === 'available' && (
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
        </View>
      </TouchableOpacity>
    );
  };

  const renderQuestionImages = (images: string[]) => {
    if (!images || images.length === 0) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        {images.map((image, imgIndex) => {
          const imageUrl = getImageUrl(image);
          if (!imageUrl || imageLoadError[imageUrl]) {
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
                resizeMode="contain"
                onError={() => handleImageError(imageUrl)}
                onLoad={() => {
                  // Remove from error state if it loads successfully
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
            // Essay input
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
            // Short answer input
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
            // For multiple answers, use Expo Checkbox
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
            // For single choice questions (multiple_choice, true_false), use RadioButtonGroup
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

  // VirtualizedList required functions
  const getItem = (data: Quiz[], index: number) => data[index];
  const getItemCount = (data: Quiz[]) => data.length;
  const keyExtractor = (item: Quiz, index: number) => item._id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontFamily: 'Inter-Bold',
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
            {/* Subject Dropdown - REPLACED PICKER */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                Subject
              </Text>
              <Dropdown
                data={subjectFilterOptions}
                selectedValue={selectedSubject}
                onValueChange={setSelectedSubject}
                placeholder="All Subjects"
              />
            </View>

            {/* Quarter Dropdown - REPLACED PICKER */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280', 
                marginBottom: 4 
              }}>
                Quarter
              </Text>
              <Dropdown
                data={quarterFilterOptions}
                selectedValue={selectedQuarter}
                onValueChange={setSelectedQuarter}
                placeholder="All Quarters"
              />
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
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280' 
            }}>
              Loading quizzes...
            </Text>
          </View>
        ) : quizzes.length > 0 ? (
          <VirtualizedList
            data={quizzes}
            renderItem={renderQuizItem}
            keyExtractor={keyExtractor}
            getItem={getItem}
            getItemCount={getItemCount}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            extraData={isDarkMode}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
              No quizzes available
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-Regular',
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
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
          {/* Instructions Screen */}
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

          {/* Quiz Taking Screen */}
          {quizStarted && takingQuiz && !quizCompleted && (
            <View style={{ flex: 1 }}>
              {/* Header with timer */}
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
                        color: timeLeft <= 300 ? '#EF4444' : '#10B981', // Red when 5 minutes or less
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

              {/* Question */}
              <ScrollView style={{ flex: 1, padding: 20 }}>
                {renderQuestion(takingQuiz.questions[currentQuestionIndex], currentQuestionIndex)}
              </ScrollView>

              {/* Navigation */}
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

          {/* Results Screen */}
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
                resizeMode="contain"
                onError={() => {
                  console.warn('Failed to load image in preview:', selectedPreviewImage);
                  setImagePreviewModal(false);
                }}
              />
            )}
          </TouchableOpacity>
          
          {/* Optional: Add a hint text */}
          <View style={{
            position: 'absolute',
            bottom: 40,
            alignSelf: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 12,
              fontFamily: 'Inter-Regular',
            }}>
              Tap anywhere to close
            </Text>
          </View>
        </View>
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default QuizzesWeb;