import { ActivityIndicator, Alert, Text, View, useColorScheme } from 'react-native';;
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import CustomButton from '@/components/CustomButton';
import EditIcon from '@/assets/icons/edit.svg';
import DeleteIcon from '@/assets/icons/delete.svg';

const ManageTeachersAndroid = () => {

  interface UserListApiResponse extends ApiResponse {
    data?: User[]; // Expecting an array of User objects in the data field
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [teachers, setTeachers] = useState<User[]>([]); // State to hold the list of teachers
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [deletingId, setDeletingId] = useState<string | null>(null); // State to track which item is being deleted

  // Fetch teachers from the API
  // Using useCallback to memoize the fetch function
  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // Make API call to fetch users with role 'Teacher'
      const response = await apiClient.get<UserListApiResponse>('/users', {
        params: { role: 'Teacher' }, // Pass role as a query parameter
      });

      if (response.data.success && response.data.data) {
        setTeachers(response.data.data); // Set the fetched list of teachers
      } else {
        // Handle API response success: false
        setError(response.data.message || 'Failed to fetch teachers.');
      }
    } catch (err: any) {
      // Handle network or API call errors
      console.error('Error fetching teachers:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching teachers.'
      );
    } finally {
      setLoading(false); // Set loading to false after fetch
    }
  }, []); // Empty dependency array means this function is created once

  // useEffect to call fetchTeachers when the component mounts
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]); // Dependency on fetchTeachers memoized function

  // Function for soft-deleting a teacher
  const handleDeleteTeacher = (teacherId: string) => {
    Alert.alert(
      'Delete Teacher?',
      'Are you sure you want to delete this teacher account? It will be archived.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            setDeletingId(teacherId); // Set state to show loading on this specific item
            try {
              const response = await apiClient.delete<ApiResponse>(`/users/${teacherId}`);
  
              if (response.data.success) {
                Alert.alert('Success', 'Teacher account archived successfully.');
                // Update the local state to remove the soft-deleted teacher
                setTeachers((prevTeachers) =>
                  prevTeachers.filter((teacher) => teacher._id !== teacherId)
                );
              } else {
                Alert.alert('Error', response.data.message || 'Failed to archive teacher.');
              }
            } catch (err: any) {
              console.error('Error archiving teacher:', err);
              Alert.alert(
                'Error',
                err.response?.data?.message || err.message || 'An error occurred during archival.'
              );
            } finally {
              setDeletingId(null); // Clear deleting state
            }
          },
            style: 'destructive', // Makes the button red on iOS
        },
      ],
      { cancelable: false } // User must choose an option
    );
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={isDarkMode ? '#E0E0E0' : '#000000'} />
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{`Loading Teachers...`}</Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }
    
  if (error) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}>
        <Text className={`font-inter_regular text-center text-red-500 ${isDarkMode ? 'text-red-400' : 'text-red-600'} `}>
          {`Error: ${error}`}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }
    
  if (teachers.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/teacher_background.png')}
        />
        <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
          {`No teacher accounts found.`}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  cssInterop(Image, { className: "style" });

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <Text className={`font-inter_bold text-lg ml-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>List of Teachers:</Text>
      <FlashList
        data={teachers}
        renderItem={({ item }: { item: User }) => {
          // Check if the item is the one being deleted
          const isCurrentItemDeleting = deletingId === item._id;
          return (
            <View className={`flex-row items-center p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Image
                source={ item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')} // Assuming profilePicture is a URL
                className="w-12 h-12 rounded-full "
                contentFit="cover"
              />
              <View className='flex-column ml-2 flex-shrink'>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.firstName} {item.lastName}</Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{item.email}</Text>
              </View>

              <View className='ml-auto flex-row'>
                <CustomButton
                  containerStyles='bg-secondary-android h-[50px] mr-2 p-2'
                  handlePress={() => console.log('Edit button pressed')}
                  iconVector={<EditIcon width={24} height={24}/>}
                  title='Edit'
                />
                <CustomButton
                  containerStyles='bg-red-600 h-[50px] p-2'
                  handlePress={() => handleDeleteTeacher(item._id)}
                  iconVector={<DeleteIcon width={24} height={24}/>}
                  title={isCurrentItemDeleting ? 'Deleting...' : 'Delete'}
                  isLoading={isCurrentItemDeleting}
                />
              </View>
            </View>
          )
        }}
        keyExtractor={(item) => item._id} // Unique key for each item
        estimatedItemSize={50} // Estimate item size for performance (adjust as needed)
        extraData={isDarkMode}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default ManageTeachersAndroid