import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useDarkMode } from '@/contexts/DarkModeContext';
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

interface Grade {
  _id: string;
  student: User;
  activity: string;
  subject: string;
  quarter: string; // Add the required quarter field
  score: number;
  bonusPoints?: number;
  gradedBy: User;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  _id: string;
  title: string;
  description?: string;
  visibleDate: string;
  deadline: string;
  points: number | null;
  quarter: string; // Add the required quarter field
  createdBy: User;
  subject: any;
  attachmentPath?: string | null;
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

interface UpdateGradeModalProps {
  visible: boolean;
  onClose: () => void;
  grade: Grade | null;
  activity: Activity | null;
  submission: Submission | null;
  onGradeUpdated: () => void;
  getUserFullName: (user: User) => string;
}

const UpdateGradeModal: React.FC<UpdateGradeModalProps> = ({
  visible,
  onClose,
  grade,
  activity,
  submission,
  onGradeUpdated,
  getUserFullName,
}) => {
  const { isDarkMode } = useDarkMode();
  
  const [score, setScore] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [bonusPoints, setBonusPoints] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible && grade) {
      setScore(Math.round(grade.score).toString());
      setComments(grade.comments || '');
      setBonusPoints(grade.bonusPoints ? Math.round(grade.bonusPoints).toString() : '');
    } else {
      // Reset form when modal closes
      setScore('');
      setComments('');
      setBonusPoints('');
    }
  }, [visible, grade]);

  const validateScore = (scoreValue: string, maxPoints: number | null): boolean => {
    if (!scoreValue.trim()) return false;
    const numScore = parseInt(scoreValue, 10);
    if (isNaN(numScore)) return false;
    if (numScore < 0) return false;
    if (maxPoints !== null && numScore > maxPoints) return false;
    return true;
  };

  const validateBonusPoints = (bonusValue: string): boolean => {
    if (!bonusValue.trim()) return true; // Bonus points are optional
    const numBonus = parseInt(bonusValue, 10);
    if (isNaN(numBonus)) return false;
    if (numBonus < 0) return false;
    return true;
  };

  const handleUpdateGrade = async () => {
    if (!grade || !activity || !submission) return;

    const scoreValue = score.trim();
    const bonusValue = bonusPoints.trim();
    const commentsValue = comments.trim();

    // Validation
    if (!validateScore(scoreValue, activity.points)) {
      const errorMsg = activity.points 
        ? `Score must be a whole number between 0 and ${activity.points}`
        : 'Score must be a whole number greater than or equal to 0';
      
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Invalid Score', errorMsg);
      }
      return;
    }

    if (!validateBonusPoints(bonusValue)) {
      const errorMsg = 'Bonus points must be a whole number greater than or equal to 0';
      
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Invalid Bonus Points', errorMsg);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('➡️ Updating grade:', {
        gradeId: grade._id,
        score: parseInt(scoreValue, 10),
        bonusPoints: bonusValue ? parseInt(bonusValue, 10) : undefined,
        comments: commentsValue || undefined
      });

      const response = await apiClient.put(`/grades/${grade._id}`, {
        score: parseInt(scoreValue, 10),
        bonusPoints: bonusValue ? parseInt(bonusValue, 10) : undefined,
        comments: commentsValue || undefined
      });

      console.log('✅ Grade updated successfully:', response.data);

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Grade updated successfully!');
      } else {
        Alert.alert('Success', 'Grade updated successfully!');
      }

      // Call the callback to refresh data
      onGradeUpdated();
      
      // Close modal
      onClose();

    } catch (error: any) {
      console.error('🚨 Error updating grade:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update grade';
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGrade = async () => {
    if (!grade) return;

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this grade? This action cannot be undone.')
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Grade',
            'Are you sure you want to delete this grade? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    setIsSubmitting(true);

    try {
      console.log('➡️ Deleting grade:', grade._id);

      await apiClient.delete(`/grades/${grade._id}`);

      console.log('✅ Grade deleted successfully');

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Grade deleted successfully!');
      } else {
        Alert.alert('Success', 'Grade deleted successfully!');
      }

      // Call the callback to refresh data
      onGradeUpdated();
      
      // Close modal
      onClose();

    } catch (error: any) {
      console.error('🚨 Error deleting grade:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete grade';
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!grade || !activity || !submission) return null;

  // Fix the total score calculation - only add bonus points if they exist and are greater than 0
  const totalScore = parseInt(score || '0', 10) + (bonusPoints && parseInt(bonusPoints, 10) > 0 ? parseInt(bonusPoints, 10) : 0);
  const isFormValid = validateScore(score, activity.points) && validateBonusPoints(bonusPoints);

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
          padding: 16, // Increased padding
        }}
      >
        <View
          style={{
            backgroundColor: isDarkMode ? '#23272F' : '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 500,
            maxHeight: '85%', // Reduced max height to ensure buttons are visible
            overflow: 'hidden',
            flex: 1, // Allow modal to grow but respect maxHeight
          }}
        >
          {/* Fixed Header */}
          <View style={{ 
            padding: 20, 
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#333' : '#E5E5E5'
          }}>
            <Text
              className={`font-pbold text-xl ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
            >
              Update Grade
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: 20, 
              paddingTop: 15,
              paddingBottom: 10,
              flexGrow: 1 
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Student Info */}
            <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F3F4F6' }}>
              <View className='flex-row mb-2'>
                <Image
                  style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                  source={
                    submission.student.profilePicture
                      ? { uri: submission.student.profilePicture }
                      : require('@/assets/images/sample_profile_picture.png')
                  }
                />
                <View className='flex-1'>
                  <Text 
                    className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}
                    ellipsizeMode='tail'
                    numberOfLines={2}
                  >
                    {getUserFullName(submission.student)}
                  </Text>
                  <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {submission.student.email}
                  </Text>
                </View>
              </View>
              <Text className={`font-inter_semibold text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Activity: {activity.title}
              </Text>
              <Text className={`font-inter_regular text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Quarter: {activity.quarter}
              </Text>
            </View>

            {/* Score Input */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Score: <Text className='text-red-500'>*</Text>
              </Text>
              <View className='flex-row items-center mb-2'>
                <TextInput
                  className={`border rounded-md px-3 py-3 mr-2 font-inter_regular text-base ${
                    isDarkMode ? 'border-gray-600 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'
                  }`}
                  style={{ width: 100, height: 50 }}
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={score}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setScore(numericValue);
                  }}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
                <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  / {activity.points || '∞'}
                </Text>
              </View>
              {activity.points && score && (
                <Text className={`font-inter_regular text-sm ${
                  validateScore(score, activity.points) 
                    ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                    : (isDarkMode ? 'text-red-400' : 'text-red-600')
                }`}>
                  {validateScore(score, activity.points) ? '✓ Valid' : '✗ Invalid score'}
                </Text>
              )}
            </View>

            {/* Bonus Points Input */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Bonus Points (Optional):
              </Text>
              <View className='flex-row items-center mb-2'>
                <TextInput
                  className={`border rounded-md px-3 py-3 mr-2 font-inter_regular text-base ${
                    isDarkMode ? 'border-gray-600 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'
                  }`}
                  style={{ width: 100, height: 50 }}
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={bonusPoints}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setBonusPoints(numericValue);
                  }}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>
              {bonusPoints && (
                <Text className={`font-inter_regular text-sm ${
                  validateBonusPoints(bonusPoints) 
                    ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                    : (isDarkMode ? 'text-red-400' : 'text-red-600')
                }`}>
                  {validateBonusPoints(bonusPoints) ? '✓ Valid' : '✗ Invalid bonus points'}
                </Text>
              )}
            </View>

            {/* Total Score Display */}
            {(score || bonusPoints) && (
              <View className='mb-4 p-3 rounded-lg' style={{ backgroundColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }}>
                <Text className={`font-inter_semibold text-base ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Total Score: {Math.round(totalScore)}
                  {activity.points && ` / ${activity.points}`}
                  {bonusPoints && parseFloat(bonusPoints) > 0 && ` (${score || 0} + ${bonusPoints} bonus)`}
                </Text>
              </View>
            )}

            {/* Comments Input */}
            <View className='mb-4'>
              <Text className={`font-inter_semibold text-base mb-2 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                Comments (Optional):
              </Text>
              <TextInput
                className={`border rounded-md px-3 py-3 font-inter_regular text-base ${
                  isDarkMode ? 'border-gray-600 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'
                }`}
                multiline
                numberOfLines={4}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                placeholder="Enter feedback or comments..."
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={comments}
                onChangeText={setComments}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>

          {/* Fixed Action Buttons at Bottom */}
          <View 
            style={{ 
              padding: 20, 
              paddingTop: 15,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? '#333' : '#E5E5E5',
              backgroundColor: isDarkMode ? '#23272F' : '#fff', // Ensure background matches
            }}
          >
            <View className='flex-row justify-between'>
              <View className='flex-row'>
                <TouchableOpacity
                  className={`${isDarkMode ? 'bg-red-600' : 'bg-red-500'} mr-2`}
                  onPress={handleDeleteGrade}
                  disabled={isSubmitting}
                  style={{ borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 }}
                >
                  <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Delete
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'}`}
                  onPress={onClose}
                  disabled={isSubmitting}
                  style={{ borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 }}
                >
                  <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className={`${
                  isSubmitting || !isFormValid
                    ? 'bg-gray-400'
                    : (isDarkMode ? 'bg-blue-600' : 'bg-blue-500')
                }`}
                onPress={handleUpdateGrade}
                disabled={isSubmitting || !isFormValid}
                style={{ borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 }}
              >
                {isSubmitting ? (
                  <View className='flex-row items-center'>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                      Updating...
                    </Text>
                  </View>
                ) : (
                  <Text className={`font-psemibold text-base ${isDarkMode ? 'text-[#E0E0E0]' : 'text-white'}`}>
                    Update Grade
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateGradeModal;