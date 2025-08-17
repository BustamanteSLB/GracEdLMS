import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react'
import { Image } from 'expo-image';
import DeleteIcon from '@/assets/icons/delete.svg';
import Checkbox from 'expo-checkbox';
import apiClient from '@/app/services/apiClient';

interface User {
  _id: string;
  userId: string;
  username: string;
  firstName: string;
  middleName?: string; // Optional middle name
  lastName: string;
  email: string;
  sex: string;
  phoneNumber: string;
  address: string;
  role: 'Admin' | 'Teacher' | 'Student';
  profilePicture?: string; // Optional profile picture
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  enrolledSubjects: string[]; // Array of subject IDs
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

interface MembersModalProps {
  subjectId: string;
  teacher: User;
  isDarkMode?: boolean;
  isAdminOrTeacher?: boolean;
}

const tabs = [
  { key: 'add_single', label: 'Add Single Student' }, // Add Student by Email
  { key: 'add_bulk', label: 'Add Students by Bulk' }, // Add Student through checkboxes
];

const MembersModal: React.FC<MembersModalProps> = ({
  subjectId,
  teacher,
  isDarkMode,
  isAdminOrTeacher,
}) => {
  const { user } = useAuth();

  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addStudentModalVisible, setAddStudentModalVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('add_single');
  const [email, setEmail] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Constants for capacity management
  const MAX_STUDENTS = 30;
  const availableSlots = MAX_STUDENTS - enrolledStudents.length;
  const isAtCapacity = enrolledStudents.length >= MAX_STUDENTS;

  const fetchActiveStudents = async () => {
    try {
      console.log('Fetching all active students...');
      const response = await apiClient.get('/users?role=Student&status=active');
      console.log('Active students response:', response.data);
      setAllStudents(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching all students:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch all active students';
      if (Platform.OS === 'web') {
        window.alert(`Error fetching all active students: ${errorMessage}`);
      } else {
        Alert.alert('Error', `Failed to fetch all active students: ${errorMessage}`);
      }
      setAllStudents([]);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching subject data for subjectId:', subjectId);

      const response = await apiClient.get(`/subjects/${subjectId}`);
      console.log('Subject API Response:', response.data);

      const subjectData = response.data.data;

      if (!subjectData) {
        console.log('No subject data found');
        setEnrolledStudents([]);
        return;
      }

      // Check if students field exists and has data
      if (subjectData.students && subjectData.students.length > 0) {
        console.log('Students found in subject data:', subjectData.students.length);

        const firstStudent = subjectData.students[0];

        if (typeof firstStudent === 'string') {
          // Students are just IDs, need to fetch full data
          console.log('Students are IDs, attempting to fetch full data individually...');
          try {
            const studentPromises = subjectData.students.map((id: string) =>
              apiClient.get(`/users/${id}`)
            );
            const studentResponses = await Promise.all(studentPromises);
            const studentsData = studentResponses.map(res => res.data.data);
            console.log('Successfully fetched individual student data:', studentsData);
            setEnrolledStudents(studentsData);
          } catch (studentError: any) {
            console.error('Error fetching individual students:', studentError);
            console.error('Error details:', studentError.response?.data);
            // Fallback: try to get students from already fetched allStudents
            if (allStudents.length > 0) {
              console.log('Attempting to populate enrolled students from existing allStudents data...');
              const enrolledStudentsData = allStudents.filter((user: User) =>
                subjectData.students.includes(user._id)
              );
              setEnrolledStudents(enrolledStudentsData);
              console.log('Populated enrolled students from allStudents fallback:', enrolledStudentsData.length);
            } else {
              console.error('allStudents is empty, cannot populate enrolled students from fallback.');
              setEnrolledStudents([]);
            }
          }
        } else if (firstStudent && typeof firstStudent === 'object' && firstStudent.firstName) {
          // Students are already full objects
          console.log('Students are already full objects in subject data.');
          setEnrolledStudents(subjectData.students);
        } else {
          console.log('Unexpected student data format:', firstStudent);
          setEnrolledStudents([]);
        }
      } else {
        console.log('No students in subject data.');
        setEnrolledStudents([]);
      }
    } catch (error: any) {
      console.error('Error fetching enrolled students:', error);
      console.error('Error details:', error.response?.data);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch enrolled students';

      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      }
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Alert.alert('Error', errorMessage);
      }
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to handle the dependency better
  useEffect(() => {
    // Fetch active students first, then enrolled students
    const fetchData = async () => {
      await fetchActiveStudents(); // This populates allStudents
      await fetchEnrolledStudents(); // This now can use allStudents as fallback
    };

    fetchData();
  }, [subjectId, user, allStudents.length]); // Added allStudents.length as a dependency for re-fetch enrolled students if allStudents changes

  const getAvailableStudents = () => {
    const enrolledIds = enrolledStudents.map(student => student._id);
    console.log('getAvailableStudents: enrolledIds =', enrolledIds);
    console.log('getAvailableStudents: allStudents.length =', allStudents.length);
    const available = allStudents.filter(student => !enrolledIds.includes(student._id));
    console.log('getAvailableStudents: available.length =', available.length);
    return available;
  };

  const handleAddSingleStudent = async () => {
    if (isAtCapacity) {
      const message = `Subject has reached maximum capacity of ${MAX_STUDENTS} students. Please remove an enrolled student before adding a new one.`;
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    if (!email.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Error: Please enter a valid email address');
      } else {
        Alert.alert('Error', 'Please enter a valid email address');
      }
      return;
    }

    setAdding(true);
    try {
      const response = await apiClient.put(`/subjects/${subjectId}/enroll-student`, {
        studentIdentifier: email.trim()
      });

      if (Platform.OS === 'web') {
        window.alert('Success: Student enrolled successfully');
      } else {
        Alert.alert('Success', 'Student enrolled successfully');
      }
      setEmail('');
      setAddStudentModalVisible(false);
      fetchEnrolledStudents();
      fetchActiveStudents(); // Refresh all students to update available list
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to enroll student';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAddStudents = async () => {
    if (selectedStudents.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Error: Please select at least one student');
      } else {
        Alert.alert('Error', 'Please select at least one student');
      }
      return;
    }

    if (isAtCapacity) {
      const message = `Subject has reached maximum capacity of ${MAX_STUDENTS} students. Please remove enrolled students before adding new ones.`;
      if (Platform.OS === 'web') {
        window.alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    // Warn if trying to add more students than available slots
    if (selectedStudents.length > availableSlots) {
      const message = `You selected ${selectedStudents.length} students, but only ${availableSlots} slots are available. Only the first ${availableSlots} students will be enrolled.`;
      
      const confirmProceed = Platform.OS === 'web' 
        ? window.confirm(`${message}\n\nDo you want to proceed?`)
        : await new Promise(resolve => {
            Alert.alert(
              'Capacity Warning',
              message,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Proceed', style: 'default', onPress: () => resolve(true) }
              ]
            );
          });

      if (!confirmProceed) return;
    }

    setBulkLoading(true);
    try {
      const response = await apiClient.put(`/subjects/${subjectId}/bulk-enroll-students`, {
        studentIdentifiers: selectedStudents
      });

      const enrollmentSummary = response.data.enrollmentSummary;
      const successCount = enrollmentSummary?.successfullyEnrolled || 0;
      const failedCount = enrollmentSummary?.failed || 0;
      const currentCapacity = enrollmentSummary?.currentCapacity || `${enrolledStudents.length + successCount}/${MAX_STUDENTS}`;

      let message = `Enrollment completed!\n`;
      message += `Successfully enrolled: ${successCount} students\n`;
      if (failedCount > 0) {
        message += `Failed to enroll: ${failedCount} students\n`;
      }
      message += `Current capacity: ${currentCapacity}`;

      if (Platform.OS === 'web') {
        window.alert(`Success: ${message}`);
      } else {
        Alert.alert('Success', message);
      }
      
      setSelectedStudents([]);
      setAddStudentModalVisible(false);
      fetchEnrolledStudents();
      fetchActiveStudents();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to enroll students';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to remove ${studentName} from this subject?`);
      if (!confirmed) return;

      setDeleting(true);
      try {
        await apiClient.put(`/subjects/${subjectId}/unenroll-student/${studentId}`);
        window.alert('Success: Student removed successfully');
        fetchEnrolledStudents();
        fetchActiveStudents(); // Refresh all students to update available list
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to remove student';
        window.alert(`Error: ${errorMessage}`);
      } finally {
        setDeleting(false);
      }
    } else { // Android or iOS
      Alert.alert(
        'Confirm Removal',
        `Are you sure you want to remove ${studentName} from this subject?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                await apiClient.put(`/subjects/${subjectId}/unenroll-student/${studentId}`);
                Alert.alert('Success', 'Student removed successfully');
                fetchEnrolledStudents();
                fetchActiveStudents(); // Refresh all students to update available list
              } catch (error: any) {
                const errorMessage = error.response?.data?.message || 'Failed to remove student';
                Alert.alert('Error', errorMessage);
              } finally {
                setDeleting(false);
              }
            }
          }
        ]
      );
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const isSelected = prev.includes(studentId);
      if (isSelected) {
        return prev.filter(id => id !== studentId);
      } else {
        // Check if adding this student would exceed available slots
        const newSelectionCount = prev.length + 1;
        if (newSelectionCount > availableSlots) {
          const message = `You can only select up to ${availableSlots} more students (${availableSlots} slots available).`;
          if (Platform.OS === 'web') {
            window.alert(message);
          } else {
            Alert.alert('Selection Limit', message);
          }
          return prev;
        }
        return [...prev, studentId];
      }
    });
  };

  const cardStyle = (isDarkMode: boolean) => ({
    backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  });

  const tabStyle = (isActive: boolean, isDarkMode: boolean) => ({
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: isActive ? 2 : 0,
    borderBottomColor: isActive ? '#A78BFA' : 'transparent',
    backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5',
  });

  return (
    <View style={{ flex: 1, padding: 8 }}>
      <View className='flex-row justify-between items-center mb-2'>
        <Text className={`font-pbold mr-auto ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`} style={{ fontSize: 18 }}>
          Members:
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {isAdminOrTeacher && (
            <TouchableOpacity
              className={`${isDarkMode ? 'bg-green-600' : 'bg-green-500'} ${isAtCapacity ? 'opacity-50' : ''}`}
              style={{ padding: 8, borderRadius: 8, marginRight: 4 }}
              onPress={() => setAddStudentModalVisible(true)}
              disabled={isAtCapacity}
            >
              <Image
                source={require('@/assets/icons/add_student.png')}
                style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                tintColor={isDarkMode ? '#E0E0E0' : 'white'}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className={`p-2 rounded-md ${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
            style={{ padding: 8, borderRadius: 8 }}
            onPress={() => {
              fetchEnrolledStudents();
              fetchActiveStudents();
            }}
          >
            <Image
              source={require('@/assets/icons/refresh.png')}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
              tintColor={isDarkMode ? '#E0E0E0' : 'white'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Capacity Indicator */}
      <View style={{
        backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: isAtCapacity ? '#EF4444' : '#10B981',
      }}>
        <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Capacity: {enrolledStudents.length}/{MAX_STUDENTS} students
        </Text>
        {availableSlots > 0 && (
          <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {availableSlots} slots available
          </Text>
        )}
        {isAtCapacity && (
          <Text className={`font-inter_regular text-xs text-red-500`}>
            Subject is at maximum capacity
          </Text>
        )}
      </View>

      {/* Teacher Section */}
      <View style={cardStyle(isDarkMode ?? false)}>
        <Text className={`font-pbold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Teacher:
        </Text>
        <View className='flex-row items-center'>
          <Image
            style={{ width: 40, height: 40, borderRadius: 25, marginRight: 12 }}
            source={teacher?.profilePicture ? { uri: teacher?.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
          />
          <View className='flex-1'>
            <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
              {teacher.middleName
                ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
                : `${teacher.firstName} ${teacher.lastName}`
              }
            </Text>
            <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {teacher.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Students Section */}
      <Text className={`font-pbold text-lg mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
        Students ({enrolledStudents.length}):
      </Text>

      {loading ? (
        <ActivityIndicator size='large' color={isDarkMode ? '#E0E0E0' : 'black'} />
      ) : enrolledStudents.length > 0 ? (
        <ScrollView>
          {enrolledStudents.map((student) => (
            <View key={student._id} style={cardStyle(isDarkMode ?? false)}>
              <View className='flex-row items-center'>
                <Image
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                  source={student.profilePicture ? { uri: student.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                />
                <View className='flex-1'>
                  <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                    {student.middleName
                      ? `${student.firstName} ${student.middleName} ${student.lastName}`
                      : `${student.firstName} ${student.lastName}`
                    }
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {student.email}
                  </Text>
                </View>
                {isAdminOrTeacher && (
                  <TouchableOpacity
                    onPress={() => handleRemoveStudent(student._id, `${student.firstName} ${student.lastName}`)}
                    disabled={deleting}
                    style={{ padding: 8 }}
                  >
                    <DeleteIcon
                      width={20}
                      height={20}
                      fill="red"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text className={`font-inter_regular ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          No students enrolled yet.
        </Text>
      )}

      <Modal
        animationType='fade'
        transparent={true}
        visible={addStudentModalVisible}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <View style={{ backgroundColor: isDarkMode ? '#121212' : 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 600 }}>
            <Text
              className={`font-pbold text-lg text-center ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
              style={{ marginBottom: 12 }}
            >
              Add Students to Subject
            </Text>

            {/* Capacity warning */}
            <View style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6',
              padding: 8,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: availableSlots <= 5 ? '#EF4444' : '#10B981',
            }}>
              <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Available slots: {availableSlots}/{MAX_STUDENTS}
              </Text>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={tabStyle(activeTab === tab.key, isDarkMode ?? false)}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    className={`font-psemibold text-center ${
                      activeTab === tab.key
                        ? 'text-purple-600'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Single Student Tab */}
            {activeTab === 'add_single' && (
              <View>
                <Text className={`font-inter_semibold mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Student Email:
                </Text>
                <TextInput
                  className={`font-inter_regular ${isDarkMode ? 'bg-[#1E1E1E] text-[#E0E0E0]' : 'bg-white text-black'}`}
                  style={{
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#555' : '#DDD',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}
                  placeholder="Enter student email"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isAtCapacity}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      marginRight: 8,
                    }}
                    onPress={() => {
                      setAddStudentModalVisible(false);
                      setEmail('');
                    }}
                  >
                    <Text className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`${isDarkMode ? 'bg-green-600' : 'bg-green-500'} ${isAtCapacity ? 'opacity-50' : ''}`}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    }}
                    onPress={handleAddSingleStudent}
                    disabled={adding || isAtCapacity}
                  >
                    {adding ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                        Add Student
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add Bulk Students Tab */}
            {activeTab === 'add_bulk' && (
              <View >
                <Text className={`font-inter_semibold mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  Available Students:
                </Text>
                <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                  {getAvailableStudents().map((student) => (
                    <View
                      key={student._id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 8,
                        backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
                        marginBottom: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Checkbox
                        value={selectedStudents.includes(student._id)}
                        onValueChange={() => toggleStudentSelection(student._id)}
                        color={selectedStudents.includes(student._id) ? '#A78BFA' : undefined}
                        disabled={isAtCapacity}
                      />
                      <Image
                        style={{ width: 32, height: 32, borderRadius: 16, marginHorizontal: 8 }}
                        source={student.profilePicture ? { uri: student.profilePicture } : require('@/assets/images/sample_profile_picture.png')}
                      />
                      <View className='flex-1'>
                        <Text className={`font-inter_semibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                          {student.middleName
                            ? `${student.firstName} ${student.middleName} ${student.lastName}`
                            : `${student.firstName} ${student.lastName}`
                          }
                        </Text>
                        <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {student.email}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    className={`${isDarkMode ? 'bg-red-500' : 'bg-red-600'}`}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                      marginRight: 8,
                    }}
                    onPress={() => {
                      setAddStudentModalVisible(false);
                      setSelectedStudents([]);
                    }}
                  >
                    <Text className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`${isDarkMode ? 'bg-green-600' : 'bg-green-500'} ${(isAtCapacity || selectedStudents.length === 0) ? 'opacity-50' : ''}`}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    }}
                    onPress={handleBulkAddStudents}
                    disabled={bulkLoading || selectedStudents.length === 0 || isAtCapacity}
                  >
                    {bulkLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className={`font-psemibold ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                        Add {selectedStudents.length} Student(s)
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  )
}

export default MembersModal