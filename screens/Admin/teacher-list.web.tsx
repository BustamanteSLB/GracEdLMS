import { ActivityIndicator, Text, TouchableOpacity, View, VirtualizedList, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { cssInterop } from 'nativewind'
import { Image } from 'expo-image'
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User } from '@/app/types/index';
import EditIcon from '@/assets/icons/edit.svg';
import DeleteIcon from '@/assets/icons/delete.svg';
import { router } from 'expo-router'

const ManageTeachersWeb = () => {

  interface UserListApiResponse extends ApiResponse {
    data?: User[]; // Expecting an array of User objects in the data field
    // Include pagination or other fields if your API returns them
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

  // Function for adding an teacher
  const handleAddTeacher = () => {
    router.push('/(admins)/add-teacher'); // Adjust this path based on your expo-router structure
  }

  // Function for editing an teacher
  const handleEditTeacher = (teacherId: string) => {
    router.push({
      pathname: "/(admins)/edit-teacher", // Adjust this path based on your expo-router structure
      params: { id: teacherId }
    });
  }

  // Function for soft-deleting a teacher
  const handleDeleteTeacher = (teacherId: string) => {
    const confirmDelete = window.confirm (
      'Are you sure you want to delete this teacher account? It will be archived.'
    );

    if (confirmDelete) {
      const deleteTeacher = async () => {
        setDeletingId(teacherId); // Set state to show loading on this specific item
        try {
          const response = await apiClient.delete<ApiResponse>(`/users/${teacherId}`);

          if (response.data.success) {
            window.alert('Success: Teacher account archived successfully.');
            // Update the local state to remove the soft-deleted teacher
            setTeachers((prevTeachers) =>
              prevTeachers.filter((teacher) => teacher._id !== teacherId)
            );
          } else {
            window.alert('Error: ' + (response.data.message || 'Failed to archive teacher.'));
          }
        } catch (err: any) {
          console.error('Error archiving teacher:', err);
          window.alert(
            'Error: ' + (err.response?.data?.message || err.message || 'An error occurred during archival.')
          );
        } finally {
          setDeletingId(null); // Clear deleting state
        }
      };

      deleteTeacher();
    }
  };

  cssInterop(Image, { className: "style" });

  // --- VirtualizedList specific functions ---
  const getItemCount = (_data: User[] | null | undefined) => _data ? _data.length : 0;

  const getItem = (_data: User[] | null | undefined, index: number): User => {
    // VirtualizedList requires a function to get the item at a specific index
    // We assert that _data is not null/undefined based on getItemCount
    return (_data as User[])[index];
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

  // If not loading, no error, and admins exist, render the VirtualizedList
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <View className='flex-row mt-2'>
        <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
          Teachers List
        </Text>
        <TouchableOpacity
          className='rounded-xl h-[50px] justify-center items-center ml-auto mr-3 p-2'
          onPress={() => handleAddTeacher()}
          activeOpacity={0.7}
          style={{ backgroundColor:'#60a5fa' }}
        >
          <View className='flex-row'>
            <Text className='text-black font-psemibold text-lg'>
              Add Teacher
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <VirtualizedList
        data={teachers}
        renderItem={({ item }: { item: User }) => {
          // Check if the item is the one being deleted
          const isCurrentItemDeleting = deletingId === item._id;
          return (
            <View className={`flex-row items-center p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Image
                source={ item.profilePicture ? { uri: item.profilePicture } : require('@/assets/images/sample_profile_picture.png')} // Assuming profilePicture is a URL
                className="w-12 h-12 rounded-full"
                contentFit="cover"
              />
              <View className='flex-column ml-2 flex-shrink'>
                <Text className={`font-inter_semibold text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text className={`font-inter_regular text-sm ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>
                  {item.email}
                </Text>
              </View>
        
              <View className='ml-auto flex-row'>
                <TouchableOpacity
                  className='bg-green-500 rounded-xl h-[50px] justify-center items-center mr-2 p-2'
                  onPress={() => handleEditTeacher(item._id)}
                  activeOpacity={0.7}
                >
                  <View className='flex-row'>
                    <EditIcon className='w-[24px] h-[24px] mr-1' />
                    <Text className='text-black font-psemibold text-lg'>
                      Edit
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className='bg-red-500 rounded-xl h-[50px] justify-center items-center mr-2 p-2'
                  onPress={() => handleDeleteTeacher(item._id)}
                  activeOpacity={0.7}
                  disabled={isCurrentItemDeleting} // Disable button if currently deleting
                >
                  <View className='flex-row'>
                    <DeleteIcon className='w-[24px] h-[24px] mr-1' />
                    <Text className='text-black font-psemibold text-lg'>
                      {isCurrentItemDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        keyExtractor={(item) => item._id}
        getItem={getItem}
        getItemCount={getItemCount}
        extraData={isDarkMode}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
    </SafeAreaView>
  )
}

export default ManageTeachersWeb