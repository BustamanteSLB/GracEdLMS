import React, { useEffect, useState } from 'react'
import { Subject } from '@/app/types/index';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity, ActivityIndicator } from 'react-native'
import SubjectDetailsTabs from '@/components/SubjectDetailsTabs';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { useDarkMode } from '@/contexts/DarkModeContext';
import apiClient from '@/app/services/apiClient';
import { SafeAreaView } from 'react-native-safe-area-context';

cssInterop(Image, { className: 'style' });

const SubjectDetailsAndroid = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();

  // Get the subject ID from the route parameters
  const params = useLocalSearchParams();
  const subjectId = params.id as string;
  
  // State for fetched subject data
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subject data on mount
  useEffect(() => {
    const fetchSubject = async () => {
      if (!subjectId) {
        setError('No subject ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get(`/subjects/${subjectId}`);
        setViewingSubject(response.data.data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch subject:', err);
        setError(err.response?.data?.message || 'Failed to load subject details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [subjectId]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} mt-4 font-inter_regular`}>
          Loading subject details...
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !viewingSubject) {
    return (
      <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} justify-center items-center px-4`}>
        <Image
          className="w-[100] h-[100] mb-4"
          contentFit="contain"
          source={require('@/assets/icons/error.png')}
          tintColor={isDarkMode ? '#EF4444' : '#DC2626'}
        />
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} font-inter_bold text-lg mb-2`}>
          Failed to Load Subject
        </Text>
        <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-inter_regular text-center mb-4`}>
          {error || 'Subject not found'}
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/(teachers)/subjects')} 
          className="p-3 bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-inter_semibold">Back to My Subjects</Text>
        </TouchableOpacity>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Calculate adviser name using the teachers array (same logic as web version)
  const adviserInfo = viewingSubject.teachers?.map((ta: any) => {
    const teacher = ta.teacher as any;
    if (!teacher) return null;
    
    const fullName = teacher?.middleName
      ? `${teacher.firstName} ${teacher.middleName} ${teacher.lastName}`
      : `${teacher.firstName} ${teacher.lastName}`;
    
    // If assigned to all quarters, just show name
    if (ta.isAssignedToAllQuarters) {
      return fullName;
    }
    
    // Otherwise, show name with quarters
    const quarters = [];
    if (ta.quarters?.firstQuarter) quarters.push("1st");
    if (ta.quarters?.secondQuarter) quarters.push("2nd");
    if (ta.quarters?.thirdQuarter) quarters.push("3rd");
    if (ta.quarters?.fourthQuarter) quarters.push("4th");
    
    if (quarters.length > 0) {
      return `${fullName} (${quarters.join(", ")} Quarter${quarters.length > 1 ? "s" : ""})`;
    }
    return fullName;
  }).filter(Boolean).join(", ") || "Not assigned";

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on subject name
  const getConsistentColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };
  const bgColor = getConsistentColor(viewingSubject.subjectName);
  
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className='flex-row mb-4 mt-4 items-center'>
          <TouchableOpacity
            onPress={() => router.push('/(teachers)/subjects')}
            style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#E0E0E0' }}
            className="rounded-full p-2 ml-4 mt-2"
          >
            <View className="flex-row items-center">
              <Image
                style={{ width: 24, height: 24}}
                source={require('@/assets/icons/back.png')}
                tintColor={isDarkMode ? '#E0E0E0' : 'gray'}
              />
            </View>
          </TouchableOpacity>

          {/* Subject Image or Colored Initials */}
          {viewingSubject.subjectImage ? (
            <Image
              source={{ uri: viewingSubject.subjectImage }}
              className="w-[56px] h-[56px] rounded-lg ml-4"
              contentFit="cover"
            />
          ) : (
            <View
              style={{ backgroundColor: bgColor }}
              className='w-[56px] h-[56px] rounded-lg justify-center items-center ml-4'
            >
              <Text className='text-white font-inter_bold text-xl'>
                {getInitials(viewingSubject.subjectName)}
              </Text>
            </View>
          )}

          <View className='ml-3 flex-col flex-1'>
            <Text className="font-inter_bold text-xl" style={{ color: isDarkMode ? '#E0E0E0' : '#121212' }} ellipsizeMode="tail" numberOfLines={1}>
              {viewingSubject.subjectName}
            </Text>
            <Text className="font-inter_regular text-sm" style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} ellipsizeMode="tail" numberOfLines={2}>
              Adviser: {adviserInfo}
            </Text>
            <Text className="font-inter_regular text-xs" style={{ color: isDarkMode ? '#6B7280' : '#9CA3AF' }} ellipsizeMode="tail" numberOfLines={1}>
              {viewingSubject.gradeLevel} - {viewingSubject.section} {viewingSubject.schoolYear && `(${viewingSubject.schoolYear})`}
            </Text>
          </View>
        </View>
        
        <View className="px-4 pb-4">
          <SubjectDetailsTabs 
            subject={viewingSubject} 
            isDarkMode={isDarkMode} 
            isAdminOrTeacher={true} // For Teachers
            isStudentOrTeacher={true}
          />
        </View>
      </ScrollView>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default SubjectDetailsAndroid