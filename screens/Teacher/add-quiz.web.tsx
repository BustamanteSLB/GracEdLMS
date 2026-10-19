import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox } from 'expo-checkbox';
import { RadioButton, RadioButtonGroup } from '@/components/RadioButton';
import apiClient from '@/app/services/apiClient';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AddFile from '@/assets/icons/add_file.svg';
import TeacherQuizStudentPreview, {
  StudentPreviewQuestion,
} from '@/components/TeacherQuizStudentPreview';

cssInterop(Image, { className: "style" });

interface Subject {
  _id: string;
  subjectName: string;
  description?: string;
  gradeLevel?: string;
  section?: string;
  schoolYear?: string;
}

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  _id?: string;
  text: string;
  type: 'multiple_choice' | 'multiple_answers' | 'true_false' | 'short_answer' | 'essay';
  options: Option[];
  correctAnswers?: string[]; // For short answer
  caseSensitive?: boolean; // For short answer
  markOthersIncorrect?: boolean; // For short answer
  images?: string[];
  itemPoints: number;
  isRequired: boolean;
  answer: string | string[] | boolean;
}

const AddQuizWeb = () => {
  document.title = 'Create Quiz - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    sectionHeader: '',
    sectionDescription: '',
    subject: '',
    term: '1',
    timeLimit: '',
    shuffleQuestions: false,
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [studentPreviewMode, setStudentPreviewMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{[key: number]: (File | DocumentPicker.DocumentPickerAsset)[]}>({});

  const [aiGenerationMode, setAiGenerationMode] = useState(false);
  const [aiGenerationData, setAiGenerationData] = useState({
    numberOfQuestions: '10',
    questionTypes: ['multiple_choice', 'true_false'],
    difficulty: 'medium',
    selectedFile: null as File | DocumentPicker.DocumentPickerAsset | null,
  });
  const [generatingAI, setGeneratingAI] = useState(false);

  const terms = ['1', '2', '3'];

  // Fetch subjects
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await apiClient.get('/subjects');
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Add new question
  const addQuestion = () => {
    const newQuestion: Question = {
      text: '',
      type: 'multiple_choice',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      correctAnswers: [],
      caseSensitive: false,
      markOthersIncorrect: true,
      itemPoints: 1,
      isRequired: true,
      answer: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  // Remove question
  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    const updatedImages = { ...selectedImages };
    delete updatedImages[index];
    setSelectedImages(updatedImages);
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    
    if (field === 'type') {
      const question = updatedQuestions[index];
      if (value === 'true_false') {
        question.options = [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: false },
        ];
        question.correctAnswers = [];
      } else if (value === 'short_answer') {
        question.options = [];
        question.correctAnswers = [];
        question.caseSensitive = false;
        question.markOthersIncorrect = true;
      } else if (value === 'essay') {
        // Essay has no options or correct answers
        question.options = [];
        question.correctAnswers = [];
      } else if (value === 'multiple_choice' || value === 'multiple_answers') {
        if (question.options.length < 2) {
          question.options = [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ];
        }
        question.correctAnswers = [];
      }
      question.answer = value === 'multiple_answers' ? [] : '';
    }
    
    setQuestions(updatedQuestions);
  };

  // Add option to question
  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.push({ text: '', isCorrect: false });
    setQuestions(updatedQuestions);
  };

  // Remove option from question
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      setQuestions(updatedQuestions);
    }
  };

  // Update option
  const updateOption = (questionIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = {
      ...updatedQuestions[questionIndex].options[optionIndex],
      [field]: value,
    };

    const question = updatedQuestions[questionIndex];
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      if (field === 'isCorrect' && value) {
        question.options.forEach((opt, idx) => {
          if (idx !== optionIndex) opt.isCorrect = false;
        });
        question.answer = question.options[optionIndex].text;
      } else if (field === 'isCorrect' && !value) {
        question.answer = '';
      }
    } else if (question.type === 'multiple_answers') {
      const correctOptions = question.options
        .filter(opt => opt.isCorrect)
        .map(opt => opt.text);
      question.answer = correctOptions;
    }

    setQuestions(updatedQuestions);
  };

  // Add correct answer for short answer questions
  const addCorrectAnswer = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    if (!updatedQuestions[questionIndex].correctAnswers) {
      updatedQuestions[questionIndex].correctAnswers = [];
    }
    updatedQuestions[questionIndex].correctAnswers!.push('');
    setQuestions(updatedQuestions);
  };

  // Remove correct answer
  const removeCorrectAnswer = (questionIndex: number, answerIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].correctAnswers) {
      updatedQuestions[questionIndex].correctAnswers!.splice(answerIndex, 1);
    }
    setQuestions(updatedQuestions);
  };

  // Update correct answer
  const updateCorrectAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].correctAnswers) {
      updatedQuestions[questionIndex].correctAnswers![answerIndex] = value;
    }
    setQuestions(updatedQuestions);
  };

  // Handle image selection
  const handleImagePick = async (questionIndex: number) => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.onchange = (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (files) {
            const fileArray = Array.from(files);
            setSelectedImages(prev => ({
              ...prev,
              [questionIndex]: [...(prev[questionIndex] || []), ...fileArray]
            }));
          }
        };
        
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          multiple: true,
        });

        if (result.canceled === false) {
          setSelectedImages(prev => ({
            ...prev,
            [questionIndex]: [...(prev[questionIndex] || []), ...result.assets]
          }));
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
    }
  };

  // Get image URL
  const getImageUrl = (questionIndex: number, imageIndex: number) => {
    const images = selectedImages[questionIndex];
    if (images && imageIndex < images.length) {
      const file = images[imageIndex];
      if (Platform.OS === 'web') {
        return URL.createObjectURL(file as File);
      } else {
        return (file as DocumentPicker.DocumentPickerAsset).uri;
      }
    }
    return null;
  };

  const studentPreviewQuestions = useMemo<StudentPreviewQuestion[]>(
    () =>
      questions.map((question, index) => ({
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({ text: option.text })),
        images: (selectedImages[index] || [])
          .map((_, imgIndex) => getImageUrl(index, imgIndex))
          .filter((url): url is string => !!url),
        itemPoints: question.itemPoints,
        caseSensitive: question.caseSensitive,
      })),
    [questions, selectedImages],
  );

  const toggleStudentPreviewMode = () => {
    if (!studentPreviewMode && questions.length === 0) {
      window.alert('Add at least one question to preview as a student.');
      return;
    }
    setStudentPreviewMode(!studentPreviewMode);
    setPreviewMode(false);
    setAiGenerationMode(false);
  };

  // Remove image
  const removeImage = (questionIndex: number, imageIndex: number) => {
    const images = selectedImages[questionIndex] || [];
    setSelectedImages(prev => ({
      ...prev,
      [questionIndex]: images.filter((_, i) => i !== imageIndex)
    }));
  };

  // Calculate total points
  const calculateTotalPoints = () => {
    return questions.reduce((total, question) => total + question.itemPoints, 0);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.title.trim()) {
      window.alert('Please enter a quiz title');
      return false;
    }
    
    if (!formData.subject) {
      window.alert('Please select a subject');
      return false;
    }
    
    if (questions.length === 0) {
      window.alert('Please add at least one question');
      return false;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.text.trim()) {
        window.alert(`Question ${i + 1} is missing text`);
        return false;
      }
      
      // Skip option validation for short answer and essay questions
      if (question.type === 'short_answer') {
        if (!question.correctAnswers || question.correctAnswers.length === 0 || !question.correctAnswers.some(ans => ans.trim())) {
          window.alert(`Question ${i + 1} needs at least one correct answer`);
          return false;
        }
        continue;
      }
      
      if (question.type === 'essay') {
        // Essay questions don't need options or correct answers
        continue;
      }
      
      // Validate options for other question types
      const validOptions = question.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        window.alert(`Question ${i + 1} needs at least 2 options with text`);
        return false;
      }
      
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        window.alert(`Question ${i + 1} needs at least one correct answer`);
        return false;
      }
    }
    
    return true;
  };

  // Save quiz
  const handleSave = async () => {
    if (loading) return;

    if (!validateForm()) return;

    setLoading(true);

    try {
      const cleanedQuestions = questions.map((question, questionIndex) => {
        const images = selectedImages[questionIndex] || [];
        
        return {
          ...question,
          options: question.options.filter(opt => opt.text.trim() !== ''),
          images: images.map(file => file.name)
        };
      });

      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('sectionHeader', formData.sectionHeader.trim());
      formDataToSend.append('sectionDescription', formData.sectionDescription.trim());
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('term', formData.term);
      
      if (formData.timeLimit && formData.timeLimit.trim()) {
        formDataToSend.append('timeLimit', formData.timeLimit.trim());
      }

      formDataToSend.append('shuffleQuestions', String(formData.shuffleQuestions));

      formDataToSend.append('questions', JSON.stringify(cleanedQuestions));

      Object.entries(selectedImages).forEach(([questionIndex, files]) => {
        files.forEach((file) => {
          if (Platform.OS === 'web') {
            formDataToSend.append('questionImages', file as File);
          } else {
            const asset = file as DocumentPicker.DocumentPickerAsset;
            if (asset.uri) {
              formDataToSend.append('questionImages', {
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                name: asset.name || 'image.jpg',
              } as any);
            }
          }
        });
      });

      await apiClient.post('/quizzes', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      window.alert('Quiz created successfully');
      router.push('/(teachers)/quizzes');

    } catch (error: any) {
      console.error('Error saving quiz:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save quiz';
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // AI file pick handler
  const handleAIFilePick = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.txt';
        
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            setAiGenerationData(prev => ({ ...prev, selectedFile: file }));
          }
        };
        
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'],
          multiple: false,
        });

        if (result.canceled === false && result.assets[0]) {
          setAiGenerationData(prev => ({ ...prev, selectedFile: result.assets[0] }));
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  // Add AI quiz generation handler
  const handleAIGeneration = async () => {
    if (!aiGenerationData.selectedFile || !formData.subject) {
      window.alert('Please select a file and subject before generating AI quiz');
      return;
    }

    setGeneratingAI(true);

    try {
      const formDataToSend = new FormData();
      
      // Add file
      if (Platform.OS === 'web') {
        formDataToSend.append('document', aiGenerationData.selectedFile as File);
      } else {
        const asset = aiGenerationData.selectedFile as DocumentPicker.DocumentPickerAsset;
        formDataToSend.append('document', {
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          name: asset.name || 'document.pdf',
        } as any);
      }

      // Add generation parameters
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('title', formData.title || `AI Generated Quiz`);
      formDataToSend.append('term', formData.term);
      formDataToSend.append('numberOfQuestions', aiGenerationData.numberOfQuestions);
      formDataToSend.append('questionTypes', JSON.stringify(aiGenerationData.questionTypes));
      formDataToSend.append('difficulty', aiGenerationData.difficulty);
      
      if (formData.timeLimit) {
        formDataToSend.append('timeLimit', formData.timeLimit);
      }

      const response = await apiClient.post('/quizzes/generate-ai', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Set the generated questions
      setQuestions(response.data.data.questions);
      
      // Update form data with AI-generated title if user didn't provide one
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: response.data.data.title,
        }));
      }

      // Switch back to edit mode
      setAiGenerationMode(false);

      window.alert(response.data.message || 'AI quiz generated successfully! Review the questions and click "Create Quiz" to save.');

    } catch (error: any) {
      console.error('Error generating AI quiz:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate AI quiz';
      window.alert(`Error: ${errorMessage}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Add AI generation render function
  const renderAIGeneration = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}>
        <Text className={`font-inter_semibold text-lg mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
          AI Quiz Generation
        </Text>
        
        <Text className={`font-inter_regular text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
          Upload a document (PDF, Word, PowerPoint, or text file) and our AI will generate quiz questions based on the content.
        </Text>

        {/* File Upload */}
        <View style={{ marginBottom: 16 }}>
          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Upload Document <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            onPress={handleAIFilePick}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
              borderRadius: 8,
              borderWidth: 2,
              borderColor: aiGenerationData.selectedFile ? '#10B981' : (isDarkMode ? '#333333' : '#D1D5DB'),
              borderStyle: 'dashed',
            }}
          >
            <Image
              source={require('@/assets/icons/upload.png')}
              style={{ width: 24, height: 24, marginRight: 12 }}
              tintColor="#3B82F6"
            />
            <View style={{ flex: 1 }}>
              {aiGenerationData.selectedFile ? (
                <>
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
                    {aiGenerationData.selectedFile.name}
                  </Text>
                  <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    File selected ✓
                  </Text>
                </>
              ) : (
                <>
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
                    Choose a document
                  </Text>
                  <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                    PDF, Word, PowerPoint, or text files
                  </Text>
                </>
              )}
            </View>
            {aiGenerationData.selectedFile && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setAiGenerationData(prev => ({ ...prev, selectedFile: null }));
                }}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
              >
                <Image
                  source={require('@/assets/icons/close.png')}
                  style={{ width: 12, height: 12 }}
                  tintColor="white"
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Number of Questions */}
        <View style={{ marginBottom: 16 }}>
          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Number of Questions <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={aiGenerationData.numberOfQuestions}
            onChangeText={(text) => setAiGenerationData(prev => ({ ...prev, numberOfQuestions: text }))}
            placeholder="10"
            keyboardType="numeric"
            style={{
              backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
              borderRadius: 8,
              padding: 12,
              color: isDarkMode ? '#E0E0E0' : '#111827',
              fontFamily: 'Inter-Regular',
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
          />
        </View>

        {/* Question Types */}
        <View style={{ marginBottom: 16 }}>
          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Question Types
          </Text>
          <View style={{ gap: 8 }}>
            {[
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'true_false', label: 'True/False' },
              { value: 'multiple_answers', label: 'Multiple Answers' },
              { value: 'short_answer', label: 'Short Answer' },
              { value: 'essay', label: 'Essay (Manual Grading)' },
            ].map((type) => (
              <View key={type.value} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Checkbox
                  value={aiGenerationData.questionTypes.includes(type.value)}
                  onValueChange={(checked) => {
                    setAiGenerationData(prev => ({
                      ...prev,
                      questionTypes: checked 
                        ? [...prev.questionTypes, type.value]
                        : prev.questionTypes.filter(t => t !== type.value)
                    }));
                  }}
                  color={aiGenerationData.questionTypes.includes(type.value) ? '#3B82F6' : undefined}
                  style={{ marginRight: 8 }}
                />
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  {type.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Difficulty Level */}
        <View style={{ marginBottom: 16 }}>
          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Difficulty Level
          </Text>
          <RadioButtonGroup
            value={aiGenerationData.difficulty}
            onChange={(value) => setAiGenerationData(prev => ({ ...prev, difficulty: value }))}
            activeColor="#3B82F6"
          >
            <RadioButton 
              value="easy" 
              label="Easy"
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
            />
            <RadioButton 
              value="medium" 
              label="Medium"
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
            />
            <RadioButton 
              value="hard" 
              label="Hard"
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
            />
          </RadioButtonGroup>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleAIGeneration}
          disabled={generatingAI || !aiGenerationData.selectedFile || !formData.subject}
          style={{
            backgroundColor: generatingAI || !aiGenerationData.selectedFile || !formData.subject 
              ? '#9CA3AF' 
              : '#10B981',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generatingAI ? (
            <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
          ) : (
            <Image
              source={require('@/assets/icons/ai.png')}
              style={{ width: 20, height: 20, marginRight: 8 }}
              tintColor="white"
            />
          )}
          <Text className='font-inter_semibold text-white'>
            {generatingAI ? 'Generating Quiz...' : 'Generate AI Quiz'}
          </Text>
        </TouchableOpacity>

        {generatingAI && (
          <Text className={`font-inter_regular text-xs mt-2 text-center ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            This may take a few moments while our AI analyzes your document...
          </Text>
        )}
      </View>
    </ScrollView>
  );

  // Render question type selector
  const renderQuestionTypeSelector = (question: Question, index: number) => (
    <View style={{ marginBottom: 16 }}>
      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
        Question Type
      </Text>
      <RadioButtonGroup
        value={question.type}
        onChange={(value) => updateQuestion(index, 'type', value)}
        activeColor="#3B82F6"
      >
        <RadioButton 
          value="multiple_choice" 
          label="Multiple Choice (Single Answer)"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
        />
        <RadioButton 
          value="multiple_answers" 
          label="Multiple Choice (Multiple Answers)"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
        />
        <RadioButton 
          value="true_false" 
          label="True/False"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
        />
        <RadioButton 
          value="short_answer" 
          label="Short Answer"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
        />
        <RadioButton 
          value="essay" 
          label="Essay (Manual Grading)"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-Regular' }}
        />
      </RadioButtonGroup>
    </View>
  );

  // Render short answer options
  const renderShortAnswerOptions = (question: Question, questionIndex: number) => (
    <View style={{ marginBottom: 16 }}>
      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
        List correct answer(s)
      </Text>
      
      {question.correctAnswers && question.correctAnswers.map((answer, answerIndex) => (
        <View key={answerIndex} style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 8,
          backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F4F6',
          borderRadius: 8,
          padding: 12,
        }}>
          <Image
            source={require('@/assets/icons/check.png')}
            style={{ width: 16, height: 16, marginRight: 12 }}
            tintColor="#10B981"
          />
          <TextInput
            value={answer}
            onChangeText={(text) => updateCorrectAnswer(questionIndex, answerIndex, text)}
            placeholder={`Correct answer ${answerIndex + 1}`}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
              borderRadius: 6,
              color: isDarkMode ? '#E0E0E0' : '#111827',
              marginRight: 8,
              fontFamily: 'Inter-Regular',
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
          />
          <TouchableOpacity
            onPress={() => removeCorrectAnswer(questionIndex, answerIndex)}
            style={{ padding: 4 }}
          >
            <Image
              source={require('@/assets/icons/close.png')}
              style={{ width: 16, height: 16 }}
              tintColor='#EF4444'
            />
          </TouchableOpacity>
        </View>
      ))}
      
      <TouchableOpacity
        onPress={() => addCorrectAnswer(questionIndex)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
          backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
          borderRadius: 6,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#D1D5DB',
          borderStyle: 'dashed',
          marginBottom: 12,
        }}
      >
        <Image
          source={require('@/assets/icons/plus.png')}
          style={{ width: 16, height: 16, marginRight: 8, tintColor: '#3B82F6' }}
        />
        <Text className='font-inter_regular text-sm text-[#3B82F6]'>
          Add a correct answer
        </Text>
      </TouchableOpacity>

      {/* Case Sensitive Checkbox */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Checkbox
          value={question.caseSensitive || false}
          onValueChange={(value) => updateQuestion(questionIndex, 'caseSensitive', value)}
          color={question.caseSensitive ? '#3B82F6' : undefined}
          style={{ marginRight: 8 }}
        />
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
          Case sensitive
        </Text>
      </View>

      {/* Mark Others Incorrect Checkbox */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Checkbox
          value={question.markOthersIncorrect !== false}
          onValueChange={(value) => updateQuestion(questionIndex, 'markOthersIncorrect', value)}
          color={question.markOthersIncorrect !== false ? '#3B82F6' : undefined}
          style={{ marginRight: 8 }}
        />
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
          Mark all other answers incorrect
        </Text>
      </View>
    </View>
  );

  // Render question options
  const renderQuestionOptions = (question: Question, questionIndex: number) => (
    <View style={{ marginBottom: 16 }}>
      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
        Options
      </Text>
      {question.options.map((option, optionIndex) => (
        <View key={optionIndex} style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: 8,
          backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F4F6',
          borderRadius: 8,
          padding: 12,
        }}>
          {question.type === 'multiple_answers' ? (
            <Checkbox
              value={option.isCorrect}
              onValueChange={(value) => updateOption(questionIndex, optionIndex, 'isCorrect', value)}
              color={option.isCorrect ? '#3B82F6' : undefined}
              style={{ marginRight: 12, width: 20, height: 20 }}
            />
          ) : (
            <RadioButton
              value={optionIndex}
              selected={option.isCorrect}
              onPress={() => updateOption(questionIndex, optionIndex, 'isCorrect', !option.isCorrect)}
              activeColor="#3B82F6"
              inactiveColor={isDarkMode ? '#6B7280' : '#D1D5DB'}
              width={20}
              height={20}
              style={{ marginRight: 12 }}
            />
          )}
          <TextInput
            value={option.text}
            onChangeText={(text) => updateOption(questionIndex, optionIndex, 'text', text)}
            placeholder={`Option ${optionIndex + 1}`}
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
              borderRadius: 6,
              color: isDarkMode ? '#E0E0E0' : '#111827',
              marginRight: 8,
              fontFamily: 'Inter-Regular',
            }}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
          />
          {question.options.length > 2 && question.type !== 'true_false' && (
            <TouchableOpacity
              onPress={() => removeOption(questionIndex, optionIndex)}
              style={{ padding: 4 }}
            >
              <Image
                source={require('@/assets/icons/close.png')}
                style={{ width: 16, height: 16 }}
                tintColor='#EF4444'
              />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {question.type !== 'true_false' && (
        <TouchableOpacity
          onPress={() => addOption(questionIndex)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
            borderRadius: 6,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#D1D5DB',
            borderStyle: 'dashed',
          }}
        >
          <Image
            source={require('@/assets/icons/plus.png')}
            style={{ width: 16, height: 16, marginRight: 8, tintColor: '#3B82F6' }}
          />
          <Text className='font-inter_regular text-sm text-[#3B82F6]'>
            Add Option
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render image upload section
  const renderImageUploadSection = (questionIndex: number) => (
    <View style={{ marginBottom: 16 }}>
      <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
        Images (optional)
      </Text>
      
      <TouchableOpacity
        onPress={() => handleImagePick(questionIndex)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#D1D5DB',
          borderStyle: 'dashed',
          marginBottom: 12,
        }}
      >
        <Image
          source={require('@/assets/icons/upload.png')}
          style={{ width: 20, height: 20, marginRight: 8, tintColor: '#3B82F6' }}
        />
        <Text className='font-inter_regular text-sm text-[#3B82F6]'>
          Add Images
        </Text>
      </TouchableOpacity>

      {selectedImages[questionIndex] && selectedImages[questionIndex].length > 0 && (
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: 8 
        }}>
          {selectedImages[questionIndex].map((_, imageIndex) => {
            const imageUrl = getImageUrl(questionIndex, imageIndex);
            if (!imageUrl) return null;

            return (
              <View key={imageIndex} style={{ 
                position: 'relative',
                width: 80,
                height: 80,
              }}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                  }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(questionIndex, imageIndex)}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={require('@/assets/icons/close.png')}
                    style={{ width: 12, height: 12 }}
                    tintColor="white"
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // Render question
  const renderQuestion = (question: Question, index: number) => (
    <View key={index} style={{
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E5E7EB',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
          Question {index + 1}
        </Text>
        <TouchableOpacity
          onPress={() => removeQuestion(index)}
          style={{ padding: 4 }}
        >
          <Image
            source={require('@/assets/icons/delete.png')}
            style={{ width: 20, height: 20 }}
            tintColor={isDarkMode ? '#dc2626' : '#ef4444'}
          />
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
          Question Text <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          value={question.text}
          onChangeText={(text) => updateQuestion(index, 'text', text)}
          placeholder="Enter your question"
          multiline
          style={{
            backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
            borderRadius: 8,
            padding: 12,
            color: isDarkMode ? '#E0E0E0' : '#111827',
            minHeight: 80,
            textAlignVertical: 'top',
            fontFamily: 'Inter-Regular',
          }}
          placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
        />
      </View>

      {renderQuestionTypeSelector(question, index)}
      
      {question.type === 'short_answer' 
        ? renderShortAnswerOptions(question, index)
        : question.type === 'essay'
        ? (
          <View style={{ 
            marginBottom: 16,
            backgroundColor: isDarkMode ? '#7C2D12' : '#FEF3C7',
            borderRadius: 8,
            padding: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B',
          }}>
            <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              ℹ️ Essay Question - Manual Grading Required
            </Text>
            <Text className={`font-inter_regular text-xs mt-2 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
              This question will require manual grading by the teacher. Students will type their answer in a text box.
            </Text>
          </View>
        )
        : renderQuestionOptions(question, index)}
      
      {renderImageUploadSection(index)}

      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Checkbox
            value={question.isRequired}
            onValueChange={(value) => updateQuestion(index, 'isRequired', value)}
            color={question.isRequired ? '#3B82F6' : undefined}
            style={{ marginRight: 8 }}
          />
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Required
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text className={`font-inter_regular text-sm mr-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Points:
          </Text>
          <TextInput
            value={question.itemPoints.toString()}
            onChangeText={(text) => updateQuestion(index, 'itemPoints', parseInt(text) || 1)}
            keyboardType="numeric"
            style={{
              backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
              borderRadius: 4,
              padding: 8,
              color: isDarkMode ? '#E0E0E0' : '#111827',
              width: 60,
              textAlign: 'center',
              fontFamily: 'Inter-Regular',
            }}
          />
        </View>
      </View>
    </View>
  );

  // Update renderPreview to handle essay
  const renderPreview = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}>
        <Text className={`font-inter_bold text-2xl mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
          {formData.title}
        </Text>
        {formData.sectionHeader && (
          <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            {formData.sectionHeader}
          </Text>
        )}
        {formData.sectionDescription && (
          <Text className={`font-inter_regular text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            {formData.sectionDescription}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            Term: {`${formData.term === '1' ? '1st Term' : formData.term === '2' ? '2nd Term':  '3rd Term'}`}
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            Points: {calculateTotalPoints()}
          </Text>
          {formData.timeLimit && (
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Time: {formData.timeLimit} minutes
            </Text>
          )}
          {formData.shuffleQuestions && (
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Shuffled questions
            </Text>
          )}
        </View>
      </View>

      {questions.map((question, index) => (
        <View key={index} style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
        }}>
          <Text className={`font-inter_semibold text-base mb-3 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
            {index + 1}. {question.text}
          </Text>

          {selectedImages[index] && selectedImages[index].length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selectedImages[index].map((_, imgIndex) => {
                  const imageUrl = getImageUrl(index, imgIndex);
                  if (!imageUrl) return null;

                  return (
                    <Image
                      key={imgIndex}
                      source={{ uri: imageUrl }}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                      }}
                      contentFit="cover"
                    />
                  );
                })}
              </View>
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
                    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F4F6',
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
                  <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    📝 Manual grading required by teacher
                  </Text>
                </View>
              </View>
            ) : question.type === 'short_answer' ? (
              <View>
                <TextInput
                  placeholder="Your answer"
                  editable={false}
                  style={{
                    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F4F6',
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
                    <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>
                      Correct answer(s):
                    </Text>
                    {question.correctAnswers.map((ans, idx) => (
                      <Text key={idx} className={`font-inter_regular text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        • {ans}
                      </Text>
                    ))}
                    {question.caseSensitive && (
                      <Text className={`font-inter_regular text-xs mt-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        (Case sensitive)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : question.type === 'multiple_answers' ? (
              question.options.map((option, optionIndex) => (
                <View key={optionIndex} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: option.isCorrect ? (isDarkMode ? '#065F46' : '#ECFDF5') : 'transparent',
                }}>
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
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'} ${option.isCorrect ? 'font-inter_semibold' : ''}`}>
                    {option.text}
                  </Text>
                </View>
              ))
            ) : (
              question.options.map((option, optionIndex) => (
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
                    marginBottom: 8,
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
              ))
            )}
          </View>

          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Type: {question.type.replace('_', ' ')}
            </Text>
            <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Points: {question.itemPoints}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F9FAFB' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
              Create Quiz
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* AI Generate Button */}
            <TouchableOpacity
              onPress={() => {
                setAiGenerationMode(!aiGenerationMode);
                setPreviewMode(false);
                setStudentPreviewMode(false);
              }}
              style={{
                backgroundColor: aiGenerationMode ? '#10B981' : '#6B7280',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text className='font-inter_medium text-sm text-white'>
                AI Generate
              </Text>
            </TouchableOpacity>
            {/* Preview Button */}
            <TouchableOpacity
              onPress={() => {
                setPreviewMode(!previewMode);
                setAiGenerationMode(false);
                setStudentPreviewMode(false);
              }}
              style={{
                backgroundColor: previewMode ? '#6B7280' : '#10B981',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text className='font-inter_medium text-sm text-white'>
                {previewMode ? 'Edit' : 'Preview'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleStudentPreviewMode}
              style={{
                backgroundColor: studentPreviewMode ? '#6B7280' : '#3B82F6',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text className='font-inter_medium text-sm text-white'>
                {studentPreviewMode ? 'Edit' : 'View as Student'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Conditional rendering based on mode */}
      {aiGenerationMode ? renderAIGeneration() :
       studentPreviewMode ? (
        <TeacherQuizStudentPreview
          key={`student-preview-${questions.length}-${formData.title}`}
          title={formData.title}
          sectionHeader={formData.sectionHeader}
          sectionDescription={formData.sectionDescription}
          term={formData.term}
          totalPoints={calculateTotalPoints()}
          timeLimit={formData.timeLimit}
          shuffleQuestions={formData.shuffleQuestions}
          questions={studentPreviewQuestions}
          isDarkMode={isDarkMode}
          onExit={() => setStudentPreviewMode(false)}
        />
       ) :
       previewMode ? renderPreview() : (
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* Basic Quiz Information */}
          <View style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#E5E7EB',
          }}>
            <Text className={`font-inter_semibold text-lg mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
              Quiz Information
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                Quiz Title <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter quiz title"
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  fontFamily: 'Inter-Regular',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                Section Header
              </Text>
              <TextInput
                value={formData.sectionHeader}
                onChangeText={(text) => setFormData({ ...formData, sectionHeader: text })}
                placeholder="Enter section header (optional)"
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  fontFamily: 'Inter-Regular',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                Section Description
              </Text>
              <TextInput
                value={formData.sectionDescription}
                onChangeText={(text) => setFormData({ ...formData, sectionDescription: text })}
                placeholder="Enter section description (optional)"
                multiline
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter-Regular',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  Subject <Text className="text-red-500">*</Text>
                </Text>
                <Dropdown
                  data={[
                    { label: 'Select a subject', value: '' },
                    ...subjects.map((subject) => ({
                      label: `${subject.subjectName}${subject.gradeLevel ? ` - ${subject.gradeLevel}` : ''}${subject.section ? ` (${subject.section})` : ''}`,
                      value: subject._id,
                    })),
                  ]}
                  selectedValue={formData.subject}
                  onValueChange={(itemValue) => setFormData({ ...formData, subject: itemValue })}
                  placeholder="Select a subject"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  Term <Text className="text-red-500">*</Text>
                </Text>
                <RadioButtonGroup
                  value={formData.term}
                  onChange={(value) => setFormData({ ...formData, term: value })}
                  activeColor="#3B82F6"
                >
                  {terms.map(term => (
                    <RadioButton
                      key={term}
                      value={term}
                      label={`${term === '1' ? '1st Term' : term === '2'  ? '2nd Term': '3rd Term'}`}
                      labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontSize: 12, fontFamily: 'Inter-Regular' }}
                      width={24}
                      height={24}
                    />
                    
                  ))}
                </RadioButtonGroup>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                Time Limit (minutes)
              </Text>
              <TextInput
                value={formData.timeLimit}
                onChangeText={(text) => setFormData({ ...formData, timeLimit: text })}
                placeholder="Enter time limit (optional)"
                keyboardType="numeric"
                style={{
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                  borderRadius: 8,
                  padding: 12,
                  color: isDarkMode ? '#E0E0E0' : '#111827',
                  fontFamily: 'Inter-Regular',
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Checkbox
                value={formData.shuffleQuestions}
                onValueChange={(value) => setFormData({ ...formData, shuffleQuestions: value })}
                color={formData.shuffleQuestions ? '#3B82F6' : undefined}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  Shuffle questions
                </Text>
                <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                  Randomize question order for each student when they take the quiz
                </Text>
              </View>
            </View>

            {questions.length > 0 && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
              }}>
                <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  Total Points: {calculateTotalPoints()}
                </Text>
              </View>
            )}
          </View>

          {/* Questions */}
          {questions.map((question, index) => renderQuestion(question, index))}

          {/* Add Question Button */}
          {questions.length > 0 && (
            <TouchableOpacity
              onPress={addQuestion}
              style={{
                backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#3B82F6',
                borderStyle: 'dashed',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={require('@/assets/icons/plus.png')}
                style={{ width: 20, height: 20, marginRight: 8 }}
                tintColor="#3B82F6"
              />
              <Text className='font-inter_semibold text-base text-[#3B82F6]'>
                Add Question
              </Text>
            </TouchableOpacity>
          )}

          {questions.length === 0 && (
            <View style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
              borderRadius: 12,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}>
              <Image
                source={require('@/assets/images/quiz.png')}
                style={{ width: 48, height: 48, marginBottom: 16 }}
              />
              <Text className={`font-inter_regular text-base text-center mb-4 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                No questions added yet
              </Text>
              <TouchableOpacity
                onPress={addQuestion}
                style={{
                  backgroundColor: '#3B82F6',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/plus.png')}
                  style={{ width: 16, height: 16, marginRight: 8 }}
                  tintColor="white"
                />
                <Text className='font-inter_medium text-white'>
                  Add Your First Question
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
          {questions.length} question{questions.length !== 1 ? 's' : ''} • {calculateTotalPoints()} points
        </Text>
        <View style={{ flexDirection: width < 768 ? 'column' : 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(teachers)/quizzes')}
            style={{
              backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text className={`font-inter_medium text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
            ) : (
              <Image
                source={require('@/assets/icons/save.png')}
                style={{ width: 16, height: 16, marginRight: 8 }}
                tintColor="white"
              />
            )}
            <Text className='font-inter_medium text-white'>
              {loading ? 'Creating...' : 'Create Quiz'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default AddQuizWeb;