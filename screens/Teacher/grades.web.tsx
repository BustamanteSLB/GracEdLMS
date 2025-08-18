import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, VirtualizedList, TextInput, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { Picker } from '@react-native-picker/picker'

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
  teacher: User;
  section: string;
  semester: string;
  academicYear: string;
  status: 'active' | 'inactive' | 'archived';
  students: (User[] | string[]);
  gradeLevel?: string;
  schoolYear?: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  quarter?: number;
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

// Combined item type for activities and quizzes
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

// VirtualizedList item types
type SidebarItemType = 'loading' | 'empty' | 'subject';
type MainItemType = 'loading' | 'empty' | 'grades-table';

interface SidebarListItem {
  id: string;
  type: SidebarItemType;
  data?: Subject;
}

interface MainListItem {
  id: string;
  type: MainItemType;
  data?: Subject;
  students?: User[];
  gradeItems?: GradeItem[];
  grades?: Grade[];
  quizzes?: Quiz[];
}

// Teacher's grades page
const GradesWeb: React.FC = () => {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  // State management
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter states - Change to use string quarters
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('First Quarter');

  // Fetch data similar to activity.web.tsx
  const fetchTeacherData = async () => {
    if (!user || user.role !== 'Teacher') {
      setError('Unauthorized: Teacher access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subjects assigned to this teacher
      const subjectsResponse = await apiClient.get('/subjects');
      const allSubjects = subjectsResponse.data.data || [];
      
      // Filter subjects where this teacher is assigned
      const teacherSubjects = allSubjects.filter((subject: Subject) => 
        subject.teacher && subject.teacher._id === user._id
      );

      if (teacherSubjects.length === 0) {
        setSubjects([]);
        setActivities([]);
        setGrades([]);
        setQuizzes([]);
        setLoading(false);
        return;
      }

      // Fetch populated subject data (with students)
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

      // Fetch all students
      try {
        const studentsResponse = await apiClient.get('/users?role=Student&limit=1000');
        if (studentsResponse.data.success) {
          setAllStudents(studentsResponse.data.data);
        }
      } catch (error) {
        console.warn('Could not fetch all students');
      }

      // Fetch activities for teacher's subjects
      const teacherActivities: Activity[] = [];
      for (const subject of teacherSubjects) {
        try {
          const activitiesResponse = await apiClient.get(`/subjects/${subject._id}/activities`);
          if (activitiesResponse.data.success && activitiesResponse.data.data) {
            const activitiesWithSubject = activitiesResponse.data.data.map((activity: Activity) => ({
              ...activity,
              subject: subject,
              quarter: activity.quarter || 1 // Default to quarter 1 if not specified
            }));
            teacherActivities.push(...activitiesWithSubject);
          }
        } catch (error) {
          console.warn(`Failed to fetch activities for subject ${subject.subjectName}`);
        }
      }
      setActivities(teacherActivities);

      // Fetch grades for teacher's activities
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

      // Fetch quizzes for teacher's subjects with detailed quiz data
      const teacherQuizzes: Quiz[] = [];
      for (const subject of teacherSubjects) {
        try {
          const quizzesResponse = await apiClient.get(`/quizzes?subject=${subject._id}`);
          if (quizzesResponse.data.success && quizzesResponse.data.data) {
            // Fetch detailed quiz data including submissions
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

      console.log('Fetched quizzes with submissions:', teacherQuizzes.map(q => ({
        title: q.title,
        quarter: q.quarter,
        submissionsCount: q.quizSubmissions?.length || 0,
        submissions: q.quizSubmissions?.map(sub => ({
          studentId: sub.student._id,
          score: sub.quizScore,
          status: sub.status
        })) || []
      })));
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

  // Helper function to get user full name
  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.lastName.toUpperCase()}, ${user.firstName.toUpperCase()} ${user.middleName.toUpperCase()}`
      : `${user.lastName.toUpperCase()}, ${user.firstName.toUpperCase()}`;
  };

  // Helper function to get quarter string from number
  const getQuarterString = (quarterNum: number): string => {
    switch (quarterNum) {
      case 1: return 'First Quarter';
      case 2: return 'Second Quarter';
      case 3: return '3rd Quarter';
      case 4: return '4th Quarter';
      default: return 'First Quarter';
    }
  };

  // Helper function to get quarter number from string
  const getQuarterNumber = (quarterStr: string): number => {
    switch (quarterStr) {
      case 'First Quarter': return 1;
      case 'Second Quarter': return 2;
      case '3rd Quarter': return 3;
      case '4th Quarter': return 4;
      default: return 1;
    }
  };

  // Combine activities and quizzes into grade items
  const getGradeItems = useMemo(() => {
    if (!selectedSubject) return [];

    const items: GradeItem[] = [];

    // Add activities
    activities
      .filter(activity => {
        const matchesSubject = activity.subject._id === selectedSubject._id;
        const activityQuarter = getQuarterString(activity.quarter || 1);
        const matchesQuarter = activityQuarter === selectedQuarter;
        return matchesSubject && matchesQuarter;
      })
      .forEach(activity => {
        items.push({
          _id: activity._id,
          title: activity.title,
          type: 'activity',
          points: activity.points || 0,
          quarter: getQuarterString(activity.quarter || 1),
          subject: activity.subject,
          createdAt: activity.createdAt,
          data: activity
        });
      });

    // Add quizzes
    quizzes
      .filter(quiz => {
        const matchesSubject = quiz.subject._id === selectedSubject._id;
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

    console.log('Grade items for quarter', selectedQuarter, ':', items.map(i => ({
      title: i.title,
      type: i.type,
      points: i.points,
      quarter: i.quarter
    })));

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [activities, quizzes, selectedSubject, selectedQuarter]);

  // Get students for selected subject
  const subjectStudents = useMemo(() => {
    if (!selectedSubject) return [];
    
    let students: User[] = [];
    if (selectedSubject.students && selectedSubject.students.length > 0) {
      if (typeof selectedSubject.students[0] === 'object' && selectedSubject.students[0] !== null && 'firstName' in selectedSubject.students[0]) {
        // students is array of User objects
        students = selectedSubject.students as User[];
      } else {
        // students is array of IDs, map to User objects from allStudents
        const studentIds = selectedSubject.students as string[];
        students = allStudents.filter(s => studentIds.includes(s._id));
      }
    }
    
    return students.sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
  }, [selectedSubject, allStudents]);

  // Prepare grade table data with both activities and quizzes
  const gradeTableData = useMemo((): StudentGradeRow[] => {
    if (!selectedSubject || getGradeItems.length === 0 || subjectStudents.length === 0) {
      return [];
    }

    console.log('Preparing grade table data for', subjectStudents.length, 'students and', getGradeItems.length, 'items');

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

          console.log('Quiz submission check:', {
            quizTitle: quiz.title,
            studentName: getUserFullName(student),
            submissionFound: !!submission,
            submissionScore: submission?.quizScore,
            submissionStatus: submission?.status,
            totalSubmissions: quiz.quizSubmissions?.length || 0
          });
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
  }, [selectedSubject, subjectStudents, getGradeItems, grades, quizzes]);

  // Filter subjects by search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    
    const query = searchQuery.toLowerCase();
    return subjects.filter(subject => 
      subject.subjectName.toLowerCase().includes(query) ||
      subject.section.toLowerCase().includes(query) ||
      subject.gradeLevel?.toLowerCase().includes(query) ||
      subject.schoolYear?.toLowerCase().includes(query)
    );
  }, [subjects, searchQuery]);

  // Generate subject initials and color
  const getSubjectInitials = (subjectName: string) => {
    const words = subjectName.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return subjectName.substring(0, 2).toUpperCase();
  };

  const getSubjectColor = (subjectId: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubject(null);
    setSelectedQuarter('First Quarter');
  };

  // Handle subject selection
  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  // Prepare sidebar virtualized list data
  const sidebarListData = useMemo((): SidebarListItem[] => {
    if (loading) {
      return [{ id: 'loading', type: 'loading' }];
    }
    
    if (filteredSubjects.length === 0) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return filteredSubjects.map(subject => ({
      id: subject._id,
      type: 'subject' as SidebarItemType,
      data: subject
    }));
  }, [loading, filteredSubjects]);

  // Prepare main virtualized list data
  const mainListData = useMemo((): MainListItem[] => {
    if (error) {
      return [{ id: 'error', type: 'empty' }];
    }
    
    if (!selectedSubject) {
      return [{ id: 'empty', type: 'empty' }];
    }
    
    return [
      { 
        id: `${selectedSubject._id}-grades`, 
        type: 'grades-table' as MainItemType, 
        data: selectedSubject,
        students: subjectStudents,
        gradeItems: getGradeItems,
        grades: grades,
        quizzes: quizzes
      }
    ];
  }, [error, selectedSubject, subjectStudents, getGradeItems, grades, quizzes]);

  // VirtualizedList helper functions
  const getSidebarItem = useCallback((data: SidebarListItem[], index: number) => data[index], []);
  const getMainItem = useCallback((data: MainListItem[], index: number) => data[index], []);
  const getSidebarItemCount = useCallback((data: SidebarListItem[]) => data.length, []);
  const getMainItemCount = useCallback((data: MainListItem[]) => data.length, []);
  const sidebarKeyExtractor = useCallback((item: SidebarListItem) => item.id, []);
  const mainKeyExtractor = useCallback((item: MainListItem) => item.id, []);

  // Sidebar item renderer
  const renderSidebarItem = useCallback(({ item }: { item: SidebarListItem }) => {
    switch (item.type) {
      case 'loading':
        return (
          <View 
            className='w-full items-center rounded-lg p-3 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <ActivityIndicator size="small" color={isDarkMode ? '#E0E0E0' : '#000'} />
            <Text className={`font-inter_regular text-sm mt-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Loading...
            </Text>
          </View>
        );
      
      case 'empty':
        return (
          <View 
            className='w-full items-center rounded-lg p-3 mb-2'
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }}
          >
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              No subjects found.
            </Text>
          </View>
        );
      
      case 'subject':
        if (!item.data) return null;
        const subject = item.data;
        const subjectColor = getSubjectColor(subject._id);
        const subjectInitials = getSubjectInitials(subject.subjectName);
        const isSelected = selectedSubject?._id === subject._id;
        
        return (
          <TouchableOpacity
            onPress={() => handleSubjectSelect(subject)}
            className='w-full rounded-md p-3 mb-2'
            style={{ 
              backgroundColor: isSelected 
                ? (isDarkMode ? '#2563EB' : '#3B82F6') 
                : (isDarkMode ? '#1E1E1E' : '#F5F5F5'),
              borderWidth: 2,
              borderColor: subjectColor
            }}
            activeOpacity={0.7}
          >
            {/* Subject Badge */}
            <View className='flex-row'>
              <View
                className='w-[36px] h-[36px] rounded-md items-center justify-center mr-2'
                style={{ backgroundColor: subjectColor }}
              >
                <Text className='font-inter_bold text-xs text-white'>
                  {subjectInitials}
                </Text>
              </View>
              <View className='flex-1'>
                {/* Subject Name */}
                <Text 
                  className={`font-inter_bold text-base ${
                    isSelected 
                      ? 'text-white' 
                      : (isDarkMode ? 'text-[#E0E0E0]' : 'text-black')
                  }`}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {subject.subjectName}
                </Text>
                {/* Grade Level */}
                <Text 
                  className={`font-inter_regular text-xs ${
                    isSelected 
                      ? 'text-white' 
                      : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {subject.gradeLevel || 'N/A'} - {subject.section}
                </Text>
                {/* School Year */}
                <Text 
                  className={`font-inter_regular text-xs ${
                    isSelected 
                      ? 'text-blue-100' 
                      : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                  }`}
                >
                  S.Y. {subject.schoolYear}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, selectedSubject, getSubjectColor, getSubjectInitials, handleSubjectSelect]);

  // Main item renderer
  const renderMainItem = useCallback(({ item }: { item: MainListItem }) => {
    switch (item.type) {
      case 'empty':
        if (error) {
          return (
            <View className='w-full items-center bg-red-100 rounded-lg p-4 mt-2 mb-2'>
              <Text className='font-inter_regular text-red-800'>
                {error}
              </Text>
            </View>
          );
        }
        
        return (
          <View className={`w-full items-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} rounded-lg p-8 mt-2`}>
            <Image
              className="w-[120] h-[120] opacity-50"
              contentFit="contain"
              source={require('@/assets/images/score.png')}
            />
            <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              Select a subject from the sidebar to view student grades
            </Text>
          </View>
        );
      
      case 'grades-table':
        if (!item.data || !item.students || !item.gradeItems) return null;
        
        return (
          <View className={`w-full ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 rounded-lg`}>
            {/* Subject Header */}
            <View className='mb-4'>
              <Text className={`font-inter_bold text-xl mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                {item.data.subjectName}
              </Text>
              <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {item.data.gradeLevel || 'N/A'} - {item.data.section} • S.Y. {item.data.schoolYear}
              </Text>
            </View>

            {/* Quarter Tabs */}
            <View className='flex-row mb-4' style={{ backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', borderRadius: 8, padding: 2 }}>
              {['First Quarter', 'Second Quarter', '3rd Quarter', '4th Quarter'].map(quarter => (
                <TouchableOpacity
                  key={quarter}
                  onPress={() => setSelectedQuarter(quarter)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    backgroundColor: selectedQuarter === quarter ? '#3B82F6' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: selectedQuarter === quarter ? 'white' : (isDarkMode ? '#E0E0E0' : '#374151'),
                    fontSize: 12,
                    fontFamily: 'Inter-18pt-Medium',
                  }}>
                    {quarter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary Info */}
            <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
              <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                {selectedQuarter} Summary: {item.gradeItems?.length || 0} items 
                ({item.gradeItems?.filter(i => i.type === 'activity').length || 0} activities, {item.gradeItems?.filter(i => i.type === 'quiz').length || 0} quizzes)
              </Text>
            </View>

            {/* Grades Table */}
            {item.gradeItems.length === 0 ? (
              <View className='items-center py-8'>
                <Image
                  className="w-[100] h-[100] opacity-50"
                  contentFit="contain"
                  source={require('@/assets/images/no_results.png')}
                />
                <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No activities or quizzes found for {selectedQuarter}
                </Text>
              </View>
            ) : item.students.length === 0 ? (
              <View className='items-center py-8'>
                <Image
                  className="w-[100] h-[100] opacity-50"
                  contentFit="contain"
                  source={require('@/assets/images/no_results.png')}
                />
                <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  No students enrolled in this subject
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View
                  className='min-w-full'
                  style={{ 
                    backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* Table Header */}
                  <View 
                    style={{
                      flexDirection: 'row',
                      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                      borderBottomWidth: 2,
                      borderBottomColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent:'space-between'
                    }}
                  >
                    {/* Student Name Header */}
                    <View style={{ minWidth: 250, marginRight: 16 }}>
                      <Text 
                        className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}
                      >
                        Student Name
                      </Text>
                    </View>

                    {/* Activity/Quiz Headers */}
                    {item.gradeItems?.map(gradeItem => (
                      <View 
                        key={gradeItem._id}
                        style={{ 
                          minWidth: 120,
                          marginRight: 16,
                          alignItems: 'center',
                        }}
                      >
                        <View className='flex-row items-center mb-1'>
                          <Text 
                            className={`font-inter_bold text-center text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}
                            numberOfLines={2}
                            ellipsizeMode='tail'
                          >
                            {gradeItem.title}
                          </Text>
                        </View>
                        <Text 
                          className={`font-inter_regular text-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {gradeItem.type === 'activity' ? 'Activity' : 'Quiz'} ({gradeItem.points || 0} pts)
                        </Text>
                      </View>
                    ))}

                    {/* Total Score Header */}
                    <View style={{ minWidth: 120, alignItems: 'center', marginRight: 16,  }}>
                      <Text 
                        className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}
                      >
                        Total
                      </Text>
                    </View>

                    {/* Total Percentage Header */}
                    <View style={{ minWidth: 120, alignItems: 'center' }}>
                      <Text 
                        className={`font-inter_bold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-[#111827]'}`}
                      >
                        Total %
                      </Text>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {gradeTableData.map((row, index) => (
                    <View 
                      key={row.student._id}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                        justifyContent:'space-between'
                      }}
                    >
                      {/* Student Name */}
                      <View style={{ minWidth: 250, marginRight: 16 }}>
                        <Text style={{
                          fontSize: 14,
                          fontFamily: 'Inter-18pt-Regular',
                          color: isDarkMode ? '#E0E0E0' : '#111827',
                        }}
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        >
                          {getUserFullName(row.student)}
                        </Text>
                      </View>

                      {/* Activity/Quiz Scores */}
                      {item.gradeItems?.map(gradeItem => {
                        const itemData = row.items[gradeItem._id];
                        let score = '-';
                        let textColor = isDarkMode ? '#9CA3AF' : '#6B7280';

                        if (itemData) {
                          if (gradeItem.type === 'activity' && 'score' in itemData) {
                            score = itemData.score.toString();
                            textColor = isDarkMode ? '#E0E0E0' : '#111827';
                          } else if (gradeItem.type === 'quiz' && 'quizScore' in itemData) {
                            score = itemData.quizScore?.toString() || '-';
                            textColor = isDarkMode ? '#E0E0E0' : '#111827';
                          }
                        }

                        return (
                          <View 
                            key={gradeItem._id}
                            style={{ 
                              minWidth: 120,
                              marginRight: 16,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 14,
                              fontFamily: 'Inter-18pt-Regular',
                              color: textColor,
                              textAlign: 'center',
                            }}>
                              {score}
                            </Text>
                          </View>
                        );
                      })}

                      {/* Total Score */}
                      <View style={{ minWidth: 120, alignItems: 'center', marginRight: 16 }}>
                        <Text style={{
                          fontSize: 14,
                          fontFamily: 'Inter-24pt-Bold',
                          color: row.percentage >= 75 ? '#10B981' : 
                                row.percentage >= 50 ? '#F59E0B' : '#EF4444',
                        }}>
                          {row.total}
                        </Text>
                      </View>

                      {/* Total Percentage */}
                      <View style={{ minWidth: 120, alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 14,
                          fontFamily: 'Inter-24pt-Bold',
                          color: row.percentage >= 75 ? '#10B981' : 
                                row.percentage >= 50 ? '#F59E0B' : '#EF4444',
                        }}>
                          {row.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        );
      
      default:
        return null;
    }
  }, [isDarkMode, error, selectedQuarter, setSelectedQuarter, gradeTableData, getUserFullName]);

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0}' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Loading grades...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchTeacherData}
          activeOpacity={0.7}
        >
          <Text className='text-white font-psemibold text-base'>
            Retry
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  if (subjects.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/score.png')}
          transition={200}
        />
        <Text className={`font-inter_regular text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No subjects assigned to you yet.
        </Text>
        <TouchableOpacity
          className='bg-blue-500 rounded-xl h-[40px] justify-center items-center mt-4 px-4'
          onPress={fetchTeacherData}
          activeOpacity={0.7}
        >
          <Text className='text-white font-psemibold text-base'>
            Refresh
          </Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      {/* Header */}
      <View 
        className='flex-row items-center p-4' 
        style={{
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0'
        }}
      >
        <View className='flex-col mr-auto'>
          <Text className={`font-inter_semibold text-2xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
            Student Grades
          </Text>
          <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredSubjects.length} of {subjects.length} subjects
          </Text>
          {/* Role indicator */}
          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`}>
            👨‍🏫 Teacher View
          </Text>
        </View>
        <View className='flex-row items-center'>
          <TouchableOpacity
            className={`rounded-md justify-center items-center p-2 mr-1 ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
            onPress={fetchTeacherData}
            activeOpacity={0.7}
          >
            <Image
              className="w-[24] h-[24]"
              contentFit="contain"
              source={require('@/assets/icons/refresh.png')}
              tintColor="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            className='bg-gray-500 rounded-md justify-center items-center p-2'
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <Text className='text-white font-psemibold text-base'>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={{ height: '100%', flexDirection: width < 768 ? 'column' : 'row' }}
      >
        {/* Side Bar - Subjects */}
        <View className={`p-4 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
          style={{
            borderRightWidth: width >= 768 ? 1 : 0,
            borderBottomWidth: width < 768 ? 1 : 0,
            borderRightColor: isDarkMode ? '#333333' : '#E0E0E0',
            borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
            width: width < 768 ? '100%' : '33%',
          }}>
            <Text className={`font-inter_semibold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              My Subjects:
            </Text>
            {/* Search Bar */}
            <TextInput
              className={`border rounded-md px-3 py-2 font-inter_regular text-sm ${isDarkMode ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white' : 'border-gray-300 text-black'}`}
              placeholder='Search subjects...'
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            <VirtualizedList
              data={sidebarListData}
              initialNumToRender={10}
              renderItem={renderSidebarItem}
              keyExtractor={sidebarKeyExtractor}
              getItemCount={getSidebarItemCount}
              getItem={getSidebarItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={10}
              style={{ marginTop: 8 }}
            />
        </View>

        {/* Main List - Grades Table */}
        <View
          className='p-4'
          style={{ 
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5', 
            width: width < 768 ? '100%' : '67%',
            height: width < 768 ? 'auto' : '100%'
          }}
        >
          <VirtualizedList
            data={mainListData}
            initialNumToRender={3}
            renderItem={renderMainItem}
            keyExtractor={mainKeyExtractor}
            getItemCount={getMainItemCount}
            getItem={getMainItem}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={50}
            windowSize={5}
          />
        </View>
      </ScrollView>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};

export default GradesWeb;