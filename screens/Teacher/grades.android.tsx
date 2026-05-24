import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, Pressable } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { FlashList } from '@shopify/flash-list';
import DropdownMobile, { DropdownMobileItem } from '@/components/DropdownMobile'
import MoreVertIcon from '@/assets/icons/more_vert.svg'
import DeleteIcon from '@/assets/icons/delete.svg'

cssInterop(Image, { className: "style" });

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
}

interface Subject {
  _id: string;
  subjectId: string;
  subjectName: string;
  subjectDescription?: string;
  subjectImage?: string;
  teachers: Array<{
    teacher: User;
    quarters: {
      firstQuarter: boolean;
      secondQuarter: boolean;
      thirdQuarter: boolean;
      fourthQuarter: boolean;
    };
    isAssignedToAllQuarters: boolean;
  }>;
  section: string;
  gradeLevel?: string;
  schoolYear?: string;
  status: 'active' | 'inactive' | 'archived';
  students: (User[] | string[]);
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  quarter: string;
  activityType?: 'written' | 'performance';
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  createdAt: string;
  updatedAt: string;
  includeInFinalGrade?: boolean;
}

interface Grade {
  _id: string;
  student: User;
  activity: Activity;
  subject: Subject;
  score: number;
  bonusPoints?: number;
  gradedBy: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuizSubmission {
  _id: string;
  student: User;
  submissionDate: string;
  submittedAnswers: any[];
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
  questions: any[];
  timeLimit?: number;
  quarter: string;
  quizPoints: number;
  status: 'draft' | 'published' | 'archived' | 'graded' | 'closed';
  quizSubmissions: QuizSubmission[];
  createdAt: string;
  updatedAt: string;
}

interface GradeItem {
  _id: string;
  title: string;
  type: 'activity' | 'quiz';
  points: number;
  quarter: string;
  subject: Subject;
  createdAt: string;
  data: Activity | Quiz;
}

interface StudentGradeRow {
  student: User;
  items: { [itemId: string]: Grade | QuizSubmission | null };
  total: number;
  percentage: number;
}

// Helper function to export grades to CSV
const exportGradesToCSV = async (
  subjectName: string,
  gradeLevel: string,
  section: string,
  schoolYear: string,
  quarter: string,
  gradeItems: GradeItem[],
  gradeTableData: StudentGradeRow[],
  getUserFullName: (user: User) => string
) => {
  try {
    const headers = [
      'Student Name',
      ...gradeItems.map(item => `${item.title} (${item.type === 'activity' ? 'Activity' : 'Quiz'} - ${item.points} pts)`),
      'Total Score',
      'Total Percentage (%)'
    ];

    const rows = gradeTableData.map(row => {
      const studentName = getUserFullName(row.student);
      const scores = gradeItems.map(item => {
        const itemData = row.items[item._id];
        if (itemData) {
          if (item.type === 'activity' && 'score' in itemData) {
            return itemData.score.toString();
          } else if (item.type === 'quiz' && 'quizScore' in itemData) {
            return itemData.quizScore?.toString() || '-';
          }
        }
        return '-';
      });

      return [
        studentName,
        ...scores,
        row.total.toString(),
        `${row.percentage.toFixed(2)}%`
      ];
    });

    const csvContent = [
      [`Subject: ${subjectName}`],
      [`Grade Level: ${gradeLevel} - ${section}`],
      [`School Year: ${schoolYear}`],
      [`Quarter: ${quarter}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      headers,
      ...rows
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const fileName = `${subjectName.replace(/\s+/g, '_')}_${quarter.replace(/\s+/g, '_')}_Grades_${new Date().getTime()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Grades',
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    Alert.alert('Error', 'Failed to export grades. Please try again.');
    return false;
  }
};

const GradesAndroid: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('First Quarter');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [actionsModalSubject, setActionsModalSubject] = useState<Subject | null>(null);

  const quarters = ['First Quarter', 'Second Quarter', '3rd Quarter', '4th Quarter'];

  const fetchTeacherData = async () => {
    if (!user || user.role !== 'Teacher') {
      setError('Unauthorized: Teacher access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
      const teacherSubjects = allSubjects.filter((subject: Subject) => {
        if (!subject.teachers || !Array.isArray(subject.teachers)) {
          return false;
        }
        return subject.teachers.some((ta: any) => 
          ta.teacher?._id === user._id || 
          ta.teacher?.email === user.email ||
          ta.teacher?.username === user.username
        );
      });

      if (teacherSubjects.length === 0) {
        setSubjects([]);
        setActivities([]);
        setGrades([]);
        setQuizzes([]);
        setLoading(false);
        return;
      }

      const populatedSubjects: Subject[] = [];
      for (const subject of teacherSubjects) {
        try {
          const subjectResponse = await apiClient.get(`/subjects/${subject._id}`);
          if (subjectResponse.data && subjectResponse.data.data) {
            populatedSubjects.push(subjectResponse.data.data);
          }
        } catch (error) {
          console.warn(`Failed to fetch populated subject ${subject._id}`);
        }
      }
      setSubjects(populatedSubjects);

      try {
        let allStudentsData: User[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const studentsResponse = await apiClient.get(`/users?role=Student&status=active&page=${page}&limit=100`);
          const students = studentsResponse.data.data || [];
          
          if (students.length === 0) {
            hasMore = false;
          } else {
            allStudentsData = [...allStudentsData, ...students];
            page++;
          }
        }

        setAllStudents(allStudentsData);
      } catch (error) {
        console.warn('Could not fetch all students');
      }

      const teacherActivities: Activity[] = [];
      for (const subject of teacherSubjects) {
        try {
          const activitiesResponse = await apiClient.get(`/subjects/${subject._id}/activities`);
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            const activitiesWithSubject = activitiesResponse.data.data.map((activity: Activity) => ({
              ...activity,
              subject: subject,
              quarter: activity.quarter || 'First Quarter',
            }));
            teacherActivities.push(...activitiesWithSubject);
          }
        } catch (error) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}`);
        }
      }
      
      setActivities(teacherActivities);

      const teacherGrades: Grade[] = [];
      for (const activity of teacherActivities) {
        try {
          const gradesResponse = await apiClient.get(`/activities/${activity._id}/grades`);
          if (gradesResponse.data.success && gradesResponse.data.data) {
            const gradesWithActivity = gradesResponse.data.data.map((grade: any) => ({
              ...grade,
              activity: activity
            }));
            teacherGrades.push(...gradesWithActivity);
          }
        } catch (error) {
          console.warn(`Failed to fetch grades for activity ${activity.title}`);
        }
      }
      setGrades(teacherGrades);

      const teacherQuizzes: Quiz[] = [];
      for (const subject of teacherSubjects) {
        try {
          const quizzesResponse = await apiClient.get(`/quizzes?subject=${subject._id}`);
          if (quizzesResponse.data.success && quizzesResponse.data.data) {
            const detailedQuizzes = await Promise.all(
              quizzesResponse.data.data.map(async (quiz: Quiz) => {
                try {
                  const detailedQuizResponse = await apiClient.get(`/quizzes/${quiz._id}`);
                  if (detailedQuizResponse.data.success) {
                    return {
                      ...detailedQuizResponse.data.data,
                      subject: subject
                    };
                  }
                  return {
                    ...quiz,
                    subject: subject,
                    quizSubmissions: []
                  };
                } catch (error) {
                  console.warn(`Failed to fetch detailed quiz data for ${quiz.title}`);
                  return {
                    ...quiz,
                    subject: subject,
                    quizSubmissions: []
                  };
                }
              })
            );
            teacherQuizzes.push(...detailedQuizzes);
          }
        } catch (error) {
          console.warn(`Failed to fetch quizzes for subject ${subject.subjectName}`);
        }
      }
      setQuizzes(teacherQuizzes);

    } catch (err: any) {
      console.error('Error fetching teacher data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.lastName}, ${user.firstName} ${user.middleName}`
      : `${user.lastName}, ${user.firstName}`;
  };

  const schoolYearFilterOptions: DropdownMobileItem[] = useMemo(() => {
    const uniqueSchoolYears = Array.from(
      new Set(subjects.map(s => s.schoolYear).filter(Boolean))
    ).sort((a, b) => b!.localeCompare(a!));

    const options: DropdownMobileItem[] = [
      { label: 'All School Years', value: '' }
    ];

    uniqueSchoolYears.forEach(year => {
      options.push({
        label: `S.Y. ${year}`,
        value: year as string
      });
    });

    return options;
  }, [subjects]);

  const currentSubject = useMemo(() => {
    if (!selectedSubject) return null;
    return subjects.find(s => s._id === selectedSubject) || null;
  }, [selectedSubject, subjects]);

  const getGradeItems = useMemo(() => {
    if (!currentSubject) return [];

    const items: GradeItem[] = [];

    activities
      .filter(activity => {
        const matchesSubject = activity.subject._id === currentSubject._id;
        const matchesQuarter = activity.quarter === selectedQuarter;
        return matchesSubject && matchesQuarter;
      })
      .forEach(activity => {
        items.push({
          _id: activity._id,
          title: activity.title,
          type: 'activity',
          points: activity.points || 0,
          quarter: activity.quarter,
          subject: activity.subject,
          createdAt: activity.createdAt,
          data: activity
        });
      });

    quizzes
      .filter(quiz => {
        const matchesSubject = quiz.subject._id === currentSubject._id;
        const matchesQuarter = quiz.quarter === selectedQuarter;
        const isGradeable = quiz.status === 'published' || quiz.status === 'graded' || quiz.status === 'closed';
        return matchesSubject && matchesQuarter && isGradeable;
      })
      .forEach(quiz => {
        items.push({
          _id: quiz._id,
          title: quiz.title,
          type: 'quiz',
          points: quiz.quizPoints || 0,
          quarter: quiz.quarter,
          subject: quiz.subject,
          createdAt: quiz.createdAt,
          data: quiz
        });
      });

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [activities, quizzes, currentSubject, selectedQuarter]);

  const subjectStudents = useMemo(() => {
    if (!currentSubject) return [];
    
    let students: User[] = [];
    if (currentSubject.students && currentSubject.students.length > 0) {
      if (typeof currentSubject.students[0] === 'object' && currentSubject.students[0] !== null && 'firstName' in currentSubject.students[0]) {
        students = currentSubject.students as User[];
      } else {
        const studentIds = currentSubject.students as string[];
        students = allStudents.filter(s => studentIds.includes(s._id));
      }
    }
    
    return students.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
  }, [currentSubject, allStudents]);

  const gradeTableData = useMemo((): StudentGradeRow[] => {
    if (!currentSubject || getGradeItems.length === 0 || subjectStudents.length === 0) {
      return [];
    }

    return subjectStudents.map(student => {
      const items: { [itemId: string]: Grade | QuizSubmission | null } = {};
      let total = 0;
      let maxTotal = 0;

      getGradeItems.forEach(item => {
        if (item.type === 'activity') {
          const grade = grades.find(g => 
            g.student._id === student._id && 
            g.activity._id === item._id
          );
          
          items[item._id] = grade || null;
          
          if (grade) {
            total += grade.score;
          }
          
          if (item.points) {
            maxTotal += item.points;
          }
        } else if (item.type === 'quiz') {
          const quiz = item.data as Quiz;
          const submission = quiz.quizSubmissions?.find(sub => {
            const studentMatch = typeof sub.student === 'object' 
              ? sub.student._id === student._id 
              : sub.student === student._id;
            const statusMatch = sub.status === 'graded' || sub.status === 'submitted';
            return studentMatch && statusMatch;
          });
          
          items[item._id] = submission || null;
          
          if (submission && submission.quizScore !== undefined && submission.quizScore !== null) {
            total += submission.quizScore;
          }
          
          if (item.points) {
            maxTotal += item.points;
          }
        }
      });

      const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

      return {
        student,
        items,
        total,
        percentage
      };
    });
  }, [currentSubject, subjectStudents, getGradeItems, grades, quizzes]);

  const filteredSubjectOptions = useMemo(() => {
    return subjects.filter(subject => {
      const matchesSearch = !searchQuery || 
        subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSchoolYear = !selectedSchoolYear || subject.schoolYear === selectedSchoolYear;
      
      return matchesSearch && matchesSchoolYear;
    });
  }, [subjects, searchQuery, selectedSchoolYear]);

  const handleViewGrades = (subject: Subject) => {
    setSelectedSubject(subject._id);
    setPreviewModalVisible(true);
  };

  const handleExportCSV = async () => {
    if (!currentSubject || gradeTableData.length === 0) {
      Alert.alert('No Data', 'No data to export. Please select a subject with students and grades.');
      return;
    }

    const success = await exportGradesToCSV(
      currentSubject.subjectName,
      currentSubject.gradeLevel || 'N/A',
      currentSubject.section,
      currentSubject.schoolYear || 'N/A',
      selectedQuarter,
      getGradeItems,
      gradeTableData,
      getUserFullName
    );

    if (success) {
      Alert.alert('Success', 'Grades exported successfully!');
    }
  };

  const openActionsMenu = (subject: Subject) => {
    setActionsModalSubject(subject);
    setActionsModalVisible(true);
  };

  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };

  const renderSubjectItem = useCallback(({ item }: { item: Subject }) => {
    const activitiesCount = activities.filter(a => a.subject._id === item._id && a.quarter === selectedQuarter).length;
    const quizzesCount = quizzes.filter(q => q.subject._id === item._id && q.quarter === selectedQuarter).length;
    const totalItems = activitiesCount + quizzesCount;
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const bgColor = getConsistentColor(item.subjectName);

    return (
      <TouchableOpacity
        onPress={() => handleViewGrades(item)}
        className={`rounded-xl p-4 mb-3 ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}
        style={{
          borderWidth: 1,
          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
        activeOpacity={0.8}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-start flex-1">
            {item.subjectImage ? (
              <Image
                source={{ uri: item.subjectImage }}
                className="w-12 h-12 rounded-lg"
                contentFit="cover"
              />
            ) : (
              <View
                className="w-12 h-12 rounded-lg justify-center items-center"
                style={{ backgroundColor: bgColor }}
              >
                <Text className="text-white font-inter_bold text-lg">{initials}</Text>
              </View>
            )}

            <View className="flex-1 ml-3">
              <Text
                className={`font-inter_bold text-lg mb-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                numberOfLines={2}
              >
                {item.subjectName}
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#9CA3AF]' : 'text-gray-600'}`}>
                {item.gradeLevel} - {item.section} • S.Y. {item.schoolYear}
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                {totalItems} items ({activitiesCount} activities, {quizzesCount} quizzes)
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => openActionsMenu(item)}
            style={{ padding: 8 }}
          >
            <MoreVertIcon width={20} height={20} fill={isDarkMode ? '#E0E0E0' : 'black'} />
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  }, [isDarkMode, activities, quizzes, selectedQuarter]);

  const keyExtractor = useCallback((item: Subject) => item._id, []);

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F1F3F4]'}`} edges={['left', 'right']}>
      <View className="flex-1">
        {/* Header */}
        <View
          className={`px-5 pt-5 pb-4 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
          }}
        >
          <View className="flex-row justify-between items-center">
            <Text
              className={`font-inter_bold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              Student Grades
            </Text>
            <TouchableOpacity
              onPress={fetchTeacherData}
              className="bg-[#EF4444] px-2 py-2 rounded-lg"
            >
              <Image
                source={require('@/assets/icons/refresh.png')}
                className="w-[24] h-[24]"
                tintColor="white"
              />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View className="mt-4">
            <TextInput
              placeholder="Search subjects..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`rounded-lg px-3 py-3 mb-3 font-inter_regular ${
                isDarkMode ? 'bg-[#2A2A2A] text-[#E0E0E0]' : 'bg-[#F3F4F6] text-black'
              }`}
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            />

            <DropdownMobile
              label="School Year"
              selectedValue={selectedSchoolYear}
              onValueChange={setSelectedSchoolYear}
              items={schoolYearFilterOptions}
              placeholder="All School Years"
            />
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 p-5">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading grades...
              </Text>
            </View>
          ) : filteredSubjectOptions.length > 0 ? (
            <FlashList
              data={filteredSubjectOptions}
              renderItem={renderSubjectItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Image
                source={require('@/assets/images/score.png')}
                className="w-16 h-16 mb-4"
              />
              <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                No subjects found
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} text-center`}>
                You don't have any assigned subjects yet
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions Modal */}
      <Modal
        visible={actionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionsModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Pressable
            className="flex-1 justify-center items-center bg-black/50"
            onPress={() => setActionsModalVisible(false)}
          >
            <Pressable
              className={`w-4/5 max-w-md rounded-xl p-4 ${isDarkMode ? 'bg-[#242526]' : 'bg-white'}`}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                className={`font-inter_bold text-lg mb-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              >
                Subject Actions
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (actionsModalSubject) {
                    handleViewGrades(actionsModalSubject);
                    setActionsModalVisible(false);
                  }
                }}
                className={`flex-row items-center p-3 rounded-lg mb-2 ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-[#F0F2F5]'}`}
              >
                <Image
                  source={require('@/assets/icons/show_password.png')}
                  className="w-6 h-6 mr-3"
                  tintColor={isDarkMode ? '#E0E0E0' : '#333'}
                />
                <Text className={`font-inter_regular text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  View Grades
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActionsModalVisible(false)}
                className={`p-3 rounded-lg items-center ${isDarkMode ? 'bg-[#3A3B3C]' : 'bg-[#F0F2F5]'}`}
              >
                <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
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
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View className={`flex-1 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F9FAFB]'}`}>
          <View
            className={`px-5 py-4 ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
            }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className={`font-inter_bold text-xl flex-1 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`} numberOfLines={1}>
                Grades - {currentSubject?.subjectName}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleExportCSV}
                className="bg-[#10B981] px-3 py-2 rounded-lg flex-row items-center flex-1"
              >
                <Image
                  source={require('@/assets/icons/export_csv.png')}
                  className="w-5 h-5 mr-2"
                  tintColor="white"
                />
                <Text className="text-white font-inter_medium text-sm">Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreviewModalVisible(false)}
                className="bg-[#EF4444] px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-inter_medium text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {currentSubject && (
            <View className="flex-1">
              <View
                className={`p-5 ${isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'}`}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                }}
              >
                <Text className={`font-inter_bold text-2xl mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {currentSubject.subjectName}
                </Text>
                <Text className={`font-inter_regular text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentSubject.gradeLevel} - {currentSubject.section} • S.Y. {currentSubject.schoolYear}
                </Text>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  <View className="flex-row gap-2">
                    {quarters.map((quarter) => {
                      const isActive = quarter === selectedQuarter;
                      return (
                        <TouchableOpacity
                          key={quarter}
                          onPress={() => setSelectedQuarter(quarter)}
                          className={`px-4 py-2 rounded-full ${
                            isActive 
                              ? 'bg-[#3B82F6]' 
                              : isDarkMode ? 'bg-[#374151]' : 'bg-[#F3F4F6]'
                          }`}
                        >
                          <Text
                            className={`font-inter_medium text-sm ${
                              isActive 
                                ? 'text-white' 
                                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {quarter}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View className="flex-row gap-4">
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Items: {getGradeItems.length}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Students: {subjectStudents.length}
                  </Text>
                </View>
              </View>

              {getGradeItems.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <Image
                    source={require('@/assets/images/no_results.png')}
                    className="w-25 h-25 opacity-50"
                  />
                  <Text className={`font-inter_regular mt-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No activities or quizzes found for {selectedQuarter}
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                >
                  <ScrollView 
                    showsVerticalScrollIndicator={true}
                  >
                    <View className="p-5">
                      <View
                        className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
                        style={{
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                        }}
                      >
                        <View 
                          className={`flex-row ${isDarkMode ? 'bg-[#374151]' : 'bg-[#F3F4F6]'}`}
                          style={{
                            borderBottomWidth: 2,
                            borderBottomColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                          }}
                        >
                          <View 
                            className="py-3 px-4"
                            style={{ 
                              width: 250,
                              borderRightWidth: 1,
                              borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB'
                            }}
                          >
                            <Text className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                              Student Name
                            </Text>
                          </View>
                          {getGradeItems.map((item) => (
                            <View 
                              key={item._id}
                              className="py-3 px-3 items-center"
                              style={{ 
                                width: 150,
                                borderRightWidth: 1,
                                borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB'
                              }}
                            >
                              <Text 
                                className={`font-inter_bold text-sm text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                                numberOfLines={2}
                              >
                                {item.title}
                              </Text>
                              <Text className={`font-inter_regular text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.type === 'activity' ? 'Activity' : 'Quiz'} ({item.points} pts)
                              </Text>
                            </View>
                          ))}
                          <View 
                            className="py-3 px-3 items-center"
                            style={{ 
                              width: 100,
                              borderRightWidth: 1,
                              borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB'
                            }}
                          >
                            <Text className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                              Total
                            </Text>
                          </View>
                          <View className="py-3 px-3 items-center" style={{ width: 100 }}>
                            <Text className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                              Total %
                            </Text>
                          </View>
                        </View>

                        {gradeTableData.map((row, rowIndex) => (
                          <View 
                            key={row.student._id}
                            className={`flex-row ${
                              rowIndex % 2 === 0 
                                ? isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white'
                                : isDarkMode ? 'bg-[#252525]' : 'bg-[#F9FAFB]'
                            }`}
                            style={{
                              borderBottomWidth: rowIndex < gradeTableData.length - 1 ? 1 : 0,
                              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                            }}
                          >
                            <View 
                              className="py-3 px-4"
                              style={{ 
                                width: 250,
                                borderRightWidth: 1,
                                borderRightColor: isDarkMode ? '#333333' : '#E5E7EB'
                              }}
                            >
                              <Text 
                                className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                                numberOfLines={1}
                              >
                                {getUserFullName(row.student)}
                              </Text>
                            </View>
                            {getGradeItems.map((item) => {
                              const itemData = row.items[item._id];
                              let score = '-';
                              let textColor = isDarkMode ? '#9CA3AF' : '#6B7280';

                              if (itemData) {
                                if (item.type === 'activity' && 'score' in itemData) {
                                  score = itemData.score.toString();
                                  textColor = isDarkMode ? '#E0E0E0' : '#111827';
                                } else if (item.type === 'quiz' && 'quizScore' in itemData) {
                                  score = itemData.quizScore?.toString() || '-';
                                  textColor = isDarkMode ? '#E0E0E0' : '#111827';
                                }
                              }

                              return (
                                <View 
                                  key={item._id}
                                  className="py-3 px-3 items-center"
                                  style={{ 
                                    width: 150,
                                    borderRightWidth: 1,
                                    borderRightColor: isDarkMode ? '#333333' : '#E5E7EB'
                                  }}
                                >
                                  <Text 
                                    className="font-inter_regular text-sm"
                                    style={{ color: textColor }}
                                  >
                                    {score}
                                  </Text>
                                </View>
                              );
                            })}
                            <View 
                              className="py-3 px-3 items-center"
                              style={{ 
                                width: 100,
                                borderRightWidth: 1,
                                borderRightColor: isDarkMode ? '#333333' : '#E5E7EB'
                              }}
                            >
                              <Text 
                                className="font-inter_bold text-sm"
                                style={{ 
                                  color: row.percentage >= 75 ? '#10B981' : 
                                        row.percentage >= 50 ? '#F59E0B' : '#EF4444'
                                }}
                              >
                                {row.total}
                              </Text>
                            </View>
                            <View className="py-3 px-3 items-center" style={{ width: 100 }}>
                              <Text 
                                className="font-inter_bold text-sm"
                                style={{ 
                                  color: row.percentage >= 75 ? '#10B981' : 
                                        row.percentage >= 50 ? '#F59E0B' : '#EF4444'
                                }}
                              >
                                {row.percentage.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </ScrollView>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </Modal>

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default GradesAndroid;