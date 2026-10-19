// quizzes.web.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import apiClient from '@/app/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import ContextMenu from '@/components/ContextMenu';
import DeleteIcon from '@/assets/icons/delete.svg';
import MoreVertIcon from '@/assets/icons/more_vert.svg';
import { useDarkMode } from '@/contexts/DarkModeContext'; 
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { RadioButton, RadioButtonGroup } from '@/components/RadioButton';
import Checkbox from 'expo-checkbox';
import Dropdown, { DropdownItem } from '@/components/Dropdown';
import NetworkBanner from '@/components/NetworkBanner.web';

cssInterop(Image, { className: "style" });

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
  type: 'multiple_choice' | 'multiple_answers' | 'true_false' | 'short_answer';
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

// Teacher's Quizzes Page
const QuizzesWeb = () => {
  document.title = 'Quizzes - GracEdLMS';
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
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
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  
  // Context menu states
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [contextMenuQuiz, setContextMenuQuiz] = useState<Quiz | null>(null);

  // Image Preview states
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Network banner state
  const [forceNetworkBannerVisible, setForceNetworkBannerVisible] = useState(false);

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

  const statusFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Graded', value: 'graded' },
    { label: 'Closed', value: 'closed' },
  ], []);

  const termFilterOptions: DropdownItem[] = useMemo(() => [
    { label: 'All Terms', value: '' },
    { label: '1st Term', value: '1' },
    { label: '2nd Term', value: '2' },
    { label: '3rd Term', value: '3' },
  ], []);

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

  // Replace the initial useEffect with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
      fetchSubjects();
    }, [selectedSubject, selectedStatus, selectedTerm, searchQuery])
  );
  
  // A cleaner pattern for both focus and state changes:
  useEffect(() => {
    fetchQuizzes();
  }, [selectedSubject, selectedStatus, selectedTerm]);

  // This ensures a refresh happens specifically when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
      fetchSubjects();
      // Optional: Return a cleanup function if needed
    }, []) 
  );

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedTerm) params.append('term', selectedTerm);
      if (searchQuery) params.append('search', searchQuery);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      setQuizzes(response.data.data || []);
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
    router.push('/(teachers)/add-quiz');
  };

  const handleEditQuiz = (quiz: Quiz) => {
    router.push({
      pathname: '/(teachers)/edit-quiz',
      params: { id: quiz._id }
    });
    setContextMenuVisible(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Do you want to delete this quiz? You can restore it later.')
      : await new Promise(resolve => {
          Alert.alert(
            'Delete Quiz',
            'Do you want to delete this quiz? You can restore it later.',
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
    setContextMenuCoords({ x: pageX, y: pageY });
    setContextMenuQuiz(quiz);
    setContextMenuVisible(true);
  };

  const handleImagePress = (imageUri: string) => {
    setSelectedPreviewImage(imageUri);
    setImagePreviewModal(true);
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

  const handleViewSubmissions = (quiz: Quiz) => {
    router.push({
      pathname: '/(teachers)/quiz/submissions/[id]',
      params: { id: quiz._id }
    });
    setContextMenuVisible(false);
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
      label: "Download PDF",
      icon: (
        <Image
          source={require("@/assets/icons/download.png")}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? "#E0E0E0" : "#333"}
        />
      ),
      onPress: () => contextMenuQuiz && handleDownloadQuizPdf(contextMenuQuiz),
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
    ...(contextMenuQuiz?.status === 'published' || contextMenuQuiz?.status === 'closed' ? [{
      label: 'View Submissions',
      icon: (
        <Image
          source={require('@/assets/icons/attach.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuQuiz && handleViewSubmissions(contextMenuQuiz),
    }] : []),
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

  const renderQuizItem = ({ item }: { item: Quiz }) => {
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
        onPress={() => handlePreviewQuiz(item)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Subject Image or Icon */}
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
                {item.subject?.subjectName || 'No Subject'} • {`${item.term === '1' ? '1st Term' : item.term === '2' ? '2nd Term' : '3rd Term'}`}
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
          <TouchableOpacity
            onPress={(e) => openContextMenu(e, item)}
            style={{ padding: 8 }}
          >
            <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ---- List header (scrolls with content) ----
  const listHeader = (
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
          {/* Subject Dropdown */}
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

          {/* Status Dropdown */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280',
              marginBottom: 4 
            }}>
              Status
            </Text>
            <Dropdown
              data={statusFilterOptions}
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              placeholder="All Statuses"
            />
          </View>

          {/* Term Dropdown */}
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 12, 
              fontFamily: 'Inter-Medium',
              color: isDarkMode ? '#E0E0E0' : '#6B7280',
              marginBottom: 4 
            }}>
              Term
            </Text>
            <Dropdown
              data={termFilterOptions}
              selectedValue={selectedTerm}
              onValueChange={setSelectedTerm}
              placeholder="All Terms"
            />
          </View>
        </View>
      </View>
    </View>
  );

  // ---- Empty state ----
  const listEmpty = (
    <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 }}>
      <Image
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
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
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
        <FlatList
          ref={listRef}
          data={displayedQuizzes}
          renderItem={renderQuizItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuCoords.x}
        y={contextMenuCoords.y}
        onClose={() => setContextMenuVisible(false)}
        items={contextMenuItems}
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

      {/* Preview Modal */}
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
                    Subject: {selectedQuiz.subject?.subjectName || 'No Subject'}
                  </Text>
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
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={{ marginLeft: 8 }}>
                    {question.type === 'short_answer' ? (
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
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default QuizzesWeb;

const handleDownloadQuizPdf = async (quiz: Quiz) => {
  try {
    if (Platform.OS !== "web") {
      Alert.alert("Unsupported", "PDF download is currently available on web only.");
      return;
    }

    const response = await apiClient.get(`/quizzes/${quiz._id}/download-pdf`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeFileName = `${quiz.title || "quiz"}`
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

    link.href = url;
    link.download = `${safeFileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading quiz PDF:", error);
    const message = "Failed to download quiz PDF";
    if (Platform.OS === "web") {
      window.alert(message);
    } else {
      Alert.alert("Error", message);
    }
  }
};