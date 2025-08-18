import React, { useEffect, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import AddEditQuizModal from '@/components/AddEditQuizModal'
import ContextMenu from '@/components/ContextMenu';
import DeleteIcon from '@/assets/icons/delete.svg';
import { useDarkMode } from '@/contexts/DarkModeContext'; 
import { StatusBar } from 'expo-status-bar';
import { FlashList } from "@shopify/flash-list";

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
  createdAt: string;
  updatedAt: string;
}

// Teacher's Quizzes Page
const QuizzesAndroid = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { isDarkMode } = useDarkMode();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  
  // Modal states
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  // Context menu states
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [contextMenuQuiz, setContextMenuQuiz] = useState<Quiz | null>(null);

  // Filter options
  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
    { label: 'Graded', value: 'graded' },
    { label: 'Closed', value: 'closed' },
  ];

  const quarterOptions = [
    { label: 'All Quarters', value: '' },
    { label: 'First Quarter', value: 'First Quarter' },
    { label: 'Second Quarter', value: 'Second Quarter' },
    { label: '3rd Quarter', value: '3rd Quarter' },
    { label: '4th Quarter', value: '4th Quarter' },
  ];

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [selectedSubject, selectedStatus, selectedQuarter]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedStatus) params.append('status', selectedStatus);
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
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleCreateQuiz = () => {
    setSelectedQuiz(null);
    setAddEditModalVisible(true);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAddEditModalVisible(true);
    setContextMenuVisible(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
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
    setContextMenuVisible(false);
  };

  const handlePublishQuiz = async (quizId: string) => {
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
    setContextMenuVisible(false);
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
    setContextMenuVisible(false);
  };

  const handlePreviewQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setPreviewModalVisible(true);
    setContextMenuVisible(false);
  };

  const openContextMenu = (e: any, quiz: Quiz) => {
    const { pageX, pageY } = e.nativeEvent;
    setContextMenuCoords({ x: pageX - 125, y: pageY - 75 });
    setContextMenuQuiz(quiz);
    setContextMenuVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6B7280';
      case 'published': return '#10B981';
      case 'archived': return '#F59E0B';
      case 'closed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      case 'archived': return 'Archived';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const contextMenuItems = [
    {
      label: 'Edit',
      icon: (
        <Image
          source={require('@/assets/icons/edit.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuQuiz && handleEditQuiz(contextMenuQuiz),
    },
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
    {
      label: 'Duplicate',
      icon: (
        <Image
          source={require('@/assets/icons/copy.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuQuiz && handleDuplicateQuiz(contextMenuQuiz._id),
    },
    ...(contextMenuQuiz?.status === 'draft' ? [{
      label: 'Publish',
      icon: (
        <Image
          source={require('@/assets/icons/plus.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor='#10B981'
        />
      ),
      onPress: () => contextMenuQuiz && handlePublishQuiz(contextMenuQuiz._id),
    }] : []),
    {
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
    },
  ];

  const renderQuizItem = ({ item }: { item: Quiz }) => (
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
      onPress={() => handlePreviewQuiz(item)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Inter-24pt-Bold',
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
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              marginBottom: 8,
            }}
          >
            {item.subject?.subjectName || 'No Subject'} • {item.quarter}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
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
                fontFamily: 'Inter-18pt-Medium' 
              }}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#9CA3AF' : '#6B7280' 
            }}>
              {item.questions.length} questions • {item.quizPoints} points
            </Text>
          </View>
          <Text style={{ 
            fontSize: 12, 
            fontFamily: 'Inter-18pt-Regular',
            color: isDarkMode ? '#9CA3AF' : '#6B7280' 
          }}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => openContextMenu(e, item)}
          style={{ padding: 8 }}
        >
          <Image
            source={require('@/assets/icons/more_vert.png')}
            style={{ width: 20, height: 20, tintColor: isDarkMode ? '#9CA3AF' : '#6B7280' }}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // VirtualizedList required functions
  const keyExtractor = (item: Quiz, index: number) => item._id;

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 24,
              fontFamily: 'Inter-24pt-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            Quizzes
          </Text>
          <TouchableOpacity
            onPress={handleCreateQuiz}
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
              style={{ width: 20, height: 20, marginRight: 8 }}
              tintColor="white"
            />
            <Text 
              className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}
            >
              Create Quiz
            </Text>
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
                marginBottom: 4 
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
                    padding: 8
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

            {/* Status Picker */}
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-18pt-Medium',
                color: isDarkMode ? '#9CA3AF' : '#6B7280', 
                marginBottom: 4 
              }}>
                Status
              </Text>
              <View style={{ 
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              }}>
                <Picker
                  selectedValue={selectedStatus}
                  onValueChange={setSelectedStatus}
                  style={{
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    backgroundColor: 'transparent',
                    fontFamily: 'Inter-18pt-Regular',
                    padding: 8
                  }}
                  dropdownIconColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                >
                  {statusOptions.map((status) => (
                    <Picker.Item
                      key={status.value}
                      label={status.label}
                      value={status.value}
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
                marginBottom: 4 
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
                    padding: 8
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
              fontFamily: 'Inter-24pt-SemiBold',
              color: isDarkMode ? '#9CA3AF' : '#6B7280', 
              marginBottom: 8 
            }}>
              No quizzes found
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-18pt-Regular',
              color: isDarkMode ? '#6B7280' : '#9CA3AF', 
              textAlign: 'center' 
            }}>
              Create your first quiz to get started
            </Text>
          </View>
        )}
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuCoords.x}
        y={contextMenuCoords.y}
        onClose={() => setContextMenuVisible(false)}
        items={contextMenuItems}
        menuStyle={{ 
          backgroundColor: isDarkMode ? '#374151' : 'white', 
          borderRadius: 8,
          minWidth: 150,
        }}
        itemStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
        labelStyle={{ 
          color: isDarkMode ? '#F9FAFB' : '#111827', 
          fontSize: 14,
          fontFamily: 'Inter-18pt-Medium',
        }}
      />

      {/* Add/Edit Quiz Modal */}
      <AddEditQuizModal
        visible={addEditModalVisible}
        onClose={() => {
          setAddEditModalVisible(false);
          setSelectedQuiz(null);
        }}
        quiz={selectedQuiz}
        subjects={subjects}
        onSave={() => {
          setAddEditModalVisible(false);
          setSelectedQuiz(null);
          fetchQuizzes();
        }}
        isDarkMode={isDarkMode}
      />

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
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
            <Text
              style={{
                fontSize: 20,
                fontFamily: 'Inter-24pt-Bold',
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
                fontFamily: 'Inter-18pt-Medium' 
              }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          
          {selectedQuiz && (
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                  flexShrink: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontFamily: 'Inter-24pt-Bold',
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
                      fontFamily: 'Inter-24pt-SemiBold',
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
                      fontFamily: 'Inter-18pt-Regular',
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
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280', 
                  }}>
                    Subject: {selectedQuiz.subject?.subjectName || 'No Subject'}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Quarter: {selectedQuiz.quarter}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-18pt-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Points: {selectedQuiz.quizPoints}
                  </Text>
                  {selectedQuiz.timeLimit && (
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-18pt-Regular',
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
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: 'Inter-24pt-SemiBold',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      marginBottom: 12,
                    }}
                  >
                    {index + 1}. {question.text}
                  </Text>

                  {question.images && question.images.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
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
                      <View
                        key={optionIndex}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 10 : 4,
                            borderWidth: 2,
                            borderColor: option.isCorrect ? '#10B981' : '#9CA3AF',
                            backgroundColor: option.isCorrect ? '#10B981' : 'transparent',
                            marginRight: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {option.isCorrect && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: question.type === 'multiple_choice' || question.type === 'true_false' ? 4 : 2,
                                backgroundColor: 'white',
                              }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: option.isCorrect ? 'Inter-24pt-SemiBold' : 'Inter-18pt-Regular',
                            color: isDarkMode ? '#E5E7EB' : '#374151',
                          }}
                        >
                          {option.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'Inter-18pt-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                    }}>
                      Type: {question.type.replace('_', ' ')}
                    </Text>
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'Inter-18pt-Regular',
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
    </View>
  );
};

export default QuizzesAndroid;