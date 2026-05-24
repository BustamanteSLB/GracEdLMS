import { Text, View, useColorScheme, ActivityIndicator, ScrollView, TouchableOpacity, VirtualizedList, TextInput, Platform, Modal, useWindowDimensions } from 'react-native'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import apiClient from '@/app/services/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import Dropdown, { DropdownItem } from '@/components/Dropdown'
import MoreVertIcon from '@/assets/icons/more_vert.svg'
import ContextMenu from '@/components/ContextMenu'

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
  quarter: string; // Changed from number to string
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

// Helper function to export grades to CSV
const exportGradesToCSV = (
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
    // Create CSV header
    const headers = [
      'Student Name',
      ...gradeItems.map(item => `${item.title} (${item.type === 'activity' ? 'Activity' : 'Quiz'} - ${item.points} pts)`),
      'Total Score',
      'Total Percentage (%)'
    ];

    // Create CSV rows
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

    // Combine headers and rows
    const csvContent = [
      // Subject info header
      [`Subject: ${subjectName}`],
      [`Grade Level: ${gradeLevel} - ${section}`],
      [`School Year: ${schoolYear}`],
      [`Quarter: ${quarter}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [], // Empty row
      headers,
      ...rows
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${subjectName}_${quarter.replace(' ', '_')}_Grades_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
};

// Teacher's grades page
const GradesWeb: React.FC = () => {
  document.title = 'Grades - GracEdLMS';
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  // State management
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter states
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('First Quarter'); // Keep for table tabs
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');

  // Modal states
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedGradeData, setSelectedGradeData] = useState<any>(null);

  // Context menu states
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuCoords, setContextMenuCoords] = useState({ x: 0, y: 0 });
  const [contextMenuSubject, setContextMenuSubject] = useState<Subject | null>(null);

  // Quarter tabs for modal
  const quarters = ['First Quarter', 'Second Quarter', '3rd Quarter', '4th Quarter'];

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

  const schoolYearFilterOptions: DropdownItem[] = useMemo(() => {
    const uniqueSchoolYears = Array.from(
      new Set(subjects.map(s => s.schoolYear).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));

    const options: DropdownItem[] = [
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
      
      // Filter subjects where this teacher is assigned in the teachers array
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

      // Fetch activities for teacher's subjects
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

  useEffect(() => {
    // Refresh data when filters change
  }, [selectedSubject, selectedQuarter]);

  // Helper function to get user full name
  const getUserFullName = (user: User) => {
    return user.middleName 
      ? `${user.lastName}, ${user.firstName} ${user.middleName}`
      : `${user.lastName}, ${user.firstName}`;
  };

  // Get filtered subject
  const currentSubject = useMemo(() => {
    if (!selectedSubject) return null;
    return subjects.find(s => s._id === selectedSubject) || null;
  }, [selectedSubject, subjects]);

  // Get grade items for current subject and quarter
  const getGradeItems = useMemo(() => {
    if (!currentSubject) return [];

    const items: GradeItem[] = [];

    // Add activities
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

    // Add quizzes
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

  // Get students for selected subject
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

  // Prepare grade table data
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

  // Updated filteredSubjectOptions to include school year filter
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
    setSelectedGradeData({ subject, quarter: selectedQuarter });
    setPreviewModalVisible(true);
  };

  const openContextMenu = (e: any, subject: Subject) => {
    const { pageX, pageY } = e.nativeEvent;
    setContextMenuCoords({ x: pageX, y: pageY });
    setContextMenuSubject(subject);
    setContextMenuVisible(true);
  };

  const handleExportCSV = () => {
    if (!currentSubject || gradeTableData.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('No data to export. Please select a subject with students and grades.');
      }
      return;
    }

    const success = exportGradesToCSV(
      currentSubject.subjectName,
      currentSubject.gradeLevel || 'N/A',
      currentSubject.section,
      currentSubject.schoolYear || 'N/A',
      selectedQuarter,
      getGradeItems,
      gradeTableData,
      getUserFullName
    );

    if (success && Platform.OS === 'web') {
      window.alert('Grades exported successfully!');
    } else if (!success && Platform.OS === 'web') {
      window.alert('Failed to export grades. Please try again.');
    }
  };

  const contextMenuItems = [
    {
      label: 'View Grades',
      icon: (
        <Image
          source={require('@/assets/icons/show_password.png')}
          style={{ width: 20, height: 20, marginRight: 8 }}
          tintColor={isDarkMode ? '#E0E0E0' : '#333'}
        />
      ),
      onPress: () => contextMenuSubject && handleViewGrades(contextMenuSubject),
    },
  ];

  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const activitiesCount = activities.filter(a => a.subject._id === item._id && a.quarter === selectedQuarter).length;
    const quizzesCount = quizzes.filter(q => q.subject._id === item._id && q.quarter === selectedQuarter).length;
    const totalItems = activitiesCount + quizzesCount;

    // Add these for consistent color
    const initials = item.subjectName.slice(0, 2).toUpperCase();
    const getConsistentColor = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
      return colors[Math.abs(hash) % colors.length];
    };
    const bgColor = getConsistentColor(item.subjectName);

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
        onPress={() => handleViewGrades(item)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Subject Image or Icon */}
            {item.subjectImage ? (
              <Image
                source={{ uri: item.subjectImage }}
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
              <View className='flex-row items-center mb-1'>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginRight: 8,
                  }}
                  ellipsizeMode="tail" numberOfLines={1}
                >
                  {item.subjectName}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: 8,
                }}
              >
                {item.gradeLevel} - {item.section} • S.Y. {item.schoolYear}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 14, 
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                }}>
                  {totalItems} items ({activitiesCount} activities, {quizzesCount} quizzes)
                </Text>
              </View>
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

  // VirtualizedList required functions
  const getItem = (data: Subject[], index: number) => data[index];
  const getItemCount = (data: Subject[]) => data.length;
  const keyExtractor = (item: Subject, index: number) => item._id;

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB' }}>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 24,
              fontFamily: 'Inter-Bold',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            Student Grades
          </Text>
          <TouchableOpacity
            onPress={fetchTeacherData}
            className="bg-[#EF4444] px-2 py-2 rounded-lg flex-row items-center"
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              className="w-[24] h-[24]"
              tintColor="white"
            />
          </TouchableOpacity>
        </View>

        {/* Filters - REMOVED QUARTER DROPDOWN */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                placeholder="Search subjects..."
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
          </View>

          {/* Only School Year Dropdown */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: 'Inter-Medium',
                color: isDarkMode ? '#E0E0E0' : '#6B7280',
                marginBottom: 4 
              }}>
                School Year
              </Text>
              <Dropdown
                data={schoolYearFilterOptions}
                selectedValue={selectedSchoolYear}
                onValueChange={setSelectedSchoolYear}
                placeholder="All School Years"
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
              Loading grades...
            </Text>
          </View>
        ) : filteredSubjectOptions.length > 0 ? (
          <VirtualizedList
            data={filteredSubjectOptions}
            renderItem={renderSubjectItem}
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
              source={require('@/assets/images/score.png')}
              style={{ width: 64, height: 64, marginBottom: 16 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontFamily: 'Inter-SemiBold',
              color: isDarkMode ? '#9CA3AF' : '#6B7280', 
              marginBottom: 8 
            }}>
              No subjects found
            </Text>
            <Text style={{ 
              fontSize: 14, 
              fontFamily: 'Inter-Regular',
              color: isDarkMode ? '#6B7280' : '#9CA3AF', 
              textAlign: 'center' 
            }}>
              You don't have any assigned subjects yet
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
          {/* Fixed Header */}
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
                flex: 1,
              }}
            >
              Grades - {currentSubject?.subjectName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleExportCSV}
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={require('@/assets/icons/export_csv.png')}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  tintColor="white"
                />
                <Text style={{ 
                  color: 'white', 
                  fontFamily: 'Inter-Medium',
                  fontSize: 14,
                }}>
                  Export CSV
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreviewModalVisible(false)}
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontFamily: 'Inter-Medium',
                  fontSize: 14,
                }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {currentSubject && (
            <View style={{ flex: 1 }}>
              {/* Fixed Subject Header with Quarter Tabs */}
              <View
                style={{
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                }}
              >
                <Text style={{
                  fontSize: 24,
                  fontFamily: 'Inter-Bold',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  marginBottom: 8,
                }}>
                  {currentSubject.subjectName}
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Inter-Regular',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: 16,
                }}>
                  {currentSubject.gradeLevel} - {currentSubject.section} • S.Y. {currentSubject.schoolYear}
                </Text>

                {/* Quarter Tabs */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {quarters.map((quarter) => {
                      const isActive = quarter === selectedQuarter;
                      return (
                        <TouchableOpacity
                          key={quarter}
                          onPress={() => setSelectedQuarter(quarter)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: isActive 
                              ? '#3B82F6' 
                              : (isDarkMode ? '#374151' : '#F3F4F6'),
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: 'Inter-Medium',
                              color: isActive 
                                ? '#FFFFFF' 
                                : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                            }}
                          >
                            {quarter}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Items: {getGradeItems.length}
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280' 
                  }}>
                    Students: {subjectStudents.length}
                  </Text>
                </View>
              </View>

              {/* Scrollable Grades Table */}
              {getGradeItems.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={require('@/assets/images/no_results.png')}
                    style={{ width: 100, height: 100, opacity: 0.5 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    fontFamily: 'Inter-Regular',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    marginTop: 16,
                    textAlign: 'center',
                  }}>
                    No activities or quizzes found for {selectedQuarter}
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  style={{ flex: 1 }} 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                >
                  <ScrollView 
                    style={{ flex: 1 }} 
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={{ padding: 20 }}>
                      <View
                        style={{ 
                          backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                        }}
                      >
                        {/* Table Header */}
                        <View 
                          style={{
                            flexDirection: 'row',
                            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                            borderBottomWidth: 2,
                            borderBottomColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                          }}
                        >
                          <View style={{ width: 250, paddingVertical: 12, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB' }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827' }}>
                              Student Name
                            </Text>
                          </View>
                          {getGradeItems.map((item) => (
                            <View key={item._id} style={{ width: 150, paddingVertical: 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB', alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827', textAlign: 'center' }} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <Text style={{ fontSize: 12, fontFamily: 'Inter-Regular', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginTop: 4 }}>
                                {item.type === 'activity' ? 'Activity' : 'Quiz'} ({item.points} pts)
                              </Text>
                            </View>
                          ))}
                          <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: isDarkMode ? '#4B5563' : '#D1D5DB', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827' }}>Total</Text>
                          </View>
                          <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: isDarkMode ? '#E0E0E0' : '#111827' }}>Total %</Text>
                          </View>
                        </View>

                        {/* Table Rows */}
                        {gradeTableData.map((row, rowIndex) => (
                          <View 
                            key={row.student._id}
                            style={{
                              flexDirection: 'row',
                              backgroundColor: rowIndex % 2 === 0 ? (isDarkMode ? '#1E1E1E' : '#FFFFFF') : (isDarkMode ? '#252525' : '#F9FAFB'),
                              borderBottomWidth: rowIndex < gradeTableData.length - 1 ? 1 : 0,
                              borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                            }}
                          >
                            <View style={{ width: 250, paddingVertical: 12, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: isDarkMode ? '#333333' : '#E5E7EB' }}>
                              <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: isDarkMode ? '#E0E0E0' : '#111827' }} numberOfLines={1}>
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
                                <View key={item._id} style={{ width: 150, paddingVertical: 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: isDarkMode ? '#333333' : '#E5E7EB', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: textColor }}>
                                    {score}
                                  </Text>
                                </View>
                              );
                            })}
                            <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: isDarkMode ? '#333333' : '#E5E7EB', alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: row.percentage >= 75 ? '#10B981' : row.percentage >= 50 ? '#F59E0B' : '#EF4444' }}>
                                {row.total}
                              </Text>
                            </View>
                            <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: row.percentage >= 75 ? '#10B981' : row.percentage >= 50 ? '#F59E0B' : '#EF4444' }}>
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
    </View>
  );
};

export default GradesWeb;