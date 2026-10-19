import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useDarkMode } from '@/contexts/DarkModeContext';
import AttachIcon from '@/assets/icons/attach.svg';
import apiClient from '@/app/services/apiClient';

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
  teachers: Array<{
    teacher: User;
    terms: {
      1: boolean,
      2: boolean,
      3: boolean,
    };
    isAssignedToAllTerms: boolean;
  }>;
  section: string;
  gradeLevel: string;
  schoolYear: string;
  status: 'active' | 'inactive' | 'archived';
  subjectImage?: string;
}

interface Grade {
  _id: string;
  student: User;
  activity: string;
  subject: string;
  term: string;
  score: number;
  bonusPoints?: number;
  gradedBy: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface Submission {
  _id: string;
  student: User;
  submissionDate: string;
  attachmentPaths?: string[];
  status: 'submitted' | 'graded' | 'pending' | 'unsubmitted';
  grade?: number | null;
  feedback?: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  term: string;
  createdBy: User;
  subject: Subject;
  attachmentPath?: string | null;
  grades?: Grade[];
  createdAt: string;
  updatedAt: string;
}

interface ViewSubmissionsModalWebProps {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  submissions: Submission[];
  loading: boolean;
  formatDate: (dateString: string) => string;
  getUserFullName: (user: User) => string;
  onGradeUpdated?: () => void;
}

interface GradingState {
  [submissionId: string]: {
    score: string;
    bonusPoints: string;
    comments: string;
    isSubmitting: boolean;
  };
}

const ViewSubmissionsModalWeb: React.FC<ViewSubmissionsModalWebProps> = ({
  visible,
  onClose,
  activity,
  submissions,
  loading,
  formatDate,
  getUserFullName,
  onGradeUpdated,
}) => {
  const { isDarkMode } = useDarkMode();
  const [fileLoadError, setFileLoadError] = useState<{[key: string]: boolean}>({});
  const [gradingState, setGradingState] = useState<GradingState>({});
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const getFileUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('https://storage.googleapis.com/') || 
        fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
      return fileUrl;
    }
    if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      console.warn('Legacy file path detected:', fileUrl);
      return null;
    }
    return fileUrl;
  };

  const handleFileError = (fileUrl: string) => {
    console.warn('Failed to load file:', fileUrl);
    setFileLoadError(prev => ({ ...prev, [fileUrl]: true }));
  };

  const initializeGradingState = (submissionId: string, existingGrade?: Grade) => {
    if (!gradingState[submissionId]) {
      setGradingState(prev => ({
        ...prev,
        [submissionId]: {
          score: existingGrade ? existingGrade.score.toString() : '',
          bonusPoints: existingGrade?.bonusPoints ? existingGrade.bonusPoints.toString() : '',
          comments: existingGrade?.comments || '',
          isSubmitting: false,
        }
      }));
    }
  };

  const updateGradingField = (submissionId: string, field: keyof Omit<GradingState[string], 'isSubmitting'>, value: string) => {
    setGradingState(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      }
    }));
  };

  const handleGradeSubmission = async (submission: Submission) => {
    if (!activity) return;

    const state = gradingState[submission._id];
    if (!state) return;

    const scoreValue = state.score.trim();
    const bonusValue = state.bonusPoints.trim();
    const commentsValue = state.comments.trim();

    // Validation
    if (!scoreValue) {
      const msg = 'Please enter a score';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    const score = parseInt(scoreValue, 10);
    if (isNaN(score) || score < 0) {
      const msg = 'Score must be a positive number';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    if (activity.points !== null && score > activity.points) {
      const msg = `Score cannot exceed ${activity.points} points`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    const bonusPoints = bonusValue ? parseInt(bonusValue, 10) : undefined;
    if (bonusValue && (isNaN(bonusPoints!) || bonusPoints! < 0)) {
      const msg = 'Bonus points must be a positive number';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    // Check if grade already exists
    const existingGrade = activity.grades?.find(g => g.student._id === submission.student._id);

    try {
      setGradingState(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], isSubmitting: true }
      }));

      const term = ["1", "2", "3"].includes(String(activity.term))
        ? String(activity.term)
        : "1";

      if (existingGrade) {
        // Update existing grade
        await apiClient.put(`/grades/${existingGrade._id}`, {
          score,
          bonusPoints,
          comments: commentsValue || undefined,
          term,
        });
      } else {
        // Create new grade
        await apiClient.post(`/activities/${activity._id}/grades`, {
          studentId: submission.student._id,
          score,
          bonusPoints,
          comments: commentsValue || undefined,
          term,
        });
      }

      // Reset the grading state for this submission to force re-initialization with new data
      setGradingState(prev => {
        const newState = { ...prev };
        delete newState[submission._id];
        return newState;
      });

      // Call parent refresh
      if (onGradeUpdated) {
        await onGradeUpdated();
      }

    } catch (error: any) {
      console.error('Error grading submission:', error);
      const msg = error.response?.data?.message || 'Failed to submit grade';
      Platform.OS === 'web' ? window.alert('Error: ' + msg) : Alert.alert('Error', msg);
    } finally {
      setGradingState(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], isSubmitting: false }
      }));
    }
  };

  const handleDeleteGrade = async (gradeId: string, submissionId: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this grade?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Grade',
            'Are you sure you want to delete this grade?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setGradingState(prev => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], isSubmitting: true }
      }));

      await apiClient.delete(`/grades/${gradeId}`);
      
      const msg = 'Grade deleted successfully!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Success', msg);

      // Reset the grading state for this submission
      setGradingState(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });

      // Call parent refresh
      if (onGradeUpdated) {
        await onGradeUpdated();
      }

    } catch (error: any) {
      console.error('Error deleting grade:', error);
      const msg = error.response?.data?.message || 'Failed to delete grade';
      Platform.OS === 'web' ? window.alert('Error: ' + msg) : Alert.alert('Error', msg);
    } finally {
      setGradingState(prev => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], isSubmitting: false }
      }));
    }
  };

  // Add useEffect to reset state when activity changes
  React.useEffect(() => {
    if (visible && activity) {
      // Reset grading state when modal opens or activity changes
      setGradingState({});
      setExpandedSubmissions(new Set());
    }
  }, [visible, activity?._id]);

  const getStudentGrade = (studentId: string): Grade | undefined => {
    return activity?.grades?.find(g => g.student._id === studentId);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 12,
            width: '95%',
            maxWidth: 900,
            maxHeight: '90%',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ 
                marginTop: 16, 
                fontFamily: 'Inter-Regular',
                color: isDarkMode ? '#9CA3AF' : '#6B7280' 
              }}>
                Loading submissions...
              </Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View
                style={{
                  backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: 'Inter-Bold',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    marginBottom: 8,
                  }}
                >
                  Submissions for "{activity?.title}"
                </Text>

                {activity && (
                  <View>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: 4,
                    }}>
                      {activity.subject.subjectName} • {activity.subject.section} • {activity.term === '1' ? '1st Term' : activity.term === '2' ? '2nd Term' : '3rd Term'}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontFamily: 'Inter-Regular',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    }}>
                      Deadline: {formatDate(activity.deadline)} • {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Content */}
              {submissions.length > 0 ? (
                <ScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={{ padding: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {submissions.map((submission) => {
                    const existingGrade = getStudentGrade(submission.student._id);
                    const isExpanded = expandedSubmissions.has(submission._id);
                    
                    // Initialize grading state if not exists
                    if (isExpanded && !gradingState[submission._id]) {
                      initializeGradingState(submission._id, existingGrade);
                    }

                    const state = gradingState[submission._id];
                    const totalScore = state ? 
                      parseInt(state.score || '0', 10) + parseInt(state.bonusPoints || '0', 10) : 
                      existingGrade ? existingGrade.score + (existingGrade.bonusPoints || 0) : 0;

                    return (
                      <View
                        key={submission._id}
                        style={{
                          backgroundColor: isDarkMode ? '#23272F' : '#FFFFFF',
                          borderRadius: 12,
                          marginBottom: 16,
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#333333' : '#E5E7EB',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Submission Header */}
                        <TouchableOpacity
                          onPress={() => toggleExpanded(submission._id)}
                          style={{
                            padding: 16,
                            borderLeftWidth: 4,
                            borderLeftColor: existingGrade ? '#8B5CF6' : '#3B82F6',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Image
                                style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                                source={
                                  submission.student.profilePicture
                                    ? { uri: submission.student.profilePicture }
                                    : require('@/assets/images/sample_profile_picture.png')
                                }
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={{ 
                                  fontSize: 16, 
                                  fontFamily: 'Inter-SemiBold',
                                  color: isDarkMode ? '#F9FAFB' : '#111827',
                                }}>
                                  {getUserFullName(submission.student)}
                                </Text>
                                <Text style={{ 
                                  fontSize: 13, 
                                  fontFamily: 'Inter-Regular',
                                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                }}>
                                  {submission.student.email}
                                </Text>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                              {existingGrade ? (
                                <View>
                                  <Text style={{ 
                                    fontSize: 18, 
                                    fontFamily: 'Inter-Bold',
                                    color: '#8B5CF6',
                                    textAlign: 'right',
                                  }}>
                                    {totalScore}{activity?.points && ` / ${activity.points}`}
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor: '#8B5CF6',
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 12,
                                      marginTop: 4,
                                    }}
                                  >
                                    <Text style={{ 
                                      color: 'white', 
                                      fontSize: 11, 
                                      fontFamily: 'Inter-SemiBold' 
                                    }}>
                                      GRADED
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <View
                                  style={{
                                    backgroundColor: '#3B82F6',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                  }}
                                >
                                  <Text style={{ 
                                    color: 'white', 
                                    fontSize: 11, 
                                    fontFamily: 'Inter-SemiBold' 
                                  }}>
                                    SUBMITTED
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <View style={{ padding: 16, paddingTop: 0 }}>
                            {/* Submission Details */}
                            <View style={{ marginBottom: 16 }}>
                              <Text style={{ 
                                fontSize: 13, 
                                fontFamily: 'Inter-Regular',
                                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                marginBottom: 12,
                              }}>
                                Submitted: {formatDate(submission.submissionDate)}
                              </Text>

                              {/* Attached Files */}
                              {submission.attachmentPaths && submission.attachmentPaths.length > 0 && (
                                <View>
                                  <Text style={{ 
                                    fontSize: 14, 
                                    fontFamily: 'Inter-SemiBold',
                                    color: isDarkMode ? '#F9FAFB' : '#111827',
                                    marginBottom: 8,
                                  }}>
                                    Submitted Files:
                                  </Text>
                                  {submission.attachmentPaths.map((path, fileIdx) => {
                                    const fileUrl = getFileUrl(path);
                                    
                                    if (!fileUrl || fileLoadError[fileUrl]) {
                                      return (
                                        <View
                                          key={fileIdx}
                                          style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginBottom: 8,
                                            padding: 10,
                                            backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                                            borderRadius: 8,
                                          }}
                                        >
                                          <AttachIcon 
                                            width={18} 
                                            height={18} 
                                            style={{ marginRight: 8 }} 
                                            fill={isDarkMode ? '#6B7280' : '#9CA3AF'} 
                                          />
                                          <Text style={{ 
                                            fontSize: 13, 
                                            fontFamily: 'Inter-Regular',
                                            color: isDarkMode ? '#6B7280' : '#9CA3AF' 
                                          }}>
                                            File unavailable
                                          </Text>
                                        </View>
                                      );
                                    }

                                    return (
                                      <TouchableOpacity
                                        key={fileIdx}
                                        onPress={() => {
                                          try {
                                            if (Platform.OS === 'web') {
                                              window.open(fileUrl, '_blank');
                                            }
                                          } catch (error) {
                                            console.error('Failed to open file:', error);
                                            handleFileError(fileUrl);
                                          }
                                        }}
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          marginBottom: 8,
                                          padding: 10,
                                          backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                                          borderRadius: 8,
                                        }}
                                      >
                                        <AttachIcon 
                                          width={18} 
                                          height={18} 
                                          style={{ marginRight: 8 }} 
                                          fill="#3B82F6"
                                        />
                                        <Text style={{ 
                                          fontSize: 13, 
                                          fontFamily: 'Inter-Regular',
                                          color: '#3B82F6',
                                          textDecorationLine: 'underline',
                                        }}>
                                          {fileUrl.split('/').pop() || 'Download file'}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              )}
                            </View>

                            {/* Grading Section */}
                            <View 
                              style={{
                                backgroundColor: isDarkMode ? '#1A1A1A' : '#F9FAFB',
                                borderRadius: 8,
                                padding: 16,
                              }}
                            >
                              <Text style={{ 
                                fontSize: 16, 
                                fontFamily: 'Inter-Bold',
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                                marginBottom: 16,
                              }}>
                                {existingGrade ? 'Update Grade' : 'Grade Submission'}
                              </Text>

                              {/* Score Input */}
                              <View style={{ marginBottom: 12 }}>
                                <Text style={{ 
                                  fontSize: 13, 
                                  fontFamily: 'Inter-SemiBold',
                                  color: isDarkMode ? '#F9FAFB' : '#111827',
                                  marginBottom: 6,
                                }}>
                                  Score <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <TextInput
                                    value={state?.score || ''}
                                    onChangeText={(text) => updateGradingField(submission._id, 'score', text.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                    style={{
                                      width: 100,
                                      height: 44,
                                      backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                      borderWidth: 1,
                                      borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                      borderRadius: 8,
                                      paddingHorizontal: 12,
                                      fontSize: 15,
                                      fontFamily: 'Inter-Regular',
                                      color: isDarkMode ? '#F9FAFB' : '#111827',
                                      marginRight: 12,
                                    }}
                                  />
                                  <Text style={{ 
                                    fontSize: 15, 
                                    fontFamily: 'Inter-SemiBold',
                                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                  }}>
                                    / {activity?.points || '∞'}
                                  </Text>
                                </View>
                              </View>

                              {/* Bonus Points Input */}
                              <View style={{ marginBottom: 12 }}>
                                <Text style={{ 
                                  fontSize: 13, 
                                  fontFamily: 'Inter-SemiBold',
                                  color: isDarkMode ? '#F9FAFB' : '#111827',
                                  marginBottom: 6,
                                }}>
                                  Bonus Points (Optional)
                                </Text>
                                <TextInput
                                  value={state?.bonusPoints || ''}
                                  onChangeText={(text) => updateGradingField(submission._id, 'bonusPoints', text.replace(/[^0-9]/g, ''))}
                                  keyboardType="numeric"
                                  placeholder="0"
                                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                  style={{
                                    width: 100,
                                    height: 44,
                                    backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    fontSize: 15,
                                    fontFamily: 'Inter-Regular',
                                    color: isDarkMode ? '#F9FAFB' : '#111827',
                                  }}
                                />
                              </View>

                              {/* Total Score Display */}
                              {state && (state.score || state.bonusPoints) && (
                                <View 
                                  style={{
                                    backgroundColor: '#8B5CF6',
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 12,
                                  }}
                                >
                                  <Text style={{ 
                                    fontSize: 15, 
                                    fontFamily: 'Inter-Bold',
                                    color: 'white',
                                  }}>
                                    Total Score: {totalScore}
                                    {activity?.points && ` / ${activity.points}`}
                                    {state.bonusPoints && parseInt(state.bonusPoints) > 0 && (
                                      ` (${state.score || 0} + ${state.bonusPoints} bonus)`
                                    )}
                                  </Text>
                                </View>
                              )}

                              {/* Comments Input */}
                              <View style={{ marginBottom: 16 }}>
                                <Text style={{ 
                                  fontSize: 13, 
                                  fontFamily: 'Inter-SemiBold',
                                  color: isDarkMode ? '#F9FAFB' : '#111827',
                                  marginBottom: 6,
                                }}>
                                  Comments (Optional)
                                </Text>
                                <TextInput
                                  value={state?.comments || ''}
                                  onChangeText={(text) => updateGradingField(submission._id, 'comments', text)}
                                  multiline
                                  numberOfLines={3}
                                  placeholder="Enter feedback..."
                                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                  style={{
                                    backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDarkMode ? '#404040' : '#D1D5DB',
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    fontSize: 14,
                                    fontFamily: 'Inter-Regular',
                                    color: isDarkMode ? '#F9FAFB' : '#111827',
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                  }}
                                />
                              </View>

                              {/* Action Buttons */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                {existingGrade && (
                                  <TouchableOpacity
                                    onPress={() => handleDeleteGrade(existingGrade._id, submission._id)}
                                    disabled={state?.isSubmitting}
                                    style={{
                                      backgroundColor: '#EF4444',
                                      borderRadius: 8,
                                      paddingVertical: 10,
                                      paddingHorizontal: 16,
                                      opacity: state?.isSubmitting ? 0.5 : 1,
                                    }}
                                  >
                                    <Text style={{ 
                                      fontSize: 14, 
                                      fontFamily: 'Inter-SemiBold',
                                      color: 'white',
                                    }}>
                                      Delete Grade
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity
                                  onPress={() => handleGradeSubmission(submission)}
                                  disabled={state?.isSubmitting || !state?.score}
                                  style={{
                                    backgroundColor: !state?.score || state?.isSubmitting ? '#9CA3AF' : '#10B981',
                                    borderRadius: 8,
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginLeft: 'auto',
                                  }}
                                >
                                  {state?.isSubmitting && (
                                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                                  )}
                                  <Text style={{ 
                                    fontSize: 14, 
                                    fontFamily: 'Inter-SemiBold',
                                    color: 'white',
                                  }}>
                                    {state?.isSubmitting ? 'Saving...' : existingGrade ? 'Update Grade' : 'Submit Grade'}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {/* Existing Grade Info */}
                              {existingGrade && (
                                <View 
                                  style={{
                                    marginTop: 12,
                                    padding: 10,
                                    backgroundColor: isDarkMode ? '#2A2A2A' : '#F3F4F6',
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text style={{ 
                                    fontSize: 12, 
                                    fontFamily: 'Inter-Regular',
                                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                  }}>
                                    Graded by {getUserFullName(existingGrade.gradedBy)} on {formatDate(existingGrade.createdAt)}
                                  </Text>
                                  {existingGrade.comments && (
                                    <Text style={{ 
                                      fontSize: 12, 
                                      fontFamily: 'Inter-Regular',
                                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                      marginTop: 4,
                                    }}>
                                      Previous comment: "{existingGrade.comments}"
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <Image
                    style={{ width: 80, height: 80, marginBottom: 16, opacity: 0.5 }}
                    source={require('@/assets/images/no_results.png')}
                  />
                  <Text style={{ 
                    fontSize: 16, 
                    fontFamily: 'Inter-SemiBold',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    textAlign: 'center',
                  }}>
                    No submissions yet
                  </Text>
                </View>
              )}

              {/* Footer */}
              <View
                style={{
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: isDarkMode ? '#333333' : '#E5E7EB',
                  backgroundColor: isDarkMode ? '#23272F' : '#F9FAFB',
                }}
              >
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    alignSelf: 'flex-end',
                  }}
                >
                  <Text style={{ 
                    fontSize: 14, 
                    fontFamily: 'Inter-SemiBold',
                    color: 'white',
                  }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ViewSubmissionsModalWeb;