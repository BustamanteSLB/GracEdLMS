import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Checkbox } from 'expo-checkbox';
import { RadioButton, RadioButtonGroup } from '@/components/RadioButton';
import { Image } from 'expo-image';

export interface StudentPreviewQuestion {
  text: string;
  type: 'multiple_choice' | 'multiple_answers' | 'true_false' | 'short_answer' | 'essay';
  options: Array<{ text: string }>;
  images?: string[];
  itemPoints: number;
  caseSensitive?: boolean;
}

interface StudentAnswer {
  questionIndex: number;
  answer: string | string[];
}

interface TeacherQuizStudentPreviewProps {
  title: string;
  sectionHeader?: string;
  sectionDescription?: string;
  term: string;
  totalPoints: number;
  timeLimit?: string | number;
  shuffleQuestions?: boolean;
  questions: StudentPreviewQuestion[];
  isDarkMode: boolean;
  onExit: () => void;
}

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const TeacherQuizStudentPreview: React.FC<TeacherQuizStudentPreviewProps> = ({
  title,
  sectionHeader,
  sectionDescription,
  term,
  totalPoints,
  timeLimit,
  shuffleQuestions,
  questions,
  isDarkMode,
  onExit,
}) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [displayQuestions, setDisplayQuestions] = useState<StudentPreviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);

  const handleBeginQuiz = () => {
    const ordered = shuffleQuestions ? shuffleArray(questions) : questions;
    setDisplayQuestions(ordered);
    setStudentAnswers([]);
    setCurrentQuestionIndex(0);
    setShowInstructions(false);
    setQuizStarted(true);
  };

  const handleAnswerChange = (questionIndex: number, answer: string | string[]) => {
    setStudentAnswers((prev) => {
      const existing = prev.find((item) => item.questionIndex === questionIndex);
      if (existing) {
        return prev.map((item) =>
          item.questionIndex === questionIndex ? { ...item, answer } : item,
        );
      }
      return [...prev, { questionIndex, answer }];
    });
  };

  const getCurrentAnswer = (questionIndex: number) =>
    studentAnswers.find((item) => item.questionIndex === questionIndex)?.answer;

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < displayQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const renderQuestion = (question: StudentPreviewQuestion, questionIndex: number) => {
    const currentAnswer = getCurrentAnswer(questionIndex);

    return (
      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 12,
          padding: 20,
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
          {questionIndex + 1}. {question.text}
        </Text>

        {question.images && question.images.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {question.images.map((imageUrl, imgIndex) => (
              <Image
                key={imgIndex}
                source={{ uri: imageUrl }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
                contentFit="contain"
              />
            ))}
          </View>
        )}

        <View>
          {question.type === 'essay' ? (
            <View>
              <TextInput
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChangeText={(text) => handleAnswerChange(questionIndex, text)}
                placeholder="Type your essay answer here..."
                multiline
                numberOfLines={6}
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  minHeight: 150,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter-Regular',
                  borderWidth: 1,
                  borderColor: currentAnswer ? '#3B82F6' : isDarkMode ? '#333333' : '#E5E7EB',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginTop: 8,
                  fontStyle: 'italic',
                }}
              >
                Note: This question would be graded manually by your teacher
              </Text>
            </View>
          ) : question.type === 'short_answer' ? (
            <View>
              <TextInput
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChangeText={(text) => handleAnswerChange(questionIndex, text)}
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
                  borderColor: currentAnswer ? '#3B82F6' : isDarkMode ? '#333333' : '#E5E7EB',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
              {question.caseSensitive && (
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginTop: 8,
                    fontStyle: 'italic',
                  }}
                >
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
                    borderColor:
                      Array.isArray(currentAnswer) && currentAnswer.includes(option.text)
                        ? '#3B82F6'
                        : 'transparent',
                  }}
                  onPress={() => {
                    const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                    const newAnswers = currentAnswers.includes(option.text)
                      ? currentAnswers.filter((value) => value !== option.text)
                      : [...currentAnswers, option.text];
                    handleAnswerChange(questionIndex, newAnswers);
                  }}
                >
                  <Checkbox
                    value={Array.isArray(currentAnswer) && currentAnswer.includes(option.text)}
                    onValueChange={(checked) => {
                      const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                      const newAnswers = checked
                        ? [...currentAnswers, option.text]
                        : currentAnswers.filter((value) => value !== option.text);
                      handleAnswerChange(questionIndex, newAnswers);
                    }}
                    style={{
                      marginRight: 12,
                      borderRadius: 4,
                      width: 20,
                      height: 20,
                    }}
                    color={
                      Array.isArray(currentAnswer) && currentAnswer.includes(option.text)
                        ? '#3B82F6'
                        : undefined
                    }
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
              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
              onChange={(value) => handleAnswerChange(questionIndex, value)}
              activeColor="#3B82F6"
              inactiveColor={isDarkMode ? '#6B7280' : '#D1D5DB'}
              width={20}
              height={20}
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
                    borderColor: currentAnswer === option.text ? '#3B82F6' : 'transparent',
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
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Points: {question.itemPoints}
          </Text>
        </View>
      </View>
    );
  };

  const previewBadge = (
    <View
      style={{
        backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
        alignSelf: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: 'Inter-Medium',
          color: isDarkMode ? '#93C5FD' : '#1D4ED8',
        }}
      >
        Student preview — answers are not submitted
      </Text>
    </View>
  );

  if (showInstructions) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        {previewBadge}
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
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {title || 'Untitled Quiz'}
          </Text>

          {sectionHeader ? (
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter-SemiBold',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {sectionHeader}
            </Text>
          ) : null}

          {sectionDescription ? (
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {sectionDescription}
            </Text>
          ) : null}

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 8,
              }}
            >
              Quiz Information:
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Questions: {questions.length}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Total Points: {totalPoints}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Term: {term === '1' ? '1st Term' : term === '2' ? '2nd Term' : '3rd Term'}
            </Text>
            {timeLimit ? (
              <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
                • Time Limit: {timeLimit} minutes
              </Text>
            ) : null}
            {shuffleQuestions ? (
              <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
                • Questions are shown in a randomized order
              </Text>
            ) : null}
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                marginBottom: 8,
              }}
            >
              Preview Instructions:
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Answer questions as a student would
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Navigate between questions using Previous and Next
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              • Submission is disabled in this preview
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onExit}
              style={{
                flex: 1,
                backgroundColor: '#EF4444',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontFamily: 'Inter-Medium', fontSize: 16 }}>
                Back to Edit
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
              <Text style={{ color: 'white', fontFamily: 'Inter-Medium', fontSize: 16 }}>
                Begin Preview
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!quizStarted || displayQuestions.length === 0) {
    return null;
  }

  const currentQuestion = displayQuestions[currentQuestionIndex];

  return (
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
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
            numberOfLines={1}
          >
            {title || 'Untitled Quiz'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Question {currentQuestionIndex + 1} of {displayQuestions.length}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#93C5FD' : '#2563EB',
              marginTop: 4,
            }}
          >
            Preview only — cannot submit
          </Text>
        </View>
        <TouchableOpacity
          onPress={onExit}
          style={{
            backgroundColor: '#EF4444',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: 'white', fontFamily: 'Inter-Medium', fontSize: 12 }}>
            Exit
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {renderQuestion(currentQuestion, currentQuestionIndex)}
      </ScrollView>

      <View
        style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          padding: 20,
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
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
            <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>Previous</Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Answered: {studentAnswers.length} / {displayQuestions.length}
          </Text>

          {currentQuestionIndex < displayQuestions.length - 1 ? (
            <TouchableOpacity
              onPress={handleNextQuestion}
              style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>Next</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  fontFamily: 'Inter-Medium',
                }}
              >
                Submit disabled
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default TeacherQuizStudentPreview;
