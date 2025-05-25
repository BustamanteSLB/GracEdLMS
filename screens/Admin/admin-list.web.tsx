import { Text, View, useColorScheme, ActivityIndicator, VirtualizedList, TouchableOpacity } from 'react-native'
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

const ManageAdminsWeb = () => {

  interface UserListApiResponse extends ApiResponse {
    data?: User[]; // Expecting an array of User objects in the data field
  }

  const colorScheme = useColorScheme();
  const { isDarkMode } = useDarkMode();
  const [admins, setAdmins] = useState<User[]>([]); // State to hold the list of admins
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [deletingId, setDeletingId] = useState<string | null>(null); // State to track which item is being deleted

  // Fetch admins from the API
  // Using useCallback to memoize the fetch function
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors

      // Make API call to fetch users with role 'Admin'
      const response = await apiClient.get<UserListApiResponse>('/users', {
        params: { role: 'Admin' }, // Pass role as a query parameter
      });

      if (response.data.success && response.data.data) {
        setAdmins(response.data.data); // Set the fetched list of admins
      } else {
        // Handle API response success: false
        setError(response.data.message || 'Failed to fetch admins.');
      }
    } catch (err: any) {
      // Handle network or API call errors
      console.error('Error fetching admins:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while fetching admins.'
      );
    } finally {
      setLoading(false); // Set loading to false after fetch
    }
  }, []); // Empty dependency array means this function is created once

  // useEffect to call fetchAdmins when the component mounts
  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]); // Dependency on fetchAdmins memoized function

  // Function for soft-deleting an admin
  const handleDeleteAdmin = (adminId: string) => {
    const confirmDelete = window.confirm (
      'Are you sure you want to delete this admin account? It will be archived.'
    );

    if (confirmDelete) {
      const deleteAdmin = async () => {
        setDeletingId(adminId); // Set state to show loading on this specific item
        try {
          const response = await apiClient.delete<ApiResponse>(`/users/${adminId}`);

          if (response.data.success) {
            window.alert('Success: Admin account archived successfully.');
            // Update the local state to remove the soft-deleted admin
            setAdmins((prevAdmins) =>
              prevAdmins.filter((admin) => admin._id !== adminId)
            );
          } else {
            window.alert('Error: ' + (response.data.message || 'Failed to archive admin.'));
          }
        } catch (err: any) {
          console.error('Error archiving admin:', err);
          window.alert(
            'Error: ' + (err.response?.data?.message || err.message || 'An error occurred during archival.')
          );
        } finally {
          setDeletingId(null); // Clear deleting state
        }
      };

      deleteAdmin();
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
        <Text className={`font-inter_regular mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>{`Loading Admins...`}</Text>
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
  
  if (admins.length === 0) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
        <Image
          className="w-[150] h-[150]"
          contentFit="contain"
          source={require('@/assets/images/admin_background.png')}
        />
        <Text className={`font-inter_regular text-center mt-4 ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'} `}>
          {`No admin accounts found.`}
        </Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}/>
      </SafeAreaView>
    );
  }

  // If not loading, no error, and admins exist, render the VirtualizedList
  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} `}>
      <Text className={`font-inter_bold mx-4 my-2 text-lg ${isDarkMode ? 'text-[#E0E0E0]' : 'text-black'}`}>Admins List</Text>
      <VirtualizedList
        data={admins}
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
                  onPress={() => console.log('Edit button pressed')}
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
                  onPress={() => handleDeleteAdmin(item._id)}
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

export default ManageAdminsWeb