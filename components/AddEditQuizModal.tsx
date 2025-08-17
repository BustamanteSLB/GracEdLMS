import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Checkbox } from 'expo-checkbox';
import { RadioButton, RadioButtonGroup } from '@/components/RadioButton';
import apiClient from '@/app/services/apiClient';
import * as DocumentPicker from 'expo-document-picker';
import DeleteIcon from '@/assets/icons/delete.svg';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';

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
  type: 'multiple_choice' | 'multiple_answers' | 'true_false';
  options: Option[];
  images?: string[];
  itemPoints: number;
  isRequired: boolean;
  answer: string | string[] | boolean;
}

interface Quiz {
  _id: string;
  subject: Subject;
  title: string;
  sectionHeader?: string;
  sectionDescription?: string;
  questions: Question[];
  timeLimit?: number;
  quarter: string;
  quizPoints: number;
  status: 'draft' | 'published' | 'archived' | 'graded' | 'closed';
}

interface AddEditQuizModalProps {
  visible: boolean;
  onClose: () => void;
  quiz?: Quiz | null;
  subjects: Subject[];
  onSave: () => void;
  isDarkMode?: boolean;
}

const AddEditQuizModal: React.FC<AddEditQuizModalProps> = ({
  visible,
  onClose,
  quiz,
  subjects,
  onSave,
  isDarkMode = false,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    sectionHeader: '',
    sectionDescription: '',
    subject: '',
    quarter: 'First Quarter',
    timeLimit: '',
  });

  const { width } = useWindowDimensions();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{[key: number]: (File | DocumentPicker.DocumentPickerAsset)[]}>({});
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const quarters = ['First Quarter', 'Second Quarter', '3rd Quarter', '4th Quarter'];

  // AI Generation state
  const [aiGenerationMode, setAiGenerationMode] = useState(false);
  const [aiGenerationData, setAiGenerationData] = useState({
    numberOfQuestions: '10',
    questionTypes: ['multiple_choice', 'true_false'],
    difficulty: 'medium',
    selectedFile: null as File | DocumentPicker.DocumentPickerAsset | null,
  });
  const [generatingAI, setGeneratingAI] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (quiz) {
      setFormData({
        title: quiz.title,
        sectionHeader: quiz.sectionHeader || '',
        sectionDescription: quiz.sectionDescription || '',
        subject: quiz.subject._id,
        quarter: quiz.quarter,
        timeLimit: quiz.timeLimit?.toString() || '',
      });
      setQuestions(quiz.questions);
    } else {
      // Reset form for new quiz
      setFormData({
        title: '',
        sectionHeader: '',
        sectionDescription: '',
        subject: '',
        quarter: 'First Quarter',
        timeLimit: '',
      });
      setQuestions([]);
    }
    setSelectedImages({});
  }, [quiz, visible]);

  // Add new question
  const addQuestion = () => {
    const newQuestion: Question = {
      text: '',
      type: 'multiple_choice',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
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
    // Remove selected images for this question
    const updatedImages = { ...selectedImages };
    delete updatedImages[index];
    setSelectedImages(updatedImages);
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    
    // Handle type change
    if (field === 'type') {
      const question = updatedQuestions[index];
      if (value === 'true_false') {
        question.options = [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: false },
        ];
      } else if (value === 'multiple_choice' || value === 'multiple_answers') {
        if (question.options.length < 2) {
          question.options = [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ];
        }
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

    // Update answer based on correct options
    const question = updatedQuestions[questionIndex];
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      if (field === 'isCorrect' && value) {
        // For single answer, uncheck other options
        question.options.forEach((opt, idx) => {
          if (idx !== optionIndex) opt.isCorrect = false;
        });
        question.answer = question.options[optionIndex].text;
      } else if (field === 'isCorrect' && !value) {
        question.answer = '';
      }
    } else if (question.type === 'multiple_answers') {
      // For multiple answers, collect all correct options
      const correctOptions = question.options
        .filter(opt => opt.isCorrect)
        .map(opt => opt.text);
      question.answer = correctOptions;
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

  // Remove image
  const removeImage = (questionIndex: number, imageIndex: number) => {
    setSelectedImages(prev => ({
      ...prev,
      [questionIndex]: (prev[questionIndex] || []).filter((_, i) => i !== imageIndex)
    }));
  };

  // Calculate total points
  const calculateTotalPoints = () => {
    return questions.reduce((total, question) => total + question.itemPoints, 0);
  };

  // Enhanced validation with detailed logging
  const validateForm = () => {
    console.log('Validating form...');
    console.log('Form data:', formData);
    console.log('Questions:', questions);

    if (!formData.title.trim()) {
      const message = 'Please enter a quiz title';
      console.log('Validation failed:', message);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }
    
    if (!formData.subject) {
      const message = 'Please select a subject';
      console.log('Validation failed:', message);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }
    
    if (questions.length === 0) {
      const message = 'Please add at least one question';
      console.log('Validation failed:', message);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return false;
    }
    
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.text.trim()) {
        const message = `Question ${i + 1} is missing text`;
        console.log('Validation failed:', message);
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
        return false;
      }
      
      const validOptions = question.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        const message = `Question ${i + 1} needs at least 2 options with text`;
        console.log('Validation failed:', message);
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
        return false;
      }
      
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        const message = `Question ${i + 1} needs at least one correct answer`;
        console.log('Validation failed:', message);
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
        return false;
      }
    }
    
    console.log('Form validation passed');
    return true;
  };

  // Enhanced save function with better error handling
  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('Current loading state:', loading);
    
    if (loading) {
      console.log('Already loading, ignoring click');
      return;
    }

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Starting save process...');
    setLoading(true);

    try {
      // Clean up questions before sending
      const cleanedQuestions = questions.map(question => ({
        ...question,
        options: question.options.filter(opt => opt.text.trim() !== ''), // Remove empty options
        images: selectedImages[questions.indexOf(question)] ? 
          selectedImages[questions.indexOf(question)].map(file => file.name) : 
          (question.images || [])
      }));

      console.log('Cleaned questions:', cleanedQuestions);

      // Create form data
      const formDataToSend = new FormData();
      
      // Add basic form data
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('sectionHeader', formData.sectionHeader.trim());
      formDataToSend.append('sectionDescription', formData.sectionDescription.trim());
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('quarter', formData.quarter);
      
      if (formData.timeLimit && formData.timeLimit.trim()) {
        formDataToSend.append('timeLimit', formData.timeLimit.trim());
      }

      formDataToSend.append('questions', JSON.stringify(cleanedQuestions));

      // Add image files
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

      console.log('Form data prepared');

      // Determine URL and method
      const url = quiz ? `/quizzes/${quiz._id}` : '/quizzes';
      const method = quiz ? 'put' : 'post';

      console.log(`Making ${method.toUpperCase()} request to ${url}`);

      // Make API request
      const response = await apiClient[method](url, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('API response:', response.data);

      const message = quiz ? 'Quiz updated successfully' : 'Quiz created successfully';
      
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Success', message);
      }

      console.log('Calling onSave callback');
      onSave();

    } catch (error: any) {
      console.error('Error saving quiz:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to save quiz';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  // Handle AI file selection
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

  // Handle AI quiz generation
  const handleAIGeneration = async () => {
    if (!aiGenerationData.selectedFile || !formData.subject) {
      const message = 'Please select a file and subject before generating AI quiz';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
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
      formDataToSend.append('quarter', formData.quarter);
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
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        title: response.data.data.title,
      }));

      // Switch back to edit mode
      setAiGenerationMode(false);

      const message = response.data.message || 'AI quiz generated successfully!';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Success', message);
      }

    } catch (error: any) {
      console.error('Error generating AI quiz:', error);
      let errorMessage = 'Failed to generate AI quiz';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setGeneratingAI(false);
    }
  };

  // Render AI generation interface
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
            Upload Document *
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
              style={{ width: 24, height: 24, marginRight: 12, tintColor: '#3B82F6' }}
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
          </TouchableOpacity>
        </View>

        {/* Number of Questions */}
        <View style={{ marginBottom: 16 }}>
          <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
            Number of Questions
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
              fontFamily: 'Inter-18pt-Regular',
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
              { value: 'multiple_answers', label: 'Multiple Answers' }
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
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
            />
            <RadioButton 
              value="medium" 
              label="Medium"
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
            />
            <RadioButton 
              value="hard" 
              label="Hard"
              labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
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
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
        />
        <RadioButton 
          value="multiple_answers" 
          label="Multiple Choice (Multiple Answers)"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
        />
        <RadioButton 
          value="true_false" 
          label="True/False"
          labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontFamily: 'Inter-18pt-Regular' }}
        />
      </RadioButtonGroup>
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
          backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
          borderRadius: 8,
          padding: 12,
        }}>
          {question.type === 'multiple_answers' ? (
            <Checkbox
              value={option.isCorrect}
              onValueChange={(value) => updateOption(questionIndex, optionIndex, 'isCorrect', value)}
              color={option.isCorrect ? '#3B82F6' : undefined}
              style={{ marginRight: 12 }}
            />
          ) : (
            <RadioButton
              value={optionIndex}
              selected={option.isCorrect}
              onPress={() => updateOption(questionIndex, optionIndex, 'isCorrect', !option.isCorrect)}
              activeColor="#3B82F6"
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
              fontFamily: 'Inter-18pt-Regular',
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
                style={{ width: 16, height: 16, tintColor: '#EF4444' }}
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

  // Render question item
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
          <DeleteIcon width={20} height={20} fill={isDarkMode ? '#dc2626' : '#ef4444'}/>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
          Question Text *
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
            fontFamily: 'Inter-18pt-Regular',
          }}
          placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
        />
      </View>

      {renderQuestionTypeSelector(question, index)}
      {renderQuestionOptions(question, index)}

      {/* Image upload */}
      <View style={{ marginBottom: 16 }}>
        <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
          Images (Optional)
        </Text>
        <TouchableOpacity
          onPress={() => handleImagePick(index)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#D1D5DB',
            borderStyle: 'dashed',
          }}
        >
          <Image
            source={require('@/assets/icons/image.png')}
            style={{ width: 20, height: 20, marginRight: 8, tintColor: '#3B82F6' }}
          />
          <Text className='font-inter_regular text-sm text-[#3B82F6]'>
            Add Images
          </Text>
        </TouchableOpacity>
        
        {selectedImages[index] && selectedImages[index].length > 0 && (
          <View style={{ marginTop: 8 }}>
            {selectedImages[index].map((image, imgIndex) => (
              <View key={imgIndex} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 8,
                backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB',
                borderRadius: 6,
                marginBottom: 4,
              }}>
                <Image
                  source={{ uri: Platform.OS === 'web' ? URL.createObjectURL(image as File) : (image as DocumentPicker.DocumentPickerAsset).uri }}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 4,
                    marginRight: 8,
                    backgroundColor: isDarkMode ? '#333333' : '#E5E7EB',
                  }}
                  contentFit='cover'
                />
                <Text className={`font-inter_regular text-xs flex-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                  {image.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeImage(index, imgIndex)}
                  style={{ padding: 4 }}
                >
                  <Image
                    source={require('@/assets/icons/close.png')}
                    style={{ width: 12, height: 12 }}
                    tintColor={isDarkMode ? '#dc2626' : '#ef4444'}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Question settings */}
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
              fontFamily: 'Inter-18pt-Regular',
            }}
          />
        </View>
      </View>
    </View>
  );

  // Render preview
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
            Quarter: {formData.quarter}
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            Points: {calculateTotalPoints()}
          </Text>
          {formData.timeLimit && (
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Time: {formData.timeLimit} minutes
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
              {selectedImages[index].map((image, imgIndex) => (
                <View key={imgIndex} style={{ marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const imageUri = Platform.OS === 'web' 
                        ? URL.createObjectURL(image as File) 
                        : (image as DocumentPicker.DocumentPickerAsset).uri;
                      handleImagePress(imageUri);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ 
                        uri: Platform.OS === 'web' 
                          ? URL.createObjectURL(image as File) 
                          : (image as DocumentPicker.DocumentPickerAsset).uri 
                      }}
                      style={{
                        width: '100%',
                        height: 200,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? '#333333' : '#E5E7EB',
                      }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text className={`font-inter_regular text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                    {image.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ marginLeft: 8 }}>
            {question.options.map((option, optionIndex) => (
              <View key={optionIndex} style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 10 : 4,
                  borderWidth: 2,
                  borderColor: option.isCorrect ? '#10B981' : '#9CA3AF',
                  backgroundColor: option.isCorrect ? '#10B981' : 'transparent',
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {option.isCorrect && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 4 : 2,
                      backgroundColor: 'white',
                    }} />
                  )}
                </View>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'} ${option.isCorrect ? 'font-inter_semibold' : ''}`}>
                  {option.text}
                </Text>
              </View>
            ))}
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

  // Add this function to handle image press
  const handleImagePress = (imageUri: string) => {
    setSelectedPreviewImage(imageUri);
    setImagePreviewModal(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F9FAFB' }}>
        {/* Header */}
        <View style={{
          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text className={`font-inter_bold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}>
              {quiz ? 'Edit Quiz' : 'Create Quiz'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!quiz && (
                <TouchableOpacity
                  onPress={() => {
                    setAiGenerationMode(!aiGenerationMode);
                    setPreviewMode(false);
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
              )}
              <TouchableOpacity
                onPress={() => {
                  setPreviewMode(!previewMode);
                  setAiGenerationMode(false);
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
                onPress={onClose}
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text className='font-inter_medium text-sm text-white'>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {aiGenerationMode ? renderAIGeneration() : 
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
                  Quiz Title *
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
                    fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Regular',
                  }}
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                    Subject *
                  </Text>
                  <View style={{ 
                    backgroundColor: isDarkMode ? '#2A2A2A' : '#F9FAFB', 
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#333333' : '#D1D5DB',
                  }}>
                    <Picker
                      selectedValue={formData.subject}
                      onValueChange={(itemValue) => setFormData({ ...formData, subject: itemValue })}
                      style={{
                        color: isDarkMode ? '#E0E0E0' : '#111827',
                        backgroundColor: 'transparent',
                        fontFamily: 'Inter-18pt-Regular',
                        padding: 8
                      }}
                      dropdownIconColor={isDarkMode ? '#E0E0E0' : '#6B7280'}
                    >
                      <Picker.Item 
                        label="Select a subject" 
                        value="" 
                        color={isDarkMode ? '#9ca3af' : '#6B7280'}
                      />
                      {subjects.map((subject) => (
                        <Picker.Item
                          key={subject._id}
                          label={`${subject.subjectName}${subject.gradeLevel ? ` - ${subject.gradeLevel}` : ''}${subject.section ? ` (${subject.section})` : ''}`}
                          value={subject._id}
                          color={isDarkMode ? '#E0E0E0' : '#111827'}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text className={`font-inter_semibold text-sm mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#374151]'}`}>
                    Quarter *
                  </Text>
                  <RadioButtonGroup
                    value={formData.quarter}
                    onChange={(value) => setFormData({ ...formData, quarter: value })}
                    activeColor="#3B82F6"
                  >
                    {quarters.map(quarter => (
                      <RadioButton
                        key={quarter}
                        value={quarter}
                        label={quarter}
                        labelStyle={{ color: isDarkMode ? '#E0E0E0' : '#374151', fontSize: 12, fontFamily: 'Inter-18pt-Regular' }}
                        width={16}
                        height={16}
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
                    fontFamily: 'Inter-18pt-Regular',
                  }}
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6B7280'}
                />
              </View>

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
                <TouchableOpacity
                  onPress={addQuestion}
                  style={{
                    backgroundColor: '#3B82F6',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
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
                    Add Question
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Questions */}
            {questions.map((question, index) => renderQuestion(question, index))}

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
              onPress={onClose}
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
                {loading ? 'Saving...' : quiz ? 'Update Quiz' : 'Create Quiz'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
                    width: width - 40,
                    height: '80%',
                    borderRadius: 12,
                  }}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default AddEditQuizModal;