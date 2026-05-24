import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import apiClient from '@/app/services/apiClient';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import CheckIcon from '@/assets/icons/check.svg';
import CloseIcon from '@/assets/icons/close.svg';
import DownIcon from '@/assets/icons/down.svg';

cssInterop(Image, { className: "style" });

interface Question {
  _id: string;
  text: string;
  type: 'multiple_choice' | 'multiple_answers' | 'true_false' | 'short_answer' | 'essay';
  itemPoints: number;
  images?: string[];
}

interface SubmittedAnswer {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  pointsEarned: number;
  manuallyGraded: boolean;
}

interface Submission {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userId: string;
  };
  submittedAnswers: SubmittedAnswer[];
  status: string;
  quizScore: number;
  submissionDate: string;
}

interface Quiz {
  _id: string;
  title: string;
  quizPoints: number;
  hasEssay: boolean;
  questions: Question[];
}

const QuizSubmissionsWeb = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const params = useLocalSearchParams();
  const quizId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [gradingModal, setGradingModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    submissionId: string;
    questionId: string;
    currentPoints: number;
    maxPoints: number;
  } | null>(null);
  const [gradeInput, setGradeInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions();
    }, [quizId])
  );

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/quizzes/${quizId}/submissions`);
      setQuiz(response.data.data.quiz);
      setSubmissions(response.data.data.submissions);
      document.title = `${response.data.data.quiz.title} - Submissions`;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      window.alert('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeEssay = async (accept: boolean) => {
    if (!selectedAnswer) return;

    const points = accept ? parseFloat(gradeInput) : 0;

    if (accept && (isNaN(points) || points < 0 || points > selectedAnswer.maxPoints)) {
      window.alert(`Please enter a valid score between 0 and ${selectedAnswer.maxPoints}`);
      return;
    }

    try {
      await apiClient.put(
        `/quizzes/submissions/${selectedAnswer.submissionId}/grade-essay`,
        {
          questionId: selectedAnswer.questionId,
          pointsEarned: points,
        }
      );

      await fetchSubmissions();
      setGradingModal(false);
      setSelectedAnswer(null);
      setGradeInput('');
      
      window.alert(`Essay graded successfully! Points awarded: ${points}/${selectedAnswer.maxPoints}`);
    } catch (error: any) {
      console.error('Error grading essay:', error);
      window.alert(error.response?.data?.message || 'Failed to grade essay');
    }
  };

  const openGradingModal = (submissionId: string, questionId: string, currentPoints: number, maxPoints: number) => {
    setSelectedAnswer({ submissionId, questionId, currentPoints, maxPoints });
    setGradeInput(currentPoints > 0 ? currentPoints.toString() : '');
    setGradingModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return '#10B981';
      case 'partial': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded': return 'Graded';
      case 'partial': return 'Pending Essay Grading';
      default: return status;
    }
  };

  const renderSubmissionAnswer = ({ item: answer, index }: { item: SubmittedAnswer; index: number }) => {
    const question = quiz?.questions.find(q => q._id === answer.questionId);
    if (!question) return null;

    const submission = submissions.find(s => 
      s.submittedAnswers.some(a => a.questionId === answer.questionId)
    );
    if (!submission) return null;

    return (
      <View style={{
        backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}>
        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
          Q{index + 1}: {question.text}
        </Text>

        {question.images && question.images.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {question.images.map((img, imgIdx) => (
              <Image
                key={imgIdx}
                source={{ uri: img }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        {question.type === 'essay' ? (
          <View>
            <View style={{
              backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
                {answer.answer || 'No answer provided'}
              </Text>
            </View>

            {answer.manuallyGraded ? (
              <View style={{
                backgroundColor: isDarkMode ? '#065F46' : '#ECFDF5',
                borderRadius: 8,
                padding: 12,
              }}>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                  ✓ Graded: {answer.pointsEarned}/{question.itemPoints} points
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => openGradingModal(submission._id, question._id, answer.pointsEarned, question.itemPoints)}
                  style={{
                    flex: 1,
                    backgroundColor: '#3B82F6',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckIcon width={24} height={24} fill="white" style={{ marginRight: 8 }} />
                  <Text className="font-inter_semibold text-sm text-white">
                    Grade Essay
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAnswer({
                      submissionId: submission._id,
                      questionId: question._id,
                      currentPoints: 0,
                      maxPoints: question.itemPoints,
                    });
                    handleGradeEssay(false);
                  }}
                  style={{
                    backgroundColor: '#EF4444',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <CloseIcon width={24} height={24} fill="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={{
              backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
                Answer: {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer}
              </Text>
            </View>
            <View style={{
              backgroundColor: answer.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : (isDarkMode ? '#7F1D1D' : '#FEE2E2'),
              borderRadius: 8,
              padding: 8,
            }}>
              <Text className={`font-inter_semibold text-sm ${answer.isCorrect ? (isDarkMode ? 'text-green-300' : 'text-green-700') : (isDarkMode ? 'text-red-300' : 'text-red-700')}`}>
                {answer.isCorrect ? '✓' : '✗'} {answer.pointsEarned}/{question.itemPoints} points
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderSubmission = ({ item: submission }: { item: Submission }) => {
    const isExpanded = expandedSubmission === submission._id;

    return (
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}>
        <TouchableOpacity
          onPress={() => setExpandedSubmission(isExpanded ? null : submission._id)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1 }}>
            <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
              {submission.student.firstName} {submission.student.lastName}
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              ID: {submission.student.userId} • {submission.student.email}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
              <View style={{
                backgroundColor: getStatusColor(submission.status),
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 12, 
                  fontFamily: 'Inter-Medium' 
                }}>
                  {getStatusText(submission.status)}
                </Text>
              </View>
              <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
                Score: {submission.quizScore}/{quiz?.quizPoints}
              </Text>
            </View>
          </View>
          <DownIcon 
            width={20} 
            height={20} 
            fill={isDarkMode ? '#E0E0E0' : '#111827'} 
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDarkMode ? '#333333' : '#E5E7EB' }}>
            <FlatList
              data={submission.submittedAnswers}
              renderItem={renderSubmissionAnswer}
              keyExtractor={(item, index) => `${item.questionId}-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
    );
  };

  const ListHeaderComponent = () => (
    <View style={{
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
      marginBottom: 20,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <Image
            source={require('@/assets/icons/back.png')}
            style={{ width: 24, height: 24 }}
            tintColor={isDarkMode ? '#E0E0E0' : '#111827'}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
            {quiz?.title}
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} • {quiz?.quizPoints} points
          </Text>
        </View>
      </View>
      
      {quiz?.hasEssay && (
        <View style={{
          backgroundColor: isDarkMode ? '#7C2D12' : '#FEF3C7',
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
          borderLeftWidth: 4,
          borderLeftColor: '#F59E0B',
        }}>
          <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
            ⚠️ This quiz contains essay questions requiring manual grading
          </Text>
        </View>
      )}
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
      <Image
        source={require('@/assets/images/quiz.png')}
        style={{ width: 64, height: 64, marginBottom: 16 }}
      />
      <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
        No submissions yet
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{
            marginTop: 16,
            fontFamily: 'Inter-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280'
          }}>
            Loading submissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }} edges={['top', 'bottom']}>
      <FlatList
        data={submissions}
        renderItem={renderSubmission}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Grading Modal */}
      <Modal
        visible={gradingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setGradingModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <Text className={`font-inter_bold text-xl mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
              Grade Essay
            </Text>

            <Text className={`font-inter_regular text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Enter points (0-{selectedAnswer?.maxPoints}):
            </Text>
            <TextInput
              value={gradeInput}
              onChangeText={setGradeInput}
              keyboardType="numeric"
              placeholder="Enter points"
              style={{
                backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                borderRadius: 8,
                padding: 12,
                color: isDarkMode ? '#E0E0E0' : '#111827',
                fontFamily: 'Inter-Regular',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDarkMode ? '#333333' : '#E5E7EB',
              }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setGradingModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleGradeEssay(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#3B82F6',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text className="font-inter_semibold text-white">
                  Submit Grade
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default QuizSubmissionsWeb;